/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Ref, FC } from 'react';
import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useReducer,
  useEffect,
  useImperativeHandle,
  forwardRef,
  memo,
} from 'react';
import type {
  EuiDataGridColumn,
  EuiDataGridSorting,
  EuiDataGridControlColumn,
  EuiDataGridRefProps,
} from '@elastic/eui';
import { EuiProgress } from '@elastic/eui';
import {
  ALERT_CASE_IDS,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_RULE_UUID,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import type { RuleRegistrySearchRequestPagination } from '@kbn/rule-registry-plugin/common';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useSearchAlertsQuery } from '@kbn/alerts-ui-shared/src/common/hooks/use_search_alerts_query';
import { DEFAULT_ALERTS_PAGE_SIZE } from '@kbn/alerts-ui-shared/src/common/constants';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import deepEqual from 'fast-deep-equal';
import type { Alert, BrowserFields } from '@kbn/alerting-types';
import { useGetMutedAlertsQuery } from '@kbn/response-ops-alerts-apis/hooks/use_get_muted_alerts_query';
import { queryKeys as alertsQueryKeys } from '@kbn/response-ops-alerts-apis/query_keys';
import { useFetchAlertsFieldsQuery } from '@kbn/alerts-ui-shared/src/common/hooks/use_fetch_alerts_fields_query';
import { applyColumnsConfiguration } from '../utils/columns_configuration';
import { useAlertsTableConfiguration } from '../hooks/use_alerts_table_configuration';
import { ErrorFallback } from './error_fallback';
import { defaultAlertsTableColumns } from '../configuration';
import { queryKeys } from '../constants';
import { AlertsDataGrid } from './alerts_data_grid';
import { EmptyState } from './empty_state';
import type { AlertsTableSortCombinations, RenderContext, RowSelectionState } from '../types';
import type {
  AdditionalContext,
  AlertsDataGridProps,
  AlertsTableImperativeApi,
  AlertsTableProps,
} from '../types';
import { bulkActionsReducer } from '../reducers/bulk_actions_reducer';
import { useColumns } from '../hooks/use_columns';
import { InspectButtonContainer } from './alerts_query_inspector';
import { alertsTableQueryClient } from '../query_client';
import { useBulkGetCasesQuery } from '../hooks/use_bulk_get_cases';
import { useBulkGetMaintenanceWindowsQuery } from '../hooks/use_bulk_get_maintenance_windows';
import { AlertsTableContextProvider } from '../contexts/alerts_table_context';
import { ErrorBoundary } from './error_boundary';
import { usePagination } from '../hooks/use_pagination';
import { typedForwardRef } from '../utils/react';
import { useControllableState } from '../hooks/use_controllable_state';
import { LocalStorageWrapper } from '../utils/local_storage_wrapper';

type AlertWithCaseIds = Alert & Required<Pick<Alert, typeof ALERT_CASE_IDS>>;
type AlertWithMaintenanceWindowIds = Alert &
  Required<Pick<Alert, typeof ALERT_MAINTENANCE_WINDOW_IDS>>;

const getCaseIdsFromAlerts = (alerts: Alert[]) => [
  ...new Set(
    alerts
      .filter((alert): alert is AlertWithCaseIds => {
        const caseIds = alert[ALERT_CASE_IDS];
        return caseIds != null && caseIds.length > 0;
      })
      .map((alert) => alert[ALERT_CASE_IDS] as string[])
      .flat()
  ),
];

const getRuleIdsFromAlerts = (alerts: Alert[]) => [
  ...new Set(alerts.map((a) => a[ALERT_RULE_UUID]![0] as string)),
];

const getMaintenanceWindowIdsFromAlerts = (alerts: Alert[]) => [
  ...new Set(
    alerts
      .filter((alert): alert is AlertWithMaintenanceWindowIds => {
        const maintenanceWindowIds = alert[ALERT_MAINTENANCE_WINDOW_IDS];
        return maintenanceWindowIds != null && maintenanceWindowIds.length > 0;
      })
      .map((alert) => alert[ALERT_MAINTENANCE_WINDOW_IDS] as string[])
      .flat()
  ),
];

const isCasesColumnEnabled = (columns: EuiDataGridColumn[]): boolean =>
  columns.some(({ id }) => id === ALERT_CASE_IDS);

const isMaintenanceWindowColumnEnabled = (columns: EuiDataGridColumn[]): boolean =>
  columns.some(({ id }) => id === ALERT_MAINTENANCE_WINDOW_IDS);

const getLocalStorageWrapper = () => new LocalStorageWrapper(window.localStorage);

const emptyRowSelection = new Map<number, RowSelectionState>();

const initialBulkActionsState = {
  rowSelection: emptyRowSelection,
  isAllSelected: false,
  areAllVisibleRowsSelected: false,
  rowCount: 0,
  updatedAt: Date.now(),
};

/**
 * An `EuiDataGrid` abstraction to render alert documents
 *
 * It manages the paginated and cached fetching of alerts based on the
 * provided `ruleTypeIds` and `consumers` (the final query can be refined
 * through the `query` and `initialSort` props). The `id` prop is required in order
 * to persist the table state in `localStorage`
 *
 * @example
 * ```tsx
 * <AlertsTable
 *   id="my-alerts-table"
 *   ruleTypeIds={ruleTypeIds}
 *   consumers={consumers}
 *   query={esQuery}
 *   initialSort={defaultAlertsTableSort}
 *   renderCellValue={CellValue}
 *   renderActionsCell={ActionsCell}
 *   services={{ ... }}
 * />
 * ```
 */
export const AlertsTable = memo(
  forwardRef((props, ref) => {
    return (
      <QueryClientProvider client={alertsTableQueryClient} context={AlertsQueryContext}>
        <ErrorBoundary fallback={ErrorFallback}>
          <AlertsTableContent {...props} ref={ref} />
        </ErrorBoundary>
      </QueryClientProvider>
    );
  })
  // Type cast to avoid losing the generic type
) as typeof AlertsTableContent;

(AlertsTable as FC).displayName = 'AlertsTable';

const DEFAULT_LEADING_CONTROL_COLUMNS: EuiDataGridControlColumn[] = [];
const DEFAULT_SORT: AlertsTableSortCombinations[] = [];

const AlertsTableContent = typedForwardRef(
  <AC extends AdditionalContext>(
    {
      id,
      ruleTypeIds,
      consumers,
      query,
      minScore,
      trackScores = false,
      initialSort = DEFAULT_SORT,
      initialPageSize = DEFAULT_ALERTS_PAGE_SIZE,
      columns: columnsProp,
      onColumnsChange,
      visibleColumns: visibleColumnsProp,
      onVisibleColumnsChange,
      leadingControlColumns = DEFAULT_LEADING_CONTROL_COLUMNS,
      trailingControlColumns,
      rowHeightsOptions,
      gridStyle,
      browserFields: alertsFieldsProp,
      onUpdate,
      onLoaded,
      runtimeMappings,
      showAlertStatusWithFlapping,
      toolbarVisibility,
      shouldHighlightRow,
      dynamicRowHeight = false,
      emptyState,
      openLinksInNewTab = false,
      additionalContext,
      renderCellValue,
      renderCellPopover,
      renderActionsCell,
      renderFlyoutHeader,
      renderFlyoutBody,
      renderFlyoutFooter,
      flyoutOwnsFocus = false,
      flyoutPagination = true,
      renderAdditionalToolbarControls: AdditionalToolbarControlsComponent,
      lastReloadRequestTime,
      configurationStorage: configurationStorageProp,
      services,
      ...publicDataGridProps
    }: AlertsTableProps<AC>,
    ref: Ref<AlertsTableImperativeApi>
  ) => {
    // Memoized so that consumers can pass an inline object without causing re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const memoizedServices = useMemo(() => services, Object.values(services));
    const { casesConfiguration, showInspectButton } = publicDataGridProps;
    const { data, cases: casesService, http, notifications, application, licensing } = services;
    const queryClient = useQueryClient({ context: AlertsQueryContext });
    const dataGridRef = useRef<EuiDataGridRefProps>(null);
    const configurationStorage = useMemo(
      () => configurationStorageProp ?? getLocalStorageWrapper(),
      [configurationStorageProp]
    );

    const [configuration, setConfiguration] = useAlertsTableConfiguration({
      id,
      configurationStorage,
      notifications,
    });

    // Keeping a stable reference to the default columns to support the reset functionality and
    // to apply default properties to the configured columns
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const defaultColumns = useMemo(() => columnsProp ?? defaultAlertsTableColumns, []);
    const [columns, setColumns] = useControllableState({
      prop: columnsProp,
      onChange: onColumnsChange,
      defaultValue: applyColumnsConfiguration({
        defaultColumns,
        configuredColumns: configuration?.columns,
      }),
    });
    const updateColumns = useCallback<typeof setColumns>(
      (setColumnsAction) => {
        const newColumns =
          typeof setColumnsAction === 'function' ? setColumnsAction(columns) : setColumnsAction;
        setColumns(newColumns);
        setConfiguration({ columns: newColumns });
      },
      [columns, setColumns, setConfiguration]
    );
    // Like `defaultColumns`, purposefully keeping the initial value only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const defaultVisibleColumns = useMemo(() => visibleColumnsProp ?? columns.map((c) => c.id), []);
    const [visibleColumns, setVisibleColumns] = useControllableState({
      prop: visibleColumnsProp,
      onChange: onVisibleColumnsChange,
      defaultValue: configuration?.visibleColumns ?? defaultVisibleColumns,
    });
    const updateVisibleColumns = useCallback<typeof setVisibleColumns>(
      (setVisibleColumnsAction) => {
        const newVisibleColumns =
          typeof setVisibleColumnsAction === 'function'
            ? setVisibleColumnsAction(visibleColumns)
            : setVisibleColumnsAction;
        setVisibleColumns(newVisibleColumns);
        setConfiguration({ visibleColumns: newVisibleColumns });
      },
      [setConfiguration, setVisibleColumns, visibleColumns]
    );
    const [sort, setSort] = useState<AlertsTableSortCombinations[]>(
      configuration?.sort ?? initialSort
    );
    const updateSort = useCallback<typeof setSort>(
      (setSortAction) => {
        const newSort = typeof setSortAction === 'function' ? setSortAction(sort) : setSortAction;
        setSort(newSort);
        setConfiguration({ sort: newSort });
      },
      [setConfiguration, sort]
    );

    const fieldsQuery = useFetchAlertsFieldsQuery(
      { http, ruleTypeIds },
      { enabled: !alertsFieldsProp, context: AlertsQueryContext }
    );
    const selectedAlertsFields = useMemo<BrowserFields>(
      () => alertsFieldsProp ?? fieldsQuery.data?.browserFields ?? {},
      [alertsFieldsProp, fieldsQuery.data?.browserFields]
    );

    const onPageChange = useCallback((pagination: RuleRegistrySearchRequestPagination) => {
      setQueryParams((prevQueryParams) => ({
        ...prevQueryParams,
        pageSize: pagination.pageSize,
        pageIndex: pagination.pageIndex,
      }));
    }, []);

    const { columnsWithFieldsData, onToggleColumn, onColumnResize, onResetColumns, fields } =
      useColumns({
        columns,
        updateColumns,
        defaultColumns,
        visibleColumns,
        updateVisibleColumns,
        defaultVisibleColumns,
        alertsFields: selectedAlertsFields,
      });

    const [queryParams, setQueryParams] = useState({
      ruleTypeIds,
      consumers,
      fields,
      query,
      sort,
      runtimeMappings,
      pageIndex: 0,
      pageSize: initialPageSize,
      minScore,
      trackScores,
    });

    /*
     * if prevQueryParams is directly compared without selective prop assignment to a new object,
     * deepEqual will return a false negative, even if the objects are structurally identical.
     */
    useEffect(() => {
      setQueryParams(({ pageIndex: oldPageIndex, pageSize: oldPageSize, ...prevQueryParams }) => {
        const resetPageIndex = !deepEqual(
          {
            ruleTypeIds: prevQueryParams.ruleTypeIds,
            consumers: prevQueryParams.consumers,
            fields: prevQueryParams.fields,
            query: prevQueryParams.query,
            sort: prevQueryParams.sort,
            runtimeMappings: prevQueryParams.runtimeMappings,
            trackScores: prevQueryParams.trackScores,
          },
          {
            ruleTypeIds,
            consumers,
            fields,
            query,
            sort,
            runtimeMappings,
            trackScores,
          }
        );
        return {
          ruleTypeIds,
          consumers,
          fields,
          query,
          sort,
          runtimeMappings,
          minScore,
          trackScores,
          // Go back to the first page if the query changes
          pageIndex: resetPageIndex ? 0 : oldPageIndex,
          pageSize: oldPageSize,
        };
      });
    }, [ruleTypeIds, fields, query, runtimeMappings, sort, consumers, minScore, trackScores]);

    const {
      data: alertsData,
      refetch: refetchAlerts,
      isSuccess,
      isFetching: isLoadingAlerts,
    } = useSearchAlertsQuery({
      data,
      ...queryParams,
    });

    const {
      alerts = [],
      oldAlertsData = [],
      ecsAlertsData = [],
      total: alertsCount = -1,
      querySnapshot: alertsQuerySnapshot,
      error: alertsError,
    } = alertsData ?? {};

    useEffect(() => {
      if (onLoaded && !isLoadingAlerts && isSuccess) {
        onLoaded({ alerts, columns, totalAlertsCount: alertsCount });
      }
    }, [alerts, columns, isLoadingAlerts, isSuccess, onLoaded, alertsCount]);

    const fieldWithSortingError = useMemo(
      () =>
        alertsError?.message?.toLowerCase()?.includes('sort')
          ? queryParams.sort.find((sortField) =>
              alertsError?.message?.includes(Object.keys(sortField)[0])
            )
          : undefined,
      [alertsError, queryParams]
    );

    const ruleIds = useMemo(() => getRuleIdsFromAlerts(alerts), [alerts]);
    const mutedAlertsQuery = useGetMutedAlertsQuery({
      ruleIds,
      http,
      notifications,
    });

    const caseIds = useMemo(() => getCaseIdsFromAlerts(alerts), [alerts]);
    const casesPermissions = useMemo(() => {
      return casesService?.helpers.canUseCases(casesConfiguration?.owner ?? []);
    }, [casesConfiguration?.owner, casesService?.helpers]);
    const casesQuery = useBulkGetCasesQuery(
      { caseIds, http, notifications },
      {
        enabled: isCasesColumnEnabled(columns) && !!casesPermissions?.read,
      }
    );

    const maintenanceWindowIds = useMemo(() => getMaintenanceWindowIdsFromAlerts(alerts), [alerts]);
    const maintenanceWindowsQuery = useBulkGetMaintenanceWindowsQuery(
      { ids: maintenanceWindowIds, http, application, notifications, licensing },
      { enabled: isMaintenanceWindowColumnEnabled(columns), context: AlertsQueryContext }
    );

    const refresh = useCallback(() => {
      if (queryParams.pageIndex !== 0) {
        // Refetch from the first page
        setQueryParams((prevQueryParams) => ({ ...prevQueryParams, pageIndex: 0 }));
      } else {
        refetchAlerts();
      }
      queryClient.invalidateQueries(queryKeys.casesBulkGet(caseIds));
      queryClient.invalidateQueries(alertsQueryKeys.getMutedAlerts(ruleIds));
      queryClient.invalidateQueries(queryKeys.maintenanceWindowsBulkGet(maintenanceWindowIds));
    }, [caseIds, maintenanceWindowIds, queryClient, queryParams.pageIndex, refetchAlerts, ruleIds]);

    useEffect(() => {
      if (lastReloadRequestTime) {
        refresh();
      }
    }, [lastReloadRequestTime, refresh]);

    useImperativeHandle(ref, () => ({
      refresh,
      toggleColumn: onToggleColumn,
    }));

    const [bulkActionsState, dispatchBulkAction] = useReducer(
      bulkActionsReducer,
      initialBulkActionsState
    );

    const bulkActionsStore = useMemo(
      () =>
        [bulkActionsState, dispatchBulkAction] as [
          typeof bulkActionsState,
          typeof dispatchBulkAction
        ],
      [bulkActionsState, dispatchBulkAction]
    );

    const onSortChange = useCallback(
      (_sort: EuiDataGridSorting['columns']) => {
        const newSort = _sort
          .map((sortItem) => {
            return {
              [sortItem.id]: {
                order: sortItem.direction,
              },
            };
          })
          .filter((entry) => {
            const sortKey = Object.keys(entry)[0];
            return visibleColumns.includes(sortKey);
          });

        updateSort(newSort);
      },
      [updateSort, visibleColumns]
    );

    const handleReset = useCallback(() => {
      // allow to reset to previous sort state in case of sorting error
      if (fieldWithSortingError) {
        const newSort = sort.filter((sortField) => !deepEqual(sortField, fieldWithSortingError));
        updateSort(newSort);
      } else {
        // allow to reset to default state in case of any other error
        updateSort(initialSort);
        onResetColumns();
      }
    }, [fieldWithSortingError, sort, updateSort, initialSort, onResetColumns]);

    const CasesContext = useMemo(() => {
      return casesService?.ui.getCasesContext();
    }, [casesService?.ui]);

    const isCasesContextAvailable = casesService && CasesContext;

    const {
      pagination,
      onChangePageSize,
      onChangePageIndex,
      onPaginateFlyout,
      flyoutAlertIndex,
      setFlyoutAlertIndex,
    } = usePagination({
      bulkActionsStore,
      onPageChange,
      pageIndex: queryParams.pageIndex,
      pageSize: queryParams.pageSize,
    });

    // TODO when every solution is using this table, we will be able to simplify it by just passing the alert index
    const openAlertInFlyout = useCallback(
      (alertId: string) => {
        const idx = alerts.findIndex((a) => (a as any)[ALERT_UUID].includes(alertId));
        setFlyoutAlertIndex(idx);
      },
      [alerts, setFlyoutAlertIndex]
    );

    const renderContext = useMemo(
      () =>
        ({
          ...additionalContext,
          columns: columnsWithFieldsData,
          tableId: id,
          dataGridRef,
          refresh,
          isLoading:
            isLoadingAlerts ||
            casesQuery.isFetching ||
            maintenanceWindowsQuery.isFetching ||
            mutedAlertsQuery.isFetching ||
            fieldsQuery.isFetching,
          isLoadingAlerts,
          alerts,
          alertsCount,
          // TODO deprecate
          ecsAlertsData,
          oldAlertsData,
          browserFields: selectedAlertsFields,
          isLoadingCases: casesQuery.isFetching,
          cases: casesQuery.data,
          isLoadingMaintenanceWindows: maintenanceWindowsQuery.isFetching,
          maintenanceWindows: maintenanceWindowsQuery.data,
          isLoadingMutedAlerts: mutedAlertsQuery.isFetching,
          mutedAlerts: mutedAlertsQuery.data,
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          showAlertStatusWithFlapping,
          openAlertInFlyout,
          bulkActionsStore,
          renderCellValue,
          renderCellPopover,
          renderActionsCell,
          renderFlyoutHeader,
          renderFlyoutBody,
          renderFlyoutFooter,
          flyoutOwnsFocus,
          flyoutPagination,
          openLinksInNewTab,
          services: memoizedServices,
        } as RenderContext<AC>),
      [
        additionalContext,
        columnsWithFieldsData,
        id,
        refresh,
        isLoadingAlerts,
        casesQuery.isFetching,
        casesQuery.data,
        maintenanceWindowsQuery.isFetching,
        maintenanceWindowsQuery.data,
        mutedAlertsQuery.isFetching,
        mutedAlertsQuery.data,
        fieldsQuery.isFetching,
        alerts,
        alertsCount,
        ecsAlertsData,
        oldAlertsData,
        selectedAlertsFields,
        pagination.pageIndex,
        pagination.pageSize,
        showAlertStatusWithFlapping,
        openAlertInFlyout,
        bulkActionsStore,
        renderCellValue,
        renderCellPopover,
        renderActionsCell,
        renderFlyoutHeader,
        renderFlyoutBody,
        renderFlyoutFooter,
        flyoutOwnsFocus,
        flyoutPagination,
        openLinksInNewTab,
        memoizedServices,
      ]
    );

    useEffect(() => {
      if (onUpdate) {
        onUpdate(renderContext);
      }
    }, [onUpdate, renderContext]);

    const additionalToolbarControls = useMemo(
      () =>
        AdditionalToolbarControlsComponent ? (
          <AdditionalToolbarControlsComponent {...renderContext} />
        ) : undefined,
      [AdditionalToolbarControlsComponent, renderContext]
    );

    const dataGridProps: AlertsDataGridProps<AC> = useMemo(
      () => ({
        ...publicDataGridProps,
        renderContext,
        columnVisibility: {
          visibleColumns,
          setVisibleColumns: updateVisibleColumns,
        },
        additionalToolbarControls,
        leadingControlColumns,
        trailingControlColumns,
        'data-test-subj': 'internalAlertsState',
        onToggleColumn,
        onResetColumns,
        onColumnResize,
        query,
        rowHeightsOptions,
        gridStyle,
        toolbarVisibility,
        shouldHighlightRow,
        dynamicRowHeight,
        ruleTypeIds,
        alertsQuerySnapshot,
        onChangePageIndex,
        onChangePageSize,
        onPaginateFlyout,
        flyoutAlertIndex,
        setFlyoutAlertIndex,
        sort,
        onSortChange,
      }),
      [
        publicDataGridProps,
        renderContext,
        visibleColumns,
        updateVisibleColumns,
        additionalToolbarControls,
        leadingControlColumns,
        trailingControlColumns,
        onToggleColumn,
        onResetColumns,
        onColumnResize,
        query,
        rowHeightsOptions,
        gridStyle,
        toolbarVisibility,
        shouldHighlightRow,
        dynamicRowHeight,
        ruleTypeIds,
        alertsQuerySnapshot,
        onChangePageIndex,
        onChangePageSize,
        onPaginateFlyout,
        flyoutAlertIndex,
        setFlyoutAlertIndex,
        sort,
        onSortChange,
      ]
    );

    return (
      <AlertsTableContextProvider value={renderContext}>
        {!isLoadingAlerts && alertsCount <= 0 && (
          <InspectButtonContainer>
            <EmptyState
              additionalToolbarControls={additionalToolbarControls}
              alertsQuerySnapshot={alertsQuerySnapshot}
              showInspectButton={showInspectButton}
              messageTitle={emptyState?.messageTitle}
              messageBody={emptyState?.messageBody}
              height={emptyState?.height}
              variant={emptyState?.variant}
              error={alertsError}
              fieldWithSortingError={fieldWithSortingError}
              onReset={handleReset}
            />
          </InspectButtonContainer>
        )}
        {(isLoadingAlerts || fieldsQuery.isLoading) && (
          <EuiProgress size="xs" color="accent" data-test-subj="internalAlertsPageLoading" />
        )}
        {alertsCount > 0 &&
          (isCasesContextAvailable ? (
            <CasesContext
              owner={casesConfiguration?.owner ?? []}
              permissions={casesPermissions}
              features={{ alerts: { sync: casesConfiguration?.syncAlerts ?? false } }}
            >
              <AlertsDataGrid {...dataGridProps} />
            </CasesContext>
          ) : (
            <AlertsDataGrid {...dataGridProps} />
          ))}
      </AlertsTableContextProvider>
    );
  }
);

// Lazy loading helpers
// eslint-disable-next-line import/no-default-export
export { AlertsTable as default };
export type AlertsTable = typeof AlertsTable;
