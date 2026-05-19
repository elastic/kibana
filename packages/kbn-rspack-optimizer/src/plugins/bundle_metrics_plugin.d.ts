/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Compiler } from '@rspack/core';
import type { CiStatsMetric } from '@kbn/ci-stats-reporter';
/**
 * Per-plugin/core metrics info used internally by BundleMetricsPlugin.
 *
 * `id` is the user-facing identifier that appears in metrics.json, limits.yml,
 * CI stats, and user-facing logs (e.g. "core", "discover").
 *
 * `chunkName` is the internal rspack chunk name used to match against
 * `compilation.chunks` (e.g. "plugin-core" for core, "plugin-discover" for discover).
 */
export interface PluginMetricsInfo {
  id: string;
  chunkName: string;
  limit?: number;
  ignoreMetrics: boolean;
}
/**
 * Build the CiStatsMetric array from collected chunk data.
 * Extracted as a standalone function to enable unit testing without a full
 * rspack compilation.
 */
export declare function buildMetrics(
  entries: Array<{
    id: string;
    chunkName: string;
    limit?: number;
    pageLoadSize: number;
    moduleCount: number;
    asyncSize: number;
    asyncCount: number;
    miscSize: number;
  }>,
  sharedStats: {
    totalSize: number;
    count: number;
  },
  sharedAsyncStats: {
    totalSize: number;
    count: number;
  },
  totalOutputSize: number
): CiStatsMetric[];
/**
 * Rspack plugin that collects per-plugin bundle metrics from the single
 * unified compilation and emits `metrics.json` as a compilation asset.
 *
 * Replaces legacy's `PopulateBundleCachePlugin` + `BundleMetricsPlugin`
 * with a single plugin that uses `ChunkGraph` APIs directly.
 */
export declare class BundleMetricsPlugin {
  private readonly pluginInfos;
  private readonly sharedChunkNames;
  private readonly sharedChunkLimits?;
  private readonly chunkNameToInfo;
  constructor(
    pluginInfos: PluginMetricsInfo[],
    sharedChunkNames: Set<string>,
    sharedChunkLimits?: Map<string, number> | undefined
  );
  apply(compiler: Compiler): void;
}
