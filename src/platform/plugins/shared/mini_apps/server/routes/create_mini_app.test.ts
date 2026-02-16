/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { registerCreateMiniAppRoute } from './create_mini_app';

describe('registerCreateMiniAppRoute', () => {
  let router: jest.Mocked<IRouter>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    router = {
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<IRouter>;

    logger = {
      error: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
  });

  it('should register a POST route at /api/mini_apps', () => {
    registerCreateMiniAppRoute(router, logger);

    expect(router.post).toHaveBeenCalledTimes(1);
    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/mini_apps',
        validate: expect.objectContaining({
          body: expect.any(Object),
        }),
      }),
      expect.any(Function)
    );
  });
});
