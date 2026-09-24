/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AuthenticatedUser } from './authenticated_user';

/** Elasticsearch's realm type for its own service accounts. */
export const SERVICE_ACCOUNT_REALM_TYPE = '_service_account';

/** Elasticsearch's realm type for UIAM (Cloud) service accounts. */
export const CLOUD_SERVICE_ACCOUNT_REALM_TYPE = '_cloud_service_account';

/**
 * The kind of principal a request was authenticated as, with the backend variant where there is
 * one. Computed from an {@link AuthenticatedUser}; never persisted, so it is free to grow.
 * `variant` uses one vocabulary on every arm: `stack` for credentials Elasticsearch issues itself,
 * `uiam` for credentials issued by UIAM.
 *
 * Shares its vocabulary with the persisted `ServiceAccountWorkloadBinder` on purpose, but is a
 * distinct type: the binder is stored and must stay stable.
 */
export type AuthenticatedPrincipal =
  | { type: 'user'; username: string; userProfileId?: string }
  | { type: 'anonymous'; username: string }
  | { type: 'api_key'; apiKeyId: string; variant: 'stack' | 'uiam' }
  | { type: 'service_account'; serviceAccountId: string; variant: 'stack' | 'uiam' };

const toUserPrincipal = (user: AuthenticatedUser): AuthenticatedPrincipal => ({
  type: 'user',
  username: user.username,
  ...(user.profile_uid ? { userProfileId: user.profile_uid } : {}),
});

/**
 * Classifies the given authenticated user by the kind of principal that authenticated it.
 *
 * Pure and synchronous. Only the `http` authentication provider accepts API keys and service
 * account tokens; every other provider yields a session-backed user. Deciding on the provider
 * first also keeps this function off `authentication_realm` and `authentication_type`, which throw
 * on minimally authenticated users, and lets partial users (the fake-request enrichment override)
 * degrade to `user`. Unrecognized credentials over the `http` provider fail closed to `user`.
 */
export function getAuthenticatedPrincipal(user: AuthenticatedUser): AuthenticatedPrincipal {
  const providerType = user.authentication_provider?.type;

  if (providerType === 'anonymous') {
    return { type: 'anonymous', username: user.username };
  }

  if (providerType !== 'http') {
    return toUserPrincipal(user);
  }

  const realmType = user.authentication_realm?.type;

  if (realmType === SERVICE_ACCOUNT_REALM_TYPE) {
    return { type: 'service_account', serviceAccountId: user.username, variant: 'stack' };
  }

  if (realmType === CLOUD_SERVICE_ACCOUNT_REALM_TYPE) {
    return { type: 'service_account', serviceAccountId: user.username, variant: 'uiam' };
  }

  if (user.api_key) {
    return {
      type: 'api_key',
      apiKeyId: user.api_key.id,
      variant: user.api_key.managed_by === 'cloud' ? 'uiam' : 'stack',
    };
  }

  return toUserPrincipal(user);
}
