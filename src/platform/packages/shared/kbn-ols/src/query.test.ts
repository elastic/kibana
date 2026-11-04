/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FIXTURE_POLICY as policy, FIXTURE_PROBES } from './contract/shapes';
import { buildAclReadFilter } from './query';

// The read filter is asserted against every stored shape with a real Elasticsearch in the Saved
// Objects integration tests. These tests cover the structure that keeps the query safe.
describe('buildAclReadFilter', () => {
  it('matches nothing without spaces', () => {
    expect(
      buildAclReadFilter({ policy, level: 'view', recoverySpaces: [], ordinarySpaces: [] })
    ).toEqual({ match_none: {} });
  });

  it('matches every object in recovery spaces', () => {
    expect(
      buildAclReadFilter({ policy, level: 'view', recoverySpaces: ['*'], ordinarySpaces: [] })
    ).toEqual({ bool: { should: [{ match_all: {} }], minimum_should_match: 1 } });
  });

  it('requires one should clause in every bool that combines filter and should', () => {
    const filter = buildAclReadFilter({
      policy,
      principal: FIXTURE_PROBES.owner,
      level: 'use',
      recoverySpaces: ['admin-space'],
      ordinarySpaces: ['default'],
    });

    const visit = (node: unknown) => {
      if (Array.isArray(node)) {
        node.forEach(visit);
      } else if (node && typeof node === 'object') {
        const bool = (node as { bool?: Record<string, unknown> }).bool;
        if (bool?.should) {
          expect(bool.minimum_should_match).toBe(1);
        }
        Object.values(node).forEach(visit);
      }
    };
    visit(filter);
  });

  it('leaves out owner and entry clauses without a principal', () => {
    const serialized = JSON.stringify(
      buildAclReadFilter({ policy, level: 'view', recoverySpaces: [], ordinarySpaces: ['default'] })
    );

    expect(serialized).not.toContain('"term":{"acl.owner.id"');
    expect(serialized).not.toContain('"path":"acl.entries","query":{"bool":{"filter"');
  });

  it('leaves out objects without an ACL when the default does not reach the level', () => {
    const restrictive = {
      ...policy,
      generalAccess: { default: 'none', allowed: ['none'] },
    } as const;
    const serialized = JSON.stringify(
      buildAclReadFilter({
        policy: restrictive,
        level: 'view',
        recoverySpaces: [],
        ordinarySpaces: ['default'],
      })
    );

    expect(serialized).not.toContain('"exists":{"field":"acl.version"}');
  });
});
