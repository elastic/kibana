/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { DataViewType } from '@kbn/data-views-plugin/public';
import type { DataViewPickerProps, UnifiedSearchDraft } from '@kbn/unified-search-plugin/public';
import { isEqual } from 'lodash';
import { DiscoverFlyouts, dismissAllFlyoutsExceptFor } from '@kbn/discover-utils';
import type { EuiHeaderLinksProps } from '@elastic/eui';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { useSavedSearchInitial } from '../../state_management/discover_state_provider';
import { ESQL_TRANSITION_MODAL_KEY } from '../../../../../common/constants';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { onSaveSearch } from './on_save_search';
import { useDiscoverCustomization } from '../../../../customizations';
import { useAppStateSelector } from '../../state_management/discover_app_state_container';
import { useDiscoverTopNav } from './use_discover_topnav';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import { ESQLToDataViewTransitionModal } from './esql_dataview_transition';
import {
  internalStateActions,
  useCurrentDataView,
  useCurrentTabAction,
  useCurrentTabSelector,
  useDataViewsForPicker,
  useInternalStateDispatch,
  useInternalStateSelector,
} from '../../state_management/redux';
import { TABS_ENABLED } from '../../../../constants';

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
  const dispatch = useInternalStateDispatch();
  const services = useDiscoverServices();
  const { dataViewEditor, navigation, dataViewFieldEditor, data, setHeaderActionMenu } = services;
  const query = useAppStateSelector((state) => state.query);
  const { savedDataViews, managedDataViews, adHocDataViews } = useDataViewsForPicker();
  const dataView = useCurrentDataView();
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
        ? async (fieldName?: string) => {
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
    () => (canEditDataView && editField ? () => editField() : undefined),
    [editField, canEditDataView]
  );

  const createNewDataView = useCallback(() => {
    closeDataViewEditor.current = dataViewEditor.openEditor({
      onSave: stateContainer.actions.onDataViewCreated,
      allowAdHocDataView: true,
    });
  }, [dataViewEditor, stateContainer]);

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
      dispatch(internalStateActions.setIsESQLToDataViewTransitionModalVisible(false));
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
            dispatch(internalStateActions.setIsESQLToDataViewTransitionModalVisible(false)),
          onSaveCb: () => {
            stateContainer.actions.transitionFromESQLToDataView(dataView.id ?? '');
          },
        });
      } else {
        stateContainer.actions.transitionFromESQLToDataView(dataView.id ?? '');
      }
    },
    [dataView.id, dispatch, services, stateContainer]
  );

  const { topNavBadges, topNavMenu } = useDiscoverTopNav({ stateContainer });
  const topNavProps = useMemo(
    () => ({
      badges: topNavBadges,
      config: topNavMenu,
      setMenuMountPoint: setHeaderActionMenu,
      gutterSize: 'xxs' as EuiHeaderLinksProps['gutterSize'],
    }),
    [setHeaderActionMenu, topNavBadges, topNavMenu]
  );

  const dataViewPickerProps: DataViewPickerProps = useMemo(() => {
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
      adHocDataViews,
      managedDataViews,
      savedDataViews,
      onEditDataView: stateContainer.actions.onDataViewEdited,
    };
  }, [
    adHocDataViews,
    addField,
    createNewDataView,
    dataView,
    managedDataViews,
    savedDataViews,
    stateContainer,
  ]);

  const onESQLDocsFlyoutVisibilityChanged = useCallback((isOpen: boolean) => {
    if (isOpen) {
      dismissAllFlyoutsExceptFor(DiscoverFlyouts.esqlDocs);
    }
  }, []);

  const searchBarCustomization = useDiscoverCustomization('search_bar');

  const SearchBar = useMemo(
    () => searchBarCustomization?.CustomSearchBar ?? navigation.ui.AggregateQueryTopNavMenu,
    [searchBarCustomization?.CustomSearchBar, navigation.ui.AggregateQueryTopNavMenu]
  );

  const searchDraftUiState = useCurrentTabSelector((state) => state.uiState.searchDraft);
  const setSearchDraftUiState = useCurrentTabAction(internalStateActions.setSearchDraftUiState);
  const onDraftChange = useCallback(
    (draft: UnifiedSearchDraft | null) => {
      dispatch(
        setSearchDraftUiState({
          searchDraftUiState: {
            query: draft?.query ?? undefined,
            dateRangeFrom: draft?.dateRangeFrom ?? undefined,
            dateRangeTo: draft?.dateRangeTo ?? undefined,
          },
        })
      );
    },
    [dispatch, setSearchDraftUiState]
  );

  const draft = useMemo(() => {
    const draftState: Partial<UnifiedSearchDraft> = {};

    if (searchDraftUiState?.query && !isEqual(searchDraftUiState.query, query)) {
      if (isOfAggregateQueryType(searchDraftUiState.query) !== isOfAggregateQueryType(query)) {
        return undefined; // don't use the draft when query type is different
      }

      draftState.query = searchDraftUiState.query;
    }

    if (searchDraftUiState?.dateRangeFrom) {
      draftState.dateRangeFrom = searchDraftUiState.dateRangeFrom;
    }

    if (searchDraftUiState?.dateRangeTo) {
      draftState.dateRangeTo = searchDraftUiState.dateRangeTo;
    }

    return Object.keys(draftState).length > 0 ? draftState : undefined;
  }, [searchDraftUiState, query]);

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
        allowSavingQueries
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
        onESQLDocsFlyoutVisibilityChanged={onESQLDocsFlyoutVisibilityChanged}
        draft={draft}
        onDraftChange={TABS_ENABLED ? onDraftChange : undefined}
      />
      {isESQLToDataViewTransitionModalVisible && (
        <ESQLToDataViewTransitionModal onClose={onESQLToDataViewTransitionModalClose} />
      )}
    </>
  );
};
