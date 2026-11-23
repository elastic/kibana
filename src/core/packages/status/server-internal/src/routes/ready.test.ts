/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { registerReadyRoute } from './ready';

describe('registerReadyRoute', () => {
  it('returns 503 when Kibana is not ready', async () => {
    const router = mockRouter.create();
    const isReady = jest.fn().mockReturnValue(false);
    registerReadyRoute({ router, isReady });

    const handler = (router.get as jest.Mock).mock.calls[0][1];
    const response = mockRouter.createResponseFactory();

    await handler({}, {}, response);

    expect(response.custom).toHaveBeenCalledWith({
      body: { ok: false },
      statusCode: 503,
      headers: { 'Retry-After': '5' },
      bypassErrorFormat: true,
    });
  });

  it('returns 200 when Kibana is ready', async () => {
    const router = mockRouter.create();
    const isReady = jest.fn().mockReturnValue(true);
    registerReadyRoute({ router, isReady });

    const handler = (router.get as jest.Mock).mock.calls[0][1];
    const response = mockRouter.createResponseFactory();

    await handler({}, {}, response);

    expect(response.ok).toHaveBeenCalledWith({ body: { ok: true } });
  });
});
