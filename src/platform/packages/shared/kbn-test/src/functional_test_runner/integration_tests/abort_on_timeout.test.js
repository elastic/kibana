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
const TIMEOUT_CONFIG = require.resolve('./__fixtures__/abort_on_timeout/config.js');
const ORDINARY_FAILURE_CONFIG = require.resolve(
  './__fixtures__/abort_on_timeout/ordinary_failure_config.js'
);
const HANGING_CLEANUP_CONFIG = require.resolve(
  './__fixtures__/abort_on_timeout/hanging_cleanup_config.js'
);

function runFixture(config) {
  return spawnSync(process.execPath, [SCRIPT, '--config', config], {
    // this FTR run should not produce a scout report
    env: { ...process.env, SCOUT_REPORTER_ENABLED: '0' },
    timeout: 20000,
  });
}

describe('abort on mocha timeout', () => {
  it('aborts the run on the first timeout, skips remaining tests, and fast-fails teardown hooks', () => {
    const proc = runFixture(TIMEOUT_CONFIG);
    const stdout = proc.stdout.toString('utf8');

    expect(proc.status).not.toBe(0);
    expect(stdout).toContain('FTR aborting config: Mocha timeout detected');
    expect(stdout).not.toContain('$SHOULD_NOT_RUN_RAN$');
    expect(stdout).toContain('FTR run aborted (mocha timeout) - skipping remaining runnable');

    // the slow "after all" hook is fast-failed via the abort path rather than left to hang
    // for the full hookTimeout: it is reported as a failed hook carrying the abort error
    expect(stdout).toContain('"after all" hook: $SLOW_AFTER_ALL_HOOK$');
  }, 30000);

  it('does NOT abort the run on an ordinary (non-timeout) failure', () => {
    const proc = runFixture(ORDINARY_FAILURE_CONFIG);
    const stdout = proc.stdout.toString('utf8');

    expect(proc.status).not.toBe(0);
    expect(stdout).not.toContain('FTR aborting config: Mocha timeout detected');
    expect(stdout).toContain('$SHOULD_STILL_RUN_RAN$');
  }, 20000);

  it('bounds a hung cleanup handler once aborting instead of hanging the process', () => {
    const proc = runFixture(HANGING_CLEANUP_CONFIG);
    const stdout = proc.stdout.toString('utf8');

    expect(proc.status).not.toBe(0);
    // the hung cleanup handler never resolves; the abortCleanupTimeout bound fires and the
    // run moves on instead of hanging until spawnSync's own 20000ms timeout kills it
    expect(stdout).toContain('cleanup did not finish within 300ms of aborting, moving on');
  }, 30000);
});
