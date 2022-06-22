/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, Subject } from 'rxjs';
import {
  Collector,
  createUsageCollectionSetupMock,
  createCollectorFetchContextMock,
} from '@kbn/usage-collection-plugin/server/mocks';

import { registerOpsStatsCollector } from '.';
import { OpsMetrics } from '@kbn/core/server';
import { loggingSystemMock, metricsServiceMock } from '@kbn/core/server/mocks';

const logger = loggingSystemMock.createLogger();

describe('telemetry_ops_stats', () => {
  let collector: Collector<unknown>;

  const usageCollectionMock = createUsageCollectionSetupMock();
  const metricsServiceSetupMock = metricsServiceMock.createInternalSetupContract();

  usageCollectionMock.makeStatsCollector.mockImplementation((config) => {
    collector = new Collector(logger, config);
    return createUsageCollectionSetupMock().makeStatsCollector(config);
  });

  const metrics$ = new Subject<OpsMetrics>();
  const mockedFetchContext = createCollectorFetchContextMock();

  beforeAll(() => registerOpsStatsCollector(usageCollectionMock, metrics$));
  afterAll(() => jest.clearAllTimers());

  test('registered collector is set', () => {
    expect(collector).not.toBeUndefined();
    expect(collector.type).toBe('kibana_stats');
  });

  test('isReady should return false because no metrics have been provided yet', () => {
    expect(collector.isReady()).toBe(false);
  });

  test('should return something when there is a metric', async () => {
    const opsMetrics = await firstValueFrom(metricsServiceSetupMock.getOpsMetrics$());
    metrics$.next(opsMetrics);
    expect(collector.isReady()).toBe(true);
    expect(await collector.fetch(mockedFetchContext)).toMatchSnapshot({
      process: {
        event_loop_delay_histogram: expect.any(Object),
      },
      processes: [
        {
          event_loop_delay_histogram: expect.any(Object),
        },
      ],
      timestamp: expect.any(String),
    });
  });
});
