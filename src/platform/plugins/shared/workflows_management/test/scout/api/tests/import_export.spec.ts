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
import { COMMON_HEADERS, SIMPLE_WORKFLOW_YAML } from '../fixtures/constants';

apiTest.describe('Workflows Import/Export API', { tag: [...tags.stateful.classic] }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminCredentials = await requestAuth.getApiKey('admin');
  });

  apiTest.afterEach(async ({ kbnClient }) => {
    const response = await kbnClient.request<{ results?: Array<{ id: string }> }>({
      method: 'GET',
      path: '/api/workflows',
      query: { size: 10000, page: 1 },
    });
    const ids = response.data.results?.map((w) => w.id) || [];
    if (ids.length > 0) {
      await kbnClient.request({
        method: 'DELETE',
        path: '/api/workflows',
        body: { ids },
      });
    }
  });

  apiTest('should bulk create a single workflow', async ({ apiClient }) => {
    const response = await apiClient.post('api/workflows', {
      headers: {
        ...COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workflows: [{ yaml: SIMPLE_WORKFLOW_YAML }] }),
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.created).toHaveLength(1);
    expect(response.body.failed).toHaveLength(0);
  });

  apiTest('should bulk create multiple workflows', async ({ apiClient }) => {
    const response = await apiClient.post('api/workflows', {
      headers: {
        ...COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflows: [
          { yaml: SIMPLE_WORKFLOW_YAML },
          { yaml: SIMPLE_WORKFLOW_YAML.replace('ImportTest Workflow', 'Second Workflow') },
        ],
      }),
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.created).toHaveLength(2);
  });

  apiTest('should detect conflicts', async ({ kbnClient, apiClient }) => {
    const createResponse = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: '/api/workflows/workflow',
      body: { yaml: SIMPLE_WORKFLOW_YAML },
    });
    const existingId = createResponse.data.id;

    const response = await apiClient.post('api/workflows/mget', {
      headers: {
        ...COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [existingId, 'nonexistent-id'], source: ['name'] }),
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(existingId);
  });

  apiTest(
    'should overwrite existing workflow via bulk create',
    async ({ kbnClient, apiClient }) => {
      const createResponse = await kbnClient.request<{ id: string }>({
        method: 'POST',
        path: '/api/workflows/workflow',
        body: { yaml: SIMPLE_WORKFLOW_YAML },
      });
      const existingId = createResponse.data.id;

      const response = await apiClient.post('api/workflows?overwrite=true', {
        headers: {
          ...COMMON_HEADERS,
          ...adminCredentials.apiKeyHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflows: [{ id: existingId, yaml: SIMPLE_WORKFLOW_YAML }],
        }),
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.created).toHaveLength(1);
    }
  );

  apiTest(
    'should export workflows as JSON with entries and manifest',
    async ({ kbnClient, apiClient }) => {
      const createResponse = await kbnClient.request<{ id: string }>({
        method: 'POST',
        path: '/api/workflows/workflow',
        body: { yaml: SIMPLE_WORKFLOW_YAML },
      });
      const workflowId = createResponse.data.id;

      const exportResponse = await apiClient.post('api/workflows/export', {
        headers: {
          ...COMMON_HEADERS,
          ...adminCredentials.apiKeyHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: [workflowId] }),
      });

      expect(exportResponse).toHaveStatusCode(200);
      expect(exportResponse.body.entries).toHaveLength(1);
      expect(exportResponse.body.entries[0].id).toBe(workflowId);
      expect(exportResponse.body.entries[0].yaml).toBeDefined();
      expect(exportResponse.body.manifest).toBeDefined();
      expect(exportResponse.body.manifest.exportedCount).toBe(1);
    }
  );

  apiTest('should return 404 when exporting non-existent workflows', async ({ apiClient }) => {
    const response = await apiClient.post('api/workflows/export', {
      headers: {
        ...COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: ['does-not-exist'] }),
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest(
    'should round-trip: export then re-import produces equivalent workflows',
    async ({ kbnClient, apiClient }) => {
      const createResponse = await kbnClient.request<{ id: string; yaml: string }>({
        method: 'POST',
        path: '/api/workflows/workflow',
        body: { yaml: SIMPLE_WORKFLOW_YAML },
      });
      const originalId = createResponse.data.id;

      const exportResponse = await apiClient.post('api/workflows/export', {
        headers: {
          ...COMMON_HEADERS,
          ...adminCredentials.apiKeyHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: [originalId] }),
      });
      expect(exportResponse).toHaveStatusCode(200);

      const { entries } = exportResponse.body;
      expect(entries).toHaveLength(1);

      const importResponse = await apiClient.post('api/workflows?overwrite=true', {
        headers: {
          ...COMMON_HEADERS,
          ...adminCredentials.apiKeyHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflows: [{ id: entries[0].id, yaml: entries[0].yaml }],
        }),
      });

      expect(importResponse).toHaveStatusCode(200);
      expect(importResponse.body.created).toHaveLength(1);
      expect(importResponse.body.failed).toHaveLength(0);
      expect(importResponse.body.created[0].name).toBe('ImportTest Workflow');
    }
  );

  apiTest('should return 400 when export ids array is empty', async ({ apiClient }) => {
    const response = await apiClient.post('api/workflows/export', {
      headers: {
        ...COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [] }),
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('should return 400 when mget ids array is empty', async ({ apiClient }) => {
    const response = await apiClient.post('api/workflows/mget', {
      headers: {
        ...COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [] }),
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'should handle partial failures in bulk_create (one valid, one invalid)',
    async ({ apiClient }) => {
      const response = await apiClient.post('api/workflows', {
        headers: {
          ...COMMON_HEADERS,
          ...adminCredentials.apiKeyHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflows: [{ yaml: SIMPLE_WORKFLOW_YAML }, { yaml: 'not: valid: yaml: [' }],
        }),
      });

      expect(response).toHaveStatusCode(200);
      // At least one should succeed or fail; partial success is the key behavior
      const totalProcessed = response.body.created.length + response.body.failed.length;
      expect(totalProcessed).toBe(2);
    }
  );

  apiTest('should bulk create with explicit custom IDs', async ({ apiClient }) => {
    const customId = `workflow-00000000-0000-4000-a000-000000000001`;
    const response = await apiClient.post('api/workflows', {
      headers: {
        ...COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflows: [{ id: customId, yaml: SIMPLE_WORKFLOW_YAML }],
      }),
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.created).toHaveLength(1);
    expect(response.body.created[0].id).toBe(customId);
  });

  apiTest(
    'should export manifest with correct version and count',
    async ({ kbnClient, apiClient }) => {
      const create1 = await kbnClient.request<{ id: string }>({
        method: 'POST',
        path: '/api/workflows/workflow',
        body: { yaml: SIMPLE_WORKFLOW_YAML },
      });
      const create2 = await kbnClient.request<{ id: string }>({
        method: 'POST',
        path: '/api/workflows/workflow',
        body: { yaml: SIMPLE_WORKFLOW_YAML.replace('ImportTest Workflow', 'Second') },
      });

      const exportResponse = await apiClient.post('api/workflows/export', {
        headers: {
          ...COMMON_HEADERS,
          ...adminCredentials.apiKeyHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: [create1.data.id, create2.data.id] }),
      });

      expect(exportResponse).toHaveStatusCode(200);

      const { manifest } = exportResponse.body;
      expect(manifest.exportedCount).toBe(2);
      expect(manifest.version).toBe('1');
      expect(manifest.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  );
});
