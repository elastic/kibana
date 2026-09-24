/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/setup-node-env');

var spawnSync = require('child_process').spawnSync;
var resolve = require('path').resolve;

var script = resolve(
  __dirname,
  '../x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations/scripts/publish_synthetic_snapshot'
);
var args = ['-r', '@kbn/setup-node-env', script].concat(process.argv.slice(2));
var result = spawnSync(process.execPath, args, { stdio: 'inherit' });

process.exit(result.status == null ? 1 : result.status);
