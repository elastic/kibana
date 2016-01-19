const cluster = require('cluster');
const { join } = require('path');
const { format: formatUrl } = require('url');
const Hapi = require('hapi');
const { debounce, compact, get, invoke, bindAll, once, sample } = require('lodash');

const Log = require('../Log');
const Worker = require('./worker');
const BasePathProxy = require('./base_path_proxy');

process.env.kbnWorkerType = 'managr';

module.exports = class ClusterManager {
  constructor(opts, settings) {
    this.log = new Log(opts.quiet, opts.silent);
    this.addedCount = 0;

    this.basePathProxy = new BasePathProxy(this, settings);

    this.workers = [
      this.optimizer = new Worker({
        type: 'optmzr',
        title: 'optimizer',
        log: this.log,
        argv: compact([
          '--plugins.initialize=false',
          '--server.autoListen=false',
          `--server.basePath=${this.basePathProxy.basePath}`
        ]),
        watch: false
      }),

      this.server = new Worker({
        type: 'server',
        log: this.log,
        argv: compact([
          `--server.port=${this.basePathProxy.targetPort}`,
          `--server.basePath=${this.basePathProxy.basePath}`
        ])
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

    if (opts.watch) this.setupWatching();
    else this.startCluster();
  }

  startCluster() {
    this.setupManualRestart();
    invoke(this.workers, 'start');
    this.basePathProxy.listen();
  }

  setupWatching() {
    const chokidar = require('chokidar');
    const utils = require('requirefrom')('src/utils');
    const fromRoot = utils('fromRoot');

    this.watcher = chokidar.watch([
      'src/plugins',
      'src/server',
      'src/ui',
      'src/utils',
      'config',
      'installedPlugins'
    ], {
      cwd: fromRoot('.'),
      ignored: /[\\\/](\..*|node_modules|bower_components|public|__tests__)[\\\/]/
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

    rl.on('line', line => {
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
