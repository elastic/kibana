/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pickWarnMessage, pickErrorMessage } from '../utils/templates';
import { SERVICE_MESSAGES } from '../log_catalog';

const SEED = 42;

describe('warn → error pool separation', () => {
  it('k8s_oom has non-empty warn and error pools for every runtime', () => {
    const pool = SERVICE_MESSAGES.k8s_oom;
    for (const rt of ['go', 'python', 'java', 'node'] as const) {
      const entry = pool[rt];
      expect(entry).toBeDefined();
      expect(entry!.warn.length).toBeGreaterThan(0);
      expect(entry!.error.length).toBeGreaterThan(0);
    }
  });

  it('pickWarnMessage and pickErrorMessage draw from different pools for the same error type', () => {
    // Use internal_error (go runtime) as a representative flat type with both pools populated.
    const warnMsg = pickWarnMessage({ errorType: 'internal_error', seed: SEED, runtime: 'go' });
    const errorMsg = pickErrorMessage({ errorType: 'internal_error', seed: SEED, runtime: 'go' });
    expect(warnMsg.toLowerCase()).toMatch(/warn/);
    expect(errorMsg.toLowerCase()).toMatch(/error/);
  });

  it('tech-keyed error type routes warn and error by sourceDep', () => {
    const pgWarn = pickWarnMessage({
      errorType: 'db_timeout',
      seed: SEED,
      runtime: 'go',
      sourceDep: 'postgres',
    });
    const mongoWarn = pickWarnMessage({
      errorType: 'db_timeout',
      seed: SEED,
      runtime: 'go',
      sourceDep: 'mongodb',
    });
    expect(pgWarn).not.toBe(mongoWarn);
    expect(pgWarn.toLowerCase()).toMatch(/pg|postgres/);
    expect(mongoWarn.toLowerCase()).toMatch(/mongo/);
  });
});
