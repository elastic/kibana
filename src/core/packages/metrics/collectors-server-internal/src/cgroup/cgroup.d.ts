/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { MetricsCollector } from '@kbn/core-metrics-server';
import type { OsCgroupMetrics } from './types';
interface OsCgroupMetricsCollectorOptions {
  logger: Logger;
  cpuPath?: string;
  cpuAcctPath?: string;
}
export declare class OsCgroupMetricsCollector implements MetricsCollector<OsCgroupMetrics> {
  private readonly options;
  /**  Used to prevent unnecessary file reads on systems not using cgroups. */
  private noCgroupPresent;
  /** Are resources being managed by cgroup2? */
  private isCgroup2;
  private cpuPath?;
  private cpuAcctPath?;
  constructor(options: OsCgroupMetricsCollectorOptions);
  collect(): Promise<OsCgroupMetrics>;
  reset(): void;
  private hasPaths;
  private initializePaths;
}
export {};
