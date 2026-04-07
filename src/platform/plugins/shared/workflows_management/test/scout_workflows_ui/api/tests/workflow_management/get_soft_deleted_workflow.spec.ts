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
name: Soft Delete Test Workflow
enabled: false
description: Used for soft delete visibility tests
triggers:
  - type: manual
steps:
  - name: log_step
    type: console
    with:
      message: "hello"
`;

const ENABLED_WORKFLOW_YAML = `
name: Soft Delete Run Test Workflow
enabled: true
description: Used for soft delete run tests
triggers:
  - type: manual
steps:
  - name: log_step
    type: console
    with:
      message: "hello"
`;

spaceTest.describe(
  'GET workflow should not return soft-deleted workflows',
  { tag: tags.deploymentAgnostic },
  () => {
    let workflowsApi: WorkflowsApiService;

    spaceTest.beforeAll(async ({ apiServices }) => {
      workflowsApi = apiServices.workflowsApi;
    });

    spaceTest.afterEach(async () => {
      await workflowsApi.deleteAll();
    });

    spaceTest('GET by ID should return 404 for a soft-deleted workflow', async () => {
      const created = await workflowsApi.create(WORKFLOW_YAML);

      const beforeDelete = await workflowsApi.rawGetWorkflow(created.id);
      expect(beforeDelete.status).toBe(200);
      expect(beforeDelete.data.id).toBe(created.id);

      await workflowsApi.bulkDelete([created.id]);

      const afterDelete = await workflowsApi.rawGetWorkflow(created.id);
      expect(afterDelete.status).toBe(404);
    });

    spaceTest('list endpoint should not include soft-deleted workflows', async () => {
      const created = await workflowsApi.create(WORKFLOW_YAML);

      const listBefore = await workflowsApi.list();
      expect(listBefore.results.map((w) => w.id)).toContain(created.id);

      await workflowsApi.bulkDelete([created.id]);

      const listAfter = await workflowsApi.list();
      expect(listAfter.results.map((w) => w.id)).not.toContain(created.id);
    });

    spaceTest('POST run should return 404 for a soft-deleted workflow', async () => {
      const created = await workflowsApi.create(ENABLED_WORKFLOW_YAML);

      await workflowsApi.bulkDelete([created.id]);

      const runResult = await workflowsApi.rawRun(created.id, {});
      expect(runResult.status).toBe(404);
    });
  }
);
