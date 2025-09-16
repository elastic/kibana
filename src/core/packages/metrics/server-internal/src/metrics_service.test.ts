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
        .mockImplementationOnce(() => set({}, 'process.event_loop_utilization.utilization', 1.0))
        .mockResolvedValueOnce(set({}, 'process.event_loop_utilization.utilization', 1.0))
        .mockResolvedValueOnce(set({}, 'process.event_loop_utilization.utilization', 0.5));

      await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
      const { getEluMetrics$ } = await metricsService.start();
      const eluMetricsPromise = lastValueFrom(getEluMetrics$().pipe(toArray()));

      jest.advanceTimersByTime(testInterval * 2);
      await new Promise((resolve) => process.nextTick(resolve));
      await metricsService.stop();

      await expect(eluMetricsPromise).resolves.toEqual([
        expect.objectContaining({
          short: expect.closeTo(0.0067, 3),
          medium: expect.closeTo(0.0033, 3),
          long: expect.closeTo(0.0017, 3),
        }),
        expect.objectContaining({
          short: expect.closeTo(0.0133, 3),
          medium: expect.closeTo(0.0067, 3),
          long: expect.closeTo(0.0033, 3),
        }),
        expect.objectContaining({
          short: expect.closeTo(0.0167, 3),
          medium: expect.closeTo(0.0083, 3),
          long: expect.closeTo(0.0042, 3),
        }),
      ]);
    });

    describe('ELU multi-window behavior', () => {
      it('should handle transition points and mathematical relationships across all windows', async () => {
        // Test the complete lifecycle: mean periods → EMA transitions → steady state
        // This covers transition timing, mathematical properties, and window responsiveness
        const testPattern = [
          // Startup: high initial values (intervals 0-2, all windows in mean period)
          1.0, 1.0, 0.48,
          // Early phase: (intervals 3-5, short transitions to EMA, others still mean)
          0.03, 0.03, 0.1,
          // Mid phase: (intervals 6-11, medium transitions to EMA, long still mean)
          0.02, 0.02, 0.02, 0.02, 0.02, 0.04,
          // Settled: (intervals 12+, all windows using EMA)
          0.04, 0.02, 0.02,
        ];

        testPattern.forEach((value) => {
          mockOpsCollector.collect.mockResolvedValueOnce(
            set({}, 'process.event_loop_utilization.utilization', value)
          );
        });

        await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
        const { getEluMetrics$ } = await metricsService.start();
        const eluMetricsPromise = lastValueFrom(
          getEluMetrics$().pipe(take(testPattern.length), toArray())
        );

        jest.advanceTimersByTime(testInterval * (testPattern.length - 1));
        await new Promise((resolve) => process.nextTick(resolve));
        await metricsService.stop();

        const results = await eluMetricsPromise;

        // Key transition validation points
        const initial = results[0];
        const shortTransitioned = results[3]; // After short window EMA transition
        const mediumTransitioned = results[6]; // After medium window EMA transition
        const longTransitioned = results[12]; // After long window EMA transition
        const final = results[results.length - 1];

        // Verify mathematical properties during transitions
        results.forEach((result, index) => {
          // All values must be non-negative
          expect(result.short).toBeGreaterThanOrEqual(0);
          expect(result.medium).toBeGreaterThanOrEqual(0);
          expect(result.long).toBeGreaterThanOrEqual(0);

          // During mean periods, values should increase monotonically for constant positive input
          if (index > 0 && index < 12) {
            const prev = results[index - 1];
            if (index < 3) {
              expect(result.short).toBeGreaterThanOrEqual(prev.short);
            }
            if (index < 6) {
              expect(result.medium).toBeGreaterThanOrEqual(prev.medium);
            }
            expect(result.long).toBeGreaterThanOrEqual(prev.long);
          }
        });

        // Verify window responsiveness hierarchy (short reacts fastest)
        expect(shortTransitioned.short).toBeGreaterThan(shortTransitioned.medium);
        expect(shortTransitioned.medium).toBeGreaterThan(shortTransitioned.long);

        expect(mediumTransitioned.short).toBeGreaterThan(mediumTransitioned.medium);
        expect(mediumTransitioned.medium).toBeGreaterThan(initial.medium * 2);

        expect(longTransitioned.long).toBeGreaterThan(initial.long * 2);
        expect(final.short).toBeGreaterThan(final.medium);
        expect(final.medium).toBeGreaterThan(final.long);
      });

      it('should demonstrate realistic load pattern response differences', async () => {
        // Focus on realistic operational scenarios: steady state → spike → recovery
        const realisticPattern = [
          // Steady state baseline
          ...Array(6).fill(0.02),
          // Load spike and recovery
          0.48,
          0.1,
          0.03,
          0.03,
          0.02,
          0.04,
        ];

        realisticPattern.forEach((value) => {
          mockOpsCollector.collect.mockResolvedValueOnce(
            set({}, 'process.event_loop_utilization.utilization', value)
          );
        });

        await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
        const { getEluMetrics$ } = await metricsService.start();
        const eluMetricsPromise = lastValueFrom(
          getEluMetrics$().pipe(take(realisticPattern.length), toArray())
        );

        jest.advanceTimersByTime(testInterval * (realisticPattern.length - 1));
        await new Promise((resolve) => process.nextTick(resolve));
        await metricsService.stop();

        const results = await eluMetricsPromise;

        const baseline = results[5]; // Last steady state
        const afterLoad = results[results.length - 1]; // After load pattern

        // All windows should respond to load changes
        expect(afterLoad.short).toBeGreaterThan(baseline.short);
        expect(afterLoad.medium).toBeGreaterThan(baseline.medium);
        expect(afterLoad.long).toBeGreaterThan(baseline.long);

        // Values should be meaningful and positive
        expect(afterLoad.short).toBeGreaterThan(0);
        expect(afterLoad.medium).toBeGreaterThan(0);
        expect(afterLoad.long).toBeGreaterThan(0);
      });
    });

    describe('ELU autoscaling scenario tests', () => {
      it('should handle critical autoscaling scenarios: sustained high load and spike recovery', async () => {
        // Combined test covering both sustained load (for autoscaling threshold) and spike handling
        const scenarioPattern = [
          // Normal operation baseline (realistic steady state)
          ...Array(5).fill(0.02),
          // Sudden spike (realistic startup/load pattern)
          1.0,
          1.0,
          0.48,
          // Recovery to moderate sustained load (potential autoscaling scenario)
          ...Array(15).fill(0.3),
        ];

        scenarioPattern.forEach((value) => {
          mockOpsCollector.collect.mockResolvedValueOnce(
            set({}, 'process.event_loop_utilization.utilization', value)
          );
        });

        await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
        const { getEluMetrics$ } = await metricsService.start();
        const eluMetricsPromise = lastValueFrom(
          getEluMetrics$().pipe(take(scenarioPattern.length), toArray())
        );

        jest.advanceTimersByTime(testInterval * (scenarioPattern.length - 1));
        await new Promise((resolve) => process.nextTick(resolve));
        await metricsService.stop();

        const results = await eluMetricsPromise;

        const baseline = results[4]; // Last normal value
        const spikeResponse = results[7]; // During spike
        const sustainedLoad = results[results.length - 1]; // Final sustained state

        // Verify spike response (short window reacts fastest)
        expect(spikeResponse.short).toBeGreaterThan(baseline.short * 2);
        expect(spikeResponse.short).toBeGreaterThan(spikeResponse.medium);
        expect(spikeResponse.medium).toBeGreaterThan(spikeResponse.long);

        // Verify sustained load behavior for autoscaling decisions
        expect(sustainedLoad.long).toBeGreaterThan(baseline.long);
        expect(sustainedLoad.long).toBeLessThan(0.6); // Below autoscaling threshold
        expect(sustainedLoad.long).toBeGreaterThan(0.005); // Meaningful value
      });

      it('should transition from mean-to-EMA over long window', async () => {
        const transitionPattern = Array(15).fill(0.8); // High values

        transitionPattern.forEach((value) => {
          mockOpsCollector.collect.mockResolvedValueOnce(
            set({}, 'process.event_loop_utilization.utilization', value)
          );
        });

        await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
        const { getEluMetrics$ } = await metricsService.start();
        const eluMetricsPromise = lastValueFrom(
          getEluMetrics$().pipe(take(transitionPattern.length), toArray())
        );

        jest.advanceTimersByTime(testInterval * (transitionPattern.length - 1));
        await new Promise((resolve) => process.nextTick(resolve));
        await metricsService.stop();

        const results = await eluMetricsPromise;

        // test critical transition points for autoscaling
        const beforeTransition = results[11]; // Last mean calculation
        const atTransition = results[12]; // First EMA calculation
        const stabilized = results[14]; // Established EMA

        // Mean should detect gradual increase
        expect(beforeTransition.long).toBeGreaterThan(0);
        expect(beforeTransition.long).toBeLessThan(0.8);

        // EMA transition should detect progression
        expect(atTransition.long).toBeGreaterThan(beforeTransition.long);
        expect(stabilized.long).toBeGreaterThan(atTransition.long);

        // Final values should be meaningful for autoscaling decisions
        expect(stabilized.long).toBeGreaterThan(0.01);
      });
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
