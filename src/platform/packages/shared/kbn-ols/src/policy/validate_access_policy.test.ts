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
  generalAccessLevels: ['none', 'use', 'edit'],
  defaultGeneralAccessLevel: 'edit',
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
    ['manage general access', { generalAccessLevels: ['edit', 'manage' as 'edit'] }],
    ['no general access values', { generalAccessLevels: [] }],
    [
      'a default outside the allowed levels',
      { generalAccessLevels: ['none'], defaultGeneralAccessLevel: 'use' },
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
      'the reserved transfer operation',
      { operations: { ...POLICY.operations, transfer: { level: 'edit', privileges: {} } } },
    ],
    [
      'the reserved manage_access operation',
      { operations: { ...POLICY.operations, manage_access: { level: 'manage', privileges: {} } } },
    ],
  ])('rejects %s', (_, overrides) => {
    expect(() => validateAccessPolicy({ ...POLICY, ...overrides })).toThrow();
  });
});
