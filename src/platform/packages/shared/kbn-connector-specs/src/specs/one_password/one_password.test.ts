/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosInstance } from 'axios';
import type { ActionContext } from '../../connector_spec';
import { OnePasswordConnector } from './one_password';

const BASE_URL = 'https://api.1password.com/v1beta1';
const ACCOUNT_UUID = 'ACCT-UUID-1234';

describe('OnePasswordConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  } as unknown as jest.Mocked<AxiosInstance>;

  const mockContext = {
    client: mockClient,
    config: {
      accountUuid: ACCOUNT_UUID,
    },
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct id and display name', () => {
      expect(OnePasswordConnector.metadata.id).toBe('.1password');
      expect(OnePasswordConnector.metadata.displayName).toBe('1Password');
      expect(OnePasswordConnector.metadata.minimumLicense).toBe('enterprise');
      expect(OnePasswordConnector.metadata.supportedFeatureIds).toContain('workflows');
    });
  });

  describe('auth', () => {
    it('should use oauth_client_credentials with hidden tokenUrl and scope', () => {
      const authTypes = OnePasswordConnector.auth?.types;
      expect(authTypes).toHaveLength(1);

      const authDef = authTypes?.[0] as {
        type: string;
        defaults: Record<string, unknown>;
        overrides: { meta: Record<string, Record<string, unknown>> };
      };

      expect(authDef.type).toBe('oauth_client_credentials');
      expect(authDef.defaults).toEqual({
        tokenUrl: `${BASE_URL}/users/oauth2/token`,
        scope: 'openid',
        tokenEndpointAuthMethod: 'client_secret_basic',
      });
      expect(authDef.overrides.meta).toEqual({
        tokenUrl: { hidden: true },
        scope: { hidden: true },
      });
    });

    it('should set User-Agent header', () => {
      expect(OnePasswordConnector.auth?.headers).toEqual({
        'User-Agent': 'ElasticKibana',
      });
    });
  });

  describe('schema', () => {
    it('should not expose baseUrl in config', () => {
      const shape = (OnePasswordConnector.schema as { shape: Record<string, unknown> }).shape;
      expect(shape.baseUrl).toBeUndefined();
      expect(shape.accountUuid).toBeDefined();
    });
  });

  describe('listUsers action', () => {
    const usersList = {
      results: [
        {
          id: 'USER1234567890ABCDEF12',
          email: 'alice@example.com',
          display_name: 'Alice',
          state: 'ACTIVE',
          create_time: '2024-01-15T10:30:00Z',
          path: `accounts/${ACCOUNT_UUID}/users/USER1234567890ABCDEF12`,
        },
        {
          id: 'USER9876543210FEDCBA98',
          email: 'bob@example.com',
          display_name: 'Bob',
          state: 'SUSPENDED',
          create_time: '2024-03-20T09:15:00Z',
          path: `accounts/${ACCOUNT_UUID}/users/USER9876543210FEDCBA98`,
        },
      ],
    };

    it('should list users without filters', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue({ data: usersList });

      const result = await OnePasswordConnector.actions.listUsers.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/accounts/${ACCOUNT_UUID}/users`, {
        params: {},
      });
      expect(result).toEqual(usersList);
    });

    it('should list users filtered by state', async () => {
      const activeOnly = { results: [usersList.results[0]] };
      (mockClient.get as jest.Mock).mockResolvedValue({ data: activeOnly });

      const result = await OnePasswordConnector.actions.listUsers.handler(mockContext, {
        filter: 'user.isActive()',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/accounts/${ACCOUNT_UUID}/users`, {
        params: { filter: 'user.isActive()' },
      });
      expect(result).toEqual(activeOnly);
    });

    it('should support pagination parameters', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue({ data: usersList });

      await OnePasswordConnector.actions.listUsers.handler(mockContext, {
        maxPageSize: 10,
        pageToken: 'CAIQAg',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/accounts/${ACCOUNT_UUID}/users`, {
        params: {
          maxPageSize: 10,
          pageToken: 'CAIQAg',
        },
      });
    });

    it('should propagate API errors', async () => {
      const error = new Error('Unauthorized');
      (mockClient.get as jest.Mock).mockRejectedValue(error);

      await expect(OnePasswordConnector.actions.listUsers.handler(mockContext, {})).rejects.toThrow(
        'Unauthorized'
      );
    });
  });

  describe('getUser action', () => {
    const userDetail = {
      id: 'USER1234567890ABCDEF12',
      email: 'alice@example.com',
      display_name: 'Alice',
      state: 'ACTIVE',
      create_time: '2024-01-15T10:30:00Z',
      path: `accounts/${ACCOUNT_UUID}/users/USER1234567890ABCDEF12`,
    };

    it('should get a single user by UUID', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue({ data: userDetail });

      const result = await OnePasswordConnector.actions.getUser.handler(mockContext, {
        uuid: 'USER1234567890ABCDEF12',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${BASE_URL}/accounts/${ACCOUNT_UUID}/users/USER1234567890ABCDEF12`
      );
      expect(result).toEqual(userDetail);
    });

    it('should propagate 404 errors', async () => {
      const error = new Error('Not found');
      (mockClient.get as jest.Mock).mockRejectedValue(error);

      await expect(
        OnePasswordConnector.actions.getUser.handler(mockContext, { uuid: 'NONEXISTENT' })
      ).rejects.toThrow('Not found');
    });
  });

  describe('suspendUser action', () => {
    const suspendedUser = {
      id: 'USER1234567890ABCDEF12',
      email: 'alice@example.com',
      display_name: 'Alice',
      state: 'SUSPENDED',
      create_time: '2024-01-15T10:30:00Z',
      path: `accounts/${ACCOUNT_UUID}/users/USER1234567890ABCDEF12`,
    };

    it('should suspend an active user', async () => {
      (mockClient.post as jest.Mock).mockResolvedValue({ data: suspendedUser });

      const result = await OnePasswordConnector.actions.suspendUser.handler(mockContext, {
        uuid: 'USER1234567890ABCDEF12',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${BASE_URL}/accounts/${ACCOUNT_UUID}/users/USER1234567890ABCDEF12:suspend`
      );
      expect(result).toEqual(suspendedUser);
      expect(result.state).toBe('SUSPENDED');
    });

    it('should propagate errors when suspending fails', async () => {
      const error = new Error('Cannot suspend account owner');
      (mockClient.post as jest.Mock).mockRejectedValue(error);

      await expect(
        OnePasswordConnector.actions.suspendUser.handler(mockContext, { uuid: 'OWNER-UUID' })
      ).rejects.toThrow('Cannot suspend account owner');
    });
  });

  describe('reactivateUser action', () => {
    const reactivatedUser = {
      id: 'USER1234567890ABCDEF12',
      email: 'alice@example.com',
      display_name: 'Alice',
      state: 'ACTIVE',
      create_time: '2024-01-15T10:30:00Z',
      path: `accounts/${ACCOUNT_UUID}/users/USER1234567890ABCDEF12`,
    };

    it('should reactivate a suspended user', async () => {
      (mockClient.post as jest.Mock).mockResolvedValue({ data: reactivatedUser });

      const result = await OnePasswordConnector.actions.reactivateUser.handler(mockContext, {
        uuid: 'USER1234567890ABCDEF12',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${BASE_URL}/accounts/${ACCOUNT_UUID}/users/USER1234567890ABCDEF12:reactivate`
      );
      expect(result).toEqual(reactivatedUser);
      expect(result.state).toBe('ACTIVE');
    });

    it('should propagate errors when reactivation fails', async () => {
      const error = new Error('User is not suspended');
      (mockClient.post as jest.Mock).mockRejectedValue(error);

      await expect(
        OnePasswordConnector.actions.reactivateUser.handler(mockContext, {
          uuid: 'ACTIVE-USER-UUID',
        })
      ).rejects.toThrow('User is not suspended');
    });
  });

  describe('test handler', () => {
    const testSpec = OnePasswordConnector.test;

    it('should return success when API is accessible', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue({ status: 200, data: { results: [] } });

      const result = await testSpec.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/accounts/${ACCOUNT_UUID}/users`, {
        params: { maxPageSize: 1 },
      });
      expect(mockContext.log.debug).toHaveBeenCalledWith('1Password test handler');
      expect(result).toEqual({});
    });

    it('should throw on error', async () => {
      (mockClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(testSpec.handler(mockContext)).rejects.toThrow('Network error');
    });

    it('should surface structured API error body on non-2xx response', async () => {
      const err = Object.assign(new Error('Forbidden'), {
        response: { status: 403, data: { code: 7, message: 'no_owner_remain', details: [] } },
      });
      (mockClient.get as jest.Mock).mockRejectedValue(err);

      await expect(testSpec.handler(mockContext)).rejects.toThrow('1Password API error (403):');
    });
  });
});
