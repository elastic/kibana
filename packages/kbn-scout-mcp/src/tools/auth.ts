/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PROJECT_DEFAULT_ROLES } from '@kbn/scout/src/common';
import type { KibanaRole } from '@kbn/scout';
import type { ScoutSession } from '../session';
import type { LoginParams, ToolResult } from '../types';
import { success, error, executeSafely } from '../utils';

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
    const baseUrl = page.context().options.baseURL || '';
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
      const page = await session.getPage();
      const baseUrl = page.context().options.baseURL || '';
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
