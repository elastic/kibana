/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IClusterClient, KibanaRequest, SecurityServiceStart } from '@kbn/core/server';
import type { WorkflowExecutionExecutedByUser } from '@kbn/workflows';

/** Identity of the user who triggered a workflow execution. */
export interface ResolvedExecutionIdentity {
  /** Stable identity written to `executedBy`: profile UID when available, otherwise username. */
  executedBy: string;
  /** Human-readable identity snapshot persisted to `executedByUser`. */
  user: WorkflowExecutionExecutedByUser;
}

/**
 * Gets the authenticated user information from the request.
 * Handles both regular requests and fake requests (Task Manager contexts).
 *
 * @param request - The Kibana request object
 * @param security - Core's security service instance
 * @param clusterClient - Elasticsearch cluster client for fallback authentication with API keys
 * @returns The resolved identity, or `undefined` when no identity can be resolved.
 * @remarks Always **resolves** — does not throw or reject. Failures in auth lookup are
 *   swallowed so callers (e.g. audit metadata) cannot block core workflow actions.
 *   `undefined` means no identity was resolved; it is distinct from a real principal
 *   whose username is the string `'unknown'`.
 */
export async function getAuthenticatedUser(
  request: KibanaRequest,
  security: SecurityServiceStart,
  clusterClient: IClusterClient
): Promise<ResolvedExecutionIdentity | undefined> {
  // Try getCurrentUser first (works for regular authenticated requests)
  try {
    const user = security.authc.getCurrentUser(request);
    if (user?.profile_uid || user?.username) {
      return {
        executedBy: user.profile_uid ?? user.username,
        user: {
          name: user.full_name || user.username,
          username: user.username,
          ...(user.profile_uid ? { profileUid: user.profile_uid } : {}),
        },
      };
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
        return {
          executedBy: authResponse.username,
          user: {
            name: authResponse.full_name || authResponse.username,
            username: authResponse.username,
          },
        };
      }
    } catch (error) {
      // Fall through to system user
    }
  }

  return undefined;
}
