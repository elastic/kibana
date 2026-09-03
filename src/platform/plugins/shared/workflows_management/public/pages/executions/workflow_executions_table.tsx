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
  EuiFocusTrap,
  EuiPanel,
  EuiSkeletonText,
  EuiTablePagination,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RerunWorkflowExecutionParams } from './build_replay_inputs_from_execution_context';
import { useWorkflowExecutionsGridSelection } from './use_workflow_executions_grid_selection';
import { useWorkflowExecutionsSearch } from './use_workflow_executions_search';
import { WorkflowExecutionsDataGrid } from './workflow_executions_data_grid';
import type { ExecutionsGroupBy } from './workflow_executions_group_by';
import { WorkflowExecutionsGroupedView } from './workflow_executions_grouped_view';
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
import { WorkflowExecutionsTableEndOfResults } from './workflow_executions_table_end_of_results';
import { getWorkflowExecutionsTableGridWrapperCss } from './workflow_executions_table_styles';
import { WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW } from '../../../common';
import { useSerialPolling } from '../../hooks/use_serial_polling';
import { useTelemetry } from '../../hooks/use_telemetry';
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
  query: Query;
  filters: Filter[];
  liveUpdateIntervalMs?: number;
  onReRunExecution?: (params: RerunWorkflowExecutionParams) => Promise<void>;
  onViewAllExecutionsForWorkflow?: (workflowId: string) => void;
  onTimeRangeLinkClick?: () => void;
  timeRange: TimeRange;
  spaceId: string;
}

export const WorkflowExecutionsTable = React.memo<WorkflowExecutionsTableProps>(
  ({
    filters,
    liveUpdateIntervalMs,
    onReRunExecution,
    onViewAllExecutionsForWorkflow,
    onTimeRangeLinkClick,
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
          .filter(([, settings]) => settings.initialWidth != null)
          .map(([columnId, settings]) => [columnId, settings.initialWidth as number])
      )
    );
    const [sort, setSort] = useState<ExecutionTableSortOrder>(EXECUTION_TABLE_DEFAULT_SORT);
    const [pageSize, setPageSize] = useState(EXECUTION_TABLE_DEFAULT_PAGE_SIZE);
    const [pageIndex, setPageIndex] = useState(0);
    const [groupBy, setGroupBy] = useState<ExecutionsGroupBy>('none');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const fullscreenButtonRef = useRef<HTMLButtonElement>(null);
    const { euiTheme } = useEuiTheme();
    const { selectedExecutionId, setSelectedExecution } = useWorkflowUrlState();
    const telemetry = useTelemetry();

    const handleOpenExecution = useCallback(
      (execution: { id: string }) => {
        setSelectedExecution(execution.id);
        telemetry.reportWorkflowExecutionsDetailOpened({ executionId: execution.id });
      },
      [setSelectedExecution, telemetry]
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

    useEffect(() => {
      if (!isFullscreen) {
        return undefined;
      }

      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsFullscreen(false);
        }
      };

      window.addEventListener('keydown', onKeyDown);
      return () => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener('keydown', onKeyDown);
      };
    }, [isFullscreen]);

    const wasFullscreenRef = useRef(false);
    useEffect(() => {
      if (wasFullscreenRef.current && !isFullscreen) {
        fullscreenButtonRef.current?.focus();
      }
      wasFullscreenRef.current = isFullscreen;
    }, [isFullscreen]);

    const handleRetry = useCallback(() => {
      void refetch();
    }, [refetch]);

    const handleToggleFullscreen = useCallback(() => {
      setIsFullscreen((prev) => !prev);
    }, []);

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
    const showEndOfResults = isPaginationLimited && pageIndex === maxPageIndex;
    const isGrouped = groupBy !== 'none';

    const fullscreenCss = useMemo(
      () =>
        isFullscreen
          ? css`
              position: fixed;
              inset: 0;
              z-index: ${euiTheme.levels.mask};
              background: ${euiTheme.colors.emptyShade};
              padding: ${euiTheme.size.l};
              display: flex;
              flex-direction: column;
              min-height: 0;
            `
          : undefined,
      [euiTheme.colors.emptyShade, euiTheme.levels.mask, euiTheme.size.l, isFullscreen]
    );

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
      <EuiFocusTrap disabled={!isFullscreen} returnFocus={false}>
        <div
          css={[tableContainerCss, fullscreenCss]}
          data-test-subj="workflowExecutionsTable"
          data-fullscreen={isFullscreen ? 'true' : undefined}
        >
          <div css={gridWrapperCss}>
            <WorkflowExecutionsDataGrid
              ariaLabelledBy="workflowExecutionsTableLabel"
              executions={executions}
              visibleColumns={visibleColumns}
              columnWidths={columnWidths}
              sort={sort}
              selectedExecutionId={selectedExecutionId}
              selectionState={selectionState}
              pageIndex={pageIndex}
              pageSize={pageSize}
              totalHits={total}
              toolbarOnly={isGrouped}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreen}
              fullscreenButtonRef={fullscreenButtonRef}
              onOpenExecution={handleOpenExecution}
              onRefresh={handleRetry}
              onSetColumns={handleSetColumns}
              onSort={handleSortWithPageReset}
              onColumnResize={handleColumnResize}
              onReRunExecution={onReRunExecution}
              onViewAllExecutionsForWorkflow={onViewAllExecutionsForWorkflow}
            />
            {isGrouped ? (
              <WorkflowExecutionsGroupedView
                executions={executions}
                groupBy={groupBy}
                onOpenExecution={handleOpenExecution}
                onReRunExecution={onReRunExecution}
                onViewAllExecutionsForWorkflow={onViewAllExecutionsForWorkflow}
              />
            ) : null}
          </div>
          {showEndOfResults ? (
            <WorkflowExecutionsTableEndOfResults onTimeRangeLinkClick={onTimeRangeLinkClick} />
          ) : null}
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
      </EuiFocusTrap>
    );
  }
);
WorkflowExecutionsTable.displayName = 'WorkflowExecutionsTable';
