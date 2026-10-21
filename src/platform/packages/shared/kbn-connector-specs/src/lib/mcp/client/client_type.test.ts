/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  McpClient,
  McpError,
  McpErrorCode,
  McpNotConnectedError,
  StreamableHTTPError,
  UnauthorizedError,
  type FetchLike,
} from '@kbn/mcp-client';
import type { BuildContext } from '../../clients/client_type_spec';
import {
  createMcpClientType,
  isTransientConnectError,
  McpConnectionHttpError,
  McpConnectionTransportError,
  MCP_CONNECT_RETRY_DELAY_MS,
} from './client_type';

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

jest.mock('./fetch_resource', () => ({
  createFetchResource: jest.fn().mockReturnValue({
    fetch: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

const createRetryingClientType = () => createMcpClientType({ connectRetry: { delayMs: 0 } });

const fetchFailed = (code: string): TypeError =>
  new TypeError('fetch failed', { cause: Object.assign(new Error(code), { code }) });

const installResourceMocks = (
  fetch: jest.Mock = jest.fn()
): {
  createFetchResource: jest.Mock;
  close: jest.Mock;
} => {
  const { createFetchResource } = jest.requireMock('./fetch_resource') as {
    createFetchResource: jest.Mock;
  };
  const close = jest.fn().mockResolvedValue(undefined);
  createFetchResource.mockImplementation(() => ({
    fetch,
    close,
  }));
  return { createFetchResource, close };
};

const mockConnectSequence = (
  implementations: Array<(customFetch: FetchLike) => Promise<unknown>>
): void => {
  let attempt = 0;
  (McpClient as unknown as jest.Mock).mockImplementation(
    (
      _logger: ConstructorParameters<typeof McpClient>[0],
      _clientDetails: ConstructorParameters<typeof McpClient>[1],
      options: ConstructorParameters<typeof McpClient>[2]
    ) => {
      const index = attempt;
      attempt += 1;
      const impl = implementations[index];
      if (!impl) {
        throw new Error(`Unexpected McpClient construction #${index + 1}`);
      }
      return {
        connect: jest.fn(async () => {
          const customFetch = options?.fetch;
          if (!customFetch) {
            throw new Error('Expected a custom fetch implementation');
          }
          return impl(customFetch);
        }),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
    }
  );
};

const restoreDefaultMcpClient = (): void => {
  (McpClient as unknown as jest.Mock).mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({ connected: true }),
    disconnect: jest.fn().mockResolvedValue(undefined),
  }));
};

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
  platform: { resolveSrvHosts: jest.fn(), buildTlsOptions: jest.fn() },
  credential: { getAuthHeaders: jest.fn().mockResolvedValue({}) },
  ...overrides,
});

describe('createMcpClientType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    restoreDefaultMcpClient();
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
        expect.objectContaining({ url: 'https://mcp.example.com', name: 'kibana-mcp' }),
        expect.objectContaining({ fetch: expect.any(Function) })
      );
      expect(client.connect).toHaveBeenCalled();
    });

    it('names the McpClient from config.clientName when set', async () => {
      const ctx = makeBuildContext({
        config: {
          serverUrl: 'https://mcp.example.com',
          clientName: 'kibana-mcp-connector-abc-123',
        },
      });

      await createMcpClientType().build(ctx);

      expect(McpClient).toHaveBeenCalledWith(
        ctx.logger,
        expect.objectContaining({
          url: 'https://mcp.example.com',
          name: 'kibana-mcp-connector-abc-123',
        }),
        expect.anything()
      );
    });

    it.each<[string, unknown]>([
      ['empty string', ''],
      ['non-string', 42],
    ])(
      'falls back to the default name when config.clientName is a %s',
      async (_form, clientName) => {
        const ctx = makeBuildContext({
          config: { serverUrl: 'https://mcp.example.com', clientName },
        });

        await createMcpClientType().build(ctx);

        expect(McpClient).toHaveBeenCalledWith(
          ctx.logger,
          expect.objectContaining({ name: 'kibana-mcp' }),
          expect.anything()
        );
      }
    );

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

      const ctx = makeBuildContext();
      await createMcpClientType().build(ctx);

      expect(createFetchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          networkSettings: ctx.networkSettings,
          logger: ctx.logger,
          targetUrl: 'https://mcp.example.com',
        })
      );
    });

    it('passes defaultHeaders to the fetch resource only', async () => {
      const { createFetchResource } = jest.requireMock('./fetch_resource') as {
        createFetchResource: jest.Mock;
      };
      const defaultHeaders = { 'X-Custom': 'header' };
      const ctx = makeBuildContext();

      await createMcpClientType({ defaultHeaders }).build(ctx);

      expect(createFetchResource).toHaveBeenCalledWith(
        expect.objectContaining({ headers: defaultHeaders })
      );
      expect(McpClient).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        fetch: expect.any(Function),
      });
    });

    it('passes an auth header factory to the fetch resource without reading it during build', async () => {
      const { createFetchResource } = jest.requireMock('./fetch_resource') as {
        createFetchResource: jest.Mock;
      };
      const authHeaders = { Authorization: 'Bearer tok', 'X-API-Key': 'secret' };
      const getAuthHeaders = jest.fn().mockResolvedValue(authHeaders);
      const ctx = makeBuildContext({
        credential: { getAuthHeaders },
      });

      await createMcpClientType().build(ctx);

      const resourceOptions = createFetchResource.mock.calls[0][0];
      expect(createFetchResource).toHaveBeenCalledWith(
        expect.objectContaining({
          getAuthHeaders: expect.any(Function),
        })
      );
      expect(resourceOptions).not.toHaveProperty('credentialHeaderNames');
      expect(resourceOptions).not.toHaveProperty('headers');
      expect(getAuthHeaders).not.toHaveBeenCalled();
      await expect(resourceOptions.getAuthHeaders()).resolves.toEqual(authHeaders);
      expect(McpClient).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        fetch: expect.any(Function),
      });
    });

    it('passes no auth headers to the McpClient constructor', async () => {
      const { createFetchResource } = jest.requireMock('./fetch_resource') as {
        createFetchResource: jest.Mock;
      };
      const ctx = makeBuildContext();

      await createMcpClientType().build(ctx);

      expect(createFetchResource).toHaveBeenCalledWith(
        expect.not.objectContaining({ credentialHeaderNames: expect.anything() })
      );
      expect(McpClient).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        fetch: expect.any(Function),
      });
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

    it.each([401, 403])(
      'classifies a wrapped connect error from an HTTP %i response as a user error',
      async (httpStatus) => {
        installResourceMocks(
          jest.fn().mockResolvedValue(new Response(null, { status: httpStatus }))
        );

        const connectError = new Error('wrapped connection error');
        const mockMcpClient = (
          _logger: ConstructorParameters<typeof McpClient>[0],
          _clientDetails: ConstructorParameters<typeof McpClient>[1],
          options: ConstructorParameters<typeof McpClient>[2]
        ) => {
          const customFetch = options?.fetch;
          if (!customFetch) {
            throw new Error('Expected a custom fetch implementation');
          }
          return {
            connect: jest.fn(async () => {
              await customFetch('https://mcp.example.com', { method: 'POST' });
              throw connectError;
            }),
            disconnect: jest.fn().mockResolvedValue(undefined),
          };
        };
        (McpClient as unknown as jest.Mock).mockImplementationOnce(mockMcpClient);

        const clientType = createMcpClientType();
        const error = await clientType
          .build(makeBuildContext())
          .catch((buildError: Error): Error => buildError);

        expect(error).toMatchObject({
          name: 'McpConnectionHttpError',
          message: connectError.message,
          httpStatus,
          cause: connectError,
        });
        expect(clientType.isUserError?.(error)).toBe(true);
      }
    );
  });

  describe('build retries', () => {
    it('retries a transport failure and succeeds on attempt 2', async () => {
      const transportError = fetchFailed('ECONNRESET');
      const { createFetchResource, close } = installResourceMocks(
        jest.fn().mockRejectedValue(transportError)
      );
      mockConnectSequence([
        async (customFetch) => {
          await customFetch('https://mcp.example.com', { method: 'POST' });
          throw new Error('should not reach');
        },
        async () => ({ connected: true }),
      ]);

      const ctx = makeBuildContext();
      const client = await createRetryingClientType().build(ctx);

      expect(client.connect).toHaveBeenCalled();
      expect(McpClient).toHaveBeenCalledTimes(2);
      expect(createFetchResource).toHaveBeenCalledTimes(2);
      expect(close).toHaveBeenCalledTimes(1);
      expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
      expect(ctx.logger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/MCP connect attempt 1\/3 failed: .*retrying in 0ms/)
      );
    });

    it('succeeds on attempt 3 after two transient failures', async () => {
      const { createFetchResource, close } = installResourceMocks(
        jest.fn().mockRejectedValue(fetchFailed('ECONNREFUSED'))
      );
      mockConnectSequence([
        async (customFetch) => {
          await customFetch('https://mcp.example.com', { method: 'POST' });
          throw new Error('should not reach');
        },
        async (customFetch) => {
          await customFetch('https://mcp.example.com', { method: 'POST' });
          throw new Error('should not reach');
        },
        async () => ({ connected: true }),
      ]);

      await createRetryingClientType().build(makeBuildContext());

      expect(McpClient).toHaveBeenCalledTimes(3);
      expect(createFetchResource).toHaveBeenCalledTimes(3);
      expect(close).toHaveBeenCalledTimes(2);
    });

    it('rejects with McpConnectionTransportError after 3 transient failures', async () => {
      const { close } = installResourceMocks(
        jest.fn().mockRejectedValue(fetchFailed('ECONNRESET'))
      );
      mockConnectSequence([
        async (customFetch) => {
          await customFetch('https://mcp.example.com', { method: 'POST' });
          throw new Error('should not reach');
        },
        async (customFetch) => {
          await customFetch('https://mcp.example.com', { method: 'POST' });
          throw new Error('should not reach');
        },
        async (customFetch) => {
          await customFetch('https://mcp.example.com', { method: 'POST' });
          throw new Error('should not reach');
        },
      ]);

      const clientType = createRetryingClientType();
      const error = await clientType.build(makeBuildContext()).catch((err: Error) => err);

      expect(error).toBeInstanceOf(McpConnectionTransportError);
      expect(error).toMatchObject({ name: 'McpConnectionTransportError', code: 'ECONNRESET' });
      expect(McpClient).toHaveBeenCalledTimes(3);
      expect(close).toHaveBeenCalledTimes(3);
      expect(isTransientConnectError(error)).toBe(true);
      expect(clientType.isUserError?.(error)).toBe(false);
    });

    it('retries when customFetch sees HTTP 503', async () => {
      const { createFetchResource, close } = installResourceMocks(
        jest.fn().mockResolvedValue(new Response(null, { status: 503 }))
      );
      mockConnectSequence([
        async (customFetch) => {
          await customFetch('https://mcp.example.com', { method: 'POST' });
          throw new Error('wrapped 503');
        },
        async () => ({ connected: true }),
      ]);

      await createRetryingClientType().build(makeBuildContext());

      expect(McpClient).toHaveBeenCalledTimes(2);
      expect(createFetchResource).toHaveBeenCalledTimes(2);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it.each([401, 403])(
      'does not retry HTTP %i and closes the failed attempt',
      async (httpStatus) => {
        const { close } = installResourceMocks(
          jest.fn().mockResolvedValue(new Response(null, { status: httpStatus }))
        );
        const connectError = new Error('wrapped connection error');
        mockConnectSequence([
          async (customFetch) => {
            await customFetch('https://mcp.example.com', { method: 'POST' });
            throw connectError;
          },
        ]);

        const clientType = createRetryingClientType();
        const error = await clientType.build(makeBuildContext()).catch((err: Error) => err);

        expect(error).toMatchObject({
          name: 'McpConnectionHttpError',
          httpStatus,
          cause: connectError,
        });
        expect(McpClient).toHaveBeenCalledTimes(1);
        expect(close).toHaveBeenCalledTimes(1);
        expect(clientType.isUserError?.(error)).toBe(true);
      }
    );

    it('does not retry an unclassified Error from connect', async () => {
      const { close } = installResourceMocks();
      const connectError = new Error('unclassified');
      (McpClient as unknown as jest.Mock).mockImplementationOnce(() => ({
        connect: jest.fn().mockRejectedValue(connectError),
        disconnect: jest.fn().mockResolvedValue(undefined),
      }));

      await expect(createRetryingClientType().build(makeBuildContext())).rejects.toBe(connectError);
      expect(McpClient).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('waits the default delay before starting attempt 2', async () => {
      jest.useFakeTimers();
      try {
        installResourceMocks(jest.fn().mockRejectedValue(fetchFailed('ECONNRESET')));
        mockConnectSequence([
          async (customFetch) => {
            await customFetch('https://mcp.example.com', { method: 'POST' });
            throw new Error('should not reach');
          },
          async () => ({ connected: true }),
        ]);

        const buildPromise = createMcpClientType().build(makeBuildContext());

        await jest.advanceTimersByTimeAsync(0);
        expect(McpClient).toHaveBeenCalledTimes(1);

        await jest.advanceTimersByTimeAsync(MCP_CONNECT_RETRY_DELAY_MS - 1);
        expect(McpClient).toHaveBeenCalledTimes(1);

        await jest.advanceTimersByTimeAsync(1);
        await buildPromise;
        expect(McpClient).toHaveBeenCalledTimes(2);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('isTransientConnectError', () => {
    it.each([500, 502, 503])('returns true for HTTP %i', (httpStatus) => {
      expect(
        isTransientConnectError(new McpConnectionHttpError(httpStatus, new Error('boom')))
      ).toBe(true);
    });

    it.each([401, 403])('returns false for HTTP %i', (httpStatus) => {
      expect(
        isTransientConnectError(new McpConnectionHttpError(httpStatus, new Error('boom')))
      ).toBe(false);
    });

    it.each([
      'ECONNREFUSED',
      'ECONNRESET',
      'EPIPE',
      'ETIMEDOUT',
      'UND_ERR_SOCKET',
      'UND_ERR_CONNECT_TIMEOUT',
      'UND_ERR_HEADERS_TIMEOUT',
    ])('returns true for transport code %s on the error', (code) => {
      expect(
        isTransientConnectError(new McpConnectionTransportError(code, new Error('boom')))
      ).toBe(true);
      expect(isTransientConnectError(Object.assign(new Error('boom'), { code }))).toBe(true);
    });

    it.each([
      'ECONNREFUSED',
      'ECONNRESET',
      'EPIPE',
      'ETIMEDOUT',
      'UND_ERR_SOCKET',
      'UND_ERR_CONNECT_TIMEOUT',
      'UND_ERR_HEADERS_TIMEOUT',
    ])('returns true for transport code %s on cause', (code) => {
      const cause = Object.assign(new Error(code), { code });
      expect(isTransientConnectError(new TypeError('fetch failed', { cause }))).toBe(true);
    });

    it('returns true for a socket hang up message', () => {
      expect(isTransientConnectError(new Error('socket hang up'))).toBe(true);
    });

    it('returns false for UND_ERR_CLOSED', () => {
      expect(
        isTransientConnectError(Object.assign(new Error('closed'), { code: 'UND_ERR_CLOSED' }))
      ).toBe(false);
    });

    it('returns false for a plain Error', () => {
      expect(isTransientConnectError(new Error('boom'))).toBe(false);
    });

    it('returns false for a missing serverUrl error', () => {
      expect(isTransientConnectError(new Error('config.serverUrl is required'))).toBe(false);
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
      [new McpError(McpErrorCode.ConnectionClosed, 'Connection closed'), true],
      [new McpNotConnectedError('kibana-mcp', '1.0.0'), true],
      [new Error('Not connected'), true],
      [new McpError(McpErrorCode.RequestTimeout, 'Request timed out'), false],
      [new McpError(McpErrorCode.InvalidParams, 'bad params'), false],
      [new StreamableHTTPError(500, 'boom'), false],
      [new Error('boom'), false],
    ])('classifies terminal errors', (error, expected) => {
      expect(createMcpClientType().shouldInvalidateOnError?.(error)).toBe(expected);
    });

    it('returns true when cause is StreamableHTTPError 403', () => {
      const err = new Error('wrapped', { cause: new StreamableHTTPError(403, 'nope') });
      expect(createMcpClientType().shouldInvalidateOnError?.(err)).toBe(true);
    });

    it('returns true when a terminal undici code is on cause (fetch failed)', () => {
      const cause = Object.assign(new Error('closed'), { code: 'UND_ERR_CLOSED' });
      const err = new TypeError('fetch failed', { cause });
      expect(createMcpClientType().shouldInvalidateOnError?.(err)).toBe(true);
    });

    it('returns false when the terminal error is nested deeper than cause', () => {
      const nested = Object.assign(new Error('closed'), { code: 'UND_ERR_CLOSED' });
      const err = new Error('wrapped', { cause: new Error('mid', { cause: nested }) });
      expect(createMcpClientType().shouldInvalidateOnError?.(err)).toBe(false);
    });
  });
});
