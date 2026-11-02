/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, filter } from 'rxjs';
import { ConnectionDetailsService } from './service';
import type { ConnectionDetailsOpts } from './types';

// Helper to wait for permission check to complete
const waitForPermissionCheck = (service: ConnectionDetailsService) =>
  firstValueFrom(service.apiKeyHasAccess$.pipe(filter((v) => v !== null)));

const createMockOpts = (overrides: Partial<ConnectionDetailsOpts> = {}): ConnectionDetailsOpts => ({
  apiKeys: {
    createKey: jest.fn(),
    hasPermission: jest.fn().mockResolvedValue(true),
    ...overrides.apiKeys,
  },
  ...overrides,
});

describe('ConnectionDetailsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with default tab as endpoints', () => {
      const service = new ConnectionDetailsService(createMockOpts());

      expect(service.tabId$.getValue()).toBe('endpoints');
    });

    it('should initialize apiKeyHasAccess$ as null before permission resolves', () => {
      const hasPermission = jest.fn(
        () => new Promise<boolean>(() => {}) // never resolves
      );

      const service = new ConnectionDetailsService(
        createMockOpts({
          apiKeys: { createKey: jest.fn(), hasPermission },
        })
      );

      expect(service.apiKeyHasAccess$.getValue()).toBe(null);
    });
  });

  describe('permission check', () => {
    it('should set apiKeyHasAccess$ to true when user has permission', async () => {
      const hasPermission = jest.fn().mockResolvedValue(true);
      const service = new ConnectionDetailsService(
        createMockOpts({
          apiKeys: {
            createKey: jest.fn(),
            hasPermission,
          },
        })
      );

      await waitForPermissionCheck(service);

      expect(hasPermission).toHaveBeenCalled();
      expect(service.apiKeyHasAccess$.getValue()).toBe(true);
    });

    it('should set apiKeyHasAccess$ to false when user lacks permission', async () => {
      const hasPermission = jest.fn().mockResolvedValue(false);
      const service = new ConnectionDetailsService(
        createMockOpts({
          apiKeys: {
            createKey: jest.fn(),
            hasPermission,
          },
        })
      );

      await waitForPermissionCheck(service);

      expect(hasPermission).toHaveBeenCalled();
      expect(service.apiKeyHasAccess$.getValue()).toBe(false);
    });

    it('should set apiKeyHasAccess$ to false when permission check fails', async () => {
      const hasPermission = jest.fn().mockRejectedValue(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const service = new ConnectionDetailsService(
        createMockOpts({
          apiKeys: {
            createKey: jest.fn(),
            hasPermission,
          },
        })
      );

      await waitForPermissionCheck(service);

      expect(hasPermission).toHaveBeenCalled();
      expect(service.apiKeyHasAccess$.getValue()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error checking API key creation permissions',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('default tab handling', () => {
    it('should set default tab to endpoints immediately when specified', async () => {
      const service = new ConnectionDetailsService(
        createMockOpts({
          defaultTabId: 'endpoints',
        })
      );

      expect(service.tabId$.getValue()).toBe('endpoints');
    });

    it('should defer setting apiKeys tab until permission check completes', async () => {
      const hasPermission = jest.fn().mockResolvedValue(true);
      const service = new ConnectionDetailsService(
        createMockOpts({
          defaultTabId: 'apiKeys',
          apiKeys: {
            createKey: jest.fn(),
            hasPermission,
          },
        })
      );

      // Initially should be endpoints (deferred)
      expect(service.tabId$.getValue()).toBe('endpoints');

      await waitForPermissionCheck(service);

      // Now should be apiKeys since user has permission
      expect(service.tabId$.getValue()).toBe('apiKeys');
    });

    it('should keep endpoints tab when defaultTabId is apiKeys but user lacks permission', async () => {
      const hasPermission = jest.fn().mockResolvedValue(false);
      const service = new ConnectionDetailsService(
        createMockOpts({
          defaultTabId: 'apiKeys',
          apiKeys: {
            createKey: jest.fn(),
            hasPermission,
          },
        })
      );

      await waitForPermissionCheck(service);

      // Should stay on endpoints since user lacks permission
      expect(service.tabId$.getValue()).toBe('endpoints');
    });
  });

  describe('tab switching on permission denial', () => {
    it('should switch from apiKeys to endpoints when permission is denied', async () => {
      const hasPermission = jest.fn().mockResolvedValue(false);
      const service = new ConnectionDetailsService(
        createMockOpts({
          apiKeys: {
            createKey: jest.fn(),
            hasPermission,
          },
        })
      );

      // Manually set tab to apiKeys before permission check completes
      service.setTab('apiKeys');

      // Should switch back to endpoints
      expect(service.tabId$.getValue()).toBe('endpoints');
    });

    it('should not switch tabs when user has permission', async () => {
      const hasPermission = jest.fn().mockResolvedValue(true);
      const service = new ConnectionDetailsService(
        createMockOpts({
          apiKeys: {
            createKey: jest.fn(),
            hasPermission,
          },
        })
      );

      service.setTab('apiKeys');

      await waitForPermissionCheck(service);

      // Should stay on apiKeys
      expect(service.tabId$.getValue()).toBe('apiKeys');
    });
  });

  describe('setTab', () => {
    it('should block switching to apiKeys without permission', async () => {
      const hasPermission = jest.fn().mockResolvedValue(false);
      const service = new ConnectionDetailsService(
        createMockOpts({
          apiKeys: { createKey: jest.fn(), hasPermission },
        })
      );

      await service.setTab('apiKeys');
      await waitForPermissionCheck(service);

      expect(service.tabId$.getValue()).toBe('endpoints');
    });

    it('should allow switching to endpoints immediately', async () => {
      const service = new ConnectionDetailsService(createMockOpts());

      await service.setTab('endpoints');

      expect(service.tabId$.getValue()).toBe('endpoints');
    });
  });

  describe('when apiKeys options are not provided', () => {
    it('we assume we do not have permission to access the tab', () => {
      const service = new ConnectionDetailsService({});

      expect(service.apiKeyHasAccess$.getValue()).toBe(false);
    });
  });
});
