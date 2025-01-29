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
import { set } from '@kbn/safer-lodash-set';
import { lastValueFrom, take, toArray } from 'rxjs';
import { configServiceMock } from '@kbn/config-mocks';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { mockOpsCollector } from './metrics_service.test.mocks';
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
      await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
      await metricsService.start();

      expect(OpsMetricsCollector).toHaveBeenCalledTimes(1);
      expect(OpsMetricsCollector).toHaveBeenCalledWith(
        httpMock.server,
        esServiceMock.agentStatsProvider,
        expect.objectContaining({ logger: logger.get('metrics') })
      );

      expect(setInterval).toHaveBeenCalledTimes(1);
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), testInterval);
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
      mockOpsCollector.collect
        .mockImplementationOnce(() => set({}, 'process.event_loop_utilization.utilization', 0.1))
        .mockResolvedValueOnce(set({}, 'process.event_loop_utilization.utilization', 0.9))
        .mockResolvedValueOnce(set({}, 'process.event_loop_utilization.utilization', 0.9));

      await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
      const { getEluMetrics$ } = await metricsService.start();
      const eluMetricsPromise = lastValueFrom(getEluMetrics$().pipe(toArray()));

      jest.advanceTimersByTime(testInterval * 2);
      await new Promise((resolve) => process.nextTick(resolve));
      await metricsService.stop();

      await expect(eluMetricsPromise).resolves.toEqual([
        expect.objectContaining({
          short: expect.closeTo(0.1),
          medium: expect.closeTo(0.1),
          long: expect.closeTo(0.1),
        }),
        expect.objectContaining({
          short: expect.closeTo(0.11),
          medium: expect.closeTo(0.1),
          long: expect.closeTo(0.1),
        }),
        expect.objectContaining({
          short: expect.closeTo(0.11),
          medium: expect.closeTo(0.11),
          long: expect.closeTo(0.1),
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
