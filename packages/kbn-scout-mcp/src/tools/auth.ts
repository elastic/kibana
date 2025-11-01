/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRole } from '@kbn/scout';
import type { ScoutSession } from '../session';
import type { LoginParams, ToolResult } from '../types';
import { success, error, executeSafely } from '../utils';

/**
 * Default roles for serverless project types
 * Matches the mapping used in Scout's PROJECT_DEFAULT_ROLES
 */
const PROJECT_DEFAULT_ROLES = new Map<string, string>([
  ['es', 'developer'],
  ['security', 'editor'],
  ['oblt', 'editor'],
]);

/**
 * Validate custom role to prevent excessive permissions
 */
function validateCustomRole(role: LoginParams['customRole']): void {
  if (!role) {
    return;
  }

  // Limit the number of Kibana spaces (prevent excessive access)
  if (role.kibana && role.kibana.length > 10) {
    throw new Error('Custom role cannot have more than 10 Kibana space entries');
  }

  // Validate each Kibana entry
  for (const entry of role.kibana || []) {
    // Limit spaces per entry
    if (entry.spaces && entry.spaces.length > 20) {
      throw new Error('Kibana role entry cannot have more than 20 spaces');
    }

    // Limit base privileges
    if (entry.base && entry.base.length > 10) {
      throw new Error('Kibana role entry cannot have more than 10 base privileges');
    }

    // Validate feature privileges are reasonable
    if (entry.feature) {
      const featureKeys = Object.keys(entry.feature);
      if (featureKeys.length > 50) {
        throw new Error('Kibana role entry cannot have more than 50 feature privilege entries');
      }
      for (const featurePrivs of Object.values(entry.feature)) {
        if (featurePrivs.length > 20) {
          throw new Error('Feature cannot have more than 20 privilege entries');
        }
      }
    }
  }

  // Validate Elasticsearch role if present
  if (role.elasticsearch) {
    // Limit cluster privileges
    if (role.elasticsearch.cluster && role.elasticsearch.cluster.length > 20) {
      throw new Error('Elasticsearch role cannot have more than 20 cluster privileges');
    }

    // Limit indices entries
    if (role.elasticsearch.indices && role.elasticsearch.indices.length > 100) {
      throw new Error('Elasticsearch role cannot have more than 100 index entries');
    }

    // Validate each index entry
    for (const indexEntry of role.elasticsearch.indices || []) {
      if (indexEntry.names && indexEntry.names.length > 50) {
        throw new Error('Index entry cannot cover more than 50 index patterns');
      }
      if (indexEntry.privileges && indexEntry.privileges.length > 20) {
        throw new Error('Index entry cannot have more than 20 privileges');
      }
    }
  }
}

/**
 * Login with a role using Scout's SAML authentication
 *
 * This follows the same pattern as Scout's browserAuth fixture:
 * 1. Uses SAML session manager to get a session cookie for the role
 * 2. Sets the cookie in the browser context
 * 3. The cookie authenticates subsequent requests
 */
export async function scoutLogin(session: ScoutSession, params: LoginParams): Promise<ToolResult> {
  if (!session.isInitialized()) {
    return error('Session not initialized');
  }

  return executeSafely(async () => {
    const context = session.getContext();
    if (!context) {
      throw new Error('Browser context not available');
    }

    // Validate custom role before using it
    if (params.customRole) {
      validateCustomRole(params.customRole);
    }

    // Determine the actual role to use
    let roleToUse = params.role;

    // Handle custom role
    if (params.customRole) {
      await session.setCustomRole(params.customRole as KibanaRole);
      roleToUse = session.getCustomRoleName();
    } else if (params.role === 'privileged') {
      // Handle privileged role - resolve based on serverless mode
      const scoutConfig = session.getScoutConfig();
      if (scoutConfig?.serverless && scoutConfig.projectType) {
        roleToUse = PROJECT_DEFAULT_ROLES.get(scoutConfig.projectType) || 'editor';
      } else {
        roleToUse = 'editor';
      }
    }

    // Get SAML session cookie for the role
    const samlSessionManager = await session.getSamlSessionManager();
    const cookieValue = await samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(
      roleToUse
    );

    // Get Kibana URL helper to get the domain
    const kbnUrl = await session.getKbnUrl();

    // Set the session cookie in the browser context (same as browserAuth fixture)
    await context.clearCookies();
    await context.addCookies([
      {
        name: 'sid',
        value: cookieValue,
        path: '/',
        domain: kbnUrl.domain(),
      },
    ]);

    session.setAuthenticated(true, params.role);

    return {
      role: params.role,
      message: `Logged in as ${roleToUse}`,
    };
  }, 'Login failed');
}

/**
 * Logout from current session
 */
export async function scoutLogout(session: ScoutSession): Promise<ToolResult> {
  if (!session.isInitialized()) {
    return error('Session not initialized');
  }

  return executeSafely(async () => {
    const page = await session.getPage();
    const context = session.getContext();

    if (context) {
      // Clear cookies and storage
      await context.clearCookies();
      await context.clearPermissions();
    }

    // Navigate to logout or home
    const baseUrl = session.getTargetUrl();
    await page.goto(`${baseUrl}/logout`).catch(() => {
      // Logout endpoint might not exist, that's ok
    });

    session.setAuthenticated(false);

    return 'Logged out successfully';
  }, 'Logout failed');
}

/**
 * Get current authentication status
 */
export async function scoutGetAuthStatus(session: ScoutSession): Promise<ToolResult> {
  if (!session.isInitialized()) {
    return error('Session not initialized');
  }

  return success({
    authenticated: session.isUserAuthenticated(),
    role: session.getCurrentRole(),
  });
}

/**
 * Set session cookie for authentication
 * This is useful when you have a pre-existing session cookie
 */
export async function scoutSetSessionCookie(
  session: ScoutSession,
  params: { name: string; value: string; domain?: string }
): Promise<ToolResult> {
  if (!session.isInitialized()) {
    return error('Session not initialized');
  }

  return executeSafely(async () => {
    const context = session.getContext();
    if (!context) {
      throw new Error('Browser context not available');
    }

    // Get domain from Kibana URL helper if available, otherwise use base URL
    let domain: string;
    try {
      const kbnUrl = await session.getKbnUrl();
      domain = kbnUrl.domain();
    } catch {
      // Get baseURL from session config
      const baseUrl = session.getTargetUrl();
      const url = new URL(baseUrl);
      domain = params.domain || url.hostname;
    }

    await context.clearCookies();
    await context.addCookies([
      {
        name: params.name,
        value: params.value,
        domain,
        path: '/',
      },
    ]);

    session.setAuthenticated(true, 'custom');

    return `Session cookie set: ${params.name}`;
  }, 'Set session cookie failed');
}
