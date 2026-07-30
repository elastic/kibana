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
import { RspackOptimizer, type OptimizerPhase } from '@kbn/optimizer';
import {
  ToolingLog,
  pickLevelFromFlags,
  ToolingLogTextWriter,
  parseLogLevel,
} from '@kbn/tooling-log';

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

export type { OptimizerPhase };

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
      const optimizer = new RspackOptimizer({
        repoRoot: options.repoRoot,
        watch: options.watch,
        cache: options.cache,
        dist: options.dist,
        examples: options.runExamples,
        basePath: options.basePath,
        log,
      });

      subscriber.add(
        optimizer.getPhase$().subscribe({
          next: (phase) => {
            this.phase$.next(phase);
            this.ready$.next(phase === 'success' || phase === 'issue');
          },
        })
      );

      optimizer.run().then(
        () => {
          if (!options.watch) {
            subscriber.complete();
          }
        },
        (error) => subscriber.error(error)
      );

      subscriber.add(() => {
        optimizer.stop().catch(() => {});
        this.phase$.complete();
        this.ready$.complete();
      });
    });
  }

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
    const has = <T extends object>(obj: T, key: PropertyKey): key is keyof T =>
      Object.hasOwn(obj, key);

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

  getPhase$(): Rx.Observable<OptimizerPhase> {
    return this.phase$.asObservable();
  }

  isReady$(): Rx.Observable<boolean> {
    return this.ready$.asObservable();
  }
}
