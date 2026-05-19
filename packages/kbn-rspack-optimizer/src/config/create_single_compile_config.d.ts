/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Configuration } from '@rspack/core';
import type { ToolingLog } from '@kbn/tooling-log';
import { findTargetEntry } from '../utils/entry_generation';
import type { ThemeTag } from '../types';
import { signalShutdown, resetShutdown } from '../plugins/log_progress_plugin';
export { signalShutdown, resetShutdown };
export { findTargetEntry };
export interface SingleCompileConfigOptions {
  repoRoot: string;
  outputRoot?: string;
  dist?: boolean;
  watch?: boolean;
  cache?: boolean;
  examples?: boolean;
  testPlugins?: boolean;
  themeTags?: ThemeTag[];
  /** ToolingLog instance for consistent logging with Kibana's dev mode */
  log?: ToolingLog;
  /** Enable profiling - writes stats.json and enables RsDoctor */
  profile?: boolean;
  /** Skip RsDoctor, only generate stats.json (faster) */
  profileStatsOnly?: boolean;
  /** Plugin IDs for focused stats.json with module-level detail (requires profile) */
  profileFocus?: string[];
  /** Enable Hot Module Replacement (resolved by caller via isHmrEnabled) */
  hmr?: boolean;
  /** Port the HMR SSE server is listening on (required when hmr=true) */
  hmrPort?: number;
  /** Override the limits.yml path (default: packages/kbn-rspack-optimizer/limits.yml) */
  limitsPath?: string;
}
/**
 * Create a SINGLE RSPack configuration that builds ALL plugins together.
 *
 * Benefits:
 * - One compilation = faster, less memory
 * - Shared deps parsed only once
 * - All plugins output to their respective target/public directories
 * - Compatible with external plugin builds using same externals
 */
export declare function createSingleCompileConfig(
  options: SingleCompileConfigOptions
): Promise<Configuration>;
