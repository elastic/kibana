/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// RESEARCH ONLY (Track 2 islands): worker-thread / child-process entry.
const { isMainThread, workerData } = require('worker_threads');
const dist = isMainThread ? process.env.KBN_RESEARCH_ISLAND_DIST === 'true' : workerData.dist;
if (dist) {
  require('@kbn/setup-node-env/dist');
} else {
  require('@kbn/setup-node-env');
}

require('./island_runtime').main();
