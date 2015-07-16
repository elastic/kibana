'use strict';

let cluster = require('cluster');
let join = require('path').join;
let _ = require('lodash');
let Gaze = require('gaze').Gaze;

let Log = require('../Log');
let fromRoot = require('../../utils/fromRoot');
let Worker = require('./Worker');

module.exports = function (opts) {

  let gaze = new Gaze([
    'src/{cli,commands,server,utils}/**/*',
    'src/plugins/*/*', // files at the root of a plugin
    'src/plugins/*/lib/**/*', // files within a lib directory for a plugin
    'config/**/*',
  ], {
    cwd: fromRoot('.'),
    debounceDelay: 200
  });

  let log = new Log(opts.quiet, opts.silent);
  let customLogging = opts.quiet || opts.silent || opts.verbose;

  let workers = [
    new Worker(gaze, {
      type: 'optmzr',
      title: 'optimizer',
      log: log,
      argv: _.compact([
        customLogging ? null : '--quiet',
        '--plugins.initialize=false',
        '--server.autoListen=false',
        '--optimize._workerRole=send'
      ]),
      filter: function (path) {
        return /\/src\/server\/optimize\//.test(path);
      }
    }),

    new Worker(gaze, {
      type: 'server',
      log: log,
      argv: [
        '--optimize._workerRole=receive'
      ]
    })
  ];

  workers.forEach(function (worker) {
    worker.on('broadcast', function (msg) {
      workers.forEach(function (broadcastTo) {
        if (broadcastTo === worker) return;
        broadcastTo.fork.send(msg);
      });
    });
  });

  gaze.on('all', function (e, path) {
    _.invoke(workers, 'onChange', path);
  });

  gaze.on('ready', function (watcher) {
    log.good('Watching for changes', `(${_.size(watcher.watched())} files)`);
    _.invoke(workers, 'start');
  });

  gaze.on('error', function (err) {
    log.bad('Failed to watch files!\n', err.stack);
    process.exit(1);
  });

};
