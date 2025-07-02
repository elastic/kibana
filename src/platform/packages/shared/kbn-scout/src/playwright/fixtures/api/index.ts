/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test as base } from 'playwright/test';
import { EsArchiverFixture, coreWorkerFixtures, esArchiverFixture } from '../worker';
import type { CoreWorkerFixtures } from '../worker/core_fixtures';
import { RequestAuthFixture, requestAuthFixture } from '../worker/api_key';
import { ApiClientFixture, apiClientFixture } from '../worker/api_client';
import { DefaultRolesFixture, defaultRolesFixture } from '../worker/default_roles';

interface ApiWorkerFixtures extends CoreWorkerFixtures {
  apiClient: ApiClientFixture;
  defaultRolesFixture: DefaultRolesFixture;
  requestAuth: RequestAuthFixture;
  esArchiver: EsArchiverFixture;
}

export const apiTest = base.extend<ApiWorkerFixtures>({
  // Remove built-in browser fixtures by overriding them with undefined and relaxing the types
  page: [async (_: unknown, use: (value: undefined) => Promise<void>) => {
    await use(undefined);
  }, { scope: 'test' }] as any,
  browser: [async (_: unknown, use: (value: undefined) => Promise<void>) => {
    await use(undefined);
  }, { scope: 'worker' }] as any,
  context: [async (_: unknown, use: (value: undefined) => Promise<void>) => {
    await use(undefined);
  }, { scope: 'test' }] as any,
  request: [async (_: unknown, use: (value: undefined) => Promise<void>) => {
    await use(undefined);
  }, { scope: 'test' }] as any,
  // Add api testing fixtures
  ...coreWorkerFixtures,
  ...apiClientFixture,
  ...defaultRolesFixture,
  ...requestAuthFixture,
  ...esArchiverFixture,
});
