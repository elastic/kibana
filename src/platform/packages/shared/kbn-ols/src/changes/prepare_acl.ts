/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Acl, AclEntry, AclGrant, StoredAcl } from '../acl';
import { toObjectDecision, type AclDecision } from '../evaluation';
import { compareLevels, type GeneralAccessLevel } from '../levels';
import type { AccessPolicy } from '../policy';
import { getPrincipalKey, isPrincipalType, matchesPrincipal, type Principal } from '../principals';
import { AclChangeError } from './acl_change_error';
import { readEditableAcl } from './read_editable_acl';

/**
 * The most entries a caller can ask for in one request. An entry for the owner counts, even though
 * it's dropped. A transfer asks for no entries and keeps the stored ones, so it can write more when
 * the stored ACL came from outside Kibana with more.
 */
export const MAX_ACL_ENTRIES = 100;

/**
 * The access a caller asks for when creating an object. It's the part of the ACL the caller
 * chooses: the caller becomes the owner, and {@link prepareInitialAcl} sets the version and each
 * entry's `added_at`.
 */
export interface InitialAccess {
  /**
   * General access. It has to be a level the type allows for general access, and the type's
   * default applies when it's left out.
   */
  general_access?: GeneralAccessLevel;
  /**
   * Grants to named principals, each listed once and at most {@link MAX_ACL_ENTRIES} of them.
   * There are none when it's left out. A grant to the caller counts toward the limit, and is then
   * dropped, because ownership already covers it.
   */
  entries?: AclGrant[];
}

/**
 * A change a caller asks for to an existing object's ACL.
 */
export type AclChange =
  | {
      /** Replace general access and the entries, and keep the owner. */
      kind: 'replace';
      /** The new general access. */
      general_access: GeneralAccessLevel;
      /** The new entries, which replace every current entry. */
      entries: AclGrant[];
    }
  | {
      /** Make the caller the owner of an object without an ACL. */
      kind: 'claim';
      /** General access for the claimed object. The type's default applies when it's left out. */
      general_access?: GeneralAccessLevel;
    }
  | {
      /** Hand the object over to a new owner. */
      kind: 'transfer';
      /** The new owner. */
      owner: Principal;
    };

/**
 * An ACL to store, with the recipients to check before storing it.
 */
export interface PreparedAclChange {
  /** The complete ACL to store. */
  next: Acl;
  /**
   * Principals who get access they didn't have before, so the caller has to check that each of
   * them exists before storing the ACL: the recipient of a new or higher entry, the new owner of a
   * transfer, and the owner and every entry of an invalid ACL that a replacement repairs. Unchanged
   * and lower grants are left out, so that a deleted or disabled recipient never blocks an
   * unrelated change. A caller who becomes the owner of a new or claimed object is left out too.
   */
  principalsToCheck: Principal[];
}

/**
 * Parameters of {@link prepareInitialAcl}.
 */
export interface PrepareInitialAclParams {
  /** The access policy of the new object's type. */
  policy: AccessPolicy;
  /** The caller, who becomes the owner. Leave it out for a request without a principal. */
  principal?: Principal;
  /** The access the caller asks for. The type's default applies when it's left out. */
  requested?: InitialAccess;
  /** Whether object-level security is enabled. */
  enabled: boolean;
  /** The current time, as an ISO 8601 timestamp, for the entries' `added_at`. */
  now: string;
}

/**
 * Builds the ACL of a new object. The caller becomes the owner, with the requested or the default
 * general access, and the requested entries.
 *
 * @param params The type's policy, the caller, the requested access, whether object-level security
 * is enabled, and the current time.
 * @returns The ACL to store, or `undefined` when the object is created without an ACL: when
 * object-level security is disabled, or when there is no principal to own it.
 * @throws {AclChangeError} `bad_request` when access is requested while object-level security is
 * disabled, when a caller without a principal asks for anything but the default access, or when
 * the caller or the requested access is invalid.
 * @throws {TypeError} When `now` isn't a timestamp.
 */
export const prepareInitialAcl = ({
  policy,
  principal,
  requested,
  enabled,
  now,
}: PrepareInitialAclParams): PreparedAclChange | undefined => {
  validateNow(now);

  if (!enabled) {
    if (requested) {
      throw new AclChangeError('bad_request', 'Object-level security (OLS) is disabled.');
    }
    return undefined;
  }

  // Without a principal there is nobody to own the object, so it gets no ACL and the type's
  // default applies. Any other requested access would be silently lost, so it's refused.
  if (!principal) {
    if (requested && !isDefaultAccess(policy, requested)) {
      throw new AclChangeError(
        'bad_request',
        'Access cannot be set because the caller cannot own the object.'
      );
    }
    return undefined;
  }

  validatePrincipal(principal);

  const generalAccess = validateGeneralAccess(
    policy,
    requested?.general_access ?? policy.defaultGeneralAccessLevel
  );

  const entries = validateEntries(policy, requested?.entries ?? [], principal).map(
    (entry): AclEntry => ({ ...entry, added_at: now })
  );

  return {
    next: { version: 1, owner: principal, general_access: generalAccess, entries },
    principalsToCheck: entries.map(({ type, id }) => ({ type, id })),
  };
};

/**
 * Parameters of {@link prepareAclChange}.
 */
export interface PrepareAclChangeParams {
  /** The access policy of the object's type. */
  policy: AccessPolicy;
  /** The object's stored ACL, or `undefined` when it has none. */
  current?: StoredAcl;
  /**
   * The caller's decision, recovery included, from `evaluateAcl` with this policy, `current`, and
   * `principal`. A decision for another caller or another ACL would authorize the wrong change.
   */
  decision: AclDecision;
  /** The caller. A claim needs one. */
  principal?: Principal;
  /** The requested change. */
  change: AclChange;
  /** Whether object-level security is enabled. */
  enabled: boolean;
  /** The current time, as an ISO 8601 timestamp, for the `added_at` of new entries. */
  now: string;
}

/**
 * Checks a requested change against the caller's decision, and builds the ACL to store.
 *
 * @param params The type's policy, the current ACL, the caller and their decision, the requested
 * change, whether object-level security is enabled, and the current time.
 * @returns The ACL to store, and the recipients to check first.
 * @throws {AclChangeError} `not_found` when the caller can't view the object, which comes before
 * any other refusal so that it never reveals that the object exists. `forbidden` when the caller
 * lacks the operation the change needs, `conflict` when a claim finds an ACL, and `bad_request`
 * when object-level security is disabled or the change is invalid for the object.
 * @throws {TypeError} When `now` isn't a timestamp.
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
  validateNow(now);

  if (!enabled) {
    throw new AclChangeError('bad_request', 'Object-level security (OLS) is disabled.');
  }

  // Every other refusal tells the caller something about the object, such as that it exists or
  // has an ACL, so a caller who can't view it learns only that it's missing.
  requireOperation(decision, 'view');

  switch (change.kind) {
    case 'replace':
      return prepareReplace(policy, current, decision, change, now);
    case 'claim':
      return prepareClaim(policy, decision, principal, change.general_access);
    case 'transfer':
      return prepareTransfer(policy, current, decision, change.owner, now);
  }
};

/**
 * Prepares a replacement of general access and every entry. The owner stays, so the stored owner
 * has to name a single principal: a replacement would otherwise have to pick one, and only a
 * transfer can repair such an ACL. A requested grant that the stored ACL already has keeps its
 * `added_at`, even when its level changes, and any other grant gets the current time.
 *
 * An invalid ACL grants nothing, so a replacement that repairs one gives its owner and every
 * entry access they didn't have, and checks each of them like a new grant.
 *
 * @param policy The access policy of the object's type.
 * @param current The object's stored ACL.
 * @param decision The caller's decision for `current`.
 * @param change The requested general access and entries.
 * @param now The current time, for `added_at`.
 * @returns The ACL to store. Its `principalsToCheck` holds the recipients of new and raised grants,
 * and also the owner and every entry when the replacement repairs an invalid ACL.
 * @throws {AclChangeError} `forbidden` when the caller lacks `manage_access`. `bad_request` when
 * the object has no ACL and needs a claim first, when the stored owner isn't a single principal,
 * or when the requested access is invalid.
 */
const prepareReplace = (
  policy: AccessPolicy,
  current: StoredAcl | undefined,
  decision: AclDecision,
  change: Extract<AclChange, { kind: 'replace' }>,
  now: string
): PreparedAclChange => {
  if (decision.state === 'absent' || !current) {
    throw new AclChangeError('bad_request', 'The object has no owner yet. Claim it first.');
  }

  requireOperation(decision, 'manage_access');

  const { owner, entries: currentEntries } = readEditableAcl(policy, current);
  if (!owner) {
    throw new AclChangeError(
      'bad_request',
      'The object has no single owner. Transfer ownership to repair its ACL.'
    );
  }

  const isRepair = decision.state === 'invalid';
  const currentGrants = new Map(currentEntries.map((entry) => [getPrincipalKey(entry), entry]));
  const generalAccess = validateGeneralAccess(policy, change.general_access);

  const principalsToCheck: Principal[] = isRepair ? [owner] : [];
  const entries = validateEntries(policy, change.entries, owner).map((entry): AclEntry => {
    const currentEntry = currentGrants.get(getPrincipalKey(entry));
    if (isRepair || !currentEntry || compareLevels(entry.access, currentEntry.access) > 0) {
      principalsToCheck.push({ type: entry.type, id: entry.id });
    }
    return { ...entry, added_at: currentEntry?.added_at ?? now };
  });

  return {
    next: { version: 1, owner, general_access: generalAccess, entries },
    principalsToCheck,
  };
};

/**
 * Prepares a claim: the caller becomes the owner of an object without an ACL, with the requested
 * or the default general access and no entries. Ownership is set once, explicitly, so an object
 * with an ACL, even an invalid one, needs a transfer instead.
 *
 * @param policy The access policy of the object's type.
 * @param decision The caller's decision for the object.
 * @param principal The caller, who becomes the owner.
 * @param generalAccess The requested general access, or `undefined` for the type's default.
 * @returns The ACL to store. Its `principalsToCheck` is empty, because only the caller gets access.
 * @throws {AclChangeError} `conflict` when the object already has an ACL. `forbidden` when the
 * caller lacks `edit`. `bad_request` without a valid principal, or for general access that the
 * type doesn't allow.
 */
const prepareClaim = (
  policy: AccessPolicy,
  decision: AclDecision,
  principal: Principal | undefined,
  generalAccess: GeneralAccessLevel | undefined
): PreparedAclChange => {
  if (decision.state !== 'absent') {
    throw new AclChangeError('conflict', 'The object already has an ACL.');
  }

  requireOperation(decision, 'edit');

  if (!principal) {
    throw new AclChangeError('bad_request', 'The caller cannot own objects.');
  }
  validatePrincipal(principal);

  return {
    next: {
      version: 1,
      owner: principal,
      general_access: validateGeneralAccess(
        policy,
        generalAccess ?? policy.defaultGeneralAccessLevel
      ),
      entries: [],
    },
    principalsToCheck: [],
  };
};

/**
 * Prepares a transfer of ownership to another principal. The former owner keeps nothing, not even
 * an entry stored for them, and the new owner needs no entry. General access and the other
 * entries are kept as {@link readEditableAcl} reads them, so a transfer also repairs an invalid
 * ACL. A kept entry keeps its `added_at`, or gets the current time when it has none.
 *
 * Kept entries aren't counted against {@link MAX_ACL_ENTRIES}. An ACL stored from outside Kibana
 * can have more, for example one entry with many IDs, and refusing it would leave an ACL without a
 * single owner with no way to repair it. The new owner trims the entries with a replacement.
 *
 * @param policy The access policy of the object's type.
 * @param current The object's stored ACL.
 * @param decision The caller's decision for `current`.
 * @param newOwner The principal who becomes the owner.
 * @param now The current time, for a kept entry without `added_at`.
 * @returns The ACL to store. Its `principalsToCheck` holds only the new owner: kept entries aren't
 * checked again, so that one deleted recipient can't block the only way to repair the ACL.
 * @throws {AclChangeError} `forbidden` when the caller lacks `transfer`. `bad_request` when the
 * object has no ACL and needs a claim first, or when the new owner isn't a valid principal.
 */
const prepareTransfer = (
  policy: AccessPolicy,
  current: StoredAcl | undefined,
  decision: AclDecision,
  newOwner: Principal,
  now: string
): PreparedAclChange => {
  if (decision.state === 'absent' || !current) {
    throw new AclChangeError('bad_request', 'The object has no owner yet. Claim it first.');
  }

  requireOperation(decision, 'transfer');
  validatePrincipal(newOwner);

  const { general_access: generalAccess, entries } = readEditableAcl(policy, current);
  const newOwnerKey = getPrincipalKey(newOwner);
  return {
    next: {
      version: 1,
      owner: { type: newOwner.type, id: newOwner.id },
      general_access: generalAccess,
      entries: entries
        .filter(
          (entry) =>
            getPrincipalKey(entry) !== newOwnerKey &&
            !matchesPrincipal(current.owner, { type: entry.type, id: entry.id })
        )
        .map((entry): AclEntry => ({ ...entry, added_at: entry.added_at ?? now })),
    },
    principalsToCheck: [{ type: newOwner.type, id: newOwner.id }],
  };
};

/**
 * Refuses general access that the type doesn't allow, and returns the level otherwise.
 */
const validateGeneralAccess = (policy: AccessPolicy, level: GeneralAccessLevel) => {
  if (!policy.generalAccessLevels.includes(level)) {
    throw new AclChangeError('bad_request', `General access "${level}" is not allowed.`);
  }
  return level;
};

/**
 * Throws a `TypeError` when `now` isn't a timestamp. It comes from the code, not the caller, so it
 * isn't an `AclChangeError`.
 */
const validateNow = (now: string) => {
  if (now.length === 0 || Number.isNaN(Date.parse(now))) {
    throw new TypeError(`"${now}" is not a timestamp.`);
  }
};

/**
 * Refuses a principal without a known kind or a non-empty ID. The type doesn't guarantee either,
 * because the principal can come from a request body.
 */
const validatePrincipal = ({ type, id }: Principal) => {
  if (!isPrincipalType(type) || typeof id !== 'string' || id.length === 0) {
    throw new AclChangeError('bad_request', 'A principal needs a known type and an ID.');
  }
};

/**
 * Checks requested entries, and drops an entry for the owner, which ownership already covers.
 */
const validateEntries = (
  policy: AccessPolicy,
  entries: readonly AclGrant[],
  owner: Principal
): AclGrant[] => {
  if (entries.length > MAX_ACL_ENTRIES) {
    throw new AclChangeError(
      'bad_request',
      `A request can list at most ${MAX_ACL_ENTRIES} entries, an entry for the owner included.`
    );
  }

  const ownerKey = getPrincipalKey(owner);
  const seen = new Set<string>();
  const validEntries: AclGrant[] = [];
  for (const { type, id, access } of entries) {
    validatePrincipal({ type, id });

    const key = getPrincipalKey({ type, id });
    if (seen.has(key)) {
      throw new AclChangeError('bad_request', `Principal ${key} is listed more than once.`);
    }
    seen.add(key);

    if (!policy.entryLevels.includes(access)) {
      throw new AclChangeError('bad_request', `Access level "${access}" cannot be granted.`);
    }

    if (key !== ownerKey) {
      validEntries.push({ type, id, access });
    }
  }
  return validEntries;
};

/**
 * Whether the requested access is exactly what an object without an ACL gets: the type's default
 * general access, and no entries.
 */
const isDefaultAccess = (policy: AccessPolicy, requested: InitialAccess) =>
  (requested.entries?.length ?? 0) === 0 &&
  (requested.general_access ?? policy.defaultGeneralAccessLevel) ===
    policy.defaultGeneralAccessLevel;

/**
 * Refuses a caller who can't perform the operation, as `toObjectDecision` decides: `not_found`
 * when the caller can't view the object, and `forbidden` otherwise.
 */
const requireOperation = (decision: AclDecision, operation: string) => {
  const outcome = toObjectDecision(decision, operation);
  if (outcome.status === 'not_found') {
    throw new AclChangeError('not_found', 'The object was not found.');
  }

  if (outcome.status === 'forbidden') {
    throw new AclChangeError('forbidden', `Missing "${operation}" permission.`);
  }
};
