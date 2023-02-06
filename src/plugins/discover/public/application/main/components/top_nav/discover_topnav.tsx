/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import type { Query, TimeRange, AggregateQuery } from '@kbn/es-query';
import { DataViewType, type DataView } from '@kbn/data-views-plugin/public';
import type { DataViewPickerProps } from '@kbn/unified-search-plugin/public';
import { useInternalStateSelector } from '../../services/discover_internal_state_container';
import { ENABLE_SQL } from '../../../../../common';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DiscoverLayoutProps } from '../layout/types';
import { getTopNavLinks } from './get_top_nav_links';
import { getHeaderActionMenuMounter } from '../../../../kibana_services';
import { DiscoverStateContainer } from '../../services/discover_state';
import { onSaveSearch } from './on_save_search';

export type DiscoverTopNavProps = Pick<
  DiscoverLayoutProps,
  'navigateTo' | 'savedSearch' | 'searchSource'
> & {
  onOpenInspector: () => void;
  query?: Query | AggregateQuery;
  savedQuery?: string;
  updateQuery: (
    payload: { dateRange: TimeRange; query?: Query | AggregateQuery },
    isUpdate?: boolean
  ) => void;
  stateContainer: DiscoverStateContainer;
  resetSavedSearch: () => void;
  onChangeDataView: (dataView: string) => void;
  onDataViewCreated: (dataView: DataView) => void;
  isPlainRecord: boolean;
  textBasedLanguageModeErrors?: Error;
  onFieldEdited: () => Promise<void>;
  persistDataView: (dataView: DataView) => Promise<DataView | undefined>;
  updateAdHocDataViewId: (dataView: DataView) => Promise<DataView>;
  updateDataViewList: (newAdHocDataViews: DataView[]) => void;
};

export const DiscoverTopNav = ({
  onOpenInspector,
  query,
  savedQuery,
  stateContainer,
  updateQuery,
  searchSource,
  navigateTo,
  savedSearch,
  resetSavedSearch,
  onChangeDataView,
  onDataViewCreated,
  isPlainRecord,
  textBasedLanguageModeErrors,
  onFieldEdited,
  persistDataView,
  updateAdHocDataViewId,
  updateDataViewList,
}: DiscoverTopNavProps) => {
  const history = useHistory();
  const adHocDataViews = useInternalStateSelector((state) => state.adHocDataViews);
  const dataView = useInternalStateSelector((state) => state.dataView!);
  const savedDataViews = useInternalStateSelector((state) => state.savedDataViews);
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

  const onOpenSavedSearch = useCallback(
    (newSavedSearchId: string) => {
      if (savedSearch.id && savedSearch.id === newSavedSearchId) {
        resetSavedSearch();
      } else {
        history.push(`/view/${encodeURIComponent(newSavedSearchId)}`);
      }
    },
    [history, resetSavedSearch, savedSearch.id]
  );

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
      onSave: onDataViewCreated,
      allowAdHocDataView: true,
    });
  }, [dataViewEditor, onDataViewCreated]);

  const onCreateDefaultAdHocDataView = useCallback(
    async (pattern: string) => {
      const newDataView = await dataViews.create({
        title: pattern,
      });
      if (newDataView.fields.getByName('@timestamp')?.type === 'date') {
        newDataView.timeFieldName = '@timestamp';
      }

      stateContainer.actions.appendAdHocDataViews(newDataView);
      onChangeDataView(newDataView.id!);
    },
    [dataViews, onChangeDataView, stateContainer.actions]
  );

  const topNavMenu = useMemo(
    () =>
      getTopNavLinks({
        dataView,
        navigateTo,
        savedSearch,
        services,
        state: stateContainer,
        onOpenInspector,
        searchSource,
        onOpenSavedSearch,
        isPlainRecord,
        adHocDataViews,
        updateDataViewList,
        persistDataView,
        updateAdHocDataViewId,
      }),
    [
      dataView,
      navigateTo,
      savedSearch,
      services,
      stateContainer,
      onOpenInspector,
      searchSource,
      onOpenSavedSearch,
      isPlainRecord,
      adHocDataViews,
      persistDataView,
      updateAdHocDataViewId,
      updateDataViewList,
    ]
  );

  const onEditDataView = async (editedDataView: DataView) => {
    if (!editedDataView.isPersisted()) {
      await updateAdHocDataViewId(editedDataView);
    } else {
      stateContainer.actions.setDataView(editedDataView);
    }
    stateContainer.actions.loadDataViewList();
    stateContainer.dataState.fetch();
  };

  const updateSavedQueryId = (newSavedQueryId: string | undefined) => {
    const { appState, setAppState } = stateContainer;
    if (newSavedQueryId) {
      setAppState({ savedQuery: newSavedQueryId });
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
    onCreateDefaultAdHocDataView,
    onChangeDataView,
    textBasedLanguages: supportedTextBasedLanguages as DataViewPickerProps['textBasedLanguages'],
    adHocDataViews,
    savedDataViews,
    onEditDataView,
  };

  const onTextBasedSavedAndExit = useCallback(
    ({ onSave, onCancel }) => {
      onSaveSearch({
        savedSearch,
        services,
        dataView,
        navigateTo,
        state: stateContainer,
        onClose: onCancel,
        onSaveCb: onSave,
        updateAdHocDataViewId,
      });
    },
    [dataView, navigateTo, savedSearch, services, stateContainer, updateAdHocDataViewId]
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
