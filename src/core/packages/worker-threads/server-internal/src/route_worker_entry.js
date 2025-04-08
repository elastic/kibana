/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const start = performance.now();

if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @kbn/imports/no_boundary_crossing
  require('../../../../../setup_node_env');
} else {
  // eslint-disable-next-line @kbn/imports/no_boundary_crossing
  require('../../../../../setup_node_env/dist');
}

const { waitUntilStdoutCompleted } = require('./sync_console');

const afterSetup = performance.now();

const initialize = require('./route_worker').getRouteWorkerHandler();
const setup = Math.round(performance.now() - afterSetup);

module.exports = initialize.finally(async () => {
  const total = Math.round(performance.now() - start);

  process.stdout.write(`Worker initialized in ${total}ms, setup time was ${setup}ms\n`);

  await waitUntilStdoutCompleted();
});
