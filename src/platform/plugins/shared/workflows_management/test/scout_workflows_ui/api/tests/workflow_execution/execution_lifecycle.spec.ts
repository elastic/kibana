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

const CANCEL_DURING_WAIT_YAML = `
name: Cancel During Wait
enabled: true
description: Long wait to test cancellation
triggers:
  - type: manual
steps:
  - name: start_log
    type: console
    with:
      message: "Starting"
  - name: long_wait
    type: wait
    with:
      duration: 120s
  - name: end_log
    type: console
    with:
      message: "This should NOT execute"
`;

const CANCEL_DURING_FOREACH_YAML = `
name: Cancel During Foreach
enabled: true
description: Large foreach with waits to test cancellation mid-iteration
triggers:
  - type: manual
steps:
  - name: loop
    type: foreach
    foreach: '[1,2,3,4,5,6,7,8,9,10]'
    steps:
      - name: log_iteration
        type: console
        with:
          message: "Iteration $\{{foreach.index}}"
      - name: wait_in_loop
        type: wait
        with:
          duration: 5s
`;

const ON_FAILURE_CONTINUE_YAML = `
name: On Failure Continue
enabled: true
description: Step fails but execution continues
triggers:
  - type: manual
steps:
  - name: failing_step
    type: slack
    connector-id: "non-existing-connector"
    on-failure:
      continue: true
    with:
      message: "This will fail"
  - name: after_failure
    type: console
    with:
      message: "This should execute after failure"
`;

const ON_FAILURE_STOP_YAML = `
name: On Failure Stop
enabled: true
description: Step fails and execution stops (default behavior)
triggers:
  - type: manual
steps:
  - name: failing_step
    type: slack
    connector-id: "non-existing-connector"
    with:
      message: "This will fail"
  - name: should_not_run
    type: console
    with:
      message: "This should NOT execute"
`;

const ON_FAILURE_IN_FOREACH_YAML = `
name: On Failure In Foreach
enabled: true
description: Step fails inside foreach with on-failure continue
triggers:
  - type: manual
steps:
  - name: loop
    type: foreach
    foreach: '[1,2,3]'
    steps:
      - name: maybe_fail
        type: slack
        connector-id: "non-existing-connector"
        on-failure:
          continue: true
        with:
          message: "Iteration $\{{foreach.index}}"
  - name: after_loop
    type: console
    with:
      message: "After loop"
`;

const DISABLED_WORKFLOW_YAML = `
name: Disabled Workflow
enabled: false
description: Should not be runnable
triggers:
  - type: manual
steps:
  - name: step
    type: console
    with:
      message: "Should not execute"
`;

spaceTest.describe(
  'Execution lifecycle and error handling',
  { tag: tags.deploymentAgnostic },
  () => {
    let workflowsApi: WorkflowsApiService;

    spaceTest.beforeAll(async ({ apiServices }) => {
      spaceTest.setTimeout(120_000);
      workflowsApi = apiServices.workflowsApi;
    });

    spaceTest.afterAll(async () => {
      await workflowsApi.deleteAll();
    });

    // BUG: cancel during wait step does not terminate — execution stays non-terminal
    // until the wait duration expires. See https://github.com/elastic/security-team/issues/16621
    spaceTest.skip('cancel during wait step terminates execution', async () => {
      spaceTest.setTimeout(120_000);
      const workflow = await workflowsApi.create(CANCEL_DURING_WAIT_YAML);

      const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});

      await waitForConditionOrThrow({
        action: () => workflowsApi.getExecution(workflowExecutionId),
        condition: (exec) => (exec?.stepExecutions?.length ?? 0) >= 1,
        interval: 500,
        timeout: 10_000,
        errorMessage: 'Execution did not start first step within timeout',
      });

      await workflowsApi.cancel(workflowExecutionId);

      const execution = await workflowsApi.waitForTermination({
        workflowExecutionId,
        timeout: 90_000,
      });

      expect(execution?.status).toBe(ExecutionStatus.CANCELLED);
      const stepIds = execution?.stepExecutions.map((s) => s.stepId) ?? [];
      expect(stepIds).not.toContain('end_log');
    });

    spaceTest('cancel during foreach terminates and stops iterations', async () => {
      const workflow = await workflowsApi.create(CANCEL_DURING_FOREACH_YAML);

      const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});

      await waitForConditionOrThrow({
        action: () => workflowsApi.getExecution(workflowExecutionId),
        condition: (exec) => (exec?.stepExecutions?.length ?? 0) >= 3,
        interval: 500,
        timeout: 15_000,
        errorMessage: 'Foreach did not start iterating within timeout',
      });

      await workflowsApi.cancel(workflowExecutionId);

      const execution = await workflowsApi.waitForTermination({
        workflowExecutionId,
        timeout: 30_000,
      });

      expect(execution?.status).toBe(ExecutionStatus.CANCELLED);
      const iterationSteps = execution?.stepExecutions.filter((s) => s.stepId === 'log_iteration');
      expect(iterationSteps?.length ?? 0).toBeLessThan(10);
    });

    spaceTest('on-failure continue allows execution to proceed past failing step', async () => {
      const workflow = await workflowsApi.create(ON_FAILURE_CONTINUE_YAML);

      const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});
      const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
      const stepIds = execution?.stepExecutions.map((s) => s.stepId) ?? [];
      expect(stepIds).toContain('after_failure');

      const failedStep = execution?.stepExecutions.find((s) => s.stepId === 'failing_step');
      expect(failedStep?.status).toBe(ExecutionStatus.FAILED);
    });

    spaceTest('on-failure default behavior stops execution', async () => {
      const workflow = await workflowsApi.create(ON_FAILURE_STOP_YAML);

      const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});
      const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

      expect(execution?.status).toBe(ExecutionStatus.FAILED);
      const stepIds = execution?.stepExecutions.map((s) => s.stepId) ?? [];
      expect(stepIds).not.toContain('should_not_run');
    });

    spaceTest(
      'on-failure continue inside foreach — continues to next iteration and after loop',
      async () => {
        const workflow = await workflowsApi.create(ON_FAILURE_IN_FOREACH_YAML);

        const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});
        const execution = await workflowsApi.waitForTermination({
          workflowExecutionId,
          timeout: 30_000,
        });

        expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
        const stepIds = execution?.stepExecutions.map((s) => s.stepId) ?? [];
        expect(stepIds).toContain('after_loop');

        const failedSteps = execution?.stepExecutions.filter(
          (s) => s.stepId === 'maybe_fail' && s.status === ExecutionStatus.FAILED
        );
        expect(failedSteps?.length ?? 0).toBe(3);
      }
    );

    spaceTest('running a disabled workflow should fail or be rejected', async () => {
      const workflow = await workflowsApi.create(DISABLED_WORKFLOW_YAML);

      let rejected = false;
      try {
        await workflowsApi.run(workflow.id, {});
      } catch {
        rejected = true;
      }

      expect(rejected).toBe(true);
    });
  }
);
