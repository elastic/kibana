/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { EventEmitter } from 'events';

import * as Rx from 'rxjs';
import {
  map,
  mapTo,
  filter,
  take,
  tap,
  distinctUntilChanged,
  switchMap,
  concatMap,
  takeUntil,
} from 'rxjs';
import type { CliArgs } from '@kbn/config';
import { CiStatsReporter } from '@kbn/ci-stats-reporter';
import { REPO_ROOT } from '@kbn/repo-info';

import type { Log } from './log';
import { CliLog } from './log';
// Lazy-loaded in start() to defer heavy import chains:
// - Optimizer pulls in @kbn/optimizer → webpack and all loaders
// - ViteServer pulls in @kbn/vite-optimizer → vite, rolldown, etc.
// By deferring these imports, the child process spawns sooner.
import type { Optimizer } from './optimizer';
import type { ViteServer } from './vite_server';
import { DevServer } from './dev_server';
import { Watcher } from './watcher';
import { getBasePathProxyServer, type BasePathProxyServer } from './base_path_proxy';
import { shouldRedirectFromOldBasePath } from './should_redirect_from_old_base_path';
import type { CliDevConfig } from './config';

// signal that emits undefined once a termination signal has been sent
const exitSignal$ = new Rx.ReplaySubject<undefined>(1);
Rx.merge(
  Rx.fromEvent(process as EventEmitter, 'exit'),
  Rx.fromEvent(process as EventEmitter, 'SIGINT'),
  Rx.fromEvent(process as EventEmitter, 'SIGTERM')
)
  .pipe(mapTo(undefined), take(1))
  .subscribe(exitSignal$);

// timeout where the server is allowed to exit gracefully
const GRACEFUL_TIMEOUT = 30000;

export type SomeCliArgs = Pick<
  CliArgs,
  | 'silent'
  | 'verbose'
  | 'disableOptimizer'
  | 'watch'
  | 'oss'
  | 'runExamples'
  | 'cache'
  | 'dist'
  | 'basePath'
> & {
  /**
   * Use Vite for both browser and server-side (default: true)
   */
  useVite?: boolean;
  /**
   * Use Vite dev server for browser bundles (default: true)
   */
  useViteBrowser?: boolean;
  /**
   * Use Vite for server-side plugin loading with HMR (default: true)
   */
  useViteServer?: boolean;
};

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

const getValue$ = <T>(source: Rx.BehaviorSubject<T>): Rx.Observable<T> =>
  source.isStopped ? Rx.of(source.getValue()) : source;

const firstAllTrue = (...sources: Array<Rx.BehaviorSubject<boolean>>) =>
  Rx.combineLatest(sources.map(getValue$)).pipe(
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
  // Lazy-loaded in start() — not set in constructor
  private optimizer?: Optimizer;
  private viteServer?: ViteServer;
  private readonly useViteBrowser: boolean;
  private startTime?: number;
  private subscription?: Rx.Subscription;

  // Options stored from constructor for lazy creation in start()
  private readonly _bundlerOpts: Record<string, any>;

  constructor({ cliArgs, config, log }: { cliArgs: SomeCliArgs; config: CliDevConfig; log?: Log }) {
    this.log = log || new CliLog(!!cliArgs.silent);
    this.useViteBrowser = !!cliArgs.useViteBrowser;

    if (cliArgs.basePath) {
      this.basePathProxy = getBasePathProxyServer({
        log: this.log,
        devConfig: config.dev,
        httpConfig: config.http,
      });
    }

    this.watcher = new Watcher({
      enabled: !!cliArgs.watch,
      log: this.log,
      repoRoot: REPO_ROOT,
    });

    // Build argv for the dev server, adding Vite config if enabled
    // Filter out vite-related flags as they're handled via env vars
    const viteFlags = ['--no-watch', '--use-vite', '--use-vite-browser', '--use-vite-server', '--no-vite'];
    const devServerArgv = [
      ...process.argv.slice(2).filter((v) => !viteFlags.includes(v)),
      ...(this.basePathProxy
        ? [
            `--server.port=${this.basePathProxy.targetPort}`,
            `--server.basePath=${this.basePathProxy.basePath}`,
            '--server.rewriteBasePath=true',
          ]
        : []),
    ];

    // If Vite browser is disabled (--no-vite), pass that to the child process
    // so it falls back to legacy webpack bundles. Otherwise Vite is the default.
    if (!this.useViteBrowser) {
      devServerArgv.push('--no-vite');
    }

    // Environment variables to pass to child process
    // When Vite browser is enabled, pass the Vite server URL (it uses fixed ports)
    // Plugin IDs will be passed after Vite server starts
    const devServerEnv: Record<string, string> = {};
    if (this.useViteBrowser) {
      // Vite runs on fixed ports: 5173 for HTTP, 5174 for HMR
      devServerEnv.KBN_VITE_BROWSER_URL = 'http://localhost:5173';
      // Note: KBN_VITE_PLUGIN_IDS will be set dynamically when Vite starts
    }
    if (cliArgs.useViteServer) {
      // Enable server-side Vite module loading in the child process
      devServerEnv.KBN_VITE_SERVER = 'true';
    }

    this.devServer = new DevServer({
      log: this.log,
      watcher: this.watcher,
      gracefulTimeout: GRACEFUL_TIMEOUT,

      script: Path.resolve(REPO_ROOT, 'scripts/kibana.mts'),
      argv: devServerArgv,
      env: devServerEnv,
      mapLogLine: (line) => {
        if (!this.basePathProxy) {
          return line;
        }

        return line
          .split(`${this.basePathProxy.host}:${this.basePathProxy.targetPort}`)
          .join(`${this.basePathProxy.host}:${this.basePathProxy.port}`);
      },
    });

    // Store options for lazy creation of ViteServer or Optimizer in start().
    // The actual classes are imported dynamically so that @kbn/vite-optimizer
    // (Vite, Rolldown) and @kbn/optimizer (webpack) are NOT loaded at module
    // import time. This lets the child process spawn sooner.
    if (this.useViteBrowser) {
      this._bundlerOpts = {
        enabled: !cliArgs.disableOptimizer,
        repoRoot: REPO_ROOT,
        runExamples: cliArgs.runExamples,
        verbose: !!cliArgs.verbose,
        silent: !!cliArgs.silent,
      };
    } else {
      this._bundlerOpts = {
        enabled: !cliArgs.disableOptimizer,
        repoRoot: REPO_ROOT,
        runExamples: cliArgs.runExamples,
        cache: cliArgs.cache,
        dist: cliArgs.dist,
        quiet: false,
        silent: !!cliArgs.silent,
        verbose: !!cliArgs.verbose,
        watch: cliArgs.watch,
        pluginPaths: config.plugins.additionalPluginPaths,
        pluginScanDirs: config.plugins.pluginSearchPaths,
      };
    }
  }

  /**
   * Get Vite server information for the Kibana server
   */
  getViteConfig():
    | { serverUrl: string; pluginIds: string[]; pluginDependencies: Record<string, string[]> }
    | undefined {
    if (!this.viteServer || !this.viteServer.serverUrl) {
      return undefined;
    }
    return {
      serverUrl: this.viteServer.serverUrl,
      pluginIds: this.viteServer.pluginIds,
      pluginDependencies: this.viteServer.pluginDependencies,
    };
  }

  public async start() {
    const { basePathProxy } = this;

    if (this.subscription) {
      throw new Error('CliDevMode already started');
    }

    this.subscription = new Rx.Subscription();
    this.startTime = Date.now();

    const bundlerName = this.useViteBrowser ? '@kbn/vite' : '@kbn/optimizer';

    // Shared readiness subjects — updated by the lazily-loaded bundler below.
    const serverReady$ = new Rx.BehaviorSubject(false);
    const optimizerReady$ = new Rx.BehaviorSubject(false);

    // Connect devServer readiness
    this.subscription.add(
      this.devServer.isReady$().pipe(tap((v) => serverReady$.next(v))).subscribe()
    );

    if (basePathProxy) {
      const userWaiting$ = new Rx.BehaviorSubject(false);

      this.subscription.add(
        userWaiting$.pipe(
          distinctUntilChanged(),
          switchMap((waiting) =>
            !waiting
              ? Rx.EMPTY
              : Rx.timer(1000).pipe(
                  tap(() => {
                    if (!optimizerReady$.getValue()) {
                      this.log.warn(
                        'please hold',
                        this.useViteBrowser
                          ? 'Vite dev server is starting so requests have been paused'
                          : 'optimizer is still bundling so requests have been paused'
                      );
                      return;
                    }

                    if (!serverReady$.getValue()) {
                      this.log.warn(
                        'please hold',
                        'Kibana server is not ready so requests have been paused'
                      );
                      return;
                    }

                    throw new Error(
                      'user is waiting for over 1 second and neither serverReady$ or optimizerReady$ is false'
                    );
                  })
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
        // When Vite browser is enabled, route asset requests (bundles, @vite
        // internals, node_modules) directly to the Vite dev server. This lets
        // the browser start loading its ~8000 module requests while the Kibana
        // server is still booting, overlapping asset loading with server startup.
        //
        // Additionally, serve a pre-loading shell HTML page for app requests
        // when the server isn't ready yet. This shell imports all modules from
        // Vite in the background, warming the browser cache. When the server
        // becomes ready, the page reloads and serves modules from cache.
        ...(this.useViteBrowser
          ? {
              viteDevServerPort: 5173,
              delayUntilForAssets: () => {
                return firstAllTrue(optimizerReady$);
              },
              isServerReady: () => serverReady$.getValue(),
              getVitePluginIds: () => this.viteServer?.getPluginIds(),
            }
          : {}),
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

    // ── Phase 1: Start watcher + devServer (spawns child process) ──────
    // These subscriptions are set up BEFORE loading the bundler so the
    // child Kibana process starts as early as possible.
    this.subscription.add(
      this.watcher.run$
        .pipe(takeUntil(exitSignal$))
        .subscribe(this.observer('watcher'))
    );

    this.subscription.add(
      this.devServer.run$
        .pipe(
          tap({
            complete: () => {
              // when the devServer gracefully exits because of an exit signal stop the cli dev mode to trigger full shutdown
              this.stop();
            },
          })
        )
        .subscribe(this.observer('dev server'))
    );

    // ── Phase 2: Lazy-load the bundler (child is already starting) ─────
    // Dynamic import defers loading @kbn/vite-optimizer or @kbn/optimizer
    // until the child process spawn has been initiated (Phase 1 above).
    if (this.useViteBrowser) {
      const { ViteServer: ViteServerClass } = await import('./vite_server');
      this.viteServer = new ViteServerClass(this._bundlerOpts);

      // Connect bundler readiness
      this.subscription.add(
        this.viteServer.isReady$().pipe(tap((v) => optimizerReady$.next(v))).subscribe()
      );

      this.subscription.add(
        this.viteServer.run$.pipe(takeUntil(exitSignal$)).subscribe(this.observer(bundlerName))
      );

      // When Vite is ready, send plugin config to Kibana server via IPC
      this.subscription.add(
        Rx.combineLatest([this.viteServer.isReady$(), this.devServer.isReady$()])
          .pipe(
            filter(([viteReady, devReady]) => viteReady && devReady),
            take(1),
            takeUntil(exitSignal$)
          )
          .subscribe(() => {
            const viteConfig = this.getViteConfig();
            if (viteConfig) {
              this.log.good(
                'vite',
                `Sending plugin config to Kibana server (${viteConfig.pluginIds.length} plugins)`
              );
              this.devServer.sendMessage('VITE_PLUGINS', viteConfig);
            }
          })
      );
    } else {
      const { Optimizer: OptimizerClass } = await import('./optimizer');
      this.optimizer = new OptimizerClass(this._bundlerOpts as any);

      // Connect bundler readiness
      this.subscription.add(
        this.optimizer.isReady$().pipe(
          tap((v) => optimizerReady$.next(v))
        ).subscribe()
      );

      this.subscription.add(
        this.optimizer.run$.pipe(takeUntil(exitSignal$)).subscribe(this.observer(bundlerName))
      );
    }

    // ── Phase 3: CI stats (after bundler is loaded) ────────────────────
    const reporter = CiStatsReporter.fromEnv(this.log.toolingLog);
    if (reporter.isEnabled()) {
      this.subscription.add(this.reportTimings(reporter));
    }
  }

  private reportTimings(reporter: CiStatsReporter) {
    const sub = new Rx.Subscription();

    sub.add(
      this.getStarted$()
        .pipe(
          concatMap(async (success) => {
            await reporter.timings({
              timings: [
                {
                  group: 'scripts/kibana',
                  id: 'dev server started',
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

    sub.add(
      this.devServer
        .getRestartTime$()
        .pipe(
          concatMap(async ({ ms }, i) => {
            await reporter.timings({
              timings: [
                {
                  group: 'scripts/kibana',
                  id: 'dev server restart',
                  ms,
                  meta: {
                    sequence: i + 1,
                  },
                },
              ],
            });
          })
        )
        .subscribe({
          error: (error) => {
            this.log.bad(
              `[ci-stats/timings] unable to record dev server restart time:`,
              error.stack
            );
          },
        })
    );

    return sub;
  }

  /**
   * returns an observable that emits once the dev server and optimizer are started, emits
   * true if they both started successfully, otherwise false
   */
  private getStarted$() {
    // Get the bundler phase observable (either optimizer or vite)
    const bundlerPhase$ =
      this.useViteBrowser && this.viteServer
        ? this.viteServer.getPhase$().pipe(
            map((phase) => {
              if (phase === 'error') {
                return false;
              }
              if (phase === 'ready') {
                return true;
              }
              return undefined;
            })
          )
        : this.optimizer
        ? this.optimizer.getPhase$().pipe(
            map((phase) => {
              if (phase === 'issue') {
                return false;
              }
              if (phase === 'success') {
                return true;
              }
              return undefined;
            })
          )
        : Rx.of(true);

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
          return undefined;
        })
      ),
      bundlerPhase$,
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
