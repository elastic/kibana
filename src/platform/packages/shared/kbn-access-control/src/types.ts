/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Access levels in ascending order. Each level includes every level below it.
 */
export const ACL_LEVELS = ['none', 'view', 'use', 'edit', 'manage'] as const;
export type AclLevel = (typeof ACL_LEVELS)[number];

/**
 * Level that applies to everyone who can reach the object. It can never be `manage`.
 */
export type GeneralAccessLevel = Exclude<AclLevel, 'manage'>;

/**
 * Level a named entry can grant.
 */
export type EntryLevel = Exclude<AclLevel, 'none'>;

export const PRINCIPAL_TYPES = ['user', 'service_account'] as const;
export type PrincipalType = (typeof PRINCIPAL_TYPES)[number];

/**
 * Identity that can own an object or receive a grant. Users are identified by their profile UID,
 * service accounts by their `namespace/service` ID.
 */
export interface Principal {
  type: PrincipalType;
  id: string;
}

/**
 * Operations every policy must define. A type can add its own operations, for example `use`.
 */
export const REQUIRED_OPERATIONS = ['view', 'edit', 'delete'] as const;

/**
 * Operations the platform owns. A policy cannot define them: `manage_access` follows the `manage`
 * level, and `transfer` belongs to the owner and to recovery administrators only.
 */
export const RESERVED_OPERATIONS = ['manage_access', 'transfer'] as const;
export type ReservedOperation = (typeof RESERVED_OPERATIONS)[number];

export interface AccessOperation {
  /** The lowest level that permits the operation. */
  level: EntryLevel;
  /** Feature privileges that cap the operation. Security resolves them to privilege actions. */
  privileges: {
    savedObject?: ReadonlyArray<{ type: string; operation: string }>;
    api?: readonly string[];
  };
}

/**
 * Per-type access policy, declared once when the type is registered.
 */
export interface AccessPolicy {
  generalAccess: { default: GeneralAccessLevel; allowed: readonly GeneralAccessLevel[] };
  entryLevels: readonly EntryLevel[];
  operations: Readonly<Record<string, AccessOperation>>;
}

/**
 * Shape Kibana writes for a new or changed ACL.
 */
export interface AclDocument {
  version: 1;
  owner?: Principal;
  general_access: GeneralAccessLevel;
  entries: AclDocumentEntry[];
}

export interface AclDocumentEntry extends Principal {
  access: EntryLevel;
  added_at: string;
}

/**
 * Read shape of a stored ACL. Every leaf holds all values Elasticsearch indexed for it, in source
 * order, so that point reads decide on exactly what the read filter matches.
 */
export interface CanonicalAcl {
  version: unknown[];
  owner: { type: string[]; id: string[] };
  general_access: string[];
  entries: CanonicalAclEntry[];
}

export interface CanonicalAclEntry {
  type: string[];
  id: string[];
  access: string[];
  added_at: string[];
}

/**
 * Caller input for an initial ACL or a replacement.
 */
export interface AclInput {
  general_access?: GeneralAccessLevel;
  entries?: Array<Principal & { access: EntryLevel }>;
}

export type AclChange =
  | {
      kind: 'replace';
      general_access: GeneralAccessLevel;
      entries: NonNullable<AclInput['entries']>;
    }
  | { kind: 'claim'; general_access?: GeneralAccessLevel }
  | { kind: 'transfer'; owner: Principal };

export interface AclWarning {
  principal: Principal;
  level: EntryLevel;
  reason: 'missing_feature_privileges';
}

/**
 * Whether a stored ACL is missing, usable, or damaged. A damaged ACL denies ordinary access.
 */
export type AclState = 'absent' | 'valid' | 'invalid';

export interface AclDecision {
  state: AclState;
  /** Highest ordinary grant the caller has from general access, entries, or ownership. */
  level: AclLevel;
  isOwner: boolean;
  /** Valid ACL whose general access is below the type default, or that has named entries. */
  restricted: boolean;
  /** Operations the caller can perform, including those allowed only by recovery. */
  operations: ReadonlySet<string>;
  /** Operations allowed only by recovery. */
  viaRecovery: ReadonlySet<string>;
}

export type AclObjectDecision =
  | { status: 'allowed' }
  | { status: 'not_found' }
  | { status: 'forbidden'; operation: string };
