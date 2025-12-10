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

apiTest.describe(
  'PUT /internal/data_views/_fields_for_wildcard - filter fields',
  { tag: tags.PLATFORM },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ esClient, requestAuth }) => {
      // TODO: Implement test setup
      // 1. Get admin API credentials using requestAuth.getApiKey('admin')
      // 2. Index document in 'helloworld1': { hello: 'world' }
      // 3. Index document in 'helloworld2': { bye: 'world' }
      // 4. Refresh indices
    });

    apiTest('can filter', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. PUT request to /internal/data_views/_fields_for_wildcard
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send query params: { pattern: 'helloworld*' }
      // 4. Send body: { index_filter: { exists: { field: 'bye' } } }
      // 5. Verify response statusCode equals 200
      // 6. Verify response.body.fields includes 'bye' field
      // 7. Verify response.body.fields does not include 'hello' field
    });
  }
);
