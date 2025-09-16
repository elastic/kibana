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
        // Uses realistic ELU values based on actual Kibana startup and operation patterns
        const testPattern = [
          // Startup: high initial values (intervals 0-2, all windows in mean period)
          1.0, 1.0, 0.48,
          // Early settling: (intervals 3-5, short transitions to EMA, others still mean)
          0.031, 0.029, 0.099,
          // Steady state: (intervals 6-11, medium transitions to EMA, long still mean)
          0.022, 0.022, 0.023, 0.018, 0.021, 0.024,
          // Normal operations: (intervals 12+, all windows using EMA)
          0.036, 0.019, 0.018,
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

        // Verify realistic ELU value ranges during transitions
        results.forEach((result, index) => {
          // ELU values should be meaningful fractions (0-1 range typically)
          expect(result.short).toBeGreaterThan(0);
          expect(result.short).toBeLessThan(1);
          expect(result.medium).toBeGreaterThan(0);
          expect(result.medium).toBeLessThan(1);
          expect(result.long).toBeGreaterThan(0);
          expect(result.long).toBeLessThan(1);

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
        // Based on actual Kibana operational patterns from logs
        const realisticPattern = [
          // Steady state baseline (typical normal operation)
          ...Array(6).fill(0.02),
          // Load spike and recovery (similar to GC or intensive operation)
          0.093, // Brief spike (like actual log value 0.09299)
          0.042, // Recovery
          0.025, // Settling
          0.019, // Back to normal
          0.023, // Normal variation
          0.018, // Normal variation
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
        const afterSpike = results[results.length - 1]; // After load pattern

        // All windows should respond to load changes
        expect(afterSpike.short).toBeGreaterThan(baseline.short);
        expect(afterSpike.medium).toBeGreaterThan(baseline.medium);
        expect(afterSpike.long).toBeGreaterThan(baseline.long);

        // Values should be within expected ELU ranges based on realistic patterns
        expect(afterSpike.short).toBeGreaterThan(0.001); // Should reflect recent low activity
        expect(afterSpike.short).toBeLessThan(0.05); // Reasonable for recent 0.018-0.023 values
        expect(afterSpike.medium).toBeGreaterThan(0.001); // Should show some historical influence
        expect(afterSpike.medium).toBeLessThan(0.04); // Moderate response to pattern
        // Long window calculation: (6*0.02 + 0.093 + 0.042 + 0.025 + 0.019 + 0.023 + 0.018) * 100 / 60000 ≈ 0.000567
        expect(afterSpike.long).toBeGreaterThan(0.0005); // Should show long-term trend
        expect(afterSpike.long).toBeLessThan(0.0007); // Conservative response due to longer averaging
      });
    });

    describe('ELU autoscaling scenario tests', () => {
      it('should handle critical autoscaling scenarios: sustained high load and spike recovery', async () => {
        // Combined test covering both sustained load (for autoscaling threshold) and spike handling
        // Based on realistic Kibana patterns: normal operation → brief startup-like spike → moderate sustained load
        const scenarioPattern = [
          // Normal operation baseline (realistic steady state)
          ...Array(5).fill(0.02),
          // Sudden spike (realistic startup/load pattern)
          1.0,
          1.0,
          0.48,
          // Recovery to moderate sustained load (realistic autoscaling scenario)
          // Based on actual log patterns where sustained load is 0.04-0.08, not 0.3
          ...Array(15).fill(0.065),
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
        // Long window should reflect sustained moderate load (6.5%) but not be excessive
        expect(sustainedLoad.long).toBeGreaterThan(baseline.long);
        expect(sustainedLoad.long).toBeLessThan(0.1); // Below extreme autoscaling threshold
        expect(sustainedLoad.long).toBeGreaterThan(0.005); // Meaningful sustained load value

        // Medium window should show stronger response to recent sustained load
        expect(sustainedLoad.medium).toBeGreaterThan(sustainedLoad.long);
        expect(sustainedLoad.medium).toBeLessThan(0.08); // Reasonable upper bound
      });

      it('should transition from mean-to-EMA over long window', async () => {
        // Focus on long window transition behavior using realistic sustained load values
        // Based on actual Kibana patterns where sustained higher load is 0.06-0.12, not 0.8
        const transitionPattern = Array(15).fill(0.08); // Realistic higher load (8%)

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

        // Test critical transition points for autoscaling
        const beforeTransition = results[11]; // Last mean calculation
        const atTransition = results[12]; // First EMA calculation
        const stabilized = results[14]; // Established EMA

        // Mean should detect gradual increase with realistic values
        expect(beforeTransition.long).toBeGreaterThan(0.001); // Should be accumulating
        expect(beforeTransition.long).toBeLessThan(0.08); // But below input due to averaging

        // EMA transition should detect progression
        expect(atTransition.long).toBeGreaterThan(beforeTransition.long);
        expect(stabilized.long).toBeGreaterThan(atTransition.long);

        // Final values should be meaningful for autoscaling decisions
        // With 8% input over 15 samples: (15 * 0.08 * 100) / 60000 = 0.002
        expect(stabilized.long).toBeGreaterThan(0.0015); // Meaningful threshold
        expect(stabilized.long).toBeLessThan(0.0025); // Reasonable upper bound for 8% input
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
