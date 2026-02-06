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
import {
  COMMON_HEADERS,
  ES_ARCHIVE_BASIC_INDEX,
  DATA_VIEW_PATH_LEGACY,
  DATA_VIEW_PATH,
  SERVICE_KEY_LEGACY,
  SERVICE_KEY,
} from '../fixtures/constants';

apiTest.describe('data views integration tests', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  let adminApiCredentials: RoleApiCredentials;
  let createdIds: string[] = [];

  apiTest.beforeAll(async ({ esArchiver, requestAuth, log }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
    log.info(`API Key created for admin role: ${adminApiCredentials.apiKey.name}`);

    await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
    log.info(`Loaded ES archive: ${ES_ARCHIVE_BASIC_INDEX}`);
  });

  apiTest.afterEach(async ({ apiClient, log }) => {
    for (const id of createdIds) {
      try {
        // Try both paths since tests create both index patterns and data views
        await apiClient.delete(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
          headers: {
            ...COMMON_HEADERS,
            ...adminApiCredentials.apiKeyHeader,
          },
        });
        log.info(`Cleaned up index pattern with id: ${id}`);
      } catch {
        try {
          await apiClient.delete(`${DATA_VIEW_PATH}/${id}`, {
            headers: {
              ...COMMON_HEADERS,
              ...adminApiCredentials.apiKeyHeader,
            },
          });
          log.info(`Cleaned up data view with id: ${id}`);
        } catch {
          log.info(`Failed to clean up resource with id: ${id}`);
        }
      }
    }
    createdIds = [];
  });

  apiTest(
    'create an index pattern, add a runtime field, add a field formatter, then re-create the same index pattern',
    async ({ apiClient }) => {
      const title = `basic_index*`;

      // 1. Create the index pattern
      const createResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          override: true,
          [SERVICE_KEY_LEGACY]: {
            title,
          },
        },
      });

      expect(createResponse.statusCode).toBe(200);
      const id = createResponse.body[SERVICE_KEY_LEGACY].id;

      // 2. Add a runtime field
      const runtimeFieldResponse = await apiClient.post(
        `${DATA_VIEW_PATH_LEGACY}/${id}/runtime_field`,
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

      expect(runtimeFieldResponse.statusCode).toBe(200);

      // 3. Add field attributes (customLabel and count)
      const fieldAttrsResponse = await apiClient.post(`${DATA_VIEW_PATH_LEGACY}/${id}/fields`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          fields: {
            runtimeBar: {
              count: 123,
              customLabel: 'test',
            },
          },
        },
      });

      expect(fieldAttrsResponse.statusCode).toBe(200);

      // 4. Add field formatter (duration format)
      const formatterResponse = await apiClient.post(`${DATA_VIEW_PATH_LEGACY}/${id}/fields`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          fields: {
            runtimeBar: {
              format: {
                id: 'duration',
                params: { inputFormat: 'milliseconds', outputFormat: 'humanizePrecise' },
              },
            },
          },
        },
      });

      expect(formatterResponse.statusCode).toBe(200);

      // 5. Get the index pattern and verify all configurations
      const getResponse = await apiClient.get(`${DATA_VIEW_PATH_LEGACY}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse.statusCode).toBe(200);

      const resultIndexPattern = getResponse.body[SERVICE_KEY_LEGACY];

      // Verify runtime field
      const runtimeField = resultIndexPattern.fields.runtimeBar;
      expect(runtimeField.name).toBe('runtimeBar');
      expect(runtimeField.runtimeField.type).toBe('long');
      expect(runtimeField.runtimeField.script.source).toBe("emit(doc['field_name'].value)");
      expect(runtimeField.scripted).toBe(false);

      // Verify field formatter
      expect(resultIndexPattern.fieldFormats.runtimeBar.id).toBe('duration');
      expect(resultIndexPattern.fieldFormats.runtimeBar.params.inputFormat).toBe('milliseconds');
      expect(resultIndexPattern.fieldFormats.runtimeBar.params.outputFormat).toBe(
        'humanizePrecise'
      );

      // Verify field attributes
      expect(resultIndexPattern.fieldAttrs.runtimeBar.count).toBe(123);
      expect(resultIndexPattern.fieldAttrs.runtimeBar.customLabel).toBe('test');

      // 6. Re-create the same index pattern with override: true
      const recreateResponse = await apiClient.post(DATA_VIEW_PATH_LEGACY, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          override: true,
          [SERVICE_KEY_LEGACY]: resultIndexPattern,
        },
      });

      expect(recreateResponse.statusCode).toBe(200);
      const recreatedIndexPattern = recreateResponse.body[SERVICE_KEY_LEGACY];
      createdIds.push(recreatedIndexPattern.id);

      // Verify all configurations are preserved (excluding version and namespaces)
      expect(recreatedIndexPattern.title).toBe(resultIndexPattern.title);
      expect(recreatedIndexPattern.fields.runtimeBar.name).toBe('runtimeBar');
      expect(recreatedIndexPattern.fieldFormats.runtimeBar.id).toBe('duration');
      expect(recreatedIndexPattern.fieldAttrs.runtimeBar.count).toBe(123);
    }
  );

  apiTest(
    'create a data view, add a runtime field, add a field formatter, then re-create the same data view',
    async ({ apiClient }) => {
      const title = `basic_index*`;

      // 1. Create the data view
      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          override: true,
          [SERVICE_KEY]: {
            title,
          },
        },
      });

      expect(createResponse.statusCode).toBe(200);
      const id = createResponse.body[SERVICE_KEY].id;

      // 2. Add a runtime field
      const runtimeFieldResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}/runtime_field`, {
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
      });

      expect(runtimeFieldResponse.statusCode).toBe(200);

      // 3. Add field attributes (customLabel and count)
      const fieldAttrsResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}/fields`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          fields: {
            runtimeBar: {
              count: 123,
              customLabel: 'test',
            },
          },
        },
      });

      expect(fieldAttrsResponse.statusCode).toBe(200);

      // 4. Add field formatter (duration format)
      const formatterResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}/fields`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          fields: {
            runtimeBar: {
              format: {
                id: 'duration',
                params: { inputFormat: 'milliseconds', outputFormat: 'humanizePrecise' },
              },
            },
          },
        },
      });

      expect(formatterResponse.statusCode).toBe(200);

      // 5. Get the data view and verify all configurations
      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse.statusCode).toBe(200);

      const resultDataView = getResponse.body[SERVICE_KEY];

      // Verify runtime field
      const runtimeField = resultDataView.fields.runtimeBar;
      expect(runtimeField.name).toBe('runtimeBar');
      expect(runtimeField.runtimeField.type).toBe('long');
      expect(runtimeField.runtimeField.script.source).toBe("emit(doc['field_name'].value)");
      expect(runtimeField.scripted).toBe(false);

      // Verify field formatter
      expect(resultDataView.fieldFormats.runtimeBar.id).toBe('duration');
      expect(resultDataView.fieldFormats.runtimeBar.params.inputFormat).toBe('milliseconds');
      expect(resultDataView.fieldFormats.runtimeBar.params.outputFormat).toBe('humanizePrecise');

      // Verify field attributes
      expect(resultDataView.fieldAttrs.runtimeBar.count).toBe(123);
      expect(resultDataView.fieldAttrs.runtimeBar.customLabel).toBe('test');

      // 6. Re-create the same data view with override: true
      const recreateResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: {
          override: true,
          [SERVICE_KEY]: resultDataView,
        },
      });

      expect(recreateResponse.statusCode).toBe(200);
      const recreatedDataView = recreateResponse.body[SERVICE_KEY];
      createdIds.push(recreatedDataView.id);

      // Verify all configurations are preserved
      expect(recreatedDataView.title).toBe(resultDataView.title);
      expect(recreatedDataView.fields.runtimeBar.name).toBe('runtimeBar');
      expect(recreatedDataView.fieldFormats.runtimeBar.id).toBe('duration');
      expect(recreatedDataView.fieldAttrs.runtimeBar.count).toBe(123);
    }
  );
});
