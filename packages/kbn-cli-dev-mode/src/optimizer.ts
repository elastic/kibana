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
import { Writable } from 'stream';
import { tap } from 'rxjs';
import {
  ToolingLog,
  pickLevelFromFlags,
  ToolingLogTextWriter,
  parseLogLevel,
} from '@kbn/tooling-log';
import * as Rx from 'rxjs';
import { ignoreElements } from 'rxjs';
import {
  runOptimizer,
  OptimizerConfig,
  logOptimizerState,
  logOptimizerProgress,
  OptimizerUpdate,
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
}

export class Optimizer {
  public readonly run$: Rx.Observable<void>;
  private readonly ready$ = new Rx.ReplaySubject<boolean>(1);
  private readonly phase$ = new Rx.ReplaySubject<OptimizerUpdate['state']['phase']>(1);

  constructor(options: Options) {
    if (!options.enabled) {
      this.run$ = Rx.EMPTY;
      this.ready$.next(true);
      this.ready$.complete();
      return;
    }

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

    this.run$ = new Rx.Observable<void>((subscriber) => {
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

  getPhase$() {
    return this.phase$.asObservable();
  }

  isReady$() {
    return this.ready$.asObservable();
  }
}
