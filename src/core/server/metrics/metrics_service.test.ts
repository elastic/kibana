/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';

import { configServiceMock } from '../config/mocks';
import { mockOpsCollector } from './metrics_service.test.mocks';
import { MetricsService } from './metrics_service';
import { mockCoreContext } from '../core_context.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { analyticsServiceMock } from '../mocks';
import { firstValueFrom, Observable } from 'rxjs';
import { OpsMetrics } from './types';

const testInterval = 100;

const dummyMetrics = { metricA: 'value', metricB: 'otherValue' };

const logger = loggingSystemMock.create();

const createNextEmission = async (getOpsMetrics$: () => Observable<OpsMetrics>) => {
  jest.advanceTimersByTime(testInterval);
  return firstValueFrom(getOpsMetrics$());
};

const createOpsMetrics = (testMetrics: any) => {
  mockOpsCollector.collect.mockResolvedValueOnce(testMetrics);
};

describe('MetricsService', () => {
  const httpMock = httpServiceMock.createInternalSetupContract();
  const analyticsMock = analyticsServiceMock.createAnalyticsServiceSetup();
  let metricsService: MetricsService;

  beforeEach(() => {
    jest.useFakeTimers();

    const configService = configServiceMock.create({
      atPath: { interval: moment.duration(testInterval) },
    });
    const coreContext = mockCoreContext.create({ logger, configService });
    metricsService = new MetricsService(coreContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('#start', () => {
    it('invokes setInterval with the configured interval', async () => {
      await metricsService.setup({ http: httpMock, analytics: analyticsMock });
      await metricsService.start();

      expect(setInterval).toHaveBeenCalledTimes(1);
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), testInterval);
    });

    it('collects the metrics at every interval', async () => {
      mockOpsCollector.collect.mockResolvedValue(dummyMetrics);

      await metricsService.setup({ http: httpMock, analytics: analyticsMock });
      await metricsService.start();

      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(testInterval);
      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(testInterval);
      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(3);
    });

    it('resets the collector after each collection', async () => {
      createOpsMetrics(dummyMetrics);

      await metricsService.setup({ http: httpMock, analytics: analyticsMock });
      const { getOpsMetrics$ } = await metricsService.start();

      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(1);
      expect(mockOpsCollector.reset).toHaveBeenCalledTimes(1);

      await createNextEmission(getOpsMetrics$);
      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(2);
      expect(mockOpsCollector.reset).toHaveBeenCalledTimes(2);

      await createNextEmission(getOpsMetrics$);
      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(3);
      expect(mockOpsCollector.reset).toHaveBeenCalledTimes(3);
    });

    it('throws when called before setup', async () => {
      await expect(metricsService.start()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"#setup() needs to be run first"`
      );
    });

    it('emits the last value on each getOpsMetrics$ call', async () => {
      const firstMetrics = { metric: 'first' };
      const secondMetrics = { metric: 'second' };
      createOpsMetrics(firstMetrics);
      createOpsMetrics(secondMetrics);

      await metricsService.setup({ http: httpMock, analytics: analyticsMock });
      const { getOpsMetrics$ } = await metricsService.start();

      expect(await createNextEmission(getOpsMetrics$)).toEqual({ metric: 'first' });
      expect(await createNextEmission(getOpsMetrics$)).toEqual({ metric: 'second' });
    });

    it('logs the metrics at every interval', async () => {
      const firstMetrics = {
        process: {
          memory: { heap: { used_in_bytes: 100 } },
          uptime_in_millis: 1500,
          event_loop_delay: 50,
        },
        os: {
          load: {
            '1m': 10,
            '5m': 20,
            '15m': 30,
          },
        },
      };
      const secondMetrics = {
        process: {
          memory: { heap: { used_in_bytes: 200 } },
          uptime_in_millis: 3000,
          event_loop_delay: 100,
        },
        os: {
          load: {
            '1m': 20,
            '5m': 30,
            '15m': 40,
          },
        },
      };

      const opsLogger = logger.get('metrics', 'ops');

      createOpsMetrics(firstMetrics);
      createOpsMetrics(secondMetrics);

      await metricsService.setup({ http: httpMock, analytics: analyticsMock });
      const { getOpsMetrics$ } = await metricsService.start();

      await createNextEmission(getOpsMetrics$);
      const opsLogs = loggingSystemMock.collect(opsLogger).debug;
      expect(opsLogs.length).toEqual(2);
      expect(opsLogs[0][1]).not.toEqual(opsLogs[1][1]);
    });

    it('omits metrics from log message if they are missing or malformed', async () => {
      const opsLogger = logger.get('metrics', 'ops');
      createOpsMetrics({ secondMetrics: 'metrics' });
      await metricsService.setup({ http: httpMock, analytics: analyticsMock });
      await metricsService.start();
      expect(loggingSystemMock.collect(opsLogger).debug[0]).toMatchInlineSnapshot(`
        Array [
          "",
          Object {
            "event": Object {
              "category": Array [
                "process",
                "host",
              ],
              "kind": "metric",
              "type": Array [
                "info",
              ],
            },
            "host": Object {
              "os": Object {
                "load": Object {
                  "15m": undefined,
                  "1m": undefined,
                  "5m": undefined,
                },
              },
            },
            "process": Object {
              "eventLoopDelay": undefined,
              "eventLoopDelayHistogram": undefined,
              "memory": Object {
                "heap": Object {
                  "usedInBytes": undefined,
                },
              },
              "uptime": undefined,
            },
          },
        ]
      `);
    });

    it('reports ops metrics as an event to analytics at every interval', async () => {
      const firstMetrics = {
        process: {
          memory: { heap: { used_in_bytes: 100 } },
          uptime_in_millis: 1500,
          event_loop_delay: 50,
        },
        os: {
          load: {
            '1m': 10,
            '5m': 20,
            '15m': 30,
          },
        },
      };
      const secondMetrics = {
        process: {
          memory: { heap: { used_in_bytes: 200 } },
          uptime_in_millis: 3000,
          event_loop_delay: 100,
        },
        os: {
          load: {
            '1m': 20,
            '5m': 30,
            '15m': 40,
          },
        },
      };

      createOpsMetrics(firstMetrics);
      createOpsMetrics(secondMetrics);

      await metricsService.setup({ http: httpMock, analytics: analyticsMock });

      const { getOpsMetrics$ } = await metricsService.start();

      expect(analyticsMock.registerEventType).toHaveBeenCalledTimes(1);
      expect(analyticsMock.reportEvent).toHaveBeenCalledTimes(1);

      await createNextEmission(getOpsMetrics$);

      expect(analyticsMock.registerEventType).toHaveBeenCalledTimes(1);
      expect(analyticsMock.reportEvent).toHaveBeenCalledTimes(2);
    });

    it('logs reporting ops metrics as an event to analytics at every interval', async () => {
      const firstMetrics = {
        process: {
          memory: { heap: { used_in_bytes: 100 } },
          uptime_in_millis: 1500,
          event_loop_delay: 50,
        },
        os: {
          load: {
            '1m': 10,
            '5m': 20,
            '15m': 30,
          },
        },
      };
      const secondMetrics = {
        process: {
          memory: { heap: { used_in_bytes: 200 } },
          uptime_in_millis: 3000,
          event_loop_delay: 100,
        },
        os: {
          load: {
            '1m': 20,
            '5m': 30,
            '15m': 40,
          },
        },
      };

      const analyticsMetricsLogger = logger.get('metrics', 'metrics_analytics');
      createOpsMetrics(firstMetrics);
      createOpsMetrics(secondMetrics);

      await metricsService.setup({ http: httpMock, analytics: analyticsMock });
      const { getOpsMetrics$ } = await metricsService.start();

      await createNextEmission(getOpsMetrics$);

      const analyticsMetricsLogs = loggingSystemMock.collect(analyticsMetricsLogger).info;
      expect(analyticsMetricsLogs.length).toEqual(2);
      expect(analyticsMetricsLogs[0]).not.toEqual(analyticsMetricsLogs[1]);
    });
  });

  describe('#stop', () => {
    it('stops the metrics interval', async () => {
      await metricsService.setup({ http: httpMock, analytics: analyticsMock });
      const { getOpsMetrics$ } = await metricsService.start();

      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(testInterval);
      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(2);

      await metricsService.stop();
      jest.advanceTimersByTime(10 * testInterval);
      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(2);

      getOpsMetrics$().subscribe({ complete: () => {} });
    });

    it('completes the metrics observable', async () => {
      await metricsService.setup({ http: httpMock, analytics: analyticsMock });
      const { getOpsMetrics$ } = await metricsService.start();

      let completed = false;

      getOpsMetrics$().subscribe({
        complete: () => {
          completed = true;
        },
      });

      await metricsService.stop();

      expect(completed).toEqual(true);
    });
  });
});
