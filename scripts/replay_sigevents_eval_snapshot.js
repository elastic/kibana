/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/setup-node-env');

// --run-id must be applied before importing TS modules that read
// SIGEVENTS_SNAPSHOT_RUN at module-evaluation time.
var runIdIdx = process.argv.indexOf('--run-id');
if (runIdIdx !== -1 && process.argv[runIdIdx + 1]) {
  process.env.SIGEVENTS_SNAPSHOT_RUN = process.argv[runIdIdx + 1];
}

require('@kbn/evals-suite-significant-events/scripts/replay_eval_snapshot');
