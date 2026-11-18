/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { useWorkflowExecutionRerun } from './use_workflow_executions_bulk_actions';
import { useWorkflowExecutionsPageFilters } from './use_workflow_executions_page_filters';
import { WorkflowExecutionDetailFlyout } from './workflow_execution_detail_flyout';
import { createWorkflowExecutionsDataView } from './workflow_executions_data_view';
import { WorkflowExecutionsFilters } from './workflow_executions_filters';
import { WorkflowExecutionsSearchBar } from './workflow_executions_search_bar';
import { DEFAULT_EXECUTION_PAGE_FILTERS } from './workflow_executions_page_constants';
import { ExecutionsEmptyState } from './executions_empty_state';
import { WorkflowExecutionsTable } from './workflow_executions_table';
import { useKibana } from '../../hooks/use_kibana';
import { useSpaceId } from '../../hooks/use_space_id';
import { useTelemetry } from '../../hooks/use_telemetry';
import { useWorkflowUrlState } from '../../hooks/use_workflow_url_state';
import {
  EXECUTIONS_EMPTY,
  EXECUTIONS_NO_RESULTS_SEARCH_OR_FILTERS,
  EXECUTIONS_READ_ONLY,
  useWorkflowPrototypeScenario,
} from '../../shared/workflow_prototype_scenario';

const DEFAULT_TIME_RANGE: TimeRange = {
  from: 'now-24h',
  to: 'now',
};

const DEFAULT_QUERY: Query = {
  query: '',
  language: 'kuery',
};

const DEFAULT_REFRESH_INTERVAL_MS = 5_000;

const EXECUTIONS_VIEW_ONLY_CALLOUT_DISMISSED_KEY =
  'workflows.prototypeExecutionsViewOnlyCalloutDismissed';

function readExecutionsViewOnlyCalloutDismissed() {
  try {
    return window.sessionStorage.getItem(EXECUTIONS_VIEW_ONLY_CALLOUT_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Deselecting is a consequence of the filter change, not a navigation the user asked for, and the
 * filters themselves are not in the URL — so it must replace, or Back restores the execution
 * against filters that no longer match it.
 */
const clearSelectedExecutionIfChanged = (
  previousKeyRef: React.MutableRefObject<string | null>,
  nextKey: string,
  clearSelectedExecution: () => void
) => {
  if (previousKeyRef.current !== null && previousKeyRef.current !== nextKey) {
    clearSelectedExecution();
  }
  previousKeyRef.current = nextKey;
};

export const WorkflowExecutionsPageContent = React.memo(() => {
  const { fieldFormats } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const spaceId = useSpaceId();
  const telemetry = useTelemetry();
  const dataView = useMemo(() => createWorkflowExecutionsDataView(fieldFormats), [fieldFormats]);

  const scenario = useWorkflowPrototypeScenario();
  const forceNoResults = scenario === EXECUTIONS_NO_RESULTS_SEARCH_OR_FILTERS;
  const forceEmptyExecutions = scenario === EXECUTIONS_EMPTY;
  const forceReadOnlyExecutions = scenario === EXECUTIONS_READ_ONLY;
  const [viewOnlyCalloutDismissed, setViewOnlyCalloutDismissed] = useState(
    readExecutionsViewOnlyCalloutDismissed
  );

  useEffect(() => {
    if (forceReadOnlyExecutions) {
      return;
    }
    try {
      window.sessionStorage.removeItem(EXECUTIONS_VIEW_ONLY_CALLOUT_DISMISSED_KEY);
    } catch {
      // Session storage can be blocked. The in-memory flag still resets.
    }
    setViewOnlyCalloutDismissed(false);
  }, [forceReadOnlyExecutions]);
  const [noResultsCleared, setNoResultsCleared] = useState(false);
  const [filtersInstanceKey, setFiltersInstanceKey] = useState(0);
  const [query, setQuery] = useState<Query>(DEFAULT_QUERY);
  const [submittedQuery, setSubmittedQuery] = useState<Query>(DEFAULT_QUERY);
  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE);
  const [controlFilters, setControlFilters] = useState<Filter[]>([]);
  const [searchBarFilters, setSearchBarFilters] = useState<Filter[]>([]);
  const [isRefreshPaused, setIsRefreshPaused] = useState(false);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(DEFAULT_REFRESH_INTERVAL_MS);
  const { selectedExecutionId, setSelectedExecution } = useWorkflowUrlState();
  const rerunExecution = useWorkflowExecutionRerun({ setSelectedExecution });
  const { applyWorkflowIdFilter, controlsUrlState, onFilterGroupInit, setControlsUrlState } =
    useWorkflowExecutionsPageFilters();
  const previousSubmittedSearchKey = useRef<string | null>(null);
  const previousControlFiltersKey = useRef<string | null>(null);
  const previousSearchBarFiltersKey = useRef<string | null>(null);

  useEffect(() => {
    setNoResultsCleared(false);
  }, [scenario]);

  const showDemoNoResults = forceNoResults && !noResultsCleared;
  const displayedQuery = showDemoNoResults
    ? String(query.query ?? '')
      ? query
      : { query: 'production deploy', language: 'kuery' }
    : query;
  const displayedControls = showDemoNoResults
    ? (controlsUrlState ?? DEFAULT_EXECUTION_PAGE_FILTERS).map((control) =>
        control.field_name === 'status' && !control.selected_options?.length
          ? { ...control, selected_options: ['failed'] }
          : control
      )
    : controlsUrlState;

  const clearSearchAndFilters = useCallback(() => {
    setNoResultsCleared(true);
    setQuery(DEFAULT_QUERY);
    setSubmittedQuery(DEFAULT_QUERY);
    setSearchBarFilters([]);
    setControlFilters([]);
    setTimeRange(DEFAULT_TIME_RANGE);
    setControlsUrlState(DEFAULT_EXECUTION_PAGE_FILTERS);
    setFiltersInstanceKey((key) => key + 1);
  }, [setControlsUrlState]);

  const combinedFilters = useMemo(
    () => [...controlFilters, ...searchBarFilters],
    [controlFilters, searchBarFilters]
  );

  const handleRefreshChange = useCallback(
    ({ isPaused, refreshInterval }: { isPaused: boolean; refreshInterval: number }) => {
      setIsRefreshPaused(isPaused);
      setRefreshIntervalMs(refreshInterval);
    },
    []
  );

  const handleQueryChange = useCallback(
    ({ query: nextQuery, dateRange }: { query?: Query; dateRange: TimeRange }) => {
      if (nextQuery) {
        setQuery(nextQuery);
      }
      setTimeRange(dateRange);
    },
    []
  );

  const handleQuerySubmit = useCallback(
    ({ query: nextQuery, dateRange }: { query?: Query; dateRange: TimeRange }) => {
      const nextQueryState = nextQuery ?? query;
      const prevKey = previousSubmittedSearchKey.current;
      const nextKey = JSON.stringify({ query: nextQueryState, dateRange });

      if (nextQuery) {
        setQuery(nextQuery);
        setSubmittedQuery(nextQuery);
      }
      setTimeRange(dateRange);

      if (prevKey !== nextKey) {
        const filterTypes: string[] = [];
        const queryString = String(nextQueryState?.query ?? '');
        if (queryString) {
          filterTypes.push('query');
        }
        if (dateRange.from !== DEFAULT_TIME_RANGE.from || dateRange.to !== DEFAULT_TIME_RANGE.to) {
          filterTypes.push('timeRange');
        }
        telemetry.reportWorkflowExecutionsFilterApplied({ filterTypes });

        if (queryString) {
          telemetry.reportWorkflowExecutionsSearchUsed({ hasQuery: true });
        }
      }

      clearSelectedExecutionIfChanged(previousSubmittedSearchKey, nextKey, () =>
        setSelectedExecution(null, { replace: true })
      );
    },
    [query, setSelectedExecution, telemetry]
  );

  const handleControlFiltersChange = useCallback(
    (filters: Filter[]) => {
      setControlFilters(filters);
      const nextKey = JSON.stringify(filters);
      if (previousControlFiltersKey.current !== nextKey && filters.length > 0) {
        const filterTypes = filters
          .map((f) => (f.meta?.key as string | undefined) ?? 'unknown')
          .filter(Boolean);
        telemetry.reportWorkflowExecutionsFilterApplied({ filterTypes });
      }
      clearSelectedExecutionIfChanged(previousControlFiltersKey, nextKey, () =>
        setSelectedExecution(null, { replace: true })
      );
    },
    [setSelectedExecution, telemetry]
  );

  const handleSearchBarFiltersUpdated = useCallback(
    (filters: Filter[]) => {
      setSearchBarFilters(filters);
      const nextKey = JSON.stringify(filters);
      if (previousSearchBarFiltersKey.current !== nextKey && filters.length > 0) {
        const filterTypes = filters
          .map((f) => (f.meta?.key as string | undefined) ?? 'unknown')
          .filter(Boolean);
        telemetry.reportWorkflowExecutionsFilterApplied({ filterTypes });
      }
      clearSelectedExecutionIfChanged(previousSearchBarFiltersKey, nextKey, () =>
        setSelectedExecution(null, { replace: true })
      );
    },
    [setSelectedExecution, telemetry]
  );

  const handleCloseExecution = useCallback(() => {
    setSelectedExecution(null);
  }, [setSelectedExecution]);

  const handleViewAllExecutionsForWorkflow = useCallback(
    (workflowId: string) => {
      applyWorkflowIdFilter(workflowId);
      setSelectedExecution(null, { replace: true });
    },
    [applyWorkflowIdFilter, setSelectedExecution]
  );

  const handleTimeRangeLinkClick = useCallback(() => {
    // Prefer focusing the date-range toggle so the user can narrow the window.
    // Fallbacks cover unified-search markup differences across versions.
    const datePickerTrigger =
      document.querySelector<HTMLElement>(
        '[data-test-subj="workflowExecutionsSearchBar"] [data-test-subj="superDatePickerToggleQuickMenuButton"]'
      ) ??
      document.querySelector<HTMLElement>(
        '[data-test-subj="workflowExecutionsSearchBar"] [data-test-subj="superDatePickerShowDatesButton"]'
      ) ??
      document.querySelector<HTMLElement>(
        '[data-test-subj="workflowExecutionsSearchBar"] [data-test-subj="superDatePickerstartDatePopoverButton"]'
      );

    if (datePickerTrigger) {
      datePickerTrigger.focus();
      datePickerTrigger.click();
    }

    // TODO: Wire a SearchBar/date-picker ref API when available instead of DOM query.
  }, []);

  if (forceEmptyExecutions) {
    return (
      <div
        data-test-subj="workflowExecutionsPageContent"
        css={{ display: 'flex', flexGrow: 1, alignItems: 'center' }}
      >
        <ExecutionsEmptyState />
      </div>
    );
  }

  return (
    <div data-test-subj="workflowExecutionsPageContent">
      <WorkflowExecutionsSearchBar
        dataView={dataView}
        filters={searchBarFilters}
        isRefreshPaused={isRefreshPaused}
        onFiltersUpdated={handleSearchBarFiltersUpdated}
        onQueryChange={handleQueryChange}
        onQuerySubmit={handleQuerySubmit}
        onRefreshChange={handleRefreshChange}
        query={displayedQuery}
        refreshInterval={refreshIntervalMs}
        timeRange={timeRange}
      />
      <EuiSpacer size="m" />
      <WorkflowExecutionsFilters
        key={filtersInstanceKey}
        controlsUrlState={displayedControls}
        filters={controlFilters}
        onFilterGroupInit={onFilterGroupInit}
        onFiltersChange={handleControlFiltersChange}
        query={submittedQuery}
        setControlsUrlState={setControlsUrlState}
        timeRange={timeRange}
      />
      <EuiSpacer size="l" />
      {forceReadOnlyExecutions && !viewOnlyCalloutDismissed ? (
        <>
          <div
            css={css`
              .euiCallOut > div:first-child {
                flex-direction: row;
                align-items: center;
                gap: ${euiTheme.size.l};
              }

              .euiCallOut [data-test-subj='executions-view-only-callout__actions'] {
                margin-inline-start: 0;
                align-self: center;
                flex-shrink: 0;
              }
            `}
          >
            <EuiCallOut
              announceOnMount
              color="warning"
              iconType="warning"
              size="s"
              title={i18n.translate('workflows.executionsPage.viewOnly.title', {
                defaultMessage: 'View only',
              })}
              text={i18n.translate('workflows.executionsPage.viewOnly.body', {
                defaultMessage: "You don't have permissions to run or edit executions.",
              })}
              actionProps={{
                primary: {
                  children: i18n.translate('workflows.executionsPage.viewOnly.contactAdministrator', {
                    defaultMessage: 'Contact your administrator',
                  }),
                  // No destination yet. The button is the agreed placeholder.
                  onClick: () => undefined,
                  'data-test-subj': 'executions-view-only-contact-administrator',
                },
              }}
              onDismiss={() => {
                try {
                  window.sessionStorage.setItem(EXECUTIONS_VIEW_ONLY_CALLOUT_DISMISSED_KEY, 'true');
                } catch {
                  // Session storage can be blocked. The in-memory flag still hides it.
                }
                setViewOnlyCalloutDismissed(true);
              }}
              data-test-subj="executions-view-only-callout"
            />
          </div>
          <EuiSpacer size="l" />
        </>
      ) : null}
      {spaceId ? (
        <WorkflowExecutionsTable
          filters={combinedFilters}
          liveUpdateIntervalMs={
            !isRefreshPaused && refreshIntervalMs > 0 ? refreshIntervalMs : undefined
          }
          onReRunExecution={rerunExecution}
          onViewAllExecutionsForWorkflow={handleViewAllExecutionsForWorkflow}
          onTimeRangeLinkClick={handleTimeRangeLinkClick}
          onClearSearchAndFilters={clearSearchAndFilters}
          forceNoResults={showDemoNoResults}
          forceReadOnly={forceReadOnlyExecutions}
          query={submittedQuery}
          spaceId={spaceId}
          timeRange={timeRange}
        />
      ) : null}
      {selectedExecutionId ? (
        <WorkflowExecutionDetailFlyout
          executionId={selectedExecutionId}
          onClose={handleCloseExecution}
          onReRunExecution={rerunExecution}
          onViewAllExecutionsForWorkflow={handleViewAllExecutionsForWorkflow}
        />
      ) : null}
    </div>
  );
});
WorkflowExecutionsPageContent.displayName = 'WorkflowExecutionsPageContent';
