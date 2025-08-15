/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PerformanceMeasurement } from './performance_measurement';

export interface PerformanceMetrics {
  timestamp: number;
  duration: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  fileCount: number;
  validFiles: number;
  invalidFiles: number;
  errorCount: number;
  throughput: number; // files per second
}

export interface PerformanceBenchmark {
  name: string;
  metrics: PerformanceMetrics[];
  averages: {
    duration: number;
    throughput: number;
    memoryUsage: number;
  };
  regression: {
    detected: boolean;
    threshold: number;
    currentValue: number;
    baselineValue: number;
  };
}

export interface PerformanceThresholds {
  maxDuration: number; // milliseconds
  maxMemoryGrowth: number; // bytes
  minThroughput: number; // files per second
  regressionThreshold: number; // percentage change
}

/**
 * Monitors and tracks performance metrics for OAS validation operations.
 *
 * This class provides comprehensive performance monitoring capabilities including
 * benchmarking, regression detection, threshold validation, and historical
 * performance tracking for optimization and quality assurance purposes.
 *
 * @example
 * ```typescript
 * import { PerformanceMonitor } from './performance_monitor';
 *
 * const monitor = new PerformanceMonitor({
 *   maxDuration: 10000, // 10 seconds max
 *   maxMemoryGrowth: 100 * 1024 * 1024, // 100MB max growth
 *   minThroughput: 5, // 5 files per second min
 *   regressionThreshold: 20 // 20% performance regression threshold
 * });
 *
 * // Start monitoring a validation operation
 * const measurement = monitor.startMeasurement();
 * // ... perform validation ...
 * const metrics = measurement.finish({
 *   fileCount: 10,
 *   validFiles: 8,
 *   invalidFiles: 2,
 *   errorCount: 5
 * });
 *
 * // Record and analyze performance
 * monitor.recordMetrics('validation-run', metrics);
 * const validation = monitor.validateThresholds(metrics);
 * if (!validation.passed) {
 *   console.warn('Performance issues detected:', validation.violations);
 * }
 * ```
 *
 * @public
 */
export class PerformanceMonitor {
  private benchmarks: Map<string, PerformanceBenchmark> = new Map();
  private thresholds: PerformanceThresholds;
  private baselineMetrics: Map<string, PerformanceMetrics[]> = new Map();

  constructor(thresholds: PerformanceThresholds) {
    this.thresholds = thresholds;
  }

  startMeasurement(): PerformanceMeasurement {
    return new PerformanceMeasurement();
  }

  recordMetrics(benchmarkName: string, metrics: PerformanceMetrics): void {
    if (!this.benchmarks.has(benchmarkName)) {
      this.benchmarks.set(benchmarkName, {
        name: benchmarkName,
        metrics: [],
        averages: { duration: 0, throughput: 0, memoryUsage: 0 },
        regression: { detected: false, threshold: 0, currentValue: 0, baselineValue: 0 },
      });
    }

    const benchmark = this.benchmarks.get(benchmarkName)!;
    benchmark.metrics.push(metrics);
    this.updateAverages(benchmark);
    this.detectRegression(benchmark);
  }

  getBenchmark(name: string): PerformanceBenchmark | undefined {
    return this.benchmarks.get(name);
  }

  getAllBenchmarks(): PerformanceBenchmark[] {
    return Array.from(this.benchmarks.values());
  }

  validateThresholds(metrics: PerformanceMetrics): {
    passed: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    if (metrics.duration > this.thresholds.maxDuration) {
      violations.push(
        `Duration ${metrics.duration}ms exceeds threshold ${this.thresholds.maxDuration}ms`
      );
    }

    if (metrics.throughput < this.thresholds.minThroughput) {
      violations.push(
        `Throughput ${metrics.throughput} files/sec below threshold ${this.thresholds.minThroughput} files/sec`
      );
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  setBaseline(benchmarkName: string, metrics: PerformanceMetrics[]): void {
    this.baselineMetrics.set(benchmarkName, [...metrics]);
  }

  exportReport(): {
    summary: {
      totalBenchmarks: number;
      regressionsDetected: number;
      averagePerformance: PerformanceMetrics;
    };
    benchmarks: PerformanceBenchmark[];
    thresholds: PerformanceThresholds;
  } {
    const benchmarks = this.getAllBenchmarks();
    const regressionsDetected = benchmarks.filter((b) => b.regression.detected).length;

    // Calculate overall average performance
    const allMetrics = benchmarks.flatMap((b) => b.metrics);
    const averagePerformance = this.calculateAverageMetrics(allMetrics);

    return {
      summary: {
        totalBenchmarks: benchmarks.length,
        regressionsDetected,
        averagePerformance,
      },
      benchmarks,
      thresholds: this.thresholds,
    };
  }

  private updateAverages(benchmark: PerformanceBenchmark): void {
    const metrics = benchmark.metrics;
    if (metrics.length === 0) return;

    benchmark.averages = {
      duration: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
      throughput: metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length,
      memoryUsage: metrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / metrics.length,
    };
  }

  private detectRegression(benchmark: PerformanceBenchmark): void {
    const baseline = this.baselineMetrics.get(benchmark.name);
    if (!baseline || baseline.length === 0 || benchmark.metrics.length === 0) {
      return;
    }

    const baselineAvg = this.calculateAverageMetrics(baseline);
    const currentAvg = benchmark.averages;

    // Check for performance regression (slower performance)
    const durationChange = (currentAvg.duration - baselineAvg.duration) / baselineAvg.duration;
    const throughputChange =
      (baselineAvg.throughput - currentAvg.throughput) / baselineAvg.throughput;

    const maxChange = Math.max(durationChange, throughputChange);

    benchmark.regression = {
      detected: maxChange > this.thresholds.regressionThreshold,
      threshold: this.thresholds.regressionThreshold,
      currentValue: maxChange,
      baselineValue: 0,
    };
  }

  private calculateAverageMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    if (metrics.length === 0) {
      return {
        timestamp: Date.now(),
        duration: 0,
        memoryUsage: { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 },
        fileCount: 0,
        validFiles: 0,
        invalidFiles: 0,
        errorCount: 0,
        throughput: 0,
      };
    }

    return {
      timestamp: Date.now(),
      duration: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
      memoryUsage: {
        heapUsed: metrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / metrics.length,
        heapTotal: metrics.reduce((sum, m) => sum + m.memoryUsage.heapTotal, 0) / metrics.length,
        external: metrics.reduce((sum, m) => sum + m.memoryUsage.external, 0) / metrics.length,
        rss: metrics.reduce((sum, m) => sum + m.memoryUsage.rss, 0) / metrics.length,
      },
      fileCount: metrics.reduce((sum, m) => sum + m.fileCount, 0) / metrics.length,
      validFiles: metrics.reduce((sum, m) => sum + m.validFiles, 0) / metrics.length,
      invalidFiles: metrics.reduce((sum, m) => sum + m.invalidFiles, 0) / metrics.length,
      errorCount: metrics.reduce((sum, m) => sum + m.errorCount, 0) / metrics.length,
      throughput: metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length,
    };
  }
}

// Default performance thresholds for OAS validation
export const DEFAULT_PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  maxDuration: 30000, // 30 seconds max for any validation
  maxMemoryGrowth: 100 * 1024 * 1024, // 100MB max memory growth
  minThroughput: 1, // At least 1 file per second
  regressionThreshold: 0.2, // 20% performance degradation threshold
};
