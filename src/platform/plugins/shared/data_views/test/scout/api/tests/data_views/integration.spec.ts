/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { apiTest, tags, type RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  COMMON_HEADERS,
  DATA_VIEW_PATH,
  ES_ARCHIVE_BASIC_INDEX,
  SERVICE_KEY,
} from '../../fixtures/constants';

apiTest.describe('data views integration (data view api)', { tag: tags.deploymentAgnostic }, () => {
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

  apiTest(
    'create a data view, add a runtime field, add a field formatter, then re-create the same data view',
    async ({ apiClient }) => {
      const title = `basic_index*`;

      const createResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          override: true,
          [SERVICE_KEY]: { title },
        },
      });

      expect(createResponse).toHaveStatusCode(200);
      const id = createResponse.body[SERVICE_KEY].id;
      // Track immediately so cleanup runs even if the test fails before the recreate step.
      createdIds.push(id);

      const runtimeFieldResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}/runtime_field`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          name: 'runtimeBar',
          runtimeField: {
            type: 'long',
            script: { source: "emit(doc['field_name'].value)" },
          },
        },
      });

      expect(runtimeFieldResponse).toHaveStatusCode(200);

      const fieldAttrsResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}/fields`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          fields: {
            runtimeBar: { count: 123, customLabel: 'test' },
          },
        },
      });

      expect(fieldAttrsResponse).toHaveStatusCode(200);

      const formatterResponse = await apiClient.post(`${DATA_VIEW_PATH}/${id}/fields`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
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

      expect(formatterResponse).toHaveStatusCode(200);

      const getResponse = await apiClient.get(`${DATA_VIEW_PATH}/${id}`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);

      const resultDataView = getResponse.body[SERVICE_KEY];

      const runtimeField = resultDataView.fields.runtimeBar;
      expect(runtimeField.name).toBe('runtimeBar');
      expect(runtimeField.runtimeField.type).toBe('long');
      expect(runtimeField.runtimeField.script.source).toBe("emit(doc['field_name'].value)");
      expect(runtimeField.scripted).toBe(false);

      expect(resultDataView.fieldFormats.runtimeBar.id).toBe('duration');
      expect(resultDataView.fieldFormats.runtimeBar.params.inputFormat).toBe('milliseconds');
      expect(resultDataView.fieldFormats.runtimeBar.params.outputFormat).toBe('humanizePrecise');

      expect(resultDataView.fieldAttrs.runtimeBar.count).toBe(123);
      expect(resultDataView.fieldAttrs.runtimeBar.customLabel).toBe('test');

      const recreateResponse = await apiClient.post(DATA_VIEW_PATH, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        responseType: 'json',
        body: {
          override: true,
          [SERVICE_KEY]: resultDataView,
        },
      });

      expect(recreateResponse).toHaveStatusCode(200);
      const recreatedDataView = recreateResponse.body[SERVICE_KEY];
      // `override: true` reuses the same id, so the original push above already covers cleanup.

      // The retrieved object should be transient, so a clone re-created from it should
      // match the original (ignoring `version`/`namespaces` which are assigned server-side).
      expect(omit(recreatedDataView, ['version', 'namespaces'])).toStrictEqual(
        omit(resultDataView, ['version', 'namespaces'])
      );
    }
  );
});
