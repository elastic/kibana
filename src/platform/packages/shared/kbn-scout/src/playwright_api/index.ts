/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test as base, APIRequestContext } from '@playwright/test';

// const apiTest = base.extend<{ request: APIRequestContext }>({
//   // Provide the 'request' fixture
//   request: async ({ playwright }, use) => {
//     const request = await playwright.request.newContext();
//     await use(request);
//   },
//   // Override and disable browser-related fixtures
//   page: undefined,
//   context: undefined,
//   browser: undefined,
//   browserName: undefined,
// });

const apiTest = base.extend<{ request: APIRequestContext }>({
  page: async () => {
    throw new Error('Page is not available in API tests');
  },
  context: async () => {
    throw new Error('Context is not available in API tests');
  },
  // Override and disable browser-related fixtures

  request: async ({ playwright }, use) => {
    const request = await playwright.request.newContext();
    await use(request);
    await request.dispose();
  },
});

export { apiTest };
