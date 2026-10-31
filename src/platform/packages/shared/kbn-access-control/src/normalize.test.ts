/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ACL_SHAPE_FIXTURES } from './contract/shapes';
import { normalizeAclSource, toStoredAcl } from './normalize';

describe('normalizeAclSource', () => {
  it('merges nested objects, dotted keys, and arrays per leaf', () => {
    expect(
      normalizeAclSource({
        type: 'action',
        action: { name: 'not part of the acl' },
        acl: { version: 1, owner: { type: 'user' }, 'owner.id': 'u_a', general_access: ['none'] },
        'acl.owner.id': ['u_b', null],
        'acl.entries.id': 'u_c',
      })
    ).toEqual({
      version: [1],
      owner: { type: ['user'], id: ['u_a', 'u_b'] },
      general_access: ['none'],
      entries: [{ type: [], id: ['u_c'], access: [], added_at: [] }],
    });
  });

  it('converts keyword leaves the way Elasticsearch indexes them', () => {
    expect(
      normalizeAclSource({ acl: { version: 1, general_access: true, owner: { id: 7 } } })
    ).toMatchObject({ general_access: ['true'], owner: { id: ['7'] } });
  });

  it('keeps raw version values', () => {
    expect(normalizeAclSource({ acl: { version: ['1', 2] } })?.version).toEqual(['1', 2]);
  });

  it.each([[undefined], [{}], [{ acl: null }], [{ acl: [] }], [{ acl: { entries: [{}] } }]])(
    'returns undefined when no leaf has a value (%j)',
    (source) => {
      expect(normalizeAclSource(source)).toBeUndefined();
    }
  );
});

describe('toStoredAcl', () => {
  it('produces a source that normalizes to the same ACL, without dotted keys', () => {
    for (const { source } of ACL_SHAPE_FIXTURES) {
      const canonical = normalizeAclSource(source);
      if (!canonical) {
        continue;
      }

      const stored = toStoredAcl(canonical);
      expect(Object.keys(stored).some((key) => key.includes('.'))).toBe(false);
      expect(normalizeAclSource({ acl: stored })).toEqual(canonical);
    }
  });

  it('collapses single values and drops empty leaves', () => {
    expect(
      toStoredAcl({
        version: [1],
        owner: { type: [], id: [] },
        general_access: ['none', 'use'],
        entries: [],
      })
    ).toEqual({ version: 1, general_access: ['none', 'use'] });
  });
});
