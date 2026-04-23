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
   * Retrieve the redacted session ID for the provided request.
   * Returns a redacted form of the session ID (e.g. last N characters).
   * Returns undefined if no session exists for the request.
   *
   * @param request The request to retrieve the session ID for.
   */
  getRedactedSessionId(request: KibanaRequest): Promise<string | undefined>;
  apiKeys: APIKeysType;
}

/**
 * Binds a user profile UID to a fake request so that downstream
 * `security.authc.getCurrentUser(request)` resolves to a minimal
 * {@link AuthenticatedUser} whose `profile_uid` matches the provided value.
 *
 * Obtained via {@link SecurityServiceSetup.getFakeRequestEnricher} at Core
 * setup time. See that method for the full security boundary and intended
 * use.
 *
 * @internal Intended for trusted orchestrators that own the fake request
 *   lifecycle (e.g. Task Manager). Not for general plugin consumption.
 */
export type FakeRequestEnricher = (request: KibanaRequest, userProfileId: string) => void;
