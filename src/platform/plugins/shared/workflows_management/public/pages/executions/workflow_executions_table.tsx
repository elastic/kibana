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
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RerunWorkflowExecutionParams } from './build_replay_inputs_from_execution_context';
import { useWorkflowExecutionsGridSelection } from './use_workflow_executions_grid_selection';
import { useWorkflowExecutionsSearch } from './use_workflow_executions_search';
import { WorkflowExecutionsDataGrid } from './workflow_executions_data_grid';
import {
  EXECUTION_TABLE_DEFAULT_PAGE_SIZE,
  EXECUTION_TABLE_DEFAULT_SORT,
  EXECUTION_TABLE_PAGE_SIZE_OPTIONS,
  type ExecutionTableSortOrder,
} from './workflow_executions_page_constants';
import { getWorkflowExecutionsFetchErrorMessage } from './workflow_executions_search_query';
import {
  DEFAULT_WORKFLOW_EXECUTIONS_TABLE_COLUMNS,
  WORKFLOW_EXECUTIONS_TABLE_GRID_SETTINGS,
} from './workflow_executions_table_config';
import { getWorkflowExecutionsTableGridWrapperCss } from './workflow_executions_table_styles';
import { WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW } from '../../../common';
import { useSerialPolling } from '../../hooks/use_serial_polling';
import { useWorkflowUrlState } from '../../hooks/use_workflow_url_state';

const PAGE_SIZE_OPTIONS = [...EXECUTION_TABLE_PAGE_SIZE_OPTIONS];

const getMaxPageIndex = (itemsPerPage: number): number =>
  Math.max(0, Math.floor(WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW / itemsPerPage) - 1);

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
  onReRunExecution?: (params: RerunWorkflowExecutionParams) => Promise<void>;
  onViewAllExecutionsForWorkflow?: (workflowId: string) => void;
  timeRange: TimeRange;
  spaceId: string;
}

export const WorkflowExecutionsTable = React.memo<WorkflowExecutionsTableProps>(
  ({
    dataView,
    filters,
    liveUpdateIntervalMs,
    onReRunExecution,
    onViewAllExecutionsForWorkflow,
    query,
    spaceId,
    timeRange,
  }) => {
    const [visibleColumns, setVisibleColumns] = useState<string[]>([
      ...DEFAULT_WORKFLOW_EXECUTIONS_TABLE_COLUMNS,
    ]);
    const [columnWidths, setColumnWidths] = useState<Partial<Record<string, number>>>(() =>
      Object.fromEntries(
        Object.entries(WORKFLOW_EXECUTIONS_TABLE_GRID_SETTINGS.columns)
          .filter(([, settings]) => settings.width != null)
          .map(([columnId, settings]) => [columnId, settings.width as number])
      )
    );
    const [sort, setSort] = useState<ExecutionTableSortOrder>(EXECUTION_TABLE_DEFAULT_SORT);
    const [pageSize, setPageSize] = useState(EXECUTION_TABLE_DEFAULT_PAGE_SIZE);
    const [pageIndex, setPageIndex] = useState(0);
    const { selectedExecutionId, setSelectedExecution } = useWorkflowUrlState();

    const handleOpenExecution = useCallback(
      (execution: { id: string }) => {
        setSelectedExecution(execution.id);
      },
      [setSelectedExecution]
    );

    const maxPageIndex = useMemo(() => getMaxPageIndex(pageSize), [pageSize]);

    const searchCriteriaKey = useMemo(
      () => JSON.stringify({ query, filters, spaceId, timeRange }),
      [query, filters, spaceId, timeRange]
    );

    const {
      data: searchResponse,
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

    const executions = useMemo(() => searchResponse?.results ?? [], [searchResponse?.results]);
    const total = searchResponse?.total ?? 0;
    const visibleExecutionIds = useMemo(
      () => executions.map((execution) => execution.id),
      [executions]
    );
    const selectionState = useWorkflowExecutionsGridSelection(visibleExecutionIds);

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

    const handleRetry = useCallback(() => {
      void refetch();
    }, [refetch]);

    const handleSetColumns = useCallback((nextColumns: string[]) => {
      setVisibleColumns(nextColumns);
    }, []);

    const handleSortWithPageReset = useCallback((nextSort: ExecutionTableSortOrder) => {
      setSort(nextSort.length > 0 ? nextSort : EXECUTION_TABLE_DEFAULT_SORT);
      setPageIndex(0);
    }, []);

    const handleColumnResize = useCallback((columnId: string, width: number | undefined) => {
      setColumnWidths((current) => ({
        ...current,
        [columnId]: width,
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

    if (isLoading && executions.length === 0) {
      return (
        <EuiPanel hasShadow={false} hasBorder data-test-subj="workflowExecutionsTableLoading">
          <EuiSkeletonText lines={5} />
        </EuiPanel>
      );
    }

    if (executions.length === 0) {
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
          <WorkflowExecutionsDataGrid
            ariaLabelledBy="workflowExecutionsTableLabel"
            executions={executions}
            visibleColumns={visibleColumns}
            columnWidths={columnWidths}
            sort={sort}
            selectedExecutionId={selectedExecutionId}
            selectionState={selectionState}
            onOpenExecution={handleOpenExecution}
            onRefresh={handleRetry}
            onSetColumns={handleSetColumns}
            onSort={handleSortWithPageReset}
            onColumnResize={handleColumnResize}
            onReRunExecution={onReRunExecution}
            onViewAllExecutionsForWorkflow={onViewAllExecutionsForWorkflow}
          />
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
