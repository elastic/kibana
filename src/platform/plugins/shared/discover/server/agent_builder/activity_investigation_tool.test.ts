/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlEsqlResult } from '@elastic/elasticsearch/lib/api/types';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { createOtherResult } from '@kbn/agent-builder-server';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { formatEsqlIdentifier } from '@kbn/esql-utils';
import type { ActivityInvestigationSnapshot } from '../../common/activity_investigation/attachment';
import {
  createActivityInvestigationTool,
  createActivityInvestigationDocumentsTool,
} from './activity_investigation_tool';

const HOUR = 3_600_000;
const increaseTimeRange = { from: '2026-09-24T00:00:00Z', to: '2026-09-24T02:00:00Z' };
const comparisonTimeRange = { from: '2026-09-23T20:00:00Z', to: '2026-09-24T00:00:00Z' };
const snapshot: ActivityInvestigationSnapshot = {
  scope: {
    query: 'FROM logs-* | KEEP @timestamp, memory, geo.src, host.name',
    indexPattern: 'logs-*',
    timeFieldName: '@timestamp',
    timeRange: { from: comparisonTimeRange.from, to: increaseTimeRange.to },
    timeZone: 'Europe/Madrid',
    projectRouting: '_local',
  },
  asOf: increaseTimeRange.to,
  metric: 'field_sum',
  metricField: 'memory',
  increase: {
    kind: 'historical_interval',
    timeRange: increaseTimeRange,
    durationMs: 2 * HOUR,
    filter: { range: { '@timestamp': { gte: increaseTimeRange.from, lt: increaseTimeRange.to } } },
    bucketCount: 2,
    baseline: 100,
    observedMean: 400,
    observedTotal: 800,
    percentageChange: 300,
  },
  comparison: {
    timeRange: comparisonTimeRange,
    excludedTimeRange: increaseTimeRange,
    durationMs: 4 * HOUR,
    filter: { range: { '@timestamp': { gte: comparisonTimeRange.from, lt: comparisonTimeRange.to } } },
  },
  series: {
    startTime: comparisonTimeRange.from,
    endTime: increaseTimeRange.to,
    intervalMs: HOUR,
    counts: [100, 100, 100, 100, 400, 400],
  },
};

const groupedResponse = (values: EsqlEsqlResult['values'], includeSum = true): EsqlEsqlResult => ({
  columns: [
    { name: '__discover_activity_group', type: 'keyword' },
    { name: '__discover_activity_count', type: 'long' },
    ...(includeSum
      ? [
          { name: '__discover_activity_sum', type: 'double' },
          { name: '__discover_activity_sum_values', type: 'long' },
          { name: '__discover_activity_sum_mean', type: 'double' },
        ]
      : []),
  ],
  values,
});

describe('bounded activity document investigation', () => {
  const args = { parent: { resultId: 'comparison-id', ranks: [1] }, fields: ['host.name'] };
  const contributorResult = {
    attachmentId: 'snapshot-id',
    groupField: 'geo.src',
    groupType: 'keyword',
    depth: 0,
    coverage: 'selected-candidates-only',
    groups: [
      {
        rank: 1,
        value: 'US',
        increaseCount: 2,
        comparisonCount: 4,
        increaseRatePerHour: 1,
        comparisonRatePerHour: 1,
        addedRatePerHour: 0,
        rateRatio: 1,
      },
    ],
  };
  const sample: EsqlEsqlResult = {
    columns: [
      { name: '@timestamp', type: 'date' },
      { name: 'memory', type: 'double' },
      { name: 'host.name', type: 'keyword' },
    ],
    values: [[increaseTimeRange.from, 381880, 'host-a']],
  };
  const setupDocuments = (data = snapshot) => {
    const mocks = setup(data);
    mocks.resultStore.has.mockReturnValue(true);
    mocks.resultStore.get.mockReturnValue({
      ...createOtherResult(contributorResult),
      tool_result_id: 'comparison-id',
    });
    return {
      ...mocks,
      tool: createActivityInvestigationDocumentsTool('snapshot-id', data, mocks.getEsClient),
    };
  };

  it('samples the measured population using the original pipeline and frozen filters', async () => {
    const { tool, client, context } = setupDocuments();
    client.esql.query.mockResolvedValue(sample);
    const result = await tool.handler(args, context);
    expect(result).toMatchObject({
      results: [
        {
          data: {
            metric: 'field_sum',
            metricField: 'memory',
            groupValues: ['US'],
            selection: 'largest-per-row-sums',
            coverage: 'limited-sample',
            increase: {
              timeRange: increaseTimeRange,
              rows: [[
                { field: '@timestamp', text: increaseTimeRange.from, truncated: false },
                { field: 'memory', text: '381880', truncated: false },
                { field: 'host.name', text: 'host-a', truncated: false },
              ]],
            },
            comparison: { timeRange: comparisonTimeRange },
          },
        },
      ],
    });
    expect(client.esql.query).toHaveBeenCalledTimes(2);
    const [increase, comparison] = client.esql.query.mock.calls.map(([params]) => params);
    expect(increase?.query).toContain(snapshot.scope.query);
    expect(increase?.query).toContain(`WHERE (MV_CONTAINS(${formatEsqlIdentifier('geo.src')},`);
    expect(increase?.query).toContain(`MV_SUM(${formatEsqlIdentifier('memory')})`);
    expect(increase?.query).toContain('LIMIT 6');
    expect(increase?.filter).toEqual(snapshot.increase.filter);
    expect(comparison?.filter).toEqual(snapshot.comparison.filter);
    expect(comparison?.query).toEqual(increase?.query);
    expect(increase?.time_zone).toBe(snapshot.scope.timeZone);
  });

  it('limits rows and explicitly marks truncated cells', async () => {
    const { tool, client, context } = setupDocuments();
    client.esql.query.mockResolvedValue({
      ...sample,
      values: Array.from({ length: 6 }, () => [increaseTimeRange.from, 10, 'a'.repeat(600)]),
    });
    const result = await tool.handler(args, context);
    expect(result).toMatchObject({
      results: [
        {
          data: {
            increase: {
              moreRowsAvailable: true,
              rows: Array.from({ length: 5 }, () => [
                expect.any(Object),
                expect.any(Object),
                { field: 'host.name', type: 'keyword', text: 'a'.repeat(500), truncated: true },
              ]),
            },
          },
        },
      ],
    });
  });

  it('rejects contributors belonging to a different snapshot before any request', async () => {
    const { tool, client, context, resultStore } = setupDocuments();
    resultStore.get.mockReturnValue({
      ...createOtherResult({ ...contributorResult, attachmentId: 'another-snapshot' }),
      tool_result_id: 'comparison-id',
    });
    expect(await tool.handler(args, context)).toMatchObject({ results: [{ type: 'error' }] });
    expect(client.esql.query).not.toHaveBeenCalled();
  });

  it('rejects partial responses instead of interpreting missing evidence', async () => {
    const { tool, client, context } = setupDocuments();
    client.esql.query.mockResolvedValue({ ...sample, is_partial: true });
    expect(await tool.handler(args, context)).toMatchObject({ results: [{ type: 'error' }] });
    expect(client.esql.query).toHaveBeenCalledTimes(1);
  });

  it('bounds field requests and requires a measured contributor', () => {
    const { tool } = setupDocuments();
    expect(tool.schema.safeParse({ fields: ['host.name'] }).success).toBe(false);
    expect(
      tool.schema.safeParse({
        ...args,
        fields: Array.from({ length: 7 }, (_, index) => `field${index}`),
      }).success
    ).toBe(false);
    expect(tool.schema.safeParse({ ...args, fields: ['a'.repeat(1001)] }).success).toBe(false);
  });

  it('uses timestamp ordering for counts, without introducing a sum', async () => {
    const { tool, client, context } = setupDocuments({
      ...snapshot,
      metric: 'query_result_count',
      metricField: undefined,
    });
    client.esql.query.mockResolvedValue({
      columns: [sample.columns[0], sample.columns[2]],
      values: [[increaseTimeRange.from, 'host-a']],
    });
    expect(await tool.handler(args, context)).toMatchObject({
      results: [{ data: { selection: 'earliest-rows' } }],
    });
    expect(client.esql.query.mock.calls[0][0]?.query).not.toContain('MV_SUM(');
  });
});

const comparisonResponse = (
  measurements: EsqlEsqlResult['values'],
  includeSum = true
): EsqlEsqlResult => ({
  columns: measurements.flatMap((_, index) => [
    { name: `candidate_${index}`, type: 'long' },
    ...(includeSum
      ? [
          { name: `candidate_${index}_sum`, type: 'double' },
          { name: `candidate_${index}_sum_values`, type: 'long' },
          { name: `candidate_${index}_sum_mean`, type: 'double' },
        ]
      : []),
  ]),
  values: [measurements.flat()],
});

const setup = (data = snapshot) => {
  const client = elasticsearchServiceMock.createElasticsearchClient();
  const getEsClient = jest.fn().mockResolvedValue(client);
  const resultStore = { has: jest.fn(), get: jest.fn() };
  const request = httpServerMock.createKibanaRequest();
  const context = { request, resultStore } as ToolHandlerContext;
  const tool = createActivityInvestigationTool('snapshot-id', data, getEsClient);
  return { client, tool, context, resultStore, getEsClient, request };
};

describe('activity investigation metric consistency', () => {
  it('ranks sums by added sum per hour, not row growth or raw sum', async () => {
    const { client, tool, context, getEsClient, request } = setup();
    client.esql.query
      .mockResolvedValueOnce(
        groupedResponse([
          ['many-rows', 100, 800, 80, 10],
          ['US', 2, 600, 2, 300],
        ])
      )
      .mockResolvedValueOnce(
        comparisonResponse([
          [100, 1400, 70, 20],
          [4, 400, 4, 100],
        ])
      );

    const result = await tool.handler({ groupField: 'geo.src' }, context);

    expect(result).toMatchObject({
      results: [
        {
          data: {
            metric: 'field_sum',
            metricField: 'memory',
            groups: [
              {
                rank: 1,
                value: 'US',
                increaseCount: 2,
                comparisonCount: 4,
                addedRatePerHour: 0,
                fieldSum: {
                  increase: { sum: 600, valueCount: 2, mean: 300 },
                  comparison: { sum: 400, valueCount: 4, mean: 100 },
                  increaseSumPerHour: 300,
                  comparisonSumPerHour: 100,
                  addedSumPerHour: 200,
                  sumRateRatio: 3,
                },
              },
              { rank: 2, value: 'many-rows', fieldSum: { addedSumPerHour: 50 } },
            ],
          },
        },
      ],
    });
    expect(getEsClient).toHaveBeenCalledWith(request, snapshot.scope.projectRouting);
    const [increaseRequest, comparisonRequest] = client.esql.query.mock.calls.map(([params]) => params);
    expect(increaseRequest).toMatchObject({
      filter: snapshot.increase.filter,
      time_zone: 'Europe/Madrid',
    });
    expect(comparisonRequest).toMatchObject({ filter: snapshot.comparison.filter });
    expect(increaseRequest?.query).toContain(snapshot.scope.query);
    expect(increaseRequest?.query).toContain('SORT __discover_activity_sum DESC');
    for (const aggregation of ['SUM', 'COUNT', 'AVG']) {
      expect(increaseRequest?.query).toContain(`${aggregation}(${formatEsqlIdentifier('memory')})`);
      expect(comparisonRequest?.query).toContain(
        `${aggregation}(${formatEsqlIdentifier('memory')}) WHERE MV_CONTAINS`
      );
    }
  });

  it.each(['bytes', 'custom.metric', 'metric with spaces'])(
    'uses the frozen field %s without a name-specific rule',
    async (metricField) => {
      const { client, tool, context } = setup({ ...snapshot, metricField });
      client.esql.query
        .mockResolvedValueOnce(groupedResponse([['US', 2, 2.5, 2, 1.25]]))
        .mockResolvedValueOnce(comparisonResponse([[2, 1.5, 2, 0.75]]));
      await tool.handler({ groupField: 'geo.src' }, context);
      expect(client.esql.query.mock.calls[0][0]?.query).toContain(
        `SUM(${formatEsqlIdentifier(metricField)})`
      );
      expect(client.esql.query.mock.calls[1][0]?.query).toContain(
        `AVG(${formatEsqlIdentifier(metricField)}) WHERE`
      );
    }
  );

  it('preserves the event-count path', async () => {
    const { client, tool, context } = setup({
      ...snapshot,
      metric: 'query_result_count',
      metricField: undefined,
    });
    client.esql.query
      .mockResolvedValueOnce(groupedResponse([['US', 12]], false))
      .mockResolvedValueOnce(comparisonResponse([[8]], false));
    const result = await tool.handler({ groupField: 'geo.src' }, context);
    expect(result).toMatchObject({
      results: [
        {
          data: {
            metric: 'query_result_count',
            groups: [
              {
                increaseCount: 12,
                comparisonCount: 8,
                increaseRatePerHour: 6,
                comparisonRatePerHour: 2,
                addedRatePerHour: 4,
                rateRatio: 3,
              },
            ],
          },
        },
      ],
    });
    expect(client.esql.query.mock.calls[0][0]?.query).toContain(
      'SORT __discover_activity_count DESC'
    );
    expect(client.esql.query.mock.calls[0][0]?.query).not.toContain('SUM(');
  });

  it('keeps missing numeric values distinct from a mean of zero', async () => {
    const { client, tool, context } = setup();
    client.esql.query
      .mockResolvedValueOnce(groupedResponse([['US', 10, 2.5, 2, 1.25]]))
      .mockResolvedValueOnce(comparisonResponse([[8, null, 0, null]]));
    const result = await tool.handler({ groupField: 'geo.src' }, context);
    expect(result).toMatchObject({
      results: [
        {
          data: {
            groups: [
              {
                fieldSum: {
                  increase: { sum: 2.5, valueCount: 2, mean: 1.25 },
                  comparison: { sum: 0, valueCount: 0, mean: null },
                  sumRateRatio: null,
                },
              },
            ],
          },
        },
      ],
    });
  });

  it.each([null, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects an invalid sum %s when values are present',
    async (sum) => {
      const { client, tool, context } = setup();
      client.esql.query.mockResolvedValueOnce(groupedResponse([['US', 2, sum, 2, 1]]));
      const result = await tool.handler({ groupField: 'geo.src' }, context);
      expect(result).toMatchObject({ results: [{ type: 'error' }] });
      expect(client.esql.query).toHaveBeenCalledTimes(1);
    }
  );

  it('does not silently fall back to counts if the metric field is missing', async () => {
    const { client, tool, context } = setup({ ...snapshot, metricField: undefined });
    const result = await tool.handler({ groupField: 'geo.src' }, context);
    expect(result).toMatchObject({ results: [{ type: 'error' }] });
    expect(client.esql.query).not.toHaveBeenCalled();
  });

  it('keeps the sum metric and parent population in the deeper breakdown', async () => {
    const { client, tool, context, resultStore } = setup();
    client.esql.query
      .mockResolvedValueOnce(groupedResponse([['US', 2, 600, 2, 300]]))
      .mockResolvedValueOnce(comparisonResponse([[4, 400, 4, 100]]))
      .mockResolvedValueOnce(groupedResponse([['host-a', 2, 600, 2, 300]]))
      .mockResolvedValueOnce(comparisonResponse([[4, 400, 4, 100]]));
    const first = await tool.handler({ groupField: 'geo.src' }, context);
    if (!('results' in first)) throw new Error('Expected measured results');
    resultStore.has.mockReturnValue(true);
    resultStore.get.mockReturnValue({ ...first.results[0], tool_result_id: 'parent-id' });
    const result = await tool.handler(
      { groupField: 'host.name', parent: { resultId: 'parent-id', ranks: [1] } },
      context
    );
    expect(result).toMatchObject({
      results: [
        {
          data: {
            depth: 1,
            metric: 'field_sum',
            metricField: 'memory',
            groups: [{ value: 'host-a', fieldSum: { addedSumPerHour: 200 } }],
          },
        },
      ],
    });
    const query = client.esql.query.mock.calls[2][0]?.query;
    expect(query).toContain(`WHERE (MV_CONTAINS(${formatEsqlIdentifier('geo.src')},`);
    expect(query).toContain(`SUM(${formatEsqlIdentifier('memory')})`);
  });
});
