/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import { fork, type ChildProcess } from 'child_process';
import type { ToolingLog } from '@kbn/tooling-log';
import { DEFAULT_THEME_TAGS } from '@kbn/core-ui-settings-common';
import type { ThemeTag } from './types';
import { getInspectExecArgv } from './utils/inspect';

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

interface WorkerMessage {
  type: 'ready' | 'log' | 'done';
  level?: 'info' | 'error' | 'warning' | 'success' | 'debug';
  message?: string;
  success?: boolean;
  summary?: string;
  errors?: string[];
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
export class RspackOptimizer {
  private readonly ready$ = new Rx.ReplaySubject<boolean>(1);
  private readonly phase$ = new Rx.ReplaySubject<OptimizerPhase>(1);
  private readonly options: RspackOptimizerOptions;
  private worker?: ChildProcess;
  private isShuttingDown = false;

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

    return new Promise<void>((resolve, reject) => {
      // Spawn worker process
      // Use require.resolve to find the worker file
      const workerPath = require.resolve('./worker');

      // Use @kbn/babel-register to enable TypeScript support in the worker
      // This is exactly how @kbn/optimizer does it (see observe_worker.ts)
      this.worker = fork(workerPath, [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        execArgv: [
          '--require=@kbn/babel-register/install',
          ...getInspectExecArgv(this.options.inspectWorkers ?? true),
        ],
        env: {
          ...process.env,
        },
      });

      // Pipe worker stdout/stderr to our log
      this.worker.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          log.info(line);
        }
      });

      this.worker.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          // Filter out noisy warnings
          if (!line.includes('[BABEL] Note:')) {
            log.error(line);
          }
        }
      });

      // Handle messages from worker
      this.worker.on('message', (message: WorkerMessage) => {
        if (this.isShuttingDown) return;

        switch (message.type) {
          case 'ready':
            // Worker is ready, send start command
            this.phase$.next('running');
            this.worker?.send({
              type: 'start',
              options: {
                repoRoot: this.options.repoRoot,
                outputRoot: this.options.repoRoot,
                watch: this.options.watch,
                cache: this.options.cache,
                dist: this.options.dist,
                examples: this.options.examples,
                themeTags: this.options.themeTags ?? [...DEFAULT_THEME_TAGS],
                hmr: this.options.hmr,
                basePath: this.options.basePath,
              },
            });
            break;

          case 'log':
            // Forward log messages
            if (message.level && message.message) {
              switch (message.level) {
                case 'info':
                  log.info(message.message);
                  break;
                case 'error':
                  log.error(message.message);
                  break;
                case 'warning':
                  log.warning(message.message);
                  break;
                case 'success':
                  log.success(message.message);
                  break;
                case 'debug':
                  log.debug(message.message);
                  break;
              }
            }
            break;

          case 'done':
            if (message.success) {
              this.phase$.next('success');
              this.ready$.next(true);
              const summary = message.summary ? ` — ${message.summary}` : '';
              log.success(`RSPack build completed${summary}`);

              if (this.options.watch) {
                log.info('Watching for changes... (Ctrl+C to stop)');
              }
            } else {
              this.phase$.next('issue');
              this.ready$.next(true);

              if (this.options.watch) {
                log.info('Waiting for changes to fix errors...');
              }
            }

            // In non-watch mode, resolve when done
            if (!this.options.watch) {
              resolve();
            }
            break;
        }
      });

      // Handle worker exit
      this.worker.on('exit', (code) => {
        if (this.isShuttingDown) {
          resolve();
          return;
        }

        if (code !== 0) {
          this.phase$.next('error');
          this.ready$.next(false);
          reject(new Error(`RSPack worker exited with code ${code}`));
        } else {
          resolve();
        }
      });

      // Handle worker errors
      this.worker.on('error', (err) => {
        if (this.isShuttingDown) {
          resolve();
          return;
        }

        this.phase$.next('error');
        this.ready$.next(false);
        log.error(`RSPack worker error: ${err.message}`);
        reject(err);
      });
    });
  }

  /**
   * Stop the optimizer (cleanup)
   * Called by cli-dev-mode when SIGINT is received
   */
  async stop(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    this.isShuttingDown = true;

    // Kill the worker process immediately
    // This is clean because the worker is a separate process
    if (this.worker) {
      this.worker.kill('SIGKILL');
      this.worker = undefined;
    }
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
