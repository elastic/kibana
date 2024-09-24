/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { type DataView, DataViewType } from '@kbn/data-views-plugin/public';
import { DataViewPickerProps } from '@kbn/unified-search-plugin/public';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { TextBasedLanguages } from '@kbn/esql-utils';
import { useSavedSearchInitial } from '../../state_management/discover_state_provider';
import { ESQL_TRANSITION_MODAL_KEY } from '../../../../../common/constants';
import { useInternalStateSelector } from '../../state_management/discover_internal_state_container';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { onSaveSearch } from './on_save_search';
import { useDiscoverCustomization } from '../../../../customizations';
import { addLog } from '../../../../utils/add_log';
import { useAppStateSelector } from '../../state_management/discover_app_state_container';
import { useDiscoverTopNav } from './use_discover_topnav';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import { ESQLToDataViewTransitionModal } from './esql_dataview_transition';

export interface DiscoverTopNavProps {
  savedQuery?: string;
  stateContainer: DiscoverStateContainer;
  esqlModeErrors?: Error;
  esqlModeWarning?: string;
  onFieldEdited: () => Promise<void>;
  isLoading?: boolean;
  onCancelClick?: () => void;
}

export const DiscoverTopNav = ({
  savedQuery,
  stateContainer,
  esqlModeErrors,
  esqlModeWarning,
  onFieldEdited,
  isLoading,
  onCancelClick,
}: DiscoverTopNavProps) => {
  const services = useDiscoverServices();
  const {
    dataViewEditor,
    navigation,
    dataViewFieldEditor,
    data,
    uiSettings,
    dataViews,
    setHeaderActionMenu,
  } = services;
  const query = useAppStateSelector((state) => state.query);
  const adHocDataViews = useInternalStateSelector((state) => state.adHocDataViews);
  const dataView = useInternalStateSelector((state) => state.dataView!);
  const savedDataViews = useInternalStateSelector((state) => state.savedDataViews);
  const isESQLToDataViewTransitionModalVisible = useInternalStateSelector(
    (state) => state.isESQLToDataViewTransitionModalVisible
  );
  const savedSearch = useSavedSearchInitial();
  const isEsqlMode = useIsEsqlMode();
  const showDatePicker = useMemo(() => {
    // always show the timepicker for ES|QL mode
    return (
      isEsqlMode || (!isEsqlMode && dataView.isTimeBased() && dataView.type !== DataViewType.ROLLUP)
    );
  }, [dataView, isEsqlMode]);

  const closeFieldEditor = useRef<() => void | undefined>();
  const closeDataViewEditor = useRef<() => void | undefined>();

  useEffect(() => {
    return () => {
      // Make sure to close the editors when unmounting
      if (closeFieldEditor.current) {
        closeFieldEditor.current();
      }
      if (closeDataViewEditor.current) {
        closeDataViewEditor.current();
      }
    };
  }, []);

  const canEditDataView =
    Boolean(dataViewEditor?.userPermissions.editDataView()) || !dataView.isPersisted();

  const editField = useMemo(
    () =>
      canEditDataView
        ? async (fieldName?: string, uiAction: 'edit' | 'add' = 'edit') => {
            if (dataView?.id) {
              const dataViewInstance = await data.dataViews.get(dataView.id);
              closeFieldEditor.current = await dataViewFieldEditor.openEditor({
                ctx: {
                  dataView: dataViewInstance,
                },
                fieldName,
                onSave: async () => {
                  await onFieldEdited();
                },
              });
            }
          }
        : undefined,
    [canEditDataView, dataView?.id, data.dataViews, dataViewFieldEditor, onFieldEdited]
  );

  const addField = useMemo(
    () => (canEditDataView && editField ? () => editField(undefined, 'add') : undefined),
    [editField, canEditDataView]
  );

  const createNewDataView = useCallback(() => {
    closeDataViewEditor.current = dataViewEditor.openEditor({
      onSave: stateContainer.actions.onDataViewCreated,
      allowAdHocDataView: true,
    });
  }, [dataViewEditor, stateContainer]);

  const onEditDataView = useCallback(
    async (editedDataView: DataView) => {
      if (editedDataView.isPersisted()) {
        // Clear the current data view from the cache and create a new instance
        // of it, ensuring we have a new object reference to trigger a re-render
        dataViews.clearInstanceCache(editedDataView.id);
        stateContainer.actions.setDataView(await dataViews.create(editedDataView.toSpec(), true));
      } else {
        await stateContainer.actions.updateAdHocDataViewId();
      }
      stateContainer.actions.loadDataViewList();
      addLog('[DiscoverTopNav] onEditDataView triggers data fetching');
      stateContainer.dataState.fetch();
    },
    [dataViews, stateContainer.actions, stateContainer.dataState]
  );

  const updateSavedQueryId = (newSavedQueryId: string | undefined) => {
    const { appState } = stateContainer;
    if (newSavedQueryId) {
      appState.update({ savedQuery: newSavedQueryId });
    } else {
      // remove savedQueryId from state
      const newState = {
        ...appState.getState(),
      };
      delete newState.savedQuery;
      appState.set(newState);
    }
  };

  const onESQLToDataViewTransitionModalClose = useCallback(
    (shouldDismissModal?: boolean, needsSave?: boolean) => {
      if (shouldDismissModal) {
        services.storage.set(ESQL_TRANSITION_MODAL_KEY, true);
      }
      stateContainer.internalState.transitions.setIsESQLToDataViewTransitionModalVisible(false);
      // the user dismissed the modal, we don't need to save the search or switch to the data view mode
      if (needsSave == null) {
        return;
      }
      if (needsSave) {
        onSaveSearch({
          savedSearch: stateContainer.savedSearchState.getState(),
          services,
          state: stateContainer,
          onClose: () =>
            stateContainer.internalState.transitions.setIsESQLToDataViewTransitionModalVisible(
              false
            ),
          onSaveCb: () => {
            stateContainer.actions.transitionFromESQLToDataView(dataView.id ?? '');
          },
        });
      } else {
        stateContainer.actions.transitionFromESQLToDataView(dataView.id ?? '');
      }
    },
    [dataView.id, services, stateContainer]
  );

  const { topNavBadges, topNavMenu } = useDiscoverTopNav({ stateContainer });
  const topNavProps = useMemo(() => {
    if (stateContainer.customizationContext.inlineTopNav.enabled) {
      return undefined;
    }

    return {
      badges: topNavBadges,
      config: topNavMenu,
      setMenuMountPoint: setHeaderActionMenu,
    };
  }, [
    setHeaderActionMenu,
    stateContainer.customizationContext.inlineTopNav.enabled,
    topNavBadges,
    topNavMenu,
  ]);

  const dataViewPickerProps: DataViewPickerProps = useMemo(() => {
    const isESQLModeEnabled = uiSettings.get(ENABLE_ESQL);
    const supportedTextBasedLanguages: DataViewPickerProps['textBasedLanguages'] = isESQLModeEnabled
      ? [TextBasedLanguages.ESQL]
      : [];

    return {
      trigger: {
        label: dataView?.getName() || '',
        'data-test-subj': 'discover-dataView-switch-link',
        title: dataView?.getIndexPattern() || '',
      },
      currentDataViewId: dataView?.id,
      onAddField: addField,
      onDataViewCreated: createNewDataView,
      onCreateDefaultAdHocDataView: stateContainer.actions.createAndAppendAdHocDataView,
      onChangeDataView: stateContainer.actions.onChangeDataView,
      textBasedLanguages: supportedTextBasedLanguages,
      adHocDataViews,
      savedDataViews,
      onEditDataView,
    };
  }, [
    adHocDataViews,
    addField,
    createNewDataView,
    dataView,
    onEditDataView,
    savedDataViews,
    stateContainer,
    uiSettings,
  ]);

  const searchBarCustomization = useDiscoverCustomization('search_bar');

  const SearchBar = useMemo(
    () => searchBarCustomization?.CustomSearchBar ?? navigation.ui.AggregateQueryTopNavMenu,
    [searchBarCustomization?.CustomSearchBar, navigation.ui.AggregateQueryTopNavMenu]
  );

  const shouldHideDefaultDataviewPicker =
    !!searchBarCustomization?.CustomDataViewPicker || !!searchBarCustomization?.hideDataViewPicker;

  return (
    <>
      <SearchBar
        {...topNavProps}
        appName="discover"
        indexPatterns={[dataView]}
        onQuerySubmit={stateContainer.actions.onUpdateQuery}
        onCancel={onCancelClick}
        isLoading={isLoading}
        onSavedQueryIdChange={updateSavedQueryId}
        query={query}
        savedQueryId={savedQuery}
        screenTitle={savedSearch.title}
        showDatePicker={showDatePicker}
        saveQueryMenuVisibility={
          services.capabilities.discover.saveQuery ? 'allowed_by_app_privilege' : 'globally_managed'
        }
        showSearchBar={true}
        useDefaultBehaviors={true}
        dataViewPickerOverride={
          searchBarCustomization?.CustomDataViewPicker ? (
            <searchBarCustomization.CustomDataViewPicker />
          ) : undefined
        }
        dataViewPickerComponentProps={
          shouldHideDefaultDataviewPicker ? undefined : dataViewPickerProps
        }
        displayStyle="detached"
        textBasedLanguageModeErrors={esqlModeErrors ? [esqlModeErrors] : undefined}
        textBasedLanguageModeWarning={esqlModeWarning}
        prependFilterBar={
          searchBarCustomization?.PrependFilterBar ? (
            <searchBarCustomization.PrependFilterBar />
          ) : undefined
        }
      />
      {isESQLToDataViewTransitionModalVisible && (
        <ESQLToDataViewTransitionModal onClose={onESQLToDataViewTransitionModalClose} />
      )}
    </>
  );
};
