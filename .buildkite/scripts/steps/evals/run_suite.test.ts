/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const script = join(__dirname, 'run_suite.sh');

const readProfile = (suite: string, selection = ''): string[] => {
  const directory = mkdtempSync(join(tmpdir(), 'eval-ci-profile-'));
  const common = join(directory, '.buildkite/scripts/steps/functional');
  mkdirSync(common, { recursive: true });
  writeFileSync(
    join(common, 'common.sh'),
    `
    printf '%s\n' "\${NIGHTSHIFT_DATASETS:-}" "\${EVAL_SERVER_CONFIG_SET:-}"
    exit 0
  `
  );
  try {
    return execFileSync('bash', [script], {
      cwd: directory,
      env: {
        ...process.env,
        EVAL_SUITE_ID: suite,
        NIGHTSHIFT_DATASETS: selection,
        EVAL_SERVER_CONFIG_SET: 'evals_nightshift_investigations',
      },
      encoding: 'utf8',
    })
      .trimEnd()
      .split('\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

describe('eval CI profile selection before provisioning', () => {
  it('keeps default Nightshift CI on the existing smoke profile', () => {
    expect(readProfile('nightshift-investigations')).toEqual(['synthetic-smoke', 'evals_tracing']);
  });

  it('retains an explicitly provisioned golden profile', () => {
    expect(readProfile('nightshift-investigations', 'investigate-lite')).toEqual([
      'investigate-lite',
      'evals_nightshift_investigations',
    ]);
  });

  it('uses tracing for an explicitly selected smoke run', () => {
    expect(readProfile('nightshift-investigations', 'synthetic-smoke')).toEqual([
      'synthetic-smoke',
      'evals_tracing',
    ]);
  });

  it('leaves other suites alone', () => {
    expect(readProfile('another-suite')).toEqual(['', 'evals_nightshift_investigations']);
  });
});
