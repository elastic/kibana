/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PerformanceMonitor,
  DEFAULT_PERFORMANCE_THRESHOLDS,
  type PerformanceMetrics,
  type PerformanceThresholds,
} from './performance_monitor';
import { PerformanceMeasurement } from './performance_measurement';

describe('Performance Monitor', () => {
  let monitor: PerformanceMonitor;
  let customThresholds: PerformanceThresholds;

  beforeEach(() => {
    customThresholds = {
      maxDuration: 5000,
      maxMemoryGrowth: 50 * 1024 * 1024,
      minThroughput: 2,
      regressionThreshold: 0.15,
    };
    monitor = new PerformanceMonitor(customThresholds);
  });

  describe('Performance Measurement', () => {
    it('should accurately measure validation performance', () => {
      const measurement = new PerformanceMeasurement();

      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 50) {
        // Wait 50ms
      }

      const metrics = measurement.finish(10, 8, 2, 5);

      expect(metrics.fileCount).toBe(10);
      expect(metrics.validFiles).toBe(8);
      expect(metrics.invalidFiles).toBe(2);
      expect(metrics.errorCount).toBe(5);
      expect(metrics.duration).toBeGreaterThan(0);
      expect(metrics.throughput).toBeGreaterThan(0);
      expect(typeof metrics.memoryUsage.heapUsed).toBe('number');
    });

    it('should handle zero duration gracefully', () => {
      const measurement = new PerformanceMeasurement();
      const metrics = measurement.finish(0, 0, 0, 0);

      expect(metrics.throughput).toBe(0);
      expect(metrics.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Benchmark Recording', () => {
    it('should record and track benchmark metrics', () => {
      const testMetrics: PerformanceMetrics = {
        timestamp: Date.now(),
        duration: 1000,
        memoryUsage: { heapUsed: 1024, heapTotal: 2048, external: 512, rss: 4096 },
        fileCount: 5,
        validFiles: 4,
        invalidFiles: 1,
        errorCount: 2,
        throughput: 5,
      };

      monitor.recordMetrics('test-benchmark', testMetrics);

      const benchmark = monitor.getBenchmark('test-benchmark');
      expect(benchmark).toBeDefined();
      expect(benchmark!.metrics).toHaveLength(1);
      expect(benchmark!.metrics[0]).toEqual(testMetrics);
    });

    it('should calculate correct averages for multiple metrics', () => {
      const metrics1: PerformanceMetrics = {
        timestamp: Date.now(),
        duration: 1000,
        memoryUsage: { heapUsed: 1000, heapTotal: 2000, external: 500, rss: 4000 },
        fileCount: 10,
        validFiles: 8,
        invalidFiles: 2,
        errorCount: 3,
        throughput: 10,
      };

      const metrics2: PerformanceMetrics = {
        timestamp: Date.now(),
        duration: 2000,
        memoryUsage: { heapUsed: 2000, heapTotal: 4000, external: 1000, rss: 8000 },
        fileCount: 20,
        validFiles: 16,
        invalidFiles: 4,
        errorCount: 6,
        throughput: 10,
      };

      monitor.recordMetrics('average-test', metrics1);
      monitor.recordMetrics('average-test', metrics2);

      const benchmark = monitor.getBenchmark('average-test');
      expect(benchmark!.averages.duration).toBe(1500);
      expect(benchmark!.averages.throughput).toBe(10);
      expect(benchmark!.averages.memoryUsage).toBe(1500);
    });
  });

  describe('Threshold Validation', () => {
    it('should pass validation when metrics are within thresholds', () => {
      const goodMetrics: PerformanceMetrics = {
        timestamp: Date.now(),
        duration: 3000, // Below 5000ms threshold
        memoryUsage: { heapUsed: 1024, heapTotal: 2048, external: 512, rss: 4096 },
        fileCount: 10,
        validFiles: 9,
        invalidFiles: 1,
        errorCount: 1,
        throughput: 3, // Above 2 files/sec threshold
      };

      const validation = monitor.validateThresholds(goodMetrics);
      expect(validation.passed).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });

    it('should fail validation when metrics exceed thresholds', () => {
      const badMetrics: PerformanceMetrics = {
        timestamp: Date.now(),
        duration: 6000, // Above 5000ms threshold
        memoryUsage: { heapUsed: 1024, heapTotal: 2048, external: 512, rss: 4096 },
        fileCount: 10,
        validFiles: 9,
        invalidFiles: 1,
        errorCount: 1,
        throughput: 1, // Below 2 files/sec threshold
      };

      const validation = monitor.validateThresholds(badMetrics);
      expect(validation.passed).toBe(false);
      expect(validation.violations).toHaveLength(2);
      expect(validation.violations[0]).toContain('Duration');
      expect(validation.violations[1]).toContain('Throughput');
    });
  });

  describe('Regression Detection', () => {
    it('should detect performance regression when performance degrades', () => {
      // Set baseline metrics
      const baselineMetrics: PerformanceMetrics[] = [
        {
          timestamp: Date.now(),
          duration: 1000,
          memoryUsage: { heapUsed: 1024, heapTotal: 2048, external: 512, rss: 4096 },
          fileCount: 10,
          validFiles: 10,
          invalidFiles: 0,
          errorCount: 0,
          throughput: 10,
        },
      ];

      monitor.setBaseline('regression-test', baselineMetrics);

      // Add current metrics that are worse than baseline
      const regressedMetrics: PerformanceMetrics = {
        timestamp: Date.now(),
        duration: 2000, // 100% worse (exceeds 15% threshold)
        memoryUsage: { heapUsed: 2048, heapTotal: 4096, external: 1024, rss: 8192 },
        fileCount: 10,
        validFiles: 10,
        invalidFiles: 0,
        errorCount: 0,
        throughput: 5, // 50% worse throughput
      };

      monitor.recordMetrics('regression-test', regressedMetrics);

      const benchmark = monitor.getBenchmark('regression-test');
      expect(benchmark!.regression.detected).toBe(true);
      expect(benchmark!.regression.currentValue).toBeGreaterThan(benchmark!.regression.threshold);
    });

    it('should not detect regression for improved performance', () => {
      const baselineMetrics: PerformanceMetrics[] = [
        {
          timestamp: Date.now(),
          duration: 2000,
          memoryUsage: { heapUsed: 2048, heapTotal: 4096, external: 1024, rss: 8192 },
          fileCount: 10,
          validFiles: 10,
          invalidFiles: 0,
          errorCount: 0,
          throughput: 5,
        },
      ];

      monitor.setBaseline('improvement-test', baselineMetrics);

      // Add metrics that are better than baseline
      const improvedMetrics: PerformanceMetrics = {
        timestamp: Date.now(),
        duration: 1000, // 50% improvement
        memoryUsage: { heapUsed: 1024, heapTotal: 2048, external: 512, rss: 4096 },
        fileCount: 10,
        validFiles: 10,
        invalidFiles: 0,
        errorCount: 0,
        throughput: 10, // 100% improvement
      };

      monitor.recordMetrics('improvement-test', improvedMetrics);

      const benchmark = monitor.getBenchmark('improvement-test');
      expect(benchmark!.regression.detected).toBe(false);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive performance report', () => {
      // Add multiple benchmarks
      const metrics1: PerformanceMetrics = {
        timestamp: Date.now(),
        duration: 1000,
        memoryUsage: { heapUsed: 1024, heapTotal: 2048, external: 512, rss: 4096 },
        fileCount: 10,
        validFiles: 9,
        invalidFiles: 1,
        errorCount: 2,
        throughput: 10,
      };

      const metrics2: PerformanceMetrics = {
        timestamp: Date.now(),
        duration: 1500,
        memoryUsage: { heapUsed: 1536, heapTotal: 3072, external: 768, rss: 6144 },
        fileCount: 15,
        validFiles: 13,
        invalidFiles: 2,
        errorCount: 4,
        throughput: 10,
      };

      monitor.recordMetrics('benchmark-1', metrics1);
      monitor.recordMetrics('benchmark-2', metrics2);

      const report = monitor.exportReport();

      expect(report.summary.totalBenchmarks).toBe(2);
      expect(report.benchmarks).toHaveLength(2);
      expect(report.thresholds).toEqual(customThresholds);
      expect(report.summary.averagePerformance).toBeDefined();
      expect(report.summary.averagePerformance.duration).toBeGreaterThan(0);
    });

    it('should handle empty benchmarks gracefully', () => {
      const report = monitor.exportReport();

      expect(report.summary.totalBenchmarks).toBe(0);
      expect(report.summary.regressionsDetected).toBe(0);
      expect(report.benchmarks).toHaveLength(0);
      expect(report.summary.averagePerformance.duration).toBe(0);
    });
  });

  describe('Default Thresholds', () => {
    it('should provide reasonable default performance thresholds', () => {
      expect(DEFAULT_PERFORMANCE_THRESHOLDS.maxDuration).toBeGreaterThan(0);
      expect(DEFAULT_PERFORMANCE_THRESHOLDS.maxMemoryGrowth).toBeGreaterThan(0);
      expect(DEFAULT_PERFORMANCE_THRESHOLDS.minThroughput).toBeGreaterThan(0);
      expect(DEFAULT_PERFORMANCE_THRESHOLDS.regressionThreshold).toBeGreaterThan(0);
      expect(DEFAULT_PERFORMANCE_THRESHOLDS.regressionThreshold).toBeLessThan(1);
    });

    it('should work with default thresholds', () => {
      const defaultMonitor = new PerformanceMonitor(DEFAULT_PERFORMANCE_THRESHOLDS);

      const metrics: PerformanceMetrics = {
        timestamp: Date.now(),
        duration: 1000,
        memoryUsage: { heapUsed: 1024, heapTotal: 2048, external: 512, rss: 4096 },
        fileCount: 10,
        validFiles: 10,
        invalidFiles: 0,
        errorCount: 0,
        throughput: 10,
      };

      defaultMonitor.recordMetrics('default-test', metrics);
      const validation = defaultMonitor.validateThresholds(metrics);

      expect(validation.passed).toBe(true);
    });
  });

  describe('Stress Testing', () => {
    it('should handle large numbers of metrics efficiently', () => {
      const startTime = Date.now();
      const metricsCount = 1000;

      // Record many metrics
      for (let i = 0; i < metricsCount; i++) {
        const metrics: PerformanceMetrics = {
          timestamp: Date.now(),
          duration: 1000 + i,
          memoryUsage: { heapUsed: 1024 + i, heapTotal: 2048, external: 512, rss: 4096 },
          fileCount: 10,
          validFiles: 9,
          invalidFiles: 1,
          errorCount: 1,
          throughput: 10,
        };

        monitor.recordMetrics(`stress-test-${i % 10}`, metrics);
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process metrics reasonably quickly
      expect(processingTime).toBeLessThan(5000); // Less than 5 seconds for 1000 metrics

      // Should have correct number of benchmarks
      const benchmarks = monitor.getAllBenchmarks();
      expect(benchmarks.length).toBeLessThanOrEqual(10); // Maximum 10 unique benchmark names

      // Each benchmark should have multiple metrics
      benchmarks.forEach((benchmark) => {
        expect(benchmark.metrics.length).toBeGreaterThan(0);
      });
    });

    it('should maintain performance under memory pressure', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create many large metrics objects
      for (let i = 0; i < 100; i++) {
        const largeMetrics: PerformanceMetrics = {
          timestamp: Date.now(),
          duration: i * 100,
          memoryUsage: {
            heapUsed: i * 1024,
            heapTotal: i * 2048,
            external: i * 512,
            rss: i * 4096,
          },
          fileCount: i,
          validFiles: i - 1,
          invalidFiles: 1,
          errorCount: Math.floor(i / 10),
          throughput: i > 0 ? 10 / i : 0,
        };

        monitor.recordMetrics(`memory-test-${i}`, largeMetrics);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    });
  });
});
