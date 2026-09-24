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
  uiSettings: {} as IUiSettingsClient,
  profileId: 'metrics-data-source-profile',
};

const probeResponse = (columnName: string, values: string[]) => ({
  documents: [],
  rawResponse: {
    columns: [{ name: columnName, type: 'keyword' }],
    values: values.map((value) => [value]),
    requestParams: { query: EXEMPLARS_PROBE_QUERY },
  },
  requestParams: { query: EXEMPLARS_PROBE_QUERY },
});

describe('fetchMetricsWithExemplars', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends the probe query under the exemplars execution context without a time range, filters or signal', async () => {
    mockExecuteEsqlQuery.mockResolvedValue(probeResponse('metric_name', []));

    await fetchMetricsWithExemplars(params);

    expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
      ...params,
      esqlQuery: EXEMPLARS_PROBE_QUERY,
      executionContextName: MetricsExecutionContextName.EXEMPLARS,
    });
  });

  it('returns the metric names with the metrics. prefix Kibana field names carry', async () => {
    mockExecuteEsqlQuery.mockResolvedValue(
      probeResponse('metric_name', ['http.server.request.duration', 'orders.created'])
    );

    expect([...(await fetchMetricsWithExemplars(params))]).toEqual([
      'metrics.http.server.request.duration',
      'metrics.orders.created',
    ]);
  });

  it('returns an empty set when the response has no metric_name column', async () => {
    mockExecuteEsqlQuery.mockResolvedValue(probeResponse('other', ['x']));

    expect((await fetchMetricsWithExemplars(params)).size).toBe(0);
  });

  it('rejects when the query fails', async () => {
    const error = new Error('verification_exception: Unknown index');
    mockExecuteEsqlQuery.mockRejectedValue(error);

    await expect(fetchMetricsWithExemplars(params)).rejects.toBe(error);
  });
});
