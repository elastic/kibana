/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TransportRequestParams, TransportRequestOptions } from '@elastic/elasticsearch';
import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
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
    expect((options.context as any).timingContext.kibanaRequest).toBeUndefined();
  });

  it('includes kibanaRequest in timing context when provided', () => {
    const mockRequest = httpServerMock.createKibanaRequest() as KibanaRequest;
    const handler = getTimingRequestHandler(mockRequest);
    const params: TransportRequestParams = {
      method: 'GET',
      path: '/_search',
    };
    const options: TransportRequestOptions = {};

    handler({ scoped: true }, params, options, mockLogger);

    expect(options.context).toBeDefined();
    expect((options.context as any).timingContext).toBeDefined();
    expect((options.context as any).timingContext.kibanaRequest).toBe(mockRequest);
    expect((options.context as any).timingContext.startTime).toBeGreaterThan(0);
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
