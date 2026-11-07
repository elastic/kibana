/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMigratorOptions, parseAlgorithmFlag } from './algorithms';

describe('parseAlgorithmFlag', () => {
  it.each([
    ['v2', ['v2']],
    ['zdt', ['zdt']],
    ['v3', ['v3']],
    ['both', ['v2', 'zdt']],
    ['all', ['v2', 'zdt', 'v3']],
  ])('runs %s with %j', (flag, algorithms) => {
    expect(parseAlgorithmFlag(flag)).toEqual(algorithms);
  });

  it.each(['v4', 'constructor', 'toString'])("rejects '%s', listing the valid values", (flag) => {
    expect(() => parseAlgorithmFlag(flag)).toThrow(
      `Invalid --algorithm value '${flag}'. Must be one of: v2, zdt, v3, both, all`
    );
  });
});

describe('getMigratorOptions', () => {
  it('rolls v3 back with the Serverless behaviours', () => {
    expect(getMigratorOptions('v3', 'rollback')).toEqual({
      settings: { migrations: { algorithm: 'v3' } },
      esCapabilities: { serverless: true },
    });
  });

  it.each(['baseline', 'upgrade'] as const)(
    'runs the v3 %s with the classic behaviours',
    (phase) => {
      expect(getMigratorOptions('v3', phase)).toEqual({
        settings: { migrations: { algorithm: 'v3' } },
      });
    }
  );

  it('uses the Elasticsearch capabilities as they are for v2 and zdt', () => {
    expect(getMigratorOptions('zdt', 'rollback')).toEqual({
      settings: { migrations: { algorithm: 'zdt' } },
    });
    expect(getMigratorOptions('v2', 'rollback')).toEqual({
      settings: { migrations: { algorithm: 'v2' } },
    });
  });
});
