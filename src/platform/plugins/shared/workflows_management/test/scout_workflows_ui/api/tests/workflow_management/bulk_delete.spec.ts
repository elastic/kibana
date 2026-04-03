/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { WorkflowsApiService } from '../../../common/apis/workflows';
import { spaceTest } from '../../fixtures';

const WORKFLOW_YAML = `
name: Bulk Delete Test Workflow
enabled: false
description: Used for bulk delete API tests
triggers:
  - type: manual
steps:
  - name: log_step
    type: console
    with:
      message: "hello"
`;

spaceTest.describe('Bulk delete workflows API', { tag: tags.deploymentAgnostic }, () => {
  let workflowsApi: WorkflowsApiService;

  spaceTest.beforeAll(async ({ apiServices }) => {
    workflowsApi = apiServices.workflowsApi;
  });

  spaceTest.afterEach(async () => {
    await workflowsApi.deleteAll();
  });

  spaceTest(
    'should partially succeed when deleting a mix of existing and non-existent IDs',
    async () => {
      const created = await workflowsApi.create(WORKFLOW_YAML);

      const response = await workflowsApi.rawBulkDelete([created.id, 'non-existent-id']);

      expect(response.status).toBe(200);
      expect(response.data.total).toBe(2);
      expect(response.data.deleted).toBeGreaterThan(0);
      expect(response.data.failures).toHaveLength(0);

      const listed = await workflowsApi.list();
      const ids = listed.results.map((w) => w.id);
      expect(ids).not.toContain(created.id);
    }
  );

  spaceTest('should succeed when all IDs exist', async () => {
    const created1 = await workflowsApi.create(WORKFLOW_YAML);
    const created2 = await workflowsApi.create(
      WORKFLOW_YAML.replace('Bulk Delete Test Workflow', 'Second Workflow')
    );

    const response = await workflowsApi.rawBulkDelete([created1.id, created2.id]);

    expect(response.status).toBe(200);
    expect(response.data.total).toBe(2);
    expect(response.data.deleted).toBe(2);
    expect(response.data.failures).toHaveLength(0);

    const listed = await workflowsApi.list();
    const ids = listed.results.map((w) => w.id);
    expect(ids).not.toContain(created1.id);
    expect(ids).not.toContain(created2.id);
  });

  spaceTest('should succeed when all IDs are non-existent', async () => {
    const response = await workflowsApi.rawBulkDelete(['non-existent-id-1', 'non-existent-id-2']);

    expect(response.status).toBe(200);
    expect(response.data.total).toBe(2);
    expect(response.data.deleted).toBe(0);
    expect(response.data.failures).toHaveLength(0);
  });
});
