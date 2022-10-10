/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Query, AggregateQuery } from '@kbn/es-query';
import { DataViewType, DataView } from '@kbn/data-views-plugin/public';
import type { DataViewPickerProps } from '@kbn/unified-search-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { ENABLE_SQL } from '../../../../../common';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DiscoverLayoutProps } from '../layout/types';
import { getTopNavLinks } from './get_top_nav_links';
import { getHeaderActionMenuMounter } from '../../../../kibana_services';
import { DiscoverStateContainer } from '../../services/discover_state';
import { onSaveSearch } from './on_save_search';

export type DiscoverTopNavProps = Pick<DiscoverLayoutProps, 'dataView' | 'navigateTo'> & {
  onOpenInspector: () => void;
  query?: Query | AggregateQuery;
  savedQuery?: string;
  stateContainer: DiscoverStateContainer;
  isPlainRecord: boolean;
  textBasedLanguageModeErrors?: Error;
  onFieldEdited: () => void;
  persistDataView: (dataView: DataView) => Promise<DataView | undefined>;
  updateAdHocDataViewId: (dataView: DataView) => Promise<DataView>;
  adHocDataViewList: DataView[];
};

export const DiscoverTopNav = ({
  dataView,
  onOpenInspector,
  query,
  savedQuery,
  stateContainer,
  navigateTo,
  isPlainRecord,
  textBasedLanguageModeErrors,
  onFieldEdited,
  persistDataView,
  updateAdHocDataViewId,
  adHocDataViewList,
}: DiscoverTopNavProps) => {
  const savedSearch = useObservable<SavedSearch>(
    stateContainer.savedSearchContainer.savedSearch$,
    stateContainer.savedSearchContainer.savedSearch$.getValue()
  );
  const hasChanged = useObservable(
    stateContainer.savedSearchContainer.hasChanged$,
    stateContainer.savedSearchContainer.hasChanged$.getValue()
  );

  const showDatePicker = useMemo(
    () => dataView.isTimeBased() && dataView.type !== DataViewType.ROLLUP,
    [dataView]
  );
  const services = useDiscoverServices();
  const { dataViewEditor, navigation, dataViewFieldEditor, data, uiSettings, dataViews } = services;

  const canEditDataView = Boolean(dataViewEditor?.userPermissions.editDataView());

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
                  onFieldEdited();
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

  const createNewDataView = useMemo(
    () =>
      canEditDataView
        ? () => {
            closeDataViewEditor.current = dataViewEditor.openEditor({
              onSave: async (dataViewToSave) => {
                if (dataViewToSave.id) {
                  stateContainer.actions.changeDataView(dataViewToSave.id);
                }
              },
              allowAdHocDataView: true,
            });
          }
        : undefined,
    [canEditDataView, dataViewEditor, stateContainer]
  );

  const onCreateDefaultAdHocDataView = useCallback(
    async (pattern: string) => {
      const newDataView = await dataViews.create({
        title: pattern,
      });
      if (newDataView.fields.getByName('@timestamp')?.type === 'date') {
        newDataView.timeFieldName = '@timestamp';
      }
      stateContainer.actions.changeDataView(newDataView.id!);
    },
    [dataViews, stateContainer]
  );

  const topNavMenu = useMemo(
    () =>
      getTopNavLinks({
        dataView,
        navigateTo,
        savedSearch,
        services,
        stateContainer,
        onOpenInspector,
        isPlainRecord,
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
      isPlainRecord,
      persistDataView,
      updateAdHocDataViewId,
    ]
  );
  const setMenuMountPoint = useMemo(() => {
    return getHeaderActionMenuMounter();
  }, []);
  const isSQLModeEnabled = uiSettings.get(ENABLE_SQL);
  const supportedTextBasedLanguages = [];
  if (isSQLModeEnabled) {
    supportedTextBasedLanguages.push('SQL');
  }
  const dataViewPickerProps = {
    trigger: {
      label: dataView?.getName() || '',
      'data-test-subj': 'discover-dataView-switch-link',
      title: dataView?.title || '',
    },
    currentDataViewId: dataView?.id,
    onAddField: addField,
    onDataViewCreated: createNewDataView,
    onCreateDefaultAdHocDataView,
    onChangeDataView: stateContainer.actions.changeDataView,
    textBasedLanguages: supportedTextBasedLanguages as DataViewPickerProps['textBasedLanguages'],
    adHocDataViews: adHocDataViewList,
  };

  const onTextBasedSavedAndExit = useCallback(
    ({ onSave, onCancel }) => {
      onSaveSearch({
        savedSearch,
        services,
        dataView,
        navigateTo,
        stateContainer,
        onClose: onCancel,
        onSaveCb: onSave,
        updateAdHocDataViewId,
      });
    },
    [dataView, navigateTo, savedSearch, services, stateContainer, updateAdHocDataViewId]
  );
  const badges = useMemo(() => {
    if (hasChanged) {
      return [{ badgeText: 'Has changed', primary: 'primary' }];
    }

    return [];
  }, [hasChanged]);

  return (
    <AggregateQueryTopNavMenu
      badges={badges}
      appName="discover"
      config={topNavMenu}
      indexPatterns={[dataView]}
      onQueryChange={stateContainer.actions.onUpdateQuery}
      onQuerySubmit={stateContainer.actions.onSubmitQuery}
      onSavedQueryIdChange={stateContainer.actions.updateSavedQueryId}
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
