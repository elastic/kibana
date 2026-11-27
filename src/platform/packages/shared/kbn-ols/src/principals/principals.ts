/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Kinds of principals that can own an object or receive a grant.
 */
export const PRINCIPAL_TYPES = ['user', 'service_account'] as const;

/**
 * One of the {@link PRINCIPAL_TYPES}.
 */
export type PrincipalType = (typeof PRINCIPAL_TYPES)[number];

/**
 * Identity that can own an object or receive a grant.
 */
export interface Principal {
  /** The kind of principal. */
  type: PrincipalType;
  /** The profile UID for a user, or the `namespace/service` ID for a service account. */
  id: string;
}

/**
 * Principal as it is read back from storage, as opposed to {@link Principal}, the shape Kibana
 * writes. Each field keeps every stored value, in stored order. Unknown kinds are ignored, and the
 * stored principal names nobody unless exactly one known kind remains. It then names each of its
 * IDs with that kind.
 */
export interface StoredPrincipal {
  /** Every stored principal kind. */
  type: string[];
  /** Every stored principal ID. */
  id: string[];
}

const PRINCIPAL_TYPE_SET: ReadonlySet<string> = new Set(PRINCIPAL_TYPES);

/**
 * Checks whether a value is one of the {@link PRINCIPAL_TYPES}.
 *
 * @param value The value to check, for example a kind read from storage.
 * @returns `true` when the value is a known principal kind.
 */
export const isPrincipalType = (value: string): value is PrincipalType =>
  PRINCIPAL_TYPE_SET.has(value);

/**
 * Returns the one known principal kind among stored kinds. Unknown kinds are ignored, so that a
 * kind added later doesn't break grants that Kibana reads today.
 *
 * @param types Every kind stored for an owner or an entry.
 * @returns The known kind, or `undefined` when there is none or more than one.
 */
export const getPrincipalKind = (types: readonly string[]): PrincipalType | undefined => {
  const kinds = new Set(types.filter(isPrincipalType));
  return kinds.size === 1 ? kinds.values().next().value : undefined;
};

/**
 * Checks whether a principal ID isn't blank, that is, neither empty nor only whitespace. A request
 * with a blank ID is refused, and a blank ID read from storage is skipped, so that an ACL read for
 * editing can always be written back. It doesn't check that the principal exists.
 *
 * @param id The ID to check, from a request or from storage.
 * @returns `true` when the ID isn't blank.
 */
export const isNonBlankPrincipalId = (id: string) => id.trim() !== '';

/**
 * Checks whether a stored owner or entry names a principal, following the rules of
 * {@link StoredPrincipal}: its one known kind is the principal's, and its IDs include the
 * principal's ID.
 *
 * @param storedPrincipal The stored owner or entry.
 * @param principal The principal to look for.
 * @returns `true` when the stored owner or entry names the principal.
 */
export const matchesPrincipal = (storedPrincipal: StoredPrincipal, principal: Principal) =>
  getPrincipalKind(storedPrincipal.type) === principal.type &&
  storedPrincipal.id.includes(principal.id);

/**
 * Returns a key that identifies a principal, for lookups in a `Set` or a `Map`.
 *
 * @param principal The principal.
 * @returns The kind and the ID, joined with a colon.
 */
export const getPrincipalKey = ({ type, id }: Principal) => `${type}:${id}`;
