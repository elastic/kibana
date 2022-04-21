/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Boom from '@hapi/boom';
import { KibanaResponse, KibanaResponseFactory, kibanaResponseFactory } from './response';
import { wrapErrors } from './error_wrapper';
import { KibanaRequest, RequestHandler, RequestHandlerContext } from '../..';

const createHandler =
  (handler: () => any): RequestHandler<any, any, any> =>
  () => {
    return handler();
  };

describe('wrapErrors', () => {
  let context: RequestHandlerContext;
  let request: KibanaRequest<any, any, any>;
  let response: KibanaResponseFactory;

  beforeEach(() => {
    context = {} as any;
    request = {} as any;
    response = kibanaResponseFactory;
  });

  it('should pass-though call parameters to the handler', async () => {
    const handler = jest.fn();
    const wrapped = wrapErrors(handler);
    await wrapped(context, request, response);
    expect(handler).toHaveBeenCalledWith(context, request, response);
  });

  it('should pass-though result from the handler', async () => {
    const handler = createHandler(() => {
      return 'handler-response';
    });
    const wrapped = wrapErrors(handler);
    const result = await wrapped(context, request, response);
    expect(result).toBe('handler-response');
  });

  it('should intercept and convert thrown Boom errors', async () => {
    const handler = createHandler(() => {
      throw Boom.notFound('not there');
    });
    const wrapped = wrapErrors(handler);
    const result = await wrapped(context, request, response);
    expect(result).toBeInstanceOf(KibanaResponse);
    expect(result.status).toBe(404);
    expect(result.payload).toEqual({
      error: 'Not Found',
      message: 'not there',
      statusCode: 404,
    });
  });

  it('should re-throw non-Boom errors', async () => {
    const handler = createHandler(() => {
      throw new Error('something went bad');
    });
    const wrapped = wrapErrors(handler);
    await expect(wrapped(context, request, response)).rejects.toMatchInlineSnapshot(
      `[Error: something went bad]`
    );
  });
});
