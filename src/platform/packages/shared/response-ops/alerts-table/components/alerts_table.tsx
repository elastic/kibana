/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useReducer,
  useEffect,
  useImperativeHandle,
  forwardRef,
  Ref,
  memo,
  FC,
} from 'react';
import { isEmpty } from 'lodash';
import {
  EuiDataGridColumn,
  EuiProgress,
  EuiDataGridSorting,
  EuiDataGridControlColumn,
  EuiDataGridRefProps,
} from '@elastic/eui';
import {
  ALERT_CASE_IDS,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_RULE_UUID,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import type { RuleRegistrySearchRequestPagination } from '@kbn/rule-registry-plugin/common';
import type { SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useSearchAlertsQuery } from '@kbn/alerts-ui-shared/src/common/hooks/use_search_alerts_query';
import { DEFAULT_ALERTS_PAGE_SIZE } from '@kbn/alerts-ui-shared/src/common/constants';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import deepEqual from 'fast-deep-equal';
import { Alert } from '@kbn/alerting-types';
import { useGetMutedAlertsQuery } from '@kbn/response-ops-alerts-apis/hooks/use_get_muted_alerts_query';
import { queryKeys as alertsQueryKeys } from '@kbn/response-ops-alerts-apis/constants';
import { ErrorFallback } from './error_fallback';
import { defaultAlertsTableColumns } from '../configuration';
import { Storage } from '../utils/storage';
import { queryKeys } from '../constants';
import { AlertsDataGrid } from './alerts_data_grid';
import { EmptyState } from './empty_state';
import { RenderContext, RowSelectionState } from '../types';
import {
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

export interface AlertsTablePersistedConfiguration {
  columns: EuiDataGridColumn[];
  visibleColumns?: string[];
  sort: SortCombinations[];
}

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
const DEFAULT_SORT: SortCombinations[] = [];
const DEFAULT_COLUMNS: EuiDataGridColumn[] = [];

const AlertsTableContent = typedForwardRef(
  <AC extends AdditionalContext>(
    {
      id,
      ruleTypeIds,
      consumers,
      query,
      initialSort = DEFAULT_SORT,
      initialPageSize = DEFAULT_ALERTS_PAGE_SIZE,
      leadingControlColumns = DEFAULT_LEADING_CONTROL_COLUMNS,
      trailingControlColumns,
      rowHeightsOptions,
      columns: initialColumns = defaultAlertsTableColumns,
      gridStyle,
      browserFields: propBrowserFields,
      onUpdate,
      onLoaded,
      runtimeMappings,
      showAlertStatusWithFlapping,
      toolbarVisibility,
      shouldHighlightRow,
      dynamicRowHeight = false,
      emptyStateHeight,
      additionalContext,
      renderCellValue,
      renderCellPopover,
      renderActionsCell,
      renderFlyoutHeader,
      renderFlyoutBody,
      renderFlyoutFooter,
      renderAdditionalToolbarControls: AdditionalToolbarControlsComponent,
      lastReloadRequestTime,
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
    const storage = useRef(new Storage(window.localStorage));
    const dataGridRef = useRef<EuiDataGridRefProps>(null);
    const localStorageAlertsTableConfig = storage.current.get(
      id
    ) as Partial<AlertsTablePersistedConfiguration>;

    const columnsLocal = useMemo(
      () =>
        !isEmpty(localStorageAlertsTableConfig?.columns)
          ? localStorageAlertsTableConfig!.columns!
          : !isEmpty(initialColumns)
          ? initialColumns!
          : [],
      [initialColumns, localStorageAlertsTableConfig]
    );

    const getStorageConfig = useCallback(
      () => ({
        columns: columnsLocal,
        sort: !isEmpty(localStorageAlertsTableConfig?.sort)
          ? localStorageAlertsTableConfig!.sort!
          : initialSort ?? [],
        visibleColumns: !isEmpty(localStorageAlertsTableConfig?.visibleColumns)
          ? localStorageAlertsTableConfig!.visibleColumns!
          : columnsLocal.map((c) => c.id),
      }),
      [columnsLocal, localStorageAlertsTableConfig, initialSort]
    );
    const storageAlertsTable = useRef<AlertsTablePersistedConfiguration>(getStorageConfig());

    storageAlertsTable.current = getStorageConfig();

    const [sort, setSort] = useState<SortCombinations[]>(storageAlertsTable.current.sort);

    const onPageChange = useCallback((pagination: RuleRegistrySearchRequestPagination) => {
      setQueryParams((prevQueryParams) => ({
        ...prevQueryParams,
        pageSize: pagination.pageSize,
        pageIndex: pagination.pageIndex,
      }));
    }, []);

    const {
      columns,
      browserFields,
      isBrowserFieldDataLoading,
      onToggleColumn,
      onResetColumns,
      visibleColumns,
      onChangeVisibleColumns,
      onColumnResize,
      fields,
    } = useColumns({
      ruleTypeIds,
      storageAlertsTable,
      storage,
      id,
      defaultColumns: initialColumns ?? DEFAULT_COLUMNS,
      alertsFields: propBrowserFields,
      http,
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
    });

    useEffect(() => {
      setQueryParams(({ pageIndex: oldPageIndex, pageSize: oldPageSize, ...prevQueryParams }) => ({
        ruleTypeIds,
        consumers,
        fields,
        query,
        sort,
        runtimeMappings,
        // Go back to the first page if the query changes
        pageIndex: !deepEqual(prevQueryParams, {
          ruleTypeIds,
          consumers,
          fields,
          query,
          sort,
          runtimeMappings,
        })
          ? 0
          : oldPageIndex,
        pageSize: oldPageSize,
      }));
    }, [ruleTypeIds, fields, query, runtimeMappings, sort, consumers]);

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
    } = alertsData ?? {};

    useEffect(() => {
      if (onLoaded && !isLoadingAlerts && isSuccess) {
        onLoaded(alerts, columns);
      }
    }, [alerts, columns, isLoadingAlerts, isSuccess, onLoaded]);

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
      queryClient.invalidateQueries(alertsQueryKeys.mutedAlerts(ruleIds));
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
        const newSort = _sort.map((sortItem) => {
          return {
            [sortItem.id]: {
              order: sortItem.direction,
            },
          };
        });

        storageAlertsTable.current = {
          ...storageAlertsTable.current,
          sort: newSort,
        };
        storage.current.set(id, storageAlertsTable.current);
        setSort(newSort);
      },
      [id]
    );

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
          columns,
          tableId: id,
          dataGridRef,
          refresh,
          isLoading:
            isLoadingAlerts ||
            casesQuery.isFetching ||
            maintenanceWindowsQuery.isFetching ||
            mutedAlertsQuery.isFetching,
          isLoadingAlerts,
          alerts,
          alertsCount,
          // TODO deprecate
          ecsAlertsData,
          oldAlertsData,
          browserFields,
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
          services: memoizedServices,
        } as RenderContext<AC>),
      [
        additionalContext,
        columns,
        id,
        refresh,
        isLoadingAlerts,
        casesQuery.isFetching,
        casesQuery.data,
        maintenanceWindowsQuery.isFetching,
        maintenanceWindowsQuery.data,
        mutedAlertsQuery.isFetching,
        mutedAlertsQuery.data,
        alerts,
        alertsCount,
        ecsAlertsData,
        oldAlertsData,
        browserFields,
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
        additionalToolbarControls,
        leadingControlColumns,
        trailingControlColumns,
        visibleColumns,
        'data-test-subj': 'internalAlertsState',
        onToggleColumn,
        onResetColumns,
        onChangeVisibleColumns,
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
        additionalToolbarControls,
        leadingControlColumns,
        trailingControlColumns,
        visibleColumns,
        onToggleColumn,
        onResetColumns,
        onChangeVisibleColumns,
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
              height={emptyStateHeight}
            />
          </InspectButtonContainer>
        )}
        {(isLoadingAlerts || isBrowserFieldDataLoading) && (
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
