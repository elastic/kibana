/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('./execute_esql_query', () => ({
  executeEsqlQuery: jest.fn(),
}));

import type { DataView } from '@kbn/data-views-plugin/common';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import { executeEsqlQuery } from './execute_esql_query';
import { MetricsExecutionContextName } from './execution_context_enums';
import { EXEMPLARS_PROBE_QUERY, fetchMetricsWithExemplars } from './fetch_metrics_with_exemplars';

const mockExecuteEsqlQuery = executeEsqlQuery as jest.MockedFunction<typeof executeEsqlQuery>;

const params = {
  search: jest.fn() as unknown as ISearchGeneric,
  dataView: { getIndexPattern: () => 'metrics-generic.otel-default' } as unknown as DataView,
  timeRange: { from: 'now-15m', to: 'now' },
  uiSettings: {} as IUiSettingsClient,
  profileId: 'metrics-data-source-profile',
};

const PROBE_COLUMNS = ['metric_name', 'data_stream.dataset', 'data_stream.namespace'];

/** One row per distinct (metric name, dataset, namespace), as `STATS BY` returns them. */
const probeResponse = (rows: unknown[][], columnNames = PROBE_COLUMNS) => ({
  documents: [],
  rawResponse: {
    columns: columnNames.map((name) => ({ name, type: 'keyword' })),
    values: rows,
    requestParams: { query: EXEMPLARS_PROBE_QUERY },
  },
  requestParams: { query: EXEMPLARS_PROBE_QUERY },
});

describe('fetchMetricsWithExemplars', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends the probe query under the exemplars execution context, bounded to the time range, without filters or signal', async () => {
    mockExecuteEsqlQuery.mockResolvedValue(probeResponse([]));

    await fetchMetricsWithExemplars(params);

    expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
      ...params,
      esqlQuery: EXEMPLARS_PROBE_QUERY,
      executionContextName: MetricsExecutionContextName.EXEMPLARS,
    });
  });

  it('groups metrics. prefixed names by their exemplars data stream', async () => {
    mockExecuteEsqlQuery.mockResolvedValue(
      probeResponse([
        ['http.server.request.duration', 'generic.otel', 'default'],
        ['orders.created', 'generic.otel', 'default'],
        ['orders.created', 'payments.otel', 'prod'],
      ])
    );

    const result = await fetchMetricsWithExemplars(params);

    expect([...result.keys()]).toEqual([
      'exemplars-generic.otel-default',
      'exemplars-payments.otel-prod',
    ]);
    expect([...result.get('exemplars-generic.otel-default')!]).toEqual([
      'metrics.http.server.request.duration',
      'metrics.orders.created',
    ]);
    expect([...result.get('exemplars-payments.otel-prod')!]).toEqual(['metrics.orders.created']);
  });

  it('locates columns by name rather than position', async () => {
    mockExecuteEsqlQuery.mockResolvedValue(
      probeResponse(
        [['default', 'generic.otel', 'orders.created']],
        ['data_stream.namespace', 'data_stream.dataset', 'metric_name']
      )
    );

    const result = await fetchMetricsWithExemplars(params);

    expect([...result.get('exemplars-generic.otel-default')!]).toEqual(['metrics.orders.created']);
  });

  it('skips rows where any grouping value is null', async () => {
    mockExecuteEsqlQuery.mockResolvedValue(
      probeResponse([
        [null, 'generic.otel', 'default'],
        ['orders.created', null, 'default'],
        ['orders.created', 'generic.otel', 'default'],
      ])
    );

    const result = await fetchMetricsWithExemplars(params);

    expect(result.size).toBe(1);
    expect([...result.get('exemplars-generic.otel-default')!]).toEqual(['metrics.orders.created']);
  });

  it('returns an empty map when a grouping column is missing from the response', async () => {
    mockExecuteEsqlQuery.mockResolvedValue(
      probeResponse([['orders.created', 'generic.otel']], ['metric_name', 'data_stream.dataset'])
    );

    expect((await fetchMetricsWithExemplars(params)).size).toBe(0);
  });

  it('rejects when the query fails', async () => {
    const error = new Error('verification_exception: Unknown index');
    mockExecuteEsqlQuery.mockRejectedValue(error);

    await expect(fetchMetricsWithExemplars(params)).rejects.toBe(error);
  });
});
