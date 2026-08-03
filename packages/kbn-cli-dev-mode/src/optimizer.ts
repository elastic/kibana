/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Chalk from 'chalk';
import moment from 'moment';
import type { Writable } from 'stream';
import { tap } from 'rxjs';
import {
  ToolingLog,
  pickLevelFromFlags,
  ToolingLogTextWriter,
  parseLogLevel,
} from '@kbn/tooling-log';
import * as Rx from 'rxjs';
import { ignoreElements } from 'rxjs';
import type { OptimizerUpdate } from '@kbn/optimizer';
import {
  runOptimizer,
  OptimizerConfig,
  logOptimizerState,
  logOptimizerProgress,
} from '@kbn/optimizer';

export interface Options {
  enabled: boolean;
  repoRoot: string;
  quiet: boolean;
  silent: boolean;
  verbose: boolean;
  watch: boolean;
  cache: boolean;
  dist: boolean;
  runExamples: boolean;
  writeLogTo?: Writable;
  pluginPaths?: string[];
  pluginScanDirs?: string[];
  basePath?: string;
}

/**
 * Check if RSPack optimizer should be used instead of Webpack optimizer
 */
function isRspackOptimizerEnabled(): boolean {
  const v = process.env.KBN_USE_RSPACK;
  return v === 'true' || v === '1';
}

export type OptimizerPhase = OptimizerUpdate['state']['phase'] | 'running' | 'idle' | 'error';

export class Optimizer {
  public readonly run$: Rx.Observable<void>;
  private readonly ready$ = new Rx.ReplaySubject<boolean>(1);
  private readonly phase$ = new Rx.ReplaySubject<OptimizerPhase>(1);

  constructor(options: Options) {
    if (!options.enabled) {
      this.run$ = Rx.EMPTY;
      this.ready$.next(true);
      this.ready$.complete();
      return;
    }

    // Check if we should use RSPack optimizer
    if (isRspackOptimizerEnabled()) {
      this.run$ = this.createRspackRun$(options);
    } else {
      this.run$ = this.createWebpackRun$(options);
    }
  }

  /**
   * Create run$ observable using the legacy Webpack optimizer
   */
  private createWebpackRun$(options: Options): Rx.Observable<void> {
    const config = OptimizerConfig.create({
      repoRoot: options.repoRoot,
      watch: options.watch,
      includeCoreBundle: true,
      cache: options.cache,
      dist: options.dist,
      examples: options.runExamples,
      pluginPaths: options.pluginPaths,
      pluginScanDirs: options.pluginScanDirs,
    });

    const log = this.createLog(options, '@kbn/optimizer');

    return new Rx.Observable<void>((subscriber) => {
      subscriber.add(
        runOptimizer(config)
          .pipe(
            logOptimizerProgress(log),
            logOptimizerState(log, config),
            tap(({ state }) => {
              this.phase$.next(state.phase);
              this.ready$.next(state.phase === 'success' || state.phase === 'issue');
            }),
            ignoreElements()
          )
          .subscribe(subscriber)
      );

      // complete state subjects when run$ completes
      subscriber.add(() => {
        this.phase$.complete();
        this.ready$.complete();
      });
    });
  }

  /**
   * Create run$ observable using the new RSPack optimizer
   */
  private createRspackRun$(options: Options): Rx.Observable<void> {
    const log = this.createLog(options, '@kbn/rspack-optimizer');

    return new Rx.Observable<void>((subscriber) => {
      let rspackOptimizerInstance: { stop: () => Promise<void> } | undefined;

      // Dynamically import rspack optimizer to avoid loading it when not needed
      import('@kbn/rspack-optimizer')
        .then(async ({ RspackOptimizer }) => {
          if (subscriber.closed) {
            return;
          }

          const rspackOptimizer = new RspackOptimizer({
            repoRoot: options.repoRoot,
            watch: options.watch,
            cache: options.cache,
            dist: options.dist,
            examples: options.runExamples,
            basePath: options.basePath,
            log,
          });

          // Store reference for cleanup
          rspackOptimizerInstance = rspackOptimizer;

          // Subscribe to phase updates
          const phaseSub = rspackOptimizer.getPhase$().subscribe({
            next: (phase) => {
              this.phase$.next(phase);
              this.ready$.next(phase === 'success' || phase === 'issue');
            },
          });

          subscriber.add(phaseSub);

          // Run the optimizer
          try {
            await rspackOptimizer.run();
            if (!options.watch) {
              subscriber.complete();
            }
          } catch (error) {
            subscriber.error(error);
          }
        })
        .catch((error) => {
          log.error(`Failed to load @kbn/rspack-optimizer: ${error.message}`);
          log.warning('Falling back to @kbn/optimizer...');

          // Fallback to webpack optimizer
          this.createWebpackRun$(options).subscribe(subscriber);
        });

      // Cleanup when run$ completes or is unsubscribed (e.g., on SIGINT)
      subscriber.add(() => {
        // Stop the RSPack optimizer if it's running
        // This kills the worker process immediately (SIGKILL)
        if (rspackOptimizerInstance) {
          rspackOptimizerInstance.stop().catch(() => {});
        }
        this.phase$.complete();
        this.ready$.complete();
      });
    });
  }

  /**
   * Create a ToolingLog instance with custom formatting
   */
  private createLog(options: Options, optimizerName: string): ToolingLog {
    const dim = Chalk.dim('np bld');
    const name = Chalk.magentaBright(optimizerName);
    const time = () => moment().format('HH:mm:ss.SSS');
    const level = (msgType: string) => {
      switch (msgType) {
        case 'info':
          return Chalk.green(msgType);
        case 'success':
          return Chalk.cyan(msgType);
        case 'debug':
          return Chalk.gray(msgType);
        case 'warning':
          return Chalk.yellowBright(msgType);
        default:
          return msgType;
      }
    };

    const { flags: levelFlags } = parseLogLevel(
      pickLevelFromFlags({
        verbose: options.verbose,
        quiet: options.quiet,
        silent: options.silent,
      })
    );

    const log = new ToolingLog();
    const has = <T extends object>(obj: T, x: any): x is keyof T => Object.hasOwn(obj, x);

    log.setWriters([
      {
        write(msg) {
          if (has(levelFlags, msg.type) && !levelFlags[msg.type]) {
            return false;
          }

          ToolingLogTextWriter.write(
            options.writeLogTo ?? process.stdout,
            ` ${dim}    log   [${time()}] [${level(msg.type)}][${name}] `,
            msg
          );
          return true;
        },
      },
    ]);

    return log;
  }

  getPhase$() {
    return this.phase$.asObservable();
  }

  isReady$() {
    return this.ready$.asObservable();
  }
}
