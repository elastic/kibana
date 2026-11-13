/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Access levels, ordered from lowest to highest. Each level includes every level below it, so the
 * order is the meaning.
 */
export const ACL_LEVELS = ['none', 'view', 'use', 'edit', 'manage'] as const;

/**
 * One of the {@link ACL_LEVELS}.
 */
export type AclLevel = (typeof ACL_LEVELS)[number];

/**
 * Level that general access can take, which applies to everyone who can reach the object. It can
 * never be `manage`.
 */
export type GeneralAccessLevel = Exclude<AclLevel, 'manage'>;

/**
 * Level that an entry can grant to a named principal. It can never be `none`.
 */
export type EntryLevel = Exclude<AclLevel, 'none'>;

const LEVEL_RANKS: ReadonlyMap<string, number> = new Map(
  ACL_LEVELS.map((level, rank) => [level, rank])
);

/**
 * Checks whether a value is a known access level.
 *
 * @param value The value to check, for example one read from a stored ACL.
 * @returns `true` when the value is one of the {@link ACL_LEVELS}.
 */
export const isAclLevel = (value: string): value is AclLevel => LEVEL_RANKS.has(value);

/**
 * Checks whether a value is a level that general access can take.
 *
 * @param value The value to check.
 * @returns `true` when the value is a known level other than `manage`.
 */
export const isGeneralAccessLevel = (value: string): value is GeneralAccessLevel =>
  value !== 'manage' && isAclLevel(value);

/**
 * Checks whether a value is a level that an entry can grant.
 *
 * @param value The value to check.
 * @returns `true` when the value is a known level other than `none`.
 */
export const isEntryLevel = (value: string): value is EntryLevel =>
  value !== 'none' && isAclLevel(value);

/**
 * Compares two levels by their position in {@link ACL_LEVELS}.
 *
 * @param a The first level.
 * @param b The second level.
 * @returns A negative number when `a` is lower than `b`, zero when they are equal, and a positive
 * number when `a` is higher.
 */
export const compareLevels = (a: AclLevel, b: AclLevel) =>
  (LEVEL_RANKS.get(a) ?? 0) - (LEVEL_RANKS.get(b) ?? 0);

/**
 * Returns the higher of two levels.
 *
 * @param a The first level.
 * @param b The second level.
 * @returns `a` when it is at least as high as `b`, otherwise `b`.
 */
export const maxLevel = (a: AclLevel, b: AclLevel) => (compareLevels(a, b) >= 0 ? a : b);

/**
 * Returns the lowest of the stored values that the type allows, ignoring every other value. A
 * stored field with several values must never grant more than its most restrictive allowed value.
 *
 * @param values The values stored in one field, in any order.
 * @param allowed The levels the type allows for that field.
 * @returns The lowest allowed level among `values`, or `undefined` when none of them is allowed.
 */
export const lowestAllowed = <T extends AclLevel>(
  values: readonly string[],
  allowed: readonly T[]
) => {
  // In most cases, the allowed levels are a small subset of ACL_LEVELS, so it should be cheaper to
  // iterate over them multiple times than pre-allocating a filtered set.
  let lowest: T | undefined;
  for (const level of allowed) {
    if (values.includes(level) && (lowest === undefined || compareLevels(level, lowest) < 0)) {
      lowest = level;
    }
  }

  return lowest;
};
