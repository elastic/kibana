/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FIXTURE_POLICY } from './contract/shapes';
import { validateAccessPolicy } from './policy';
import type { AccessPolicy } from './types';

describe('validateAccessPolicy', () => {
  it('accepts the connector policy', () => {
    expect(() => validateAccessPolicy(FIXTURE_POLICY)).not.toThrow();
  });

  it.each<[string, Partial<AccessPolicy>]>([
    [
      'manage general access',
      { generalAccess: { default: 'edit', allowed: ['edit', 'manage' as 'edit'] } },
    ],
    [
      'a default outside the allowed levels',
      { generalAccess: { default: 'use', allowed: ['none'] } },
    ],
    ['no entry levels', { entryLevels: [] }],
    ['an entry level of none', { entryLevels: ['none' as 'use'] }],
    [
      'a missing delete operation',
      {
        operations: { view: FIXTURE_POLICY.operations.view, edit: FIXTURE_POLICY.operations.edit },
      },
    ],
    [
      'a view operation above view',
      { operations: { ...FIXTURE_POLICY.operations, view: { level: 'use', privileges: {} } } },
    ],
    [
      'a reserved operation',
      { operations: { ...FIXTURE_POLICY.operations, transfer: { level: 'edit', privileges: {} } } },
    ],
  ])('rejects %s', (_, overrides) => {
    expect(() => validateAccessPolicy({ ...FIXTURE_POLICY, ...overrides })).toThrow();
  });
});
