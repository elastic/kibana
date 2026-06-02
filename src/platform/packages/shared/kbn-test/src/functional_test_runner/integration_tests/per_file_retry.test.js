/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'child_process';
import { existsSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { resolve } from 'path';
import { tmpdir } from 'os';

import { REPO_ROOT } from '@kbn/repo-info';

const SCRIPT = resolve(REPO_ROOT, 'scripts/functional_test_runner.js');
const CONFIG = require.resolve('./__fixtures__/per_file_retry/config.js');
const FLAKY_SPEC = require.resolve('./__fixtures__/per_file_retry/tests/flaky.js');
// Must match MARKER_PATH in flaky.js
const MARKER_PATH = join(tmpdir(), 'kbn_ftr_per_file_retry.marker');

const FTR_ENV = { ...process.env, SCOUT_REPORTER_ENABLED: '0' };

describe('per-file retry plumbing', () => {
  beforeEach(() => {
    if (existsSync(MARKER_PATH)) rmSync(MARKER_PATH);
  });

  afterEach(() => {
    if (existsSync(MARKER_PATH)) rmSync(MARKER_PATH);
  });

  it('exits 1 on first run and records the failed spec via marker', () => {
    const proc = spawnSync(process.execPath, [SCRIPT, '--config', CONFIG], { env: FTR_ENV });

    expect(proc.status).toBe(1);
    // The flaky test created the marker, confirming it ran and failed.
    expect(existsSync(MARKER_PATH)).toBe(true);
  });

  it('exits 0 when re-run with --include narrowed to the failed spec (simulated retry)', () => {
    // Simulate post-failure state: marker already exists from a prior run.
    writeFileSync(MARKER_PATH, '');

    const proc = spawnSync(
      process.execPath,
      [SCRIPT, '--config', CONFIG, `--include=${FLAKY_SPEC}`],
      { env: FTR_ENV }
    );

    expect(proc.status).toBe(0);
    // The flaky test deleted the marker on success.
    expect(existsSync(MARKER_PATH)).toBe(false);
  });

  it('full retry sequence: fail → narrowed re-run → pass', () => {
    // Step 1: initial run fails.
    const firstRun = spawnSync(process.execPath, [SCRIPT, '--config', CONFIG], { env: FTR_ENV });
    expect(firstRun.status).toBe(1);
    expect(existsSync(MARKER_PATH)).toBe(true);

    // Step 2: retry run narrowed to the failed spec — mirrors what the retry loop does.
    const retryRun = spawnSync(
      process.execPath,
      [SCRIPT, '--config', CONFIG, `--include=${FLAKY_SPEC}`],
      { env: FTR_ENV }
    );
    expect(retryRun.status).toBe(0);
    expect(existsSync(MARKER_PATH)).toBe(false);
  });
});
