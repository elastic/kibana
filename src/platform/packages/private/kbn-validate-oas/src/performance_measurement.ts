/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PerformanceMetrics } from './performance_monitor';

/**
 * Measures performance metrics for individual validation operations.
 *
 * This class provides a simple interface for measuring the execution time, memory usage,
 * and throughput of validation operations. It captures baseline measurements at creation
 * and calculates comprehensive metrics when the operation completes.
 *
 * @example
 * ```typescript
 * import { PerformanceMeasurement } from './performance_measurement';
 *
 * // Start measuring performance
 * const measurement = new PerformanceMeasurement();
 *
 * // Perform validation operations...
 * const results = await validateFiles();
 *
 * // Finish measurement and get metrics
 * const metrics = measurement.finish(
 *   results.totalFiles,
 *   results.validFiles,
 *   results.invalidFiles,
 *   results.totalErrors
 * );
 *
 * console.log(`Validation took ${metrics.duration}ms`);
 * console.log(`Throughput: ${metrics.throughput.toFixed(2)} files/sec`);
 * console.log(`Memory used: ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
 * ```
 *
 * @public
 */
export class PerformanceMeasurement {
  private startTime: number;
  private startMemory: NodeJS.MemoryUsage;

  constructor() {
    this.startTime = Date.now();
    this.startMemory = process.memoryUsage();
  }

  finish(
    fileCount: number,
    validFiles: number,
    invalidFiles: number,
    errorCount: number
  ): PerformanceMetrics {
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - this.startTime;

    return {
      timestamp: this.startTime,
      duration,
      memoryUsage: {
        heapUsed: endMemory.heapUsed - this.startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - this.startMemory.heapTotal,
        external: endMemory.external - this.startMemory.external,
        rss: endMemory.rss - this.startMemory.rss,
      },
      fileCount,
      validFiles,
      invalidFiles,
      errorCount,
      throughput: duration > 0 ? (fileCount / duration) * 1000 : 0, // files per second
    };
  }
}
