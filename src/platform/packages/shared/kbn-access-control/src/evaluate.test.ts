/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { evaluateAcl, generalAccessPermits, isRestricted } from './evaluate';
import { ACL_SHAPE_FIXTURES, FIXTURE_POLICY, FIXTURE_PROBES } from './contract/shapes';
import { normalizeAclSource } from './normalize';
import type { CanonicalAcl } from './types';

const OWNER = FIXTURE_PROBES.owner;
const GRANTEE = FIXTURE_PROBES.grantee;

const acl = (overrides: Partial<CanonicalAcl> = {}): CanonicalAcl => ({
  version: [1],
  owner: { type: ['user'], id: [OWNER.id] },
  general_access: ['none'],
  entries: [],
  ...overrides,
});

describe('evaluateAcl', () => {
  describe('stored shapes', () => {
    for (const fixture of ACL_SHAPE_FIXTURES) {
      it(fixture.name, () => {
        const canonical = normalizeAclSource(fixture.source);
        for (const [probe, principal] of Object.entries(FIXTURE_PROBES)) {
          const decision = evaluateAcl({ policy: FIXTURE_POLICY, acl: canonical, principal });
          const expected = fixture.access.includes(probe as keyof typeof FIXTURE_PROBES);

          expect({ probe, state: decision.state }).toEqual({ probe, state: fixture.state });
          expect({ probe, view: decision.operations.has('view') }).toEqual({
            probe,
            view: expected,
          });
          expect({ probe, use: decision.operations.has('use') }).toEqual({ probe, use: expected });
        }
      });
    }
  });

  it('gives the owner every operation, access management, and transfer', () => {
    const decision = evaluateAcl({ policy: FIXTURE_POLICY, acl: acl(), principal: OWNER });

    expect(decision.isOwner).toBe(true);
    expect([...decision.operations].sort()).toEqual(
      ['delete', 'edit', 'manage_access', 'transfer', 'use', 'view'].sort()
    );
    expect(decision.viaRecovery.size).toBe(0);
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
    expect([...decision.operations].sort()).toEqual(['use', 'view']);
  });

  it('lets recovery view, manage access, and transfer, but never use, edit, or delete', () => {
    const decision = evaluateAcl({
      policy: FIXTURE_POLICY,
      acl: acl(),
      principal: GRANTEE,
      recovery: true,
    });

    expect([...decision.operations].sort()).toEqual(['manage_access', 'transfer', 'view']);
    expect([...decision.viaRecovery].sort()).toEqual(['manage_access', 'transfer', 'view']);
  });

  it('lets recovery see a damaged ACL', () => {
    const decision = evaluateAcl({
      policy: FIXTURE_POLICY,
      acl: acl({ version: [2] }),
      principal: OWNER,
      recovery: true,
    });

    expect(decision.state).toBe('invalid');
    expect(decision.isOwner).toBe(false);
    expect([...decision.operations].sort()).toEqual(['manage_access', 'transfer', 'view']);
  });

  it('does not let recovery manage an object without an ACL', () => {
    const decision = evaluateAcl({
      policy: { ...FIXTURE_POLICY, generalAccess: { default: 'none', allowed: ['none'] } },
      principal: GRANTEE,
      recovery: true,
    });

    expect([...decision.operations]).toEqual(['view']);
  });

  it('reports restriction only for a valid ACL narrower than the default', () => {
    expect(isRestricted(FIXTURE_POLICY, undefined)).toBe(false);
    expect(isRestricted(FIXTURE_POLICY, acl({ general_access: ['edit'] }))).toBe(false);
    expect(isRestricted(FIXTURE_POLICY, acl({ general_access: ['use'] }))).toBe(true);
    expect(isRestricted(FIXTURE_POLICY, acl({ version: [2] }))).toBe(false);
  });
});

describe('generalAccessPermits', () => {
  it('uses the default for an absent ACL', () => {
    expect(generalAccessPermits(FIXTURE_POLICY, undefined, 'edit')).toBe(true);
  });

  it('uses the stored general access for a valid ACL', () => {
    expect(generalAccessPermits(FIXTURE_POLICY, acl({ general_access: ['use'] }), 'use')).toBe(
      true
    );
    expect(generalAccessPermits(FIXTURE_POLICY, acl({ general_access: ['use'] }), 'edit')).toBe(
      false
    );
  });

  it('never permits a damaged ACL or an unknown operation', () => {
    expect(
      generalAccessPermits(FIXTURE_POLICY, acl({ version: [], general_access: ['edit'] }), 'view')
    ).toBe(false);
    expect(generalAccessPermits(FIXTURE_POLICY, undefined, 'teleport')).toBe(false);
  });
});
