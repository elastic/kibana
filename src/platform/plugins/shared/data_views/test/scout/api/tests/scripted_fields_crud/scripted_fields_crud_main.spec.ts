/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest, tags, type ApiClientFixture, type RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  COMMON_HEADERS,
  DATA_VIEW_PATH_LEGACY,
  ES_ARCHIVE_BASIC_INDEX,
  SERVICE_KEY_LEGACY,
} from '../../fixtures/constants';

const SCRIPT = "doc['field_name'].value";

// Scripted fields are disabled on serverless, so the happy paths only run on stateful classic.
apiTest.describe(
  'scripted_fields_crud - main (legacy index pattern api)',
  { tag: tags.stateful.classic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let createdIds: string[] = [];

    const headers = () => ({
      ...COMMON_HEADERS,
      ...adminApiCredentials.apiKeyHeader,
    });

    apiTest.beforeAll(async ({ esArchiver, requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
    });

    apiTest.afterEach(async ({ apiServices }) => {
      for (const id of createdIds) {
        await apiServices.dataViews.delete(id);
      }
      createdIds = [];
    });

    const createIndexPattern = async (
      apiClient: ApiClientFixture,
      indexPattern: Record<string, unknown>
    ): Promise<string> => {
      const response = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: headers(),
        responseType: 'json',
        body: { override: true, [SERVICE_KEY_LEGACY]: indexPattern },
      });
      expect(response).toHaveStatusCode(200);
      const { id } = response.body[SERVICE_KEY_LEGACY];
      createdIds.push(id);
      return id;
    };

    apiTest('can create a new scripted field', async ({ apiClient }) => {
      const id = await createIndexPattern(apiClient, {
        title: `foo-${Date.now()}-${Math.random()}*`,
      });

      const response = await apiClient.post(`${DATA_VIEW_PATH_LEGACY}/${id}/scripted_field`, {
        headers: headers(),
        responseType: 'json',
        body: {
          field: { name: 'bar', type: 'number', scripted: true, script: SCRIPT },
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.field.name).toBe('bar');
      expect(response.body.field.type).toBe('number');
      expect(response.body.field.scripted).toBe(true);
      expect(response.body.field.script).toBe(SCRIPT);
    });

    apiTest(
      'newly created scripted field is materialized in the index_pattern object',
      async ({ apiClient }) => {
        const id = await createIndexPattern(apiClient, { title: 'basic_index' });

        const createResponse = await apiClient.post(
          `${DATA_VIEW_PATH_LEGACY}/${id}/scripted_field`,
          {
            headers: headers(),
            responseType: 'json',
            body: {
              field: { name: 'bar2', type: 'number', scripted: true, script: SCRIPT },
            },
          }
        );
        expect(createResponse).toHaveStatusCode(200);

        const response = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
          headers: headers(),
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const field = response.body[SERVICE_KEY_LEGACY].fields.bar2;
        expect(field.name).toBe('bar2');
        expect(field.type).toBe('number');
        expect(field.scripted).toBe(true);
        expect(field.script).toBe(SCRIPT);
      }
    );

    apiTest('can fetch a scripted field', async ({ apiClient }) => {
      const id = await createIndexPattern(apiClient, {
        title: 'basic_index',
        fields: {
          foo: { name: 'foo', type: 'string', scripted: true, script: SCRIPT },
          bar: { name: 'bar', type: 'number', scripted: true, script: SCRIPT },
        },
      });

      const response = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${id}/scripted_field/bar`, {
        headers: headers(),
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(typeof response.body.field).toBe('object');
      expect(response.body.field.name).toBe('bar');
      expect(response.body.field.type).toBe('number');
      expect(response.body.field.scripted).toBe(true);
      expect(response.body.field.script).toBe(SCRIPT);
    });

    apiTest('can remove a scripted field', async ({ apiClient }) => {
      const id = await createIndexPattern(apiClient, {
        title: 'basic_index',
        fields: {
          bar: { name: 'bar2', type: 'number', scripted: true, script: SCRIPT },
        },
      });

      const before = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: headers(),
        responseType: 'json',
      });
      expect(typeof before.body[SERVICE_KEY_LEGACY].fields.bar2).toBe('object');

      const deleteResponse = await apiClient.delete(
        `${DATA_VIEW_PATH_LEGACY}/${id}/scripted_field/bar2`,
        { headers: headers(), responseType: 'json' }
      );
      expect(deleteResponse).toHaveStatusCode(200);

      const after = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: headers(),
        responseType: 'json',
      });
      expect(typeof after.body[SERVICE_KEY_LEGACY].fields.bar2).toBe('undefined');
    });

    apiTest('can overwrite an existing field with PUT', async ({ apiClient }) => {
      const id = await createIndexPattern(apiClient, {
        title: 'basic_index',
        fields: {
          foo: { name: 'foo', type: 'string', scripted: true, script: SCRIPT },
          bar: { name: 'bar', type: 'string', scripted: true, script: SCRIPT },
        },
      });

      const putResponse = await apiClient.put(`${DATA_VIEW_PATH_LEGACY}/${id}/scripted_field`, {
        headers: headers(),
        responseType: 'json',
        body: {
          field: { name: 'foo', type: 'number', scripted: true, script: SCRIPT },
        },
      });
      expect(putResponse).toHaveStatusCode(200);

      const fooResponse = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${id}/scripted_field/foo`, {
        headers: headers(),
        responseType: 'json',
      });
      expect(fooResponse).toHaveStatusCode(200);
      expect(fooResponse.body.field.type).toBe('number');

      const barResponse = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${id}/scripted_field/bar`, {
        headers: headers(),
        responseType: 'json',
      });
      expect(barResponse).toHaveStatusCode(200);
      expect(barResponse.body.field.type).toBe('string');
    });

    apiTest('can add a new scripted field with PUT', async ({ apiClient }) => {
      const id = await createIndexPattern(apiClient, {
        title: 'basic_index',
        fields: {
          foo: { name: 'foo', type: 'string', scripted: true, script: SCRIPT },
        },
      });

      const putResponse = await apiClient.put(`${DATA_VIEW_PATH_LEGACY}/${id}/scripted_field`, {
        headers: headers(),
        responseType: 'json',
        body: {
          field: { name: 'bar', type: 'number', scripted: true, script: "doc['bar'].value" },
        },
      });
      expect(putResponse).toHaveStatusCode(200);

      const response = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${id}/scripted_field/bar`, {
        headers: headers(),
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.field.script).toBe("doc['bar'].value");
    });

    apiTest('can update an existing field', async ({ apiClient }) => {
      const id = await createIndexPattern(apiClient, {
        title: 'basic_index',
        fields: {
          foo: { name: 'foo', type: 'string', scripted: true, script: SCRIPT },
          bar: { name: 'bar', type: 'string', scripted: true, script: SCRIPT },
        },
      });

      const updateResponse = await apiClient.post(
        `${DATA_VIEW_PATH_LEGACY}/${id}/scripted_field/foo`,
        {
          headers: headers(),
          responseType: 'json',
          body: { field: { script: "doc['bar'].value" } },
        }
      );
      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body.field.script).toBe("doc['bar'].value");

      const response = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${id}/scripted_field/foo`, {
        headers: headers(),
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.field.type).toBe('string');
      expect(response.body.field.script).toBe("doc['bar'].value");
    });
  }
);
