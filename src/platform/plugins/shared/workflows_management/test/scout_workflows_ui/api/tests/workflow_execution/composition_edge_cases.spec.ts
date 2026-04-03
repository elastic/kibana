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

const CHILD_LONG_RUNNING_YAML = `
name: Long Running Child
enabled: true
description: Child workflow with a long wait for cancel propagation testing
triggers:
  - type: manual
steps:
  - name: child_start
    type: console
    with:
      message: "Child started"
  - name: child_wait
    type: wait
    with:
      duration: 120s
  - name: child_end
    type: console
    with:
      message: "Child finished"
`;

const getSyncParentForCancel = (childId: string) => `
name: Parent For Cancel Test
enabled: true
description: Parent that sync-executes a long-running child
triggers:
  - type: manual
steps:
  - name: parent_start
    type: console
    with:
      message: "Parent starting child"
  - name: run_child
    type: workflow.execute
    with:
      workflow-id: ${childId}
  - name: parent_end
    type: console
    with:
      message: "Parent finished"
`;

const getSelfCallingWorkflowYaml = (selfId: string) => `
name: Self Calling Workflow
enabled: true
description: Workflow that calls itself to test depth limit
triggers:
  - type: manual
steps:
  - name: log_depth
    type: console
    with:
      message: "Executing"
  - name: call_self
    type: workflow.execute
    with:
      workflow-id: ${selfId}
`;

const DEEP_CHAIN_CHILD_YAML = `
name: Depth Leaf
enabled: true
description: Terminal workflow in a deep chain
triggers:
  - type: manual
steps:
  - name: leaf_step
    type: console
    with:
      message: "Leaf reached"
`;

const getDepthChainYaml = (name: string, childId: string) => `
name: ${name}
enabled: true
description: Chain link that calls next workflow
triggers:
  - type: manual
steps:
  - name: link_step
    type: console
    with:
      message: "Chain link: ${name}"
  - name: call_next
    type: workflow.execute
    with:
      workflow-id: ${childId}
`;

const NONEXISTENT_CHILD_YAML = `
name: Call Nonexistent Workflow
enabled: true
description: Calls a workflow ID that does not exist
triggers:
  - type: manual
steps:
  - name: call_missing
    type: workflow.execute
    with:
      workflow-id: "workflow-00000000-0000-0000-0000-000000000000"
`;

spaceTest.describe('Workflow composition edge cases', { tag: tags.deploymentAgnostic }, () => {
  let workflowsApi: WorkflowsApiService;

  spaceTest.beforeAll(async ({ apiServices }) => {
    spaceTest.setTimeout(120_000);
    workflowsApi = apiServices.workflowsApi;
  });

  spaceTest.afterAll(async () => {
    await workflowsApi.deleteAll();
  });

  spaceTest('cancel parent propagates to sync child workflow', async () => {
    const child = await workflowsApi.create(CHILD_LONG_RUNNING_YAML);
    const parent = await workflowsApi.create(getSyncParentForCancel(child.id));

    const { workflowExecutionId } = await workflowsApi.run(parent.id, {});

    await waitForConditionOrThrow({
      action: () => workflowsApi.getExecutions(child.id),
      condition: (result) => result.results.length > 0,
      interval: 1000,
      timeout: 15_000,
      errorMessage: 'Child workflow execution did not start',
    });

    await workflowsApi.cancel(workflowExecutionId);

    const parentExecution = await workflowsApi.waitForTermination({
      workflowExecutionId,
      timeout: 30_000,
    });
    expect(parentExecution?.status).toBe(ExecutionStatus.CANCELLED);

    const childExecutions = await workflowsApi.getExecutions(child.id);
    const childExec = childExecutions.results[0];
    expect(childExec).toBeDefined();
    const terminalChild = await workflowsApi.waitForTermination({
      workflowExecutionId: childExec.id,
      timeout: 30_000,
    });
    expect(terminalChild?.status).not.toBe(ExecutionStatus.COMPLETED);
  });

  spaceTest('self-calling workflow hits depth limit and fails', async () => {
    const placeholder = await workflowsApi.create(`
name: Self Calling Placeholder
enabled: true
triggers:
  - type: manual
steps:
  - name: noop
    type: console
    with:
      message: "placeholder"
`);

    await workflowsApi.update(placeholder.id, {
      yaml: getSelfCallingWorkflowYaml(placeholder.id),
    });

    const { workflowExecutionId } = await workflowsApi.run(placeholder.id, {});
    const execution = await workflowsApi.waitForTermination({
      workflowExecutionId,
      timeout: 60_000,
    });

    expect(execution?.status).toBe(ExecutionStatus.FAILED);
  });

  spaceTest('deep chain of 5 workflow.execute calls completes', async () => {
    spaceTest.setTimeout(180_000);
    const leaf = await workflowsApi.create(DEEP_CHAIN_CHILD_YAML);
    const link4 = await workflowsApi.create(getDepthChainYaml('Link 4', leaf.id));
    const link3 = await workflowsApi.create(getDepthChainYaml('Link 3', link4.id));
    const link2 = await workflowsApi.create(getDepthChainYaml('Link 2', link3.id));
    const link1 = await workflowsApi.create(getDepthChainYaml('Link 1', link2.id));

    const { workflowExecutionId } = await workflowsApi.run(link1.id, {});
    const execution = await workflowsApi.waitForTermination({
      workflowExecutionId,
      timeout: 120_000,
    });

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
  });

  spaceTest('calling nonexistent workflow ID fails the step', async () => {
    const workflow = await workflowsApi.create(NONEXISTENT_CHILD_YAML);

    const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});
    const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

    expect(execution?.status).toBe(ExecutionStatus.FAILED);
  });
});
