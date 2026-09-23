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
import {
  EXEMPLARS_PROBE_QUERY,
  probeExemplarsAvailability,
  resetExemplarsAvailabilityCache,
} from './probe_exemplars_availability';

const mockExecuteEsqlQuery = executeEsqlQuery as jest.MockedFunction<typeof executeEsqlQuery>;

const search = jest.fn() as unknown as ISearchGeneric;
const dataView = { getIndexPattern: () => 'metrics-generic.otel-default' } as unknown as DataView;
const uiSettings = {} as IUiSettingsClient;
const profileId = 'metrics-data-source-profile';

const probeResponse = (metricNames: string[]) => ({
  documents: [],
  rawResponse: {
    columns: [{ name: 'metric_name', type: 'keyword' }],
    values: metricNames.map((name) => [name]),
    requestParams: { query: EXEMPLARS_PROBE_QUERY },
  },
  requestParams: { query: EXEMPLARS_PROBE_QUERY },
});

const probe = (onError = jest.fn()) =>
  probeExemplarsAvailability({ search, dataView, uiSettings, profileId, onError });

describe('probeExemplarsAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetExemplarsAvailabilityCache();
    mockExecuteEsqlQuery.mockResolvedValue(probeResponse(['http.server.request.duration']));
  });

  it('sends the probe query under the exemplars execution context without a time range, filters or signal', async () => {
    await probe();

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
      esqlQuery: EXEMPLARS_PROBE_QUERY,
      search,
      dataView,
      uiSettings,
      profileId,
      executionContextName: MetricsExecutionContextName.EXEMPLARS,
    });
  });

  it('returns the metric names with the metrics. prefix Kibana field names carry', async () => {
    mockExecuteEsqlQuery.mockResolvedValue(
      probeResponse(['http.server.request.duration', 'orders.created'])
    );

    expect([...(await probe())]).toEqual([
      'metrics.http.server.request.duration',
      'metrics.orders.created',
    ]);
  });

  it('shares one request between concurrent callers', async () => {
    const [first, second] = await Promise.all([probe(), probe()]);

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it('caches a non-empty result for later callers', async () => {
    await probe();
    await probe();

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
  });

  it('does not cache an empty result', async () => {
    mockExecuteEsqlQuery.mockResolvedValue(probeResponse([]));

    expect((await probe()).size).toBe(0);
    await probe();

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
  });

  it('returns an empty set when the response has no metric_name column', async () => {
    mockExecuteEsqlQuery.mockResolvedValue({
      documents: [],
      rawResponse: {
        columns: [{ name: 'other', type: 'keyword' }],
        values: [['x']],
        requestParams: { query: EXEMPLARS_PROBE_QUERY },
      },
      requestParams: { query: EXEMPLARS_PROBE_QUERY },
    });

    expect((await probe()).size).toBe(0);
  });

  describe('when the probe fails', () => {
    const probeError = new Error('verification_exception: Unknown index');

    it('reports once across concurrent callers, resolves both to an empty set, and retries later', async () => {
      mockExecuteEsqlQuery.mockRejectedValueOnce(probeError);
      const firstOnError = jest.fn();
      const secondOnError = jest.fn();

      const [first, second] = await Promise.all([probe(firstOnError), probe(secondOnError)]);

      expect(first.size).toBe(0);
      expect(second.size).toBe(0);
      expect(firstOnError).toHaveBeenCalledTimes(1);
      expect(firstOnError).toHaveBeenCalledWith(probeError);
      expect(secondOnError).not.toHaveBeenCalled();

      await probe();
      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
    });

    it('does not report an abort', async () => {
      mockExecuteEsqlQuery.mockRejectedValueOnce(
        Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
      );
      const onError = jest.fn();

      expect((await probe(onError)).size).toBe(0);
      expect(onError).not.toHaveBeenCalled();
    });
  });
});
