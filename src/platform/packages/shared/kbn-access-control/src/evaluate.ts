/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compareLevels, lowestAllowed, maxLevel } from './levels';
import {
  PRINCIPAL_TYPES,
  type AccessPolicy,
  type AclDecision,
  type AclLevel,
  type AclObjectDecision,
  type AclState,
  type CanonicalAcl,
  type GeneralAccessLevel,
  type Principal,
  type PrincipalType,
} from './types';

/**
 * Operations recovery administrators get on objects with a stored ACL. Recovery never permits use,
 * edit, or delete: an administrator who needs those first makes an audited access change.
 */
const RECOVERY_OPERATIONS = ['view', 'manage_access', 'transfer'] as const;

export interface EvaluateAclParams {
  policy: AccessPolicy;
  acl?: CanonicalAcl;
  principal?: Principal;
  /** Whether the caller has recovery authority for the object's type and space. */
  recovery?: boolean;
}

/**
 * Decides what the caller can do with one object. Feature privileges are applied by the caller:
 * this decision is only the object-level part.
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
    level = policy.generalAccess.default;
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
  // Ownership is a relationship rather than a level, so it does not change the reported level.
  const ordinaryLevel = isOwner ? 'manage' : level;
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

  // An object without a stored ACL has nobody to recover access from. Recovery still lets an
  // administrator see it, but adopting an unowned object is a separate decision (D5).
  const viaRecovery = new Set<string>();
  if (recovery) {
    const recoveryOperations = state === 'absent' ? ['view'] : RECOVERY_OPERATIONS;
    for (const operation of recoveryOperations) {
      if (!operations.has(operation)) {
        viaRecovery.add(operation);
        operations.add(operation);
      }
    }
  }

  return {
    state,
    level,
    isOwner,
    restricted: state === 'valid' && !!acl && isRestrictedAcl(policy, acl),
    operations,
    viaRecovery,
  };
};

/**
 * Whether general access alone permits the operation, so that the caller can skip identity and
 * recovery lookups. A damaged ACL never takes this shortcut.
 */
export const generalAccessPermits = (
  policy: AccessPolicy,
  acl: CanonicalAcl | undefined,
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
    state === 'absent' || !acl ? policy.generalAccess.default : getGeneralAccess(policy, acl);
  return compareLevels(generalAccess, operationLevel) >= 0;
};

/**
 * Whether the object has a valid ACL that is narrower than the type default: lower general access,
 * or named entries.
 */
export const isRestricted = (policy: AccessPolicy, acl: CanonicalAcl | undefined) =>
  getAclState(acl) === 'valid' && !!acl && isRestrictedAcl(policy, acl);

export const getAclState = (acl: CanonicalAcl | undefined): AclState => {
  if (!acl) {
    return 'absent';
  }

  // Only version 1 exists. A missing, mixed, or unknown version is damaged data and never falls back
  // to a public default.
  return acl.version.length > 0 && acl.version.every((value) => value === 1) ? 'valid' : 'invalid';
};

/**
 * Returns the only known principal kind of a component, or `undefined` when it has none or several.
 * Unknown kinds are ignored, so that a future kind does not invalidate today's grants.
 */
export const getPrincipalKind = (types: readonly string[]): PrincipalType | undefined => {
  const kinds = new Set(
    types.filter((type): type is PrincipalType => PRINCIPAL_TYPES.includes(type as PrincipalType))
  );
  return kinds.size === 1 ? [...kinds][0] : undefined;
};

const getGeneralAccess = (policy: AccessPolicy, acl: CanonicalAcl): GeneralAccessLevel =>
  lowestAllowed(acl.general_access, policy.generalAccess.allowed) ?? 'none';

const isRestrictedAcl = (policy: AccessPolicy, acl: CanonicalAcl) =>
  acl.entries.length > 0 ||
  compareLevels(getGeneralAccess(policy, acl), policy.generalAccess.default) < 0;

const matchesPrincipal = (
  component: { type: readonly string[]; id: readonly string[] },
  principal: Principal
) => getPrincipalKind(component.type) === principal.type && component.id.includes(principal.id);

/**
 * Turns a decision into the outcome of one operation. An object the caller cannot view is reported
 * as missing, so that a denial never discloses that the object exists.
 */
export const toObjectDecision = (decision: AclDecision, operation: string): AclObjectDecision => {
  if (decision.operations.has(operation)) {
    return { status: 'allowed' };
  }
  return decision.operations.has('view')
    ? { status: 'forbidden', operation }
    : { status: 'not_found' };
};
