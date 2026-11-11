/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/setup-node-env');

var spawn = require('child_process').spawn;
var resolve = require('path').resolve;

var script = resolve(
  __dirname,
  '../x-pack/solutions/observability/packages/kbn-nightshift-harness-opt/scripts/run'
);
var child = spawn(process.execPath, [script].concat(process.argv.slice(2)), {
  stdio: 'inherit',
});

// Forward termination, so killing this launcher stops the run (and its sub-agents) instead of
// orphaning it.
['SIGTERM', 'SIGINT', 'SIGHUP'].forEach(function (signal) {
  process.on(signal, function () {
    child.kill(signal);
  });
});
child.on('exit', function (code, signal) {
  if (code != null) process.exit(code);
  process.exit(signal ? 130 : 1);
});
