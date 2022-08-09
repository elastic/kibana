/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { transportConstructorMock, transportRequestMock } from './create_transport.test.mocks';

import { errors } from '@elastic/elasticsearch';
import type { BaseConnectionPool } from '@elastic/elasticsearch';
import type { InternalUnauthorizedErrorHandler } from './retry_unauthorized';
import { createTransport, ErrorHandlerAccessor } from './create_transport';

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

describe('createTransport', () => {
  let getUnauthorizedErrorHandler: jest.MockedFunction<ErrorHandlerAccessor>;
  let getExecutionContext: jest.MockedFunction<() => string | undefined>;

  beforeEach(() => {
    getUnauthorizedErrorHandler = jest.fn();
    getExecutionContext = jest.fn();
  });

  afterEach(() => {
    transportConstructorMock.mockReset();
    transportRequestMock.mockReset();
  });

  const createTransportClass = () => {
    return createTransport({
      getUnauthorizedErrorHandler,
      getExecutionContext,
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

      await expect(transport.request(requestParams, {})).rejects.toThrowError('woups');

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

      await expect(transport.request(requestParams, {})).rejects.toThrowError('woups');

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

      await expect(transport.request(requestParams, {})).rejects.toThrowError(error);

      expect(transportRequestMock).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(error);
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

      await expect(transport.request(requestParams, {})).rejects.toThrowError(error);

      expect(transportRequestMock).toHaveBeenCalledTimes(1);
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

      await expect(transport.request(requestParams, {})).rejects.toThrowError(error);

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
  });
});
