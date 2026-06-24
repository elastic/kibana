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
import { mongodbClientType } from './mongodb_client_type';
import { clientTypes } from '.';
import { mcpClientType } from './mcp_client_type';
import type { BuildContext } from './client_type_spec';
import type { Logger } from '@kbn/logging';

const MockMongoClient = MongoClient as unknown as jest.Mock;

const fakeLogger = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

let mockConnect: jest.Mock;
let mockClose: jest.Mock;
let mockClientInstance: { connect: jest.Mock; close: jest.Mock };

const makeBuildContext = (overrides: Partial<BuildContext> = {}): BuildContext => ({
  logger: fakeLogger,
  axiosInstance: {} as BuildContext['axiosInstance'],
  config: { host: 'mongo.example.com', port: 27017 },
  network: { ensureUriAllowed: jest.fn(), ensureHostnameAllowed: jest.fn() },
  credential: {
    getAuthHeaders: jest.fn().mockResolvedValue({
      Authorization: `Basic ${Buffer.from('alice:secret').toString('base64')}`,
    }),
  },
  ...overrides,
});

describe('clientTypes registry', () => {
  it('contains exactly { mcp, mongodb }', () => {
    expect(Object.keys(clientTypes).sort()).toEqual(['mcp', 'mongodb']);
    expect(clientTypes.mcp).toBe(mcpClientType);
    expect(clientTypes.mongodb).toBe(mongodbClientType);
  });

  it('each entry id matches its registry key', () => {
    expect(clientTypes.mcp.id).toBe('mcp');
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
  });

  describe('build', () => {
    it('validates the hostname, then creates and connects a MongoClient', async () => {
      const ctx = makeBuildContext();
      const result = await mongodbClientType.build(ctx);

      expect(ctx.network.ensureHostnameAllowed).toHaveBeenCalledWith('mongo.example.com');
      expect(MockMongoClient).toHaveBeenCalledWith('mongodb://mongo.example.com:27017', {
        auth: { username: 'alice', password: 'secret' },
        tls: false,
        serverSelectionTimeoutMS: 10_000,
      });
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockClientInstance);
    });

    it('defaults port to 27017 when not provided', async () => {
      const ctx = makeBuildContext({ config: { host: 'mongo.example.com' } });
      await mongodbClientType.build(ctx);

      expect(MockMongoClient).toHaveBeenCalledWith(
        'mongodb://mongo.example.com:27017',
        expect.objectContaining({})
      );
    });

    it('passes tls: true when config.tls is true', async () => {
      const ctx = makeBuildContext({
        config: { host: 'mongo.example.com', port: 27017, tls: true },
      });
      await mongodbClientType.build(ctx);

      expect(MockMongoClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ tls: true })
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

    it('throws if config.host is missing', async () => {
      const ctx = makeBuildContext({ config: {} });
      await expect(mongodbClientType.build(ctx)).rejects.toThrow('config.host is required');
      expect(MockMongoClient).not.toHaveBeenCalled();
    });

    it('throws if config is undefined', async () => {
      const ctx = makeBuildContext({ config: undefined });
      await expect(mongodbClientType.build(ctx)).rejects.toThrow('config.host is required');
      expect(MockMongoClient).not.toHaveBeenCalled();
    });

    it('rejects before creating a client when the network guard denies the host', async () => {
      const ctx = makeBuildContext();
      (ctx.network.ensureHostnameAllowed as jest.Mock).mockImplementation(() => {
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

    it('returns true for the missing host pre-connect error', () => {
      expect(isUserError(new Error('config.host is required'))).toBe(true);
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
      expect(isUserError(new MongoServerError('auth failed', { code: 18 }))).toBe(true);
    });

    it('returns true for MongoServerError with code 13 (Unauthorized)', () => {
      expect(isUserError(new MongoServerError('unauthorized', { code: 13 }))).toBe(true);
    });

    it('returns false for MongoServerError with other error codes', () => {
      expect(isUserError(new MongoServerError('duplicate key', { code: 11000 }))).toBe(false);
    });

    it('returns false for non-Error values', () => {
      expect(isUserError(null)).toBe(false);
      expect(isUserError(undefined)).toBe(false);
      expect(isUserError('config.host is required')).toBe(false);
    });
  });
});
