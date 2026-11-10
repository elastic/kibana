/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { ACL_FIELD } from '../acl';
import {
  ACL_LEVELS,
  compareLevels,
  isGeneralAccessLevel,
  type AclLevel,
  type EntryLevel,
} from '../levels';
import type { AccessPolicy } from '../policy';
import { PRINCIPAL_TYPES, type Principal, type PrincipalType } from '../principals';

/**
 * Parameters of {@link buildAclReadFilter}.
 */
export interface BuildAclReadFilterParams {
  /** The access policy of the type the filter is for. */
  policy: AccessPolicy;
  /**
   * The caller. Leave it out for a request without a principal, which only general access serves.
   */
  principal?: Principal;
  /** The level the caller needs, usually `view`. */
  level: EntryLevel;
  /**
   * Spaces where the caller has recovery authority, and sees every object of the type, whatever its
   * ACL. `['*']` stands for every space the search covers.
   */
  recoverySpaces: readonly string[];
  /**
   * Spaces where only the caller's ordinary access applies. `['*']` stands for every space the
   * search covers.
   */
  ordinarySpaces: readonly string[];
}

/**
 * Stands for every space. In a space list, it means every space the search covers. In an object's
 * spaces, it means the object is shared to all spaces.
 */
const ALL_SPACES = '*';
/** The Saved Objects field that lists the spaces of an object. */
const SPACES_FIELD = 'namespaces';

const VERSION = `${ACL_FIELD}.version`;
const OWNER_TYPE = `${ACL_FIELD}.owner.type`;
const OWNER_ID = `${ACL_FIELD}.owner.id`;
const GENERAL_ACCESS = `${ACL_FIELD}.general_access`;
const ENTRIES = `${ACL_FIELD}.entries`;
const ENTRY_TYPE = `${ENTRIES}.type`;
const ENTRY_ID = `${ENTRIES}.id`;
const ENTRY_ACCESS = `${ENTRIES}.access`;
const ENTRY_ADDED_AT = `${ENTRIES}.added_at`;

const otherKinds = (kind: PrincipalType) => PRINCIPAL_TYPES.filter((other) => other !== kind);

/**
 * Builds the query clause that keeps only the objects of one type that the caller can access at
 * `level`. It applies the same rules as reading a single object, so a list never shows an object
 * that opening it would deny.
 *
 * The clause holds `nested` queries on `acl.entries` in most cases, and Elasticsearch rejects any
 * search that holds one when `search.allow_expensive_queries` is `false`. Some clauses hold none,
 * for example one for recovery spaces only, so a caller that must fail whenever that setting is
 * off has to check the setting itself, not rely on the query shape.
 *
 * @param params The type's policy, the caller, the level they need, and the spaces to search.
 * @returns A query clause to add to the search's filters. It matches nothing when both space lists
 * are empty.
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
    if (compareLevels(policy.defaultGeneralAccessLevel, level) >= 0) {
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

/**
 * Freezes a value and everything inside it. The two clauses below are shared: every filter the
 * builder returns embeds them by reference. Without the freeze, a caller that edited a returned
 * filter in place could corrupt every filter built after it; with it, such a write throws.
 */
const deepFreeze = <T>(value: T): T => {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

/**
 * No ACL field holds a value. Only these objects get the type's default general access.
 */
const ABSENT_CLAUSE: estypes.QueryDslQueryContainer = deepFreeze({
  bool: {
    must_not: [
      ...[VERSION, OWNER_TYPE, OWNER_ID, GENERAL_ACCESS].map((field) => ({ exists: { field } })),
      {
        nested: {
          path: ENTRIES,
          query: {
            bool: {
              should: [ENTRY_TYPE, ENTRY_ID, ENTRY_ACCESS, ENTRY_ADDED_AT].map((field) => ({
                exists: { field },
              })),
              minimum_should_match: 1,
            },
          },
        },
      },
    ],
  },
});

/**
 * The ACL is valid: every version value is `1`, the owner has exactly one known kind and at least
 * one ID, and general access has a value that general access can take. None of it depends on the
 * type's policy.
 */
const VALID_CLAUSE: estypes.QueryDslQueryContainer = deepFreeze({
  bool: {
    filter: [
      { term: { [VERSION]: 1 } },
      { exists: { field: OWNER_ID } },
      { terms: { [GENERAL_ACCESS]: ACL_LEVELS.filter(isGeneralAccessLevel) } },
    ],
    must_not: [{ range: { [VERSION]: { lt: 1 } } }, { range: { [VERSION]: { gt: 1 } } }],
    should: PRINCIPAL_TYPES.map((kind) => ({
      bool: {
        filter: [{ term: { [OWNER_TYPE]: kind } }],
        must_not: [{ terms: { [OWNER_TYPE]: otherKinds(kind) } }],
      },
    })),
    minimum_should_match: 1,
  },
});

/**
 * General access is the lowest stored value the type allows, so it reaches `level` when some
 * allowed value reaches it and no allowed value falls short. Values the type doesn't allow are
 * ignored.
 */
const generalAccessClause = (
  policy: AccessPolicy,
  level: EntryLevel
): estypes.QueryDslQueryContainer => {
  const { atLeast, below } = partitionLevels(policy.generalAccessLevels, level);
  if (atLeast.length === 0) {
    return { match_none: {} };
  }

  return {
    bool: {
      filter: [{ terms: { [GENERAL_ACCESS]: atLeast } }],
      must_not: excludeValues(GENERAL_ACCESS, below),
    },
  };
};

/**
 * The caller is the owner. The owner of a valid ACL acts at `manage`, so this doesn't depend on the
 * level.
 */
const ownerClause = (principal: Principal): estypes.QueryDslQueryContainer => ({
  bool: {
    filter: [{ term: { [OWNER_TYPE]: principal.type } }, { term: { [OWNER_ID]: principal.id } }],
    must_not: excludeValues(OWNER_TYPE, otherKinds(principal.type)),
  },
});

/**
 * One entry names the caller and grants at least `level`. The `nested` query keeps the kind, the
 * ID, and the level of one entry together, so separate entries never combine into a grant that
 * none of them holds. An entry grants the lowest level the type allows among its stored levels.
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
      path: ENTRIES,
      query: {
        bool: {
          filter: [
            { term: { [ENTRY_TYPE]: principal.type } },
            { term: { [ENTRY_ID]: principal.id } },
            { terms: { [ENTRY_ACCESS]: atLeast } },
          ],
          must_not: [
            ...excludeValues(ENTRY_TYPE, otherKinds(principal.type)),
            ...excludeValues(ENTRY_ACCESS, below),
          ],
        },
      },
    },
  };
};

const spacesClause = (spaces: readonly string[]): estypes.QueryDslQueryContainer =>
  // A search across all spaces is already limited to the spaces the caller can reach. An object
  // shared to all spaces stores `'*'`, and it is in every listed space.
  spaces.includes(ALL_SPACES)
    ? { match_all: {} }
    : { terms: { [SPACES_FIELD]: [...spaces, ALL_SPACES] } };

/**
 * Excludes documents where `field` holds any of `values`. Returns no clause for no values.
 */
const excludeValues = (
  field: string,
  values: readonly string[]
): estypes.QueryDslQueryContainer[] =>
  values.length > 0 ? [{ terms: { [field]: [...values] } }] : [];

/**
 * Splits the levels a type allows into those that reach `level` and those below it.
 */
const partitionLevels = <T extends AclLevel>(allowed: readonly T[], level: AclLevel) => ({
  atLeast: allowed.filter((value) => compareLevels(value, level) >= 0),
  below: allowed.filter((value) => compareLevels(value, level) < 0),
});
