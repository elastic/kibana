/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Query, TimeRange, AggregateQuery } from '@kbn/es-query';
import { DataViewType, type DataView } from '@kbn/data-views-plugin/public';
import type { DataViewPickerProps } from '@kbn/unified-search-plugin/public';
import { useSavedSearchInitial } from '../../services/discover_state_provider';
import { useInternalStateSelector } from '../../services/discover_internal_state_container';
import { ENABLE_SQL } from '../../../../../common';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DiscoverLayoutProps } from '../layout/discover_layout';
import { getTopNavLinks } from './get_top_nav_links';
import { getHeaderActionMenuMounter } from '../../../../kibana_services';
import { DiscoverStateContainer } from '../../services/discover_state';
import { onSaveSearch } from './on_save_search';

export type DiscoverTopNavProps = Pick<DiscoverLayoutProps, 'navigateTo'> & {
  onOpenInspector: () => void;
  query?: Query | AggregateQuery;
  savedQuery?: string;
  updateQuery: (
    payload: { dateRange: TimeRange; query?: Query | AggregateQuery },
    isUpdate?: boolean
  ) => void;
  stateContainer: DiscoverStateContainer;
  isPlainRecord: boolean;
  textBasedLanguageModeErrors?: Error;
  onFieldEdited: () => Promise<void>;
};

export const DiscoverTopNav = ({
  onOpenInspector,
  query,
  savedQuery,
  stateContainer,
  updateQuery,
  navigateTo,
  isPlainRecord,
  textBasedLanguageModeErrors,
  onFieldEdited,
}: DiscoverTopNavProps) => {
  const adHocDataViews = useInternalStateSelector((state) => state.adHocDataViews);
  const dataView = useInternalStateSelector((state) => state.dataView!);
  const savedDataViews = useInternalStateSelector((state) => state.savedDataViews);
  const savedSearch = useSavedSearchInitial();
  const showDatePicker = useMemo(
    () => dataView.isTimeBased() && dataView.type !== DataViewType.ROLLUP,
    [dataView]
  );
  const services = useDiscoverServices();
  const { dataViewEditor, navigation, dataViewFieldEditor, data, uiSettings, dataViews } = services;

  const canEditDataView =
    Boolean(dataViewEditor?.userPermissions.editDataView()) || !dataView.isPersisted();

  const closeFieldEditor = useRef<() => void | undefined>();
  const closeDataViewEditor = useRef<() => void | undefined>();

  const { AggregateQueryTopNavMenu } = navigation.ui;

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

  const editField = useMemo(
    () =>
      canEditDataView
        ? async (fieldName?: string, uiAction: 'edit' | 'add' = 'edit') => {
            if (dataView?.id) {
              const dataViewInstance = await data.dataViews.get(dataView.id);
              closeFieldEditor.current = dataViewFieldEditor.openEditor({
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

  const topNavMenu = useMemo(
    () =>
      getTopNavLinks({
        dataView,
        navigateTo,
        services,
        state: stateContainer,
        onOpenInspector,
        isPlainRecord,
        adHocDataViews,
      }),
    [dataView, navigateTo, services, stateContainer, onOpenInspector, isPlainRecord, adHocDataViews]
  );

  const onEditDataView = async (editedDataView: DataView) => {
    if (editedDataView.isPersisted()) {
      // Clear the current data view from the cache and create a new instance
      // of it, ensuring we have a new object reference to trigger a re-render
      dataViews.clearInstanceCache(editedDataView.id);
      stateContainer.actions.setDataView(await dataViews.create(editedDataView.toSpec(), true));
    } else {
      await stateContainer.actions.updateAdHocDataViewId();
    }
    stateContainer.actions.loadDataViewList();
    stateContainer.dataState.fetch();
  };

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
  const setMenuMountPoint = useMemo(() => {
    return getHeaderActionMenuMounter();
  }, []);
  const isSQLModeEnabled = uiSettings.get(ENABLE_SQL);
  const supportedTextBasedLanguages = [];
  if (isSQLModeEnabled) {
    supportedTextBasedLanguages.push('SQL');
  }
  const dataViewPickerProps: DataViewPickerProps = {
    trigger: {
      label: dataView?.getName() || '',
      'data-test-subj': 'discover-dataView-switch-link',
      title: dataView?.getIndexPattern() || '',
    },
    currentDataViewId: dataView?.id,
    onAddField: addField,
    onDataViewCreated: createNewDataView,
    onCreateDefaultAdHocDataView: stateContainer.actions.onCreateDefaultAdHocDataView,
    onChangeDataView: stateContainer.actions.onChangeDataView,
    textBasedLanguages: supportedTextBasedLanguages as DataViewPickerProps['textBasedLanguages'],
    adHocDataViews,
    savedDataViews,
    onEditDataView,
  };

  const onTextBasedSavedAndExit = useCallback(
    ({ onSave, onCancel }) => {
      onSaveSearch({
        savedSearch: stateContainer.savedSearchState.getState(),
        services,
        navigateTo,
        state: stateContainer,
        onClose: onCancel,
        onSaveCb: onSave,
      });
    },
    [navigateTo, services, stateContainer]
  );

  return (
    <AggregateQueryTopNavMenu
      appName="discover"
      config={topNavMenu}
      indexPatterns={[dataView]}
      onQuerySubmit={updateQuery}
      onSavedQueryIdChange={updateSavedQueryId}
      query={query}
      setMenuMountPoint={setMenuMountPoint}
      savedQueryId={savedQuery}
      screenTitle={savedSearch.title}
      showDatePicker={showDatePicker}
      showSaveQuery={!isPlainRecord && Boolean(services.capabilities.discover.saveQuery)}
      showSearchBar={true}
      useDefaultBehaviors={true}
      dataViewPickerComponentProps={dataViewPickerProps}
      displayStyle="detached"
      textBasedLanguageModeErrors={
        textBasedLanguageModeErrors ? [textBasedLanguageModeErrors] : undefined
      }
      onTextBasedSavedAndExit={onTextBasedSavedAndExit}
    />
  );
};
