/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { McpClient, McpConnectionError } from '@kbn/mcp-client';
import type { BuildContext } from './client_type_spec';
import { createMcpClientType } from './mcp_client_type';

jest.mock('@kbn/mcp-client', () => {
  class MockMcpConnectionError extends Error {
    readonly httpStatus?: number;
    constructor(message: string, opts?: { httpStatus?: number }) {
      super(message);
      this.name = 'McpConnectionError';
      this.httpStatus = opts?.httpStatus;
    }
  }

  const MockMcpClient = jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({ connected: true }),
    disconnect: jest.fn().mockResolvedValue(undefined),
    terminateSession: jest.fn().mockResolvedValue(undefined),
  }));

  return {
    McpClient: MockMcpClient,
    McpConnectionError: MockMcpConnectionError,
  };
});

jest.mock('../mcp/create_mcp_fetch', () => ({
  createMcpFetch: jest.fn().mockReturnValue(jest.fn()),
}));

const makeBuildContext = (overrides: Partial<BuildContext> = {}): BuildContext => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as BuildContext['logger'],
  axiosInstance: {} as BuildContext['axiosInstance'],
  config: { serverUrl: 'https://mcp.example.com' },
  network: { ensureUriAllowed: jest.fn(), ensureHostnameAllowed: jest.fn() },
  credential: { getAuthHeaders: jest.fn().mockResolvedValue({}) },
  ...overrides,
});

describe('createMcpClientType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('id', () => {
    it('has id "mcp"', () => {
      expect(createMcpClientType().id).toBe('mcp');
    });
  });

  describe('build', () => {
    it('creates and connects an McpClient with the serverUrl from config', async () => {
      const ctx = makeBuildContext();

      const client = await createMcpClientType().build(ctx);

      expect(McpClient).toHaveBeenCalledWith(
        ctx.logger,
        expect.objectContaining({ url: 'https://mcp.example.com' }),
        expect.any(Object)
      );
      expect(client.connect).toHaveBeenCalled();
    });

    it('throws McpConnectionError when config.serverUrl is missing', async () => {
      const ctx = makeBuildContext({ config: {} });

      await expect(createMcpClientType().build(ctx)).rejects.toThrow(
        'config.serverUrl is required'
      );
    });

    it('validates the server URL against the network allowlist', async () => {
      const ctx = makeBuildContext();

      await createMcpClientType().build(ctx);

      expect(ctx.network.ensureUriAllowed).toHaveBeenCalledWith('https://mcp.example.com');
    });

    it('uses configuredFetchFactory when available', async () => {
      const { createMcpFetch } = jest.requireMock('../mcp/create_mcp_fetch') as {
        createMcpFetch: jest.Mock;
      };
      const mockResource = { fetch: jest.fn(), close: jest.fn() };
      const mockFactory = jest.fn().mockReturnValue(mockResource);

      const ctx = makeBuildContext();

      await createMcpClientType({ configuredFetchFactory: mockFactory }).build(ctx);

      expect(mockFactory).toHaveBeenCalledWith(
        expect.objectContaining({ targetUrl: 'https://mcp.example.com' })
      );
      expect(createMcpFetch).toHaveBeenCalledWith(mockResource);
    });

    it('passes defaultHeaders to the factory and McpClient constructor', async () => {
      const defaultHeaders = { 'X-Custom': 'header' };
      const mockResource = { fetch: jest.fn(), close: jest.fn() };
      const mockFactory = jest.fn().mockReturnValue(mockResource);

      const ctx = makeBuildContext();

      await createMcpClientType({ configuredFetchFactory: mockFactory, defaultHeaders }).build(ctx);

      expect(mockFactory).toHaveBeenCalledWith(
        expect.objectContaining({ headers: defaultHeaders })
      );
      expect(McpClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ headers: defaultHeaders })
      );
    });

    it('passes requestTimeout to connect()', async () => {
      const ctx = makeBuildContext();

      const client = await createMcpClientType({ requestTimeout: 10000 }).build(ctx);

      expect(client.connect).toHaveBeenCalledWith({ timeout: 10000 });
    });

    it('calls connect() without options when no requestTimeout', async () => {
      const ctx = makeBuildContext();

      const client = await createMcpClientType().build(ctx);

      expect(client.connect).toHaveBeenCalledWith(undefined);
    });

    it('merges credential auth headers into the factory and McpClient headers', async () => {
      const authHeaders = { Authorization: 'Bearer tok' };
      const mockResource = { fetch: jest.fn(), close: jest.fn() };
      const mockFactory = jest.fn().mockReturnValue(mockResource);
      const ctx = makeBuildContext({
        credential: { getAuthHeaders: jest.fn().mockResolvedValue(authHeaders) },
      });

      await createMcpClientType({ configuredFetchFactory: mockFactory }).build(ctx);

      expect(mockFactory).toHaveBeenCalledWith(
        expect.objectContaining({ headers: expect.objectContaining(authHeaders) })
      );
      expect(McpClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ headers: expect.objectContaining(authHeaders) })
      );
    });

    it('proceeds without auth headers when getAuthHeaders throws', async () => {
      const ctx = makeBuildContext({
        credential: { getAuthHeaders: jest.fn().mockRejectedValue(new Error('unsupported')) },
      });

      const client = await createMcpClientType().build(ctx);

      expect(client.connect).toHaveBeenCalled();
      expect(ctx.logger.debug).toHaveBeenCalledWith(expect.stringContaining('No auth headers'));
    });
  });

  describe('terminate', () => {
    it('calls terminateSession then disconnect', async () => {
      const clientType = createMcpClientType();
      const ctx = makeBuildContext();
      const client = await clientType.build(ctx);

      await clientType.terminate(client);

      expect(client.terminateSession).toHaveBeenCalled();
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('disconnects even when terminateSession throws', async () => {
      const clientType = createMcpClientType();
      const ctx = makeBuildContext();
      const client = await clientType.build(ctx);
      (client.terminateSession as jest.Mock).mockRejectedValue(new Error('terminate failed'));

      await clientType.terminate(client);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('closes the configured-fetch resource on terminate', async () => {
      const mockResource = { fetch: jest.fn(), close: jest.fn().mockResolvedValue(undefined) };
      const mockFactory = jest.fn().mockReturnValue(mockResource);
      const clientType = createMcpClientType({ configuredFetchFactory: mockFactory });
      const ctx = makeBuildContext();
      const client = await clientType.build(ctx);

      await clientType.terminate(client);

      expect(mockResource.close).toHaveBeenCalled();
    });
  });

  describe('isUserError', () => {
    it('returns true for McpConnectionError with httpStatus 401', () => {
      const err = new McpConnectionError('Unauthorized', { httpStatus: 401 });
      expect(createMcpClientType().isUserError?.(err)).toBe(true);
    });

    it('returns true for McpConnectionError with httpStatus 403', () => {
      const err = new McpConnectionError('Forbidden', { httpStatus: 403 });
      expect(createMcpClientType().isUserError?.(err)).toBe(true);
    });

    it('returns false for McpConnectionError with httpStatus 500', () => {
      const err = new McpConnectionError('Server Error', { httpStatus: 500 });
      expect(createMcpClientType().isUserError?.(err)).toBe(false);
    });

    it('returns false for McpConnectionError without httpStatus', () => {
      const err = new McpConnectionError('Connection failed');
      expect(createMcpClientType().isUserError?.(err)).toBe(false);
    });

    it('returns false for plain Error', () => {
      expect(createMcpClientType().isUserError?.(new Error('boom'))).toBe(false);
    });
  });
});
