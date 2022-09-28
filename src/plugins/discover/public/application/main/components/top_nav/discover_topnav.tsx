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
  onChangeDataView: (dataView: string) => void;
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
  onChangeDataView,
  isPlainRecord,
  textBasedLanguageModeErrors,
  onFieldEdited,
  persistDataView,
  updateAdHocDataViewId,
  adHocDataViewList,
}: DiscoverTopNavProps) => {
  const savedSearch = stateContainer.savedSearchContainer.savedSearch$.getValue();

  const showDatePicker = useMemo(
    () => dataView.isTimeBased() && dataView.type !== DataViewType.ROLLUP,
    [dataView]
  );
  const services = useDiscoverServices();
  const { dataViewEditor, navigation, dataViewFieldEditor, data, uiSettings } = services;

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
                  onChangeDataView(dataViewToSave.id);
                }
              },
              allowAdHocDataView: true,
            });
          }
        : undefined,
    [canEditDataView, dataViewEditor, onChangeDataView]
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
    onChangeDataView,
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

  return (
    <AggregateQueryTopNavMenu
      appName="discover"
      config={topNavMenu}
      indexPatterns={[dataView]}
      onQuerySubmit={stateContainer.actions.onUpdateQuery}
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
