/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

var fs = require('fs');
var getopts = require('getopts');
var path = require('path');
var inspector = require('node:inspector');
var util = require('util');
var worker = require('node:worker_threads');

var execOpts = getopts(process.execArgv);
var envOpts = getopts(process.env.NODE_OPTIONS ? process.env.NODE_OPTIONS.split(/\s+/) : []);
var dir = execOpts['diagnostic-dir'] || envOpts['diagnostic-dir'] || process.cwd();
var signal = execOpts['cpuprofile-signal'] || envOpts['cpuprofile-signal'];
var counter = 0;
var session;

function isRunning() {
  return session !== undefined;
}

function start() {
  session = new inspector.Session();
  session.connect();
  session.post = session.post.bind(session);

  return Promise.resolve()
    .then(function () {
      return util.promisify(session.post)('Profiler.enable');
    })
    .then(function () {
      return util.promisify(session.post)('Profiler.start');
    });
}

function stop() {
  return Promise.resolve()
    .then(function () {
      return util.promisify(session.post)('Profiler.stop');
    })
    .then(function (result) {
      return util.promisify(fs.writeFile)(getPath(), JSON.stringify(result.profile));
    })
    .finally(function () {
      session.disconnect();
      session = undefined;
    });
}

function getPath() {
  var now = new Date();

  var year = now.getFullYear();
  var month = String(now.getMonth() + 1).padStart(2, '0');
  var day = String(now.getDate()).padStart(2, '0');
  var hours = String(now.getHours()).padStart(2, '0');
  var minutes = String(now.getMinutes()).padStart(2, '0');
  var seconds = String(now.getSeconds()).padStart(2, '0');

  var date = `${year}${month}${day}`;
  var time = `${hours}${minutes}${seconds}`;
  var pid = process.pid;
  var thread = worker.threadId;
  var serial = (++counter).toString().padStart(3, '0');

  return path.join(dir, `CPU.${date}.${time}.${pid}.${thread}.${serial}.cpuprofile`);
}

if (signal) {
  process.removeAllListeners(signal);

  process.on(signal, function () {
    if (isRunning()) {
      stop();
    } else {
      start();
    }
  });
}
