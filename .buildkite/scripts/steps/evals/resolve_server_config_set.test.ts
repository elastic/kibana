/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'child_process';
import Path from 'path';

const SCRIPT = Path.join(__dirname, 'resolve_server_config_set.sh');

const resolve = (suiteInfo: string, override?: string): string => {
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH };
  if (override !== undefined) {
    env.EVAL_SERVER_CONFIG_SET = override;
  }
  const result = spawnSync(
    'bash',
    ['-c', `source "${SCRIPT}"; resolve_server_config_set "$1"`, 'bash', suiteInfo],
    { env, encoding: 'utf-8' }
  );
  expect(result.status).toBe(0);
  return result.stdout;
};

describe('resolve_server_config_set', () => {
  const suiteInfo = JSON.stringify({ id: 'nightshift', serverConfigSet: 'evals_suite_specific' });

  it('uses the suite serverConfigSet when the override is unset (on-demand path)', () => {
    expect(resolve(suiteInfo)).toBe('evals_suite_specific');
  });

  it('uses the suite serverConfigSet when the override is empty', () => {
    expect(resolve(suiteInfo, '')).toBe('evals_suite_specific');
  });

  it('prefers an explicit override over the suite serverConfigSet', () => {
    expect(resolve(suiteInfo, 'evals_override')).toBe('evals_override');
  });

  it('falls back to evals_tracing for a suite without serverConfigSet', () => {
    expect(resolve(JSON.stringify({ id: 'smoke-tests' }))).toBe('evals_tracing');
  });

  it('falls back to evals_tracing when suite info is empty or invalid', () => {
    expect(resolve('')).toBe('evals_tracing');
    expect(resolve('not json')).toBe('evals_tracing');
  });
});
