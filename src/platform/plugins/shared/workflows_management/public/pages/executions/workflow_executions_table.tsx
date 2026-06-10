/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiPanel,
  EuiSkeletonText,
  EuiTablePagination,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CellActionsProvider } from '@kbn/cell-actions';
import type { DataView } from '@kbn/data-views-plugin/common';
import { buildDataTableRecordList } from '@kbn/discover-utils';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SortOrder, UnifiedDataTableSettings } from '@kbn/unified-data-table';
import { DataLoadingState, UnifiedDataTable } from '@kbn/unified-data-table';
import { useWorkflowExecutionsBulkActions } from './use_workflow_executions_bulk_actions';
import { useWorkflowExecutionsSearch } from './use_workflow_executions_search';
import {
  EXECUTION_TABLE_DEFAULT_PAGE_SIZE,
  EXECUTION_TABLE_DEFAULT_SORT,
  EXECUTION_TABLE_PAGE_SIZE_OPTIONS,
} from './workflow_executions_page_constants';
import { getWorkflowExecutionsFetchErrorMessage } from './workflow_executions_search_query';
import { useWorkflowExecutionsTrailingControlColumns } from './workflow_executions_table_actions';
import {
  enrichWorkflowExecutionRowFlattenedValues,
  getWorkflowExecutionId,
} from './workflow_executions_table_cells';
import {
  DEFAULT_WORKFLOW_EXECUTIONS_TABLE_COLUMNS,
  useWorkflowExecutionsTableConfig,
  WORKFLOW_EXECUTIONS_TABLE_COLUMNS_META,
  WORKFLOW_EXECUTIONS_TABLE_GRID_SETTINGS,
} from './workflow_executions_table_config';
import { getWorkflowExecutionsTableGridWrapperCss } from './workflow_executions_table_styles';
import { WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW } from '../../../common';
import { useKibana } from '../../hooks/use_kibana';
import { useSerialPolling } from '../../hooks/use_serial_polling';
import { useWorkflowUrlState } from '../../hooks/use_workflow_url_state';

const EXECUTION_TABLE_ROW_HEIGHT = 1;
const PAGE_SIZE_OPTIONS = [...EXECUTION_TABLE_PAGE_SIZE_OPTIONS];

const getMaxPageIndex = (itemsPerPage: number): number =>
  Math.max(0, Math.floor(WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW / itemsPerPage) - 1);

const gridStyleOverride = {
  border: 'horizontal' as const,
  header: 'shade' as const,
  stripes: false,
};

const tableContainerCss = css`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
`;

const gridWrapperCss = getWorkflowExecutionsTableGridWrapperCss;

export interface WorkflowExecutionsTableProps {
  dataView: DataView;
  query: Query;
  filters: Filter[];
  liveUpdateIntervalMs?: number;
  onViewAllExecutionsForWorkflow?: (workflowId: string) => void;
  timeRange: TimeRange;
  spaceId: string;
}

export const WorkflowExecutionsTable = React.memo<WorkflowExecutionsTableProps>(
  ({
    dataView,
    filters,
    liveUpdateIntervalMs,
    onViewAllExecutionsForWorkflow,
    query,
    spaceId,
    timeRange,
  }) => {
    const {
      data: dataService,
      fieldFormats,
      notifications: { toasts },
      storage,
      theme,
      uiActions,
      uiSettings,
    } = useKibana().services;

    const [visibleColumns, setVisibleColumns] = useState<string[]>([
      ...DEFAULT_WORKFLOW_EXECUTIONS_TABLE_COLUMNS,
    ]);
    const [gridSettings, setGridSettings] = useState<UnifiedDataTableSettings>(
      WORKFLOW_EXECUTIONS_TABLE_GRID_SETTINGS
    );
    const [sort, setSort] = useState<SortOrder[]>(EXECUTION_TABLE_DEFAULT_SORT);
    const [pageSize, setPageSize] = useState(EXECUTION_TABLE_DEFAULT_PAGE_SIZE);
    const [pageIndex, setPageIndex] = useState(0);
    const { selectedExecutionId, setSelectedExecution } = useWorkflowUrlState();
    const handleOpenExecution = useCallback(
      (row: DataTableRecord) => {
        const executionId = getWorkflowExecutionId(row);
        if (executionId) {
          setSelectedExecution(executionId);
        }
      },
      [setSelectedExecution]
    );
    const { externalCustomRenderers } = useWorkflowExecutionsTableConfig(handleOpenExecution);
    const maxPageIndex = useMemo(() => getMaxPageIndex(pageSize), [pageSize]);

    const searchCriteriaKey = useMemo(
      () => JSON.stringify({ query, filters, spaceId, timeRange }),
      [query, filters, spaceId, timeRange]
    );

    const {
      data: rawResponse,
      error,
      isLoading,
      refetch,
    } = useWorkflowExecutionsSearch({
      dataView,
      query,
      filters,
      timeRange,
      spaceId,
      pageIndex,
      pageSize,
      sort,
    });

    const { hits, total } = useMemo(() => {
      const responseHits = (rawResponse?.hits?.hits ?? []).filter(
        (hit) => hit._source != null
      ) as unknown as EsHitRecord[];
      const totalHits = rawResponse?.hits?.total;
      const totalCount =
        typeof totalHits === 'number' ? totalHits : totalHits?.value ?? responseHits.length;

      return { hits: responseHits, total: totalCount };
    }, [rawResponse]);

    const loadingState = isLoading ? DataLoadingState.loading : DataLoadingState.loaded;
    const errorMessage = error ? getWorkflowExecutionsFetchErrorMessage() : null;

    useSerialPolling({
      poll: () => refetch(),
      enabled: liveUpdateIntervalMs != null,
      immediate: false,
      intervalMs: liveUpdateIntervalMs ?? 0,
      pollKey: `${searchCriteriaKey}:${pageIndex}:${pageSize}:${JSON.stringify(sort)}`,
    });

    useEffect(() => {
      setPageIndex(0);
    }, [searchCriteriaKey]);

    const rows = useMemo<DataTableRecord[]>(
      () =>
        buildDataTableRecordList({
          records: hits,
          dataView,
          processRecord: enrichWorkflowExecutionRowFlattenedValues,
        }),
      [hits, dataView]
    );
    const handleRetry = useCallback(() => {
      void refetch();
    }, [refetch]);
    const customBulkActions = useWorkflowExecutionsBulkActions({
      onRefresh: handleRetry,
      rows,
    });
    const trailingControlColumns = useWorkflowExecutionsTrailingControlColumns(
      rows,
      onViewAllExecutionsForWorkflow
    );

    const expandedDoc = useMemo(() => {
      if (!selectedExecutionId) {
        return undefined;
      }

      return rows.find((row) => getWorkflowExecutionId(row) === selectedExecutionId);
    }, [rows, selectedExecutionId]);

    const handleSetExpandedDoc = useCallback(
      (doc: DataTableRecord | undefined) => {
        if (!doc) {
          setSelectedExecution(null);
          return;
        }

        const executionId = getWorkflowExecutionId(doc);
        if (executionId) {
          setSelectedExecution(executionId);
        }
      },
      [setSelectedExecution]
    );

    const services = useMemo(
      () => ({
        theme,
        fieldFormats,
        uiSettings,
        toastNotifications: toasts,
        storage,
        data: dataService,
      }),
      [dataService, fieldFormats, storage, theme, toasts, uiSettings]
    );

    const handleSetColumns = useCallback((nextColumns: string[]) => {
      setVisibleColumns(nextColumns);
    }, []);

    const handleSortWithPageReset = useCallback((nextSort: string[][]) => {
      const parsedSort = nextSort.filter(
        (value): value is SortOrder =>
          Array.isArray(value) &&
          value.length === 2 &&
          typeof value[0] === 'string' &&
          (value[1] === 'asc' || value[1] === 'desc')
      );

      setSort(parsedSort.length > 0 ? parsedSort : EXECUTION_TABLE_DEFAULT_SORT);
      setPageIndex(0);
    }, []);

    const handleResize = useCallback((resized: { columnId: string; width: number | undefined }) => {
      setGridSettings((current) => ({
        ...current,
        columns: {
          ...current.columns,
          [resized.columnId]: {
            ...current.columns?.[resized.columnId],
            width: resized.width,
          },
        },
      }));
    }, []);

    const handlePageSizeChange = useCallback((nextPageSize: number) => {
      setPageSize(nextPageSize);
      setPageIndex(0);
    }, []);

    const handlePageChange = useCallback(
      (nextPageIndex: number) => {
        setPageIndex(Math.min(nextPageIndex, maxPageIndex));
      },
      [maxPageIndex]
    );

    const totalPages = useMemo(
      () =>
        Math.min(
          Math.max(1, Math.ceil(total / pageSize)),
          Math.ceil(WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW / pageSize)
        ),
      [pageSize, total]
    );
    const isPaginationLimited = total > WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW;

    if (errorMessage) {
      return (
        <EuiEmptyPrompt
          color="danger"
          data-test-subj="workflowExecutionsTableError"
          iconType="error"
          title={
            <h3>
              <FormattedMessage
                id="workflowsManagement.executionsPage.errorTitle"
                defaultMessage="Unable to load executions"
              />
            </h3>
          }
          body={<p>{errorMessage}</p>}
          actions={
            <EuiButtonEmpty onClick={handleRetry} data-test-subj="workflowExecutionsTableRetry">
              <FormattedMessage
                id="workflowsManagement.executionsPage.retry"
                defaultMessage="Try again"
              />
            </EuiButtonEmpty>
          }
        />
      );
    }

    if (loadingState === DataLoadingState.loading && rows.length === 0) {
      return (
        <EuiPanel hasShadow={false} hasBorder data-test-subj="workflowExecutionsTableLoading">
          <EuiSkeletonText lines={5} />
        </EuiPanel>
      );
    }

    if (rows.length === 0) {
      return (
        <EuiPanel hasShadow={false} hasBorder data-test-subj="workflowExecutionsTableEmpty">
          <EuiCallOut
            announceOnMount
            color="primary"
            title={i18n.translate('workflowsManagement.executionsPage.emptyTitle', {
              defaultMessage: 'No executions match your search criteria.',
            })}
          />
        </EuiPanel>
      );
    }

    return (
      <div css={tableContainerCss} data-test-subj="workflowExecutionsTable">
        <div css={gridWrapperCss}>
          <CellActionsProvider getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}>
            <UnifiedDataTable
              ariaLabelledBy="workflowExecutionsTableLabel"
              canDragAndDropColumns
              configRowHeight={EXECUTION_TABLE_ROW_HEIGHT}
              columns={visibleColumns}
              columnsMeta={WORKFLOW_EXECUTIONS_TABLE_COLUMNS_META}
              consumer="workflows"
              dataView={dataView}
              expandedDoc={expandedDoc}
              externalCustomRenderers={externalCustomRenderers}
              gridStyleOverride={gridStyleOverride}
              isPaginationEnabled={false}
              isSortEnabled
              loadingState={loadingState}
              onResize={handleResize}
              onSetColumns={handleSetColumns}
              onSort={handleSortWithPageReset}
              rows={rows}
              sampleSizeState={rows.length}
              services={services}
              setExpandedDoc={handleSetExpandedDoc}
              settings={gridSettings}
              showColumnTokens
              showTimeCol={false}
              sort={sort}
              totalHits={total}
              trailingControlColumns={trailingControlColumns}
              customBulkActions={customBulkActions}
              hideFilteringOnComputedColumns
            />
          </CellActionsProvider>
        </div>
        {isPaginationLimited && (
          <EuiCallOut
            announceOnMount
            color="warning"
            data-test-subj="workflowExecutionsTablePaginationLimit"
            size="s"
            title={i18n.translate('workflowsManagement.executionsPage.paginationLimitTitle', {
              defaultMessage: 'Showing the first {maxRows} executions only',
              values: { maxRows: WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW.toLocaleString() },
            })}
          >
            <p>
              {i18n.translate('workflowsManagement.executionsPage.paginationLimitBody', {
                defaultMessage:
                  'Refine your search or time range to find older executions. Deep pagination beyond {maxRows} results is not supported.',
                values: { maxRows: WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW.toLocaleString() },
              })}
            </p>
          </EuiCallOut>
        )}
        <EuiTablePagination
          activePage={pageIndex}
          itemsPerPage={pageSize}
          itemsPerPageOptions={PAGE_SIZE_OPTIONS}
          onChangeItemsPerPage={handlePageSizeChange}
          onChangePage={handlePageChange}
          pageCount={totalPages}
          showPerPageOptions
        />
      </div>
    );
  }
);
WorkflowExecutionsTable.displayName = 'WorkflowExecutionsTable';
