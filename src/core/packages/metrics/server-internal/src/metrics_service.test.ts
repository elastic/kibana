/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { merge } from 'lodash';
import { lastValueFrom, take, toArray } from 'rxjs';
import { configServiceMock } from '@kbn/config-mocks';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import {
  MockEventLoopUtilizationMonitor,
  mockEluMonitor,
  mockOpsCollector,
} from './metrics_service.test.mocks';
import { MetricsService } from './metrics_service';
import { OpsMetricsCollector } from './ops_metrics_collector';

const testInterval = 100;

function getBaseTestMetrics() {
  return {
    metricA: 'value',
    metricB: 'otherValue',
    process: { event_loop_utilization: { utilization: 1 } },
  };
}

const logger = loggingSystemMock.create();

describe('MetricsService', () => {
  const httpMock = httpServiceMock.createInternalSetupContract();
  const esServiceMock = elasticsearchServiceMock.createInternalSetup();
  let metricsService: MetricsService;

  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    mockOpsCollector.collect.mockResolvedValue(getBaseTestMetrics());
    mockEluMonitor.collect.mockReturnValue({ active: 1, idle: 0, utilization: 1 });

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

  describe('#preboot', () => {
    const httpPrebootMock = httpServiceMock.createInternalPrebootContract();

    it('registers the ELU history route on the preboot HTTP server', async () => {
      await metricsService.preboot({ http: httpPrebootMock });

      expect(httpPrebootMock.registerRoutes).toHaveBeenCalledTimes(1);
      expect(httpPrebootMock.registerRoutes).toHaveBeenCalledWith('', expect.any(Function));

      const router = httpServiceMock.createRouter();
      const [[, registerCallback]] = httpPrebootMock.registerRoutes.mock.calls;
      registerCallback(router);
      expect(router.versioned.getRoute('get', '/api/_elu_history')).toBeDefined();
    });

    it('starts collecting the ELU with the configured interval', async () => {
      await metricsService.preboot({ http: httpPrebootMock });

      expect(MockEventLoopUtilizationMonitor).toHaveBeenCalledTimes(1);
      expect(setInterval).toHaveBeenCalledTimes(1);
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), testInterval);
      expect(OpsMetricsCollector).not.toHaveBeenCalled();
    });

    it('serves the ELU history collected during preboot from the route', async () => {
      await metricsService.preboot({ http: httpPrebootMock });
      jest.advanceTimersByTime(testInterval);

      const router = httpServiceMock.createRouter();
      const [[, registerCallback]] = httpPrebootMock.registerRoutes.mock.calls;
      registerCallback(router);
      const { handler } = router.versioned.getRoute('get', '/api/_elu_history').versions['1'];
      const responseFactory = httpServerMock.createResponseFactory();
      await handler({}, httpServerMock.createKibanaRequest(), responseFactory);

      expect(responseFactory.ok).toHaveBeenCalledWith({
        body: {
          history: {
            short: expect.closeTo(0.007, 3),
            medium: expect.closeTo(0.003, 3),
            long: expect.closeTo(0.002, 3),
          },
        },
      });
    });

    it('does not restart the ELU collection on setup', async () => {
      await metricsService.preboot({ http: httpPrebootMock });
      await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });

      expect(MockEventLoopUtilizationMonitor).toHaveBeenCalledTimes(1);
      // One for the ELU collection, another one for the ops metrics
      expect(setInterval).toHaveBeenCalledTimes(2);
    });

    it('stops the ELU collection on stop, even if setup was never called', async () => {
      await metricsService.preboot({ http: httpPrebootMock });
      jest.advanceTimersByTime(testInterval);
      expect(mockEluMonitor.collect).toHaveBeenCalledTimes(1);

      await metricsService.stop();
      jest.advanceTimersByTime(10 * testInterval);
      expect(mockEluMonitor.collect).toHaveBeenCalledTimes(1);
    });
  });

  describe('#start', () => {
    it('invokes setInterval with the configured interval', async () => {
      await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
      await metricsService.start();

      expect(OpsMetricsCollector).toHaveBeenCalledTimes(1);
      expect(OpsMetricsCollector).toHaveBeenCalledWith(
        httpMock.server,
        esServiceMock.agentStatsProvider,
        expect.objectContaining({ logger: logger.get('metrics') })
      );

      // One for the ELU collection, another one for the ops metrics
      expect(setInterval).toHaveBeenCalledTimes(2);
      expect(setInterval).toHaveBeenNthCalledWith(1, expect.any(Function), testInterval);
      expect(setInterval).toHaveBeenNthCalledWith(2, expect.any(Function), testInterval);
    });

    it('collects the metrics at every interval', async () => {
      await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
      await metricsService.start();

      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(testInterval);
      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(testInterval);
      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(3);
    });

    it('resets the collector after each collection', async () => {
      await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
      const { getOpsMetrics$ } = await metricsService.start();

      // `advanceTimersByTime` only ensure the interval handler is executed
      // however the `reset` call is executed after the async call to `collect`
      // meaning that we are going to miss the call if we don't wait for the
      // actual observable emission that is performed after. The extra
      // `nextTick` is to ensure we've done a complete roundtrip of the event
      // loop.
      const nextEmission = async () => {
        jest.advanceTimersByTime(testInterval);
        await getOpsMetrics$().pipe(take(1)).toPromise();
        await new Promise((resolve) => process.nextTick(resolve));
      };

      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(1);
      expect(mockOpsCollector.reset).toHaveBeenCalledTimes(1);

      await nextEmission();
      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(2);
      expect(mockOpsCollector.reset).toHaveBeenCalledTimes(2);

      await nextEmission();
      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(3);
      expect(mockOpsCollector.reset).toHaveBeenCalledTimes(3);
    });

    it('throws when called before setup', async () => {
      await expect(metricsService.start()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"#setup() needs to be run first"`
      );
    });

    it('emits the last value on each getOpsMetrics$ call', async () => {
      const firstMetrics = merge(getBaseTestMetrics(), { metric: 'first' });
      const secondMetrics = merge(getBaseTestMetrics(), { metric: 'second' });
      mockOpsCollector.collect
        .mockResolvedValueOnce(firstMetrics)
        .mockResolvedValueOnce(secondMetrics);

      await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
      const { getOpsMetrics$ } = await metricsService.start();

      const nextEmission = async () => {
        jest.advanceTimersByTime(testInterval);
        const emission = await getOpsMetrics$().pipe(take(1)).toPromise();
        await new Promise((resolve) => process.nextTick(resolve));
        return emission;
      };

      expect(await nextEmission()).toEqual(firstMetrics);
      expect(await nextEmission()).toEqual(secondMetrics);
    });

    it('logs the metrics at every interval', async () => {
      const firstMetrics = {
        process: {
          memory: { heap: { used_in_bytes: 100 } },
          uptime_in_millis: 1500,
          event_loop_delay: 50,
          event_loop_utilization: { utilization: 1 },
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
          event_loop_utilization: { utilization: 1 },
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

      mockOpsCollector.collect
        .mockResolvedValueOnce(firstMetrics)
        .mockResolvedValueOnce(secondMetrics);
      await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
      const { getOpsMetrics$ } = await metricsService.start();

      const nextEmission = async () => {
        jest.advanceTimersByTime(testInterval);
        const emission = await getOpsMetrics$().pipe(take(1)).toPromise();
        await new Promise((resolve) => process.nextTick(resolve));
        return emission;
      };

      await nextEmission();
      const opsLogs = loggingSystemMock.collect(opsLogger).debug;
      expect(opsLogs.length).toEqual(2);
      expect(opsLogs[0][1]).not.toEqual(opsLogs[1][1]);
    });

    it('emits average ELU values on getEluMetrics$ call', async () => {
      await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
      const { getEluMetrics$ } = await metricsService.start();
      const eluMetricsPromise = lastValueFrom(getEluMetrics$().pipe(toArray()));

      jest.advanceTimersByTime(testInterval * 3);
      await metricsService.stop();

      await expect(eluMetricsPromise).resolves.toEqual([
        { short: 0, medium: 0, long: 0 }, // initial value, before the first sample
        expect.objectContaining({
          short: expect.closeTo(0.007, 3), // accumulating mean: 1 * 100 / 15000 = 0.0067
          medium: expect.closeTo(0.003, 3), // accumulating mean: 1 * 100 / 30000 = 0.0033
          long: expect.closeTo(0.002, 3), // accumulating mean: 1 * 100 / 60000 = 0.0017
        }),
        expect.objectContaining({
          short: expect.closeTo(0.013, 3), // accumulating mean: 2 * 100 / 15000 = 0.0133
          medium: expect.closeTo(0.007, 3), // accumulating mean: 2 * 100 / 30000 = 0.0067
          long: expect.closeTo(0.003, 3), // accumulating mean: 2 * 100 / 60000 = 0.0033
        }),
        expect.objectContaining({
          short: expect.closeTo(0.02, 2), // accumulating mean: 3 * 100 / 15000 = 0.02
          medium: expect.closeTo(0.01, 2), // accumulating mean: 3 * 100 / 30000 = 0.01
          long: expect.closeTo(0.005, 3), // accumulating mean: 3 * 100 / 60000 = 0.005
        }),
      ]);
    });

    it('omits metrics from log message if they are missing or malformed', async () => {
      const opsLogger = logger.get('metrics', 'ops');
      mockOpsCollector.collect.mockResolvedValueOnce(
        merge(getBaseTestMetrics(), { secondMetrics: 'metrics' })
      );
      await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
      await metricsService.start();
      expect(loggingSystemMock.collect(opsLogger).debug[0]).toMatchInlineSnapshot(`
        Array [
          " utilization: 1.00000",
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
              "eventLoopUtilization": Object {
                "utilization": 1,
              },
              "memory": Object {
                "arrayBuffersInBytes": undefined,
                "externalInBytes": undefined,
                "heap": Object {
                  "sizeLimit": undefined,
                  "totalInBytes": undefined,
                  "usedInBytes": undefined,
                },
                "residentSetSizeInBytes": undefined,
              },
              "uptime": undefined,
            },
          },
        ]
      `);
    });
  });

  describe('#stop', () => {
    it('stops the metrics interval', async () => {
      await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
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
      await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
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
