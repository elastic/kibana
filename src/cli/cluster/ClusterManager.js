let cluster = require('cluster');
let { join } = require('path');
let { compact, invoke, bindAll, once } = require('lodash');

let Log = require('../Log');
let Worker = require('./Worker');

module.exports = class ClusterManager {
  constructor(opts) {
    this.log = new Log(opts.quiet, opts.silent);
    this.addedCount = 0;

    this.workers = [
      new Worker({
        type: 'optmzr',
        title: 'optimizer',
        log: this.log,
        argv: compact([
          (opts.quiet || opts.silent || opts.verbose) ? null : '--quiet',
          '--plugins.initialize=false',
          '--server.autoListen=false'
        ]),
        watch: false
      }),

      new Worker({
        type: 'server',
        log: this.log
      })
    ];

    bindAll(this, 'onWatcherAdd', 'onWatcherError', 'onWatcherChange');

    if (opts.watch) this.setupWatching();
    else this.startCluster();
  }

  startCluster() {
    invoke(this.workers, 'start');
  }

  setupWatching() {
    var chokidar = require('chokidar');
    let utils = require('requirefrom')('src/utils');
    let fromRoot = utils('fromRoot');

    this.watcher = chokidar.watch([
      'src/cli',
      'src/optimize',
      'src/plugins',
      'src/server',
      'src/ui',
      'src/utils',
      'config',
      'installedPlugins'
    ], {
      cwd: fromRoot('.'),
      ignored: /[\\\/](node_modules|bower_components|public)[\\\/]/,
    });

    this.watcher.on('add', this.onWatcherAdd);
    this.watcher.on('error', this.onWatcherError);

    this.watcher.on('ready', once(() => {
      // start sending changes to workers
      this.watcher.removeListener('add', this.onWatcherAdd);
      this.watcher.on('all', this.onWatcherChange);

      this.log.good('Watching for changes', `(${this.addedCount} files)`);
      this.startCluster();
    }));
  }

  onWatcherAdd() {
    this.addedCount += 1;
  }

  onWatcherChange(e, path) {
    invoke(this.workers, 'onChange', path);
  }

  onWatcherError(err) {
    this.log.bad('Failed to watch files!\n', err.stack);
    process.exit(1); // eslint-disable-line no-process-exit
  }
};
