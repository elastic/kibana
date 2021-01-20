/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/dev-utils';
import * as Rx from 'rxjs';
import { mapTo, filter, take, tap, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { CliArgs } from '../../core/server/config';
import { LegacyConfig } from '../../core/server/legacy';
import { BasePathProxyServer } from '../../core/server/http';

import { Log, CliLog } from './log';
import { Optimizer } from './optimizer';
import { DevServer } from './dev_server';
import { Watcher } from './watcher';
import { shouldRedirectFromOldBasePath } from './should_redirect_from_old_base_path';
import { getServerWatchPaths } from './get_server_watch_paths';

// timeout where the server is allowed to exit gracefully
const GRACEFUL_TIMEOUT = 5000;

export type SomeCliArgs = Pick<
  CliArgs,
  'quiet' | 'silent' | 'disableOptimizer' | 'watch' | 'oss' | 'runExamples' | 'cache' | 'dist'
>;

export interface CliDevModeOptions {
  basePathProxy?: BasePathProxyServer;
  log?: Log;

  // cli flags
  dist: boolean;
  oss: boolean;
  runExamples: boolean;
  pluginPaths: string[];
  pluginScanDirs: string[];
  disableOptimizer: boolean;
  quiet: boolean;
  silent: boolean;
  watch: boolean;
  cache: boolean;
}

const firstAllTrue = (...sources: Array<Rx.Observable<boolean>>) =>
  Rx.combineLatest(sources).pipe(
    filter((values) => values.every((v) => v === true)),
    take(1),
    mapTo(undefined)
  );

/**
 * setup and manage the parent process of the dev server:
 *
 * - runs the Kibana server in a child process
 * - watches for changes to the server source code, restart the server on changes.
 * - run the kbn/optimizer
 * - run the basePathProxy
 * - delay requests received by the basePathProxy when either the server isn't ready
 *   or the kbn/optimizer isn't ready
 *
 */
export class CliDevMode {
  static fromCoreServices(
    cliArgs: SomeCliArgs,
    config: LegacyConfig,
    basePathProxy?: BasePathProxyServer
  ) {
    new CliDevMode({
      quiet: !!cliArgs.quiet,
      silent: !!cliArgs.silent,
      cache: !!cliArgs.cache,
      disableOptimizer: !!cliArgs.disableOptimizer,
      dist: !!cliArgs.dist,
      oss: !!cliArgs.oss,
      runExamples: !!cliArgs.runExamples,
      pluginPaths: config.get<string[]>('plugins.paths'),
      pluginScanDirs: config.get<string[]>('plugins.scanDirs'),
      watch: !!cliArgs.watch,
      basePathProxy,
    }).start();
  }
  private readonly log: Log;
  private readonly basePathProxy?: BasePathProxyServer;
  private readonly watcher: Watcher;
  private readonly devServer: DevServer;
  private readonly optimizer: Optimizer;

  private subscription?: Rx.Subscription;

  constructor(options: CliDevModeOptions) {
    this.basePathProxy = options.basePathProxy;
    this.log = options.log || new CliLog(!!options.quiet, !!options.silent);

    const { watchPaths, ignorePaths } = getServerWatchPaths({
      pluginPaths: options.pluginPaths ?? [],
      pluginScanDirs: [
        ...(options.pluginScanDirs ?? []),
        Path.resolve(REPO_ROOT, 'src/plugins'),
        Path.resolve(REPO_ROOT, 'x-pack/plugins'),
      ],
    });

    this.watcher = new Watcher({
      enabled: !!options.watch,
      log: this.log,
      cwd: REPO_ROOT,
      paths: watchPaths,
      ignore: ignorePaths,
    });

    this.devServer = new DevServer({
      log: this.log,
      watcher: this.watcher,
      gracefulTimeout: GRACEFUL_TIMEOUT,

      script: Path.resolve(REPO_ROOT, 'scripts/kibana'),
      argv: [
        ...process.argv.slice(2).filter((v) => v !== '--no-watch'),
        ...(options.basePathProxy
          ? [
              `--server.port=${options.basePathProxy.targetPort}`,
              `--server.basePath=${options.basePathProxy.basePath}`,
              '--server.rewriteBasePath=true',
            ]
          : []),
      ],
      mapLogLine: (line) => {
        if (!this.basePathProxy) {
          return line;
        }

        return line
          .split(`${this.basePathProxy.host}:${this.basePathProxy.targetPort}`)
          .join(`${this.basePathProxy.host}:${this.basePathProxy.port}`);
      },
    });

    this.optimizer = new Optimizer({
      enabled: !options.disableOptimizer,
      repoRoot: REPO_ROOT,
      oss: options.oss,
      pluginPaths: options.pluginPaths,
      runExamples: options.runExamples,
      cache: options.cache,
      dist: options.dist,
      quiet: options.quiet,
      silent: options.silent,
      watch: options.watch,
    });
  }

  public start() {
    const { basePathProxy } = this;

    if (this.subscription) {
      throw new Error('CliDevMode already started');
    }

    this.subscription = new Rx.Subscription();

    if (basePathProxy) {
      const serverReady$ = new Rx.BehaviorSubject(false);
      const optimizerReady$ = new Rx.BehaviorSubject(false);
      const userWaiting$ = new Rx.BehaviorSubject(false);

      this.subscription.add(
        Rx.merge(
          this.devServer.isReady$().pipe(tap(serverReady$)),
          this.optimizer.isReady$().pipe(tap(optimizerReady$)),
          userWaiting$.pipe(
            distinctUntilChanged(),
            switchMap((waiting) =>
              !waiting
                ? Rx.EMPTY
                : Rx.timer(1000).pipe(
                    tap(() => {
                      this.log.warn(
                        'please hold',
                        !optimizerReady$.getValue()
                          ? 'optimizer is still bundling so requests have been paused'
                          : 'server is not ready so requests have been paused'
                      );
                    })
                  )
            )
          )
        ).subscribe(this.observer('readiness checks'))
      );

      basePathProxy.start({
        delayUntil: () => {
          userWaiting$.next(true);
          return firstAllTrue(serverReady$, optimizerReady$).pipe(
            tap(() => userWaiting$.next(false))
          );
        },
        shouldRedirectFromOldBasePath,
      });

      this.subscription.add(() => basePathProxy.stop());
    } else {
      this.log.warn('no-base-path', '='.repeat(100));
      this.log.warn(
        'no-base-path',
        'Running Kibana in dev mode with --no-base-path disables several useful features and is not recommended'
      );
      this.log.warn('no-base-path', '='.repeat(100));
    }

    this.subscription.add(this.optimizer.run$.subscribe(this.observer('@kbn/optimizer')));
    this.subscription.add(this.watcher.run$.subscribe(this.observer('watcher')));
    this.subscription.add(this.devServer.run$.subscribe(this.observer('dev server')));
  }

  public stop() {
    if (!this.subscription) {
      throw new Error('CliDevMode has not been started');
    }

    this.subscription.unsubscribe();
    this.subscription = undefined;
  }

  private observer = (title: string): Rx.Observer<unknown> => ({
    next: () => {
      // noop
    },
    error: (error) => {
      this.log.bad(`[${title}] fatal error`, error.stack);
      process.exit(1);
    },
    complete: () => {
      // noop
    },
  });
}
