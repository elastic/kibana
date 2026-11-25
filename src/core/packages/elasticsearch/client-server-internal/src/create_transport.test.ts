/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transportConstructorMock, transportRequestMock } from './create_transport.test.mocks';

import { errors } from '@elastic/elasticsearch';
import type { BaseConnectionPool, TransportRequestOptions } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { Readable } from 'stream';
import type { InternalUnauthorizedErrorHandler } from './retry_unauthorized';
import type { ErrorHandlerAccessor, OnRequestHandler } from './create_transport';
import { createTransport } from './create_transport';

const createConnectionPool = () => {
  return { _connectionPool: 'mocked' } as unknown as BaseConnectionPool;
};

const baseConstructorParams = {
  connectionPool: createConnectionPool(),
};

const createUnauthorizedError = () => {
  return new errors.ResponseError({
    statusCode: 401,
    warnings: [],
    meta: {} as any,
  });
};

const createUiamAssertionExpiredError = () => {
  return new errors.ResponseError({
    statusCode: 401,
    body: {
      error: {
        type: 'security_exception',
        reason: 'failed to authenticate cloud access token',
        caused_by: {
          type: 'security_exception',
          reason: 'failed to authenticate cloud access token: [0xF0EFFC]',
          authentication_error_code: '0xF0EFFC',
        },
      },
    },
    warnings: [],
    meta: {} as any,
  });
};

const createUiamAssertionExpiredStreamResponse = () => {
  return {
    statusCode: 401,
    body: Readable.from([
      JSON.stringify({
        error: { caused_by: { authentication_error_code: '0xF0EFFC' } },
      }),
    ]),
    headers: {},
    warnings: [],
    meta: {} as any,
  };
};

const createUnauthorizedStreamResponse = () => {
  return {
    statusCode: 401,
    body: Readable.from([
      JSON.stringify({
        error: {
          reason: 'token expired',
        },
      }),
    ]),
    headers: {},
    warnings: [],
    meta: {} as any,
  };
};

const createOversizedUnauthorizedStreamResponse = () => {
  const errorJson = JSON.stringify({
    error: { type: 'security_exception', reason: 'token expired' },
    status: 401,
  });
  const padding = 'x'.repeat(70 * 1024);
  return {
    statusCode: 401 as const,
    body: Readable.from([errorJson, padding]),
    headers: {},
    warnings: [],
    meta: {} as any,
  };
};

const createFailingStreamResponse = () => {
  const stream = new Readable({
    read() {
      this.destroy(new Error('connection reset'));
    },
  });
  return {
    statusCode: 401 as const,
    body: stream,
    headers: {},
    warnings: [],
    meta: {} as any,
  };
};

describe('createTransport', () => {
  let getUnauthorizedErrorHandler: jest.MockedFunction<ErrorHandlerAccessor>;
  let getExecutionContext: jest.MockedFunction<() => string | undefined>;
  let mockLogger: Logger;

  beforeEach(() => {
    getUnauthorizedErrorHandler = jest.fn();
    getExecutionContext = jest.fn();
    mockLogger = loggingSystemMock.createLogger();
  });

  afterEach(() => {
    transportConstructorMock.mockReset();
    transportRequestMock.mockReset();
  });

  const createTransportClass = () => {
    return createTransport({
      getUnauthorizedErrorHandler,
      getExecutionContext,
      onRequest: jest.fn(),
      logger: mockLogger,
    });
  };

  describe('#constructor', () => {
    it('calls the parent constructor with the passed options', () => {
      const transportClass = createTransportClass();

      const options = {
        connectionPool: createConnectionPool(),
        maxRetries: 42,
      };

      new transportClass(options);

      expect(transportConstructorMock).toHaveBeenCalledTimes(1);
      expect(transportConstructorMock).toHaveBeenCalledWith(options);
    });

    it('omits the headers when calling the parent constructor', () => {
      const transportClass = createTransportClass();

      const options = {
        connectionPool: createConnectionPool(),
        maxRetries: 42,
        headers: {
          foo: 'bar',
        },
      };

      new transportClass(options);

      const { headers, ...optionsWithoutHeaders } = options;

      expect(transportConstructorMock).toHaveBeenCalledTimes(1);
      expect(transportConstructorMock).toHaveBeenCalledWith(optionsWithoutHeaders);
    });
  });

  describe('#request', () => {
    it('calls `super.request`', async () => {
      const transportClass = createTransportClass();
      const transport = new transportClass(baseConstructorParams);
      const requestOptions = { method: 'GET', path: '/' };

      await transport.request(requestOptions);

      expect(transportRequestMock).toHaveBeenCalledTimes(1);
    });

    it('does not mutate the arguments', async () => {
      const transportClass = createTransportClass();
      const constructorHeaders = { over: '9000', shared: 'from-constructor' };
      const transport = new transportClass({
        ...baseConstructorParams,
        headers: constructorHeaders,
      });

      const requestParams = { method: 'GET', path: '/' };
      const options = {
        headers: { hello: 'dolly', shared: 'from-options' },
      };

      await transport.request(requestParams, options);

      expect(requestParams).toEqual({ method: 'GET', path: '/' });
      expect(options).toEqual({ headers: { hello: 'dolly', shared: 'from-options' } });
    });

    describe('`meta` option', () => {
      it('does not adds `meta: true` to the options when not provided', async () => {
        const transportClass = createTransportClass();
        const transport = new transportClass(baseConstructorParams);
        const requestOptions = { method: 'GET', path: '/' };

        await transport.request(requestOptions, {});

        expect(transportRequestMock).toHaveBeenCalledTimes(1);
        expect(transportRequestMock).toHaveBeenCalledWith(
          expect.any(Object),
          expect.not.objectContaining({
            meta: true,
          })
        );
      });

      it('does not add `meta: true` to the options when provided', async () => {
        const transportClass = createTransportClass();
        const transport = new transportClass(baseConstructorParams);
        const requestParams = { method: 'GET', path: '/' };

        await transport.request(requestParams, { meta: false });

        expect(transportRequestMock).toHaveBeenCalledTimes(1);
        expect(transportRequestMock).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            meta: false,
          })
        );
      });
    });

    describe('`opaqueId` option', () => {
      it('uses the value from the options when provided', async () => {
        const transportClass = createTransportClass();
        const transport = new transportClass(baseConstructorParams);
        const requestParams = { method: 'GET', path: '/' };

        await transport.request(requestParams, { opaqueId: 'some-opaque-id' });

        expect(transportRequestMock).toHaveBeenCalledTimes(1);
        expect(transportRequestMock).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            opaqueId: 'some-opaque-id',
          })
        );
      });

      it('uses the value from getExecutionContext when provided', async () => {
        getExecutionContext.mockReturnValue('opaque-id-from-exec-context');

        const transportClass = createTransportClass();
        const transport = new transportClass(baseConstructorParams);
        const requestParams = { method: 'GET', path: '/' };

        await transport.request(requestParams, {});

        expect(transportRequestMock).toHaveBeenCalledTimes(1);
        expect(transportRequestMock).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            opaqueId: 'opaque-id-from-exec-context',
          })
        );
      });

      it('uses the value from the options when provided both by the options and execution context', async () => {
        getExecutionContext.mockReturnValue('opaque-id-from-exec-context');

        const transportClass = createTransportClass();
        const transport = new transportClass(baseConstructorParams);
        const requestParams = { method: 'GET', path: '/' };

        await transport.request(requestParams, { opaqueId: 'opaque-id-from-options' });

        expect(transportRequestMock).toHaveBeenCalledTimes(1);
        expect(transportRequestMock).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            opaqueId: 'opaque-id-from-options',
          })
        );
      });
    });

    describe('`headers` option', () => {
      it('uses the headers from the options when provided', async () => {
        const transportClass = createTransportClass();
        const transport = new transportClass(baseConstructorParams);
        const requestParams = { method: 'GET', path: '/' };

        const headers = { foo: 'bar', hello: 'dolly' };

        await transport.request(requestParams, { headers });

        expect(transportRequestMock).toHaveBeenCalledTimes(1);
        expect(transportRequestMock).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            headers,
          })
        );
      });

      it('uses the headers passed to the constructor when provided', async () => {
        const transportClass = createTransportClass();
        const headers = { over: '9000', because: 'we can' };
        const transport = new transportClass({ ...baseConstructorParams, headers });
        const requestParams = { method: 'GET', path: '/' };

        await transport.request(requestParams, {});

        expect(transportRequestMock).toHaveBeenCalledTimes(1);
        expect(transportRequestMock).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            headers,
          })
        );
      });

      it('merges the headers from the constructor and from the options', async () => {
        const transportClass = createTransportClass();
        const constructorHeaders = { over: '9000', shared: 'from-constructor' };
        const transport = new transportClass({
          ...baseConstructorParams,
          headers: constructorHeaders,
        });

        const requestParams = { method: 'GET', path: '/' };
        const requestHeaders = { hello: 'dolly', shared: 'from-options' };

        await transport.request(requestParams, { headers: requestHeaders });

        expect(transportRequestMock).toHaveBeenCalledTimes(1);
        expect(transportRequestMock).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            headers: {
              over: '9000',
              hello: 'dolly',
              shared: 'from-options',
            },
          })
        );
      });
    });

    describe('maxResponseSize options', () => {
      it('does not set values when not provided in the options', async () => {
        const transportClass = createTransportClass();
        const transport = new transportClass(baseConstructorParams);
        const requestParams = { method: 'GET', path: '/' };

        await transport.request(requestParams, {});

        expect(transportRequestMock).toHaveBeenCalledTimes(1);
        expect(transportRequestMock).toHaveBeenCalledWith(
          expect.any(Object),
          expect.not.objectContaining({
            maxResponseSize: expect.any(Number),
            maxCompressedResponseSize: expect.any(Number),
          })
        );
      });

      it('uses `maxResponseSize` from the options when provided and when `maxCompressedResponseSize` is not', async () => {
        const transportClass = createTransportClass();
        const transport = new transportClass(baseConstructorParams);
        const requestParams = { method: 'GET', path: '/' };

        await transport.request(requestParams, { maxResponseSize: 234 });

        expect(transportRequestMock).toHaveBeenCalledTimes(1);
        expect(transportRequestMock).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            maxResponseSize: 234,
            maxCompressedResponseSize: 234,
          })
        );
      });

      it('uses `maxCompressedResponseSize` from the options when provided and when `maxResponseSize` is not', async () => {
        const transportClass = createTransportClass();
        const transport = new transportClass(baseConstructorParams);
        const requestParams = { method: 'GET', path: '/' };

        await transport.request(requestParams, { maxCompressedResponseSize: 272 });

        expect(transportRequestMock).toHaveBeenCalledTimes(1);
        expect(transportRequestMock).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            maxResponseSize: 272,
            maxCompressedResponseSize: 272,
          })
        );
      });

      it('uses individual values when both `maxResponseSize` and `maxCompressedResponseSize` are defined', async () => {
        const transportClass = createTransportClass();
        const transport = new transportClass(baseConstructorParams);
        const requestParams = { method: 'GET', path: '/' };

        await transport.request(requestParams, {
          maxResponseSize: 512,
          maxCompressedResponseSize: 272,
        });

        expect(transportRequestMock).toHaveBeenCalledTimes(1);
        expect(transportRequestMock).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            maxResponseSize: 512,
            maxCompressedResponseSize: 272,
          })
        );
      });
    });
  });

  describe('unauthorized error handler', () => {
    it('does not call the handler if the error is not an `unauthorized`', async () => {
      const handler: jest.MockedFunction<InternalUnauthorizedErrorHandler> = jest.fn();
      handler.mockReturnValue({ type: 'notHandled' });

      getUnauthorizedErrorHandler.mockReturnValue(handler);

      transportRequestMock.mockImplementation(() => {
        throw new Error('woups');
      });

      const transportClass = createTransportClass();
      const transport = new transportClass(baseConstructorParams);
      const requestParams = { method: 'GET', path: '/' };

      await expect(transport.request(requestParams, {})).rejects.toThrow('woups');

      expect(transportRequestMock).toHaveBeenCalledTimes(1);
      expect(handler).not.toHaveBeenCalled();
    });

    it('does not attempt to retry the call if no handler is provided', async () => {
      transportRequestMock.mockImplementation(() => {
        throw new Error('woups');
      });

      const transportClass = createTransportClass();
      const transport = new transportClass(baseConstructorParams);
      const requestParams = { method: 'GET', path: '/' };

      await expect(transport.request(requestParams, {})).rejects.toThrow('woups');

      expect(transportRequestMock).toHaveBeenCalledTimes(1);
    });

    it('calls the handler if the error is an `unauthorized`', async () => {
      const handler: jest.MockedFunction<InternalUnauthorizedErrorHandler> = jest.fn();
      handler.mockReturnValue({ type: 'notHandled' });

      getUnauthorizedErrorHandler.mockReturnValue(handler);

      const error = createUnauthorizedError();

      transportRequestMock.mockImplementation(() => {
        throw error;
      });

      const transportClass = createTransportClass();
      const transport = new transportClass(baseConstructorParams);
      const requestParams = { method: 'GET', path: '/' };

      await expect(transport.request(requestParams, {})).rejects.toThrow(error);

      expect(transportRequestMock).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(error, {});
    });

    it('does not retry the call if the handler returns `notHandled`', async () => {
      const handler: jest.MockedFunction<InternalUnauthorizedErrorHandler> = jest.fn();
      handler.mockReturnValue({ type: 'notHandled' });

      getUnauthorizedErrorHandler.mockReturnValue(handler);

      const error = createUnauthorizedError();

      transportRequestMock.mockImplementation(() => {
        throw error;
      });

      const transportClass = createTransportClass();
      const transport = new transportClass(baseConstructorParams);
      const requestParams = { method: 'GET', path: '/' };

      await expect(transport.request(requestParams, {})).rejects.toThrow(error);

      expect(transportRequestMock).toHaveBeenCalledTimes(1);
    });

    it('passes the actual failed credential, including a per-call override, to the handler', async () => {
      const handler: jest.MockedFunction<InternalUnauthorizedErrorHandler> = jest.fn();
      handler.mockReturnValue({ type: 'notHandled' });
      getUnauthorizedErrorHandler.mockReturnValue(handler);
      const error = createUnauthorizedError();
      transportRequestMock.mockRejectedValue(error);
      const transportClass = createTransportClass();
      const transport = new transportClass({
        ...baseConstructorParams,
        headers: {
          authorization: 'Bearer original-session-token',
          'x-client-authentication': 'original-secret',
        },
      });

      await expect(
        transport.request(
          { method: 'GET', path: '/' },
          {
            headers: { authorization: 'Bearer explicit-override' },
          }
        )
      ).rejects.toBe(error);

      expect(handler).toHaveBeenCalledWith(error, {
        authorization: 'Bearer explicit-override',
        'x-client-authentication': 'original-secret',
      });
    });

    it('retries the call if the handler returns `retry` and return result from the retry', async () => {
      const handler: jest.MockedFunction<InternalUnauthorizedErrorHandler> = jest.fn();
      handler.mockReturnValue({ type: 'retry', authHeaders: {} });

      getUnauthorizedErrorHandler.mockReturnValue(handler);

      const error = createUnauthorizedError();

      const retryResult = { body: 'some dummy content' };

      transportRequestMock
        .mockImplementationOnce(() => {
          throw error;
        })
        .mockResolvedValueOnce(retryResult);

      const transportClass = createTransportClass();
      const transport = new transportClass(baseConstructorParams);
      const requestParams = { method: 'GET', path: '/' };

      await expect(transport.request(requestParams, {})).resolves.toEqual(retryResult);

      expect(transportRequestMock).toHaveBeenCalledTimes(2);
    });

    it('does not retry more than once even in case of unauthorized errors', async () => {
      const handler: jest.MockedFunction<InternalUnauthorizedErrorHandler> = jest.fn();
      handler.mockReturnValue({ type: 'retry', authHeaders: {} });

      getUnauthorizedErrorHandler.mockReturnValue(handler);

      const error = createUnauthorizedError();

      transportRequestMock.mockImplementation(() => {
        throw error;
      });

      const transportClass = createTransportClass();
      const transport = new transportClass(baseConstructorParams);
      const requestParams = { method: 'GET', path: '/' };

      await expect(transport.request(requestParams, {})).rejects.toThrow(error);

      expect(transportRequestMock).toHaveBeenCalledTimes(2);
    });

    it('updates the headers for the second internal call in case of `retry`', async () => {
      const handler: jest.MockedFunction<InternalUnauthorizedErrorHandler> = jest.fn();
      handler.mockReturnValue({ type: 'retry', authHeaders: { authorization: 'retry' } });

      getUnauthorizedErrorHandler.mockReturnValue(handler);

      const error = createUnauthorizedError();

      const retryResult = { body: 'some dummy content' };

      transportRequestMock
        .mockImplementationOnce(() => {
          throw error;
        })
        .mockResolvedValueOnce(retryResult);

      const initialHeaders = { authorization: 'initial', foo: 'bar' };
      const transportClass = createTransportClass();
      const transport = new transportClass({ ...baseConstructorParams, headers: initialHeaders });
      const requestParams = { method: 'GET', path: '/' };

      await expect(transport.request(requestParams, {})).resolves.toEqual(retryResult);

      expect(transportRequestMock).toHaveBeenCalledTimes(2);
      expect(transportRequestMock).toHaveBeenNthCalledWith(
        1,
        requestParams,
        expect.objectContaining({
          headers: initialHeaders,
        })
      );
      expect(transportRequestMock).toHaveBeenNthCalledWith(
        2,
        requestParams,
        expect.objectContaining({
          headers: { authorization: 'retry', foo: 'bar' },
        })
      );
    });

    it('updates the headers for next requests in case of `retry`', async () => {
      const handler: jest.MockedFunction<InternalUnauthorizedErrorHandler> = jest.fn();
      handler.mockReturnValue({ type: 'retry', authHeaders: { authorization: 'retry' } });

      getUnauthorizedErrorHandler.mockReturnValue(handler);

      const error = createUnauthorizedError();

      const retryResult = { body: 'some dummy content' };

      transportRequestMock
        .mockImplementationOnce(() => {
          throw error;
        })
        .mockResolvedValue(retryResult);

      const initialHeaders = { authorization: 'initial', foo: 'bar' };
      const transportClass = createTransportClass();
      const transport = new transportClass({ ...baseConstructorParams, headers: initialHeaders });
      const requestParams = { method: 'GET', path: '/' };

      await expect(transport.request(requestParams, {})).resolves.toEqual(retryResult);
      await expect(transport.request(requestParams, {})).resolves.toEqual(retryResult);

      expect(transportRequestMock).toHaveBeenCalledTimes(3);
      expect(transportRequestMock).toHaveBeenNthCalledWith(
        3,
        requestParams,
        expect.objectContaining({
          headers: { authorization: 'retry', foo: 'bar' },
        })
      );
    });

    it('does not retry streamed unauthorized responses when asStream is plain true', async () => {
      const handler: jest.MockedFunction<InternalUnauthorizedErrorHandler> = jest.fn();
      handler.mockReturnValue({ type: 'retry', authHeaders: { authorization: 'retry' } });

      getUnauthorizedErrorHandler.mockReturnValue(handler);

      const streamResponse = createUnauthorizedStreamResponse();
      transportRequestMock.mockResolvedValueOnce(streamResponse);

      const transportClass = createTransportClass();
      const transport = new transportClass(baseConstructorParams);
      const requestParams = { method: 'GET', path: '/' };

      await expect(transport.request(requestParams, { asStream: true })).resolves.toBe(
        streamResponse
      );

      expect(transportRequestMock).toHaveBeenCalledTimes(1);
      expect(handler).not.toHaveBeenCalled();
    });

    it('calls the handler for streamed unauthorized responses with retryOn401', async () => {
      const handler: jest.MockedFunction<InternalUnauthorizedErrorHandler> = jest.fn();
      handler.mockReturnValue({ type: 'notHandled' });

      getUnauthorizedErrorHandler.mockReturnValue(handler);

      transportRequestMock.mockResolvedValueOnce(createUnauthorizedStreamResponse());

      const transportClass = createTransportClass();
      const transport = new transportClass(baseConstructorParams);
      const requestParams = { method: 'GET', path: '/' };

      await expect(
        transport.request(requestParams, {
          asStream: { retryOn401: true } as unknown as TransportRequestOptions['asStream'],
        })
      ).rejects.toThrow(/token expired/);

      expect(transportRequestMock).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toBeInstanceOf(errors.ResponseError);
      expect(handler.mock.calls[0][0].body).toEqual({ error: { reason: 'token expired' } });
    });

    it('retries streamed unauthorized responses when retryOn401 is set and handler returns `retry`', async () => {
      const handler: jest.MockedFunction<InternalUnauthorizedErrorHandler> = jest.fn();
      handler.mockReturnValue({ type: 'retry', authHeaders: { authorization: 'retry' } });

      getUnauthorizedErrorHandler.mockReturnValue(handler);

      const retryResult = { body: 'some dummy content' };

      transportRequestMock
        .mockResolvedValueOnce(createUnauthorizedStreamResponse())
        .mockResolvedValueOnce(retryResult);

      const initialHeaders = { authorization: 'initial', foo: 'bar' };
      const transportClass = createTransportClass();
      const transport = new transportClass({ ...baseConstructorParams, headers: initialHeaders });
      const requestParams = { method: 'GET', path: '/' };

      await expect(
        transport.request(requestParams, {
          asStream: { retryOn401: true } as unknown as TransportRequestOptions['asStream'],
        })
      ).resolves.toEqual(retryResult);

      expect(transportRequestMock).toHaveBeenCalledTimes(2);
      expect(transportRequestMock).toHaveBeenNthCalledWith(
        2,
        requestParams,
        expect.objectContaining({
          asStream: true,
          headers: { authorization: 'retry', foo: 'bar' },
        })
      );
    });

    it('does not retry streamed unauthorized responses more than once with retryOn401', async () => {
      const handler: jest.MockedFunction<InternalUnauthorizedErrorHandler> = jest.fn();
      handler.mockReturnValue({ type: 'retry', authHeaders: { authorization: 'retry' } });

      getUnauthorizedErrorHandler.mockReturnValue(handler);

      transportRequestMock
        .mockResolvedValueOnce(createUnauthorizedStreamResponse())
        .mockResolvedValueOnce(createUnauthorizedStreamResponse());

      const transportClass = createTransportClass();
      const transport = new transportClass(baseConstructorParams);
      const requestParams = { method: 'GET', path: '/' };

      await expect(
        transport.request(requestParams, {
          asStream: { retryOn401: true } as unknown as TransportRequestOptions['asStream'],
        })
      ).rejects.toThrow(/token expired/);

      expect(transportRequestMock).toHaveBeenCalledTimes(2);
    });

    it('logs a warning with partial body when streamed 401 body exceeds max size', async () => {
      const handler: jest.MockedFunction<InternalUnauthorizedErrorHandler> = jest.fn();
      handler.mockReturnValue({ type: 'notHandled' });

      getUnauthorizedErrorHandler.mockReturnValue(handler);

      transportRequestMock.mockResolvedValueOnce(createOversizedUnauthorizedStreamResponse());

      const transportClass = createTransportClass();
      const transport = new transportClass(baseConstructorParams);
      const requestParams = { method: 'POST', path: '/_async_search' };

      await expect(
        transport.request(requestParams, {
          asStream: { retryOn401: true } as unknown as TransportRequestOptions['asStream'],
        })
      ).rejects.toThrow();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Streamed 401 response body exceeded')
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Partial body:'));
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('token expired'));
    });

    it('logs a warning when streamed 401 body fails to read', async () => {
      const handler: jest.MockedFunction<InternalUnauthorizedErrorHandler> = jest.fn();
      handler.mockReturnValue({ type: 'notHandled' });

      getUnauthorizedErrorHandler.mockReturnValue(handler);

      transportRequestMock.mockResolvedValueOnce(createFailingStreamResponse());

      const transportClass = createTransportClass();
      const transport = new transportClass(baseConstructorParams);
      const requestParams = { method: 'POST', path: '/_async_search' };

      await expect(
        transport.request(requestParams, {
          asStream: { retryOn401: true } as unknown as TransportRequestOptions['asStream'],
        })
      ).rejects.toThrow();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read streamed 401 response body: connection reset')
      );
    });
  });

  describe('expired UIAM assertion', () => {
    const CLIENT_AUTHENTICATION = 'x-client-authentication';

    let getUiamClientAuthenticationHeaders: jest.Mock;

    beforeEach(() => {
      getUiamClientAuthenticationHeaders = jest.fn((headers) => ({
        [CLIENT_AUTHENTICATION]: `fresh-assertion-for-${headers.authorization}`,
      }));
    });

    const createUiamTransport = (headers = {}) => {
      const transportClass = createTransport({
        getUnauthorizedErrorHandler,
        getExecutionContext,
        getUiamClientAuthenticationHeaders,
        onRequest: jest.fn(),
        logger: mockLogger,
      });
      return new transportClass({
        ...baseConstructorParams,
        headers: {
          authorization: 'Bearer essu_token',
          [CLIENT_AUTHENTICATION]: 'stale-assertion',
          ...headers,
        },
      });
    };

    const requestParams = { method: 'GET', path: '/' };
    const retryResult = { body: 'some dummy content' };

    it('does not resolve client authentication for a request that succeeds', async () => {
      transportRequestMock.mockResolvedValue(retryResult);

      await createUiamTransport().request(requestParams, {});

      expect(getUiamClientAuthenticationHeaders).not.toHaveBeenCalled();
      expect(transportRequestMock).toHaveBeenCalledWith(
        requestParams,
        expect.objectContaining({
          headers: {
            authorization: 'Bearer essu_token',
            [CLIENT_AUTHENTICATION]: 'stale-assertion',
          },
        })
      );
    });

    it('does not resolve client authentication for another unauthorized error', async () => {
      const handler: jest.MockedFunction<InternalUnauthorizedErrorHandler> = jest.fn();
      handler.mockReturnValue({ type: 'notHandled' });
      getUnauthorizedErrorHandler.mockReturnValue(handler);
      const error = createUnauthorizedError();
      transportRequestMock.mockRejectedValue(error);

      await expect(createUiamTransport().request(requestParams, {})).rejects.toBe(error);

      expect(getUiamClientAuthenticationHeaders).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(transportRequestMock).toHaveBeenCalledTimes(1);
    });

    it('retries once with a newly signed assertion without calling the unauthorized handler', async () => {
      transportRequestMock
        .mockRejectedValueOnce(createUiamAssertionExpiredError())
        .mockResolvedValueOnce(retryResult);

      await expect(createUiamTransport().request(requestParams, {})).resolves.toEqual(retryResult);

      expect(getUnauthorizedErrorHandler).not.toHaveBeenCalled();
      expect(getUiamClientAuthenticationHeaders).toHaveBeenCalledTimes(1);
      expect(getUiamClientAuthenticationHeaders).toHaveBeenCalledWith({
        authorization: 'Bearer essu_token',
        [CLIENT_AUTHENTICATION]: 'stale-assertion',
      });
      expect(transportRequestMock).toHaveBeenCalledTimes(2);
      expect(transportRequestMock).toHaveBeenNthCalledWith(
        2,
        requestParams,
        expect.objectContaining({
          headers: {
            authorization: 'Bearer essu_token',
            [CLIENT_AUTHENTICATION]: 'fresh-assertion-for-Bearer essu_token',
          },
        })
      );
    });

    it('keeps the newly signed assertion for the next requests', async () => {
      transportRequestMock
        .mockRejectedValueOnce(createUiamAssertionExpiredError())
        .mockResolvedValue(retryResult);
      const transport = createUiamTransport();

      await transport.request(requestParams, {});
      await transport.request(requestParams, {});

      expect(getUiamClientAuthenticationHeaders).toHaveBeenCalledTimes(1);
      expect(transportRequestMock).toHaveBeenCalledTimes(3);
      expect(transportRequestMock).toHaveBeenNthCalledWith(
        3,
        requestParams,
        expect.objectContaining({
          headers: {
            authorization: 'Bearer essu_token',
            [CLIENT_AUTHENTICATION]: 'fresh-assertion-for-Bearer essu_token',
          },
        })
      );
    });

    it('does not retry more than once', async () => {
      const error = createUiamAssertionExpiredError();
      transportRequestMock
        .mockRejectedValueOnce(createUiamAssertionExpiredError())
        .mockRejectedValueOnce(error);

      await expect(createUiamTransport().request(requestParams, {})).rejects.toBe(error);

      expect(transportRequestMock).toHaveBeenCalledTimes(2);
    });

    it.each([
      ['nothing is resolved', () => ({})],
      ['the same value is resolved', () => ({ [CLIENT_AUTHENTICATION]: 'stale-assertion' })],
    ])('does not retry when %s', async (_label, resolve) => {
      getUiamClientAuthenticationHeaders.mockImplementation(resolve);
      const error = createUiamAssertionExpiredError();
      transportRequestMock.mockRejectedValue(error);

      await expect(createUiamTransport().request(requestParams, {})).rejects.toBe(error);

      expect(transportRequestMock).toHaveBeenCalledTimes(1);
    });

    it('does not retry when the request overrides the client authentication', async () => {
      const error = createUiamAssertionExpiredError();
      transportRequestMock.mockRejectedValue(error);

      await expect(
        createUiamTransport().request(requestParams, {
          headers: { [CLIENT_AUTHENTICATION]: 'per-request-assertion' },
        })
      ).rejects.toBe(error);

      expect(transportRequestMock).toHaveBeenCalledTimes(1);
    });

    it('does not retry without a resolver', async () => {
      const error = createUiamAssertionExpiredError();
      transportRequestMock.mockRejectedValue(error);
      const transport = new (createTransportClass())({
        ...baseConstructorParams,
        headers: { authorization: 'Bearer essu_token' },
      });

      await expect(transport.request(requestParams, {})).rejects.toBe(error);

      expect(transportRequestMock).toHaveBeenCalledTimes(1);
    });

    it('does not retry or resolve client authentication for a credential that is not a UIAM credential', async () => {
      const error = createUiamAssertionExpiredError();
      transportRequestMock.mockRejectedValue(error);

      await expect(
        createUiamTransport({ authorization: 'Bearer regular_token' }).request(requestParams, {})
      ).rejects.toBe(error);

      expect(getUiamClientAuthenticationHeaders).not.toHaveBeenCalled();
      expect(transportRequestMock).toHaveBeenCalledTimes(1);
    });

    it('retries for a secondary UIAM credential', async () => {
      const SECONDARY_AUTHORIZATION = 'es-secondary-authorization';
      const SECONDARY_CLIENT_AUTHENTICATION = 'es-secondary-x-client-authentication';
      getUiamClientAuthenticationHeaders.mockImplementation((headers) => ({
        [SECONDARY_CLIENT_AUTHENTICATION]: `fresh-assertion-for-${headers[SECONDARY_AUTHORIZATION]}`,
      }));
      transportRequestMock
        .mockRejectedValueOnce(createUiamAssertionExpiredError())
        .mockResolvedValueOnce(retryResult);
      const transportClass = createTransport({
        getExecutionContext,
        getUiamClientAuthenticationHeaders,
        onRequest: jest.fn(),
        logger: mockLogger,
      });
      const transport = new transportClass({
        ...baseConstructorParams,
        headers: {
          [SECONDARY_AUTHORIZATION]: 'ApiKey essu_key',
          [SECONDARY_CLIENT_AUTHENTICATION]: 'stale-assertion',
        },
      });

      await expect(transport.request(requestParams, {})).resolves.toEqual(retryResult);

      expect(transportRequestMock).toHaveBeenNthCalledWith(
        2,
        requestParams,
        expect.objectContaining({
          headers: {
            [SECONDARY_AUTHORIZATION]: 'ApiKey essu_key',
            [SECONDARY_CLIENT_AUTHENTICATION]: 'fresh-assertion-for-ApiKey essu_key',
          },
        })
      );
    });

    it('retries a streamed response only with retryOn401', async () => {
      transportRequestMock.mockResolvedValueOnce(createUiamAssertionExpiredStreamResponse());

      const response = await createUiamTransport().request(requestParams, { asStream: true });

      expect(response).toEqual(expect.objectContaining({ statusCode: 401 }));
      expect(transportRequestMock).toHaveBeenCalledTimes(1);

      transportRequestMock.mockReset();
      transportRequestMock
        .mockResolvedValueOnce(createUiamAssertionExpiredStreamResponse())
        .mockResolvedValueOnce(retryResult);

      await expect(
        createUiamTransport().request(requestParams, {
          asStream: { retryOn401: true } as unknown as TransportRequestOptions['asStream'],
        })
      ).resolves.toEqual(retryResult);

      expect(transportRequestMock).toHaveBeenCalledTimes(2);
      expect(transportRequestMock).toHaveBeenNthCalledWith(
        2,
        requestParams,
        expect.objectContaining({
          headers: {
            authorization: 'Bearer essu_token',
            [CLIENT_AUTHENTICATION]: 'fresh-assertion-for-Bearer essu_token',
          },
        })
      );
    });
  });

  describe('`scoped` parameter and `onRequest` hook', () => {
    it('calls onRequest with scoped: false when scoped is not provided', async () => {
      const onRequest: jest.MockedFunction<OnRequestHandler> = jest.fn();

      const transportClass = createTransport({
        getUnauthorizedErrorHandler,
        getExecutionContext,
        onRequest,
        logger: mockLogger,
      });
      const transport = new transportClass(baseConstructorParams);
      const requestParams = { method: 'GET', path: '/' };

      await transport.request(requestParams, {});

      expect(onRequest).toHaveBeenCalledTimes(1);
      expect(onRequest).toHaveBeenCalledWith(
        { scoped: false },
        requestParams,
        expect.any(Object),
        mockLogger
      );
    });

    it('calls onRequest with scoped: true when scoped is true', async () => {
      const onRequest: jest.MockedFunction<OnRequestHandler> = jest.fn();

      const transportClass = createTransport({
        scoped: true,
        getUnauthorizedErrorHandler,
        getExecutionContext,
        onRequest,
        logger: mockLogger,
      });
      const transport = new transportClass(baseConstructorParams);
      const requestParams = { method: 'GET', path: '/' };

      await transport.request(requestParams, {});

      expect(onRequest).toHaveBeenCalledTimes(1);
      expect(onRequest).toHaveBeenCalledWith(
        { scoped: true },
        requestParams,
        expect.any(Object),
        mockLogger
      );
    });

    it('calls onRequest with scoped: false when scoped is explicitly false', async () => {
      const onRequest: jest.MockedFunction<OnRequestHandler> = jest.fn();

      const transportClass = createTransport({
        scoped: false,
        getUnauthorizedErrorHandler,
        getExecutionContext,
        onRequest,
        logger: mockLogger,
      });
      const transport = new transportClass(baseConstructorParams);
      const requestParams = { method: 'GET', path: '/' };

      await transport.request(requestParams, {});

      expect(onRequest).toHaveBeenCalledTimes(1);
      expect(onRequest).toHaveBeenCalledWith(
        { scoped: false },
        requestParams,
        expect.any(Object),
        mockLogger
      );
    });

    it('passes the correct options to onRequest', async () => {
      const onRequest: jest.MockedFunction<OnRequestHandler> = jest.fn();

      const transportClass = createTransport({
        scoped: true,
        getUnauthorizedErrorHandler,
        getExecutionContext,
        onRequest,
        logger: mockLogger,
      });
      const headers = { authorization: 'test-auth' };
      const transport = new transportClass({ ...baseConstructorParams, headers });
      const requestParams = { method: 'GET', path: '/test' };
      const requestOptions = { opaqueId: 'test-opaque-id' };

      await transport.request(requestParams, requestOptions);

      expect(onRequest).toHaveBeenCalledTimes(1);
      expect(onRequest).toHaveBeenCalledWith(
        { scoped: true },
        requestParams,
        expect.objectContaining({
          opaqueId: 'test-opaque-id',
          headers: { authorization: 'test-auth' },
        }),
        mockLogger
      );
    });

    it('allows onRequest to mutate options (e.g., add querystring params)', async () => {
      const onRequest: jest.MockedFunction<OnRequestHandler> = jest.fn(
        (ctx, params, options, logger) => {
          options!.querystring = {
            ...options!.querystring,
            some_field: 'some_value',
          };
        }
      );

      const transportClass = createTransport({
        scoped: true,
        getUnauthorizedErrorHandler,
        getExecutionContext,
        onRequest,
        logger: mockLogger,
      });
      const transport = new transportClass(baseConstructorParams);
      const requestParams = { method: 'GET', path: '/_search' };

      await transport.request(requestParams, {});

      expect(onRequest).toHaveBeenCalledTimes(1);
      expect(transportRequestMock).toHaveBeenCalledTimes(1);
      expect(transportRequestMock).toHaveBeenCalledWith(
        requestParams,
        expect.objectContaining({
          querystring: { some_field: 'some_value' },
        })
      );
    });
  });
});
