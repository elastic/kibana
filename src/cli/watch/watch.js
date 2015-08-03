let cluster = require('cluster');
let { join } = require('path');
let _ = require('lodash');
var chokidar = require('chokidar');

let utils = require('requirefrom')('src/utils');
let fromRoot = utils('fromRoot');
let Log = require('../Log');
let Worker = require('./Worker');

module.exports = function (opts) {

  let watcher = chokidar.watch([
    'src/cli',
    'src/fixtures',
    'src/server',
    'src/utils',
    'src/plugins',
    'config',
  ], {
    cwd: fromRoot('.'),
    ignore: 'src/plugins/*/public/**/*'
  });

  let log = new Log(opts.quiet, opts.silent);
  let customLogging = opts.quiet || opts.silent || opts.verbose;

  let workers = [
    new Worker({
      type: 'optmzr',
      title: 'optimizer',
      log: log,
      argv: _.compact([
        customLogging ? null : '--quiet',
        '--plugins.initialize=false',
        '--server.autoListen=false',
        '--optimize._workerRole=send'
      ]),
      filters: [
        /src\/server\/(optimize|ui|plugins)\//,
        /src\/plugins\/[^\/]+\/[^\/]+\.js$/,
        /src\/cli\//
      ]
    }),

    new Worker({
      type: 'server',
      log: log,
      argv: [
        '--optimize._workerRole=receive'
      ]
    })
  ];

  workers.forEach(function (worker) {
    worker.on('broadcast', function (msg) {
      workers.forEach(function (to) {
        if (to !== worker && to.fork) to.fork.send(msg);
      });
    });
  });


  var addedCount = 0;
  function onAddBeforeReady() {
    addedCount += 1;
  }

  function onReady() {
    // start sending changes to workers
    watcher.removeListener('add', onAddBeforeReady);
    watcher.on('all', onAnyChangeAfterReady);

    log.good('Watching for changes', `(${addedCount} files)`);
    _.invoke(workers, 'start');
  }

  function onAnyChangeAfterReady(e, path) {
    _.invoke(workers, 'onChange', path);
  }

  function onError(err) {
    log.bad('Failed to watch files!\n', err.stack);
    process.exit(1); // eslint-disable-line no-process-exit
  }

  watcher.on('add', onAddBeforeReady);
  watcher.on('ready', onReady);
  watcher.on('error', onError);
};
