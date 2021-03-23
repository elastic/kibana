/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT, CiStatsReporter } from '@kbn/dev-utils';
import * as Rx from 'rxjs';
import { map, mapTo, filter, take, tap, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { CliArgs } from '@kbn/config';

import { Log, CliLog } from './log';
import { Optimizer } from './optimizer';
import { DevServer } from './dev_server';
import { Watcher } from './watcher';
import { BasePathProxyServer } from './base_path_proxy_server';
import { shouldRedirectFromOldBasePath } from './should_redirect_from_old_base_path';
import { getServerWatchPaths } from './get_server_watch_paths';
import { CliDevConfig } from './config';

// timeout where the server is allowed to exit gracefully
const GRACEFUL_TIMEOUT = 5000;

export type SomeCliArgs = Pick<
  CliArgs,
  | 'quiet'
  | 'silent'
  | 'disableOptimizer'
  | 'watch'
  | 'oss'
  | 'runExamples'
  | 'cache'
  | 'dist'
  | 'basePath'
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
  private readonly log: Log;
  private readonly basePathProxy?: BasePathProxyServer;
  private readonly watcher: Watcher;
  private readonly devServer: DevServer;
  private readonly optimizer: Optimizer;
  private startTime?: number;
  private subscription?: Rx.Subscription;

  constructor({ cliArgs, config, log }: { cliArgs: SomeCliArgs; config: CliDevConfig; log?: Log }) {
    this.log = log || new CliLog(!!cliArgs.quiet, !!cliArgs.silent);

    if (cliArgs.basePath) {
      this.basePathProxy = new BasePathProxyServer(this.log, config.http, config.dev);
    }

    const { watchPaths, ignorePaths } = getServerWatchPaths({
      pluginPaths: config.plugins.additionalPluginPaths,
      pluginScanDirs: config.plugins.pluginSearchPaths,
    });

    this.watcher = new Watcher({
      enabled: !!cliArgs.watch,
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
        ...(this.basePathProxy
          ? [
              `--server.port=${this.basePathProxy.targetPort}`,
              `--server.basePath=${this.basePathProxy.basePath}`,
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
      enabled: !cliArgs.disableOptimizer,
      repoRoot: REPO_ROOT,
      oss: cliArgs.oss,
      pluginPaths: config.plugins.additionalPluginPaths,
      pluginScanDirs: config.plugins.pluginSearchPaths,
      runExamples: cliArgs.runExamples,
      cache: cliArgs.cache,
      dist: cliArgs.dist,
      quiet: !!cliArgs.quiet,
      silent: !!cliArgs.silent,
      watch: cliArgs.watch,
    });
  }

  public start() {
    const { basePathProxy } = this;

    if (this.subscription) {
      throw new Error('CliDevMode already started');
    }

    this.subscription = new Rx.Subscription();
    this.startTime = Date.now();

    this.subscription.add(
      this.getStarted$()
        .pipe(
          switchMap(async (success) => {
            const reporter = CiStatsReporter.fromEnv(this.log.toolingLog);
            await reporter.timings({
              timings: [
                {
                  group: 'yarn start',
                  id: 'started',
                  ms: Date.now() - this.startTime!,
                  meta: { success },
                },
              ],
            });
          })
        )
        .subscribe({
          error: (error) => {
            this.log.bad(`[ci-stats/timings] unable to record startup time:`, error.stack);
          },
        })
    );

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

  /**
   * returns an observable that emits once the dev server and optimizer are started, emits
   * true if they both started successfully, otherwise false
   */
  private getStarted$() {
    return Rx.combineLatest([
      // convert the dev server and optimizer phase to:
      //  - true if they are started successfully
      //  - false if they failed to start
      //  - undefined if they are still coming up
      this.devServer.getPhase$().pipe(
        map((phase) => {
          if (phase === 'listening') {
            return true;
          }
          if (phase === 'fatal exit') {
            return false;
          }
        })
      ),
      this.optimizer.getPhase$().pipe(
        map((phase) => {
          if (phase === 'issue') {
            return false;
          }
          if (phase === 'success') {
            return true;
          }
        })
      ),
    ]).pipe(
      // ignore states where either start state is undefined
      filter((states) => states.every((s) => typeof s === 'boolean')),
      // merge the states to true only if all states are true, otherwise false
      map((states) => states.every((s) => s === true)),
      // we only "started" once
      take(1)
    );
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
