/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// jest.mock is hoisted before variable declarations, so the factory can only
// reference jest globals (jest.fn()) — not outer const/let. We define
// MongoServerError inline so instanceof checks in the implementation resolve
// against the same class reference that the test uses.
jest.mock('mongodb', () => ({
  MongoClient: jest.fn(),
  MongoServerError: class MongoServerError extends Error {
    code: number | undefined;
    constructor(message: string, options?: { code?: number }) {
      super(message);
      this.name = 'MongoServerError';
      this.code = options?.code;
    }
  },
}));

import { MongoClient, MongoServerError } from 'mongodb';
import type { Logger } from '@kbn/logging';
import { mongodbClientType } from './mongodb_client_type';
import { clientTypes } from '.';
import type { BuildContext } from './client_type_spec';

const MockMongoClient = MongoClient as unknown as jest.Mock;

const fakeLogger = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

let mockConnect: jest.Mock;
let mockClose: jest.Mock;
let mockClientInstance: { connect: jest.Mock; close: jest.Mock };
let mockResolveSrvHosts: jest.Mock;

const makeBuildContext = (overrides: Partial<BuildContext> = {}): BuildContext => ({
  logger: fakeLogger,
  config: { uri: 'mongodb://mongo.example.com:27017/mydb' },
  networkSettings: {
    ensureUriAllowed: jest.fn(),
    ensureHostnameAllowed: jest.fn(),
    resolveSrvHosts: mockResolveSrvHosts,
    getSslSettings: jest.fn(),
    getProxySettings: jest.fn(),
    getCustomHostSettings: jest.fn(),
    getResponseSettings: jest.fn(),
  },
  credential: {
    getAuthHeaders: jest.fn().mockResolvedValue({
      Authorization: `Basic ${Buffer.from('alice:secret').toString('base64')}`,
    }),
  },
  ...overrides,
});

describe('clientTypes registry', () => {
  it('registers mongodb', () => {
    expect(clientTypes.mongodb).toBe(mongodbClientType);
  });

  it('entry id matches its registry key', () => {
    expect(clientTypes.mongodb.id).toBe('mongodb');
  });
});

describe('mongodbClientType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect = jest.fn().mockResolvedValue(undefined);
    mockClose = jest.fn().mockResolvedValue(undefined);
    mockClientInstance = { connect: mockConnect, close: mockClose };
    MockMongoClient.mockImplementation(() => mockClientInstance);
    mockResolveSrvHosts = jest.fn().mockResolvedValue([
      { name: 'shard1.example.com', port: 27017 },
      { name: 'shard2.example.com', port: 27017 },
    ]);
  });

  describe('build', () => {
    it('validates the hostname, then creates and connects a MongoClient', async () => {
      const ctx = makeBuildContext();
      const result = await mongodbClientType.build(ctx);

      expect(ctx.networkSettings.ensureHostnameAllowed).toHaveBeenCalledWith('mongo.example.com');
      expect(MockMongoClient).toHaveBeenCalledWith('mongodb://mongo.example.com:27017/mydb', {
        auth: { username: 'alice', password: 'secret' },
        authSource: 'admin',
        serverSelectionTimeoutMS: 10_000,
      });
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockClientInstance);
    });

    it('passes the URI directly to MongoClient, including mongodb+srv:// schemes', async () => {
      const ctx = makeBuildContext({ config: { uri: 'mongodb+srv://cluster0.example.com/mydb' } });
      await mongodbClientType.build(ctx);

      expect(ctx.networkSettings.ensureHostnameAllowed).toHaveBeenCalledWith(
        'cluster0.example.com'
      );
      expect(MockMongoClient).toHaveBeenCalledWith(
        'mongodb+srv://cluster0.example.com/mydb',
        expect.objectContaining({})
      );
    });

    it('resolves and validates the actual SRV target hosts, not just the seed name', async () => {
      const ctx = makeBuildContext({ config: { uri: 'mongodb+srv://cluster0.example.com/mydb' } });
      await mongodbClientType.build(ctx);

      expect(mockResolveSrvHosts).toHaveBeenCalledWith('cluster0.example.com', 'mongodb');
      expect(ctx.networkSettings.ensureHostnameAllowed).toHaveBeenCalledWith(
        'cluster0.example.com'
      );
      expect(ctx.networkSettings.ensureHostnameAllowed).toHaveBeenCalledWith('shard1.example.com');
      expect(ctx.networkSettings.ensureHostnameAllowed).toHaveBeenCalledWith('shard2.example.com');
      expect(ctx.networkSettings.ensureHostnameAllowed).toHaveBeenCalledTimes(3);
    });

    it('respects a custom srvServiceName when resolving SRV records', async () => {
      const ctx = makeBuildContext({
        config: { uri: 'mongodb+srv://cluster0.example.com/mydb?srvServiceName=customname' },
      });
      await mongodbClientType.build(ctx);

      expect(mockResolveSrvHosts).toHaveBeenCalledWith('cluster0.example.com', 'customname');
    });

    it('rejects before creating a client when an SRV-resolved host is denied', async () => {
      const ctx = makeBuildContext({ config: { uri: 'mongodb+srv://cluster0.example.com/mydb' } });
      (ctx.networkSettings.ensureHostnameAllowed as jest.Mock).mockImplementation(
        (hostname: string) => {
          if (hostname === 'shard2.example.com') {
            throw new Error('host "shard2.example.com" is not in the allowedHosts list');
          }
        }
      );

      await expect(mongodbClientType.build(ctx)).rejects.toThrow('is not in the allowedHosts list');
      expect(MockMongoClient).not.toHaveBeenCalled();
    });

    it('throws if SRV resolution fails', async () => {
      const ctx = makeBuildContext({ config: { uri: 'mongodb+srv://cluster0.example.com/mydb' } });
      mockResolveSrvHosts.mockRejectedValue(new Error('ENOTFOUND'));

      await expect(mongodbClientType.build(ctx)).rejects.toThrow(
        'failed to resolve SRV records for "cluster0.example.com"'
      );
      expect(MockMongoClient).not.toHaveBeenCalled();
    });

    it('throws if SRV resolution returns no records', async () => {
      const ctx = makeBuildContext({ config: { uri: 'mongodb+srv://cluster0.example.com/mydb' } });
      mockResolveSrvHosts.mockResolvedValue([]);

      await expect(mongodbClientType.build(ctx)).rejects.toThrow(
        'no SRV records found for "cluster0.example.com"'
      );
      expect(MockMongoClient).not.toHaveBeenCalled();
    });

    it('validates every host in a multi-host (replica set) URI', async () => {
      const ctx = makeBuildContext({
        config: {
          uri: 'mongodb://host1.example.com:27017,host2.example.com:27017,host3.example.com:27017/mydb',
        },
      });
      await mongodbClientType.build(ctx);

      expect(ctx.networkSettings.ensureHostnameAllowed).toHaveBeenCalledWith('host1.example.com');
      expect(ctx.networkSettings.ensureHostnameAllowed).toHaveBeenCalledWith('host2.example.com');
      expect(ctx.networkSettings.ensureHostnameAllowed).toHaveBeenCalledWith('host3.example.com');
      expect(ctx.networkSettings.ensureHostnameAllowed).toHaveBeenCalledTimes(3);
    });

    it('rejects before creating a client when the network guard denies a non-first host', async () => {
      const ctx = makeBuildContext({
        config: { uri: 'mongodb://allowed.example.com:27017,denied.example.com:27017/mydb' },
      });
      (ctx.networkSettings.ensureHostnameAllowed as jest.Mock).mockImplementation(
        (hostname: string) => {
          if (hostname === 'denied.example.com') {
            throw new Error('host "denied.example.com" is not in the allowedHosts list');
          }
        }
      );

      await expect(mongodbClientType.build(ctx)).rejects.toThrow('is not in the allowedHosts list');
      expect(MockMongoClient).not.toHaveBeenCalled();
    });

    it('defaults authSource to admin when the URI does not specify one', async () => {
      const ctx = makeBuildContext();
      await mongodbClientType.build(ctx);

      expect(MockMongoClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ authSource: 'admin' })
      );
    });

    it('does not override authSource when the URI already specifies one', async () => {
      const ctx = makeBuildContext({
        config: { uri: 'mongodb://mongo.example.com:27017/mydb?authSource=otherdb' },
      });
      await mongodbClientType.build(ctx);

      expect(MockMongoClient).toHaveBeenCalledWith(
        'mongodb://mongo.example.com:27017/mydb?authSource=otherdb',
        expect.not.objectContaining({ authSource: expect.anything() })
      );
    });

    it('correctly decodes credentials containing colons in the password', async () => {
      const ctx = makeBuildContext({
        credential: {
          getAuthHeaders: jest.fn().mockResolvedValue({
            Authorization: `Basic ${Buffer.from('user:p:a:s:s').toString('base64')}`,
          }),
        },
      });
      await mongodbClientType.build(ctx);

      expect(MockMongoClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ auth: { username: 'user', password: 'p:a:s:s' } })
      );
    });

    it('throws if config.uri is missing', async () => {
      const ctx = makeBuildContext({ config: {} });
      await expect(mongodbClientType.build(ctx)).rejects.toThrow('config.uri is required');
      expect(MockMongoClient).not.toHaveBeenCalled();
    });

    it('throws if config is undefined', async () => {
      const ctx = makeBuildContext({ config: undefined });
      await expect(mongodbClientType.build(ctx)).rejects.toThrow('config.uri is required');
      expect(MockMongoClient).not.toHaveBeenCalled();
    });

    it('rejects before creating a client when the network guard denies the host', async () => {
      const ctx = makeBuildContext();
      (ctx.networkSettings.ensureHostnameAllowed as jest.Mock).mockImplementation(() => {
        throw new Error('host "mongo.example.com" is not in the allowedHosts list');
      });

      await expect(mongodbClientType.build(ctx)).rejects.toThrow('is not in the allowedHosts list');
      expect(MockMongoClient).not.toHaveBeenCalled();
    });

    it('throws if auth headers contain no recognisable Basic credential', async () => {
      const ctx = makeBuildContext({
        credential: {
          getAuthHeaders: jest.fn().mockResolvedValue({ Authorization: 'Bearer some-token' }),
        },
      });
      await expect(mongodbClientType.build(ctx)).rejects.toThrow(
        'basic auth credentials (username and password) are required'
      );
      expect(MockMongoClient).not.toHaveBeenCalled();
    });

    it('throws if Authorization header is absent', async () => {
      const ctx = makeBuildContext({
        credential: { getAuthHeaders: jest.fn().mockResolvedValue({}) },
      });
      await expect(mongodbClientType.build(ctx)).rejects.toThrow(
        'basic auth credentials (username and password) are required'
      );
      expect(MockMongoClient).not.toHaveBeenCalled();
    });
  });

  describe('terminate', () => {
    it('calls client.close()', async () => {
      await mongodbClientType.terminate(
        mockClientInstance as unknown as import('mongodb').MongoClient
      );
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('isUserError', () => {
    const isUserError = mongodbClientType.isUserError as (err: unknown) => boolean;
    // The real driver's MongoServerError constructor takes a single info object; the
    // jest.mock above replaces it with a (message, options) shape for this test file only,
    // so construct through a cast rather than fighting the real .d.ts signature.
    const MockMongoServerError = MongoServerError as unknown as new (
      message: string,
      options?: { code?: number }
    ) => Error;

    it('returns true for the missing uri pre-connect error', () => {
      expect(isUserError(new Error('config.uri is required'))).toBe(true);
    });

    it('returns true for the missing credentials pre-connect error', () => {
      expect(
        isUserError(
          new Error(
            'basic auth credentials (username and password) are required for MongoDB connections'
          )
        )
      ).toBe(true);
    });

    it('returns false for other Error instances', () => {
      expect(isUserError(new Error('network timeout'))).toBe(false);
    });

    it('returns true for MongoServerError with code 18 (AuthenticationFailed)', () => {
      expect(isUserError(new MockMongoServerError('auth failed', { code: 18 }))).toBe(true);
    });

    it('returns true for MongoServerError with code 13 (Unauthorized)', () => {
      expect(isUserError(new MockMongoServerError('unauthorized', { code: 13 }))).toBe(true);
    });

    it('returns false for MongoServerError with other error codes', () => {
      expect(isUserError(new MockMongoServerError('duplicate key', { code: 11000 }))).toBe(false);
    });

    it('returns false for non-Error values', () => {
      expect(isUserError(null)).toBe(false);
      expect(isUserError(undefined)).toBe(false);
      expect(isUserError('config.uri is required')).toBe(false);
    });
  });
});
