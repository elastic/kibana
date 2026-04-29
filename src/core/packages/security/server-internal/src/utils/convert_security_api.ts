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
 * Properties accessible on the synthetic user produced by
 * {@link CoreFakeRequestEnrichment.enrichRequestWithUserProfile}. Any other
 * string-keyed access throws so consumers cannot read placeholder identity
 * data off an enriched fake request instead of using `profile_uid` for
 * per-user lookups. Symbol-keyed access (e.g. `Symbol.toPrimitive`,
 * `Symbol.toStringTag`, `util.inspect.custom`) is allowed so that JS
 * reflection on the object does not blow up unexpectedly.
 */
const ENRICHED_USER_ALLOWED_PROPERTIES = new Set<string>(['profile_uid']);

/**
 * Internal bundle wiring the Core-owned fake-request enrichment:
 * - `enrichRequestWithUserProfile` is exposed via
 *   `SecurityServiceSetup.getFakeRequestEnricher`.
 * - `getOverride` is consulted by `convertSecurityApi`'s `getCurrentUser`
 *   to resolve enriched fake requests without going through the delegate.
 *
 * Both ends share the same WeakMap closure, so enrichment performed at
 * setup-obtained enricher call sites is observable at start-time
 * `getCurrentUser` call sites.
 */
export interface CoreFakeRequestEnrichment {
  enrichRequestWithUserProfile: FakeRequestEnricher;
  getOverride(request: KibanaRequest): AuthenticatedUser | undefined;
}

/**
 * Create the Core-owned fake-request enrichment state.
 *
 * The WeakMap lives in this closure; the public-facing enrich function and
 * the internal override getter both close over it, so there is no way for
 * a consumer to observe or tamper with the mapping other than through
 * these two methods.
 */
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

    // The synthetic user only exposes `profile_uid`. Reading any other
    // {@link AuthenticatedUser} field throws to surface code paths that
    // try to derive identity (username, roles, realms, etc.) from a fake
    // request enriched purely on behalf of a stored task. Symbol-keyed
    // access is allowed so the proxy plays nicely with JS reflection.
    const enrichedUserStub: Partial<AuthenticatedUser> = { profile_uid: userProfileId };
    const enrichedUser = deepFreeze(
      new Proxy(enrichedUserStub as AuthenticatedUser, {
        get: (target, prop, receiver) => {
          if (typeof prop === 'symbol' || ENRICHED_USER_ALLOWED_PROPERTIES.has(prop)) {
            return Reflect.get(target, prop, receiver);
          }
          throw new Error(
            `Property "${String(prop)}" is not available on a fake request enriched ` +
              `with a user profile. Use profile_uid for per-user lookups.`
          );
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
