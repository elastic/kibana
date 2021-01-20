/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { spawnSync } from 'child_process';
import { resolve } from 'path';

import { REPO_ROOT } from '@kbn/utils';

const SCRIPT = resolve(REPO_ROOT, 'scripts/functional_test_runner.js');
const BASIC_CONFIG = require.resolve('./__fixtures__/simple_project/config.js');

describe('basic config file with a single app and test', function () {
  it('runs and prints expected output', () => {
    const proc = spawnSync(process.execPath, [SCRIPT, '--config', BASIC_CONFIG]);
    const stdout = proc.stdout.toString('utf8');
    expect(stdout).toContain('$BEFORE$');
    expect(stdout).toContain('$TESTNAME$');
    expect(stdout).toContain('$INTEST$');
    expect(stdout).toContain('$AFTER$');
  });
});
