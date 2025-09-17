/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, SecurityServiceStart } from '@kbn/core/server';

/**
 * Gets the authenticated user information from the request
 * @param request - The Kibana request object
 * @param security - The security service instance
 * @returns The username of the authenticated user or 'system' as fallback
 */
export function getAuthenticatedUser(
  request: KibanaRequest,
  security?: SecurityServiceStart
): string {
  if (!security) {
    return 'system';
  }

  try {
    const user = security.authc.getCurrentUser(request);
    if (user?.username) {
      return user.username;
    }
  } catch (error) {
    // Fall through to system user
  }

  // For system requests or when authentication fails
  return 'system';
}

/**
 * Gets detailed user information including profile data
 * @param request - The Kibana request object
 * @param security - The security service instance
 * @returns User information object
 */
export async function getDetailedUserInfo(
  request: KibanaRequest,
  security?: SecurityServiceStart
): Promise<{
  username: string;
  full_name?: string;
  email?: string;
  profile_uid?: string;
}> {
  if (!security) {
    return { username: 'system' };
  }

  try {
    // Try to get current user first
    const user = security.authc.getCurrentUser(request);
    if (user) {
      return {
        username: user.username,
        full_name: user.full_name || undefined,
        email: user.email || undefined,
      };
    }
  } catch (error) {
    // Fall through to system user
  }

  return { username: 'system' };
}
