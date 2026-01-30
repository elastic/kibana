/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import type { ToolingLog } from '@kbn/tooling-log';
import { runHybridBuild } from './run_hybrid_build';
import type { ThemeTag } from './types';

export type OptimizerPhase = 'initializing' | 'running' | 'success' | 'issue' | 'error' | 'idle';
export type BuildMode = 'hybrid' | 'single';

export interface RspackOptimizerOptions {
  repoRoot: string;
  watch?: boolean;
  cache?: boolean;
  dist?: boolean;
  examples?: boolean;
  themeTags?: ThemeTag[];
  /** Build mode: 'hybrid' (default, optimal) or 'single' (fastest, no isolated builds) */
  mode?: BuildMode;
  log: ToolingLog;
}

/**
 * RSPack-based optimizer for use with kbn-cli-dev-mode
 *
 * This builds plugins using RSPack (faster than webpack) while
 * reusing the existing webpack-built @kbn/ui-shared-deps bundles.
 *
 * Benefits:
 * - RSPack's faster build speed for plugins
 * - No changes to Kibana's bootstrap or bundle serving
 * - Shared deps are already built and cached
 */
export class RspackOptimizer {
  private readonly ready$ = new Rx.ReplaySubject<boolean>(1);
  private readonly phase$ = new Rx.ReplaySubject<OptimizerPhase>(1);
  private readonly options: RspackOptimizerOptions;

  constructor(options: RspackOptimizerOptions) {
    this.options = options;
    this.phase$.next('idle');
  }

  /**
   * Run the optimizer (returns a Promise)
   */
  async run(): Promise<void> {
    const { log } = this.options;

    this.phase$.next('initializing');
    log.info('Starting RSPack build (using existing @kbn/ui-shared-deps)...');

    try {
      this.phase$.next('running');

      const result = await runHybridBuild({
        repoRoot: this.options.repoRoot,
        outputRoot: this.options.repoRoot,
        watch: this.options.watch,
        cache: this.options.cache,
        dist: this.options.dist,
        examples: this.options.examples,
        themeTags: this.options.themeTags ?? ['borealislight', 'borealisdark'],
        log,
      });

      if (result.success) {
        this.phase$.next('success');
        this.ready$.next(true);
        log.success(`RSPack build completed in ${result.duration?.toFixed(2)}s`);

        // In watch mode, the build runner handles watching internally
        if (this.options.watch) {
          log.info('Watching for changes...');
        }
      } else {
        this.phase$.next('error');
        // DO NOT signal ready if there are errors - Kibana should not start
        this.ready$.next(false);
        log.error('Build errors:');
        for (const error of result.errors ?? []) {
          log.error(error);
        }
        // In watch mode, keep waiting for changes to fix the errors
        if (this.options.watch) {
          log.info('Waiting for changes to fix errors...');
        }
      }
    } catch (err: any) {
      this.phase$.next('error');
      this.ready$.next(false);
      log.error('RSPack build failed:', err.message);
      throw err;
    }
  }

  /**
   * Stop the optimizer (cleanup)
   */
  stop(): Promise<void> {
    // Hybrid build handles cleanup internally
    return Promise.resolve();
  }

  /**
   * Get observable of optimizer phase changes
   */
  getPhase$(): Rx.Observable<OptimizerPhase> {
    return this.phase$.asObservable();
  }

  /**
   * Get observable that emits true when optimizer is ready
   */
  isReady$(): Rx.Observable<boolean> {
    return this.ready$.asObservable();
  }
}
