/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import type { Query, TimeRange, AggregateQuery } from '@kbn/es-query';
import { DataViewType } from '@kbn/data-views-plugin/public';
import type { DataViewPickerProps } from '@kbn/unified-search-plugin/public';
import { ENABLE_SQL } from '../../../../../common';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DiscoverLayoutProps } from '../layout/types';
import { getTopNavLinks } from './get_top_nav_links';
import { getHeaderActionMenuMounter } from '../../../../kibana_services';
import { GetStateReturn } from '../../services/discover_state';
import { onSaveSearch } from './on_save_search';

export type DiscoverTopNavProps = Pick<
  DiscoverLayoutProps,
  'indexPattern' | 'navigateTo' | 'savedSearch' | 'searchSource'
> & {
  onOpenInspector: () => void;
  query?: Query;
  savedQuery?: string;
  updateQuery: (
    payload: { dateRange: TimeRange; query?: Query | AggregateQuery },
    isUpdate?: boolean
  ) => void;
  stateContainer: GetStateReturn;
  resetSavedSearch: () => void;
  onChangeIndexPattern: (indexPattern: string) => void;
  onEditRuntimeField: () => void;
  textBasedLanguageMode?: string;
  textBasedLanguageModeErrors?: Error;
};

export const DiscoverTopNav = ({
  indexPattern,
  onOpenInspector,
  query,
  savedQuery,
  stateContainer,
  updateQuery,
  searchSource,
  navigateTo,
  savedSearch,
  resetSavedSearch,
  onChangeIndexPattern,
  onEditRuntimeField,
  textBasedLanguageMode,
  textBasedLanguageModeErrors,
}: DiscoverTopNavProps) => {
  const history = useHistory();
  const showDatePicker = useMemo(
    () => indexPattern.isTimeBased() && indexPattern.type !== DataViewType.ROLLUP,
    [indexPattern]
  );
  const services = useDiscoverServices();
  const { dataViewEditor, navigation, dataViewFieldEditor, data, uiSettings } = services;

  const canEditDataView = Boolean(dataViewEditor?.userPermissions.editDataView());

  const closeFieldEditor = useRef<() => void | undefined>();
  const closeDataViewEditor = useRef<() => void | undefined>();

  const { TopNavMenu } = navigation.ui;

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
            if (indexPattern?.id) {
              const indexPatternInstance = await data.dataViews.get(indexPattern.id);
              closeFieldEditor.current = dataViewFieldEditor.openEditor({
                ctx: {
                  dataView: indexPatternInstance,
                },
                fieldName,
                onSave: async () => {
                  onEditRuntimeField();
                },
              });
            }
          }
        : undefined,
    [canEditDataView, indexPattern?.id, data.dataViews, dataViewFieldEditor, onEditRuntimeField]
  );

  const addField = useMemo(
    () => (canEditDataView && editField ? () => editField(undefined, 'add') : undefined),
    [editField, canEditDataView]
  );

  const createNewDataView = useMemo(
    () =>
      canEditDataView
        ? () => {
            closeDataViewEditor.current = dataViewEditor.openEditor({
              onSave: async (dataView) => {
                if (dataView.id) {
                  onChangeIndexPattern(dataView.id);
                }
              },
            });
          }
        : undefined,
    [canEditDataView, dataViewEditor, onChangeIndexPattern]
  );

  const topNavMenu = useMemo(
    () =>
      getTopNavLinks({
        indexPattern,
        navigateTo,
        savedSearch,
        services,
        state: stateContainer,
        onOpenInspector,
        searchSource,
        onOpenSavedSearch,
        textBasedLanguageMode,
      }),
    [
      indexPattern,
      navigateTo,
      savedSearch,
      services,
      stateContainer,
      onOpenInspector,
      searchSource,
      onOpenSavedSearch,
      textBasedLanguageMode,
    ]
  );

  const updateSavedQueryId = (newSavedQueryId: string | undefined) => {
    const { appStateContainer, setAppState } = stateContainer;
    if (newSavedQueryId) {
      setAppState({ savedQuery: newSavedQueryId });
    } else {
      // remove savedQueryId from state
      const newState = {
        ...appStateContainer.getState(),
      };
      delete newState.savedQuery;
      appStateContainer.set(newState);
    }
  };
  const setMenuMountPoint = useMemo(() => {
    return getHeaderActionMenuMounter();
  }, []);
  const SQLModeIsEnabled = uiSettings.get(ENABLE_SQL);
  const supportedTextBasedLanguages = [];
  if (SQLModeIsEnabled) {
    supportedTextBasedLanguages.push('SQL');
  }
  const dataViewPickerProps = {
    trigger: {
      label: indexPattern?.getName() || '',
      'data-test-subj': 'discover-dataView-switch-link',
      title: indexPattern?.title || '',
    },
    currentDataViewId: indexPattern?.id,
    onAddField: addField,
    onDataViewCreated: createNewDataView,
    onChangeDataView: (newIndexPatternId: string) => onChangeIndexPattern(newIndexPatternId),
    textBasedLanguages: supportedTextBasedLanguages as DataViewPickerProps['textBasedLanguages'],
  };

  const onTextBasedSavedAndExit = useCallback(
    async ({ onSave }) => {
      await onSaveSearch({
        savedSearch,
        services,
        indexPattern,
        navigateTo,
        state: stateContainer,
        onClose: onSave,
        onSaveCb: onSave,
      });
    },
    [indexPattern, navigateTo, savedSearch, services, stateContainer]
  );

  return (
    <TopNavMenu
      appName="discover"
      config={topNavMenu}
      indexPatterns={[indexPattern]}
      onQuerySubmit={updateQuery}
      onSavedQueryIdChange={updateSavedQueryId}
      query={query}
      setMenuMountPoint={setMenuMountPoint}
      savedQueryId={savedQuery}
      screenTitle={savedSearch.title}
      showDatePicker={showDatePicker}
      showSaveQuery={!textBasedLanguageMode && Boolean(services.capabilities.discover.saveQuery)}
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
