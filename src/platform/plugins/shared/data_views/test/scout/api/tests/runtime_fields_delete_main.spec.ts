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

apiTest.describe('DELETE /api/data_views/data_view/{id}/runtime_field/{name} - main', { tag: tags.PLATFORM }, () => {
  let adminApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    // TODO: Get admin API credentials
  });

  apiTest.describe('legacy API', () => {
    apiTest('can delete a runtime field', async ({ apiClient }) => {
      // TODO: Create index pattern with runtime field, DELETE it, verify deletion, delete pattern
    });
  });

  apiTest.describe('data view API', () => {
    apiTest('can delete a runtime field', async ({ apiClient }) => {
      // TODO: Same for data view API
    });
  });
});
