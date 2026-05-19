/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Compiler } from '@rspack/core';
import type { ToolingLog } from '@kbn/tooling-log';
/**
 * Context directories for focused plugins, used to match modules by file path.
 * Required because RSPack's splitChunks distributes plugin modules across
 * shared chunks — chunk-name matching alone misses most of the plugin's code.
 */
export interface FocusPluginInfo {
  id: string;
  contextDir: string;
}
/**
 * Filter stats to include:
 * 1. Chunks whose name exactly matches `plugin-<id>` for any focused plugin
 * 2. Any other chunk that contains at least one module originating from a
 *    focused plugin's source directory (captures shared chunks)
 * 3. All modules within those chunks, plus all top-level modules matching
 *    the focused plugins' directories
 */
export declare function filterStatsByFocus(
  jsonStats: Record<string, any>,
  focusPlugins: FocusPluginInfo[],
  log?: ToolingLog
): Record<string, any>;
/**
 * Plugin to emit stats.json file for bundle analysis.
 * Used when profiling is enabled.
 *
 * Uses SYNCHRONOUS file writing to ensure stats are written before process exits.
 */
export declare class EmitStatsPlugin {
  private readonly outputDir;
  private readonly log?;
  private readonly focusPlugins?;
  constructor(
    outputDir: string,
    log?: ToolingLog | undefined,
    focusPlugins?: FocusPluginInfo[] | undefined
  );
  apply(compiler: Compiler): void;
  /**
   * Write stats JSON to disk synchronously, key by key, to avoid hitting
   * the JS string length limit with very large stats objects.
   */
  static writeStatsSync(statsPath: string, jsonStats: Record<string, any>): void;
}
