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
import { waitForConditionOrThrow } from '../../../common/utils/wait_for_condition';
import { spaceTest } from '../../fixtures';

const getScheduledWorkflowYaml = (interval: string) => `
name: Scout Scheduled Save/Update Test
enabled: true
description: Scheduled workflow for save/update interval change test
triggers:
  - type: scheduled
    with:
      every: ${interval}
steps:
  - name: log_step
    type: console
    with:
      message: "Scheduled execution"
`;

spaceTest.describe('Scheduled workflow save and update', { tag: tags.deploymentAgnostic }, () => {
  let workflowsApi: WorkflowsApiService;
  let workflowId: string;

  spaceTest.beforeAll(async ({ apiServices }) => {
    workflowsApi = apiServices.workflowsApi;
    const created = await workflowsApi.create(getScheduledWorkflowYaml('5s'));
    workflowId = created.id;
  });

  spaceTest.afterAll(async () => {
    await workflowsApi.deleteAll();
  });

  spaceTest('updating a scheduled workflow with a changed interval succeeds', async () => {
    await waitForConditionOrThrow({
      action: () => workflowsApi.getExecutions(workflowId),
      condition: ({ results: r }) => r.length >= 1,
      interval: 1000,
      timeout: 10000,
      errorMessage: 'No executions appeared after enabling the workflow',
    });
    const getBefore = await workflowsApi.rawGetWorkflow(workflowId);
    expect(getBefore.status).toBe(200);
    const workflowBeforeUpdate = getBefore.data;
    expect(workflowBeforeUpdate.yaml).toContain('every: 5s');

    const updateResponse = await workflowsApi.rawUpdate(workflowId, {
      yaml: getScheduledWorkflowYaml('1m'),
    });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.data.id).toBe(workflowId);

    const getAfter = await workflowsApi.rawGetWorkflow(workflowId);
    expect(getAfter.status).toBe(200);
    expect(getAfter.data.yaml).toContain('every: 1m');
  });
});
