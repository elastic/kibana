let cluster = require('cluster');
let { join } = require('path');
let { debounce, compact, invoke, bindAll, once } = require('lodash');

let Log = require('../Log');
let Worker = require('./Worker');

module.exports = class ClusterManager {
  constructor(opts) {
    this.log = new Log(opts.quiet, opts.silent);
    this.addedCount = 0;

    this.workers = [
      this.optimizer = new Worker({
        type: 'optmzr',
        title: 'optimizer',
        log: this.log,
        argv: compact([
          '--plugins.initialize=false',
          '--server.autoListen=false'
        ]),
        watch: false
      }),

      this.server = new Worker({
        type: 'server',
        log: this.log
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
  }

  setupWatching() {
    var chokidar = require('chokidar');
    let utils = require('requirefrom')('src/utils');
    let fromRoot = utils('fromRoot');

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
    let readline = require('readline');
    let rl = readline.createInterface(process.stdin, process.stdout);

    let nls = 0;
    let clear = () => nls = 0;
    let clearSoon = debounce(clear, 2000);

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
