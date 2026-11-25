/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

apiTest.describe('data.search.searchSource contract', { tag: '@local-stateful-classic' }, () => {
  const spaceId = `search-source-${randomUUID()}`;
  const route = `/s/${spaceId}/api/data_search_plugin/search_source`;
  let headers: Record<string, string>;

  apiTest.beforeAll(async ({ apiServices, esArchiver, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKey('viewer');
    headers = {
      ...apiKeyHeader,
      'kbn-xsrf': 'scout',
      'x-elastic-internal-origin': 'kibana',
    };
    await apiServices.spaces.create({ id: spaceId });

    // Retain this shared, read-only archive for other Scout suites using loadIfNeeded.
    await esArchiver.loadIfNeeded(
      'src/platform/test/functional/fixtures/es_archiver/getting_started/shakespeare'
    );
    // The fixture route selects the first data view, so its space must contain exactly one.
    await apiServices.dataViews.create({ title: 'shakespeare', spaceId });
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(spaceId);
  });

  apiTest('asScoped()', async ({ apiClient }) => {
    const response = await apiClient.get(`${route}/as_scoped`, { headers });
    expect(response).toHaveStatusCode(200);
  });

  apiTest('createEmpty()', async ({ apiClient }) => {
    const response = await apiClient.get(`${route}/create_empty`, { headers });
    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ searchSourceJSON: '{}', references: [] });
  });

  apiTest('create()', async ({ apiClient }) => {
    const searchSourceFields = {
      highlightAll: true,
      index: '',
      query: {
        language: 'kuery',
        query: 'play_name:\\"Henry IV\\"',
      },
      version: true,
    };
    const response = await apiClient.post(`${route}/create`, {
      headers,
      body: searchSourceFields,
    });
    expect(response).toHaveStatusCode(200);
    expect(Object.keys(response.body)).toStrictEqual(['searchSourceJSON', 'references']);

    const {
      searchSourceJSON,
      references,
    }: {
      searchSourceJSON: string;
      references: Array<{ type: string; name: string }>;
    } = response.body;
    const searchSource: { query: typeof searchSourceFields.query; indexRefName: string } =
      JSON.parse(searchSourceJSON);
    expect(searchSource.query).toStrictEqual(searchSourceFields.query);
    expect(references[0].type).toBe('index-pattern');
    expect(searchSource.indexRefName).toBe(references[0].name);
  });
});
