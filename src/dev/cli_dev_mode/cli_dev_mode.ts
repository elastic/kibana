/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/dev-utils';
import * as Rx from 'rxjs';
import { mapTo, filter, take, tap, first, switchMap } from 'rxjs/operators';

import { CliArgs } from '../../core/server/config';
import { LegacyConfig } from '../../core/server/legacy';
import { BasePathProxyServer } from '../../core/server/http';

import { Log, CliLog } from './log';
import { observeKbnOptimizer } from './observe_kbn_optimizer';
import { observeDevServer } from './observe_dev_server';
import { observeFileChanges } from './observe_file_changes';
import { shouldRedirectFromOldBasePath } from './should_redirect_from_old_base_path';
import { getServerWatchPaths } from './get_server_watch_paths';

// timeout where the server is allowed to exit gracefully
const GRACEFUL_TIMEOUT = 5000;

export type SomeCliArgs = Pick<
  CliArgs,
  'quiet' | 'silent' | 'disableOptimizer' | 'watch' | 'oss' | 'runExamples' | 'cache' | 'dist'
>;

export interface CliDevModeOptions {
  quiet?: boolean;
  silent?: boolean;
  watch?: boolean;
  disableOptimizer?: boolean;
  oss?: boolean;
  runExamples?: boolean;
  cache?: boolean;
  dist?: boolean;
  basePathProxy?: BasePathProxyServer;
  pluginPaths?: string[];
  pluginScanDirs?: string[];
  log?: Log;
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

  private readonly kbnOptimizerReady$ = new Rx.BehaviorSubject(false);
  private readonly watcherReady$ = new Rx.BehaviorSubject(false);
  private readonly serverShouldRestart$ = new Rx.Subject<void>();
  private readonly serverReady$ = new Rx.BehaviorSubject<boolean>(false);

  private subscription?: Rx.Subscription;

  constructor(private readonly options: CliDevModeOptions) {
    this.log = options.log || new CliLog(!!options.quiet, !!options.silent);
  }

  public start() {
    if (!this.options.basePathProxy) {
      this.log.warn(
        '===================================================================================================='
      );
      this.log.warn(
        'no-base-path',
        'Running Kibana in dev mode with --no-base-path disables several useful features and is not recommended'
      );
      this.log.warn(
        '===================================================================================================='
      );
    }

    if (this.subscription) {
      throw new Error('CliDevMode already started');
    }

    this.subscription = new Rx.Subscription();
    this.subscription.add(this.startOptimizer());
    this.subscription.add(this.startWatcher());
    this.subscription.add(this.startDevServer());

    this.options.basePathProxy?.start({
      delayUntil: () => firstAllTrue(this.serverReady$, this.kbnOptimizerReady$),
      shouldRedirectFromOldBasePath,
    });
  }

  public stop() {
    this.subscription?.unsubscribe();
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

  /**
   * run @kbn/optimizer and write it's state to kbnOptimizerReady$
   */
  private startOptimizer() {
    if (this.options.disableOptimizer) {
      this.kbnOptimizerReady$.next(true);
    } else {
      return observeKbnOptimizer({
        quiet: this.options.quiet,
        silent: this.options.silent,
        cache: this.options.cache,
        dist: this.options.dist,
        oss: this.options.oss,
        pluginPaths: this.options.pluginPaths,
        runExamples: this.options.runExamples,
        watch: this.options.watch,
      })
        .pipe(tap(this.kbnOptimizerReady$))
        .subscribe(this.observer('@kbn/optimizer'));
    }
  }

  /**
   * run a watcher for server files that signals to the server it should restart
   */
  private startWatcher() {
    if (!this.options.watch) {
      this.serverShouldRestart$.complete();
      this.watcherReady$.next(true);
      return;
    }

    const { watchPaths, ignorePaths } = getServerWatchPaths({
      pluginPaths: this.options.pluginPaths ?? [],
      pluginScanDirs: [
        ...(this.options.pluginScanDirs ?? []),
        Path.resolve(REPO_ROOT, 'src/plugins'),
        Path.resolve(REPO_ROOT, 'x-pack/plugins'),
      ],
    });

    return observeFileChanges({
      paths: watchPaths,
      ignore: ignorePaths,
      cwd: REPO_ROOT,
    })
      .pipe(
        tap((state) => {
          if (state.type === 'ready') {
            this.log.good('watching for changes', `(${state.fileCount} files)`);
            this.watcherReady$.next(true);
          }

          if (state.type === 'change') {
            const prefix = state.paths.length > 1 ? '\n - ' : '';
            const fileList = state.paths.reduce(
              (list, file) => `${list || ''}${prefix}"${file}"`,
              ''
            );

            this.log.warn(`restarting server`, `due to changes in ${fileList}`);
            this.serverShouldRestart$.next();
          }
        })
      )
      .subscribe(this.observer('server file watcher'));
  }

  private startDevServer() {
    /**
     * run the server in dev mode in a child process and write it's state to kbnOptimizerReady$
     */
    const serverArgv = [
      ...process.argv.slice(2).filter((v) => v !== '--no-watch'),
      ...(this.options.basePathProxy
        ? [
            `--server.port=${this.options.basePathProxy.targetPort}`,
            `--server.basePath=${this.options.basePathProxy.basePath}`,
            '--server.rewriteBasePath=true',
          ]
        : []),
    ];

    return this.watcherReady$
      .pipe(
        first((ready) => !!ready),
        switchMap(() =>
          observeDevServer({
            script: Path.resolve(REPO_ROOT, 'src/cli/dev'),
            argv: serverArgv,
            gracefulTimeout: GRACEFUL_TIMEOUT,
            restart$: this.serverShouldRestart$,
          })
        ),
        tap((state) => {
          if (state.type === 'log') {
            process.stdout.write(`${state.line}\n`);
          }

          if (state.type === 'msg') {
            if (state.msg === 'SERVER_LISTENING') {
              this.serverReady$.next(true);
            }

            if (state.msg === 'RELOAD_LOGGING_CONFIG_FROM_SERVER_WORKER') {
              // When receive that event from server worker
              // forward a reloadLoggingConfig message to parent
              // and child proc. This is only used by LogRotator service
              // when the cluster mode is enabled
              process.emit('message' as any, { reloadLoggingConfig: true } as any);
              state.proc.send({ reloadLoggingConfig: true });
            }
          }

          if (state.type === 'exitted') {
            this.serverReady$.next(false);

            if (state.signal === 'SIGKILL' && state.timedOutAfter) {
              this.log.warn(
                `server didnt exit`,
                `sent [${state.timedOutAfter}] to the server and it didn't exit within ${GRACEFUL_TIMEOUT}ms, sending SIGKILL`
              );
            }

            if (state.code !== 0) {
              this.log.bad(`server crashed`, 'with status code', state.code);
            }

            if (!this.options.watch) {
              process.exit(state.code);
            }
          }
        })
      )
      .subscribe(this.observer('dev server'));
  }
}
