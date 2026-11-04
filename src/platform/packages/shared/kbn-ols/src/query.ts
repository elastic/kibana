/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { compareLevels, partitionLevels } from './levels';
import { PRINCIPAL_TYPES, type AccessPolicy, type EntryLevel, type Principal } from './types';

const ALL_SPACES = '*';

export interface BuildAclReadFilterParams {
  policy: AccessPolicy;
  principal?: Principal;
  /** Level the caller needs, usually `view`. */
  level: EntryLevel;
  /** Spaces where the caller has recovery authority and sees every object. */
  recoverySpaces: readonly string[];
  /** Spaces where only ordinary grants apply. */
  ordinarySpaces: readonly string[];
}

/**
 * Builds the query clause that keeps only the objects of one type the caller can access at `level`.
 * It encodes the same rules as `evaluateAcl`, so a list never shows an object a point read denies.
 */
export const buildAclReadFilter = ({
  policy,
  principal,
  level,
  recoverySpaces,
  ordinarySpaces,
}: BuildAclReadFilterParams): estypes.QueryDslQueryContainer => {
  const should: estypes.QueryDslQueryContainer[] = [];
  if (recoverySpaces.length > 0) {
    should.push(spacesClause(recoverySpaces));
  }

  if (ordinarySpaces.length > 0) {
    const grants: estypes.QueryDslQueryContainer[] = [generalAccessClause(policy, level)];
    if (principal) {
      grants.push(ownerClause(principal), entryClause(policy, principal, level));
    }

    const ordinary: estypes.QueryDslQueryContainer[] = [
      { bool: { filter: [VALID_CLAUSE], should: grants, minimum_should_match: 1 } },
    ];
    if (compareLevels(policy.generalAccess.default, level) >= 0) {
      ordinary.push(ABSENT_CLAUSE);
    }

    should.push({
      bool: {
        filter: [spacesClause(ordinarySpaces)],
        should: ordinary,
        minimum_should_match: 1,
      },
    });
  }

  return should.length > 0 ? { bool: { should, minimum_should_match: 1 } } : { match_none: {} };
};

const ACL_ENTRY_LEAVES = ['type', 'id', 'access', 'added_at'];

/**
 * No ACL leaf has a value. This is the only shape that gets the type's default general access.
 */
const ABSENT_CLAUSE: estypes.QueryDslQueryContainer = {
  bool: {
    must_not: [
      ...['acl.version', 'acl.owner.type', 'acl.owner.id', 'acl.general_access'].map((field) => ({
        exists: { field },
      })),
      {
        nested: {
          path: 'acl.entries',
          query: {
            bool: {
              should: ACL_ENTRY_LEAVES.map((leaf) => ({
                exists: { field: `acl.entries.${leaf}` },
              })),
              minimum_should_match: 1,
            },
          },
        },
      },
    ],
  },
};

/**
 * Every indexed version value is exactly `1`.
 */
const VALID_CLAUSE: estypes.QueryDslQueryContainer = {
  bool: {
    filter: [{ term: { 'acl.version': 1 } }],
    must_not: [{ range: { 'acl.version': { lt: 1 } } }, { range: { 'acl.version': { gt: 1 } } }],
  },
};

/**
 * General access is the lowest allowed stored value, so it reaches `level` only when some allowed
 * value does and no allowed value falls short.
 */
const generalAccessClause = (policy: AccessPolicy, level: EntryLevel) => {
  const { atLeast, below } = partitionLevels(policy.generalAccess.allowed, level);
  return atLeast.length > 0
    ? {
        bool: {
          filter: [{ terms: { 'acl.general_access': atLeast } }],
          must_not: [{ terms: { 'acl.general_access': below } }],
        },
      }
    : { match_none: {} };
};

const ownerClause = (principal: Principal): estypes.QueryDslQueryContainer => ({
  bool: {
    filter: [
      { term: { 'acl.owner.type': principal.type } },
      { term: { 'acl.owner.id': principal.id } },
    ],
    must_not: [{ terms: { 'acl.owner.type': otherKinds(principal) } }],
  },
});

/**
 * The nested query keeps one entry's kind, ID, and level together, so separate entries cannot be
 * combined into a grant that none of them holds.
 */
const entryClause = (
  policy: AccessPolicy,
  principal: Principal,
  level: EntryLevel
): estypes.QueryDslQueryContainer => {
  const { atLeast, below } = partitionLevels(policy.entryLevels, level);
  if (atLeast.length === 0) {
    return { match_none: {} };
  }

  return {
    nested: {
      path: 'acl.entries',
      query: {
        bool: {
          filter: [
            { term: { 'acl.entries.type': principal.type } },
            { term: { 'acl.entries.id': principal.id } },
            { terms: { 'acl.entries.access': atLeast } },
          ],
          must_not: [
            { terms: { 'acl.entries.type': otherKinds(principal) } },
            { terms: { 'acl.entries.access': below } },
          ],
        },
      },
    },
  };
};

const spacesClause = (spaces: readonly string[]): estypes.QueryDslQueryContainer =>
  // The repository has already limited a search across all spaces to the spaces the caller can see.
  spaces.includes(ALL_SPACES) ? { match_all: {} } : { terms: { namespaces: [...spaces] } };

const otherKinds = (principal: Principal) =>
  PRINCIPAL_TYPES.filter((kind) => kind !== principal.type);
