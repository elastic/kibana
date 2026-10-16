/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FetchContext } from '@kbn/presentation-publishing';
import { ESQLVariableType } from '@kbn/esql-types';
import type { ChangePointGridEmbeddableState } from '../../../server/embeddable/change_point_grid_schema';
import { resolveChangePointGridSearchRequest } from './resolve_change_point_grid_search_request';

const followingState = {
  esql: 'FROM logs-* | CHANGE_POINT count ON @timestamp',
  apply_dashboard_context: true,
} as ChangePointGridEmbeddableState;

const staticState = {
  ...followingState,
  apply_dashboard_context: false,
  static_context: {
    time_range: { from: '2020-01-01T00:00:00.000Z', to: '2020-01-02T00:00:00.000Z' },
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
        hasSearched: false,
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

  it('uses the stored context for a static panel and ignores later dashboard changes', () => {
    const first = resolveChangePointGridSearchRequest({
      state: staticState,
      fetchContext,
      hasSearched: false,
    });
    expect(first).toEqual(
      expect.objectContaining({
        timeRange: staticState.static_context?.time_range,
        inputQuery: { query: 'status:active', language: 'kuery' },
        esqlVariables: staticState.static_context?.esql_variables,
        isApproximate: false,
        searchSessionId: 'session-1',
      })
    );

    expect(
      resolveChangePointGridSearchRequest({
        state: staticState,
        fetchContext: { ...fetchContext, timeRange: { from: 'now-1h', to: 'now' } },
        hasSearched: true,
      })
    ).toBeUndefined();

    expect(
      resolveChangePointGridSearchRequest({
        state: staticState,
        fetchContext: { ...fetchContext, isReload: true },
        hasSearched: true,
      })?.timeRange
    ).toEqual(staticState.static_context?.time_range);
  });
});
