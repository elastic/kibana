/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { registerTranslationsRoute } from './translations';

describe('registerTranslationsRoute', () => {
  test('registers route with expected options', () => {
    const router = mockRouter.create();
    registerTranslationsRoute({
      router,
      locale: 'en',
      isDist: true,
      translationHash: 'XXXX',
    });
    expect(router.get).toHaveBeenCalledTimes(2);
    expect(router.get).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        path: '/translations/{locale}.json',
        options: { access: 'public', authRequired: false },
      }),
      expect.any(Function)
    );
    expect(router.get).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        path: '/translations/XXXX/{locale}.json',
        options: { access: 'public', authRequired: false },
      }),
      expect.any(Function)
    );
  });
});
