/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import type { CoreSecurityDelegateContract, FakeRequestEnricher } from '@kbn/core-security-server';
import type { Logger } from '@kbn/logging';
import type { InternalSecurityServiceStart } from '../internal_contracts';

/**
 * Placeholder written into every identity field of the synthetic user
 * produced by {@link CoreFakeRequestEnrichment.enrichRequestWithUserProfile}
 * other than `profile_uid`. Surfaces any consumer that accidentally reads
 * identity fields off an enriched fake request instead of using
 * `profile_uid` for per-user lookups.
 */
export const ENRICHED_USER_PLACEHOLDER = '__kbn_enriched_fake_request__';

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
      logger.warn(
        `enrichRequestWithUserProfile called on a non-fake request; the enrichment will not ` +
          `be observable via getCurrentUser (profile_uid="${userProfileId}").`
      );
      return;
    }

    if (fakeRequestUsers.has(request)) {
      logger.warn(
        `enrichRequestWithUserProfile called on an already-enriched fake request; ignoring ` +
          `the new enrichment (profile_uid="${userProfileId}").`
      );
      return;
    }

    logger.debug(`Enriching request with user profile ID "${userProfileId}".`);
    const minimalUser: AuthenticatedUser = {
      username: ENRICHED_USER_PLACEHOLDER,
      roles: [],
      enabled: true,
      metadata: { _reserved: false },
      authentication_realm: { name: 'background_task', type: 'background_task' },
      lookup_realm: { name: 'background_task', type: 'background_task' },
      authentication_type: ENRICHED_USER_PLACEHOLDER,
      authentication_provider: { type: 'background_task', name: 'background_task' },
      elastic_cloud_user: false,
      profile_uid: userProfileId,
    };
    fakeRequestUsers.set(request, minimalUser);
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
