/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EntryLevel, GeneralAccessLevel } from '../levels';

/**
 * Operations every policy must define. A type can add its own operations on top of them.
 */
export const REQUIRED_OPERATIONS = ['view', 'edit', 'delete'] as const;

/**
 * Operations the platform owns, which a policy cannot define: `manage_access` follows the `manage`
 * level, and `transfer` belongs to the owner and to recovery administrators only.
 */
export const RESERVED_OPERATIONS = ['manage_access', 'transfer'] as const;

/**
 * One of the {@link RESERVED_OPERATIONS}.
 */
export type ReservedOperation = (typeof RESERVED_OPERATIONS)[number];

const RESERVED_OPERATION_SET: ReadonlySet<string> = new Set(RESERVED_OPERATIONS);

/**
 * Checks whether an operation name is reserved by the platform.
 *
 * @param operation The operation name to check.
 * @returns `true` when the name is one of the {@link RESERVED_OPERATIONS}.
 */
export const isReservedOperation = (operation: string): operation is ReservedOperation =>
  RESERVED_OPERATION_SET.has(operation);

/**
 * What one operation of a type requires.
 */
export interface AccessOperation {
  /** The lowest level that permits the operation. */
  level: EntryLevel;
  /**
   * Feature privileges that cap the operation. Security resolves them to privilege actions. The
   * caller must hold all of them: the lists are an AND, so listing a privilege only ever narrows
   * who can perform the operation.
   */
  privileges: {
    /** Saved Objects privileges, each named by the Saved Object type and the operation on it. */
    savedObject?: ReadonlyArray<{ type: string; operation: string }>;
    /** API privileges, by name. */
    api?: readonly string[];
  };
}

/**
 * Per-type access policy, declared once when the type is registered.
 */
export interface AccessPolicy {
  /** The levels that general access can take for objects of this type. */
  generalAccessLevels: readonly GeneralAccessLevel[];
  /**
   * The general access that new objects get, and that applies to objects without an ACL. It is
   * one of the {@link AccessPolicy.generalAccessLevels}.
   */
  defaultGeneralAccessLevel: GeneralAccessLevel;
  /** The levels that entries can grant. */
  entryLevels: readonly EntryLevel[];
  /**
   * What each operation requires, keyed by operation name. It includes every
   * {@link REQUIRED_OPERATIONS} entry.
   */
  operations: Readonly<Record<string, AccessOperation>>;
}
