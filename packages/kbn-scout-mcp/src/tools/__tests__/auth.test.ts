/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { scoutLogin, scoutLogout, scoutGetAuthStatus } from '../auth';
import type { ScoutSession } from '../../session';
import type { SamlSessionManager } from '@kbn/test';
import type { BrowserContext } from 'playwright';

describe('Auth Tools', () => {
  let mockSession: jest.Mocked<ScoutSession>;
  let mockSamlManager: jest.Mocked<SamlSessionManager>;
  let mockContext: jest.Mocked<BrowserContext>;

  beforeEach(() => {
    mockSamlManager = {
      getInteractiveUserSessionCookieWithRoleScope: jest
        .fn()
        .mockResolvedValue('test-session-cookie-value'),
      getUserData: jest.fn().mockResolvedValue({
        username: 'test-user',
        full_name: 'Test User',
        email: 'test@example.com',
        roles: ['admin'],
      }),
    } as any;

    mockContext = {
      addCookies: jest.fn().mockResolvedValue(undefined),
      clearCookies: jest.fn().mockResolvedValue(undefined),
      clearPermissions: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockSession = {
      isInitialized: jest.fn().mockReturnValue(true),
      getSamlSessionManager: jest.fn().mockResolvedValue(mockSamlManager),
      getContext: jest.fn().mockReturnValue(mockContext),
      setAuthenticated: jest.fn(),
      isUserAuthenticated: jest.fn().mockReturnValue(false),
      getCurrentRole: jest.fn().mockReturnValue(null),
      setCustomRole: jest.fn().mockResolvedValue(undefined),
      getCustomRoleName: jest.fn().mockReturnValue('custom_role_mcp'),
      getTargetUrl: jest.fn().mockReturnValue('http://localhost:5601'),
      getKbnUrl: jest.fn().mockResolvedValue({
        domain: jest.fn().mockReturnValue('localhost'),
      }),
      getPage: jest.fn().mockResolvedValue({
        goto: jest.fn().mockResolvedValue(null),
      }),
      getScoutConfig: jest.fn().mockReturnValue(null),
      validateRole: jest.fn().mockReturnValue({ valid: true }),
      getSupportedRoles: jest.fn().mockReturnValue(['admin', 'viewer', 'editor']),
    } as any;
  });

  describe('scoutLogin', () => {
    it('should login with predefined role', async () => {
      const result = await scoutLogin(mockSession, { role: 'admin' });

      expect(result.success).toBe(true);
      expect(mockSamlManager.getInteractiveUserSessionCookieWithRoleScope).toHaveBeenCalledWith(
        'admin'
      );
      expect(mockContext.clearCookies).toHaveBeenCalled();
      expect(mockContext.addCookies).toHaveBeenCalled();
      expect(mockSession.setAuthenticated).toHaveBeenCalledWith(true, 'admin');
      expect(result.data.message).toContain('logged in');
    });

    it('should login with viewer role', async () => {
      const result = await scoutLogin(mockSession, { role: 'viewer' });

      expect(result.success).toBe(true);
      expect(mockSamlManager.getInteractiveUserSessionCookieWithRoleScope).toHaveBeenCalledWith(
        'viewer'
      );
    });

    it('should login with custom role name', async () => {
      const result = await scoutLogin(mockSession, { role: 'custom_admin' });

      expect(result.success).toBe(true);
      expect(mockSamlManager.getInteractiveUserSessionCookieWithRoleScope).toHaveBeenCalledWith(
        'custom_admin'
      );
    });

    it('should create and use custom role when provided', async () => {
      const customRole = {
        name: 'test_role',
        kibana: [
          {
            spaces: ['*'],
            base: ['read'],
            feature: {},
          },
        ],
      };

      const result = await scoutLogin(mockSession, {
        role: 'custom_role_mcp',
        customRole,
      });

      expect(result.success).toBe(true);
      expect(mockSession.setCustomRole).toHaveBeenCalledWith(customRole);
      expect(mockSamlManager.getInteractiveUserSessionCookieWithRoleScope).toHaveBeenCalledWith(
        'custom_role_mcp'
      );
    });

    it('should return error if not initialized', async () => {
      mockSession.isInitialized.mockReturnValue(false);
      const result = await scoutLogin(mockSession, { role: 'admin' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not initialized');
    });

    it('should handle SAML authentication errors', async () => {
      mockSamlManager.getInteractiveUserSessionCookieWithRoleScope.mockRejectedValue(
        new Error('Authentication failed')
      );

      const result = await scoutLogin(mockSession, { role: 'admin' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Login failed');
    });

    it('should include role and message in response', async () => {
      const result = await scoutLogin(mockSession, { role: 'admin' });

      expect(result.success).toBe(true);
      expect(result.data.role).toBe('admin');
      expect(result.data.message).toContain('admin');
    });

    it('should warn if custom role provided without matching role name', async () => {
      const customRole = {
        name: 'test_role',
        kibana: [{ spaces: ['*'], base: ['read'], feature: {} }],
      };

      const result = await scoutLogin(mockSession, {
        role: 'admin', // Mismatch!
        customRole,
      });

      // Should still succeed but may log warning
      expect(result.success).toBe(true);
    });
  });

  describe('scoutLogout', () => {
    it('should logout successfully', async () => {
      mockSession.isUserAuthenticated.mockReturnValue(true);
      mockSession.getCurrentRole.mockReturnValue('admin');

      const result = await scoutLogout(mockSession);

      expect(result.success).toBe(true);
      expect(mockSession.setAuthenticated).toHaveBeenCalledWith(false);
      expect(result.data).toContain('Logged out');
    });

    it('should work even when not authenticated', async () => {
      mockSession.isUserAuthenticated.mockReturnValue(false);

      const result = await scoutLogout(mockSession);

      // Logout doesn't check auth status, it just clears cookies
      expect(result.success).toBe(true);
      expect(result.data).toContain('Logged out');
    });

    it('should clear session cookies', async () => {
      mockSession.isUserAuthenticated.mockReturnValue(true);
      mockSession.getCurrentRole.mockReturnValue('admin');

      await scoutLogout(mockSession);

      expect(mockContext.clearCookies).toHaveBeenCalled();
      expect(mockContext.clearPermissions).toHaveBeenCalled();
      expect(mockSession.setAuthenticated).toHaveBeenCalledWith(false);
    });
  });

  describe('scoutGetAuthStatus', () => {
    it('should return authentication status when authenticated', async () => {
      mockSession.isUserAuthenticated.mockReturnValue(true);
      mockSession.getCurrentRole.mockReturnValue('admin');

      const result = await scoutGetAuthStatus(mockSession);

      expect(result.success).toBe(true);
      expect(result.data.authenticated).toBe(true);
      expect(result.data.role).toBe('admin');
    });

    it('should return not authenticated status', async () => {
      mockSession.isUserAuthenticated.mockReturnValue(false);
      mockSession.getCurrentRole.mockReturnValue(null);

      const result = await scoutGetAuthStatus(mockSession);

      expect(result.success).toBe(true);
      expect(result.data.authenticated).toBe(false);
      expect(result.data.role).toBe(null);
    });

    it('should return authentication object', async () => {
      const result = await scoutGetAuthStatus(mockSession);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('authenticated');
      expect(result.data).toHaveProperty('role');
    });
  });

  describe('error handling', () => {
    it('should handle missing SAML manager gracefully', async () => {
      mockSession.getSamlSessionManager.mockRejectedValue(new Error('SAML manager not available'));

      const result = await scoutLogin(mockSession, { role: 'admin' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should provide helpful error messages', async () => {
      mockSamlManager.getInteractiveUserSessionCookieWithRoleScope.mockRejectedValue(
        new Error('Role not found: invalid_role')
      );

      const result = await scoutLogin(mockSession, { role: 'invalid_role' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Login failed');
    });
  });

  describe('custom roles', () => {
    it('should support Kibana custom roles', async () => {
      const kibanaRole = {
        name: 'custom',
        kibana: [
          {
            spaces: ['default'],
            base: ['read'],
            feature: {
              discover: ['read'],
              dashboard: ['all'],
            },
          },
        ],
      };

      const result = await scoutLogin(mockSession, {
        role: 'custom_role_mcp',
        customRole: kibanaRole,
      });

      expect(result.success).toBe(true);
      expect(mockSession.setCustomRole).toHaveBeenCalledWith(kibanaRole);
    });

    it('should support Elasticsearch custom roles', async () => {
      const esRole = {
        name: 'custom',
        kibana: [],
        elasticsearch: {
          cluster: ['monitor', 'manage'],
          indices: [
            {
              names: ['logs-*'],
              privileges: ['read', 'write'],
            },
          ],
        },
      };

      const result = await scoutLogin(mockSession, {
        role: 'custom_role_mcp',
        customRole: esRole,
      });

      expect(result.success).toBe(true);
      expect(mockSession.setCustomRole).toHaveBeenCalled();
    });
  });
});
