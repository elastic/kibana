/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IClusterClient, KibanaRequest, SecurityServiceStart } from '@kbn/core/server';

/**
 * Gets the authenticated user information from the request.
 * Handles both regular requests and fake requests (Task Manager contexts).
 *
 * @param request - The Kibana request object
 * @param security - Core's security service instance
 * @param clusterClient - Elasticsearch cluster client for fallback authentication with API keys
 * @returns A promise that resolves to the username of the authenticated user or 'system' as fallback
 */
export async function getAuthenticatedUser(
  request: KibanaRequest,
  security: SecurityServiceStart,
  clusterClient: IClusterClient
): Promise<string> {
  // Try getCurrentUser first (works for regular authenticated requests)
  try {
    const user = security.authc.getCurrentUser(request);
    if (user?.username) {
      return user.username;
    }
  } catch (error) {
    // Fall through to API key authentication
  }

  // For fake requests with API keys (Task Manager contexts), use ES security.authenticate
  // This is a workaround here: https://elastic.slack.com/archives/C6R17GU7R/p1712694768074839
  if (request.headers.authorization) {
    try {
      const scopedClient = clusterClient.asScoped(request);
      const authResponse = await scopedClient.asCurrentUser.security.authenticate();
      if (authResponse.username) {
        return authResponse.username;
      }
    } catch (error) {
      // Fall through to system user
    }
  }

  // For the time being, this is WTF - should never happen since we don't have "system" execution
  return 'unknown';
}
