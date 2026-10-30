/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPrincipalKind } from './evaluate';
import { compareLevels, lowestAllowed } from './levels';
import type {
  AccessPolicy,
  AclChange,
  AclDecision,
  AclDocument,
  AclDocumentEntry,
  AclInput,
  CanonicalAcl,
  GeneralAccessLevel,
  Principal,
} from './types';

/**
 * Maximum number of named entries, excluding the owner.
 */
export const MAX_ACL_ENTRIES = 100;

export type AclChangeErrorCode = 'bad_request' | 'forbidden' | 'conflict';

export class AclChangeError extends Error {
  constructor(public readonly code: AclChangeErrorCode, message: string) {
    super(message);
    this.name = 'AclChangeError';
  }
}

export interface PreparedAclChange {
  next: AclDocument;
  /** Recipients whose grant is new or higher. They must exist before the change is stored. */
  grantsToCheck: Principal[];
}

export interface PrepareInitialAclParams {
  policy: AccessPolicy;
  principal?: Principal;
  requested?: AclInput;
  enabled: boolean;
  now: string;
}

/**
 * Builds the ACL for a new object: the creator becomes the owner, with the requested or default
 * access. Returns `undefined` when the object is created without a platform ACL.
 */
export const prepareInitialAcl = ({
  policy,
  principal,
  requested,
  enabled,
  now,
}: PrepareInitialAclParams): PreparedAclChange | undefined => {
  if (!enabled) {
    if (requested) {
      throw new AclChangeError('bad_request', 'Access control is disabled.');
    }
    return;
  }

  // Without a resolvable principal there is nobody to own the object, so it cannot be restricted.
  if (!principal) {
    if (requested && wouldRestrict(policy, requested)) {
      throw new AclChangeError(
        'bad_request',
        'Access cannot be restricted because the caller cannot own the object.'
      );
    }
    return;
  }

  const generalAccess = validateGeneralAccess(
    policy,
    requested?.general_access ?? policy.generalAccess.default
  );
  const entries = validateEntries(policy, requested?.entries ?? [], principal).map((entry) => ({
    ...entry,
    added_at: now,
  }));

  return {
    next: { version: 1, owner: principal, general_access: generalAccess, entries },
    grantsToCheck: entries.map(({ type, id }) => ({ type, id })),
  };
};

export interface PrepareAclChangeParams {
  policy: AccessPolicy;
  current?: CanonicalAcl;
  /** Decision for the caller on the current ACL, including recovery. */
  decision: AclDecision;
  principal?: Principal;
  change: AclChange;
  enabled: boolean;
  now: string;
}

/**
 * Validates an access change against the caller's decision and builds the ACL to store.
 */
export const prepareAclChange = ({
  policy,
  current,
  decision,
  principal,
  change,
  enabled,
  now,
}: PrepareAclChangeParams): PreparedAclChange => {
  if (!enabled) {
    throw new AclChangeError('bad_request', 'Access control is disabled.');
  }

  switch (change.kind) {
    case 'replace':
      return prepareReplace(policy, current, decision, change, now);
    case 'claim':
      return prepareClaim(policy, decision, principal, change.general_access);
    case 'transfer':
      return prepareTransfer(policy, current, decision, change.owner);
  }
};

const prepareReplace = (
  policy: AccessPolicy,
  current: CanonicalAcl | undefined,
  decision: AclDecision,
  change: Extract<AclChange, { kind: 'replace' }>,
  now: string
): PreparedAclChange => {
  requireOperation(decision, 'manage_access');
  if (decision.state === 'absent' || !current) {
    throw new AclChangeError('bad_request', 'The object has no owner yet. Claim it first.');
  }

  const { owner, entries: currentEntries } = toAclDocument(policy, current);
  const currentGrants = new Map(currentEntries.map((entry) => [principalKey(entry), entry]));
  const generalAccess = validateGeneralAccess(policy, change.general_access);

  const grantsToCheck: Principal[] = [];
  const entries = validateEntries(policy, change.entries, owner).map((entry) => {
    const currentEntry = currentGrants.get(principalKey(entry));
    // Unchanged and reduced grants are always allowed, so that a deleted or disabled recipient
    // never blocks an unrelated change.
    if (!currentEntry || compareLevels(entry.access, currentEntry.access) > 0) {
      grantsToCheck.push({ type: entry.type, id: entry.id });
    }
    return { ...entry, added_at: currentEntry?.added_at ?? now };
  });

  return {
    next: { version: 1, ...(owner && { owner }), general_access: generalAccess, entries },
    grantsToCheck,
  };
};

const prepareClaim = (
  policy: AccessPolicy,
  decision: AclDecision,
  principal: Principal | undefined,
  generalAccess: GeneralAccessLevel | undefined
): PreparedAclChange => {
  // Ownership is established once, explicitly. An existing or damaged ACL needs a transfer instead.
  if (decision.state !== 'absent') {
    throw new AclChangeError('conflict', 'The object already has access control.');
  }
  requireOperation(decision, 'edit');
  if (!principal) {
    throw new AclChangeError('bad_request', 'The caller cannot own objects.');
  }

  return {
    next: {
      version: 1,
      owner: principal,
      general_access: validateGeneralAccess(policy, generalAccess ?? policy.generalAccess.default),
      entries: [],
    },
    grantsToCheck: [],
  };
};

const prepareTransfer = (
  policy: AccessPolicy,
  current: CanonicalAcl | undefined,
  decision: AclDecision,
  newOwner: Principal
): PreparedAclChange => {
  requireOperation(decision, 'transfer');
  if (decision.state === 'absent' || !current) {
    throw new AclChangeError('bad_request', 'The object has no owner yet. Claim it first.');
  }

  // The former owner keeps nothing, and the new owner needs no separate entry. A damaged ACL is
  // repaired on the way: only its valid components are kept.
  const { general_access: generalAccess, entries } = toAclDocument(policy, current);
  return {
    next: {
      version: 1,
      owner: newOwner,
      general_access: generalAccess,
      entries: entries.filter((entry) => principalKey(entry) !== principalKey(newOwner)),
    },
    grantsToCheck: [newOwner],
  };
};

/**
 * Keeps the components of a stored ACL that grant something, in the shape Kibana writes. An entry
 * listing several IDs becomes one entry per ID; a component with an ambiguous kind is dropped.
 */
export const toAclDocument = (policy: AccessPolicy, acl: CanonicalAcl): AclDocument => {
  const ownerKind = getPrincipalKind(acl.owner.type);
  const owner =
    ownerKind && acl.owner.id.length === 1 ? { type: ownerKind, id: acl.owner.id[0] } : undefined;

  const entries = new Map<string, AclDocumentEntry>();
  for (const entry of acl.entries) {
    const kind = getPrincipalKind(entry.type);
    const access = lowestAllowed(entry.access, policy.entryLevels);
    if (!kind || !access) {
      continue;
    }

    for (const id of entry.id) {
      const key = principalKey({ type: kind, id });
      const existing = entries.get(key);
      if (!existing || compareLevels(access, existing.access) > 0) {
        entries.set(key, { type: kind, id, access, added_at: entry.added_at[0] ?? '' });
      }
    }
  }

  return {
    version: 1,
    ...(owner && { owner }),
    general_access: lowestAllowed(acl.general_access, policy.generalAccess.allowed) ?? 'none',
    entries: [...entries.values()],
  };
};

const validateGeneralAccess = (policy: AccessPolicy, level: GeneralAccessLevel) => {
  if (!policy.generalAccess.allowed.includes(level)) {
    throw new AclChangeError('bad_request', `General access "${level}" is not allowed.`);
  }
  return level;
};

/**
 * Checks the requested entries and drops the owner's entry, which ownership already covers.
 */
const validateEntries = (
  policy: AccessPolicy,
  entries: NonNullable<AclInput['entries']>,
  owner: Principal | undefined
) => {
  if (entries.length > MAX_ACL_ENTRIES) {
    throw new AclChangeError(
      'bad_request',
      `An object can have at most ${MAX_ACL_ENTRIES} entries.`
    );
  }

  const seen = new Set<string>();
  const validEntries: NonNullable<AclInput['entries']> = [];
  for (const { type, id, access } of entries) {
    const key = principalKey({ type, id });
    if (seen.has(key)) {
      throw new AclChangeError('bad_request', `Principal ${key} is listed more than once.`);
    }
    seen.add(key);

    if (!policy.entryLevels.includes(access)) {
      throw new AclChangeError('bad_request', `Access level "${access}" cannot be granted.`);
    }

    if (!owner || key !== principalKey(owner)) {
      validEntries.push({ type, id, access });
    }
  }

  return validEntries;
};

const wouldRestrict = (policy: AccessPolicy, requested: AclInput) =>
  (requested.entries?.length ?? 0) > 0 ||
  compareLevels(
    requested.general_access ?? policy.generalAccess.default,
    policy.generalAccess.default
  ) < 0;

const requireOperation = (decision: AclDecision, operation: string) => {
  if (!decision.operations.has(operation)) {
    throw new AclChangeError('forbidden', `Missing "${operation}" permission.`);
  }
};

const principalKey = ({ type, id }: Principal) => `${type}:${id}`;
