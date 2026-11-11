/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FIXTURE_POLICY, FIXTURE_POLICY_ALL_LEVELS } from '../__fixtures__';
import type { StoredAcl } from '../acl';
import { readEditableAcl } from './read_editable_acl';

const acl = (overrides: Partial<StoredAcl> = {}): StoredAcl => ({
  version: [1],
  owner: { type: ['user'], id: ['u_owner'] },
  general_access: ['none'],
  entries: [],
  ...overrides,
});

describe('readEditableAcl', () => {
  it('reads a single owner, general access, and entries with their dates', () => {
    expect(
      readEditableAcl(
        FIXTURE_POLICY,
        acl({
          entries: [
            { type: ['user'], id: ['u_grantee'], access: ['use'], added_at: ['2026-10-21'] },
          ],
        })
      )
    ).toEqual({
      owner: { type: 'user', id: 'u_owner' },
      general_access: 'none',
      entries: [{ type: 'user', id: 'u_grantee', access: 'use', added_at: '2026-10-21' }],
    });
  });

  it.each([
    ['no owner', { type: [], id: [] }],
    ['an owner with two known kinds', { type: ['user', 'service_account'], id: ['u_owner'] }],
    ['an owner with several IDs', { type: ['user'], id: ['u_owner', 'u_other'] }],
  ])('reads no owner from %s', (_, owner) => {
    expect(readEditableAcl(FIXTURE_POLICY, acl({ owner })).owner).toBeUndefined();
  });

  it('uses the lowest allowed general access, or none', () => {
    expect(readEditableAcl(FIXTURE_POLICY, acl({ general_access: ['edit', 'use'] }))).toMatchObject(
      {
        general_access: 'use',
      }
    );
    expect(readEditableAcl(FIXTURE_POLICY, acl({ general_access: ['view'] }))).toMatchObject({
      general_access: 'none',
    });
  });

  it('splits IDs, drops entries that grant nothing, and keeps the highest grant', () => {
    const { entries } = readEditableAcl(
      FIXTURE_POLICY_ALL_LEVELS,
      acl({
        entries: [
          { type: ['user'], id: ['u_a', 'u_b'], access: ['view'], added_at: ['2026-10-01'] },
          { type: ['user'], id: ['u_a'], access: ['edit'], added_at: [] },
          { type: ['user', 'service_account'], id: ['u_c'], access: ['edit'], added_at: [] },
          { type: ['user'], id: ['u_d'], access: ['manage'], added_at: [] },
        ],
      })
    );

    expect(entries).toEqual([
      { type: 'user', id: 'u_a', access: 'edit' },
      { type: 'user', id: 'u_b', access: 'view', added_at: '2026-10-01' },
    ]);
  });
});
