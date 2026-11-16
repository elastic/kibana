/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAclState, type AclState, type StoredAcl } from '../acl';
import {
  compareLevels,
  lowestAllowed,
  maxLevel,
  type AclLevel,
  type GeneralAccessLevel,
} from '../levels';
import type { AccessPolicy } from '../policy';
import { getPrincipalKind, matchesPrincipal, type Principal } from '../principals';

/**
 * What a caller can do with one object, before feature privileges are applied.
 */
export interface AclDecision {
  /** The state of the object's stored ACL. */
  state: AclState;
  /**
   * The highest level the caller gets from general access and entries. Ownership isn't a level,
   * so it doesn't raise this value, and neither does recovery.
   */
  level: AclLevel;
  /** Whether the caller is the owner of a valid ACL. */
  isOwner: boolean;
  /**
   * Whether the object has a valid ACL that is narrower than its type's default: lower general
   * access, or at least one entry that grants something.
   */
  restricted: boolean;
  /** Every operation the caller can perform, including the ones only recovery allows. */
  operations: ReadonlySet<string>;
  /** The operations the caller can perform only because of recovery. */
  operationsViaRecovery: ReadonlySet<string>;
}

/**
 * The outcome of one operation on one object.
 */
export type AclObjectDecision =
  | {
      /** The caller can perform the operation. */
      status: 'allowed';
    }
  | {
      /** The caller can't view the object, so it must look missing. */
      status: 'not_found';
    }
  | {
      /** The caller can view the object, but can't perform the operation. */
      status: 'forbidden';
      /** The operation that was denied. */
      operation: string;
    };

/**
 * Parameters of {@link evaluateAcl}.
 */
export interface EvaluateAclParams {
  /** The access policy of the object's type. */
  policy: AccessPolicy;
  /** The object's stored ACL, or `undefined` when it has none. */
  acl?: StoredAcl;
  /** The caller. Leave it out for a request without a principal, which gets general access only. */
  principal?: Principal;
  /** Whether the caller has recovery authority for the object's type and space. */
  recovery?: boolean;
}

/**
 * Operations that recovery adds on an object with a stored ACL. Recovery never adds an operation
 * that a type defines, such as using, editing, or deleting an object, except viewing it.
 */
const RECOVERY_OPERATIONS = ['view', 'manage_access', 'transfer'];

/**
 * Operations that recovery adds on an object without an ACL. Such an object has no owner to
 * recover access from, so recovery only lets the caller see it.
 */
const RECOVERY_OPERATIONS_WITHOUT_ACL = ['view'];

/**
 * Decides what a caller can do with one object, following the rules for reading a stored ACL.
 * The caller still has to apply feature privileges: this decision is only the object-level part.
 *
 * @param params The type's policy, the object's stored ACL, the caller, and whether the caller has
 * recovery authority.
 * @returns The caller's level, ownership, and allowed operations.
 */
export const evaluateAcl = ({
  policy,
  acl,
  principal,
  recovery = false,
}: EvaluateAclParams): AclDecision => {
  const state = getAclState(acl);

  let level: AclLevel = 'none';
  let isOwner = false;
  if (state === 'absent') {
    level = policy.defaultGeneralAccessLevel;
  } else if (state === 'valid' && acl) {
    level = getGeneralAccess(policy, acl);
    if (principal) {
      isOwner = matchesPrincipal(acl.owner, principal);
      for (const entry of acl.entries) {
        const grant = lowestAllowed(entry.access, policy.entryLevels);
        if (grant && matchesPrincipal(entry, principal)) {
          level = maxLevel(level, grant);
        }
      }
    }
  }

  // The owner can do everything an access manager can, and only the owner can transfer ownership.
  const ordinaryLevel: AclLevel = isOwner ? 'manage' : level;
  const operations = new Set(
    Object.entries(policy.operations)
      .filter(([, operation]) => compareLevels(operation.level, ordinaryLevel) <= 0)
      .map(([name]) => name)
  );
  if (ordinaryLevel === 'manage') {
    operations.add('manage_access');
  }
  if (isOwner) {
    operations.add('transfer');
  }

  const operationsViaRecovery = new Set<string>();
  if (recovery) {
    for (const operation of state === 'absent'
      ? RECOVERY_OPERATIONS_WITHOUT_ACL
      : RECOVERY_OPERATIONS) {
      if (!operations.has(operation)) {
        operationsViaRecovery.add(operation);
        operations.add(operation);
      }
    }
  }

  return {
    state,
    level,
    isOwner,
    restricted: state === 'valid' && !!acl && isNarrowerThanDefault(policy, acl),
    operations,
    operationsViaRecovery,
  };
};

/**
 * Checks whether general access alone permits an operation, so that a caller can skip resolving
 * the principal and checking recovery. An invalid ACL never takes this shortcut.
 *
 * @param policy The access policy of the object's type.
 * @param acl The object's stored ACL, or `undefined` when it has none.
 * @param operation The name of an operation that the policy defines.
 * @returns `true` when general access reaches the operation's level. `false` for an operation the
 * policy doesn't define.
 */
export const generalAccessPermits = (
  policy: AccessPolicy,
  acl: StoredAcl | undefined,
  operation: string
) => {
  const operationLevel = policy.operations[operation]?.level;
  if (!operationLevel) {
    return false;
  }

  const state = getAclState(acl);
  if (state === 'invalid') {
    return false;
  }

  const generalAccess =
    state === 'valid' && acl ? getGeneralAccess(policy, acl) : policy.defaultGeneralAccessLevel;
  return compareLevels(generalAccess, operationLevel) >= 0;
};

/**
 * Checks whether an object has a valid ACL that is narrower than its type's default: lower
 * general access, or at least one entry that grants something. Lists and the UI use it to mark
 * restricted objects.
 *
 * @param policy The access policy of the object's type.
 * @param acl The object's stored ACL, or `undefined` when it has none.
 * @returns `true` only for a valid ACL that restricts access.
 */
export const isRestricted = (policy: AccessPolicy, acl: StoredAcl | undefined) =>
  getAclState(acl) === 'valid' && !!acl && isNarrowerThanDefault(policy, acl);

/**
 * Turns a decision into the outcome of one operation. An object the caller can't view looks
 * missing, so that a denial never reveals that the object exists.
 *
 * @param decision The caller's decision for the object, from {@link evaluateAcl}.
 * @param operation The operation the caller asks for.
 * @returns `allowed`, `forbidden` when the caller can view the object, and `not_found` otherwise.
 */
export const toObjectDecision = (decision: AclDecision, operation: string): AclObjectDecision => {
  if (decision.operations.has(operation)) {
    return { status: 'allowed' };
  }
  return decision.operations.has('view')
    ? { status: 'forbidden', operation }
    : { status: 'not_found' };
};

/**
 * General access of a valid ACL: the lowest stored value the type allows, or `none` when the type
 * allows none of them.
 */
const getGeneralAccess = (policy: AccessPolicy, acl: StoredAcl): GeneralAccessLevel =>
  lowestAllowed(acl.general_access, policy.generalAccessLevels) ?? 'none';

/**
 * Whether a valid ACL is narrower than the type's default: lower general access, or at least one
 * entry that grants something. An entry that grants nothing doesn't change who has access.
 */
const isNarrowerThanDefault = (policy: AccessPolicy, acl: StoredAcl) =>
  acl.entries.some(
    (entry) =>
      getPrincipalKind(entry.type) !== undefined &&
      entry.id.length > 0 &&
      lowestAllowed(entry.access, policy.entryLevels) !== undefined
  ) || compareLevels(getGeneralAccess(policy, acl), policy.defaultGeneralAccessLevel) < 0;
