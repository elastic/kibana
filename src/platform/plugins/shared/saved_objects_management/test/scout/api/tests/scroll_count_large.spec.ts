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

const BATCH_SIZE = 1_000;
const TOTAL_OBJECTS = 12_000;
const CONCURRENCY = 3;

// Generous timeout: 4 concurrent-batch rounds at worst-case ~60 s each = ~240 s.
const HOOK_TIMEOUT = 300_000;

function generateVisualizationNdjson(startIdx: number, endIdx: number): string {
  return Array.from({ length: endIdx - startIdx + 1 }, (_, i) => {
    const idx = startIdx + i;
    return JSON.stringify({
      type: 'visualization',
      id: `test-vis-${idx}`,
      attributes: {
        title: `My visualization (${idx})`,
        uiStateJSON: '{}',
        visState: '{}',
      },
      references: [],
    });
  }).join('\n');
}

apiTest.describe('scroll_count - more than 10k objects', { tag: tags.deploymentAgnostic }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, apiClient }) => {
    apiTest.setTimeout(HOOK_TIMEOUT);
    adminCredentials = await requestAuth.getApiKey('admin');

    const batches = Array.from(
      { length: Math.ceil(TOTAL_OBJECTS / BATCH_SIZE) },
      (_, i): [number, number] => [
        i * BATCH_SIZE + 1,
        Math.min((i + 1) * BATCH_SIZE, TOTAL_OBJECTS),
      ]
    );

    // Run CONCURRENCY batches at a time to reduce total import wall-clock time on ECH,
    // while keeping each individual request small enough to avoid HAProxy per-request
    // timeout limits (~60 s). Each round of CONCURRENCY batches is awaited before
    // starting the next, so at most CONCURRENCY requests are in-flight simultaneously.
    for (let i = 0; i < batches.length; i += CONCURRENCY) {
      await Promise.all(
        batches.slice(i, i + CONCURRENCY).map(async ([start, end]) => {
          const ndjson = generateVisualizationNdjson(start, end);
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
        })
      );
    }
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    apiTest.setTimeout(HOOK_TIMEOUT);
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
