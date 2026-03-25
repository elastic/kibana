/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import AdmZip from 'adm-zip';
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

  apiTest('should export workflows as a ZIP archive', async ({ kbnClient, apiClient }) => {
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
      responseType: 'buffer',
      body: JSON.stringify({ ids: [workflowId] }),
    });

    expect(exportResponse).toHaveStatusCode(200);

    const zipBuffer = exportResponse.body as Buffer;
    const zip = new AdmZip(zipBuffer);
    const entryNames = zip.getEntries().map((e) => e.entryName);
    expect(entryNames.some((n) => n.endsWith('.yml'))).toBe(true);
    expect(entryNames).toContain('manifest.yml');
  });

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
        responseType: 'buffer',
        body: JSON.stringify({ ids: [originalId] }),
      });
      expect(exportResponse).toHaveStatusCode(200);

      const zipBuffer = exportResponse.body as Buffer;
      const zip = new AdmZip(zipBuffer);
      const workflowEntries = zip
        .getEntries()
        .filter((e) => e.entryName.endsWith('.yml') && e.entryName !== 'manifest.yml');
      expect(workflowEntries).toHaveLength(1);

      const reImportedYaml = workflowEntries[0].getData().toString('utf-8');
      const reImportedId = workflowEntries[0].entryName.replace('.yml', '');

      const importResponse = await apiClient.post('api/workflows?overwrite=true', {
        headers: {
          ...COMMON_HEADERS,
          ...adminCredentials.apiKeyHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflows: [{ id: reImportedId, yaml: reImportedYaml }],
        }),
      });

      expect(importResponse).toHaveStatusCode(200);
      expect(importResponse.body.created).toHaveLength(1);
      expect(importResponse.body.failed).toHaveLength(0);
      expect(importResponse.body.created[0].name).toBe('ImportTest Workflow');
    }
  );
});
