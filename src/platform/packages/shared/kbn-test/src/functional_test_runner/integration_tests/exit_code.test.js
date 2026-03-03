/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'child_process';
import { resolve } from 'path';

import { REPO_ROOT } from '@kbn/repo-info';

const SCRIPT = resolve(REPO_ROOT, 'scripts/functional_test_runner.js');
const FAILING_CONFIG = require.resolve('./__fixtures__/exit_code/config_failing.js');
const PASSING_CONFIG = require.resolve('./__fixtures__/exit_code/config_passing.js');

describe('exit code handling', function () {
  // These tests verify that the exit code is preserved correctly.
  // The functional_test_runner.js script includes APM initialization which
  // registers cleanup handlers via @kbn/cleanup-before-exit. When tests complete,
  // the FTR sets process.exitCode and calls process.exit() without arguments.
  // The cleanup handler must not override this exit code.
  it('exits with code 0 when tests pass', () => {
    const proc = spawnSync(process.execPath, [SCRIPT, '--config', PASSING_CONFIG], {
      env: { ...process.env, SCOUT_REPORTER_ENABLED: '0' },
    });

    expect(proc.status).toBe(0);
  });

  it('exits with code 1 when tests fail', () => {
    const proc = spawnSync(process.execPath, [SCRIPT, '--config', FAILING_CONFIG], {
      env: { ...process.env, SCOUT_REPORTER_ENABLED: '0' },
    });

    expect(proc.status).toBe(1);
  });
});
