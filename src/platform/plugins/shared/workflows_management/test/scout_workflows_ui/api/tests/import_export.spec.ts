/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import AdmZip from 'adm-zip';
import YAML from 'yaml';
import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS, SIMPLE_WORKFLOW_YAML } from '../fixtures/constants';
import { prepareImportFormData } from '../fixtures/helpers';

async function buildTestZip(workflows: Array<{ id: string; yaml: string }>): Promise<Buffer> {
  const zip = new AdmZip();
  for (const w of workflows) {
    zip.addFile(`${w.id}.yml`, Buffer.from(w.yaml, 'utf-8'));
  }
  const manifest = YAML.stringify({
    exportedCount: workflows.length,
    exportedAt: new Date().toISOString(),
    version: '1',
  });
  zip.addFile('manifest.yml', Buffer.from(manifest, 'utf-8'));
  return zip.toBufferPromise();
}

apiTest.describe('Workflows Import/Export API', { tag: [...tags.stateful.classic] }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminCredentials = await requestAuth.getApiKey('admin');
  });

  apiTest.afterEach(async ({ kbnClient }) => {
    const response = await kbnClient.request<{ results?: Array<{ id: string }> }>({
      method: 'POST',
      path: '/api/workflows/search',
      body: { size: 10000, page: 1 },
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

  apiTest('should import a single YAML workflow', async ({ apiClient }) => {
    const { buffer, headers } = prepareImportFormData(SIMPLE_WORKFLOW_YAML, 'test.yml');

    const response = await apiClient.post('api/workflows/_import', {
      headers: {
        ...COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
        ...headers,
      },
      body: buffer,
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.created).toHaveLength(1);
    expect(response.body.failed).toHaveLength(0);
  });

  apiTest('should import ZIP with multiple workflows', async ({ apiClient }) => {
    const zipBuffer = await buildTestZip([
      { id: `import-w1-${Date.now()}`, yaml: SIMPLE_WORKFLOW_YAML },
      {
        id: `import-w2-${Date.now()}`,
        yaml: SIMPLE_WORKFLOW_YAML.replace('ImportTest Workflow', 'Second Workflow'),
      },
    ]);
    const { buffer, headers } = prepareImportFormData(zipBuffer, 'workflows.zip');

    const response = await apiClient.post('api/workflows/_import', {
      headers: {
        ...COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
        ...headers,
      },
      body: buffer,
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.created).toHaveLength(2);
  });

  apiTest('should detect conflicts via preflight endpoint', async ({ kbnClient, apiClient }) => {
    const createResponse = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: '/api/workflows',
      body: { yaml: SIMPLE_WORKFLOW_YAML },
    });
    const existingId = createResponse.data.id;

    const zipBuffer = await buildTestZip([{ id: existingId, yaml: SIMPLE_WORKFLOW_YAML }]);
    const { buffer, headers } = prepareImportFormData(zipBuffer, 'conflicts.zip');

    const response = await apiClient.post('api/workflows/_import/preflight', {
      headers: {
        ...COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
        ...headers,
      },
      body: buffer,
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.format).toBe('zip');
    expect(response.body.conflicts).toHaveLength(1);
    expect(response.body.conflicts[0].id).toBe(existingId);
  });

  apiTest('should resolve conflicts with overwrite', async ({ kbnClient, apiClient }) => {
    const createResponse = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: '/api/workflows',
      body: { yaml: SIMPLE_WORKFLOW_YAML },
    });
    const existingId = createResponse.data.id;

    const zipBuffer = await buildTestZip([{ id: existingId, yaml: SIMPLE_WORKFLOW_YAML }]);
    const { buffer, headers } = prepareImportFormData(zipBuffer, 'overwrite.zip');

    const response = await apiClient.post('api/workflows/_import?overwrite=true', {
      headers: {
        ...COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
        ...headers,
      },
      body: buffer,
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.created).toHaveLength(1);
  });

  apiTest(
    'should generate new IDs when generateNewIds is set',
    async ({ kbnClient, apiClient }) => {
      const createResponse = await kbnClient.request<{ id: string }>({
        method: 'POST',
        path: '/api/workflows',
        body: { yaml: SIMPLE_WORKFLOW_YAML },
      });
      const existingId = createResponse.data.id;

      const zipBuffer = await buildTestZip([{ id: existingId, yaml: SIMPLE_WORKFLOW_YAML }]);
      const { buffer, headers } = prepareImportFormData(zipBuffer, 'newids.zip');

      const response = await apiClient.post('api/workflows/_import?generateNewIds=true', {
        headers: {
          ...COMMON_HEADERS,
          ...adminCredentials.apiKeyHeader,
          ...headers,
        },
        body: buffer,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.created).toHaveLength(1);
      expect(response.body.created[0].id).not.toBe(existingId);
    }
  );

  apiTest(
    'should reject when both overwrite and generateNewIds are true',
    async ({ apiClient }) => {
      const { buffer, headers } = prepareImportFormData(SIMPLE_WORKFLOW_YAML, 'test.yml');

      const response = await apiClient.post(
        'api/workflows/_import?overwrite=true&generateNewIds=true',
        {
          headers: {
            ...COMMON_HEADERS,
            ...adminCredentials.apiKeyHeader,
            ...headers,
          },
          body: buffer,
        }
      );

      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest('should reject empty file', async ({ apiClient }) => {
    const { buffer, headers } = prepareImportFormData('   ', 'empty.yml');

    const response = await apiClient.post('api/workflows/_import', {
      headers: {
        ...COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
        ...headers,
      },
      body: buffer,
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('should detect YAML format via preflight', async ({ apiClient }) => {
    const { buffer, headers } = prepareImportFormData(SIMPLE_WORKFLOW_YAML, 'test.yml');

    const response = await apiClient.post('api/workflows/_import/preflight', {
      headers: {
        ...COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
        ...headers,
      },
      body: buffer,
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.format).toBe('yaml');
    expect(response.body.totalWorkflows).toBe(1);
  });

  apiTest(
    'should export workflows via export endpoint and re-import',
    async ({ kbnClient, apiClient }) => {
      const createResponse = await kbnClient.request<{ id: string; yaml: string }>({
        method: 'POST',
        path: '/api/workflows',
        body: { yaml: SIMPLE_WORKFLOW_YAML },
      });
      const original = createResponse.data;

      const exportResponse = await apiClient.post('api/workflows/_export', {
        headers: {
          ...COMMON_HEADERS,
          ...adminCredentials.apiKeyHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: [original.id] }),
      });

      expect(exportResponse).toHaveStatusCode(200);

      const exportedZip = Buffer.from(exportResponse.body as unknown as string, 'binary');
      const { buffer, headers } = prepareImportFormData(exportedZip, 'roundtrip.zip');

      const importResponse = await apiClient.post('api/workflows/_import?generateNewIds=true', {
        headers: {
          ...COMMON_HEADERS,
          ...adminCredentials.apiKeyHeader,
          ...headers,
        },
        body: buffer,
      });

      expect(importResponse).toHaveStatusCode(200);
      expect(importResponse.body.created).toHaveLength(1);
      expect(importResponse.body.created[0].id).not.toBe(original.id);
    }
  );
});
