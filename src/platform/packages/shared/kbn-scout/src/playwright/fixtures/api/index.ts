/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { base } from 'playwright/test';
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
  // Remove built-in browser fixtures
  page: [async (_, use) => await use(undefined), { scope: 'test' }],
  browser: [async (_, use) => await use(undefined), { scope: 'worker' }],
  context: [async (_, use) => await use(undefined), { scope: 'test' }],
  request: [async (_, use) => await use(undefined), { scope: 'test' }],

  // Add custom fixtures
  ...coreWorkerFixtures,
  ...apiClientFixture,
  ...defaultRolesFixture,
  ...requestAuthFixture,
  ...esArchiverFixture,
});
