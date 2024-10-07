/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { mockRouter } from './src/router.mock';
export { createVersionedRouterMock } from './src/versioned_router.mock';
export type {
  MockedVersionedRoute,
  MockedVersionedRouter,
  RegisteredVersionedRoute,
} from './src/versioned_router.mock';
export type { RouterMock, RequestFixtureOptions } from './src/router.mock';
