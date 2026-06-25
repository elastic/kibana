/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { take } from 'rxjs';
import type { DataView, DataViewListItem } from '@kbn/data-views-plugin/public';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import { buildEsQuery, type Query } from '@kbn/es-query';
import type { SearchHit } from '@kbn/es-types';
import { i18n } from '@kbn/i18n';
import type { IEsSearchRequest, IEsSearchResponse } from '@kbn/search-types';
import type { CustomGridColumnsConfiguration } from '@kbn/unified-data-table';
import { DataViewPicker } from '@kbn/unified-search-plugin/public';
import {
  useWorkflowExecuteHitTabSearchState,
  type WorkflowExecuteHitTabFetchPageParams,
} from './use_workflow_execute_hit_tab_search_state';
import {
  parseSearchTotalHits,
  WORKFLOW_EXECUTE_HIT_SEARCH_PAGE_SIZE,
} from './workflow_execute_hit_search_pagination';
import { buildWorkflowExecuteHitSearchEsSort } from './workflow_execute_hit_search_sort';
import { buildDocumentTriggerInputFromRecords } from './workflow_execute_hit_selection_payload';
import { createDocumentSummaryCellRenderer } from './workflow_execute_hit_table_cells';
import { WORKFLOW_EXECUTE_TABLE_TAB_ROOT_CLASS } from './workflow_execute_modal_global_styles';
import { WorkflowExecuteUnifiedDataTable } from './workflow_execute_unified_data_table';
import { useKibana } from '../../../hooks/use_kibana';

interface DocumentSource {
  '@timestamp': string;
  agent?: string;
  user?: string;
  [key: string]: unknown;
}

interface WorkflowExecuteIndexFormProps {
  setValue: (data: string) => void;
  errors: string | null;
  setErrors: (errors: string | null) => void;
  isTableGridFullScreen?: boolean;
  onTableGridFullScreenChange?: (isFullScreen: boolean) => void;
}

/** Timestamp plus inline document preview in the `document` column. */
export const DEFAULT_DOCUMENT_TABLE_COLUMNS = ['@timestamp', 'document'] as const;

export const WorkflowExecuteIndexForm = ({
  setValue,
  errors,
  setErrors,
  isTableGridFullScreen = false,
  onTableGridFullScreenChange,
}: WorkflowExecuteIndexFormProps): React.JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const tableSurfaceColor = euiTheme.colors.backgroundBasePlain;
  const { services } = useKibana();
  const { unifiedSearch, notifications } = services;
  const { SearchBar } = unifiedSearch.ui;
  const [selectedDataView, setSelectedDataView] = useState<DataView | null>(null);
  const [dataViews, setDataViews] = useState<DataViewListItem[]>([]);
  const submittedQueryStringRef = useRef('');

  const resolveFetchError = useCallback(
    (error: unknown) =>
      error instanceof Error
        ? error.message
        : i18n.translate('workflows.workflowExecuteIndexForm.fetchDocumentsError', {
            defaultMessage: 'Failed to fetch documents',
          }),
    []
  );

  const fetchDocumentsPage = useCallback(
    async ({
      pageIndex,
      submittedQueryString,
      timeRange,
      tableSort,
    }: WorkflowExecuteHitTabFetchPageParams) => {
      if (!selectedDataView || !services.data) {
        return { pageHits: [], total: 0 };
      }

      const submittedQuery: Query = { query: submittedQueryString, language: 'kuery' };

      let esQuery;
      try {
        esQuery = buildEsQuery(selectedDataView, submittedQueryString ? [submittedQuery] : [], []);
      } catch {
        throw new Error(
          i18n.translate('workflows.workflowExecuteIndexForm.buildQueryError', {
            defaultMessage: 'Failed to build query',
          })
        );
      }

      const searchQuery = {
        bool: {
          must: esQuery.bool.must || [],
          filter: [
            ...(esQuery.bool.filter || []),
            {
              range: {
                '@timestamp': {
                  gte: timeRange?.from || 'now-15m',
                  lte: timeRange?.to || 'now',
                },
              },
            },
          ],
          should: esQuery.bool.should || [],
          must_not: esQuery.bool.must_not || [],
        },
      };

      const request: IEsSearchRequest = {
        params: {
          index: selectedDataView.getIndexPattern(),
          query: searchQuery,
          from: pageIndex * WORKFLOW_EXECUTE_HIT_SEARCH_PAGE_SIZE,
          size: WORKFLOW_EXECUTE_HIT_SEARCH_PAGE_SIZE,
          track_total_hits: true,
          sort: buildWorkflowExecuteHitSearchEsSort(tableSort, selectedDataView),
        },
      };

      const response = await services.data.search
        .search<IEsSearchRequest, IEsSearchResponse<DocumentSource>>(request)
        .pipe(take(1))
        .toPromise();

      const pageHits: EsHitRecord[] =
        response?.rawResponse?.hits?.hits.filter(
          (hit): hit is SearchHit<DocumentSource> => !!hit._source
        ) ?? [];

      return {
        pageHits,
        total: parseSearchTotalHits(response?.rawResponse?.hits?.total),
      };
    },
    [selectedDataView, services.data]
  );

  const handleDocumentSelection = useCallback(
    (selectedRecords: DataTableRecord[]) => {
      const payload = buildDocumentTriggerInputFromRecords(selectedRecords, {
        submittedQuery: submittedQueryStringRef.current,
        dataViewTitle: selectedDataView?.title,
      });
      if (payload) {
        setValue(JSON.stringify(payload, null, 2));
      } else {
        setValue('');
      }
    },
    [selectedDataView?.title, setValue]
  );

  const documentSummaryRenderer = useMemo(
    () =>
      createDocumentSummaryCellRenderer({
        dataView: selectedDataView,
        fieldFormats: services.fieldFormats,
      }),
    [selectedDataView, services.fieldFormats]
  );

  const documentColumnLabel = i18n.translate('workflows.workflowExecuteIndexForm.documentColumn', {
    defaultMessage: 'Document',
  });

  const customGridColumnsConfiguration = useMemo<CustomGridColumnsConfiguration>(
    () => ({
      document: ({ column }) => ({
        ...column,
        displayAsText: documentColumnLabel,
        display: documentColumnLabel,
      }),
    }),
    [documentColumnLabel]
  );

  const {
    query,
    timeRange,
    submittedQueryString,
    handleQueryChange,
    handleQuerySubmit,
    hitSearch,
    tableConfig,
    handleSortChange,
  } = useWorkflowExecuteHitTabSearchState({
    dataView: selectedDataView,
    services,
    setErrors,
    resolveFetchError,
    fetchPage: fetchDocumentsPage,
    defaultColumns: DEFAULT_DOCUMENT_TABLE_COLUMNS,
    externalCustomRenderers: documentSummaryRenderer,
    customGridColumnsConfiguration,
    ensureColumnWhenOnlyTimeField: 'document',
    onSelectionChange: handleDocumentSelection,
    isTableGridFullScreen,
    onTableGridFullScreenChange,
  });

  submittedQueryStringRef.current = submittedQueryString;

  useEffect(() => {
    const loadDataViews = async () => {
      if (!services.dataViews) {
        return;
      }

      try {
        const dataViewsList = await services.dataViews.getIdsWithTitle();
        setDataViews(dataViewsList);

        const defaultDataView =
          dataViewsList.find((dv: DataViewListItem) => dv.title.startsWith('logs-')) ||
          dataViewsList[0];
        if (defaultDataView) {
          const dataView = await services.dataViews.get(defaultDataView.id);
          await services.dataViews.refreshFields(dataView, false, true);
          setSelectedDataView(dataView);
        }
      } catch (error) {
        setErrors(
          i18n.translate('workflows.workflowExecuteIndexForm.loadDataViewsError', {
            defaultMessage: 'Failed to load data views',
          })
        );
      }
    };

    loadDataViews();
  }, [services.dataViews, setErrors]);

  const handleDataViewChange = useCallback(
    async (dataViewId: string) => {
      if (!services.dataViews) {
        return;
      }

      try {
        const dataView = await services.dataViews.get(dataViewId);

        if (!dataView.fields.length) {
          try {
            await services.dataViews.refreshFields(dataView, false, true);
          } catch (refreshError) {
            notifications.toasts.addWarning({
              title: i18n.translate('workflows.workflowExecuteIndexForm.refreshFieldsErrorTitle', {
                defaultMessage: 'Failed to refresh fields',
              }),
              text: i18n.translate('workflows.workflowExecuteIndexForm.refreshFieldsError', {
                defaultMessage: 'Some data view fields may be outdated.',
              }),
            });
          }
        }

        setSelectedDataView(dataView);
      } catch (error) {
        setErrors(
          i18n.translate('workflows.workflowExecuteIndexForm.loadDataViewError', {
            defaultMessage: 'Failed to load data view',
          })
        );
      }
    },
    [services.dataViews, setErrors, notifications.toasts]
  );

  return (
    <EuiFlexGroup
      className={WORKFLOW_EXECUTE_TABLE_TAB_ROOT_CLASS}
      direction="column"
      gutterSize="s"
      css={css({
        flex: 1,
        minHeight: 0,
        height: '100%',
      })}
    >
      {!isTableGridFullScreen ? (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem grow={false}>
              <DataViewPicker
                trigger={{
                  'data-test-subj': 'workflow-data-view-selector',
                  label:
                    selectedDataView?.name ||
                    selectedDataView?.title ||
                    i18n.translate('workflows.workflowExecuteIndexForm.selectDataView', {
                      defaultMessage: 'Select data view',
                    }),
                  fullWidth: true,
                  size: 's',
                }}
                savedDataViews={dataViews}
                currentDataViewId={selectedDataView?.id}
                onChangeDataView={handleDataViewChange}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <SearchBar
                key={selectedDataView?.id || 'no-dataview'}
                appName="workflow_management"
                useDefaultBehaviors={true}
                onQueryChange={handleQueryChange}
                onQuerySubmit={handleQuerySubmit}
                query={query}
                indexPatterns={selectedDataView ? [selectedDataView] : []}
                showDatePicker={true}
                dateRangeFrom={timeRange?.from || 'now-15m'}
                dateRangeTo={timeRange?.to || 'now'}
                showFilterBar={false}
                showSubmitButton={true}
                placeholder={i18n.translate(
                  'workflows.workflowExecuteIndexForm.searchPlaceholder',
                  {
                    defaultMessage: 'Filter your data using KQL syntax',
                  }
                )}
                data-test-subj="workflow-query-input"
                displayStyle="inPage"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}

      {errors && (
        <EuiFlexItem grow={false}>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('workflows.workflowExecuteIndexForm.errorTitle', {
              defaultMessage: 'Error',
            })}
            color="danger"
            iconType="error"
            size="s"
          >
            <p>{errors}</p>
          </EuiCallOut>
        </EuiFlexItem>
      )}

      <WorkflowExecuteUnifiedDataTable
        dataTestSubj="workflowDocumentsTable"
        fillHeight={true}
        euiTheme={euiTheme}
        tableSurfaceColor={tableSurfaceColor}
        timestampCellTypography={tableConfig.timestampCellTypography}
        tableLoadingState={hitSearch.tableLoadingState}
        dataView={selectedDataView}
        getNoCellActions={tableConfig.getNoCellActions}
        visibleTableColumns={tableConfig.visibleTableColumns}
        columnsMeta={tableConfig.columnsMeta}
        dataTableRows={tableConfig.dataTableRows}
        rowsLength={hitSearch.hits.length}
        unifiedDataTableServices={tableConfig.unifiedDataTableServices}
        handleUnifiedDataTableSetColumns={tableConfig.handleUnifiedDataTableSetColumns}
        showTimeColumn={tableConfig.showTimeColumn}
        sort={tableConfig.sort}
        handleSortChange={handleSortChange}
        customGridColumnsConfiguration={tableConfig.customGridColumnsConfiguration}
        renderCustomToolbar={tableConfig.renderCustomToolbar}
        renderCellPopover={tableConfig.renderCellPopover}
        externalCustomRenderers={tableConfig.externalCustomRenderers}
        totalHits={hitSearch.totalHits}
        onFetchMoreRecords={hitSearch.onFetchMoreRecords}
        isTableGridFullScreen={isTableGridFullScreen}
        onDataGridFullScreenChange={onTableGridFullScreenChange}
      />
    </EuiFlexGroup>
  );
};
