/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildConcurrencyArgs,
  resolveMaxOldSpaceMb,
  resolveTypeCheckConcurrency,
} from './resolve_concurrency';

describe('resolveTypeCheckConcurrency', () => {
  it('defaults builders to floor(cores/checkers) so total workers equal core count', () => {
    expect(resolveTypeCheckConcurrency({}, 12)).toEqual({
      builders: 4, // floor(12 / 3)
      checkers: 3,
      stopOnErrors: false,
    });
  });

  it('scales builders with core count on many-core machines', () => {
    expect(resolveTypeCheckConcurrency({}, 32).builders).toBe(10); // floor(32 / 3)
  });

  it('honors env overrides', () => {
    expect(
      resolveTypeCheckConcurrency(
        {
          KBN_TYPE_CHECK_BUILDERS: '4',
          KBN_TYPE_CHECK_CHECKERS: '3',
          KBN_TYPE_CHECK_STOP_ON_ERRORS: 'true',
        },
        8
      )
    ).toEqual({ builders: 4, checkers: 3, stopOnErrors: true });
  });

  it('ignores invalid/non-positive env values and falls back to defaults', () => {
    const resolved = resolveTypeCheckConcurrency(
      { KBN_TYPE_CHECK_BUILDERS: '0', KBN_TYPE_CHECK_CHECKERS: 'nope' },
      12
    );
    expect(resolved.builders).toBe(4); // floor(12 / 3)
    expect(resolved.checkers).toBe(3);
  });
});

describe('buildConcurrencyArgs', () => {
  it('emits builders and checkers flags', () => {
    expect(buildConcurrencyArgs({ builders: 6, checkers: 2, stopOnErrors: false })).toEqual([
      '--builders',
      '6',
      '--checkers',
      '2',
    ]);
  });

  it('appends --stopBuildOnErrors when set', () => {
    expect(buildConcurrencyArgs({ builders: 6, checkers: 2, stopOnErrors: true })).toContain(
      '--stopBuildOnErrors'
    );
  });
});

describe('resolveMaxOldSpaceMb', () => {
  it('defaults to 12288', () => {
    expect(resolveMaxOldSpaceMb({})).toBe(12288);
  });

  it('honors the env override', () => {
    expect(resolveMaxOldSpaceMb({ KBN_TYPE_CHECK_MAX_OLD_SPACE_MB: '49152' })).toBe(49152);
  });
});
