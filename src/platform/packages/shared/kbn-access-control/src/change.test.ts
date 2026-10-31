/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AclChangeError, MAX_ACL_ENTRIES, prepareAclChange, prepareInitialAcl } from './change';
import { evaluateAcl } from './evaluate';
import { FIXTURE_POLICY as policy, FIXTURE_PROBES } from './contract/shapes';
import type { AclChange, CanonicalAcl, Principal } from './types';

const NOW = '2026-10-30T00:00:00.000Z';
const EARLIER = '2026-10-01T00:00:00.000Z';
const OWNER = FIXTURE_PROBES.owner;
const GRANTEE = FIXTURE_PROBES.grantee;
const STRANGER = FIXTURE_PROBES.stranger;

const stored: CanonicalAcl = {
  version: [1],
  owner: { type: ['user'], id: [OWNER.id] },
  general_access: ['none'],
  entries: [{ type: ['user'], id: [GRANTEE.id], access: ['use'], added_at: [EARLIER] }],
};

const change = (
  current: CanonicalAcl | undefined,
  principal: Principal | undefined,
  aclChange: AclChange,
  { recovery = false, enabled = true } = {}
) =>
  prepareAclChange({
    policy,
    current,
    decision: evaluateAcl({ policy, acl: current, principal, recovery }),
    principal,
    change: aclChange,
    enabled,
    now: NOW,
  });

const expectError = (fn: () => unknown, code: string) => {
  expect(fn).toThrow(AclChangeError);
  try {
    fn();
  } catch (error) {
    expect(error.code).toBe(code);
  }
};

describe('prepareInitialAcl', () => {
  it('makes the creator the owner with the default general access', () => {
    expect(prepareInitialAcl({ policy, principal: OWNER, enabled: true, now: NOW })).toEqual({
      next: { version: 1, owner: OWNER, general_access: 'edit', entries: [] },
      grantsToCheck: [],
    });
  });

  it('stores requested entries and asks to check their recipients', () => {
    const result = prepareInitialAcl({
      policy,
      principal: OWNER,
      requested: {
        general_access: 'none',
        entries: [
          { ...GRANTEE, access: 'use' },
          { ...OWNER, access: 'use' },
        ],
      },
      enabled: true,
      now: NOW,
    });

    expect(result?.next.entries).toEqual([{ ...GRANTEE, access: 'use', added_at: NOW }]);
    expect(result?.grantsToCheck).toEqual([GRANTEE]);
  });

  it('writes no ACL when disabled, and rejects requested access', () => {
    expect(
      prepareInitialAcl({ policy, principal: OWNER, enabled: false, now: NOW })
    ).toBeUndefined();
    expectError(
      () =>
        prepareInitialAcl({
          policy,
          principal: OWNER,
          requested: { general_access: 'edit' },
          enabled: false,
          now: NOW,
        }),
      'bad_request'
    );
  });

  it('cannot restrict an object nobody can own', () => {
    expect(
      prepareInitialAcl({ policy, requested: { general_access: 'edit' }, enabled: true, now: NOW })
    ).toBeUndefined();
    expectError(
      () =>
        prepareInitialAcl({
          policy,
          requested: { general_access: 'use' },
          enabled: true,
          now: NOW,
        }),
      'bad_request'
    );
  });

  it.each([
    ['an unknown general access', { general_access: 'view' as const }],
    ['a level the type cannot grant', { entries: [{ ...GRANTEE, access: 'edit' as const }] }],
    [
      'a duplicate principal',
      {
        entries: [
          { ...GRANTEE, access: 'use' as const },
          { ...GRANTEE, access: 'use' as const },
        ],
      },
    ],
    [
      'too many entries',
      {
        entries: Array.from({ length: MAX_ACL_ENTRIES + 1 }, (_, index) => ({
          type: 'user' as const,
          id: `u_${index}`,
          access: 'use' as const,
        })),
      },
    ],
  ])('rejects %s', (_, requested) => {
    expectError(
      () => prepareInitialAcl({ policy, principal: OWNER, requested, enabled: true, now: NOW }),
      'bad_request'
    );
  });
});

describe('prepareAclChange', () => {
  it('rejects every change when disabled', () => {
    expectError(
      () => change(stored, OWNER, { kind: 'transfer', owner: GRANTEE }, { enabled: false }),
      'bad_request'
    );
  });

  describe('replace', () => {
    it('keeps added_at for existing principals and checks only new or higher grants', () => {
      const result = change(stored, OWNER, {
        kind: 'replace',
        general_access: 'use',
        entries: [
          { ...GRANTEE, access: 'use' },
          { ...STRANGER, access: 'use' },
        ],
      });

      expect(result).toEqual({
        next: {
          version: 1,
          owner: OWNER,
          general_access: 'use',
          entries: [
            { ...GRANTEE, access: 'use', added_at: EARLIER },
            { ...STRANGER, access: 'use', added_at: NOW },
          ],
        },
        grantsToCheck: [STRANGER],
      });
    });

    it('requires access management', () => {
      expectError(
        () => change(stored, GRANTEE, { kind: 'replace', general_access: 'none', entries: [] }),
        'forbidden'
      );
    });

    it('lets recovery repair a damaged ACL', () => {
      const result = change(
        { ...stored, version: [2] },
        STRANGER,
        { kind: 'replace', general_access: 'none', entries: [] },
        { recovery: true }
      );

      expect(result.next).toEqual({
        version: 1,
        owner: OWNER,
        general_access: 'none',
        entries: [],
      });
    });
  });

  describe('claim', () => {
    it('makes an editor of an object without an ACL its owner', () => {
      expect(change(undefined, GRANTEE, { kind: 'claim', general_access: 'none' }).next).toEqual({
        version: 1,
        owner: GRANTEE,
        general_access: 'none',
        entries: [],
      });
    });

    it('fails when the object already has an ACL', () => {
      expectError(() => change(stored, OWNER, { kind: 'claim' }), 'conflict');
    });

    it('needs a principal', () => {
      expectError(() => change(undefined, undefined, { kind: 'claim' }), 'bad_request');
    });
  });

  describe('transfer', () => {
    it('replaces the owner and removes the new owner entry', () => {
      const result = change(stored, OWNER, { kind: 'transfer', owner: GRANTEE });

      expect(result).toEqual({
        next: { version: 1, owner: GRANTEE, general_access: 'none', entries: [] },
        grantsToCheck: [GRANTEE],
      });
    });

    it('is allowed to the owner and to recovery only', () => {
      expectError(() => change(stored, GRANTEE, { kind: 'transfer', owner: GRANTEE }), 'forbidden');
      expect(
        change(stored, STRANGER, { kind: 'transfer', owner: STRANGER }, { recovery: true }).next
          .owner
      ).toEqual(STRANGER);
    });
  });
});
