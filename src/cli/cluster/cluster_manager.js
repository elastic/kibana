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

import { debounce, invoke, bindAll, once, uniq } from 'lodash';
import * as Rx from 'rxjs';
import { first, mapTo, filter, map, take } from 'rxjs/operators';
import { REPO_ROOT } from '@kbn/dev-utils';

import Log from '../log';
import Worker from './worker';
import { Config } from '../../legacy/server/config/config';
import { transformDeprecations } from '../../legacy/server/config/transform_deprecations';

process.env.kbnWorkerType = 'managr';

export default class ClusterManager {
  static create(opts, settings = {}, basePathProxy) {
    return new ClusterManager(
      opts,
      Config.withDefaultSchema(transformDeprecations(settings)),
      basePathProxy
    );
  }

  constructor(opts, config, basePathProxy) {
    this.log = new Log(opts.quiet, opts.silent);
    this.addedCount = 0;
    this.inReplMode = !!opts.repl;
    this.basePathProxy = basePathProxy;

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

    // broker messages between workers
    this.workers.forEach(worker => {
      worker.on('broadcast', msg => {
        this.workers.forEach(to => {
          if (to !== worker && to.online) {
            to.fork.send(msg);
          }
        });
      });
    });

    // When receive that event from server worker
    // forward a reloadLoggingConfig message to master
    // and all workers. This is only used by LogRotator service
    // when the cluster mode is enabled
    this.server.on('reloadLoggingConfigFromServerWorker', () => {
      process.emit('message', { reloadLoggingConfig: true });

      this.workers.forEach(worker => {
        worker.fork.send({ reloadLoggingConfig: true });
      });
    });

    bindAll(this, 'onWatcherAdd', 'onWatcherError', 'onWatcherChange');

    if (opts.open) {
      this.setupOpen(formatUrl({
        protocol: config.get('server.ssl.enabled') ? 'https' : 'http',
        hostname: config.get('server.host'),
        port: config.get('server.port'),
        pathname: (this.basePathProxy ? this.basePathProxy.basePath : ''),
      }));
    }

    if (opts.watch) {
      const pluginPaths = config.get('plugins.paths');
      const scanDirs = [
        ...config.get('plugins.scanDirs'),
        resolve(REPO_ROOT, 'src/plugins'),
        resolve(REPO_ROOT, 'x-pack/plugins'),
      ];
      const extraPaths = [
        ...pluginPaths,
        ...scanDirs,
      ];

      const pluginInternalDirsIgnore = scanDirs
        .map(scanDir => resolve(scanDir, '*'))
        .concat(pluginPaths)
        .reduce(
          (acc, path) =>
            acc.concat(
              resolve(path, 'test'),
              resolve(path, 'build'),
              resolve(path, 'target'),
              resolve(path, 'scripts'),
              resolve(path, 'docs'),
            ),
          []
        );

      this.setupWatching(extraPaths, pluginInternalDirsIgnore);
    } else this.startCluster();
  }

  startCluster() {
    this.setupManualRestart();
    invoke(this.workers, 'start');
    if (this.basePathProxy) {
      this.basePathProxy.start({
        blockUntil: this.blockUntil.bind(this),
        shouldRedirectFromOldBasePath: this.shouldRedirectFromOldBasePath.bind(this),
      });
    }
  }

  setupOpen(openUrl) {
    const serverListening$ = Rx.merge(
      Rx.fromEvent(this.server, 'listening')
        .pipe(mapTo(true)),
      Rx.fromEvent(this.server, 'fork:exit')
        .pipe(mapTo(false)),
      Rx.fromEvent(this.server, 'crashed')
        .pipe(mapTo(false))
    );

    const optimizeSuccess$ = Rx.fromEvent(this.optimizer, 'optimizeStatus')
      .pipe(map(msg => !!msg.success));

    Rx.combineLatest(serverListening$, optimizeSuccess$)
      .pipe(
        filter(([serverListening, optimizeSuccess]) => serverListening && optimizeSuccess),
        take(1),
      )
      .toPromise()
      .then(() => opn(openUrl));
  }

  setupWatching(extraPaths, pluginInternalDirsIgnore) {
    const chokidar = require('chokidar');
    const { fromRoot } = require('../../core/server/utils');

    const watchPaths = [
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
    ].map(path => resolve(path));

    const ignorePaths = [
      fromRoot('src/legacy/server/sass/__tmp__'),
      fromRoot('x-pack/legacy/plugins/reporting/.chromium'),
      fromRoot('x-pack/legacy/plugins/siem/cypress'),
      fromRoot('x-pack/legacy/plugins/apm/cypress'),
      fromRoot('x-pack/legacy/plugins/canvas/canvas_plugin_src') // prevents server from restarting twice for Canvas plugin changes
    ];

    this.watcher = chokidar.watch(uniq(watchPaths), {
      cwd: fromRoot('.'),
      ignored: [
        /[\\\/](\..*|node_modules|bower_components|public|__[a-z0-9_]+__|coverage)[\\\/]/,
        /\.test\.(js|ts)$/,
        ...pluginInternalDirsIgnore,
        ...ignorePaths,
        'plugins/java_languageserver'
      ],
    });

    this.watcher.on('add', this.onWatcherAdd);
    this.watcher.on('error', this.onWatcherError);

    this.watcher.on(
      'ready',
      once(() => {
        // start sending changes to workers
        this.watcher.removeListener('add', this.onWatcherAdd);
        this.watcher.on('all', this.onWatcherChange);

        this.log.good('watching for changes', `(${this.addedCount} files)`);
        this.startCluster();
      })
    );
  }

  setupManualRestart() {
    // If we're in REPL mode, the user can use the REPL to manually restart.
    // The setupManualRestart method interferes with stdin/stdout, in a way
    // that negatively affects the REPL.
    if (this.inReplMode) {
      return;
    }
    const readline = require('readline');
    const rl = readline.createInterface(process.stdin, process.stdout);

    let nls = 0;
    const clear = () => (nls = 0);
    const clearSoon = debounce(clear, 2000);

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

  onWatcherAdd() {
    this.addedCount += 1;
  }

  onWatcherChange(e, path) {
    invoke(this.workers, 'onChange', path);
  }

  onWatcherError(err) {
    this.log.bad('failed to watch files!\n', err.stack);
    process.exit(1); // eslint-disable-line no-process-exit
  }

  shouldRedirectFromOldBasePath(path) {
    // strip `s/{id}` prefix when checking for need to redirect
    if (path.startsWith('s/')) {
      path = path.split('/').slice(2).join('/');
    }

    const isApp = path.startsWith('app/');
    const isKnownShortPath = ['login', 'logout', 'status'].includes(path);
    return isApp || isKnownShortPath;
  }

  blockUntil() {
    // Wait until `server` worker either crashes or starts to listen.
    if (this.server.listening || this.server.crashed) {
      return Promise.resolve();
    }

    return Rx.race(
      Rx.fromEvent(this.server, 'listening'),
      Rx.fromEvent(this.server, 'crashed')
    )
      .pipe(first())
      .toPromise();
  }
}
