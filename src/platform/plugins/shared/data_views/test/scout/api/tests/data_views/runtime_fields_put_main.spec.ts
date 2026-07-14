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
} from '../../fixtures/constants';

apiTest.describe(
  `PUT ${DATA_VIEW_PATH}/{id}/runtime_field - main (data view api)`,
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

    apiTest('can overwrite an existing field', async ({ apiClient }) => {
      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          override: true,
          [SERVICE_KEY]: {
            title: 'basic_index',
            runtimeFieldMap: {
              runtimeFoo: {
                type: 'keyword',
                script: { source: "doc['field_name'].value" },
              },
              runtimeBar: {
                type: 'keyword',
                script: { source: "doc['field_name'].value" },
              },
            },
          },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      const id = createResponse.body[SERVICE_KEY].id;
      createdIds.push(id);

      const putResponse = await apiClient.put(`${DATA_VIEW_PATH}/${id}/runtime_field`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          name: 'runtimeFoo',
          runtimeField: {
            type: 'long',
            script: { source: "doc['field_name'].value" },
          },
        },
      });

      expect(putResponse).toHaveStatusCode(200);
      expect(putResponse.body[SERVICE_KEY]).toBeDefined();

      const fooResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}/runtime_field/runtimeFoo`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(fooResponse).toHaveStatusCode(200);
      // After overwriting, runtimeFoo should now be a number (long) rather than a string (keyword)
      expect(fooResponse.body.fields[0].type).toBe('number');

      const barResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}/runtime_field/runtimeBar`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(barResponse).toHaveStatusCode(200);
      // runtimeBar should be unaffected - still keyword (type string)
      expect(barResponse.body.fields[0].type).toBe('string');
    });

    apiTest('can add a new runtime field', async ({ apiClient }) => {
      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          override: true,
          [SERVICE_KEY]: {
            title: 'basic_index',
            runtimeFieldMap: {
              runtimeFoo: {
                type: 'keyword',
                script: { source: "doc['field_name'].value" },
              },
            },
          },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      const id = createResponse.body[SERVICE_KEY].id;
      createdIds.push(id);

      await apiClient.put(`${DATA_VIEW_PATH}/${id}/runtime_field`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          name: 'runtimeBar',
          runtimeField: {
            type: 'long',
            script: { source: "doc['field_name'].value" },
          },
        },
      });

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}/runtime_field/runtimeBar`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body[SERVICE_KEY]).toBeDefined();
      expect(typeof getResponse.body.fields[0].runtimeField).toBe('object');
    });
  }
);
