/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IRouter } from './router';

export type RouterMock = jest.Mocked<IRouter>;

function create({ routerPath = '' }: { routerPath?: string } = {}): RouterMock {
  return {
    routerPath,
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    getRoutes: jest.fn(),
    handleLegacyErrors: jest.fn().mockImplementation((handler) => handler),
  };
}

export const mockRouter = {
  create,
};
