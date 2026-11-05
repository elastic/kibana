/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AccessPolicy } from './types';
import { validateAccessPolicy } from './validate_access_policy';

const POLICY: AccessPolicy = {
  generalAccess: { default: 'edit', allowed: ['none', 'use', 'edit'] },
  entryLevels: ['use'],
  operations: {
    view: { level: 'view', privileges: {} },
    use: { level: 'use', privileges: { api: ['some_feature'] } },
    edit: { level: 'edit', privileges: {} },
    delete: { level: 'edit', privileges: {} },
  },
};

describe('validateAccessPolicy', () => {
  it('accepts a valid policy', () => {
    expect(() => validateAccessPolicy(POLICY)).not.toThrow();
  });

  it.each<[string, Partial<AccessPolicy>]>([
    [
      'manage general access',
      { generalAccess: { default: 'edit', allowed: ['edit', 'manage' as 'edit'] } },
    ],
    ['no general access values', { generalAccess: { default: 'edit', allowed: [] } }],
    [
      'a default outside the allowed levels',
      { generalAccess: { default: 'use', allowed: ['none'] } },
    ],
    ['no entry levels', { entryLevels: [] }],
    ['an entry level of none', { entryLevels: ['none' as 'use'] }],
    [
      'a missing delete operation',
      { operations: { view: POLICY.operations.view, edit: POLICY.operations.edit } },
    ],
    [
      'a view operation above view',
      { operations: { ...POLICY.operations, view: { level: 'use', privileges: {} } } },
    ],
    [
      'an operation with an unknown level',
      { operations: { ...POLICY.operations, run: { level: 'owner' as 'use', privileges: {} } } },
    ],
    [
      'a reserved operation',
      { operations: { ...POLICY.operations, transfer: { level: 'edit', privileges: {} } } },
    ],
  ])('rejects %s', (_, overrides) => {
    expect(() => validateAccessPolicy({ ...POLICY, ...overrides })).toThrow();
  });
});
