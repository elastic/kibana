/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import { KibanaHttpErrors } from '@kbn/core-http-server';
import { kibanaResponseFactory } from './response';
import { wrapErrors } from './error_wrapper';

describe('wrapErrors', () => {
  it('converts KibanaHttpError to customError response', async () => {
    const handler = wrapErrors(async () => {
      throw KibanaHttpErrors.badRequest('nope');
    });
    const res = await handler({} as any, {} as any, kibanaResponseFactory);
    expect(res.status).toBe(400);
    expect((res.payload as { message: string }).message).toBe('nope');
  });

  it('still converts Boom errors', async () => {
    const handler = wrapErrors(async () => {
      throw Boom.badRequest('legacy');
    });
    const res = await handler({} as any, {} as any, kibanaResponseFactory);
    expect(res.status).toBe(400);
  });
});
