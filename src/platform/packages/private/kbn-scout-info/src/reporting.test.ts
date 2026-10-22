/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// SCOUT_TEST_RUN_SCOPE is read at module load, so each case re-imports the module.
describe('SCOUT_TEST_RUN_SCOPE', () => {
  const originalScope = process.env.SCOUT_TEST_RUN_SCOPE;

  const loadScope = async (scope: string | undefined): Promise<string> => {
    if (scope === undefined) {
      delete process.env.SCOUT_TEST_RUN_SCOPE;
    } else {
      process.env.SCOUT_TEST_RUN_SCOPE = scope;
    }

    jest.resetModules();
    const { SCOUT_TEST_RUN_SCOPE } = await import('./reporting');
    return SCOUT_TEST_RUN_SCOPE;
  };

  afterEach(() => {
    if (originalScope === undefined) {
      delete process.env.SCOUT_TEST_RUN_SCOPE;
    } else {
      process.env.SCOUT_TEST_RUN_SCOPE = originalScope;
    }
  });

  it('is the scope declared via SCOUT_TEST_RUN_SCOPE', async () => {
    expect(await loadScope(' batch-daily-ipv6 ')).toBe('batch-daily-ipv6');
  });

  it.each([undefined, '', '  '])('is unknown when the scope is %p', async (scope) => {
    expect(await loadScope(scope)).toBe('unknown');
  });
});
