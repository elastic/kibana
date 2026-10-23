/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FetchContext } from '@kbn/presentation-publishing';
import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import { ESQLVariableType } from '@kbn/esql-types';
import type { ChangePointGridEmbeddableState } from '../../../server/embeddable/change_point_grid_schema';
import { resolveChangePointGridSearchRequest } from './resolve_change_point_grid_search_request';

const savedFilter = {
  type: 'condition' as const,
  data_view_id: 'logs-data-view',
  condition: { field: 'status', operator: 'is' as const, value: 'active' },
};

const followingState = {
  esql: 'FROM logs-* | CHANGE_POINT count ON @timestamp',
  apply_dashboard_context: true,
} as ChangePointGridEmbeddableState;

const staticState = {
  ...followingState,
  apply_dashboard_context: false,
  time_range: { from: '2020-01-01T00:00:00.000Z', to: '2020-01-02T00:00:00.000Z' },
  static_context: {
    filters: [savedFilter],
    query: { expression: 'status:active', language: 'kql' as const },
    esql_variables: [{ key: 'service', value: 'orders', type: ESQLVariableType.VALUES }],
  },
} as ChangePointGridEmbeddableState;

const fetchContext = {
  isReload: false,
  filters: [{ meta: {} }],
  query: { query: 'dashboard', language: 'kuery' },
  timeRange: { from: 'now-15m', to: 'now' },
  esqlVariables: [{ key: 'service', value: 'dashboard', type: ESQLVariableType.VALUES }],
  searchSessionId: 'session-1',
  projectRouting: 'project-1',
  isApproximate: true,
  timeslice: undefined,
} as FetchContext;

describe('resolveChangePointGridSearchRequest', () => {
  it('uses the dashboard context while following', () => {
    expect(
      resolveChangePointGridSearchRequest({
        state: followingState,
        fetchContext,
      })
    ).toEqual(
      expect.objectContaining({
        timeRange: fetchContext.timeRange,
        filters: fetchContext.filters,
        inputQuery: fetchContext.query,
        esqlVariables: fetchContext.esqlVariables,
        isApproximate: true,
      })
    );
  });

  it('keeps a static panel on its saved filters and refetches only when the effective time range changes', () => {
    const first = resolveChangePointGridSearchRequest({
      state: staticState,
      fetchContext,
    });
    expect(first).toEqual(
      expect.objectContaining({
        timeRange: fetchContext.timeRange,
        filters: toStoredFilters([savedFilter]),
        inputQuery: { query: 'status:active', language: 'kuery' },
        esqlVariables: staticState.static_context?.esql_variables,
        isApproximate: false,
        searchSessionId: 'session-1',
      })
    );

    expect(
      resolveChangePointGridSearchRequest({
        state: staticState,
        fetchContext: { ...fetchContext, filters: [], searchSessionId: 'session-2' },
        previousTimeRange: fetchContext.timeRange,
      })
    ).toBeUndefined();

    const changedRange = { from: 'now-1h', to: 'now' };
    expect(
      resolveChangePointGridSearchRequest({
        state: staticState,
        fetchContext: { ...fetchContext, timeRange: changedRange },
        previousTimeRange: fetchContext.timeRange,
      })?.timeRange
    ).toEqual(changedRange);

    expect(
      resolveChangePointGridSearchRequest({
        state: staticState,
        fetchContext: { ...fetchContext, isReload: true },
        previousTimeRange: fetchContext.timeRange,
      })?.timeRange
    ).toEqual(fetchContext.timeRange);
  });
});
