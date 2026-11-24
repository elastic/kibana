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
  generalAccess: ['none', 'use', 'edit'],
  defaultGeneralAccess: 'edit',
  entryAccess: ['use'],
  operations: {
    view: { access: 'view', privileges: {} },
    use: { access: 'use', privileges: { api: ['some_feature'] } },
    edit: { access: 'edit', privileges: {} },
    delete: { access: 'edit', privileges: {} },
  },
};

describe('validateAccessPolicy', () => {
  it('accepts a valid policy', () => {
    expect(() => validateAccessPolicy(POLICY)).not.toThrow();
  });

  it.each<[string, Partial<AccessPolicy>]>([
    ['manage general access', { generalAccess: ['edit', 'manage' as 'edit'] }],
    ['no general access values', { generalAccess: [] }],
    [
      'a default outside the allowed values',
      { generalAccess: ['none'], defaultGeneralAccess: 'use' },
    ],
    ['no entry access values', { entryAccess: [] }],
    ['entry access of none', { entryAccess: ['none' as 'use'] }],
    [
      'a missing delete operation',
      { operations: { view: POLICY.operations.view, edit: POLICY.operations.edit } },
    ],
    [
      'a view operation above view',
      { operations: { ...POLICY.operations, view: { access: 'use', privileges: {} } } },
    ],
    [
      'an operation with unknown access',
      { operations: { ...POLICY.operations, run: { access: 'owner' as 'use', privileges: {} } } },
    ],
    [
      'the reserved transfer operation',
      { operations: { ...POLICY.operations, transfer: { access: 'edit', privileges: {} } } },
    ],
    [
      'the reserved manage_access operation',
      { operations: { ...POLICY.operations, manage_access: { access: 'manage', privileges: {} } } },
    ],
  ])('rejects %s', (_, overrides) => {
    expect(() => validateAccessPolicy({ ...POLICY, ...overrides })).toThrow();
  });
});
