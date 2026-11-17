/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ACL_SHAPE_FIXTURES } from '../__fixtures__';
import { normalizeAclSource, toAclSource } from './acl_source';

const EMPTY_ENTRY = { type: [], id: [], access: [], added_at: [] };

const hasDottedKey = (value: unknown): boolean =>
  Array.isArray(value)
    ? value.some(hasDottedKey)
    : typeof value === 'object' && value !== null
    ? Object.entries(value).some(([key, child]) => key.includes('.') || hasDottedKey(child))
    : false;

describe('normalizeAclSource', () => {
  it('merges nested objects, dotted keys, and arrays per field', () => {
    expect(
      normalizeAclSource({
        type: 'my-type',
        'my-type': { name: 'not part of the acl' },
        acl: { version: 1, owner: { type: 'user' }, 'owner.id': 'u_a', general_access: ['none'] },
        'acl.owner.id': ['u_b', null],
      })
    ).toEqual({
      version: [1],
      owner: { type: ['user'], id: ['u_a', 'u_b'] },
      general_access: ['none'],
      entries: [],
    });
  });

  it('reads each object under entries as one entry', () => {
    expect(
      normalizeAclSource({
        acl: {
          entries: [
            { type: 'user', id: 'u_a', access: 'use' },
            { type: 'user', id: ['u_b', 'u_c'], access: ['edit', 'use'] },
          ],
        },
        'acl.entries': { type: 'service_account', id: 'ns/svc', access: 'use' },
      })?.entries
    ).toEqual([
      { type: ['user'], id: ['u_a'], access: ['use'], added_at: [] },
      { type: ['user'], id: ['u_b', 'u_c'], access: ['edit', 'use'], added_at: [] },
      { type: ['service_account'], id: ['ns/svc'], access: ['use'], added_at: [] },
    ]);
  });

  it('reads sibling dotted entry keys as separate entries', () => {
    const expectedEntries = [
      { ...EMPTY_ENTRY, type: ['user'] },
      { ...EMPTY_ENTRY, id: ['u_grantee'] },
      { ...EMPTY_ENTRY, access: ['use'] },
    ];

    expect(
      normalizeAclSource({
        acl: { 'entries.type': 'user', 'entries.id': 'u_grantee', 'entries.access': 'use' },
      })?.entries
    ).toEqual(expectedEntries);
    expect(
      normalizeAclSource({
        'acl.entries.type': 'user',
        'acl.entries.id': 'u_grantee',
        'acl.entries.access': 'use',
      })?.entries
    ).toEqual(expectedEntries);
  });

  it('converts numbers and booleans to text, except in version', () => {
    expect(
      normalizeAclSource({
        acl: { version: 1, owner: { type: 'user', id: 7 }, general_access: true },
      })
    ).toEqual({
      version: [1],
      owner: { type: ['user'], id: ['7'] },
      general_access: ['true'],
      entries: [],
    });
    expect(normalizeAclSource({ acl: { version: ['1', 2] } })?.version).toEqual(['1', 2]);
  });

  it('reads an empty string as a value', () => {
    expect(normalizeAclSource({ acl: { general_access: '' } })).toEqual({
      version: [],
      owner: { type: [], id: [] },
      general_access: [''],
      entries: [],
    });
  });

  it('reads an entry that holds only added_at as an ACL with one entry', () => {
    expect(
      normalizeAclSource({ acl: { entries: [{ added_at: '2026-10-21T00:00:00Z' }] } })?.entries
    ).toEqual([{ ...EMPTY_ENTRY, added_at: ['2026-10-21T00:00:00Z'] }]);
  });

  it.each([
    ['no source', undefined],
    ['no acl', {}],
    ['a null acl', { acl: null }],
    ['an empty array', { acl: [] }],
    ['an empty entry', { acl: { entries: [{}] } }],
    ['only null values', { acl: { version: null, owner: { id: [null] }, entries: [] } }],
    ['only a key the mapping does not know', { acl: { foo: 'bar' } }],
    ['an entry with only a key the mapping does not know', { acl: { entries: [{ foo: 'bar' }] } }],
    ['a dotted key the mapping does not know', { 'acl.foo': 'bar' }],
  ])('finds no ACL in %s', (_, source) => {
    expect(normalizeAclSource(source)).toBeUndefined();
  });

  it.each(ACL_SHAPE_FIXTURES.map((fixture) => [fixture.name, fixture]))(
    'finds an ACL only when it is not absent: %s',
    (_, { source, state }) => {
      expect(normalizeAclSource(source) !== undefined).toBe(state !== 'absent');
    }
  );
});

describe('toAclSource', () => {
  it.each(ACL_SHAPE_FIXTURES.map((fixture) => [fixture.name, fixture]))(
    'writes a value without dotted keys that reads back the same: %s',
    (_, { source }) => {
      const acl = normalizeAclSource(source);
      if (!acl) {
        return;
      }

      const aclSource = toAclSource(acl);
      expect(hasDottedKey(aclSource)).toBe(false);
      expect(normalizeAclSource({ acl: aclSource })).toEqual(acl);
    }
  );

  it('writes one value as is, keeps several values, and leaves out empty fields', () => {
    expect(
      toAclSource({
        version: [1],
        owner: { type: [], id: ['u_a'] },
        general_access: ['none', 'use'],
        entries: [{ type: ['user'], id: ['u_b'], access: ['use'], added_at: [] }],
      })
    ).toEqual({
      version: 1,
      general_access: ['none', 'use'],
      owner: { id: 'u_a' },
      entries: [{ type: 'user', id: 'u_b', access: 'use' }],
    });
  });
});
