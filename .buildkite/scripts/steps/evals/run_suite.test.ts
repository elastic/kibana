/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import { copyFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

const script = join(__dirname, 'run_suite.sh');
const registry = '.buildkite/pipelines/evals/evals.suites.json';

interface Selection {
  datasets?: string;
  serverConfigSet?: string;
}

/** Runs the real script against the real suite registry, stopping at the workspace setup seam. */
const readProfile = (suite: string, { datasets = '', serverConfigSet = '' }: Selection = {}) => {
  const directory = mkdtempSync(join(tmpdir(), 'eval-ci-profile-'));
  const common = join(directory, '.buildkite/scripts/steps/functional');
  mkdirSync(common, { recursive: true });
  mkdirSync(join(directory, dirname(registry)), { recursive: true });
  copyFileSync(join(__dirname, '../../../..', registry), join(directory, registry));
  // The stub is sourced, so it sees the resolved selection and the forwarding helper.
  writeFileSync(
    join(common, 'common.sh'),
    `
    printf '%s\n' "\${NIGHTSHIFT_DATASETS:-}" "\${EVAL_SERVER_CONFIG_SET:-}"
    suite_ci_env_yaml '  '
    exit 0
  `
  );
  try {
    const [selectedDatasets, selectedConfigSet, ...forwarded] = execFileSync('bash', [script], {
      cwd: directory,
      env: {
        ...process.env,
        EVAL_SUITE_ID: suite,
        // Fanout and trigger steps forward unset values as empty strings.
        NIGHTSHIFT_DATASETS: datasets,
        EVAL_SERVER_CONFIG_SET: serverConfigSet,
      },
      encoding: 'utf8',
    })
      // Empty selections print empty lines, so drop only the final newline.
      .replace(/\n$/, '')
      .split('\n');
    return { datasets: selectedDatasets, serverConfigSet: selectedConfigSet, forwarded };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

describe('suite-declared CI defaults', () => {
  it('runs Nightshift CI on the smoke profile declared in the suite registry', () => {
    expect(readProfile('nightshift-investigations')).toEqual({
      datasets: 'synthetic-smoke',
      serverConfigSet: 'evals_tracing',
      forwarded: ['  NIGHTSHIFT_DATASETS: "synthetic-smoke"'],
    });
  });

  it('retains and forwards an explicitly provisioned golden profile', () => {
    expect(
      readProfile('nightshift-investigations', {
        datasets: 'investigate-lite',
        serverConfigSet: 'evals_nightshift_investigations',
      })
    ).toEqual({
      datasets: 'investigate-lite',
      serverConfigSet: 'evals_nightshift_investigations',
      forwarded: ['  NIGHTSHIFT_DATASETS: "investigate-lite"'],
    });
  });

  it('leaves suites without CI defaults alone', () => {
    expect(readProfile('agent-builder', { serverConfigSet: 'evals_agent_builder' })).toEqual({
      datasets: '',
      serverConfigSet: 'evals_agent_builder',
      forwarded: [],
    });
    expect(readProfile('unregistered-suite')).toEqual({
      datasets: '',
      serverConfigSet: '',
      forwarded: [],
    });
  });
});
