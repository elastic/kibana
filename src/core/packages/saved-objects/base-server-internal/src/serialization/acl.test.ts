/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readStoredAcl } from './acl';

describe('readStoredAcl', () => {
  it('reads the ACL from the `acl` object, dotted root keys, and arrays', () => {
    expect(
      readStoredAcl({
        type: 'dashboard',
        acl: { version: 1, owner: { type: 'user' }, entries: [{ type: 'user', id: ['a', 'b'] }] },
        'acl.owner.id': 'u_owner',
        'acl.general.access': 'none',
      })
    ).toEqual({
      version: [1],
      owner: { type: ['user'], id: ['u_owner'] },
      general: { access: ['none'] },
      entries: [{ type: ['user'], id: ['a', 'b'], access: [], added_at: [] }],
    });
  });

  it.each([
    ['no source', undefined],
    ['no ACL field', { type: 'dashboard' }],
    ['an empty ACL', { acl: {} }],
    ['a null ACL', { acl: null }],
  ])('returns undefined for %s', (_, source) => {
    expect(readStoredAcl(source)).toBeUndefined();
  });
});
