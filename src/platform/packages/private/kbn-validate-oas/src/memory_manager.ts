/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Manages memory usage monitoring and optimization for OAS validation operations.
 *
 * This class provides utilities for monitoring memory consumption, detecting memory pressure,
 * and triggering garbage collection when necessary to prevent out-of-memory errors during
 * large-scale validation operations.
 *
 * @example
 * ```typescript
 * import { MemoryManager } from './memory_manager';
 *
 * // Check current memory usage
 * const status = MemoryManager.checkMemoryUsage();
 * if (status.warning) {
 *   console.warn(`Memory usage at ${(status.percentage * 100).toFixed(1)}%`);
 * }
 *
 * // Monitor memory pressure during processing
 * const pressure = MemoryManager.getMemoryPressure();
 * if (pressure === 'high' || pressure === 'critical') {
 *   console.log('Reducing batch size due to memory pressure');
 *   batchSize = Math.max(1, batchSize / 2);
 * }
 *
 * // Force garbage collection if available
 * if (MemoryManager.forceGarbageCollection()) {
 *   console.log('Triggered garbage collection');
 * }
 * ```
 *
 * @public
 */
export class MemoryManager {
  private static readonly WARNING_THRESHOLD = 0.8; // 80% of max heap
  private static readonly CRITICAL_THRESHOLD = 0.9; // 90% of max heap

  static checkMemoryUsage(): {
    usage: NodeJS.MemoryUsage;
    percentage: number;
    warning: boolean;
    critical: boolean;
  } {
    const usage = process.memoryUsage();
    const percentage = usage.heapUsed / usage.heapTotal;

    return {
      usage,
      percentage,
      warning: percentage > this.WARNING_THRESHOLD,
      critical: percentage > this.CRITICAL_THRESHOLD,
    };
  }

  static forceGarbageCollection(): boolean {
    if (global.gc) {
      global.gc();
      return true;
    }
    return false;
  }

  static getMemoryPressure(): 'low' | 'medium' | 'high' | 'critical' {
    const { percentage } = this.checkMemoryUsage();

    if (percentage > this.CRITICAL_THRESHOLD) {
      return 'critical';
    } else if (percentage > this.WARNING_THRESHOLD) {
      return 'high';
    } else if (percentage > 0.6) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}
