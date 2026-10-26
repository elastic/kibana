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
  DATA_VIEW_PATH_LEGACY,
  ES_ARCHIVE_BASIC_INDEX,
  ID_OVER_MAX_LENGTH,
  SERVICE_KEY_LEGACY,
} from '../../fixtures/constants';

const ID_TOO_LONG_MESSAGE =
  '[request params.id]: value has length [1759] but it must have a maximum length of [1000].';

// The scripted field routes are registered on serverless too, so the error paths are deployment agnostic.
apiTest.describe(
  'scripted_fields_crud - errors (legacy index pattern api)',
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let basicIndexPatternId: string;
    let createdIds: string[] = [];

    const headers = () => ({
      ...COMMON_HEADERS,
      ...adminApiCredentials.apiKeyHeader,
    });

    const nonExistingId = () => `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;

    apiTest.beforeAll(async ({ esArchiver, requestAuth, apiServices }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
      const { data: dataView } = await apiServices.dataViews.create({
        title: '*asic_index',
        override: true,
      });
      basicIndexPatternId = dataView.id;
    });

    apiTest.afterEach(async ({ apiServices }) => {
      for (const id of createdIds) {
        await apiServices.dataViews.delete(id);
      }
      createdIds = [];
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.dataViews.delete(basicIndexPatternId);
    });

    apiTest('create: returns an error when field object is not provided', async ({ apiClient }) => {
      const response = await apiClient.post(
        `${DATA_VIEW_PATH_LEGACY}/${basicIndexPatternId}/scripted_field`,
        { headers: headers(), responseType: 'json', body: {} }
      );

      expect(response).toHaveStatusCode(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toBe(
        '[request body.field.name]: expected value of type [string] but got [undefined]'
      );
    });

    apiTest(
      'create: returns an error when creating a non-scripted field',
      async ({ apiClient }) => {
        const response = await apiClient.post(
          `${DATA_VIEW_PATH_LEGACY}/${basicIndexPatternId}/scripted_field`,
          {
            headers: headers(),
            responseType: 'json',
            body: { field: { name: 'bar', type: 'number', scripted: false } },
          }
        );

        expect(response).toHaveStatusCode(400);
        expect(response.body.statusCode).toBe(400);
        expect(response.body.message).toBe('Only scripted fields can be created.');
      }
    );

    apiTest('get: returns 404 error on non-existing index_pattern', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${DATA_VIEW_PATH_LEGACY}/${nonExistingId()}/scripted_field/foo`,
        { headers: headers(), responseType: 'json' }
      );

      expect(response).toHaveStatusCode(404);
    });

    apiTest('get: returns 404 error on non-existing scripted field', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${DATA_VIEW_PATH_LEGACY}/${basicIndexPatternId}/scripted_field/sf`,
        { headers: headers(), responseType: 'json' }
      );

      expect(response).toHaveStatusCode(404);
    });

    apiTest('get: returns error when ID is too long', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${DATA_VIEW_PATH_LEGACY}/${ID_OVER_MAX_LENGTH}/scripted_field/foo`,
        { headers: headers(), responseType: 'json' }
      );

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(ID_TOO_LONG_MESSAGE);
    });

    apiTest(
      'get: returns error when attempting to fetch a field which is not a scripted field',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `${DATA_VIEW_PATH_LEGACY}/${basicIndexPatternId}/scripted_field/foo`,
          { headers: headers(), responseType: 'json' }
        );

        expect(response).toHaveStatusCode(400);
        expect(response.body.statusCode).toBe(400);
        expect(response.body.message).toBe('Only scripted fields can be retrieved.');
      }
    );

    apiTest('delete: returns 404 error on non-existing index_pattern', async ({ apiClient }) => {
      const response = await apiClient.delete(
        `${DATA_VIEW_PATH_LEGACY}/${nonExistingId()}/scripted_field/foo`,
        { headers: headers(), responseType: 'json' }
      );

      expect(response).toHaveStatusCode(404);
    });

    apiTest('delete: returns 404 error on non-existing scripted field', async ({ apiClient }) => {
      const response = await apiClient.delete(
        `${DATA_VIEW_PATH_LEGACY}/${basicIndexPatternId}/scripted_field/test`,
        { headers: headers(), responseType: 'json' }
      );

      expect(response).toHaveStatusCode(404);
    });

    apiTest(
      'delete: returns error when attempting to delete a field which is not a scripted field',
      async ({ apiClient }) => {
        const response = await apiClient.delete(
          `${DATA_VIEW_PATH_LEGACY}/${basicIndexPatternId}/scripted_field/foo`,
          { headers: headers(), responseType: 'json' }
        );

        expect(response).toHaveStatusCode(400);
        expect(response.body.statusCode).toBe(400);
        expect(response.body.message).toBe('Only scripted fields can be deleted.');
      }
    );

    apiTest('delete: returns error when ID is too long', async ({ apiClient }) => {
      const response = await apiClient.delete(
        `${DATA_VIEW_PATH_LEGACY}/${ID_OVER_MAX_LENGTH}/scripted_field/foo`,
        { headers: headers(), responseType: 'json' }
      );

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(ID_TOO_LONG_MESSAGE);
    });

    apiTest('put: returns 404 error on non-existing index_pattern', async ({ apiClient }) => {
      const response = await apiClient.put(
        `${DATA_VIEW_PATH_LEGACY}/${nonExistingId()}/scripted_field`,
        {
          headers: headers(),
          responseType: 'json',
          body: { field: { name: 'foo', type: 'number', scripted: true } },
        }
      );

      expect(response).toHaveStatusCode(404);
    });

    apiTest(
      'put: returns error when updating a field which is not a scripted field',
      async ({ apiClient }) => {
        const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
          headers: headers(),
          responseType: 'json',
          body: {
            [SERVICE_KEY_LEGACY]: {
              title: `foo-${Date.now()}-${Math.random()}*`,
              fields: { foo: { scripted: false, name: 'foo', type: 'string' } },
            },
          },
        });
        expect(createResponse).toHaveStatusCode(200);
        const { id } = createResponse.body[SERVICE_KEY_LEGACY];
        createdIds.push(id);

        const response = await apiClient.put(`${DATA_VIEW_PATH_LEGACY}/${id}/scripted_field`, {
          headers: headers(),
          responseType: 'json',
          body: { field: { name: 'foo', type: 'number' } },
        });

        expect(response).toHaveStatusCode(400);
        expect(response.body.statusCode).toBe(400);
        expect(response.body.message).toBe('Only scripted fields can be put.');
      }
    );

    apiTest('put: returns error when ID is too long', async ({ apiClient }) => {
      const response = await apiClient.put(
        `${DATA_VIEW_PATH_LEGACY}/${ID_OVER_MAX_LENGTH}/scripted_field`,
        {
          headers: headers(),
          responseType: 'json',
          body: { field: { field: { name: 'foo', type: 'number', scripted: true } } },
        }
      );

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(ID_TOO_LONG_MESSAGE);
    });

    apiTest('update: returns 404 error on non-existing index_pattern', async ({ apiClient }) => {
      const response = await apiClient.post(
        `${DATA_VIEW_PATH_LEGACY}/${nonExistingId()}/scripted_field/foo`,
        {
          headers: headers(),
          responseType: 'json',
          body: { field: { type: 'number', scripted: true } },
        }
      );

      expect(response).toHaveStatusCode(404);
    });

    apiTest('update: returns error when field name is specified', async ({ apiClient }) => {
      const response = await apiClient.post(
        `${DATA_VIEW_PATH_LEGACY}/${nonExistingId()}/scripted_field/foo`,
        {
          headers: headers(),
          responseType: 'json',
          body: { field: { name: 'foo', type: 'number', scripted: true } },
        }
      );

      expect(response).toHaveStatusCode(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toBe(
        "[request body.field.name]: a value wasn't expected to be present"
      );
    });

    apiTest('update: returns error when ID is too long', async ({ apiClient }) => {
      const response = await apiClient.post(
        `${DATA_VIEW_PATH_LEGACY}/${ID_OVER_MAX_LENGTH}/scripted_field/foo`,
        {
          headers: headers(),
          responseType: 'json',
          body: { field: { field: { type: 'number', scripted: true } } },
        }
      );

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(ID_TOO_LONG_MESSAGE);
    });
  }
);
