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
import { take } from 'rxjs';
import { CellActionsProvider } from '@kbn/cell-actions';
import { SortDirection } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { buildDataTableRecordList } from '@kbn/discover-utils';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { ESSearchResponse, SearchHit } from '@kbn/es-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  DataLoadingState,
  type SortOrder,
  UnifiedDataTable,
  type UnifiedDataTableSettings,
} from '@kbn/unified-data-table';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { WorkflowExecutionDetailFlyout } from './workflow_execution_detail_flyout';
import {
  buildWorkflowExecutionsSearchFilters,
  getWorkflowExecutionsFetchErrorMessage,
  isWorkflowExecutionsIndexNotFoundError,
} from './workflow_executions_search_query';
import { useKibana } from '../../hooks/use_kibana';

const DEFAULT_COLUMNS = ['workflowId', 'status', 'id', 'triggeredBy', 'executedBy'] as const;
const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_SORT: SortOrder[] = [['startedAt', 'desc']];

const gridStyleOverride = {
  border: 'all' as const,
  header: 'shade' as const,
  stripes: false,
};

const tableContainerCss = css`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
`;

const gridWrapperCss = css`
  flex: 1 1 auto;
`;

export interface WorkflowExecutionsTableProps {
  dataView: DataView;
  query: Query;
  filters: Filter[];
  timeRange: TimeRange;
  spaceId: string;
}

export const WorkflowExecutionsTable = React.memo<WorkflowExecutionsTableProps>(
  ({ dataView, query, filters, timeRange, spaceId }) => {
    const {
      data: dataService,
      fieldFormats,
      notifications: { toasts },
      storage,
      theme,
      uiActions,
      uiSettings,
    } = useKibana().services;

    const [hits, setHits] = useState<EsHitRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [loadingState, setLoadingState] = useState<DataLoadingState>(DataLoadingState.loading);
    const [error, setError] = useState<string | null>(null);

    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [sort, setSort] = useState<SortOrder[]>(DEFAULT_SORT);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(Array.from(DEFAULT_COLUMNS));
    const [gridSettings, setGridSettings] = useState<UnifiedDataTableSettings>({});
    const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>();
    const [retryToken, setRetryToken] = useState(0);
    const timeFrom = timeRange.from;
    const timeTo = timeRange.to;

    useEffect(() => {
      let cancelled = false;

      const fetchExecutions = async () => {
        setLoadingState(DataLoadingState.loading);
        setError(null);

        try {
          const searchSource = await dataService.search.searchSource.create();
          const timeField = dataView.timeFieldName ?? 'startedAt';
          const searchFilters = buildWorkflowExecutionsSearchFilters({
            spaceId,
            timeRange: { from: timeFrom, to: timeTo },
            timeField,
            userFilters: filters,
          });

          searchSource.setField('index', dataView);

          if (query?.query) {
            searchSource.setField('query', query);
          }

          searchSource.setField('filter', searchFilters);
          searchSource.setField('from', pageIndex * pageSize);
          searchSource.setField('size', pageSize);
          searchSource.setField(
            'sort',
            sort.map(([field, direction]) => ({
              [field]: {
                order: direction === 'asc' ? SortDirection.asc : SortDirection.desc,
              },
            }))
          );
          searchSource.setField('trackTotalHits', true);

          const response = await searchSource.fetch$().pipe(take(1)).toPromise();

          if (cancelled) {
            return;
          }

          const rawResponse = response?.rawResponse as
            | ESSearchResponse<EsWorkflowExecution>
            | undefined;
          const responseHits = (rawResponse?.hits?.hits ?? []).filter(
            (hit: SearchHit<EsWorkflowExecution>): hit is SearchHit<EsWorkflowExecution> =>
              hit._source != null
          ) as unknown as EsHitRecord[];
          const totalHits = rawResponse?.hits?.total;
          const totalCount =
            typeof totalHits === 'number' ? totalHits : totalHits?.value ?? responseHits.length;

          setHits(responseHits);
          setTotal(totalCount);
          setLoadingState(DataLoadingState.loaded);
        } catch (err) {
          if (cancelled) {
            return;
          }

          if (isWorkflowExecutionsIndexNotFoundError(err)) {
            setHits([]);
            setTotal(0);
            setError(null);
            setLoadingState(DataLoadingState.loaded);
            return;
          }

          setError(getWorkflowExecutionsFetchErrorMessage());
          setHits([]);
          setTotal(0);
          setLoadingState(DataLoadingState.loaded);
        }
      };

      fetchExecutions();

      return () => {
        cancelled = true;
      };
    }, [
      dataService.search.searchSource,
      dataView,
      filters,
      pageIndex,
      pageSize,
      query,
      retryToken,
      sort,
      spaceId,
      timeFrom,
      timeTo,
    ]);

    useEffect(() => {
      setPageIndex(0);
      setExpandedDoc(undefined);
    }, [query, filters, spaceId, timeFrom, timeTo]);

    const handleRetry = useCallback(() => {
      setRetryToken((n) => n + 1);
    }, []);

    const rows = useMemo<DataTableRecord[]>(
      () => buildDataTableRecordList({ records: hits, dataView }),
      [hits, dataView]
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

    const handleSort = useCallback((nextSort: string[][]) => {
      setSort(nextSort.length === 0 ? DEFAULT_SORT : (nextSort as SortOrder[]));
      setPageIndex(0);
    }, []);

    const handleSetColumns = useCallback((nextColumns: string[]) => {
      setVisibleColumns(nextColumns);
    }, []);

    const handleResize = useCallback((resized: { columnId: string; width: number | undefined }) => {
      setGridSettings((prev) => ({
        ...prev,
        columns: {
          ...prev.columns,
          [resized.columnId]: {
            ...prev.columns?.[resized.columnId],
            width: resized.width,
          },
        },
      }));
    }, []);

    const handlePageChange = useCallback((nextPageIndex: number) => {
      setPageIndex(nextPageIndex);
    }, []);

    const handlePageSizeChange = useCallback((nextPageSize: number) => {
      setPageSize(nextPageSize);
      setPageIndex(0);
    }, []);

    const handleCloseFlyout = useCallback(() => {
      setExpandedDoc(undefined);
    }, []);

    const renderDocumentView = useCallback(
      (hit: DataTableRecord) => (
        <WorkflowExecutionDetailFlyout hit={hit} onClose={handleCloseFlyout} />
      ),
      [handleCloseFlyout]
    );

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (error) {
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
          body={<p>{error}</p>}
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
              columns={visibleColumns}
              consumer="workflows"
              dataView={dataView}
              expandedDoc={expandedDoc}
              gridStyleOverride={gridStyleOverride}
              isPaginationEnabled={false}
              isSortEnabled
              loadingState={loadingState}
              onResize={handleResize}
              onSetColumns={handleSetColumns}
              onSort={handleSort}
              renderDocumentView={renderDocumentView}
              rows={rows}
              sampleSizeState={rows.length}
              services={services}
              setExpandedDoc={setExpandedDoc}
              settings={gridSettings}
              showColumnTokens
              showTimeCol
              sort={sort}
              totalHits={total}
            />
          </CellActionsProvider>
        </div>
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
