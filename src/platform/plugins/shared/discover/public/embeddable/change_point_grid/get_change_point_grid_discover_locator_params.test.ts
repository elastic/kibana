/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { getChangePointGridDiscoverLocatorParams } from './get_change_point_grid_discover_locator_params';
import type { ChangePointGridSearchRequest } from './resolve_change_point_grid_search_request';

const esql = 'FROM logs-* | CHANGE_POINT count ON @timestamp';

const searchContext = {
  timeRange: { from: '2020-01-01T00:00:00.000Z', to: '2020-01-02T00:00:00.000Z' },
  filters: [
    {
      meta: { key: 'status', type: 'phrase', disabled: false, negate: false },
      query: { match_phrase: { status: 'active' } },
    },
  ],
  inputQuery: { query: 'service:orders', language: 'kuery' as const },
  esqlVariables: [],
  isApproximate: true,
  projectRouting: undefined,
} satisfies ChangePointGridSearchRequest;

describe('getChangePointGridDiscoverLocatorParams', () => {
  it('puts the current query, filters, time range, and approximation into the Discover query', () => {
    const params = getChangePointGridDiscoverLocatorParams({ esql, searchContext });

    expect(params.timeRange).toEqual(searchContext.timeRange);
    expect(params.esqlApproximation).toBe(true);
    expect(params.filters).toBeUndefined();
    expect(params.query).toEqual({
      esql: 'FROM logs-*\n| WHERE KQL("""service:orders""") AND `status` : "active" | CHANGE_POINT count ON @timestamp',
    });
  });

  it('drops filters that cannot be translated and keeps the original query otherwise', () => {
    const params = getChangePointGridDiscoverLocatorParams({
      esql,
      searchContext: {
        ...searchContext,
        inputQuery: undefined,
        filters: [{ meta: { type: 'custom', key: 'geo', disabled: false, negate: false } }],
        isApproximate: false,
      },
    });

    expect(params.query).toEqual({ esql });
    expect(params.filters).toBeUndefined();
  });

  it('includes ES|QL controls from the parent dashboard', () => {
    const state$ = new BehaviorSubject(undefined);
    const control = {
      type: 'esql_control',
      uuid: 'control-1',
      serializeState: () => ({ variable_name: 'service' }),
      applySerializedState: () => undefined,
      anyStateChange$: state$,
      latestState$: state$,
    };
    const parentApi = {
      addNewPanel: () => undefined,
      removePanel: () => undefined,
      replacePanel: () => undefined,
      children$: new BehaviorSubject({ 'control-1': control }),
    };

    const params = getChangePointGridDiscoverLocatorParams({
      esql: 'FROM logs-* | WHERE service == ?service | CHANGE_POINT count ON @timestamp',
      searchContext: { ...searchContext, inputQuery: undefined, filters: [] },
      parentApi,
    });

    expect(params.esqlControls).toEqual({
      'control-1': expect.objectContaining({ variable_name: 'service', type: 'esql_control' }),
    });
  });
});
