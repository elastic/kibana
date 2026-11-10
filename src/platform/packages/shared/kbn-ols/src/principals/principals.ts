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
