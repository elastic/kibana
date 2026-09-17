/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-server';
import {
  buildSavedObjectAccessControlFilter,
  hasSavedObjectAccess,
  isAccessRestricted,
  prepareSavedObjectAccessControl,
} from './access_control';

const roles = ['executor'] as const;
const now = '2026-09-10T00:00:00.000Z';
const restricted: SavedObjectAccessControl = {
  owner: 'u_alice_0',
  accessMode: 'private',
  entries: [{ type: 'user', id: 'u_bob_0', role: 'executor', added_at: now }],
};

describe('saved object access control', () => {
  describe('isAccessRestricted', () => {
    it.each([
      [undefined, false],
      [{ owner: 'u_alice_0', accessMode: 'default' as const }, false],
      [{ owner: 'u_alice_0', accessMode: 'write_restricted' as const }, false],
      [{ owner: 'u_alice_0', accessMode: 'private' as const }, true],
    ])('returns %p for %p', (accessControl, expected) => {
      expect(isAccessRestricted(accessControl)).toBe(expected);
    });
  });

  describe('hasSavedObjectAccess', () => {
    it('allows everyone when the object is not restricted', () => {
      expect(
        hasSavedObjectAccess({
          accessControl: { owner: 'u_alice_0', accessMode: 'write_restricted' },
          profileUid: 'u_carol_0',
        })
      ).toBe(true);
      expect(hasSavedObjectAccess({ profileUid: 'u_carol_0' })).toBe(true);
    });

    it('allows the owner regardless of the roles required', () => {
      expect(
        hasSavedObjectAccess({ accessControl: restricted, profileUid: 'u_alice_0', roles: [] })
      ).toBe(true);
    });

    it('allows a granted principal only for the roles that permit the operation', () => {
      expect(hasSavedObjectAccess({ accessControl: restricted, profileUid: 'u_bob_0' })).toBe(true);
      expect(
        hasSavedObjectAccess({
          accessControl: restricted,
          profileUid: 'u_bob_0',
          roles: ['executor'],
        })
      ).toBe(true);
      expect(
        hasSavedObjectAccess({ accessControl: restricted, profileUid: 'u_bob_0', roles: [] })
      ).toBe(false);
    });

    it('denies unlisted and unidentified callers', () => {
      expect(hasSavedObjectAccess({ accessControl: restricted, profileUid: 'u_carol_0' })).toBe(
        false
      );
      expect(hasSavedObjectAccess({ accessControl: restricted })).toBe(false);
    });
  });

  describe('prepareSavedObjectAccessControl', () => {
    it('assigns timestamps and keeps the owner', () => {
      expect(
        prepareSavedObjectAccessControl({
          accessMode: 'private',
          entries: [{ type: 'user', id: 'u_bob_0', role: 'executor' }],
          roles,
          owner: 'u_alice_0',
          now,
        })
      ).toEqual(restricted);
    });

    it('preserves membership dates of unchanged principals', () => {
      const prepared = prepareSavedObjectAccessControl({
        accessMode: 'private',
        entries: [{ type: 'user', id: 'u_bob_0', role: 'executor' }],
        roles,
        owner: 'u_alice_0',
        previous: restricted,
        now: '2026-10-01T00:00:00.000Z',
      });
      expect(prepared.entries).toEqual(restricted.entries);
    });

    it('drops entries for the owner', () => {
      const prepared = prepareSavedObjectAccessControl({
        accessMode: 'private',
        entries: [{ type: 'user', id: 'u_alice_0', role: 'executor' }],
        roles,
        owner: 'u_alice_0',
        now,
      });
      expect(prepared.entries).toEqual([]);
    });

    it('rejects unsupported roles and duplicate principals', () => {
      expect(() =>
        prepareSavedObjectAccessControl({
          accessMode: 'private',
          entries: [{ type: 'user', id: 'u_bob_0', role: 'editor' }],
          roles,
          owner: 'u_alice_0',
        })
      ).toThrow();
      expect(() =>
        prepareSavedObjectAccessControl({
          accessMode: 'private',
          entries: [
            { type: 'user', id: 'u_bob_0', role: 'executor' },
            { type: 'user', id: 'u_bob_0', role: 'executor' },
          ],
          roles,
          owner: 'u_alice_0',
        })
      ).toThrow('Duplicate');
    });
  });

  describe('buildSavedObjectAccessControlFilter', () => {
    it('matches unrestricted objects, owned objects and granted objects', () => {
      expect(buildSavedObjectAccessControlFilter('u_bob_0')).toEqual({
        bool: {
          should: [
            { bool: { must_not: { term: { 'accessControl.accessMode': 'private' } } } },
            { term: { 'accessControl.owner': 'u_bob_0' } },
            { term: { 'accessControl.entries.id': 'u_bob_0' } },
          ],
          minimum_should_match: 1,
        },
      });
    });

    it('matches only unrestricted objects without a profile', () => {
      expect(buildSavedObjectAccessControlFilter()).toEqual({
        bool: {
          should: [{ bool: { must_not: { term: { 'accessControl.accessMode': 'private' } } } }],
          minimum_should_match: 1,
        },
      });
    });
  });
});
