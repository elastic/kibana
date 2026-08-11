/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { McpClient, StreamableHTTPError, UnauthorizedError } from '@kbn/mcp-client';
import type { BuildContext } from '../../clients/client_type_spec';
import { createMcpClientType } from './mcp_client_type';

jest.mock('@kbn/mcp-client', () => {
  const actual = jest.requireActual('@kbn/mcp-client');
  return {
    ...actual,
    McpClient: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue({ connected: true }),
      disconnect: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

jest.mock('./create_mcp_fetch', () => ({
  createMcpFetch: jest.fn().mockReturnValue(jest.fn()),
}));

const makeBuildContext = (overrides: Partial<BuildContext> = {}): BuildContext => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as BuildContext['logger'],
  config: { serverUrl: 'https://mcp.example.com' },
  networkSettings: {
    ensureUriAllowed: jest.fn(),
    ensureHostnameAllowed: jest.fn(),
    getSslSettings: jest.fn().mockReturnValue({}),
    getProxySettings: jest.fn().mockReturnValue(undefined),
    getCustomHostSettings: jest.fn().mockReturnValue(undefined),
    getResponseSettings: jest
      .fn()
      .mockReturnValue({ timeout: 60_000, maxContentLength: 1_000_000 }),
  },
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

    it('throws when config.serverUrl is missing', async () => {
      const ctx = makeBuildContext({ config: {} });

      await expect(createMcpClientType().build(ctx)).rejects.toThrow(
        'config.serverUrl is required'
      );
    });

    it('validates the server URL against the network allowlist', async () => {
      const ctx = makeBuildContext();

      await createMcpClientType().build(ctx);

      expect(ctx.networkSettings.ensureUriAllowed).toHaveBeenCalledWith('https://mcp.example.com');
    });

    it('uses mcpFetchFactory when available', async () => {
      const { createMcpFetch } = jest.requireMock('./create_mcp_fetch') as {
        createMcpFetch: jest.Mock;
      };
      const mockResource = { fetch: jest.fn(), close: jest.fn() };
      const mockFactory = jest.fn().mockReturnValue(mockResource);

      const ctx = makeBuildContext();

      await createMcpClientType({ mcpFetchFactory: mockFactory }).build(ctx);

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

      await createMcpClientType({ mcpFetchFactory: mockFactory, defaultHeaders }).build(ctx);

      expect(mockFactory).toHaveBeenCalledWith(
        expect.objectContaining({ headers: defaultHeaders })
      );
      expect(McpClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ headers: defaultHeaders })
      );
    });

    it('merges credential auth headers into the factory and McpClient headers', async () => {
      const authHeaders = { Authorization: 'Bearer tok' };
      const mockResource = { fetch: jest.fn(), close: jest.fn() };
      const mockFactory = jest.fn().mockReturnValue(mockResource);
      const ctx = makeBuildContext({
        credential: { getAuthHeaders: jest.fn().mockResolvedValue(authHeaders) },
      });

      await createMcpClientType({ mcpFetchFactory: mockFactory }).build(ctx);

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
    it('disconnects the client', async () => {
      const clientType = createMcpClientType();
      const ctx = makeBuildContext();
      const client = await clientType.build(ctx);

      await clientType.terminate(client);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('closes the MCP fetch resource on terminate', async () => {
      const mockResource = { fetch: jest.fn(), close: jest.fn().mockResolvedValue(undefined) };
      const mockFactory = jest.fn().mockReturnValue(mockResource);
      const clientType = createMcpClientType({ mcpFetchFactory: mockFactory });
      const ctx = makeBuildContext();
      const client = await clientType.build(ctx);

      await clientType.terminate(client);

      expect(mockResource.close).toHaveBeenCalled();
    });
  });

  describe('isUserError', () => {
    it('returns true for UnauthorizedError', () => {
      expect(createMcpClientType().isUserError?.(new UnauthorizedError('nope'))).toBe(true);
    });

    it('returns true for StreamableHTTPError with code 401', () => {
      expect(
        createMcpClientType().isUserError?.(new StreamableHTTPError(401, 'Unauthorized'))
      ).toBe(true);
    });

    it('returns true for StreamableHTTPError with code 403', () => {
      expect(createMcpClientType().isUserError?.(new StreamableHTTPError(403, 'Forbidden'))).toBe(
        true
      );
    });

    it('returns false for StreamableHTTPError with code 500', () => {
      expect(
        createMcpClientType().isUserError?.(new StreamableHTTPError(500, 'Server Error'))
      ).toBe(false);
    });

    it('returns true for McpClient-wrapped Unauthorized error messages', () => {
      expect(
        createMcpClientType().isUserError?.(new Error('Unauthorized error: invalid token'))
      ).toBe(true);
    });

    it('returns true when cause is UnauthorizedError', () => {
      const err = new Error('wrapped', { cause: new UnauthorizedError('nope') });
      expect(createMcpClientType().isUserError?.(err)).toBe(true);
    });

    it('returns false for plain Error', () => {
      expect(createMcpClientType().isUserError?.(new Error('boom'))).toBe(false);
    });
  });
});
