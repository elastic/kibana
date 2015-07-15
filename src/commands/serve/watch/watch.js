'use strict';

let _ = require('lodash');
let Gaze = require('gaze').Gaze;
let join = require('path').join;

let log = require('./log');
let cluster = require('cluster');
let Worker = require('./Worker');

let gaze = new Gaze([
  'src/**/*',
  'config/**/*',
  '!src/**/public/**/*',
  '!src/ui/**/*',
], {
  cwd: join(__dirname, '..', '..', '..'),
  debounceDelay: 200
});

let workers = [
  new Worker(gaze, {
    type: 'optmzr',
    title: 'optimizer',
    args: [
      '--logging.quiet=true',
      '--plugins.initialize=false',
      '--server.autoListen=false',
      '--optimize._workerRole=send'
    ],
    filter: function (path) {
      return /\/src\/server\/optimize\//.test(path);
    }
  }),

  new Worker(gaze, {
    type: 'server',
    args: ['--optimize._workerRole=receive']
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
  log.green('Watching for changes', `(${_.size(watcher.watched())} files)`);
  _.invoke(workers, 'start');
});

gaze.on('error', function (err) {
  log.red('Failed to watch files!\n', err.stack);
  process.exit(1);
});
