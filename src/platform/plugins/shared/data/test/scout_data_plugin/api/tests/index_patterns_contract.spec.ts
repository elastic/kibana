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

apiTest.describe('data.indexPatterns contract', { tag: '@local-stateful-classic' }, () => {
  const spaceId = `index-patterns-contract-${randomUUID()}`;
  const route = `/s/${spaceId}/api/index-patterns-plugin`;
  let headers: Record<string, string>;

  apiTest.beforeAll(async ({ apiServices, esArchiver, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKey('editor');
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
  });

  apiTest.afterAll(async ({ apiServices }) => {
    // Deleting the owned space also cleans up a data view left by a failed CRUD step.
    await apiServices.spaces.delete(spaceId);
  });

  apiTest('creates, gets, updates, and deletes an index pattern', async ({ apiClient }) => {
    const indexPatternId = await apiTest.step('can create an index pattern', async () => {
      const title = 'shakes*';
      const fieldFormats = { bytes: { id: 'bytes' } };
      const response = await apiClient.post(`${route}/create`, {
        headers,
        body: { title, fieldFormats },
      });
      expect(response).toHaveStatusCode(200);
      expect(typeof response.body.id).toBe('string');
      expect(response.body.title).toBe(title);
      expect(response.body.id).not.toBe('');
      expect(response.body.fields).toHaveLength(15);
      expect(response.body.fieldFormatMap).toStrictEqual(fieldFormats);
      const { id }: { id: string } = response.body;
      return id;
    });

    await apiTest.step('can get index pattern by id', async () => {
      const response = await apiClient.get(`${route}/get/${indexPatternId}`, { headers });
      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe(indexPatternId);
    });

    await apiTest.step('can update index pattern', async () => {
      // The fixture calls updateSavedObject on the existing object without changing its fields.
      const response = await apiClient.get(`${route}/update/${indexPatternId}`, { headers });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({});
    });

    await apiTest.step('can delete index pattern', async () => {
      const response = await apiClient.get(`${route}/delete/${indexPatternId}`, { headers });
      expect(response).toHaveStatusCode(200);
    });
  });
});
