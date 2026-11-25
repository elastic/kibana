/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createAccessControlSchema,
  prepareAccessControl,
  hasEntityAccess,
  resolveEntityAccess,
  buildEntityReadAccessQuery,
} from '.';

const roles = ['member', 'editor'] as const;
const member = { type: 'user' as const, id: 'profile-a', role: 'member' as const };
const now = '2026-09-10T00:00:00.000Z';
const privateAcl = { access_mode: 'private' as const, entries: [{ ...member, added_at: now }] };

describe('entity access control', () => {
  it('accepts the Agent Builder conversation shape without conversion', () => {
    expect(prepareAccessControl({ input: privateAcl, roles, ownerId: 'owner', now })).toEqual(
      privateAcl
    );
  });
  it.each([
    { ...member, id: '' },
    { ...member, id: 'x'.repeat(1025) },
    { ...member, type: 'role' },
    { ...member, role: 'admin' },
  ])('rejects invalid principals and roles: %p', (entry) => {
    expect(
      createAccessControlSchema(roles).safeParse({ access_mode: 'private', entries: [entry] })
        .success
    ).toBe(false);
  });
  it('bounds membership to 100 entries', () => {
    expect(
      createAccessControlSchema(roles).safeParse({
        access_mode: 'private',
        entries: Array.from({ length: 101 }, (_, index) => ({ ...member, id: String(index) })),
      }).success
    ).toBe(false);
  });
  it('rejects duplicate principals', () => {
    expect(() =>
      prepareAccessControl({
        input: { access_mode: 'private', entries: [member, member] },
        roles,
        ownerId: 'owner',
      })
    ).toThrow('Duplicate');
  });
  it('removes owner entries and preserves membership dates when roles change', () => {
    expect(
      prepareAccessControl({
        input: {
          access_mode: 'private',
          entries: [
            { ...member, role: 'editor' },
            { ...member, id: 'owner' },
          ],
        },
        roles,
        ownerId: 'owner',
        previous: privateAcl,
        now: '2026-09-11T00:00:00.000Z',
      })
    ).toEqual({ access_mode: 'private', entries: [{ ...member, role: 'editor', added_at: now }] });
  });
  it.each([
    ['owner', ['editor'], true],
    ['profile-a', ['member'], true],
    ['profile-a', ['editor'], false],
    ['stranger', ['member'], false],
    [undefined, ['member'], false],
  ] as const)('checks profile %s against allowed roles %s', (profileId, allowedRoles, expected) => {
    expect(
      hasEntityAccess({
        accessControl: privateAcl,
        ownerId: 'owner',
        profileId,
        roles: allowedRoles,
      })
    ).toBe(expected);
  });
  it.each(['private', 'public'] as const)(
    'allows administrators to manage %s entities without an owner profile or entry',
    (accessMode) => {
      expect(
        hasEntityAccess({
          accessControl: { ...privateAcl, access_mode: accessMode },
          ownerId: 'owner',
          profileId: undefined,
          roles: [],
          isAdmin: true,
        })
      ).toBe(true);
    }
  );
  it.each([
    ['owner', true, 'allowed'],
    [member.id, true, 'allowed'],
    ['outsider', true, 'admin_override'],
    ['outsider', false, 'denied'],
  ] as const)('resolves access for %s with admin=%s as %s', (profileId, isAdmin, expected) => {
    expect(
      resolveEntityAccess({
        accessControl: privateAcl,
        ownerId: 'owner',
        profileId,
        roles: ['member'],
        isAdmin,
      })
    ).toBe(expected);
  });

  it('does not attribute permitted public access to the admin override', () => {
    expect(
      resolveEntityAccess({
        accessControl: { access_mode: 'public', entries: [] },
        ownerId: 'owner',
        profileId: 'outsider',
        roles: [],
        allowPublic: true,
        isAdmin: true,
      })
    ).toBe('allowed');
  });

  it('does not treat a consumer role named admin as an administrator override', () => {
    expect(
      hasEntityAccess({
        accessControl: {
          access_mode: 'private',
          entries: [{ ...member, role: 'admin', added_at: now }],
        },
        ownerId: 'owner',
        profileId: member.id,
        roles: [],
      })
    ).toBe(false);
  });
  it('grants public access only when the operation permits it', () => {
    const accessControl = { ...privateAcl, access_mode: 'public' as const };
    expect(
      hasEntityAccess({
        accessControl,
        ownerId: 'owner',
        profileId: undefined,
        roles: [],
        allowPublic: true,
      })
    ).toBe(true);
    expect(
      hasEntityAccess({ accessControl, ownerId: 'owner', profileId: undefined, roles: [] })
    ).toBe(false);
  });
  it('does not match ownerless resources to users without profiles', () => {
    expect(
      hasEntityAccess({
        accessControl: privateAcl,
        ownerId: undefined,
        profileId: undefined,
        roles: [],
      })
    ).toBe(false);
  });
  it('matches the principal type and profile within the same nested entry', () => {
    const query = buildEntityReadAccessQuery({
      profileId: 'profile-a',
      ownerField: 'owner',
      accessControlField: 'access',
    });
    expect(query?.bool?.should).toContainEqual({
      nested: {
        path: 'access.entries',
        ignore_unmapped: true,
        score_mode: 'none',
        query: {
          bool: {
            filter: [
              { term: { 'access.entries.type': 'user' } },
              { term: { 'access.entries.id': 'profile-a' } },
            ],
          },
        },
      },
    });
  });
  it('includes all entities in the ACL filter for administrators', () => {
    expect(
      buildEntityReadAccessQuery({
        ownerField: 'owner',
        accessControlField: 'access',
        isAdmin: true,
      })
    ).toEqual({ match_all: {} });
  });
  it('requires an explicit migration policy to include missing ACLs in searches', () => {
    const query = buildEntityReadAccessQuery({ ownerField: 'owner', accessControlField: 'access' });
    expect(query?.bool?.should).toEqual([{ term: { 'access.access_mode': 'public' } }]);
  });
});
