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

const SIMPLE_WORKFLOW_YAML = `name: Scout API Availability Test
description: Simple workflow to verify API availability
enabled: false
triggers:
  - type: manual
steps:
  - type: console
    name: Step 1
    with:
      message: hello
`;

spaceTest.describe('Workflows management API availability (serverless tiers)', () => {
  let workflowsApi: WorkflowsApiService;
  const createdWorkflowIds: string[] = [];

  spaceTest.beforeAll(async ({ apiServices }) => {
    workflowsApi = apiServices.workflowsApi;
  });

  spaceTest.afterAll(async () => {
    if (createdWorkflowIds.length > 0) {
      await workflowsApi.bulkDelete(createdWorkflowIds);
    }
  });

  spaceTest(
    'observability logs essentials: workflow API is not available',
    { tag: [...tags.serverless.observability.logs_essentials] },
    async () => {
      const response = await workflowsApi.rawGetWorkflow('non-existent-id', {
        retries: 0,
        ignoreErrors: [403],
      });
      expect(response.data).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
        message:
          'Your project does not have Workflows available. Please upgrade your tier subscription.',
      });
    }
  );

  spaceTest(
    'observability complete: can create and retrieve a workflow',
    { tag: [...tags.serverless.observability.complete] },
    async () => {
      const created = await workflowsApi.create(SIMPLE_WORKFLOW_YAML);
      createdWorkflowIds.push(created.id);
      const response = await workflowsApi.rawGetWorkflow(created.id);
      expect(response.status).toBe(200);
      expect(response.data.id).toBe(created.id);
    }
  );

  spaceTest(
    'security essentials: workflow API is not available',
    { tag: [...tags.serverless.security.essentials] },
    async () => {
      const response = await workflowsApi.rawGetWorkflow('non-existent-id', {
        retries: 0,
        ignoreErrors: [403],
      });
      expect(response.data).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
        message:
          'Your project does not have Workflows available. Please upgrade your tier subscription.',
      });
    }
  );

  spaceTest(
    'security complete: can create and retrieve a workflow',
    { tag: [...tags.serverless.security.complete] },
    async () => {
      const created = await workflowsApi.create(SIMPLE_WORKFLOW_YAML);
      createdWorkflowIds.push(created.id);
      const response = await workflowsApi.rawGetWorkflow(created.id);
      expect(response.status).toBe(200);
      expect(response.data.id).toBe(created.id);
    }
  );

  spaceTest(
    'security EASE (AI for SOC): can create and retrieve a workflow',
    { tag: [...tags.serverless.security.ease] },
    async () => {
      const created = await workflowsApi.create(SIMPLE_WORKFLOW_YAML);
      createdWorkflowIds.push(created.id);
      const response = await workflowsApi.rawGetWorkflow(created.id);
      expect(response.status).toBe(200);
      expect(response.data.id).toBe(created.id);
    }
  );

  spaceTest(
    'search: can create and retrieve a workflow',
    { tag: [...tags.serverless.search] },
    async () => {
      const created = await workflowsApi.create(SIMPLE_WORKFLOW_YAML);
      createdWorkflowIds.push(created.id);
      const response = await workflowsApi.rawGetWorkflow(created.id);
      expect(response.status).toBe(200);
      expect(response.data.id).toBe(created.id);
    }
  );
});
