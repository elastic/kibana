/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { kibanaResponseFactory } from '@kbn/core-http-router-server-internal';
import { registerTranslationsRoute } from './translations';

describe('registerTranslationsRoute', () => {
  test('registers route with expected options', () => {
    const router = mockRouter.create();
    registerTranslationsRoute({
      router,
      locale: 'en',
      isDist: true,
      translationHashes: { en: 'XXXX' },
    });
    expect(router.get).toHaveBeenCalledTimes(2);
    expect(router.get).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        path: '/translations/{locale}.json',
        options: {
          access: 'public',
          excludeFromRateLimiter: true,
          httpResource: true,
        },
        security: expect.objectContaining({
          authc: expect.objectContaining({ enabled: false }),
        }),
      }),
      expect.any(Function)
    );
    expect(router.get).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        path: '/translations/{translationHash}/{locale}.json',
        options: {
          access: 'public',
          excludeFromRateLimiter: true,
          httpResource: true,
        },
        security: expect.objectContaining({
          authc: expect.objectContaining({ enabled: false }),
        }),
      }),
      expect.any(Function)
    );
  });

  test('returns 404 for a stale hash even when the locale uses non-canonical casing', async () => {
    const router = mockRouter.create();
    registerTranslationsRoute({
      router,
      locale: 'en',
      isDist: true,
      translationHashes: { en: 'GOODHASH' },
    });

    // Both registered route paths share the same handler logic; either is
    // fine to drive. Use the hashed-path handler since it's the one that
    // exercises the stale-hash check.
    const [, hashedPathHandler] = router.get.mock.calls[1];

    const request = httpServerMock.createKibanaRequest({
      params: { locale: 'EN', translationHash: 'BADHASH' },
    });
    const response = await hashedPathHandler({} as any, request, kibanaResponseFactory);

    expect(response.status).toBe(404);
    expect((response.payload as any) ?? response.payload).toEqual(
      expect.stringContaining('Stale translation hash')
    );
  });
});
