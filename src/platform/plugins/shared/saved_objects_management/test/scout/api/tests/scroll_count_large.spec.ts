/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import FormData from 'form-data';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const { MANAGEMENT_API } = testData;

const IMPORT_TIMEOUT = 120_000;

function generateVisualizationNdjson(startIdx: number, endIdx: number): string {
  const lines: string[] = [];
  for (let i = startIdx; i <= endIdx; i++) {
    lines.push(
      JSON.stringify({
        type: 'visualization',
        id: `test-vis-${i}`,
        attributes: {
          title: `My visualization (${i})`,
          uiStateJSON: '{}',
          visState: '{}',
        },
        references: [],
      })
    );
  }
  return lines.join('\n');
}

apiTest.describe('scroll_count - more than 10k objects', { tag: tags.deploymentAgnostic }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, apiClient }) => {
    apiTest.setTimeout(IMPORT_TIMEOUT);
    adminCredentials = await requestAuth.getApiKey('admin');

    const BATCH_SIZE = 1_000;
    const TOTAL_OBJECTS = 12_000;

    for (let batchStart = 1; batchStart <= TOTAL_OBJECTS; batchStart += BATCH_SIZE) {
      const batchEnd = batchStart + BATCH_SIZE - 1;
      const ndjson = generateVisualizationNdjson(batchStart, batchEnd);
      const formData = new FormData();
      formData.append('file', ndjson, 'export.ndjson');

      const response = await apiClient.post(MANAGEMENT_API.IMPORT, {
        headers: {
          ...adminCredentials.apiKeyHeader,
          ...testData.COMMON_HEADERS,
          ...formData.getHeaders(),
        },
        body: formData.getBuffer(),
      });
      expect(response).toHaveStatusCode(200);
    }
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    apiTest.setTimeout(IMPORT_TIMEOUT);
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('returns the correct count for each included types', async ({ apiClient }) => {
    const response = await apiClient.post(MANAGEMENT_API.SCROLL_COUNT, {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      body: { typesToInclude: ['visualization'] },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ visualization: 12000 });
  });
});
