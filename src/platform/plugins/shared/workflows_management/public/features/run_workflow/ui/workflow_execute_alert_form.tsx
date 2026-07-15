/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { take } from 'rxjs';
import { useFetchAlertsIndexNamesQuery } from '@kbn/alerts-ui-shared';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import type { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { CustomGridColumnsConfiguration } from '@kbn/unified-data-table';
import {
  useWorkflowExecuteHitTabSearchState,
  type WorkflowExecuteHitTabFetchPageParams,
} from './use_workflow_execute_hit_tab_search_state';
import {
  parseSearchTotalHits,
  WORKFLOW_EXECUTE_HIT_SEARCH_PAGE_SIZE,
} from './workflow_execute_hit_search_pagination';
import { buildWorkflowExecuteHitSearchEsSort } from './workflow_execute_hit_search_sort';
import { buildAlertTriggerInputFromRecords } from './workflow_execute_hit_selection_payload';
import { createAlertMessageCellRenderer } from './workflow_execute_hit_table_cells';
import { WORKFLOW_EXECUTE_TABLE_TAB_ROOT_CLASS } from './workflow_execute_modal_global_styles';
import { WorkflowExecuteUnifiedDataTable } from './workflow_execute_unified_data_table';
import { useKibana } from '../../../hooks/use_kibana';

/** Timestamp, rule name, and alert message/reason. */
export const DEFAULT_ALERT_TABLE_COLUMNS = [
  '@timestamp',
  'kibana.alert.rule.name',
  'kibana.alert.reason',
] as const;

/** Isolates KQL recent-search history from other run-workflow tabs. */
export const WORKFLOW_EXECUTE_ALERT_SEARCH_APP_NAME = 'workflow_management_alerts';

export interface WorkflowExecuteAlertFormProps {
  value: string;
  setValue: (data: string) => void;
  errors: string | null;
  setErrors: (errors: string | null) => void;
  /**
   * When false, RAC alert index/fields HTTP calls are not made
   */
  racQueriesEnabled?: boolean;
  isTableGridFullScreen?: boolean;
  onTableGridFullScreenChange?: (isFullScreen: boolean) => void;
}

export const WorkflowExecuteAlertForm = ({
  value: _value,
  setValue,
  errors,
  setErrors,
  racQueriesEnabled = true,
  isTableGridFullScreen = false,
  onTableGridFullScreenChange,
}: WorkflowExecuteAlertFormProps): React.JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const tableSurfaceColor = euiTheme.colors.backgroundBasePlain;
  const { services } = useKibana();
  const { http, notifications, data: dataService, unifiedSearch } = services;
  const { SearchBar } = unifiedSearch.ui;
  const [dataView, setDataView] = useState<DataView | null>(null);
  const dataViewCreatingRef = useRef(false);

  const resolveFetchError = useCallback(
    (error: unknown) =>
      error instanceof Error
        ? error.message
        : i18n.translate('workflows.workflowExecuteEventForm.fetchError', {
            defaultMessage: 'Failed to fetch alerts',
          }),
    []
  );

  const fetchAlertsPage = useCallback(
    async ({
      pageIndex,
      submittedQueryString,
      timeRange,
      tableSort,
    }: WorkflowExecuteHitTabFetchPageParams) => {
      if (!dataService || !dataView) {
        return { pageHits: [], total: 0 };
      }

      const searchSource = await dataService.search.searchSource.create();

      searchSource.setField('index', dataView);

      if (submittedQueryString) {
        searchSource.setField('query', {
          query: submittedQueryString,
          language: 'kuery',
        });
      }

      const timeFilter: Filter = {
        query: {
          range: {
            '@timestamp': {
              gte: timeRange.from,
              lte: timeRange.to,
              format: 'strict_date_optional_time',
            },
          },
        },
        meta: {
          type: 'custom',
        },
      };

      searchSource.setField('filter', [timeFilter]);
      searchSource.setField('sort', buildWorkflowExecuteHitSearchEsSort(tableSort, dataView));
      searchSource.setField('from', pageIndex * WORKFLOW_EXECUTE_HIT_SEARCH_PAGE_SIZE);
      searchSource.setField('size', WORKFLOW_EXECUTE_HIT_SEARCH_PAGE_SIZE);
      searchSource.setField('trackTotalHits', true);

      const response = await searchSource.fetch$().pipe(take(1)).toPromise();
      const pageHits = (response?.rawResponse?.hits?.hits ?? []) as EsHitRecord[];

      return {
        pageHits,
        total: parseSearchTotalHits(response?.rawResponse?.hits?.total),
      };
    },
    [dataService, dataView]
  );

  const handleAlertSelection = useCallback(
    (selectedRecords: DataTableRecord[]) => {
      const payload = buildAlertTriggerInputFromRecords(selectedRecords);
      if (payload) {
        setValue(JSON.stringify(payload, null, 2));
      } else {
        setValue('');
      }
    },
    [setValue]
  );

  const alertMessageRenderer = useMemo(() => createAlertMessageCellRenderer(), []);

  const ruleColumnLabel = i18n.translate('workflows.workflowExecuteAlertForm.ruleColumn', {
    defaultMessage: 'Rule',
  });
  const messageColumnLabel = i18n.translate(
    'workflows.workflowExecuteEventForm.messageColumnHeader',
    {
      defaultMessage: 'Message',
    }
  );

  const customGridColumnsConfiguration = useMemo<CustomGridColumnsConfiguration>(
    () => ({
      'kibana.alert.rule.name': ({ column }) => ({
        ...column,
        displayAsText: ruleColumnLabel,
        display: ruleColumnLabel,
      }),
      'kibana.alert.reason': ({ column }) => ({
        ...column,
        displayAsText: messageColumnLabel,
        display: messageColumnLabel,
      }),
    }),
    [messageColumnLabel, ruleColumnLabel]
  );

  const {
    query,
    timeRange,
    handleQueryChange,
    handleQuerySubmit,
    hitSearch,
    tableConfig,
    handleSortChange,
  } = useWorkflowExecuteHitTabSearchState({
    dataView,
    services,
    setErrors,
    resolveFetchError,
    fetchPage: fetchAlertsPage,
    defaultColumns: DEFAULT_ALERT_TABLE_COLUMNS,
    externalCustomRenderers: alertMessageRenderer,
    customGridColumnsConfiguration,
    onSelectionChange: handleAlertSelection,
    isTableGridFullScreen,
    onTableGridFullScreenChange,
  });

  // Fetch alert indices via the RAC endpoint (handles space-unaware systems like o11y)
  // Empty ruleTypeIds + enabled → returns indices for all authorized rule types.
  const { data: alertIndexNames } = useFetchAlertsIndexNamesQuery(
    { http, ruleTypeIds: [] },
    {
      enabled: racQueriesEnabled,
      retry: false,
    }
  );

  const indexPattern = useMemo(
    () => (alertIndexNames && alertIndexNames.length > 0 ? alertIndexNames.join(',') : undefined),
    [alertIndexNames]
  );

  useEffect(() => {
    if (!dataService || !indexPattern) {
      return;
    }

    if (dataViewCreatingRef.current) {
      return;
    }

    dataViewCreatingRef.current = true;

    const createDataView = async () => {
      try {
        const newDataView = await dataService.dataViews.create({
          title: indexPattern,
          timeFieldName: '@timestamp',
        });
        try {
          await dataService.dataViews.refreshFields(newDataView, false, true);
        } catch {
          notifications.toasts.addWarning({
            title: i18n.translate('workflows.workflowExecuteAlertForm.refreshFieldsErrorTitle', {
              defaultMessage: 'Failed to refresh fields',
            }),
            text: i18n.translate('workflows.workflowExecuteAlertForm.refreshFieldsError', {
              defaultMessage: 'Some alert fields may be missing from KQL suggestions.',
            }),
          });
        }
        setDataView(newDataView);
      } catch (err) {
        setErrors(
          i18n.translate('workflows.workflowExecuteEventForm.dataViewError', {
            defaultMessage: 'Failed to create data view for alerts',
          })
        );
      } finally {
        dataViewCreatingRef.current = false;
      }
    };

    createDataView();
  }, [dataService, indexPattern, notifications.toasts, setErrors]);

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
          <SearchBar
            key={dataView?.id ?? 'no-alert-dataview'}
            appName={WORKFLOW_EXECUTE_ALERT_SEARCH_APP_NAME}
            useDefaultBehaviors={true}
            onQueryChange={handleQueryChange}
            onQuerySubmit={handleQuerySubmit}
            query={query}
            indexPatterns={dataView ? [dataView] : []}
            showDatePicker={true}
            dateRangeFrom={timeRange.from}
            dateRangeTo={timeRange.to}
            showFilterBar={false}
            showSubmitButton={true}
            placeholder={i18n.translate('workflows.workflowExecuteAlertForm.searchPlaceholder', {
              defaultMessage:
                'Filter your data using KQL syntax (e.g., kibana.alert.rule.name:test)',
            })}
            data-test-subj="workflow-alert-query-input"
            displayStyle="inPage"
          />
        </EuiFlexItem>
      ) : null}

      {errors && (
        <EuiFlexItem grow={false}>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('workflows.workflowExecuteEventForm.errorTitle', {
              defaultMessage: 'Failed to load alerts',
            })}
            color="warning"
            iconType="help"
            size="s"
          >
            <p>{errors}</p>
            <EuiText size="s">
              {i18n.translate('workflows.workflowExecuteEventForm.errorMessage', {
                defaultMessage:
                  'Make sure you have the proper permissions to access security alerts, or manually enter the event data below.',
              })}
            </EuiText>
          </EuiCallOut>
        </EuiFlexItem>
      )}

      <WorkflowExecuteUnifiedDataTable
        dataTestSubj="workflowAlertsTable"
        fillHeight={true}
        euiTheme={euiTheme}
        tableSurfaceColor={tableSurfaceColor}
        timestampCellTypography={tableConfig.timestampCellTypography}
        tableLoadingState={hitSearch.tableLoadingState}
        dataView={dataView}
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
WorkflowExecuteAlertForm.displayName = 'WorkflowExecuteAlertForm';
