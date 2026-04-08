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
import type { APIKeysType } from './authentication';

/**
 * Core's authentication service
 *
 * @public
 */
export interface CoreAuthenticationService {
  /**
   * Retrieve the user bound to the provided request, or null if
   * no user is authenticated.
   *
   * @param request The request to retrieve the authenticated user for.
   */
  getCurrentUser(request: KibanaRequest): AuthenticatedUser | null;
  /**
   * Bind a user profile to a fake request so that
   * {@link getCurrentUser} returns an {@link AuthenticatedUser} whose
   * `profile_uid` matches the provided value. Intended for background
   * execution contexts (e.g. Task Manager, alerting) where only the
   * originating user's profile ID is available.
   *
   * @param request The (fake) request to enrich.
   * @param userProfileId The user profile UID to associate.
   */
  enrichRequestWithUserProfile(request: KibanaRequest, userProfileId: string): void;
  /**
   * Retrieve the redacted session ID for the provided request.
   * Returns a redacted form of the session ID (e.g. last N characters).
   * Returns undefined if no session exists for the request.
   *
   * @param request The request to retrieve the session ID for.
   */
  getRedactedSessionId(request: KibanaRequest): Promise<string | undefined>;
  apiKeys: APIKeysType;
}
