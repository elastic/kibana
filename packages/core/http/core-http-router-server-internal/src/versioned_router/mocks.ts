/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from '@kbn/core-http-server';

export function createRouter(): jest.Mocked<IRouter> {
  return {
    delete: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    getRoutes: jest.fn(),
    handleLegacyErrors: jest.fn(),
    patch: jest.fn(),
    routerPath: '',
    versioned: {} as any,
  };
}
