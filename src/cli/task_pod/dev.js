/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Re-executes itself with the semi-space cap pods run with when it is not set: without it V8 sizes the
// young generation from the machine's heap limit and a pod sits ~100 MB higher than it needs to.
const flag = '--max-semi-space-size=8';
if (
  !`${process.env.NODE_OPTIONS ?? ''} ${process.execArgv.join(' ')}`.includes('max-semi-space-size')
) {
  const { spawnSync } = require('child_process');
  const { status } = spawnSync(
    process.execPath,
    [flag, ...process.execArgv, ...process.argv.slice(1)],
    {
      stdio: 'inherit',
    }
  );
  process.exit(status ?? 1);
}

require('@kbn/setup-node-env');
require('./cli_task_pod');
