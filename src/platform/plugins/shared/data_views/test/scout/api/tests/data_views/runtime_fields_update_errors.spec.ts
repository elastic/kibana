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
  `POST ${DATA_VIEW_PATH}/{id}/runtime_field/{name} - update errors (data view api)`,
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest('returns 404 error on non-existing data view', async ({ apiClient }) => {
      const id = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;
      const response = await apiClient.post(`${DATA_VIEW_PATH}/${id}/runtime_field/foo`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          runtimeField: {
            type: 'keyword',
            script: { source: "doc['something_new'].value" },
          },
        },
      });

      expect(response).toHaveStatusCode(404);
    });

    apiTest('returns error when field name is specified in body', async ({ apiClient }) => {
      const id = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;
      // The update endpoint should not accept a `name` in the body - it comes from the URL.
      const response = await apiClient.post(`${DATA_VIEW_PATH}/${id}/runtime_field/foo`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          name: 'foo',
          runtimeField: {
            type: 'keyword',
            script: { source: "doc['something_new'].value" },
          },
        },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toBe(
        "[request body.name]: a value wasn't expected to be present"
      );
    });
  }
);
