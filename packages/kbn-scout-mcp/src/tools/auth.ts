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
 * Login with a role using Scout's SAML authentication
 *
 * This follows the same pattern as Scout's browserAuth fixture:
 * 1. Validates the role exists (unless it's a custom role)
 * 2. Uses SAML session manager to get a session cookie for the role
 * 3. Sets the cookie in the browser context
 * 4. The cookie authenticates subsequent requests
 *
 * Session caching: SamlSessionManager internally caches sessions by role,
 * so repeated logins with the same role will reuse the cached session.
 */
export async function scoutLogin(session: ScoutSession, params: LoginParams): Promise<ToolResult> {
  if (!session.isInitialized()) {
    return error('Session not initialized. Please initialize the session first.');
  }

  return executeSafely(async () => {
    const context = session.getContext();
    if (!context) {
      throw new Error('Browser context not available');
    }

    const kbnUrl = await session.getKbnUrl();
    const samlSessionManager = await session.getSamlSessionManager();

    // Helper function to set session cookie (matches browserAuth pattern)
    const setSessionCookie = async (cookieValue: string) => {
      await context.clearCookies();
      await context.addCookies([
        {
          name: 'sid',
          value: cookieValue,
          path: '/',
          domain: kbnUrl.domain(),
        },
      ]);
    };

    // Determine the actual role to use (matches browserAuth pattern)
    let roleToUse: string;

    if (params.customRole) {
      // Handle custom role - set it first, then use the custom role name
      // setCustomRole will cleanup any previous custom role
      await session.setCustomRole(params.customRole as KibanaRole);
      roleToUse = session.getCustomRoleName();
    } else if (params.role === 'privileged') {
      // Handle privileged role - resolve based on serverless mode (matches browserAuth)
      const scoutConfig = session.getScoutConfig();
      roleToUse =
        scoutConfig?.serverless && scoutConfig.projectType
          ? PROJECT_DEFAULT_ROLES.get(scoutConfig.projectType) || 'editor'
          : 'editor';
    } else {
      // Use the role directly (admin, viewer, etc.)
      roleToUse = params.role;

      // Validate role exists (unless it's a custom role)
      if (!roleToUse.startsWith('custom_role_mcp_')) {
        const validation = session.validateRole(roleToUse);
        if (!validation.valid) {
          throw new Error(
            validation.error ||
              `Role '${roleToUse}' is not valid. Please check available roles with scout_get_auth_status.`
          );
        }
      }
    }

    // Get cookie and set it (matches browserAuth's loginAs pattern)
    // Note: SamlSessionManager caches sessions internally, so this will reuse
    // existing sessions for the same role
    let cookie: string;
    try {
      cookie = await samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(roleToUse);
    } catch (samlError) {
      // Provide detailed error message for SAML authentication failures
      let errorDetails: string;
      if (samlError instanceof Error) {
        errorDetails = samlError.message || samlError.toString() || 'Unknown SAML error';
        // If message is empty or just "Error", include stack trace
        if (!errorDetails || errorDetails === 'Error') {
          errorDetails = samlError.toString();
          if (samlError.stack) {
            errorDetails += `\nStack: ${samlError.stack}`;
          }
        }
      } else {
        errorDetails = String(samlError) || 'Unknown SAML error';
      }

      // Add helpful context based on the error
      const supportedRoles = session.getSupportedRoles();
      const helpText = `\n\nAvailable roles: ${supportedRoles.join(', ')}`;
      throw new Error(
        `SAML authentication failed for role '${roleToUse}': ${errorDetails}${helpText}`
      );
    }
    await setSessionCookie(cookie);

    session.setAuthenticated(true, params.role);

    return {
      role: params.role,
      actualRole: roleToUse,
      message: `Successfully logged in as '${roleToUse}'`,
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
    const scoutPage = await session.getPage();
    const context = session.getContext();

    if (context) {
      // Clear cookies and storage
      await context.clearCookies();
      await context.clearPermissions();
    }

    // Navigate to logout or home
    const baseUrl = session.getTargetUrl();
    await scoutPage.goto(`${baseUrl}/logout`).catch(() => {
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

  const scoutConfig = session.getScoutConfig();

  return success({
    authenticated: session.isUserAuthenticated(),
    role: session.getCurrentRole(),
    supportedRoles: session.getSupportedRoles(),
    deploymentType: scoutConfig?.serverless ? 'serverless' : 'stateful',
    projectType: scoutConfig?.projectType || null,
  });
}

/**
 * Login as admin - convenience method
 */
export async function scoutLoginAsAdmin(session: ScoutSession): Promise<ToolResult> {
  return scoutLogin(session, { role: 'admin' });
}

/**
 * Login as viewer - convenience method
 */
export async function scoutLoginAsViewer(session: ScoutSession): Promise<ToolResult> {
  return scoutLogin(session, { role: 'viewer' });
}

/**
 * Login as privileged user - convenience method
 * Uses 'editor' for stateful, 'developer' for ES serverless,
 * or 'editor' for Security/Observability serverless
 */
export async function scoutLoginAsPrivileged(session: ScoutSession): Promise<ToolResult> {
  return scoutLogin(session, { role: 'privileged' });
}
