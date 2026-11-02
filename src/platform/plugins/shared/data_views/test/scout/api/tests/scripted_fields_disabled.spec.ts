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
  COMMON_HEADERS,
  DATA_VIEW_PATH,
  ES_ARCHIVE_BASIC_INDEX,
  SERVICE_KEY,
} from '../fixtures/constants';

apiTest.describe(
  'scripted fields disabled',
  {
    tag: [
      ...tags.serverless.observability.complete,
      ...tags.serverless.search,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let createdDataViewId: string | undefined;

    apiTest.beforeAll(async ({ requestAuth, esArchiver, kbnClient }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      await kbnClient.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
    });

    apiTest.afterEach(async ({ apiServices }) => {
      if (createdDataViewId) {
        await apiServices.dataViews.delete(createdDataViewId);
        createdDataViewId = undefined;
      }
    });

    apiTest('scripted fields are ignored when disabled', async ({ apiClient }) => {
      const response = await apiClient.post(DATA_VIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        body: {
          [SERVICE_KEY]: {
            title: 'basic_index',
            fields: {
              foo_scripted: {
                name: 'foo_scripted',
                type: 'string',
                scripted: true,
                script: "doc['field_name'].value",
              },
            },
          },
        },
      });

      expect(response).toHaveStatusCode(200);
      createdDataViewId = response.body[SERVICE_KEY].id;
      expect(response.body[SERVICE_KEY].fields.foo_scripted).toBeUndefined();
    });
  }
);
