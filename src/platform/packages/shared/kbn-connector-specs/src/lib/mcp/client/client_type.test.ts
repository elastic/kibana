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
import { createMcpClientType } from './client_type';

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

jest.mock('./sse_fetch', () => ({
  createSseGatedFetch: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('./fetch_resource', () => ({
  createFetchResource: jest.fn().mockReturnValue({
    fetch: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  }),
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
        expect.objectContaining({ fetch: expect.any(Function) })
      );
      expect(client.connect).toHaveBeenCalled();
    });

    it('throws when config.serverUrl is missing', async () => {
      const ctx = makeBuildContext({ config: {} });

      await expect(createMcpClientType().build(ctx)).rejects.toThrow(
        'config.serverUrl is required'
      );
    });

    it('builds an MCP fetch resource from networkSettings', async () => {
      const { createFetchResource } = jest.requireMock('./fetch_resource') as {
        createFetchResource: jest.Mock;
      };
      const { createSseGatedFetch } = jest.requireMock('./sse_fetch') as {
        createSseGatedFetch: jest.Mock;
      };
      const mockResource = { fetch: jest.fn(), close: jest.fn() };
      createFetchResource.mockReturnValue(mockResource);

      const ctx = makeBuildContext();
      await createMcpClientType().build(ctx);

      expect(createFetchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          networkSettings: ctx.networkSettings,
          logger: ctx.logger,
          targetUrl: 'https://mcp.example.com',
        })
      );
      expect(createSseGatedFetch).toHaveBeenCalledWith(mockResource);
    });

    it('passes defaultHeaders to the fetch resource and McpClient constructor', async () => {
      const { createFetchResource } = jest.requireMock('./fetch_resource') as {
        createFetchResource: jest.Mock;
      };
      const defaultHeaders = { 'X-Custom': 'header' };
      const ctx = makeBuildContext();

      await createMcpClientType({ defaultHeaders }).build(ctx);

      expect(createFetchResource).toHaveBeenCalledWith(
        expect.objectContaining({ headers: defaultHeaders })
      );
      expect(McpClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ headers: defaultHeaders })
      );
    });

    it('merges credential auth headers into the fetch resource and McpClient headers', async () => {
      const { createFetchResource } = jest.requireMock('./fetch_resource') as {
        createFetchResource: jest.Mock;
      };
      const authHeaders = { Authorization: 'Bearer tok', 'X-API-Key': 'secret' };
      const ctx = makeBuildContext({
        credential: { getAuthHeaders: jest.fn().mockResolvedValue(authHeaders) },
      });

      await createMcpClientType().build(ctx);

      expect(createFetchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining(authHeaders),
          credentialHeaderNames: ['Authorization', 'X-API-Key'],
        })
      );
      expect(McpClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ headers: expect.objectContaining(authHeaders) })
      );
    });

    it('builds without auth headers when getAuthHeaders returns an empty object', async () => {
      const { createFetchResource } = jest.requireMock('./fetch_resource') as {
        createFetchResource: jest.Mock;
      };
      const ctx = makeBuildContext({
        credential: { getAuthHeaders: jest.fn().mockResolvedValue({}) },
      });

      await createMcpClientType().build(ctx);

      expect(createFetchResource).toHaveBeenCalledWith(
        expect.not.objectContaining({ headers: expect.anything() })
      );
    });

    it('propagates getAuthHeaders failures', async () => {
      const authError = new Error('token client failed');
      const ctx = makeBuildContext({
        credential: { getAuthHeaders: jest.fn().mockRejectedValue(authError) },
      });

      await expect(createMcpClientType().build(ctx)).rejects.toBe(authError);
    });

    it('closes the fetch resource and preserves the original error when connect fails', async () => {
      const { createFetchResource } = jest.requireMock('./fetch_resource') as {
        createFetchResource: jest.Mock;
      };
      const mockResource = { fetch: jest.fn(), close: jest.fn().mockResolvedValue(undefined) };
      createFetchResource.mockReturnValue(mockResource);

      const connectError = new Error('connect failed');
      (McpClient as unknown as jest.Mock).mockImplementationOnce(() => ({
        connect: jest.fn().mockRejectedValue(connectError),
        disconnect: jest.fn().mockResolvedValue(undefined),
      }));

      await expect(createMcpClientType().build(makeBuildContext())).rejects.toBe(connectError);
      expect(mockResource.close).toHaveBeenCalled();
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
      const { createFetchResource } = jest.requireMock('./fetch_resource') as {
        createFetchResource: jest.Mock;
      };
      const mockResource = { fetch: jest.fn(), close: jest.fn().mockResolvedValue(undefined) };
      createFetchResource.mockReturnValue(mockResource);

      const clientType = createMcpClientType();
      const ctx = makeBuildContext();
      const client = await clientType.build(ctx);

      await clientType.terminate(client);

      expect(mockResource.close).toHaveBeenCalled();
    });

    it('closes the fetch resource even when disconnect fails and preserves the disconnect error', async () => {
      const { createFetchResource } = jest.requireMock('./fetch_resource') as {
        createFetchResource: jest.Mock;
      };
      const mockResource = {
        fetch: jest.fn(),
        close: jest.fn().mockRejectedValue(new Error('close failed')),
      };
      createFetchResource.mockReturnValue(mockResource);

      const disconnectError = new Error('disconnect failed');
      (McpClient as unknown as jest.Mock).mockImplementationOnce(() => ({
        connect: jest.fn().mockResolvedValue({ connected: true }),
        disconnect: jest.fn().mockRejectedValue(disconnectError),
      }));

      const clientType = createMcpClientType();
      const client = await clientType.build(makeBuildContext());

      await expect(clientType.terminate(client)).rejects.toBe(disconnectError);
      expect(mockResource.close).toHaveBeenCalled();
    });

    it('is idempotent for WeakMap-backed resource cleanup', async () => {
      const { createFetchResource } = jest.requireMock('./fetch_resource') as {
        createFetchResource: jest.Mock;
      };
      const mockResource = { fetch: jest.fn(), close: jest.fn().mockResolvedValue(undefined) };
      createFetchResource.mockReturnValue(mockResource);

      const clientType = createMcpClientType();
      const client = await clientType.build(makeBuildContext());

      await clientType.terminate(client);
      await clientType.terminate(client);

      expect(mockResource.close).toHaveBeenCalledTimes(1);
      expect(client.disconnect).toHaveBeenCalledTimes(2);
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

    it('returns true when cause is UnauthorizedError', () => {
      const err = new Error('wrapped', { cause: new UnauthorizedError('nope') });
      expect(createMcpClientType().isUserError?.(err)).toBe(true);
    });

    it('returns true when cause is StreamableHTTPError 403', () => {
      const err = new Error('wrapped', { cause: new StreamableHTTPError(403, 'nope') });
      expect(createMcpClientType().isUserError?.(err)).toBe(true);
    });

    it('returns false for a wrapped message without a typed cause', () => {
      expect(
        createMcpClientType().isUserError?.(new Error('Unauthorized error: invalid token'))
      ).toBe(false);
    });

    it('returns false for plain Error', () => {
      expect(createMcpClientType().isUserError?.(new Error('boom'))).toBe(false);
    });
  });

  describe('shouldInvalidateOnError', () => {
    it.each([
      [new StreamableHTTPError(401, 'Unauthorized'), true],
      [new StreamableHTTPError(403, 'Forbidden'), true],
      [new StreamableHTTPError(404, 'gone'), true],
      [new UnauthorizedError('nope'), true],
      [Object.assign(new Error('socket gone'), { code: 'UND_ERR_SOCKET' }), true],
      [Object.assign(new Error('socket gone'), { code: 'UND_ERR_CLOSED' }), true],
      [Object.assign(new Error('socket gone'), { code: 'UND_ERR_DESTROYED' }), true],
      [new StreamableHTTPError(500, 'boom'), false],
      [new Error('boom'), false],
    ])('classifies terminal errors', (error, expected) => {
      expect(createMcpClientType().shouldInvalidateOnError?.(error)).toBe(expected);
    });

    it('returns true when cause is StreamableHTTPError 403', () => {
      const err = new Error('wrapped', { cause: new StreamableHTTPError(403, 'nope') });
      expect(createMcpClientType().shouldInvalidateOnError?.(err)).toBe(true);
    });

    it('returns true when a terminal error is nested in a bounded cause chain', () => {
      const nested = Object.assign(new Error('closed'), { code: 'UND_ERR_CLOSED' });
      const err = new Error('wrapped', { cause: new Error('mid', { cause: nested }) });
      expect(createMcpClientType().shouldInvalidateOnError?.(err)).toBe(true);
    });
  });
});
