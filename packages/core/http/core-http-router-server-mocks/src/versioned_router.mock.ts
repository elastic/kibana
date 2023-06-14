/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { VersionedRouter, VersionedRoute } from '@kbn/core-http-server';

const createMockVersionedRoute = (): VersionedRoute => {
  const api: VersionedRoute = { addVersion: jest.fn(() => api) };
  return api;
};

export const createVersionedRouterMock = (): jest.Mocked<VersionedRouter<any>> => ({
  delete: jest.fn((_) => createMockVersionedRoute()),
  get: jest.fn((_) => createMockVersionedRoute()),
  patch: jest.fn((_) => createMockVersionedRoute()),
  post: jest.fn((_) => createMockVersionedRoute()),
  put: jest.fn((_) => createMockVersionedRoute()),
});
