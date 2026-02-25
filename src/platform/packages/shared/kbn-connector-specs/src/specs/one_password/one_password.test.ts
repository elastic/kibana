/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { OnePasswordConnector } from './one_password';

const BASE_URL = 'https://api.1password.com/v1beta1';
const ACCOUNT_UUID = 'ACCT-UUID-1234';

describe('OnePasswordConnector', () => {
  const mockClient = {
    get: jest.fn(),
    patch: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { baseUrl: BASE_URL, accountUuid: ACCOUNT_UUID },
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct id and display name', () => {
      expect(OnePasswordConnector.metadata.id).toBe('.one_password');
      expect(OnePasswordConnector.metadata.displayName).toBe('1Password');
      expect(OnePasswordConnector.metadata.minimumLicense).toBe('enterprise');
      expect(OnePasswordConnector.metadata.supportedFeatureIds).toContain('workflows');
    });
  });

  describe('auth', () => {
    it('should use oauth_client_credentials with openid scope', () => {
      expect(OnePasswordConnector.auth?.types).toEqual([
        { type: 'oauth_client_credentials', defaults: { scope: 'openid' } },
      ]);
    });

    it('should set User-Agent header', () => {
      expect(OnePasswordConnector.auth?.headers).toEqual(
        expect.objectContaining({ 'User-Agent': expect.stringContaining('Elastic') })
      );
    });
  });

  describe('listUsers action', () => {
    const usersList = [
      {
        uuid: 'USER1234567890ABCDEF12',
        email: 'alice@example.com',
        name: 'Alice',
        status: 'ACTIVE',
        createdAt: '2024-01-15T10:30:00Z',
      },
      {
        uuid: 'USER9876543210FEDCBA98',
        email: 'bob@example.com',
        name: 'Bob',
        status: 'SUSPENDED',
        createdAt: '2024-03-20T09:15:00Z',
      },
    ];

    it('should list users without filters', async () => {
      mockClient.get.mockResolvedValue({ data: usersList });

      const result = await OnePasswordConnector.actions.listUsers.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/users`, {
        params: { accountUuid: ACCOUNT_UUID },
      });
      expect(result).toEqual(usersList);
    });

    it('should list users filtered by status', async () => {
      mockClient.get.mockResolvedValue({ data: [usersList[0]] });

      const result = await OnePasswordConnector.actions.listUsers.handler(mockContext, {
        status: 'ACTIVE',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/users`, {
        params: { accountUuid: ACCOUNT_UUID, status: 'ACTIVE' },
      });
      expect(result).toEqual([usersList[0]]);
    });

    it('should support pagination parameters', async () => {
      mockClient.get.mockResolvedValue({
        data: usersList,
        nextPageToken: 'CAIQAg',
      });

      await OnePasswordConnector.actions.listUsers.handler(mockContext, {
        maxPageSize: 10,
        pageToken: 'CAIQAg',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/users`, {
        params: {
          accountUuid: ACCOUNT_UUID,
          max_page_size: 10,
          page_token: 'CAIQAg',
        },
      });
    });

    it('should propagate API errors', async () => {
      const error = new Error('Unauthorized');
      mockClient.get.mockRejectedValue(error);

      await expect(OnePasswordConnector.actions.listUsers.handler(mockContext, {})).rejects.toThrow(
        'Unauthorized'
      );
    });
  });

  describe('getUser action', () => {
    const userDetail = {
      uuid: 'USER1234567890ABCDEF12',
      email: 'alice@example.com',
      name: 'Alice',
      status: 'ACTIVE',
      createdAt: '2024-01-15T10:30:00Z',
    };

    it('should get a single user by UUID', async () => {
      mockClient.get.mockResolvedValue({ data: userDetail });

      const result = await OnePasswordConnector.actions.getUser.handler(mockContext, {
        uuid: 'USER1234567890ABCDEF12',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/users/USER1234567890ABCDEF12`, {
        params: { accountUuid: ACCOUNT_UUID },
      });
      expect(result).toEqual(userDetail);
    });

    it('should propagate 404 errors', async () => {
      const error = new Error('Not found');
      mockClient.get.mockRejectedValue(error);

      await expect(
        OnePasswordConnector.actions.getUser.handler(mockContext, {
          uuid: 'NONEXISTENT',
        })
      ).rejects.toThrow('Not found');
    });
  });

  describe('suspendUser action', () => {
    const suspendedUser = {
      uuid: 'USER1234567890ABCDEF12',
      email: 'alice@example.com',
      name: 'Alice',
      status: 'SUSPENDED',
      createdAt: '2024-01-15T10:30:00Z',
    };

    it('should suspend an active user', async () => {
      mockClient.patch.mockResolvedValue({ data: suspendedUser });

      const result = await OnePasswordConnector.actions.suspendUser.handler(mockContext, {
        uuid: 'USER1234567890ABCDEF12',
      });

      expect(mockClient.patch).toHaveBeenCalledWith(
        `${BASE_URL}/users/USER1234567890ABCDEF12/suspend`,
        null,
        { params: { accountUuid: ACCOUNT_UUID } }
      );
      expect(result).toEqual(suspendedUser);
      expect(result.status).toBe('SUSPENDED');
    });

    it('should propagate errors when suspending fails', async () => {
      const error = new Error('Cannot suspend account owner');
      mockClient.patch.mockRejectedValue(error);

      await expect(
        OnePasswordConnector.actions.suspendUser.handler(mockContext, {
          uuid: 'OWNER-UUID',
        })
      ).rejects.toThrow('Cannot suspend account owner');
    });
  });

  describe('reactivateUser action', () => {
    const reactivatedUser = {
      uuid: 'USER1234567890ABCDEF12',
      email: 'alice@example.com',
      name: 'Alice',
      status: 'ACTIVE',
      createdAt: '2024-01-15T10:30:00Z',
    };

    it('should reactivate a suspended user', async () => {
      mockClient.patch.mockResolvedValue({ data: reactivatedUser });

      const result = await OnePasswordConnector.actions.reactivateUser.handler(mockContext, {
        uuid: 'USER1234567890ABCDEF12',
      });

      expect(mockClient.patch).toHaveBeenCalledWith(
        `${BASE_URL}/users/USER1234567890ABCDEF12/reactivate`,
        null,
        { params: { accountUuid: ACCOUNT_UUID } }
      );
      expect(result).toEqual(reactivatedUser);
      expect(result.status).toBe('ACTIVE');
    });

    it('should propagate errors when reactivation fails', async () => {
      const error = new Error('User is not suspended');
      mockClient.patch.mockRejectedValue(error);

      await expect(
        OnePasswordConnector.actions.reactivateUser.handler(mockContext, {
          uuid: 'ACTIVE-USER-UUID',
        })
      ).rejects.toThrow('User is not suspended');
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: [] });

      if (!OnePasswordConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await OnePasswordConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/users`, {
        params: { accountUuid: ACCOUNT_UUID, max_page_size: 1 },
      });
      expect(mockContext.log.debug).toHaveBeenCalledWith('1Password test handler');
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to 1Password Users API',
      });
    });

    it('should return failure when API returns non-200', async () => {
      mockClient.get.mockResolvedValue({ status: 401, data: {} });

      if (!OnePasswordConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await OnePasswordConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Failed to connect to 1Password Users API');
    });

    it('should propagate connection errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Network error'));

      if (!OnePasswordConnector.test) {
        throw new Error('Test handler not defined');
      }
      await expect(OnePasswordConnector.test.handler(mockContext)).rejects.toThrow('Network error');
    });
  });
});
