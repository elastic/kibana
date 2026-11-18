/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ACL_SHAPE_FIXTURES,
  FIXTURE_POLICY,
  FIXTURE_PROBES,
  type FixtureProbe,
} from '../__fixtures__';
import { normalizeAclSource, type AclState, type StoredAcl } from '../acl';
import { compareLevels, type EntryLevel } from '../levels';
import {
  evaluateAcl,
  generalAccessPermits,
  isRestricted,
  toObjectDecision,
  type AclDecision,
} from './evaluate_acl';

/**
 * The levels each expectation is checked at, and the operation that stands for each of them in
 * the fixture policy. Access management stands for `manage`.
 */
const LEVEL_OPERATIONS: Array<[EntryLevel, string]> = [
  ['view', 'view'],
  ['use', 'use'],
  ['edit', 'edit'],
  ['manage', 'manage_access'],
];

const PROBES = Object.keys(FIXTURE_PROBES) as FixtureProbe[];

const reaches = (probeLevel: EntryLevel | undefined, level: EntryLevel) =>
  !!probeLevel && compareLevels(probeLevel, level) >= 0;

const OWNER = FIXTURE_PROBES.owner;
const GRANTEE = FIXTURE_PROBES.grantee;

const acl = (overrides: Partial<StoredAcl> = {}): StoredAcl => ({
  version: [1],
  owner: { type: ['user'], id: [OWNER.id] },
  general_access: ['none'],
  entries: [],
  ...overrides,
});

const sorted = (operations: ReadonlySet<string>) => [...operations].sort();

describe('evaluateAcl', () => {
  it.each(ACL_SHAPE_FIXTURES.map((fixture) => [fixture.name, fixture]))(
    'grants exactly the access the fixture table expects: %s',
    (_, { source, policy = FIXTURE_POLICY, state, access }) => {
      const stored = normalizeAclSource(source);
      for (const probe of PROBES) {
        const decision = evaluateAcl({ policy, acl: stored, principal: FIXTURE_PROBES[probe] });
        expect({ probe, state: decision.state }).toEqual({ probe, state });
        for (const [level, operation] of LEVEL_OPERATIONS) {
          expect({ probe, level, allowed: decision.operations.has(operation) }).toEqual({
            probe,
            level,
            allowed: reaches(access[probe], level),
          });
        }
      }
    }
  );

  // A list filter shows every object in a recovery space at `view` only, and applies the ordinary
  // rules above it. Recovery here has to agree: it adds viewing, access management, and transfer,
  // and never an operation above `view` that the type defines.
  it.each(ACL_SHAPE_FIXTURES.map((fixture) => [fixture.name, fixture]))(
    'lets recovery view every object and adds nothing the type defines above view: %s',
    (_, { source, policy = FIXTURE_POLICY, state }) => {
      const stored = normalizeAclSource(source);
      for (const probe of PROBES) {
        const principal = FIXTURE_PROBES[probe];
        const ordinary = evaluateAcl({ policy, acl: stored, principal });
        const withRecovery = evaluateAcl({ policy, acl: stored, principal, recovery: true });

        const expected = new Set(ordinary.operations);
        expected.add('view');
        if (state !== 'absent') {
          expected.add('manage_access');
          expected.add('transfer');
        }
        expect({ probe, operations: sorted(withRecovery.operations) }).toEqual({
          probe,
          operations: sorted(expected),
        });
        expect({ probe, viaRecovery: sorted(withRecovery.operationsViaRecovery) }).toEqual({
          probe,
          viaRecovery: [...expected].filter((op) => !ordinary.operations.has(op)).sort(),
        });
      }
    }
  );

  // Shapes that the reader handles in a special way. They make the ACL absent or invalid, and the
  // decision has to follow from that state alone.
  it.each<[string, Record<string, unknown>, AclState]>([
    ['a key the mapping does not know, alone under acl', { acl: { foo: 'bar' } }, 'absent'],
    ['an entry with only added_at', { acl: { entries: [{ added_at: '2026-10-21' }] } }, 'invalid'],
    ['an empty string', { acl: { general_access: '' } }, 'invalid'],
    [
      'sibling dotted entry keys',
      {
        acl: {
          version: 1,
          owner: { type: 'user', id: OWNER.id },
          general_access: 'none',
          'entries.type': 'user',
          'entries.id': GRANTEE.id,
          'entries.access': 'use',
        },
      },
      'valid',
    ],
  ])('decides %s from its state alone', (_, source, state) => {
    const stored = normalizeAclSource(source);
    const grantee = evaluateAcl({ policy: FIXTURE_POLICY, acl: stored, principal: GRANTEE });
    const anonymous = evaluateAcl({ policy: FIXTURE_POLICY, acl: stored });

    expect(grantee.state).toBe(state);
    // The type's default applies without an ACL. A damaged ACL grants nothing, and the separated
    // dotted entry keys don't combine into a grant.
    const expectedLevel = state === 'absent' ? FIXTURE_POLICY.defaultGeneralAccessLevel : 'none';
    expect(grantee.level).toBe(expectedLevel);
    expect(anonymous.level).toBe(expectedLevel);
  });

  it('gives the owner every operation, access management, and transfer', () => {
    const decision = evaluateAcl({ policy: FIXTURE_POLICY, acl: acl(), principal: OWNER });

    expect(decision).toMatchObject({ state: 'valid', level: 'none', isOwner: true });
    expect(sorted(decision.operations)).toEqual([
      'delete',
      'edit',
      'manage_access',
      'transfer',
      'use',
      'view',
    ]);
    expect(decision.operationsViaRecovery.size).toBe(0);
  });

  it('gives a use grantee view and use only', () => {
    const decision = evaluateAcl({
      policy: FIXTURE_POLICY,
      acl: acl({
        entries: [{ type: ['user'], id: [GRANTEE.id], access: ['use'], added_at: [] }],
      }),
      principal: GRANTEE,
    });

    expect(decision).toMatchObject({ level: 'use', isOwner: false, restricted: true });
    expect(sorted(decision.operations)).toEqual(['use', 'view']);
  });

  it('gives an entry at manage access management, but not transfer', () => {
    const decision = evaluateAcl({
      policy: { ...FIXTURE_POLICY, entryLevels: ['use', 'manage'] },
      acl: acl({
        entries: [{ type: ['user'], id: [GRANTEE.id], access: ['manage'], added_at: [] }],
      }),
      principal: GRANTEE,
    });

    expect(decision.level).toBe('manage');
    expect(decision.operations.has('manage_access')).toBe(true);
    expect(decision.operations.has('transfer')).toBe(false);
  });

  it('lets recovery view, manage access, and transfer, but never use, edit, or delete', () => {
    const decision = evaluateAcl({
      policy: FIXTURE_POLICY,
      acl: acl(),
      principal: GRANTEE,
      recovery: true,
    });

    expect(sorted(decision.operations)).toEqual(['manage_access', 'transfer', 'view']);
    expect(sorted(decision.operationsViaRecovery)).toEqual(['manage_access', 'transfer', 'view']);
  });

  it('lets recovery see and repair an invalid ACL, which still grants its owner nothing', () => {
    const decision = evaluateAcl({
      policy: FIXTURE_POLICY,
      acl: acl({ version: [2] }),
      principal: OWNER,
      recovery: true,
    });

    expect(decision).toMatchObject({ state: 'invalid', level: 'none', isOwner: false });
    expect(sorted(decision.operations)).toEqual(['manage_access', 'transfer', 'view']);
  });

  it('lets recovery only view an object without an ACL', () => {
    const decision = evaluateAcl({
      policy: {
        ...FIXTURE_POLICY,
        generalAccessLevels: ['none'],
        defaultGeneralAccessLevel: 'none',
      },
      principal: GRANTEE,
      recovery: true,
    });

    expect(sorted(decision.operations)).toEqual(['view']);
    expect(sorted(decision.operationsViaRecovery)).toEqual(['view']);
  });

  it('marks only a valid ACL narrower than the default as restricted', () => {
    expect(evaluateAcl({ policy: FIXTURE_POLICY }).restricted).toBe(false);
    expect(evaluateAcl({ policy: FIXTURE_POLICY, acl: acl({ version: [2] }) }).restricted).toBe(
      false
    );
    expect(evaluateAcl({ policy: FIXTURE_POLICY, acl: acl() }).restricted).toBe(true);
  });
});

describe('generalAccessPermits', () => {
  // General access is exactly what a request without a principal gets, so the shortcut has to
  // agree with the fixture table's `anonymous` probe for every shape.
  it.each(ACL_SHAPE_FIXTURES.map((fixture) => [fixture.name, fixture]))(
    'agrees with the access of a request without a principal: %s',
    (_, { source, policy = FIXTURE_POLICY, access }) => {
      const stored = normalizeAclSource(source);
      for (const operation of Object.keys(policy.operations)) {
        const level = policy.operations[operation].level;
        expect({ operation, permits: generalAccessPermits(policy, stored, operation) }).toEqual({
          operation,
          permits: reaches(access.anonymous, level),
        });
      }
    }
  );

  it('permits nothing for an operation the policy does not define', () => {
    expect(generalAccessPermits(FIXTURE_POLICY, undefined, 'manage_access')).toBe(false);
    expect(generalAccessPermits(FIXTURE_POLICY, undefined, 'teleport')).toBe(false);
  });
});

describe('isRestricted', () => {
  it('is true only for a valid ACL with lower general access or an entry', () => {
    expect(isRestricted(FIXTURE_POLICY, undefined)).toBe(false);
    expect(isRestricted(FIXTURE_POLICY, acl({ general_access: ['edit'] }))).toBe(false);
    expect(isRestricted(FIXTURE_POLICY, acl({ general_access: ['use'] }))).toBe(true);
    expect(
      isRestricted(
        FIXTURE_POLICY,
        acl({
          general_access: ['edit'],
          entries: [{ type: ['user'], id: [GRANTEE.id], access: ['use'], added_at: [] }],
        })
      )
    ).toBe(true);
    expect(isRestricted(FIXTURE_POLICY, acl({ version: [2] }))).toBe(false);
  });

  it('ignores entries that grant nothing', () => {
    for (const entry of [
      { type: [], id: [], access: [], added_at: ['2026-10-21'] },
      { type: ['user', 'service_account'], id: [GRANTEE.id], access: ['use'], added_at: [] },
      { type: ['user'], id: [GRANTEE.id], access: ['edit'], added_at: [] },
      { type: ['user'], id: [], access: ['use'], added_at: [] },
    ]) {
      expect(
        isRestricted(FIXTURE_POLICY, acl({ general_access: ['edit'], entries: [entry] }))
      ).toBe(false);
    }
  });
});

describe('toObjectDecision', () => {
  const decision = (operations: string[]): AclDecision => ({
    state: 'valid',
    level: 'none',
    isOwner: false,
    restricted: true,
    operations: new Set(operations),
    operationsViaRecovery: new Set(),
  });

  it('allows an operation the decision includes', () => {
    expect(toObjectDecision(decision(['view', 'use']), 'use')).toEqual({ status: 'allowed' });
  });

  it('forbids an operation on an object the caller can view', () => {
    expect(toObjectDecision(decision(['view']), 'edit')).toEqual({
      status: 'forbidden',
      operation: 'edit',
    });
  });

  it('reports an object the caller cannot view as missing', () => {
    expect(toObjectDecision(decision([]), 'edit')).toEqual({ status: 'not_found' });
    expect(toObjectDecision(decision([]), 'view')).toEqual({ status: 'not_found' });
  });
});
