/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

var getopts = require('getopts');
var path = require('path');
var v8 = require('node:v8');
var worker = require('node:worker_threads');

var execOpts = getopts(process.execArgv);
var envOpts = getopts(process.env.NODE_OPTIONS ? process.env.NODE_OPTIONS.split(/\s+/) : []);
var diagnosticDir = execOpts['diagnostic-dir'] || envOpts['diagnostic-dir'];
var heapSnapshotSignal = execOpts['heapsnapshot-signal'] || envOpts['heapsnapshot-signal'];
var heapSnapshotSerial = 0;

function getHeapSnapshotPath() {
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
  var threadId = worker.threadId;
  var serial = (++heapSnapshotSerial).toString().padStart(3, '0');

  return path.join(diagnosticDir, `Heap.${date}.${time}.${pid}.${threadId}.${serial}.heapsnapshot`);
}

if (diagnosticDir && heapSnapshotSignal) {
  process.removeAllListeners(heapSnapshotSignal);

  process.on(heapSnapshotSignal, function () {
    var heapSnapshotPath = getHeapSnapshotPath();
    v8.writeHeapSnapshot(heapSnapshotPath);
  });
}
