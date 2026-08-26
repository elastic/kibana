/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { useQuery } from '@kbn/react-query';
import type { ExecutionStatus, WorkflowExecutionListDto } from '@kbn/workflows';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import {
  EXECUTION_TABLE_SORT_FIELD_MAP,
  type ExecutionTableSortOrder,
} from './workflow_executions_page_constants';
import {
  filtersToKql,
  getWorkflowExecutionsFetchErrorMessage,
} from './workflow_executions_search_query';

export interface UseWorkflowExecutionsSearchParams {
  query: Query;
  filters: Filter[];
  timeRange: TimeRange;
  spaceId: string;
  pageIndex: number;
  pageSize: number;
  sort: ExecutionTableSortOrder;
  enabled?: boolean;
}

/**
 * Extracts selected values from Kibana Filter objects for a specific field.
 *
 * Handles filters from two sources:
 * - OptionsListControl (single selection): uses buildPhraseFilter which does NOT
 *   set meta.type; value lives in query.match_phrase[fieldKey].
 * - OptionsListControl (multi selection): uses buildPhrasesFilter which sets
 *   meta.type='phrases' and meta.params=[value1, ...].
 * - Search bar / other sources: meta.type='phrase', meta.params.query=value.
 */
const extractFilterValues = (filters: Filter[], fieldKey: string): string[] => {
  const values: string[] = [];
  const relevant = filters.filter((f) => !f.meta.disabled && f.meta.key === fieldKey);
  for (const f of relevant) {
    if (f.meta.type === 'phrases' && Array.isArray(f.meta.params)) {
      // Multi-select from OptionsListControl or search bar
      values.push(...(f.meta.params as string[]));
    } else if (f.meta.type === 'phrase') {
      // Search-bar phrase filter: actual ES value in meta.params.query
      const actualValue = (f.meta.params as { query?: unknown } | undefined)?.query ?? f.meta.value;
      if (actualValue != null) values.push(String(actualValue));
    } else {
      // Single-select from OptionsListControl: buildPhraseFilter does not set
      // meta.type, so fall back to reading the raw query.match_phrase value.
      const matchPhrase = (f as { query?: { match_phrase?: Record<string, unknown> } }).query
        ?.match_phrase;
      if (matchPhrase && Object.prototype.hasOwnProperty.call(matchPhrase, fieldKey)) {
        const v = matchPhrase[fieldKey];
        if (v != null) values.push(String(v));
      }
    }
  }
  return values;
};

export const useWorkflowExecutionsSearch = ({
  query,
  filters,
  timeRange,
  spaceId,
  pageIndex,
  pageSize,
  sort,
  enabled = true,
}: UseWorkflowExecutionsSearchParams) => {
  const api = useWorkflowsApi();

  // Extract known structured filter fields directly from Filter objects so that
  // the exact ES values are used (not the display-formatted meta.value).
  const statuses = useMemo(
    () => extractFilterValues(filters, 'status') as ExecutionStatus[],
    [filters]
  );
  const executedBy = useMemo(() => extractFilterValues(filters, 'executedBy'), [filters]);

  // Remaining filters (e.g. workflowId, triggeredBy) go through KQL.
  const remainingFiltersKql = useMemo(() => {
    const STRUCTURED_FIELDS = new Set(['status', 'executedBy']);
    const remaining = filters.filter((f) => !STRUCTURED_FIELDS.has(f.meta.key ?? ''));
    return filtersToKql(remaining);
  }, [filters]);

  const kql = useMemo(() => {
    const textKql = query?.query ? `(${String(query.query)})` : '';
    return [textKql, remainingFiltersKql].filter(Boolean).join(' and ') || undefined;
  }, [query, remainingFiltersKql]);

  const sortParams = useMemo(() => {
    const [[field, direction]] = sort;
    return {
      sortField: EXECUTION_TABLE_SORT_FIELD_MAP[field] ?? field,
      sortOrder: direction as 'asc' | 'desc',
    };
  }, [sort]);

  return useQuery<WorkflowExecutionListDto>({
    networkMode: 'always',
    queryKey: [
      'workflows',
      'executions',
      'search',
      spaceId,
      query,
      filters,
      timeRange,
      pageIndex,
      pageSize,
      sort,
    ],
    queryFn: () =>
      api.searchExecutions({
        kql,
        statuses: statuses.length ? statuses : undefined,
        executedBy: executedBy.length ? executedBy : undefined,
        startedAfter: timeRange.from,
        startedBefore: timeRange.to,
        sortField: sortParams.sortField,
        sortOrder: sortParams.sortOrder,
        page: pageIndex + 1,
        size: pageSize,
        trackTotalHits: true,
      }),
    enabled,
    retry: false,
    meta: {
      errorMessage: getWorkflowExecutionsFetchErrorMessage(),
    },
  });
};
