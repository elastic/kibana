/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import { KibanaHttpError } from '@kbn/core-http-server';
import { KibanaResponse } from '@kbn/core-http-router-server-internal';

import { kibanaResponseFromRouteHandlerError } from './kibana_route_handler_errors';

describe('kibanaResponseFromRouteHandlerError', () => {
  it('maps Boom.notFound to a 404 KibanaResponse', () => {
    const response = kibanaResponseFromRouteHandlerError(Boom.notFound());
    expect(response).toBeInstanceOf(KibanaResponse);
    expect(response?.status).toBe(404);
    expect(response?.payload).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Not Found',
    });
  });

  it('maps KibanaHttpError to the configured status', () => {
    const response = kibanaResponseFromRouteHandlerError(
      new KibanaHttpError('nope', 403, { headers: { 'x-test': '1' } })
    );
    expect(response?.status).toBe(403);
    expect(response?.options.headers).toEqual({ 'x-test': '1' });
  });

  it('returns undefined for unhandled errors', () => {
    expect(kibanaResponseFromRouteHandlerError(new Error('boom'))).toBeUndefined();
  });
});
