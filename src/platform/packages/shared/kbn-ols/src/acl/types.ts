/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EntryAccess, GeneralAccess } from '../levels';
import type { Principal, StoredPrincipal } from '../principals';

/**
 * Well-formed ACL, the only shape Kibana writes to an object's `acl` field.
 */
export interface Acl {
  /** Version of the ACL format. Only `1` exists. */
  version: 1;
  /**
   * The object's owner. Every ACL Kibana writes has one, so a stored ACL without an owner is
   * damaged and grants nothing.
   */
  owner: Principal;
  /** What everyone who can reach the object can do. */
  general: AclGeneral;
  /** Grants to named principals. */
  entries: AclEntry[];
}

/**
 * General access of an ACL: what everyone who can reach the object can do. It's an object, not a
 * single value, so that it has the same shape as an entry and can get more fields later without a
 * new mapping.
 */
export interface AclGeneral {
  /** The access everyone gets. It has to be a value the object's type allows for general access. */
  access: GeneralAccess;
}

/**
 * A grant of access to one named principal, without the time it was added. A caller asks for
 * grants in this shape, and every kind of ACL entry extends it.
 */
export interface AclGrant extends Principal {
  /** The granted access. It has to be a value the object's type allows for entries. */
  access: EntryAccess;
}

/**
 * Entry of an {@link Acl}: a grant with the time it was added.
 */
export interface AclEntry extends AclGrant {
  /** When the grant was added, as an ISO 8601 timestamp. */
  added_at: string;
}

/**
 * ACL as it is read back from storage, as opposed to {@link Acl}, the shape Kibana writes.
 *
 * Elasticsearch lets any stored field hold several values, for example
 * `"general": { "access": ["edit", "none"] }` in a hand-edited document, and a search matches the
 * document when any of those values matches. For reading a single object to agree with searching
 * for it, the read keeps every value of every field, in stored order, and the access rules decide
 * what several values mean (for access values, the lowest allowed one wins). Fields that don't
 * affect access, such as `added_at`, are arrays only so that every field is read the same way.
 */
export interface StoredAcl {
  /**
   * Every stored version value. The ACL is damaged unless it holds at least one value and every
   * value is `1`.
   */
  version: unknown[];
  /**
   * The stored owner. The ACL is damaged unless it names a principal: exactly one known kind and
   * at least one ID. Each ID then owns the object: the package README explains why several IDs all
   * count.
   */
  owner: StoredPrincipal;
  /** The stored general access. */
  general: StoredAclGeneral;
  /** Every stored entry. */
  entries: StoredAclEntry[];
}

/**
 * General access of a {@link StoredAcl}. Like every other field of a stored ACL, its field is an
 * array.
 */
export interface StoredAclGeneral {
  /**
   * Every stored general access value. The ACL is damaged unless at least one value is one that
   * general access can take. The lowest value the type allows then applies, or `none` when the
   * type allows none of them.
   */
  access: string[];
}

/**
 * Entry of a {@link StoredAcl}. Like every other field of a stored ACL, each field is an array.
 * An entry that names no principal grants nothing, and the rest of the ACL still applies. An entry
 * that names one grants its access to each of its IDs.
 */
export interface StoredAclEntry extends StoredPrincipal {
  /**
   * Every stored access value. The lowest one the type allows for entries applies, else nothing.
   */
  access: string[];
  /** Every stored timestamp. It doesn't affect access. */
  added_at: string[];
}

/**
 * State of a stored ACL: no field holds a value, only `null`, `[]`, or `{}` (`absent`), complete
 * and enforced (`valid`), or damaged (`invalid`). A damaged ACL grants no ordinary access.
 */
export type AclState = 'absent' | 'valid' | 'invalid';
