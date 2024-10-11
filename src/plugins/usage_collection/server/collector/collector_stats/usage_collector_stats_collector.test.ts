/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  usageCollectorsStatsCollector,
  CollectorsStatsCollectorParams,
} from './usage_collector_stats_collector';
import { UsageCollector } from '../usage_collector';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createCollectorFetchContextMock } from '../../mocks';

describe('usageCollectorsStatsCollector', () => {
  const logger = loggingSystemMock.createLogger();
  const mockFetchContext = createCollectorFetchContextMock();
  const mockMakeUsageCollector = jest.fn().mockImplementation((args) => {
    return new UsageCollector(logger, args);
  });
  const mockCollectorSet = { makeUsageCollector: mockMakeUsageCollector };

  const createCollectorStats = (
    params?: Partial<CollectorsStatsCollectorParams>
  ): CollectorsStatsCollectorParams => ({
    fetchExecutionDurationByType: [],
    isReadyExecutionDurationByType: [],
    nonReadyCollectorTypes: [],
    timedOutCollectorsTypes: [],
    ...params,
  });

  it('calls makeUsageCollector to create a collector', () => {
    const collectorStats = createCollectorStats();
    const collector = usageCollectorsStatsCollector(mockCollectorSet, collectorStats);
    expect(mockMakeUsageCollector).toBeCalledTimes(1);
    expect(collector.type).toMatchInlineSnapshot(`"usage_collector_stats"`);
    expect(typeof collector.fetch).toBe('function');
    expect(collector).toBeInstanceOf(UsageCollector);
  });

  it('returns collector stats totals and breakdowns from fetch', async () => {
    const collectorStats = createCollectorStats({
      fetchExecutionDurationByType: [
        { duration: 1.2, status: 'success', type: 'SUCCESS_COLLECTOR' },
        { duration: 8, status: 'success', type: 'SUCCESS_COLLECTOR_2' },
        { duration: 2.2, status: 'failed', type: 'FAILED_COLLECTOR' },
      ],
      isReadyExecutionDurationByType: [
        { duration: 10.2, type: 'SUCCESS_COLLECTOR' },
        { duration: 4.2, type: 'SUCCESS_COLLECTOR_2' },
        { duration: 12, type: 'FAILED_COLLECTOR' },
      ],
      nonReadyCollectorTypes: ['NON_READY_COLLECTOR'],
      timedOutCollectorsTypes: ['TIMED_OUT_READY_COLLECTOR'],
    });
    const collector = usageCollectorsStatsCollector(mockCollectorSet, collectorStats);
    const result = await collector.fetch(mockFetchContext);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "failed": Object {
          "count": 1,
          "names": Array [
            "FAILED_COLLECTOR",
          ],
        },
        "fetch_duration_breakdown": Array [
          Object {
            "duration": 1.2,
            "name": "SUCCESS_COLLECTOR",
          },
          Object {
            "duration": 8,
            "name": "SUCCESS_COLLECTOR_2",
          },
          Object {
            "duration": 2.2,
            "name": "FAILED_COLLECTOR",
          },
        ],
        "is_ready_duration_breakdown": Array [
          Object {
            "duration": 10.2,
            "name": "SUCCESS_COLLECTOR",
          },
          Object {
            "duration": 4.2,
            "name": "SUCCESS_COLLECTOR_2",
          },
          Object {
            "duration": 12,
            "name": "FAILED_COLLECTOR",
          },
        ],
        "not_ready": Object {
          "count": 1,
          "names": Array [
            "NON_READY_COLLECTOR",
          ],
        },
        "not_ready_timeout": Object {
          "count": 1,
          "names": Array [
            "TIMED_OUT_READY_COLLECTOR",
          ],
        },
        "succeeded": Object {
          "count": 2,
          "names": Array [
            "SUCCESS_COLLECTOR",
            "SUCCESS_COLLECTOR_2",
          ],
        },
        "total_duration": 37.8,
        "total_fetch_duration": 11.399999999999999,
        "total_is_ready_duration": 26.4,
      }
    `);
  });
});
