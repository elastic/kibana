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
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import type { WorkflowsApiService } from '../../../common/apis/workflows';
import { waitForConditionOrThrow } from '../../../common/utils/wait_for_condition';
import { spaceTest } from '../../fixtures';

const BASIC_WORKFLOW_YAML = `
name: CRUD Edge Case Workflow
enabled: true
description: Test workflow for CRUD edge cases
triggers:
  - type: manual
steps:
  - name: step_1
    type: console
    with:
      message: "hello"
`;

const LONG_RUNNING_YAML = `
name: Long Running For Update Test
enabled: true
description: Long workflow to test update during execution
triggers:
  - type: manual
steps:
  - name: start
    type: console
    with:
      message: "starting"
  - name: long_wait
    type: wait
    with:
      duration: 30s
  - name: finish
    type: console
    with:
      message: "finishing"
`;

const ENABLED_WORKFLOW_YAML = `
name: Toggle Test Workflow
enabled: true
description: For enable/disable toggling
triggers:
  - type: manual
steps:
  - name: step_1
    type: console
    with:
      message: "hello"
`;

spaceTest.describe('Workflow management CRUD edge cases', { tag: tags.deploymentAgnostic }, () => {
  let workflowsApi: WorkflowsApiService;

  spaceTest.beforeAll(async ({ apiServices }) => {
    spaceTest.setTimeout(120_000);
    workflowsApi = apiServices.workflowsApi;
  });

  spaceTest.afterAll(async () => {
    await workflowsApi.deleteAll();
  });

  spaceTest('update workflow definition while execution is running', async () => {
    spaceTest.setTimeout(120_000);
    const workflow = await workflowsApi.create(LONG_RUNNING_YAML);

    const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});

    await waitForConditionOrThrow({
      action: () => workflowsApi.getExecution(workflowExecutionId),
      condition: (exec) => (exec?.stepExecutions?.length ?? 0) >= 1,
      interval: 500,
      timeout: 10_000,
      errorMessage: 'Execution did not start within timeout',
    });

    const updatedYaml = LONG_RUNNING_YAML.replace(
      'Long Running For Update Test',
      'Updated While Running'
    );
    await workflowsApi.update(workflow.id, { yaml: updatedYaml });

    const afterUpdate = await workflowsApi.getWorkflow(workflow.id);
    expect(afterUpdate.name).toBe('Updated While Running');

    await workflowsApi.cancel(workflowExecutionId);
    const execution = await workflowsApi.waitForTermination({
      workflowExecutionId,
      timeout: 90_000,
    });

    expect(execution).toBeDefined();
    expect([ExecutionStatus.CANCELLED, ExecutionStatus.COMPLETED]).toContain(execution?.status);
  });

  spaceTest('enable then disable workflow rapidly', async () => {
    const workflow = await workflowsApi.create(ENABLED_WORKFLOW_YAML);

    await workflowsApi.update(workflow.id, { enabled: false });
    await workflowsApi.update(workflow.id, { enabled: true });
    await workflowsApi.update(workflow.id, { enabled: false });
    await workflowsApi.update(workflow.id, { enabled: true });
    await workflowsApi.update(workflow.id, { enabled: false });

    const finalState = await workflowsApi.getWorkflow(workflow.id);
    expect(finalState.enabled).toBe(false);

    let rejected = false;
    try {
      await workflowsApi.run(workflow.id, {});
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
  });

  spaceTest('delete workflow then it disappears from list', async () => {
    const workflow = await workflowsApi.create(BASIC_WORKFLOW_YAML);

    await workflowsApi.bulkDelete([workflow.id]);

    const list = await workflowsApi.list();
    const ids = list.results.map((w) => w.id);
    expect(ids).not.toContain(workflow.id);
  });

  spaceTest('delete workflow then try to run it fails', async () => {
    const workflow = await workflowsApi.create(BASIC_WORKFLOW_YAML);

    await workflowsApi.bulkDelete([workflow.id]);

    let rejected = false;
    try {
      await workflowsApi.run(workflow.id, {});
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
  });

  spaceTest('update with invalid YAML preserves previous valid state', async () => {
    const workflow = await workflowsApi.create(BASIC_WORKFLOW_YAML);
    expect(workflow.valid).toBe(true);

    await workflowsApi.rawUpdate(workflow.id, {
      yaml: 'this is: completely: broken: yaml: [[[',
    });

    const fetched = await workflowsApi.getWorkflow(workflow.id);
    expect(fetched).toBeDefined();
  });
});
