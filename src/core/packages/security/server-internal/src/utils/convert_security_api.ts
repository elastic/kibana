/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { deepFreeze } from '@kbn/std';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import type { CoreSecurityDelegateContract, FakeRequestEnricher } from '@kbn/core-security-server';
import type { Logger } from '@kbn/logging';
import type { InternalSecurityServiceStart } from '../internal_contracts';

/**
 * Identity fields blocked on the synthetic user produced by
 * {@link CoreFakeRequestEnrichment.enrichRequestWithUserProfile}. Reading
 * any of these throws so callers can't derive identity from an enriched
 * fake request; only `profile_uid` is intentionally accessible.
 *
 * The `Record<keyof Omit<AuthenticatedUser, 'profile_uid'>, true>` shape
 * forces this list to stay in sync with the type — adding/removing a
 * field on `AuthenticatedUser` is a compile error until reflected here.
 */
const ENRICHED_USER_BLOCKED_PROPERTIES_RECORD: Record<
  keyof Omit<AuthenticatedUser, 'profile_uid'>,
  true
> = {
  username: true,
  email: true,
  full_name: true,
  roles: true,
  enabled: true,
  metadata: true,
  authentication_realm: true,
  lookup_realm: true,
  authentication_provider: true,
  authentication_type: true,
  elastic_cloud_user: true,
  operator: true,
  api_key: true,
};

const ENRICHED_USER_BLOCKED_PROPERTIES = new Set<string>(
  Object.keys(ENRICHED_USER_BLOCKED_PROPERTIES_RECORD)
);

/**
 * Pairs the public `enrichRequestWithUserProfile` (exposed via
 * `SecurityServiceSetup.getFakeRequestEnricher`) with `getOverride`,
 * consulted by `convertSecurityApi`'s `getCurrentUser`. Both close over the
 * same WeakMap so enrichment at setup is observable at start.
 */
export interface CoreFakeRequestEnrichment {
  enrichRequestWithUserProfile: FakeRequestEnricher;
  getOverride(request: KibanaRequest): AuthenticatedUser | undefined;
}

export const createFakeRequestEnrichment = (logger: Logger): CoreFakeRequestEnrichment => {
  const fakeRequestUsers = new WeakMap<KibanaRequest, AuthenticatedUser>();

  const enrichRequestWithUserProfile: FakeRequestEnricher = (request, userProfileId) => {
    if (!request.isFakeRequest) {
      throw new Error(
        `enrichRequestWithUserProfile must only be called on a fake request ` +
          `(profile_uid="${userProfileId}").`
      );
    }

    if (fakeRequestUsers.has(request)) {
      logger.warn(
        `enrichRequestWithUserProfile called on an already-enriched fake request; ignoring ` +
          `the new enrichment (profile_uid="${userProfileId}").`
      );
      return;
    }

    logger.debug(`Enriching request with user profile ID "${userProfileId}".`);

    // Synthetic user that only exposes `profile_uid`. Reading any blocked
    // identity field throws; everything else (symbols, unknown props) falls
    // through to the empty target so JS reflection (`then`, `JSON.stringify`,
    // etc.) keeps working.
    const enrichedUserStub: Partial<AuthenticatedUser> = { profile_uid: userProfileId };
    const enrichedUser = deepFreeze(
      new Proxy(enrichedUserStub as AuthenticatedUser, {
        get: (target, prop, receiver) => {
          if (typeof prop === 'string' && ENRICHED_USER_BLOCKED_PROPERTIES.has(prop)) {
            throw new Error(
              `Property "${prop}" is not available on a fake request enriched ` +
                `with a user profile. Use profile_uid for per-user lookups.`
            );
          }
          return Reflect.get(target, prop, receiver);
        },
      })
    );
    fakeRequestUsers.set(request, enrichedUser);
  };

  return {
    enrichRequestWithUserProfile,
    getOverride: (request) => fakeRequestUsers.get(request),
  };
};

export const convertSecurityApi = (
  privateApi: CoreSecurityDelegateContract,
  fakeRequestEnrichment: CoreFakeRequestEnrichment
): InternalSecurityServiceStart => {
  const getCurrentUser = (request: KibanaRequest): AuthenticatedUser | null => {
    if (request.isFakeRequest) {
      const override = fakeRequestEnrichment.getOverride(request);
      if (override) return override;
    }
    return privateApi.authc.getCurrentUser(request);
  };

  return {
    authc: {
      getCurrentUser,
      getRedactedSessionId: privateApi.authc.getRedactedSessionId,
      apiKeys: privateApi.authc.apiKeys,
    },
    audit: privateApi.audit,
  };
};
