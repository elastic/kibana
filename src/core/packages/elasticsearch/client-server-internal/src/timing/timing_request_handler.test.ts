/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  errors,
  type TransportRequestParams,
  type TransportRequestOptions,
} from '@elastic/elasticsearch';
import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { TransportContext } from '../create_transport';
import { getTimingRequestHandler } from './timing_request_handler';

describe('getTimingRequestHandler', () => {
  const mockLogger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets timing context with startTime', () => {
    const handler = getTimingRequestHandler();
    const params: TransportRequestParams = {
      method: 'GET',
      path: '/_search',
    };
    const options: TransportRequestOptions = {};

    handler({ scoped: true }, params, options, mockLogger);

    expect(options.context).toBeDefined();
    expect((options.context as any).timingContext).toBeDefined();
    expect((options.context as any).timingContext.startTime).toBeGreaterThan(0);
    expect((options.context as TransportContext).timingContext?.measure).toBeUndefined();
  });

  it('includes a bound timing measurement callback without exposing the request', () => {
    const mockRequest = httpServerMock.createKibanaRequest() as KibanaRequest;
    const measure = jest.spyOn(mockRequest.serverTiming, 'measure');
    const handler = getTimingRequestHandler(mockRequest);
    const params: TransportRequestParams = {
      method: 'GET',
      path: '/_search',
    };
    const options: TransportRequestOptions = {};

    handler({ scoped: true }, params, options, mockLogger);

    expect(options.context).toBeDefined();
    expect((options.context as any).timingContext).toBeDefined();
    expect((options.context as any).timingContext).not.toHaveProperty('kibanaRequest');
    expect((options.context as any).timingContext.startTime).toBeGreaterThan(0);
    (options.context as TransportContext).timingContext?.measure?.(
      'es-request',
      10,
      'GET /_search'
    );
    expect(measure).toHaveBeenCalledWith('es-request', 10, 'GET /_search');
    expect(measure.mock.contexts[0]).toBe(mockRequest.serverTiming);
  });

  it('does not traverse the browser request when redacting Elasticsearch errors', () => {
    const mockRequest = httpServerMock.createKibanaRequest();
    const readSocket = jest.fn(() => {
      throw new Error('The socket has been disconnected from the Http2Session');
    });
    Object.defineProperty(mockRequest, 'disconnectedSocket', {
      enumerable: true,
      get: readSocket,
    });
    const handler = getTimingRequestHandler(mockRequest);
    const params = { method: 'GET', path: '/_search' };
    const options: TransportRequestOptions = {};

    handler({ scoped: true }, params, options, mockLogger);

    const error = new errors.ResponseError({
      statusCode: 503,
      body: {},
      headers: {},
      warnings: [],
      meta: {
        context: options.context,
        name: 'test',
        request: { params, options, id: 1 },
        connection: null,
        attempts: 0,
        aborted: false,
      },
    });

    expect(error.statusCode).toBe(503);
    expect(readSocket).not.toHaveBeenCalled();
    expect((error.meta.meta.context as TransportContext).timingContext).not.toHaveProperty(
      'kibanaRequest'
    );
  });

  it('creates context object if not present', () => {
    const handler = getTimingRequestHandler();
    const params: TransportRequestParams = {
      method: 'GET',
      path: '/_search',
    };
    const options: TransportRequestOptions = {};

    expect(options.context).toBeUndefined();
    handler({ scoped: true }, params, options, mockLogger);

    expect(options.context).toBeDefined();
    expect((options.context as any).timingContext).toBeDefined();
  });

  it('preserves existing context properties', () => {
    const handler = getTimingRequestHandler();
    const params: TransportRequestParams = {
      method: 'GET',
      path: '/_search',
    };
    const existingContext = { someOtherContext: { foo: 'bar' } };
    const options: TransportRequestOptions = {
      context: existingContext,
    };

    handler({ scoped: true }, params, options, mockLogger);

    expect((options.context as any).someOtherContext).toEqual({ foo: 'bar' });
    expect((options.context as any).timingContext).toBeDefined();
  });

  it('records timing at invocation time', () => {
    const handler = getTimingRequestHandler();
    const params: TransportRequestParams = {
      method: 'GET',
      path: '/_search',
    };
    const options: TransportRequestOptions = {};

    const beforeTime = performance.now();
    handler({ scoped: true }, params, options, mockLogger);
    const afterTime = performance.now();

    const startTime = (options.context as any).timingContext.startTime;
    expect(startTime).toBeGreaterThanOrEqual(beforeTime);
    expect(startTime).toBeLessThanOrEqual(afterTime);
  });
});
