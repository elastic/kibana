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
import { COMMON_HEADERS, DATA_VIEW_PATH } from '../../fixtures/constants';

apiTest.describe(
  'POST api/data_views/data_view/{id}/runtime_field - create errors (data view api)',
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let createdIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest.afterEach(async ({ apiServices }) => {
      for (const id of createdIds) {
        await apiServices.dataViews.delete(id);
      }
      createdIds = [];
    });

    apiTest(
      'returns an error when runtime field object is not provided',
      async ({ apiClient, apiServices }) => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const { data: dataView } = await apiServices.dataViews.create({ title });
        createdIds.push(dataView.id);

        const response = await apiClient.post(`${DATA_VIEW_PATH}/${dataView.id}/runtime_field`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {},
        });

        expect(response).toHaveStatusCode(400);
        expect(response.body.statusCode).toBe(400);
        expect(response.body.message).toBe(
          '[request body.name]: expected value of type [string] but got [undefined]'
        );
      }
    );
  }
);
