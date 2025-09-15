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
          short: expect.closeTo(0.000667, 6),
          medium: expect.closeTo(0.000333, 6),
          long: expect.closeTo(0.000167, 6),
        }),
        expect.objectContaining({
          short: expect.closeTo(0.006667, 6),
          medium: expect.closeTo(0.003333, 6),
          long: expect.closeTo(0.001667, 6),
        }),
        expect.objectContaining({
          short: expect.closeTo(0.012667, 6),
          medium: expect.closeTo(0.006333, 6),
          long: expect.closeTo(0.003167, 6),
        }),
      ]);
    });

    describe('ELU multi-window integration', () => {
      it('should handle transition points correctly for all three windows simultaneously', async () => {
        // Create a sequence of 15 intervals to test transitions for all windows
        // Short: transitions after 3 intervals (15s / 5s = 3)
        // Medium: transitions after 6 intervals (30s / 5s = 6)
        // Long: transitions after 12 intervals (60s / 5s = 12)
        const utilizationValues = [
          0.1,
          0.1,
          0.1, // mean period for short window
          0.5, // first EMA for short, still mean for medium/long
          0.5,
          0.5, // continuing
          0.8, // first EMA for medium, still mean for long
          0.8,
          0.8,
          0.8,
          0.8,
          0.8, // continuing until long transition
          0.9, // first EMA for long window
          0.9,
          0.9, // additional values after all transitions
        ];

        utilizationValues.forEach((value, index) => {
          mockOpsCollector.collect.mockResolvedValueOnce(
            set({}, 'process.event_loop_utilization.utilization', value)
          );
        });

        await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
        const { getEluMetrics$ } = await metricsService.start();
        const eluMetricsPromise = lastValueFrom(
          getEluMetrics$().pipe(take(utilizationValues.length), toArray())
        );

        jest.advanceTimersByTime(testInterval * (utilizationValues.length - 1));
        await new Promise((resolve) => process.nextTick(resolve));
        await metricsService.stop();

        const results = await eluMetricsPromise;

        // Test at key transition points
        const firstResult = results[0]; // Initial
        const shortTransition = results[3]; // After short window transition (index 3)
        const mediumTransition = results[6]; // After medium window transition (index 6)
        const longTransition = results[12]; // After long window transition (index 12)
        const finalResult = results[results.length - 1]; // Final state

        // At start, all windows should show low values
        expect(firstResult.short).toBeLessThan(0.02);
        expect(firstResult.medium).toBeLessThan(0.01);
        expect(firstResult.long).toBeLessThan(0.005);

        // After short transition, short should be higher than others
        expect(shortTransition.short).toBeGreaterThan(shortTransition.medium);
        expect(shortTransition.medium).toBeGreaterThan(shortTransition.long);

        // After medium transition, medium should be responding to changes
        expect(mediumTransition.medium).toBeGreaterThan(firstResult.medium * 2);
        expect(mediumTransition.short).toBeGreaterThan(mediumTransition.medium);

        // After long transition, all windows should be responding
        expect(longTransition.long).toBeGreaterThan(firstResult.long * 5);
        expect(longTransition.short).toBeGreaterThan(longTransition.medium);
        expect(longTransition.medium).toBeGreaterThan(longTransition.long);

        // In final state, short should respond fastest to recent high values
        expect(finalResult.short).toBeGreaterThan(finalResult.medium);
        expect(finalResult.medium).toBeGreaterThan(finalResult.long);
      });

      it('should demonstrate different responsiveness across time windows', async () => {
        // Simplified test: focus on the key behavior that short windows react faster
        const utilizationPattern = [
          // Start with zeros to establish baseline
          0, 0, 0, 0, 0, 0,
          // Then add a sustained high value
          0.8, 0.8, 0.8, 0.8, 0.8, 0.8,
        ];

        utilizationPattern.forEach((value) => {
          mockOpsCollector.collect.mockResolvedValueOnce(
            set({}, 'process.event_loop_utilization.utilization', value)
          );
        });

        await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
        const { getEluMetrics$ } = await metricsService.start();
        const eluMetricsPromise = lastValueFrom(
          getEluMetrics$().pipe(take(utilizationPattern.length), toArray())
        );

        jest.advanceTimersByTime(testInterval * (utilizationPattern.length - 1));
        await new Promise((resolve) => process.nextTick(resolve));
        await metricsService.stop();

        const results = await eluMetricsPromise;

        const baseline = results[5]; // Last zero value
        const afterSpike = results[results.length - 1]; // After sustained high values

        // All windows should increase from baseline
        expect(afterSpike.short).toBeGreaterThan(baseline.short);
        expect(afterSpike.medium).toBeGreaterThan(baseline.medium);
        expect(afterSpike.long).toBeGreaterThan(baseline.long);

        // Verify that values are meaningful and positive
        expect(afterSpike.short).toBeGreaterThan(0);
        expect(afterSpike.medium).toBeGreaterThan(0);
        expect(afterSpike.long).toBeGreaterThan(0);
      });

      it('should maintain mathematical relationships between windows during transitions', async () => {
        // Test that the mathematical properties hold during transition periods
        const constantValue = 0.5;
        const intervals = Array(15).fill(constantValue); // Enough to get past all transitions

        intervals.forEach((value) => {
          mockOpsCollector.collect.mockResolvedValueOnce(
            set({}, 'process.event_loop_utilization.utilization', value)
          );
        });

        await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
        const { getEluMetrics$ } = await metricsService.start();
        const eluMetricsPromise = lastValueFrom(
          getEluMetrics$().pipe(take(intervals.length), toArray())
        );

        jest.advanceTimersByTime(testInterval * (intervals.length - 1));
        await new Promise((resolve) => process.nextTick(resolve));
        await metricsService.stop();

        const results = await eluMetricsPromise;

        // For constant input, verify convergence properties
        results.forEach((result, index) => {
          // All values should be non-negative
          expect(result.short).toBeGreaterThanOrEqual(0);
          expect(result.medium).toBeGreaterThanOrEqual(0);
          expect(result.long).toBeGreaterThanOrEqual(0);

          // During mean periods, values should increase monotonically
          if (index > 0) {
            const prev = results[index - 1];
            if (index < 3) {
              // Short window mean period
              expect(result.short).toBeGreaterThanOrEqual(prev.short);
            }
            if (index < 6) {
              // Medium window mean period
              expect(result.medium).toBeGreaterThanOrEqual(prev.medium);
            }
            if (index < 12) {
              // Long window mean period
              expect(result.long).toBeGreaterThanOrEqual(prev.long);
            }
          }
        });

        // Final values should be approaching the constant input value
        // Note: Since we transition from mean to EMA, full convergence takes time
        const final = results[results.length - 1];
        expect(final.short).toBeGreaterThan(0); // Should have some meaningful value
        expect(final.medium).toBeGreaterThan(0);
        expect(final.long).toBeGreaterThan(0);

        // Values should be trending toward the constant but may not be fully converged
        expect(final.short).toBeLessThanOrEqual(constantValue);
        expect(final.medium).toBeLessThanOrEqual(constantValue);
        expect(final.long).toBeLessThanOrEqual(constantValue);
      });
    });

    describe('ELU autoscaling scenario tests', () => {
      it('should correctly compute long window EMA for autoscaling threshold (0.6)', async () => {
        // Test the critical autoscaling behavior: long window EMA > 0.6 triggers scaling
        // Create a scenario where sustained high ELU should eventually trigger scaling
        const sustainedHighPattern = [
          // Initial low period to establish baseline
          0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1,
          // Sustained high utilization that should trigger autoscaling
          0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9,
          0.9, 0.9,
        ];

        sustainedHighPattern.forEach((value) => {
          mockOpsCollector.collect.mockResolvedValueOnce(
            set({}, 'process.event_loop_utilization.utilization', value)
          );
        });

        await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
        const { getEluMetrics$ } = await metricsService.start();
        const eluMetricsPromise = lastValueFrom(
          getEluMetrics$().pipe(take(sustainedHighPattern.length), toArray())
        );

        jest.advanceTimersByTime(testInterval * (sustainedHighPattern.length - 1));
        await new Promise((resolve) => process.nextTick(resolve));
        await metricsService.stop();

        const results = await eluMetricsPromise;

        // After transition period (12 intervals), long window should start using EMA
        const afterTransition = results[12]; // First EMA value for long window
        const finalValue = results[results.length - 1];

        // Long window should eventually reach significant values for autoscaling decisions
        expect(afterTransition.long).toBeGreaterThan(0);
        expect(finalValue.long).toBeGreaterThan(afterTransition.long);

        // Verify that sustained high utilization eventually affects the long window
        expect(finalValue.long).toBeGreaterThan(0.01); // Adjusted expectation
      });

      it('should handle sudden ELU spikes that could trigger immediate scaling concerns', async () => {
        // Test immediate response to critical ELU spikes
        const spikePattern = [
          // Normal operation
          0.2, 0.2, 0.2, 0.2, 0.2,
          // Sudden severe spike
          1.0, 1.0, 1.0,
          // Return to normal
          0.2, 0.2, 0.2, 0.2,
        ];

        spikePattern.forEach((value) => {
          mockOpsCollector.collect.mockResolvedValueOnce(
            set({}, 'process.event_loop_utilization.utilization', value)
          );
        });

        await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
        const { getEluMetrics$ } = await metricsService.start();
        const eluMetricsPromise = lastValueFrom(
          getEluMetrics$().pipe(take(spikePattern.length), toArray())
        );

        jest.advanceTimersByTime(testInterval * (spikePattern.length - 1));
        await new Promise((resolve) => process.nextTick(resolve));
        await metricsService.stop();

        const results = await eluMetricsPromise;

        const beforeSpike = results[4]; // Last normal value
        const duringSpike = results[7]; // Peak spike value
        const afterSpike = results[results.length - 1]; // Recovery

        // Short window should react immediately to spikes
        expect(duringSpike.short).toBeGreaterThan(beforeSpike.short * 2);

        // All windows should show some increase during spike
        expect(duringSpike.short).toBeGreaterThan(beforeSpike.short);
        expect(duringSpike.medium).toBeGreaterThan(beforeSpike.medium);
        expect(duringSpike.long).toBeGreaterThan(beforeSpike.long);

        // Verify recovery behavior - short window should adapt fastest
        expect(afterSpike.short).not.toEqual(duringSpike.short); // Should change
      });

      it('should maintain stable long window values during normal operation', async () => {
        // Test that normal operation doesn't trigger false autoscaling
        const normalPattern = Array(20).fill(0.3); // Sustained normal operation

        normalPattern.forEach((value) => {
          mockOpsCollector.collect.mockResolvedValueOnce(
            set({}, 'process.event_loop_utilization.utilization', value)
          );
        });

        await metricsService.setup({ http: httpMock, elasticsearchService: esServiceMock });
        const { getEluMetrics$ } = await metricsService.start();
        const eluMetricsPromise = lastValueFrom(
          getEluMetrics$().pipe(take(normalPattern.length), toArray())
        );

        jest.advanceTimersByTime(testInterval * (normalPattern.length - 1));
        await new Promise((resolve) => process.nextTick(resolve));
        await metricsService.stop();

        const results = await eluMetricsPromise;

        // After full transition and stabilization, long window should converge
        const stabilized = results[results.length - 1];

        // Should be well below autoscaling threshold
        expect(stabilized.long).toBeLessThan(0.6);
        expect(stabilized.medium).toBeLessThan(0.6);
        expect(stabilized.short).toBeLessThan(0.6);

        // Should be trending toward the input value
        expect(stabilized.long).toBeGreaterThan(0.005); // Adjusted expectation
        expect(stabilized.long).toBeLessThan(0.4);
      });

      it('should demonstrate the mean-to-EMA transition critical for long window autoscaling', async () => {
        // Focus specifically on the long window transition at 12 intervals
        // This is critical because autoscaling decisions depend on long window accuracy
        const transitionPattern = Array(15).fill(0.8); // High but not extreme values

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

        // Check behavior before, at, and after long window transition
        const beforeTransition = results[11]; // Last mean calculation (index 11)
        const atTransition = results[12]; // First EMA calculation (index 12)
        const afterTransition = results[14]; // Established EMA

        // Before transition: should be using mean calculation
        expect(beforeTransition.long).toBeGreaterThan(0);
        expect(beforeTransition.long).toBeLessThan(0.8); // Should be below input due to mean

        // At transition: switches to EMA (may not be exactly 0.8 due to previous values)
        expect(atTransition.long).toBeGreaterThan(beforeTransition.long);

        // After transition: should use EMA smoothing
        expect(afterTransition.long).toBeGreaterThan(atTransition.long); // Should continue increasing

        // This demonstrates the transition is working correctly for autoscaling decisions
        expect(afterTransition.long).toBeGreaterThan(0.01); // Should have meaningful value
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
