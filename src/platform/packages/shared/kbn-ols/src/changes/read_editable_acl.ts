/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AclGrant, StoredAcl } from '../acl';
import { compareLevels, lowestAllowed, type GeneralAccessLevel } from '../levels';
import type { AccessPolicy } from '../policy';
import { getPrincipalKey, getPrincipalKind, type Principal } from '../principals';

/**
 * The current access of an object, read from its stored ACL into the shapes Kibana writes, for a
 * person or a change to start from: an access panel shows it and seeds its draft, and a
 * replacement or a transfer builds the next ACL from it. Unlike a {@link StoredAcl}, it keeps only
 * what grants something, as single values. Unlike an `Acl`, it has no version, and its owner and
 * `added_at` can be missing, because stored data can lack them.
 */
export interface EditableAcl {
  /**
   * The owner, when the stored owner names exactly one principal: one known kind and one non-empty
   * ID. It's left out when the stored owner has no known kind, several known kinds, or not exactly
   * one non-empty ID. Kibana always writes one owner, so each of these came from outside Kibana.
   * Several IDs leave the ACL valid, with each ID as an owner, and so does an owner with only an
   * empty ID, which nobody matches. Neither can be written back as the one owner. A replacement
   * refuses an ACL without an owner here, and a transfer repairs it.
   */
  owner?: Principal;
  /** The general access that applies, or `none` when the type allows none of the stored values. */
  general_access: GeneralAccessLevel;
  /** One entry for each principal that a stored entry grants something to. */
  entries: EditableAclEntry[];
}

/**
 * Entry of an {@link EditableAcl}: the grant that stored entries give one principal, in the shape
 * Kibana writes.
 */
export interface EditableAclEntry extends AclGrant {
  /**
   * When the grant was added. Stored data can lack it, so a caller that writes the entry back
   * has to fill it in.
   */
  added_at?: string;
}

/**
 * Whether a stored ID can name a principal. An empty ID matches nobody, and a request can't
 * contain one, so it's read as if it weren't stored.
 */
const isPrincipalId = (id: string) => id.length > 0;

/**
 * Reads an object's current access from its stored ACL, so that it can be shown, edited, or written
 * back in the shapes Kibana writes. It applies the rules for reading a stored ACL: an entry that
 * grants to several IDs becomes one entry for each ID, an entry without exactly one known kind or
 * an allowed level is dropped, and several entries for one principal keep the highest grant. An
 * empty ID is skipped, in the owner and in entries, because it names nobody.
 *
 * @param policy The access policy of the object's type.
 * @param acl The object's stored ACL. It can be invalid: it's read the same way.
 * @returns The owner, general access, and entries.
 */
export const readEditableAcl = (policy: AccessPolicy, acl: StoredAcl): EditableAcl => {
  const ownerKind = getPrincipalKind(acl.owner.type);
  const ownerIds = acl.owner.id.filter(isPrincipalId);
  const owner =
    ownerKind && ownerIds.length === 1 ? { type: ownerKind, id: ownerIds[0] } : undefined;

  const entries = new Map<string, EditableAclEntry>();
  for (const entry of acl.entries) {
    const kind = getPrincipalKind(entry.type);
    const access = lowestAllowed(entry.access, policy.entryLevels);
    if (!kind || !access) {
      continue;
    }

    for (const id of entry.id.filter(isPrincipalId)) {
      const key = getPrincipalKey({ type: kind, id });
      const existing = entries.get(key);
      if (!existing || compareLevels(access, existing.access) > 0) {
        const [addedAt] = entry.added_at;
        entries.set(key, { type: kind, id, access, ...(addedAt && { added_at: addedAt }) });
      }
    }
  }

  return {
    ...(owner && { owner }),
    general_access: lowestAllowed(acl.general_access, policy.generalAccessLevels) ?? 'none',
    entries: [...entries.values()],
  };
};
