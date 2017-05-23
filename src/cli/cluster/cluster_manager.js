import { resolve } from 'path';
import { debounce, invoke, bindAll, once, uniq } from 'lodash';

import Log from '../log';
import Worker from './worker';
import BasePathProxy from './base_path_proxy';

process.env.kbnWorkerType = 'managr';

module.exports = class ClusterManager {
  constructor(opts = {}, settings = {}) {
    this.log = new Log(opts.quiet, opts.silent);
    this.addedCount = 0;

    const serverArgv = [];
    const optimizerArgv = [
      '--plugins.initialize=false',
      '--uiSettings.enabled=false',
      '--server.autoListen=false',
    ];

    if (opts.basePath) {
      this.basePathProxy = new BasePathProxy(this, settings);

      optimizerArgv.push(
        `--server.basePath=${this.basePathProxy.basePath}`
      );

      serverArgv.push(
        `--server.port=${this.basePathProxy.targetPort}`,
        `--server.basePath=${this.basePathProxy.basePath}`
      );
    }

    this.workers = [
      this.optimizer = new Worker({
        type: 'optmzr',
        title: 'optimizer',
        log: this.log,
        argv: optimizerArgv,
        watch: false
      }),

      this.server = new Worker({
        type: 'server',
        log: this.log,
        argv: serverArgv
      })
    ];

    // broker messages between workers
    this.workers.forEach((worker) => {
      worker.on('broadcast', (msg) => {
        this.workers.forEach((to) => {
          if (to !== worker && to.online) {
            to.fork.send(msg);
          }
        });
      });
    });

    bindAll(this, 'onWatcherAdd', 'onWatcherError', 'onWatcherChange');

    if (opts.watch) {
      const extraPaths = [
        ...settings.plugins.paths,
        ...settings.plugins.scanDirs,
      ];

      const extraIgnores = settings.plugins.scanDirs
        .map(scanDir => resolve(scanDir, '*'))
        .concat(settings.plugins.paths)
        .reduce((acc, path) => acc.concat(
          resolve(path, 'test'),
          resolve(path, 'build'),
          resolve(path, 'target'),
          resolve(path, 'scripts'),
          resolve(path, 'docs'),
        ), []);

      this.setupWatching(extraPaths, extraIgnores);
    }

    else this.startCluster();
  }

  startCluster() {
    this.setupManualRestart();
    invoke(this.workers, 'start');
    if (this.basePathProxy) {
      this.basePathProxy.listen();
    }
  }

  setupWatching(extraPaths, extraIgnores) {
    const chokidar = require('chokidar');
    const { fromRoot } = require('../../utils');

    const watchPaths = [
      fromRoot('src/core_plugins'),
      fromRoot('src/server'),
      fromRoot('src/ui'),
      fromRoot('src/utils'),
      fromRoot('config'),
      ...extraPaths
    ].map(path => resolve(path));

    this.watcher = chokidar.watch(uniq(watchPaths), {
      cwd: fromRoot('.'),
      ignored: [
        /[\\\/](\..*|node_modules|bower_components|public|__tests__|coverage)[\\\/]/,
        ...extraIgnores
      ]
    });

    this.watcher.on('add', this.onWatcherAdd);
    this.watcher.on('error', this.onWatcherError);

    this.watcher.on('ready', once(() => {
      // start sending changes to workers
      this.watcher.removeListener('add', this.onWatcherAdd);
      this.watcher.on('all', this.onWatcherChange);

      this.log.good('watching for changes', `(${this.addedCount} files)`);
      this.startCluster();
    }));
  }

  setupManualRestart() {
    const readline = require('readline');
    const rl = readline.createInterface(process.stdin, process.stdout);

    let nls = 0;
    const clear = () => nls = 0;
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
};
