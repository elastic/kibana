/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect, apiTest, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import { COMMON_HEADERS } from '../fixtures/constants';

apiTest.describe('POST /api/data_views/data_view/{id}/runtime_field/{name} - update errors', { tag: tags.PLATFORM }, () => {
  let adminApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    // TODO: Get admin API credentials
  });

  apiTest.describe('legacy API', () => {
    apiTest('returns 404 for non-existent index pattern', async ({ apiClient }) => {
      // TODO: POST update to non-existent pattern, verify 404
    });

    apiTest('returns 404 for non-existent runtime field', async ({ apiClient }) => {
      // TODO: Create pattern, POST update to non-existent field, verify 404, delete pattern
    });

    apiTest('returns error when runtimeField is not provided', async ({ apiClient }) => {
      // TODO: Create pattern with field, POST update without runtimeField, verify 400, delete
    });
  });

  apiTest.describe('data view API', () => {
    apiTest('returns 404 for non-existent data view', async ({ apiClient }) => {
      // TODO: Same for data view API
    });

    apiTest('returns 404 for non-existent runtime field', async ({ apiClient }) => {
      // TODO: Same for data view API
    });

    apiTest('returns error when runtimeField is not provided', async ({ apiClient }) => {
      // TODO: Same for data view API
    });
  });
});
