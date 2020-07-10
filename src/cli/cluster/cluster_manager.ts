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

import { resolve } from 'path';
import { format as formatUrl } from 'url';

import opn from 'opn';
import { REPO_ROOT } from '@kbn/dev-utils';
import { FSWatcher } from 'chokidar';
import * as Rx from 'rxjs';
import { startWith, mapTo, filter, map, take, tap } from 'rxjs/operators';

import { runKbnOptimizer } from './run_kbn_optimizer';
import { LegacyConfig } from '../../core/server/legacy';
import { BasePathProxyServer } from '../../core/server/http';

import { Log } from './log';
import { Worker } from './worker';

process.env.kbnWorkerType = 'managr';

const firstAllTrue = (...sources: Array<Rx.Observable<boolean>>) =>
  Rx.combineLatest(...sources).pipe(
    filter((values) => values.every((v) => v === true)),
    take(1),
    mapTo(undefined)
  );

export class ClusterManager {
  public optimizer: Worker;
  public server: Worker;
  public workers: Worker[];

  private watcher: FSWatcher | null = null;
  private basePathProxy: BasePathProxyServer | undefined;
  private log: Log;
  private addedCount = 0;
  private inReplMode: boolean;

  // exposed for testing
  public readonly serverReady$ = new Rx.ReplaySubject<boolean>(1);
  // exposed for testing
  public readonly optimizerReady$ = new Rx.ReplaySubject<boolean>(1);
  // exposed for testing
  public readonly kbnOptimizerReady$ = new Rx.ReplaySubject<boolean>(1);

  constructor(
    opts: Record<string, any>,
    config: LegacyConfig,
    basePathProxy?: BasePathProxyServer
  ) {
    this.log = new Log(opts.quiet, opts.silent);
    this.inReplMode = !!opts.repl;
    this.basePathProxy = basePathProxy;

    if (config.get('optimize.enabled') !== false) {
      // run @kbn/optimizer and write it's state to kbnOptimizerReady$
      runKbnOptimizer(opts, config)
        .pipe(
          map(({ state }) => state.phase === 'success' || state.phase === 'issue'),
          tap({
            error: (error) => {
              this.log.bad('New platform optimizer error', error.stack);
              process.exit(1);
            },
          })
        )
        .subscribe(this.kbnOptimizerReady$);
    } else {
      this.kbnOptimizerReady$.next(true);
    }

    const serverArgv = [];
    const optimizerArgv = ['--plugins.initialize=false', '--server.autoListen=false'];

    if (this.basePathProxy) {
      optimizerArgv.push(
        `--server.basePath=${this.basePathProxy.basePath}`,
        '--server.rewriteBasePath=true'
      );

      serverArgv.push(
        `--server.port=${this.basePathProxy.targetPort}`,
        `--server.basePath=${this.basePathProxy.basePath}`,
        '--server.rewriteBasePath=true'
      );
    }

    this.workers = [
      (this.optimizer = new Worker({
        type: 'optmzr',
        title: 'optimizer',
        log: this.log,
        argv: optimizerArgv,
        watch: false,
      })),
      (this.server = new Worker({
        type: 'server',
        log: this.log,
        argv: serverArgv,
      })),
    ];

    // write server status to the serverReady$ subject
    Rx.merge(
      Rx.fromEvent(this.server, 'starting').pipe(mapTo(false)),
      Rx.fromEvent(this.server, 'listening').pipe(mapTo(true)),
      Rx.fromEvent(this.server, 'crashed').pipe(mapTo(true))
    )
      .pipe(startWith(this.server.listening || this.server.crashed))
      .subscribe(this.serverReady$);

    // write optimizer status to the optimizerReady$ subject
    Rx.merge(
      Rx.fromEvent(this.optimizer, 'optimizeStatus'),
      Rx.defer(() => {
        if (this.optimizer.fork) {
          this.optimizer.fork.send({ optimizeReady: '?' });
        }
      })
    )
      .pipe(map((msg: any) => msg && !!msg.success))
      .subscribe(this.optimizerReady$);

    // broker messages between workers
    this.workers.forEach((worker) => {
      worker.on('broadcast', (msg) => {
        this.workers.forEach((to) => {
          if (to !== worker && to.online) {
            to.fork!.send(msg);
          }
        });
      });
    });

    // When receive that event from server worker
    // forward a reloadLoggingConfig message to master
    // and all workers. This is only used by LogRotator service
    // when the cluster mode is enabled
    this.server.on('reloadLoggingConfigFromServerWorker', () => {
      process.emit('message' as any, { reloadLoggingConfig: true } as any);

      this.workers.forEach((worker) => {
        worker.fork!.send({ reloadLoggingConfig: true });
      });
    });

    if (opts.open) {
      this.setupOpen(
        formatUrl({
          protocol: config.get('server.ssl.enabled') ? 'https' : 'http',
          hostname: config.get('server.host'),
          port: config.get('server.port'),
          pathname: this.basePathProxy ? this.basePathProxy.basePath : '',
        })
      );
    }

    if (opts.watch) {
      const pluginPaths = config.get<string[]>('plugins.paths');
      const scanDirs = [
        ...config.get<string[]>('plugins.scanDirs'),
        resolve(REPO_ROOT, 'src/plugins'),
        resolve(REPO_ROOT, 'x-pack/plugins'),
      ];
      const extraPaths = [...pluginPaths, ...scanDirs];

      const pluginInternalDirsIgnore = scanDirs
        .map((scanDir) => resolve(scanDir, '*'))
        .concat(pluginPaths)
        .reduce(
          (acc, path) =>
            acc.concat(
              resolve(path, 'test/**'),
              resolve(path, 'build/**'),
              resolve(path, 'target/**'),
              resolve(path, 'scripts/**'),
              resolve(path, 'docs/**')
            ),
          [] as string[]
        );

      this.setupWatching(extraPaths, pluginInternalDirsIgnore);
    } else this.startCluster();
  }

  startCluster() {
    this.setupManualRestart();
    for (const worker of this.workers) {
      worker.start();
    }
    if (this.basePathProxy) {
      this.basePathProxy.start({
        delayUntil: () => firstAllTrue(this.serverReady$, this.kbnOptimizerReady$),

        shouldRedirectFromOldBasePath: (path: string) => {
          // strip `s/{id}` prefix when checking for need to redirect
          if (path.startsWith('s/')) {
            path = path.split('/').slice(2).join('/');
          }

          const isApp = path.startsWith('app/');
          const isKnownShortPath = ['login', 'logout', 'status'].includes(path);
          return isApp || isKnownShortPath;
        },
      });
    }
  }

  setupOpen(openUrl: string) {
    firstAllTrue(this.serverReady$, this.kbnOptimizerReady$, this.optimizerReady$)
      .toPromise()
      .then(() => {
        opn(openUrl);
      });
  }

  setupWatching(extraPaths: string[], pluginInternalDirsIgnore: string[]) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const chokidar = require('chokidar');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { fromRoot } = require('../../core/server/utils');

    const watchPaths = Array.from(
      new Set(
        [
          fromRoot('src/core'),
          fromRoot('src/legacy/core_plugins'),
          fromRoot('src/legacy/server'),
          fromRoot('src/legacy/ui'),
          fromRoot('src/legacy/utils'),
          fromRoot('x-pack/legacy/common'),
          fromRoot('x-pack/legacy/plugins'),
          fromRoot('x-pack/legacy/server'),
          fromRoot('config'),
          ...extraPaths,
        ].map((path) => resolve(path))
      )
    );

    const ignorePaths = [
      /[\\\/](\..*|node_modules|bower_components|target|public|__[a-z0-9_]+__|coverage)([\\\/]|$)/,
      /\.test\.(js|tsx?)$/,
      /\.md$/,
      /debug\.log$/,
      ...pluginInternalDirsIgnore,
      fromRoot('src/legacy/server/sass/__tmp__'),
      fromRoot('x-pack/plugins/reporting/chromium'),
      fromRoot('x-pack/plugins/security_solution/cypress'),
      fromRoot('x-pack/plugins/apm/e2e'),
      fromRoot('x-pack/plugins/apm/scripts'),
      fromRoot('x-pack/plugins/canvas/canvas_plugin_src'), // prevents server from restarting twice for Canvas plugin changes,
      fromRoot('x-pack/plugins/case/server/scripts'),
      fromRoot('x-pack/plugins/lists/scripts'),
      fromRoot('x-pack/plugins/lists/server/scripts'),
      fromRoot('x-pack/plugins/security_solution/scripts'),
      fromRoot('x-pack/plugins/security_solution/server/lib/detection_engine/scripts'),
      'plugins/java_languageserver',
    ];

    this.watcher = chokidar.watch(watchPaths, {
      cwd: fromRoot('.'),
      ignored: ignorePaths,
    }) as FSWatcher;

    this.watcher.on('add', this.onWatcherAdd);
    this.watcher.on('error', this.onWatcherError);
    this.watcher.once('ready', () => {
      // start sending changes to workers
      this.watcher!.removeListener('add', this.onWatcherAdd);
      this.watcher!.on('all', this.onWatcherChange);

      this.log.good('watching for changes', `(${this.addedCount} files)`);
      this.startCluster();
    });
  }

  setupManualRestart() {
    // If we're in REPL mode, the user can use the REPL to manually restart.
    // The setupManualRestart method interferes with stdin/stdout, in a way
    // that negatively affects the REPL.
    if (this.inReplMode) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const readline = require('readline');
    const rl = readline.createInterface(process.stdin, process.stdout);

    let nls = 0;
    const clear = () => (nls = 0);

    let clearTimer: number | undefined;
    const clearSoon = () => {
      clearSoon.cancel();
      clearTimer = setTimeout(() => {
        clearTimer = undefined;
        clear();
      });
    };

    clearSoon.cancel = () => {
      clearTimeout(clearTimer);
      clearTimer = undefined;
    };

    rl.setPrompt('');
    rl.prompt();

    rl.on('line', () => {
      nls = nls + 1;

      if (nls >= 2) {
        clearSoon.cancel();
        clear();
        this.server.start();
      } else {
        clearSoon();
      }

      rl.prompt();
    });

    rl.on('SIGINT', () => {
      rl.pause();
      process.kill(process.pid, 'SIGINT');
    });
  }

  onWatcherAdd = () => {
    this.addedCount += 1;
  };

  onWatcherChange = (e: any, path: string) => {
    for (const worker of this.workers) {
      worker.onChange(path);
    }
  };

  onWatcherError = (err: any) => {
    this.log.bad('failed to watch files!\n', err.stack);
    process.exit(1); // eslint-disable-line no-process-exit
  };
}
