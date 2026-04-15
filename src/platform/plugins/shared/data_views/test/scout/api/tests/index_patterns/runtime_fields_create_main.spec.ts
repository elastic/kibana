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
  ES_ARCHIVE_BASIC_INDEX,
  DATA_VIEW_PATH_LEGACY,
  SERVICE_KEY_LEGACY,
} from '../../fixtures/constants';

apiTest.describe(
  'POST api/index_patterns/index_pattern/{id}/runtime_field - create main (legacy index pattern api)',
  { tag: tags.deploymentAgnostic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let createdIds: string[] = [];

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

    apiTest('can create a new runtime field', async ({ apiClient, apiServices }) => {
      const title = `basic_index-${Date.now()}-${Math.random()}*`;
      const { data: dataView } = await apiServices.dataViews.create({
        title,
        override: true,
      });
      createdIds.push(dataView.id);

      const response = await apiClient.post(
        `${DATA_VIEW_PATH_LEGACY}/${dataView.id}/runtime_field`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            name: 'runtimeBar',
            runtimeField: {
              type: 'long',
              script: {
                source: "emit(doc['field_name'].value)",
              },
            },
          },
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body[SERVICE_KEY_LEGACY]).toBeDefined();
      expect(response.body.field).toBeDefined();

      const field = response.body.field;
      expect(field.name).toBe('runtimeBar');
      expect(field.runtimeField.type).toBe('long');
      expect(field.runtimeField.script.source).toBe("emit(doc['field_name'].value)");
      expect(field.scripted).toBe(false);
    });

    apiTest(
      'newly created runtime field is available in the index pattern object',
      async ({ apiClient, apiServices }) => {
        const title = `basic_index-${Date.now()}-${Math.random()}`;
        const { data: dataView } = await apiServices.dataViews.create({
          title,
          override: true,
        });
        createdIds.push(dataView.id);

        const rtResponse = await apiClient.post(
          `${DATA_VIEW_PATH_LEGACY}/${dataView.id}/runtime_field`,
          {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
            body: {
              name: 'runtimeBar',
              runtimeField: {
                type: 'long',
                script: {
                  source: "emit(doc['field_name'].value)",
                },
              },
            },
          }
        );

        expect(rtResponse).toHaveStatusCode(200);

        const { data: retrievedDataView } = await apiServices.dataViews.get(dataView.id);
        expect(retrievedDataView).toBeDefined();

        const fields = retrievedDataView.fields;
        expect(fields).toBeDefined();

        const field = fields!.runtimeBar;
        expect(field.name).toBe('runtimeBar');
        expect(field.runtimeField.type).toBe('long');
        expect(field.runtimeField.script.source).toBe("emit(doc['field_name'].value)");
        expect(field.scripted).toBe(false);

        const duplicateResponse = await apiClient.post(
          `${DATA_VIEW_PATH_LEGACY}/${dataView.id}/runtime_field`,
          {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
            responseType: 'json',
            body: {
              name: 'runtimeBar',
              runtimeField: {
                type: 'long',
                script: {
                  source: "emit(doc['field_name'].value)",
                },
              },
            },
          }
        );

        expect(duplicateResponse).toHaveStatusCode(400);
      }
    );

    apiTest('prevents field name collisions', async ({ apiClient, apiServices }) => {
      const title = `basic-${Date.now()}-${Math.random()}*`;
      const { data: dataView } = await apiServices.dataViews.create({
        title,
        override: true,
      });
      createdIds.push(dataView.id);

      const response1 = await apiClient.post(
        `${DATA_VIEW_PATH_LEGACY}/${dataView.id}/runtime_field`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            name: 'runtimeBar',
            runtimeField: {
              type: 'long',
              script: {
                source: "emit(doc['field_name'].value)",
              },
            },
          },
        }
      );

      expect(response1).toHaveStatusCode(200);

      const response2 = await apiClient.post(
        `${DATA_VIEW_PATH_LEGACY}/${dataView.id}/runtime_field`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            name: 'runtimeBar',
            runtimeField: {
              type: 'long',
              script: {
                source: "emit(doc['field_name'].value)",
              },
            },
          },
        }
      );

      expect(response2).toHaveStatusCode(400);

      const compositeResponse1 = await apiClient.post(
        `${DATA_VIEW_PATH_LEGACY}/${dataView.id}/runtime_field`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            name: 'runtimeComposite',
            runtimeField: {
              type: 'composite',
              script: {
                source: 'emit("a","a"); emit("b","b")',
              },
              fields: {
                a: { type: 'keyword' },
                b: { type: 'keyword' },
              },
            },
          },
        }
      );

      expect(compositeResponse1).toHaveStatusCode(200);

      const compositeResponse2 = await apiClient.post(
        `${DATA_VIEW_PATH_LEGACY}/${dataView.id}/runtime_field`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            name: 'runtimeComposite',
            runtimeField: {
              type: 'composite',
              script: {
                source: 'emit("a","a"); emit("b","b")',
              },
              fields: {
                a: { type: 'keyword' },
                b: { type: 'keyword' },
              },
            },
          },
        }
      );

      expect(compositeResponse2).toHaveStatusCode(400);
    });
  }
);
