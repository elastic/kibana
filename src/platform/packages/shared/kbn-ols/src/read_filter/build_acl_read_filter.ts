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
  type AclAccess,
  type EntryAccess,
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
  /** The access the caller needs, usually `view`. */
  access: EntryAccess;
  /**
   * Spaces where the caller has recovery authority. At `view`, the caller sees every object of the
   * type there, whatever its ACL. At any other access, these spaces get the same ACL check as
   * `ordinarySpaces`, because recovery never lets a caller use, edit, or delete an object. `['*']`
   * stands for every space the search covers.
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
const GENERAL_ACCESS = `${ACL_FIELD}.general.access`;
const ENTRIES = `${ACL_FIELD}.entries`;
const ENTRY_TYPE = `${ENTRIES}.type`;
const ENTRY_ID = `${ENTRIES}.id`;
const ENTRY_ACCESS = `${ENTRIES}.access`;
const ENTRY_ADDED_AT = `${ENTRIES}.added_at`;

const otherKinds = (kind: PrincipalType) => PRINCIPAL_TYPES.filter((other) => other !== kind);

/**
 * Builds the query clause that keeps only the objects of one type that the caller can reach with
 * the requested `access`. It applies the same rules as reading a single object, so a list never
 * shows an object that opening it would deny. In recovery spaces, the clause matches every object
 * when the requested access is `view`, whatever its ACL. For any other access, it applies the ACL
 * there too.
 *
 * The clause holds `nested` queries on `acl.entries` in most cases, and Elasticsearch rejects any
 * search that holds one when `search.allow_expensive_queries` is `false`. The caller must never
 * retry such a search without the clause. Some clauses hold none, for example one for recovery
 * spaces only, with `view` access. Such a clause still filters completely, so its search can run.
 *
 * @param params The type's policy, the caller, the access they need, and the spaces to search.
 * @returns A query clause to add to the search's filters. It matches nothing when both space lists
 * are empty.
 */
export const buildAclReadFilter = ({
  policy,
  principal,
  access,
  recoverySpaces,
  ordinarySpaces,
}: BuildAclReadFilterParams): estypes.QueryDslQueryContainer => {
  // Recovery lets a caller view any object, but never use, edit, or delete it. So above `view`, a
  // recovery space gets the same ACL check as an ordinary space.
  const aclExemptSpaces = access === 'view' ? recoverySpaces : [];
  const aclCheckedSpaces =
    access === 'view' ? ordinarySpaces : [...ordinarySpaces, ...recoverySpaces];

  const should: estypes.QueryDslQueryContainer[] = [];
  if (aclExemptSpaces.length > 0) {
    should.push(spacesClause(aclExemptSpaces));
  }

  if (aclCheckedSpaces.length > 0) {
    const grants: estypes.QueryDslQueryContainer[] = [generalAccessClause(policy, access)];
    if (principal) {
      grants.push(ownerClause(principal), entryClause(policy, principal, access));
    }

    const ordinary: estypes.QueryDslQueryContainer[] = [
      { bool: { filter: [VALID_CLAUSE], should: grants, minimum_should_match: 1 } },
    ];
    if (compareLevels(policy.defaultGeneralAccess, access) >= 0) {
      ordinary.push(ABSENT_CLAUSE);
    }

    should.push({
      bool: {
        filter: [spacesClause(aclCheckedSpaces)],
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
 * General access is the lowest stored value the type allows, so it reaches `access` level when some
 * allowed value reaches it and no allowed value falls short. Values the type doesn't allow are
 * ignored.
 */
const generalAccessClause = (
  policy: AccessPolicy,
  access: EntryAccess
): estypes.QueryDslQueryContainer => {
  const { atLeast, below } = partitionLevels(policy.generalAccess, access);
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
 * access level.
 */
const ownerClause = (principal: Principal): estypes.QueryDslQueryContainer => ({
  bool: {
    filter: [{ term: { [OWNER_TYPE]: principal.type } }, { term: { [OWNER_ID]: principal.id } }],
    must_not: excludeValues(OWNER_TYPE, otherKinds(principal.type)),
  },
});

/**
 * One entry names the caller and grants at least `access` level. The `nested` query keeps the
 * kind, the ID, and the access level of one entry together, so separate entries never combine
 * into a grant that none of them holds. An entry grants the lowest access level the type allows
 * among its stored levels.
 */
const entryClause = (
  policy: AccessPolicy,
  principal: Principal,
  access: EntryAccess
): estypes.QueryDslQueryContainer => {
  const { atLeast, below } = partitionLevels(policy.entryAccess, access);
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
 * Splits the levels a type allows into those that reach `access` level and those below it.
 */
const partitionLevels = <T extends AclAccess>(allowed: readonly T[], access: AclAccess) => ({
  atLeast: allowed.filter((value) => compareLevels(value, access) >= 0),
  below: allowed.filter((value) => compareLevels(value, access) < 0),
});
