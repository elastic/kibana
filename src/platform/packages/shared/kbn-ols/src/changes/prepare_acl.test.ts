/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  FIXTURE_POLICY as policy,
  FIXTURE_POLICY_ALL_LEVELS,
  FIXTURE_PROBES,
} from '../__fixtures__';
import type { AclGrant, StoredAcl } from '../acl';
import { evaluateAcl } from '../evaluation';
import type { Principal } from '../principals';
import { AclChangeError, type AclChangeErrorCode } from './acl_change_error';
import {
  MAX_ACL_ENTRIES,
  prepareAclChange,
  prepareInitialAcl,
  type AclChange,
} from './prepare_acl';

const NOW = '2026-10-30T00:00:00.000Z';
const EARLIER = '2026-10-01T00:00:00.000Z';
const OWNER = FIXTURE_PROBES.owner;
const GRANTEE = FIXTURE_PROBES.grantee;
const STRANGER = FIXTURE_PROBES.stranger;

const stored: StoredAcl = {
  version: [1],
  owner: { type: ['user'], id: [OWNER.id] },
  general_access: ['none'],
  entries: [{ type: ['user'], id: [GRANTEE.id], access: ['use'], added_at: [EARLIER] }],
};

const change = (
  current: StoredAcl | undefined,
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

const userEntries = (count: number): AclGrant[] =>
  Array.from({ length: count }, (_, index) => ({
    type: 'user',
    id: `u_${index}`,
    access: 'use',
  }));

const getError = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected an error.');
};

const expectError = (fn: () => unknown, code: AclChangeErrorCode) => {
  const error = getError(fn);
  expect(error).toBeInstanceOf(AclChangeError);
  expect(error).toMatchObject({ code });
};

describe('prepareInitialAcl', () => {
  it('makes the creator the owner with the default general access', () => {
    expect(prepareInitialAcl({ policy, principal: OWNER, enabled: true, now: NOW })).toEqual({
      next: { version: 1, owner: OWNER, general_access: 'edit', entries: [] },
      principalsToCheck: [],
    });
  });

  it('stores requested entries, drops the owner entry, and asks to check the recipients', () => {
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

    expect(result).toEqual({
      next: {
        version: 1,
        owner: OWNER,
        general_access: 'none',
        entries: [{ ...GRANTEE, access: 'use', added_at: NOW }],
      },
      principalsToCheck: [GRANTEE],
    });
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

  it('writes no ACL without a principal, and rejects any access but the default', () => {
    expect(
      prepareInitialAcl({ policy, requested: { general_access: 'edit' }, enabled: true, now: NOW })
    ).toBeUndefined();
    expect(prepareInitialAcl({ policy, enabled: true, now: NOW })).toBeUndefined();

    for (const requested of [
      { general_access: 'use' as const },
      { entries: [{ ...GRANTEE, access: 'use' as const }] },
    ]) {
      expectError(
        () => prepareInitialAcl({ policy, requested, enabled: true, now: NOW }),
        'bad_request'
      );
    }
    // A broader value than the default would be lost, so it's refused too.
    expectError(
      () =>
        prepareInitialAcl({
          policy: { ...policy, defaultGeneralAccessLevel: 'use' },
          requested: { general_access: 'edit' },
          enabled: true,
          now: NOW,
        }),
      'bad_request'
    );
  });

  it('accepts the most entries, and counts an entry for the owner toward them', () => {
    const prepare = (entries: AclGrant[]) =>
      prepareInitialAcl({
        policy,
        principal: OWNER,
        requested: { entries },
        enabled: true,
        now: NOW,
      });

    expect(prepare(userEntries(MAX_ACL_ENTRIES))?.next.entries).toHaveLength(MAX_ACL_ENTRIES);
    expect(
      prepare([...userEntries(MAX_ACL_ENTRIES - 1), { ...OWNER, access: 'use' }])?.next.entries
    ).toHaveLength(MAX_ACL_ENTRIES - 1);
    expectError(
      () => prepare([...userEntries(MAX_ACL_ENTRIES), { ...OWNER, access: 'use' }]),
      'bad_request'
    );
  });

  it('rejects an owner that is not a valid principal', () => {
    for (const principal of [
      { type: 'group' as Principal['type'], id: 'g_1' },
      { type: 'user' as const, id: '' },
    ]) {
      expectError(
        () => prepareInitialAcl({ policy, principal, enabled: true, now: NOW }),
        'bad_request'
      );
    }
  });

  it('refuses a current time that is not a timestamp', () => {
    for (const now of ['', 'yesterday']) {
      expect(() => prepareInitialAcl({ policy, principal: OWNER, enabled: true, now })).toThrow(
        TypeError
      );
      expect(() =>
        prepareAclChange({
          policy,
          current: stored,
          decision: evaluateAcl({ policy, acl: stored, principal: OWNER }),
          principal: OWNER,
          change: { kind: 'transfer', owner: GRANTEE },
          enabled: true,
          now,
        })
      ).toThrow(TypeError);
    }
  });

  it.each<[string, Parameters<typeof prepareInitialAcl>[0]['requested']]>([
    ['a general access the type does not allow', { general_access: 'view' }],
    ['a level the type cannot grant', { entries: [{ ...GRANTEE, access: 'edit' }] }],
    [
      'a duplicate principal',
      {
        entries: [
          { ...GRANTEE, access: 'use' },
          { ...GRANTEE, access: 'use' },
        ],
      },
    ],
    ['too many entries', { entries: userEntries(MAX_ACL_ENTRIES + 1) }],
    ['far too many entries', { entries: userEntries(MAX_ACL_ENTRIES * 10) }],
    [
      'an unknown principal kind',
      { entries: [{ type: 'group' as Principal['type'], id: 'g_1', access: 'use' }] },
    ],
    ['an empty principal ID', { entries: [{ type: 'user', id: '', access: 'use' }] }],
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

  // Each change is refused for its own reason: the object has no owner yet, already has an ACL, or
  // the caller lacks the operation. A caller who can't view the object must get none of them.
  describe('a caller who cannot view the object', () => {
    const privatePolicy = { ...policy, defaultGeneralAccessLevel: 'none' as const };
    const states: Array<[string, StoredAcl | undefined]> = [
      ['a valid ACL', stored],
      ['an invalid ACL', { ...stored, version: [2] }],
      ['no ACL', undefined],
    ];
    const changes: AclChange[] = [
      { kind: 'replace', general_access: 'none', entries: [] },
      { kind: 'claim' },
      { kind: 'transfer', owner: STRANGER },
    ];

    it.each(
      states.flatMap(([stateName, current]) =>
        changes.map((aclChange) => [aclChange.kind, stateName, current, aclChange] as const)
      )
    )('gets not_found for a %s of an object with %s', (_, __, current, aclChange) => {
      for (const principal of [STRANGER, undefined]) {
        expectError(
          () =>
            prepareAclChange({
              policy: privatePolicy,
              current,
              decision: evaluateAcl({ policy: privatePolicy, acl: current, principal }),
              principal,
              change: aclChange,
              enabled: true,
              now: NOW,
            }),
          'not_found'
        );
      }
    });
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
        principalsToCheck: [STRANGER],
      });
    });

    it('dates a kept entry that has no stored added_at with the current time', () => {
      const result = change(
        { ...stored, entries: [{ ...stored.entries[0], added_at: [] }] },
        OWNER,
        { kind: 'replace', general_access: 'none', entries: [{ ...GRANTEE, access: 'use' }] }
      );

      expect(result.next.entries).toEqual([{ ...GRANTEE, access: 'use', added_at: NOW }]);
      expect(result.principalsToCheck).toEqual([]);
    });

    it('requires access management', () => {
      expectError(
        () => change(stored, GRANTEE, { kind: 'replace', general_access: 'none', entries: [] }),
        'forbidden'
      );
    });

    it('lets recovery repair an invalid ACL, and checks every grant it revives', () => {
      const result = change(
        { ...stored, version: [2] },
        STRANGER,
        { kind: 'replace', general_access: 'none', entries: [{ ...GRANTEE, access: 'use' }] },
        { recovery: true }
      );

      expect(result).toEqual({
        next: {
          version: 1,
          owner: OWNER,
          general_access: 'none',
          entries: [{ ...GRANTEE, access: 'use', added_at: EARLIER }],
        },
        principalsToCheck: [OWNER, GRANTEE],
      });
    });

    it.each([
      ['no owner', { type: [], id: [] }],
      ['an owner with two known kinds', { type: ['user', 'service_account'], id: [OWNER.id] }],
      ['an owner with several IDs', { type: ['user'], id: [OWNER.id, GRANTEE.id] }],
    ])('leaves an ACL with %s to a transfer', (_, owner) => {
      expectError(
        () =>
          change(
            { ...stored, owner },
            STRANGER,
            { kind: 'replace', general_access: 'none', entries: [] },
            { recovery: true }
          ),
        'bad_request'
      );
    });

    it('refuses an owner with several IDs even when one of them asks', () => {
      expectError(
        () =>
          change({ ...stored, owner: { type: ['user'], id: [OWNER.id, GRANTEE.id] } }, OWNER, {
            kind: 'replace',
            general_access: 'none',
            entries: [],
          }),
        'bad_request'
      );
    });

    it('refuses an object without an ACL, which needs a claim first', () => {
      expectError(
        () => change(undefined, OWNER, { kind: 'replace', general_access: 'none', entries: [] }),
        'bad_request'
      );
    });

    it('checks a raised grant, but not a lowered or unchanged one', () => {
      const current: StoredAcl = {
        ...stored,
        entries: [
          { type: ['user'], id: ['u_raised'], access: ['view'], added_at: [EARLIER] },
          { type: ['user'], id: ['u_lowered'], access: ['edit'], added_at: [EARLIER] },
          { type: ['user'], id: ['u_same'], access: ['use'], added_at: [EARLIER] },
        ],
      };
      const result = prepareAclChange({
        policy: FIXTURE_POLICY_ALL_LEVELS,
        current,
        decision: evaluateAcl({
          policy: FIXTURE_POLICY_ALL_LEVELS,
          acl: current,
          principal: OWNER,
        }),
        principal: OWNER,
        change: {
          kind: 'replace',
          general_access: 'none',
          entries: [
            { type: 'user', id: 'u_raised', access: 'use' },
            { type: 'user', id: 'u_lowered', access: 'use' },
            { type: 'user', id: 'u_same', access: 'use' },
          ],
        },
        enabled: true,
        now: NOW,
      });

      expect(result.principalsToCheck).toEqual([{ type: 'user', id: 'u_raised' }]);
      // The grant keeps its first date when its level changes.
      expect(result.next.entries.map(({ added_at: addedAt }) => addedAt)).toEqual([
        EARLIER,
        EARLIER,
        EARLIER,
      ]);
    });

    it('drops an entry for the owner', () => {
      expect(
        change(stored, OWNER, {
          kind: 'replace',
          general_access: 'none',
          entries: [{ ...OWNER, access: 'use' }],
        }).next.entries
      ).toEqual([]);
    });

    it('lets an entry at manage replace access, but not transfer ownership', () => {
      const managerPolicy = { ...policy, entryLevels: ['use' as const, 'manage' as const] };
      const current: StoredAcl = {
        ...stored,
        entries: [{ type: ['user'], id: [GRANTEE.id], access: ['manage'], added_at: [EARLIER] }],
      };
      const decision = evaluateAcl({ policy: managerPolicy, acl: current, principal: GRANTEE });
      const prepare = (aclChange: AclChange) =>
        prepareAclChange({
          policy: managerPolicy,
          current,
          decision,
          principal: GRANTEE,
          change: aclChange,
          enabled: true,
          now: NOW,
        });

      expect(prepare({ kind: 'replace', general_access: 'use', entries: [] }).next.owner).toEqual(
        OWNER
      );
      expectError(() => prepare({ kind: 'transfer', owner: GRANTEE }), 'forbidden');
    });
  });

  describe('claim', () => {
    it('makes an editor of an object without an ACL its owner', () => {
      expect(change(undefined, GRANTEE, { kind: 'claim', general_access: 'none' })).toEqual({
        next: { version: 1, owner: GRANTEE, general_access: 'none', entries: [] },
        principalsToCheck: [],
      });
      expect(change(undefined, GRANTEE, { kind: 'claim' }).next.general_access).toBe('edit');
    });

    it('fails when the object already has an ACL, even an invalid one', () => {
      expectError(() => change(stored, OWNER, { kind: 'claim' }), 'conflict');
      expectError(
        () => change({ ...stored, version: [2] }, OWNER, { kind: 'claim' }, { recovery: true }),
        'conflict'
      );
    });

    it('needs edit and a principal', () => {
      expectError(() => change(undefined, undefined, { kind: 'claim' }), 'bad_request');
      expectError(
        () =>
          prepareAclChange({
            policy: { ...policy, defaultGeneralAccessLevel: 'use' },
            decision: evaluateAcl({
              policy: { ...policy, defaultGeneralAccessLevel: 'use' },
              principal: GRANTEE,
            }),
            principal: GRANTEE,
            change: { kind: 'claim' },
            enabled: true,
            now: NOW,
          }),
        'forbidden'
      );
    });

    it('rejects a general access the type does not allow, and an invalid principal', () => {
      expectError(
        () => change(undefined, GRANTEE, { kind: 'claim', general_access: 'view' }),
        'bad_request'
      );
      expectError(
        () => change(undefined, { type: 'user', id: '' }, { kind: 'claim' }),
        'bad_request'
      );
    });

    it('never lets recovery claim an object it can only view', () => {
      const privatePolicy = { ...policy, defaultGeneralAccessLevel: 'none' as const };
      expectError(
        () =>
          prepareAclChange({
            policy: privatePolicy,
            decision: evaluateAcl({ policy: privatePolicy, principal: STRANGER, recovery: true }),
            principal: STRANGER,
            change: { kind: 'claim' },
            enabled: true,
            now: NOW,
          }),
        'forbidden'
      );
    });
  });

  describe('transfer', () => {
    it('replaces the owner and removes the new owner entry', () => {
      expect(change(stored, OWNER, { kind: 'transfer', owner: GRANTEE })).toEqual({
        next: { version: 1, owner: GRANTEE, general_access: 'none', entries: [] },
        principalsToCheck: [GRANTEE],
      });
    });

    it('is allowed to the owner and to recovery only', () => {
      expectError(() => change(stored, GRANTEE, { kind: 'transfer', owner: GRANTEE }), 'forbidden');
      expect(
        change(stored, STRANGER, { kind: 'transfer', owner: STRANGER }, { recovery: true }).next
          .owner
      ).toEqual(STRANGER);
    });

    it('repairs an invalid ACL into one Kibana writes, dating entries without added_at', () => {
      const damaged: StoredAcl = {
        version: [1, 2],
        owner: { type: ['user', 'service_account'], id: [OWNER.id] },
        general_access: ['use', 'none'],
        entries: [
          { type: ['user'], id: [GRANTEE.id, 'u_other'], access: ['use'], added_at: [] },
          { type: ['user', 'service_account'], id: ['u_ambiguous'], access: ['use'], added_at: [] },
        ],
      };

      expect(
        change(damaged, STRANGER, { kind: 'transfer', owner: STRANGER }, { recovery: true })
      ).toEqual({
        next: {
          version: 1,
          owner: STRANGER,
          general_access: 'none',
          entries: [
            { ...GRANTEE, access: 'use', added_at: NOW },
            { type: 'user', id: 'u_other', access: 'use', added_at: NOW },
          ],
        },
        principalsToCheck: [STRANGER],
      });
    });

    it('keeps entries past MAX_ACL_ENTRIES, so that they never block a repair', () => {
      const ids = Array.from({ length: MAX_ACL_ENTRIES + 1 }, (_, i) => `u_${i}`);
      const oversized: StoredAcl = {
        version: [1],
        owner: { type: ['user', 'service_account'], id: [OWNER.id] },
        general_access: ['none'],
        entries: [{ type: ['user'], id: ids, access: ['use'], added_at: [EARLIER] }],
      };

      expect(
        change(oversized, STRANGER, { kind: 'transfer', owner: STRANGER }, { recovery: true }).next
          .entries
      ).toHaveLength(MAX_ACL_ENTRIES + 1);
    });

    it('drops an entry stored for the former owner', () => {
      const current: StoredAcl = {
        ...stored,
        entries: [
          ...stored.entries,
          { type: ['user'], id: [OWNER.id], access: ['use'], added_at: [EARLIER] },
        ],
      };

      expect(change(current, OWNER, { kind: 'transfer', owner: STRANGER }).next.entries).toEqual([
        { ...GRANTEE, access: 'use', added_at: EARLIER },
      ]);
    });

    it('rejects an object without an ACL, and an invalid new owner', () => {
      expectError(
        () => change(undefined, GRANTEE, { kind: 'transfer', owner: GRANTEE }, { recovery: true }),
        'bad_request'
      );
      expectError(
        () => change(stored, OWNER, { kind: 'transfer', owner: { type: 'user', id: '' } }),
        'bad_request'
      );
    });
  });
});
