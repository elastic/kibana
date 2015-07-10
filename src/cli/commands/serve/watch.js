'use strict';

let _ = require('lodash');
let Gaze = require('gaze').Gaze;
let join = require('path').join;
let cluster = require('cluster');
let ansicolors = require('ansicolors');

let cliPath = join(__dirname, '..', 'cli.js');
let green = require('../color').green;
let red = require('../color').red;
let yellow = require('../color').yellow;

console.log(yellow(' Kibana starting '), 'and watching for changes');

cluster.setupMaster({
  exec: cliPath,
  silent: false
});

let baseArgv = [process.execPath, cliPath].concat(_.difference(process.argv.slice(2), ['--no-watch']));
let serverArgv = JSON.stringify(baseArgv.concat(['--optimize.enable=false']));
let optimizerArgv = JSON.stringify(baseArgv.concat(['--plugins.initialize=false']));

let changedFiles = [];
let server;
let startServer = _.debounce(function () {
  if (server && server.isDead()) {
    server.kill(); // once "exit" event is received with 0 status, startServer() is called again
    return;
  }

  server = cluster.fork({ kbnWorkerArgv: serverArgv });
  server.on('online', function () {
    if (!changedFiles.length) {
      console.log(green(' Kibana Started '));
      return;
    }

    let files = changedFiles.splice(0);
    let prefix = files.length > 1 ? '\n - ' : '';
    let fileList = files.reduce(function (list, file, i, files) {
      return `${list || ''}${prefix}"${file}"`;
    }, '');

    console.log(yellow(' Kibana Restarted '), `due to changes in ${fileList}`);
  });
}, 200);

let optimizer = cluster.fork({ kbnWorkerArgv: optimizerArgv });
optimizer.on('online', startServer);

cluster.on('exit', function (worker, code) {
  if (worker === server) {
    if (code > 0) {
      console.log(red(' Kibana Crashed '), 'with status code', code);
    } else {
      // graceful shutdowns should only happen if we are restarting
      startServer();
    }
    return;
  }

  if (worker === optimizer) {
    console.log(red(' optimizer crashed '), 'with status code', code);
    process.exit(1);
  }
});

let gaze = new Gaze([
  'src/**/*.{js,json,tmpl,yml}',
  '!src/**/public/',
  'config/',
], {
  cwd: join(__dirname, '..', '..', '..')
});

// A file has been added/changed/deleted
gaze.on('all', function (event, path) {
  changedFiles.push(path);
  startServer();
});

gaze.on('error', function (err) {
  console.log(red(' failed to watch files \n'), err.stack);
  process.exit(1);
});

