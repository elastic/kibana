/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const { MANAGEMENT_API } = testData;

const TOTAL_OBJECTS = 12_000;
const HOOK_TIMEOUT = 120_000;

// Visualization saved objects are stored in the dedicated analytics index.
// This matches the ANALYTICS_SAVED_OBJECT_INDEX constant from @kbn/core-saved-objects-server.
const ANALYTICS_INDEX = '.kibana_analytics';

apiTest.describe('scroll_count - more than 10k objects', { tag: tags.deploymentAgnostic }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ esClient, requestAuth }) => {
    apiTest.setTimeout(HOOK_TIMEOUT);
    adminCredentials = await requestAuth.getApiKey('admin');

    const now = new Date().toISOString();

    // Bulk-insert visualization saved objects directly into Elasticsearch,
    // bypassing the Kibana import API which is subject to per-request HAProxy
    // client-timeout constraints on ECH (typically ~60 s). The esClient connects
    // to the ES endpoint directly, so it is not affected by that proxy limit.
    const operations = Array.from({ length: TOTAL_OBJECTS }, (_, i) => {
      const idx = i + 1;
      return [
        { index: { _index: ANALYTICS_INDEX, _id: `visualization:test-vis-${idx}` } },
        {
          type: 'visualization',
          visualization: { title: `My visualization (${idx})`, uiStateJSON: '{}', visState: '{}' },
          references: [] as never[],
          namespaces: ['default'],
          updated_at: now,
          created_at: now,
          managed: false,
          coreMigrationVersion: '8.8.0',
          typeMigrationVersion: '8.3.0',
        },
      ];
    }).flat();

    const { errors, items } = await esClient.bulk({ operations, refresh: true });
    if (errors) {
      const firstError = items.find((item) => item.index?.error)?.index?.error;
      throw new Error(`Bulk insert failed: ${JSON.stringify(firstError)}`);
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
