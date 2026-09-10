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
import * as Rx from 'rxjs';
import {
  ToolingLog,
  pickLevelFromFlags,
  ToolingLogTextWriter,
  parseLogLevel,
} from '@kbn/tooling-log';
import type { OptimizerPhase, RspackOptimizer } from '@kbn/optimizer';
import type { KibanaGroup } from '@kbn/projects-solutions-groups';

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
  allowlistPluginGroups?: readonly KibanaGroup[];
  basePath?: string;
}

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

    this.run$ = this.createRun$(options);
  }

  private createRun$(options: Options): Rx.Observable<void> {
    const log = this.createLog(options);

    return new Rx.Observable<void>((subscriber) => {
      let optimizer: RspackOptimizer | undefined;

      // `@kbn/optimizer` loads the native `@rspack/core` runtime as soon as it is imported, but this
      // process only orchestrates the forked optimizer worker. Defer that cost until run$ is
      // subscribed so it is never paid when the optimizer is disabled.
      import('@kbn/optimizer')
        .then(async (kbnOptimizer) => {
          if (subscriber.closed) {
            return;
          }

          optimizer = new kbnOptimizer.RspackOptimizer({
            repoRoot: options.repoRoot,
            watch: options.watch,
            cache: options.cache,
            dist: options.dist,
            examples: options.runExamples,
            pluginPaths: options.pluginPaths,
            pluginScanDirs: options.pluginScanDirs,
            allowlistPluginGroups: options.allowlistPluginGroups,
            basePath: options.basePath,
            log,
          });

          subscriber.add(
            optimizer.getPhase$().subscribe((phase) => {
              this.phase$.next(phase);
              this.ready$.next(phase === 'success' || phase === 'issue');
            })
          );

          try {
            await optimizer.run();
            if (!options.watch) {
              subscriber.complete();
            }
          } catch (error) {
            subscriber.error(error);
          }
        })
        .catch((error) => {
          log.error(`Failed to load @kbn/optimizer: ${error.message}`);
          subscriber.error(error);
        });

      // kill the optimizer worker and complete the state subjects when run$ completes or is
      // unsubscribed (e.g. on SIGINT)
      subscriber.add(() => {
        optimizer?.stop().catch(() => {});
        this.phase$.complete();
        this.ready$.complete();
      });
    });
  }

  /**
   * Create a ToolingLog instance with custom formatting
   */
  private createLog(options: Options): ToolingLog {
    const dim = Chalk.dim('np bld');
    const name = Chalk.magentaBright('@kbn/optimizer');
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
