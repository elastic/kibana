/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS } from '../fixtures/constants';

const INDEX_NAME = 'test-index-1';
const ALIAS_NAME = 'test-alias-1';
const INDEX_TEMPLATE_NAME = 'test-index-template-1';
const COMPONENT_TEMPLATE_NAME = 'test-component-template-1';
const DATA_STREAM_NAME = 'test-data-stream-1';

const AUTOCOMPLETE_API = 'api/console/autocomplete_entities';

const toQueryString = (query: Record<string, unknown>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    params.set(key, String(value));
  }
  return params.toString();
};

apiTest.describe(
  'GET /api/console/autocomplete_entities',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.security.complete,
      ...tags.serverless.observability.complete,
      ...tags.serverless.search,
    ],
  },
  () => {
    let credentials: RoleApiCredentials;
    let requestOptions: { headers: Record<string, string>; responseType: 'json' };

    apiTest.beforeAll(async ({ esClient, requestAuth }) => {
      credentials = await requestAuth.getApiKey('admin');
      requestOptions = {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
      };

      await esClient.indices.create({
        index: INDEX_NAME,
        mappings: { properties: { foo: { type: 'text' } } },
      });
      await esClient.indices.putAlias({ index: INDEX_NAME, name: ALIAS_NAME });
      await esClient.cluster.putComponentTemplate({
        name: COMPONENT_TEMPLATE_NAME,
        template: {
          mappings: {
            properties: {
              '@timestamp': { type: 'date', format: 'date_optional_time||epoch_millis' },
              message: { type: 'wildcard' },
            },
          },
        },
      });
      await esClient.indices.putIndexTemplate({
        name: INDEX_TEMPLATE_NAME,
        index_patterns: [DATA_STREAM_NAME],
        data_stream: {},
        composed_of: [COMPONENT_TEMPLATE_NAME],
        priority: 500,
      });
      await esClient.indices.createDataStream({ name: DATA_STREAM_NAME });
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.indices.deleteAlias(
        { index: INDEX_NAME, name: ALIAS_NAME },
        { ignore: [404] }
      );
      await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
      await esClient.indices.deleteDataStream({ name: DATA_STREAM_NAME }, { ignore: [404] });
      await esClient.indices.deleteIndexTemplate({ name: INDEX_TEMPLATE_NAME }, { ignore: [404] });
      await esClient.cluster.deleteComponentTemplate(
        { name: COMPONENT_TEMPLATE_NAME },
        { ignore: [404] }
      );
    });

    apiTest('returns 400 when no settings are provided', async ({ apiClient }) => {
      const response = await apiClient.get(AUTOCOMPLETE_API, requestOptions);
      expect(response).toHaveStatusCode(400);
    });

    apiTest(
      'returns all entity categories when all settings are enabled',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `${AUTOCOMPLETE_API}?${toQueryString({
            indices: true,
            fields: true,
            templates: true,
            dataStreams: true,
          })}`,
          requestOptions
        );

        expect(response).toHaveStatusCode(200);
        expect(Object.keys(response.body).sort()).toStrictEqual([
          'aliases',
          'componentTemplates',
          'dataStreams',
          'indexTemplates',
          'legacyTemplates',
          'mappings',
        ]);
      }
    );

    apiTest('returns empty payload when all settings are disabled', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${AUTOCOMPLETE_API}?${toQueryString({
          indices: false,
          fields: false,
          templates: false,
          dataStreams: false,
        })}`,
        requestOptions
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.legacyTemplates).toStrictEqual({});
      expect(response.body.indexTemplates).toStrictEqual({});
      expect(response.body.componentTemplates).toStrictEqual({});
      expect(response.body.aliases).toStrictEqual({});
      expect(response.body.mappings).toStrictEqual({});
      expect(response.body.dataStreams).toStrictEqual({});
    });

    apiTest('returns empty templates when templates setting is disabled', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${AUTOCOMPLETE_API}?${toQueryString({ templates: false })}`,
        requestOptions
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.legacyTemplates).toStrictEqual({});
      expect(response.body.indexTemplates).toStrictEqual({});
      expect(response.body.componentTemplates).toStrictEqual({});
    });

    apiTest(
      'returns empty data streams when dataStreams setting is disabled',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `${AUTOCOMPLETE_API}?${toQueryString({ dataStreams: false })}`,
          requestOptions
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.dataStreams).toStrictEqual({});
      }
    );

    apiTest('returns empty aliases when indices setting is disabled', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${AUTOCOMPLETE_API}?${toQueryString({ indices: false })}`,
        requestOptions
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.aliases).toStrictEqual({});
    });

    apiTest('returns empty mappings when fields setting is disabled', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${AUTOCOMPLETE_API}?${toQueryString({ fields: false })}`,
        requestOptions
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.mappings).toStrictEqual({});
    });

    apiTest(
      'does not return mappings for test index when fieldsIndices is not specified',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `${AUTOCOMPLETE_API}?${toQueryString({ fields: true })}`,
          requestOptions
        );

        expect(response).toHaveStatusCode(200);
        expect(Object.keys(response.body.mappings)).not.toContain(INDEX_NAME);
      }
    );

    apiTest(
      'returns mappings for test index when fieldsIndices is specified',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `${AUTOCOMPLETE_API}?${toQueryString({ fields: true, fieldsIndices: INDEX_NAME })}`,
          requestOptions
        );

        expect(response).toHaveStatusCode(200);
        expect(Object.keys(response.body.mappings)).toContain(INDEX_NAME);
      }
    );

    apiTest('returns aliases when indices setting is enabled', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${AUTOCOMPLETE_API}?${toQueryString({ indices: true })}`,
        requestOptions
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.aliases[INDEX_NAME].aliases).toStrictEqual({ [ALIAS_NAME]: {} });
    });

    apiTest('returns data streams when dataStreams setting is enabled', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${AUTOCOMPLETE_API}?${toQueryString({ dataStreams: true })}`,
        requestOptions
      );

      expect(response).toHaveStatusCode(200);
      const dataStreamNames = response.body.dataStreams.data_streams.map(
        (ds: { name: string }) => ds.name
      );
      expect(dataStreamNames).toContain(DATA_STREAM_NAME);
    });

    apiTest(
      'returns index and component templates when templates setting is enabled',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `${AUTOCOMPLETE_API}?${toQueryString({ templates: true })}`,
          requestOptions
        );

        expect(response).toHaveStatusCode(200);
        const indexTemplateNames = response.body.indexTemplates.index_templates.map(
          (it: { name: string }) => it.name
        );
        expect(indexTemplateNames).toContain(INDEX_TEMPLATE_NAME);
        const componentTemplateNames = response.body.componentTemplates.component_templates.map(
          (ct: { name: string }) => ct.name
        );
        expect(componentTemplateNames).toContain(COMPONENT_TEMPLATE_NAME);
      }
    );
  }
);
