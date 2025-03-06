/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { UiCounterMetricType } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiHideFor, useEuiTheme } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject, of } from 'rxjs';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { DataViewPicker } from '@kbn/unified-search-plugin/public';
import {
  UnifiedFieldListSidebarContainer,
  type UnifiedFieldListSidebarContainerProps,
  type UnifiedFieldListSidebarContainerApi,
  FieldsGroupNames,
} from '@kbn/unified-field-list';
import { calcFieldCounts } from '@kbn/discover-utils/src/utils/calc_field_counts';
import { Filter } from '@kbn/es-query';
import { PLUGIN_ID } from '../../../../../common';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DataDocuments$ } from '../../state_management/discover_data_state_container';
import { FetchStatus, SidebarToggleState } from '../../../types';
import {
  discoverSidebarReducer,
  getInitialState,
  DiscoverSidebarReducerActionType,
  DiscoverSidebarReducerStatus,
} from './lib/sidebar_reducer';
import { useDiscoverCustomization } from '../../../../customizations';
import { useAdditionalFieldGroups } from '../../hooks/sidebar/use_additional_field_groups';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import {
  selectDataViewsForPicker,
  useInternalStateSelector,
} from '../../state_management/discover_internal_state_container';

const EMPTY_FIELD_COUNTS = {};

const getCreationOptions: UnifiedFieldListSidebarContainerProps['getCreationOptions'] = () => {
  return {
    originatingApp: PLUGIN_ID,
    localStorageKeyPrefix: 'discover',
    compressed: true,
    showSidebarToggleButton: true,
    disableFieldsExistenceAutoFetching: true,
    buttonAddFieldVariant: 'toolbar',
    buttonAddFieldToWorkspaceProps: {
      'aria-label': i18n.translate('discover.fieldChooser.discoverField.addFieldTooltip', {
        defaultMessage: 'Add field as column',
      }),
    },
    buttonRemoveFieldFromWorkspaceProps: {
      'aria-label': i18n.translate('discover.fieldChooser.discoverField.removeFieldTooltip', {
        defaultMessage: 'Remove field from table',
      }),
    },
    onOverrideFieldGroupDetails: (groupName) => {
      if (groupName === FieldsGroupNames.AvailableFields) {
        return {
          helpText: i18n.translate('discover.fieldChooser.availableFieldsTooltip', {
            defaultMessage: 'Fields available for display in the table.',
          }),
        };
      }
    },
    dataTestSubj: {
      fieldListAddFieldButtonTestSubj: 'dataView-add-field_btn',
      fieldListSidebarDataTestSubj: 'discover-sidebar',
      fieldListItemStatsDataTestSubj: 'dscFieldStats',
      fieldListItemDndDataTestSubjPrefix: 'dscFieldListPanelField',
      fieldListItemPopoverDataTestSubj: 'discoverFieldListPanelPopover',
      fieldListItemPopoverHeaderDataTestSubjPrefix: 'discoverFieldListPanel',
    },
  };
};

export interface DiscoverSidebarResponsiveProps {
  /**
   * the selected columns displayed in the doc table in discover
   */
  columns: string[];
  /**
   * hits fetched from ES, displayed in the doc table
   */
  documents$: DataDocuments$;
  /**
   * Callback to update breakdown field
   */
  onAddBreakdownField?: (breakdownField: DataViewField | undefined) => void;
  /**
   * Callback function when selecting a field
   */
  onAddField: (fieldName: string) => void;
  /**
   * Callback function when adding a filter from sidebar
   */
  onAddFilter?: (field: DataViewField | string, value: unknown, type: '+' | '-') => void;
  /**
   * Callback function when changing an data view
   */
  onChangeDataView: (id: string) => void;
  /**
   * Callback to remove a field column from the table
   * @param fieldName
   */
  onRemoveField: (fieldName: string) => void;
  /**
   * Currently selected data view
   */
  selectedDataView?: DataView;
  /**
   * Metric tracking function
   * @param metricType
   * @param eventName
   */
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  /**
   * callback to execute on edit runtime field
   */
  onFieldEdited: (options?: { removedFieldName?: string }) => Promise<void>;
  /**
   * callback to execute on create dataview
   */
  onDataViewCreated: (dataView: DataView) => void;
  /**
   * For customization and testing purposes
   */
  fieldListVariant?: UnifiedFieldListSidebarContainerProps['variant'];

  sidebarToggleState$: BehaviorSubject<SidebarToggleState>;
  /**
   * Custom filters to apply for the field list, ex: namespace custom filter
   */
  additionalFilters?: Filter[];
}

/**
 * Component providing 2 different renderings for the sidebar depending on available screen space
 * Desktop: Sidebar view, all elements are visible
 * Mobile: Data view selector is visible and a button to trigger a flyout with all elements
 */

export function DiscoverSidebarResponsive(props: DiscoverSidebarResponsiveProps) {
  const [unifiedFieldListSidebarContainerApi, setUnifiedFieldListSidebarContainerApi] =
    useState<UnifiedFieldListSidebarContainerApi | null>(null);
  const { euiTheme } = useEuiTheme();
  const services = useDiscoverServices();
  const isEsqlMode = useIsEsqlMode();
  const {
    fieldListVariant,
    selectedDataView,
    columns,
    trackUiMetric,
    onAddBreakdownField,
    onAddFilter,
    onFieldEdited,
    onDataViewCreated,
    onChangeDataView,
    onAddField,
    onRemoveField,
    sidebarToggleState$,
    additionalFilters,
  } = props;
  const [sidebarState, dispatchSidebarStateAction] = useReducer(
    discoverSidebarReducer,
    selectedDataView,
    getInitialState
  );
  const selectedDataViewRef = useRef<DataView | null | undefined>(selectedDataView);
  const showFieldList = sidebarState.status !== DiscoverSidebarReducerStatus.INITIAL;
  const { savedDataViews, managedDataViews, adHocDataViews } =
    useInternalStateSelector(selectDataViewsForPicker);

  useEffect(() => {
    const subscription = props.documents$.subscribe((documentState) => {
      switch (documentState?.fetchStatus) {
        case FetchStatus.UNINITIALIZED:
          dispatchSidebarStateAction({
            type: DiscoverSidebarReducerActionType.RESET,
            payload: {
              dataView: selectedDataViewRef.current,
            },
          });
          break;
        case FetchStatus.LOADING:
          dispatchSidebarStateAction({
            type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADING,
            payload: {
              isEsqlMode,
            },
          });
          break;
        case FetchStatus.COMPLETE:
          dispatchSidebarStateAction({
            type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADED,
            payload: {
              dataView: selectedDataViewRef.current,
              fieldCounts: isEsqlMode ? EMPTY_FIELD_COUNTS : calcFieldCounts(documentState.result),
              esqlQueryColumns: documentState.esqlQueryColumns,
              isEsqlMode,
            },
          });
          break;
        case FetchStatus.ERROR:
          dispatchSidebarStateAction({
            type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADED,
            payload: {
              dataView: selectedDataViewRef.current,
              fieldCounts: EMPTY_FIELD_COUNTS,
              isEsqlMode,
            },
          });
          break;
        default:
          break;
      }
    });
    return () => subscription.unsubscribe();
  }, [props.documents$, dispatchSidebarStateAction, selectedDataViewRef, isEsqlMode]);

  useEffect(() => {
    if (selectedDataView !== selectedDataViewRef.current) {
      dispatchSidebarStateAction({
        type: DiscoverSidebarReducerActionType.DATA_VIEW_SWITCHED,
        payload: {
          dataView: selectedDataView,
        },
      });
      selectedDataViewRef.current = selectedDataView;
    }
  }, [selectedDataView, dispatchSidebarStateAction, selectedDataViewRef]);

  const refetchFieldsExistenceInfo =
    unifiedFieldListSidebarContainerApi?.refetchFieldsExistenceInfo;
  const scheduleFieldsExistenceInfoFetchRef = useRef<boolean>(false);

  // Refetch fields existence info only after the fetch completes
  useEffect(() => {
    scheduleFieldsExistenceInfoFetchRef.current = false;

    if (sidebarState.status !== DiscoverSidebarReducerStatus.COMPLETED) {
      return;
    }

    // refetching info only if status changed to completed

    if (refetchFieldsExistenceInfo) {
      refetchFieldsExistenceInfo();
    } else {
      scheduleFieldsExistenceInfoFetchRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarState.status, scheduleFieldsExistenceInfoFetchRef]);

  // As unifiedFieldListSidebarContainerRef ref can be empty in the beginning,
  // we need to fetch the data once API becomes available and after documents are fetched
  const initializeUnifiedFieldListSidebarContainerApi = useCallback(
    (api: UnifiedFieldListSidebarContainerApi) => {
      if (!api) {
        return;
      }

      if (scheduleFieldsExistenceInfoFetchRef.current) {
        scheduleFieldsExistenceInfoFetchRef.current = false;
        api.refetchFieldsExistenceInfo();
      }

      setUnifiedFieldListSidebarContainerApi(api);
    },
    [setUnifiedFieldListSidebarContainerApi, scheduleFieldsExistenceInfoFetchRef]
  );

  const closeDataViewEditor = useRef<() => void | undefined>();

  useEffect(() => {
    const cleanup = () => {
      if (closeDataViewEditor?.current) {
        closeDataViewEditor?.current();
      }
    };
    return () => {
      // Make sure to close the editor when unmounting
      cleanup();
    };
  }, []);

  const setDataViewEditorRef = useCallback((ref: () => void | undefined) => {
    closeDataViewEditor.current = ref;
  }, []);

  const { dataViewEditor } = services;

  const canEditDataView =
    Boolean(dataViewEditor?.userPermissions.editDataView()) ||
    Boolean(selectedDataView && !selectedDataView.isPersisted());
  const closeFieldListFlyout = unifiedFieldListSidebarContainerApi?.closeFieldListFlyout;
  const createNewDataView = useMemo(
    () =>
      canEditDataView
        ? () => {
            const ref = dataViewEditor.openEditor({
              onSave: async (dataView) => {
                onDataViewCreated(dataView);
              },
            });
            if (setDataViewEditorRef) {
              setDataViewEditorRef(ref);
            }
            closeFieldListFlyout?.();
          }
        : undefined,
    [canEditDataView, dataViewEditor, setDataViewEditorRef, onDataViewCreated, closeFieldListFlyout]
  );

  const searchBarCustomization = useDiscoverCustomization('search_bar');
  const additionalFieldGroups = useAdditionalFieldGroups();
  const CustomDataViewPicker = searchBarCustomization?.CustomDataViewPicker;

  const createField = unifiedFieldListSidebarContainerApi?.createField;
  const prependDataViewPickerForMobile = useCallback(() => {
    return selectedDataView ? (
      CustomDataViewPicker ? (
        <CustomDataViewPicker />
      ) : (
        <DataViewPicker
          currentDataViewId={selectedDataView.id}
          adHocDataViews={adHocDataViews}
          managedDataViews={managedDataViews}
          savedDataViews={savedDataViews}
          onChangeDataView={onChangeDataView}
          onAddField={createField}
          onDataViewCreated={createNewDataView}
          trigger={{
            label: selectedDataView?.getName() || '',
            'data-test-subj': 'dataView-switch-link',
            title: selectedDataView?.getIndexPattern() || '',
            fullWidth: true,
          }}
        />
      )
    ) : null;
  }, [
    selectedDataView,
    CustomDataViewPicker,
    adHocDataViews,
    managedDataViews,
    savedDataViews,
    onChangeDataView,
    createField,
    createNewDataView,
  ]);

  const onAddFieldToWorkspace = useCallback(
    (field: DataViewField) => {
      onAddField(field.name);
    },
    [onAddField]
  );

  const onRemoveFieldFromWorkspace = useCallback(
    (field: DataViewField) => {
      onRemoveField(field.name);
    },
    [onRemoveField]
  );

  const isSidebarCollapsed = useObservable(
    unifiedFieldListSidebarContainerApi?.sidebarVisibility.isCollapsed$ ?? of(false),
    false
  );

  useEffect(() => {
    sidebarToggleState$.next({
      isCollapsed: isSidebarCollapsed,
      toggle: unifiedFieldListSidebarContainerApi?.sidebarVisibility.toggle,
    });
  }, [isSidebarCollapsed, unifiedFieldListSidebarContainerApi, sidebarToggleState$]);

  return (
    <EuiFlexGroup
      gutterSize="none"
      css={css`
        height: 100%;
        display: ${isSidebarCollapsed ? 'none' : 'flex'};
        background-color: ${euiTheme.colors.body};
      `}
    >
      <EuiFlexItem>
        {selectedDataView ? (
          <UnifiedFieldListSidebarContainer
            additionalFieldGroups={additionalFieldGroups}
            additionalFilters={additionalFilters}
            allFields={sidebarState.allFields}
            dataView={selectedDataView}
            fullWidth
            getCreationOptions={getCreationOptions}
            onAddBreakdownField={onAddBreakdownField}
            onAddFieldToWorkspace={onAddFieldToWorkspace}
            onAddFilter={onAddFilter}
            onFieldEdited={onFieldEdited}
            onRemoveFieldFromWorkspace={onRemoveFieldFromWorkspace}
            prependInFlyout={prependDataViewPickerForMobile}
            ref={initializeUnifiedFieldListSidebarContainerApi}
            services={services}
            showFieldList={showFieldList}
            trackUiMetric={trackUiMetric}
            variant={fieldListVariant}
            workspaceSelectedFieldNames={columns}
          />
        ) : null}
      </EuiFlexItem>
      <EuiHideFor sizes={['xs', 's']}>
        <EuiFlexItem
          grow={false}
          css={css`
            border-right: ${euiTheme.border.thin};
          `}
        />
      </EuiHideFor>
    </EuiFlexGroup>
  );
}
