/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Query, TimeRange } from '@kbn/data-plugin/public';
import { DataViewType } from '@kbn/data-views-plugin/public';
import { useDiscoverServices } from '../../../../utils/use_discover_services';
import { DiscoverLayoutProps } from '../layout/types';
import { getTopNavLinks } from './get_top_nav_links';
import { getHeaderActionMenuMounter } from '../../../../kibana_services';
import { GetStateReturn } from '../../services/discover_state';

export type DiscoverTopNavProps = Pick<
  DiscoverLayoutProps,
  'indexPattern' | 'navigateTo' | 'savedSearch' | 'searchSource'
> & {
  onOpenInspector: () => void;
  query?: Query;
  savedQuery?: string;
  updateQuery: (payload: { dateRange: TimeRange; query?: Query }, isUpdate?: boolean) => void;
  stateContainer: GetStateReturn;
  resetSavedSearch: () => void;
  onChangeIndexPattern: (indexPattern: string) => void;
  onEditRuntimeField: () => void;
  useNewFieldsApi?: boolean;
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
  useNewFieldsApi = false,
}: DiscoverTopNavProps) => {
  const history = useHistory();
  const showDatePicker = useMemo(
    () => indexPattern.isTimeBased() && indexPattern.type !== DataViewType.ROLLUP,
    [indexPattern]
  );
  const services = useDiscoverServices();
  const { dataViewEditor, navigation, dataViewFieldEditor, data } = services;
  const editPermission = dataViewFieldEditor.userPermissions.editIndexPattern();
  const canEditDataViewField = !!editPermission && useNewFieldsApi;
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
      canEditDataViewField
        ? async (fieldName?: string, uiAction: 'edit' | 'add' = 'edit') => {
            if (indexPattern?.id) {
              const indexPatternInstance = await data.dataViews.get(indexPattern?.id);
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
    [
      canEditDataViewField,
      indexPattern?.id,
      data.dataViews,
      dataViewFieldEditor,
      onEditRuntimeField,
    ]
  );

  const addField = useMemo(
    () => (canEditDataViewField && editField ? () => editField(undefined, 'add') : undefined),
    [editField, canEditDataViewField]
  );

  const createNewDataView = useCallback(() => {
    const indexPatternFieldEditPermission = dataViewEditor.userPermissions.editDataView;
    if (!indexPatternFieldEditPermission) {
      return;
    }
    closeDataViewEditor.current = dataViewEditor.openEditor({
      onSave: async (dataView) => {
        if (dataView.id) {
          onChangeIndexPattern(dataView.id);
        }
      },
    });
  }, [dataViewEditor, onChangeIndexPattern]);

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

  const dataViewPickerProps = {
    trigger: {
      label: indexPattern?.title || '',
      'data-test-subj': 'discover-dataView-switch-link',
      title: indexPattern?.title || '',
    },
    currentDataViewId: indexPattern?.id,
    onAddField: addField,
    onDataViewCreated: createNewDataView,
    onChangeDataView: (newIndexPatternId: string) => onChangeIndexPattern(newIndexPatternId),
  };

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
      showSaveQuery={!!services.capabilities.discover.saveQuery}
      showSearchBar={true}
      useDefaultBehaviors={true}
      dataViewPickerComponentProps={dataViewPickerProps}
    />
  );
};
