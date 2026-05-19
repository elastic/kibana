/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as Rx from 'rxjs';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ThemeTag } from './types';
export type OptimizerPhase = 'initializing' | 'running' | 'success' | 'issue' | 'error' | 'idle';
export interface RspackOptimizerOptions {
  repoRoot: string;
  watch?: boolean;
  cache?: boolean;
  dist?: boolean;
  examples?: boolean;
  themeTags?: ThemeTag[];
  /** Enable HMR in watch mode (undefined = auto-detect) */
  hmr?: boolean;
  /** Dev server base path (e.g. "/abc") for HMR auto-reload on server restart */
  basePath?: string;
  /** Forward --inspect flags to the worker process (default: true) */
  inspectWorkers?: boolean;
  log: ToolingLog;
}
/**
 * RSPack-based optimizer for use with kbn-cli-dev-mode
 *
 * This runs RSPack in a separate child process, similar to how @kbn/optimizer
 * runs webpack in worker threads. This allows clean termination when the user
 * presses Ctrl+C - we can simply kill the worker process.
 *
 * Benefits:
 * - Clean shutdown on Ctrl+C (no EPIPE errors, no lingering logs)
 * - RSPack's faster build speed for plugins
 * - No changes to Kibana's bootstrap or bundle serving
 * - Shared deps are already built and cached
 */
export declare class RspackOptimizer {
  private readonly ready$;
  private readonly phase$;
  private readonly options;
  private worker?;
  private isShuttingDown;
  constructor(options: RspackOptimizerOptions);
  /**
   * Run the optimizer (returns a Promise)
   */
  run(): Promise<void>;
  /**
   * Stop the optimizer (cleanup)
   * Called by cli-dev-mode when SIGINT is received
   */
  stop(): Promise<void>;
  /**
   * Get observable of optimizer phase changes
   */
  getPhase$(): Rx.Observable<OptimizerPhase>;
  /**
   * Get observable that emits true when optimizer is ready
   */
  isReady$(): Rx.Observable<boolean>;
}
