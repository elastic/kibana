/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest, tags, type RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  ES_ARCHIVE_BASIC_INDEX,
  FIELDS_FOR_WILDCARD_PATH,
  INTERNAL_COMMON_HEADERS,
} from '../../fixtures/constants';

apiTest.describe(
  'rollup data views - fields for wildcard',
  {
    tag: [
      ...tags.serverless.observability.complete,
      ...tags.serverless.search,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, esArchiver }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
    });

    apiTest(
      'returns 200 and best effort response despite lack of rollup support',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `${FIELDS_FOR_WILDCARD_PATH}?pattern=basic_index&type=rollup&rollup_index=bar`,
          {
            headers: {
              ...INTERNAL_COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.fields).toHaveLength(5);
      }
    );
  }
);
