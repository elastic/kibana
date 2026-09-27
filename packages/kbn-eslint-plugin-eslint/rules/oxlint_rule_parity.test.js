/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { execFileSync } = require('child_process');
const { resolve } = require('path');

it('replays migrated base rule cases with Oxlint', () => {
  execFileSync(process.execPath, [resolve(__dirname, '__fixtures__/run_oxlint_rule_tests.mjs')], {
    cwd: resolve(__dirname, '../../..'),
    stdio: 'inherit',
  });
});
