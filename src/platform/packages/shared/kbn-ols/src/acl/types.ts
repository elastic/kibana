/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EntryLevel, GeneralAccessLevel } from '../levels';
import type { Principal } from '../principals';

/**
 * Well-formed ACL, the only shape Kibana writes to an object's `acl` field.
 */
export interface Acl {
  /** Version of the ACL format. Only `1` exists. */
  version: 1;
  /**
   * The object's owner. Every ACL Kibana writes has one: an object without an owner has no ACL
   * at all, and its type's default general access applies.
   */
  owner: Principal;
  /** What everyone who can reach the object can do. */
  general_access: GeneralAccessLevel;
  /** Grants to named principals. */
  entries: AclEntry[];
}

/**
 * Entry of an {@link Acl}: a grant of one level to one named principal.
 */
export interface AclEntry extends Principal {
  /** The granted level. */
  access: EntryLevel;
  /** When the grant was added, as an ISO 8601 timestamp. */
  added_at: string;
}

/**
 * ACL as it is read back from storage, as opposed to {@link Acl}, the shape Kibana writes.
 *
 * Elasticsearch lets any stored field hold several values, for example
 * `"general_access": ["edit", "none"]` in a hand-edited document, and a search matches the document
 * when any of those values matches. For reading a single object to agree with searching for it,
 * the read keeps every value of every field, in stored order, and the access rules decide what
 * several values mean (for levels, the lowest allowed one wins). Fields that don't affect access,
 * such as `added_at`, are arrays only so that every field is read the same way.
 */
export interface StoredAcl {
  /** Every stored version value. A valid ACL holds only `1`. */
  version: unknown[];
  /** Every stored owner kind and ID. A valid owner has one of each. */
  owner: { type: string[]; id: string[] };
  /** Every stored general access value. */
  general_access: string[];
  /** Every stored entry. */
  entries: StoredAclEntry[];
}

/**
 * Entry of a {@link StoredAcl}. Like every other field of a stored ACL, each field is an array.
 */
export interface StoredAclEntry {
  /** Every stored principal kind. A valid entry has one. */
  type: string[];
  /** Every stored principal ID. */
  id: string[];
  /** Every stored level. */
  access: string[];
  /** Every stored timestamp. A valid entry has one. */
  added_at: string[];
}

/**
 * State of a stored ACL: missing or holding only empty values (`absent`), enforced (`valid`), or
 * damaged (`invalid`). A damaged ACL grants no ordinary access.
 */
export type AclState = 'absent' | 'valid' | 'invalid';
