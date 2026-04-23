/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreFipsService } from './fips';
import type { CoreAuthenticationService, FakeRequestEnricher } from './authc';
import type { CoreSecurityDelegateContract } from './api_provider';
import type { CoreAuditService } from './audit';
/**
 * Setup contract for Core's security service.
 *
 * @public
 */
export interface SecurityServiceSetup {
  /**
   * Register the security implementation that then will be used and re-exposed by Core.
   *
   * @remark this should **exclusively** be used by the security plugin.
   */
  registerSecurityDelegate(api: CoreSecurityDelegateContract): void;

  /**
   * Returns a function that binds a user profile UID to a fake request so
   * that downstream `security.authc.getCurrentUser(request)` resolves to a
   * minimal {@link AuthenticatedUser} whose `profile_uid` matches the
   * provided value.
   *
   * Intended use: background execution contexts (e.g. Task Manager) that
   * construct fake requests on behalf of a user and need `profile_uid`-keyed
   * lookups (e.g. per-user credentials, `userProfiles.getCurrent()`) to
   * resolve to the originating user.
   *
   * Security boundary: this API does not authenticate the caller and does
   * not verify that `userProfileId` belongs to any particular user. The
   * enriched user object is a synthetic minimal user whose only trusted
   * field is `profile_uid`; every other identity field (username, roles,
   * realm, etc.) is a placeholder and must not be used for authorization,
   * display, auditing, or any identity decision. Callers must treat an
   * enriched fake request as "a background task acting on behalf of a
   * user", not as the user themselves. Only trusted orchestrators that own
   * the fake request lifecycle (e.g. Task Manager creating a fake request
   * from a stored task's API key) should consume this API.
   *
   * Calling the returned function with a non-fake request is a no-op and
   * emits a warning. Calling it twice on the same fake request is also a
   * no-op (first-wins) and emits a warning.
   *
   * @internal
   */
  getFakeRequestEnricher(): FakeRequestEnricher;

  /**
   * The {@link CoreFipsService | FIPS service}
   */
  fips: CoreFipsService;
}

/**
 * Start contract for Core's security service.
 *
 * @public
 */
export interface SecurityServiceStart {
  /**
   * The {@link CoreAuthenticationService | authentication service}
   */
  authc: CoreAuthenticationService;
  /**
   * The {@link CoreAuditService | audit service}
   */
  audit: CoreAuditService;
}
