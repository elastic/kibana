/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import os from 'node:os';
import type { CacheOptions } from './validation_cache';

// Re-export optimization classes
export {
  ValidationCache,
  validationCache,
  type CacheEntry,
  type CacheOptions,
} from './validation_cache';
export { ParallelProcessor } from './parallel_processor';
export { MemoryManager } from './memory_manager';

// Performance optimization configuration
export interface OptimizationConfig {
  caching: CacheOptions;
  parallelism: {
    enabled: boolean;
    concurrency: number;
  };
  memoryManagement: {
    enabled: boolean;
    gcThreshold: number; // Memory percentage to trigger GC
    maxMemoryUsage: number; // Bytes
  };
}

export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  caching: {
    enabled: true,
    maxEntries: 1000,
    maxAge: 30 * 60 * 1000, // 30 minutes
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    evictionPolicy: 'lru',
  },
  parallelism: {
    enabled: true,
    concurrency: Math.min(4, os.cpus().length),
  },
  memoryManagement: {
    enabled: true,
    gcThreshold: 0.8, // 80%
    maxMemoryUsage: 500 * 1024 * 1024, // 500MB
  },
};
