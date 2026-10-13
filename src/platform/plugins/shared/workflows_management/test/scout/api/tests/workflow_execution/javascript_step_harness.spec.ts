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
import { isTerminalStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows/types/latest';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import type { WorkflowsApiService } from '../../../common/apis/workflows';
import { waitForConditionOrThrow } from '../../../common/utils/wait_for_condition';
import { spaceTest } from '../../fixtures';

const SCRIPTS_JAVA_SCRIPT_STEP_TYPE = 'code.javascript' as const;

const JAVASCRIPT_STEP_HARNESS_YAML = `
version: "1"
name: JavaScript Step Tests
description: |
  Manual test workflow for the experimental ${SCRIPTS_JAVA_SCRIPT_STEP_TYPE} step.
  Covers happy-path execution, sandbox isolation, CPU/memory limits, and console caps.
  Requires workflowsExtensions.experimentalSteps: true (or experimentalSteps.javaScriptStep: true) in kibana.yml.
enabled: true

consts:
  array:
    - 1
    - 2
    - 3
  greeting: Hello from consts

triggers:
  - type: manual

steps:
  - name: happy-path
    type: ${SCRIPTS_JAVA_SCRIPT_STEP_TYPE}
    with:
      code: |
        const arrayConstFromWorkflow = {{consts.array | json}};
        for (let i = arrayConstFromWorkflow.at(-1); i < 50; i++) {
          arrayConstFromWorkflow.push(i + 1);
        }
        return arrayConstFromWorkflow;

  - name: perf-infinite-loop-timeout
    type: ${SCRIPTS_JAVA_SCRIPT_STEP_TYPE}
    on-failure:
      continue: true
    with:
      code: |
        console.log('starting infinite loop');
        while (true) {}

  - name: perf-memory-bomb-objects
    type: ${SCRIPTS_JAVA_SCRIPT_STEP_TYPE}
    on-failure:
      continue: true
    with:
      code: |
        console.log('allocating object memory');
        const chunks = [];
        for (let i = 0; i < 10000; i++) {
          chunks.push({ data: new Array(10000).fill(Math.random()) });
        }
        return chunks.length;
`;

const EXECUTION_POLL_TIMEOUT_MS = 120_000;

const getJavaScriptStep = (
  execution: WorkflowExecutionDto,
  stepId: string
): WorkflowStepExecutionDto => {
  // Steps with `timeout:` also create a step_level_timeout execution record with the same stepId.
  const step = execution.stepExecutions.find(
    (s) => s.stepId === stepId && s.stepType === SCRIPTS_JAVA_SCRIPT_STEP_TYPE
  );
  expect(step).toBeDefined();
  return step as WorkflowStepExecutionDto;
};

const expectStepCompleted = (step: WorkflowStepExecutionDto): void => {
  expect(step.status).toBe(ExecutionStatus.COMPLETED);
  expect(step.error).toBeUndefined();
};

const expectStepFailedWithMessage = (
  step: WorkflowStepExecutionDto,
  expectedMessage: string | RegExp
): void => {
  expect(step.status).toBe(ExecutionStatus.FAILED);
  const message = step.error?.message ?? '';
  if (typeof expectedMessage === 'string') {
    expect(message).toContain(expectedMessage);
  } else {
    expect(message).toMatch(expectedMessage);
  }
};

async function waitForExecution(workflowsApi: WorkflowsApiService, executionId: string) {
  return waitForConditionOrThrow({
    action: () => workflowsApi.getExecution(executionId, { includeOutput: true }),
    condition: (exec) => !!exec && isTerminalStatus(exec.status ?? ''),
    interval: 1000,
    timeout: EXECUTION_POLL_TIMEOUT_MS,
    errorMessage: (exec) =>
      `Execution ${executionId} did not terminate within ${EXECUTION_POLL_TIMEOUT_MS}ms (last status: ${exec?.status})`,
  });
}

spaceTest.describe(
  `${SCRIPTS_JAVA_SCRIPT_STEP_TYPE} harness workflow execution`,
  { tag: tags.deploymentAgnostic },
  () => {
    let workflowsApi: WorkflowsApiService;
    let workflowId: string;

    spaceTest.beforeAll(async ({ apiServices }) => {
      spaceTest.setTimeout(180_000);
      workflowsApi = apiServices.workflowsApi;

      const workflow = await workflowsApi.create(JAVASCRIPT_STEP_HARNESS_YAML);
      workflowId = workflow.id;
    });

    spaceTest.afterAll(async ({ apiServices }) => {
      await apiServices.workflowsApi.deleteAll();
    });

    spaceTest('runs all harness steps with expected outputs and failures', async () => {
      const { workflowExecutionId } = await workflowsApi.run(workflowId, {});
      const execution = await waitForExecution(workflowsApi, workflowExecutionId);

      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution?.stepExecutions).toHaveLength(3);

      const happyPath = getJavaScriptStep(execution as WorkflowExecutionDto, 'happy-path');
      expectStepCompleted(happyPath);
      expect(happyPath.executionTimeMs).toBeLessThan(500);
      expect(happyPath.output).toStrictEqual(new Array(50).fill(0).map((_, i) => i + 1));

      const infiniteLoop = getJavaScriptStep(
        //
        execution as WorkflowExecutionDto,
        'perf-infinite-loop-timeout'
      );
      expect(infiniteLoop.executionTimeMs).toBeGreaterThan(500);
      expect(infiniteLoop.executionTimeMs).toBeLessThan(2_000);
      expectStepFailedWithMessage(infiniteLoop, 'Script execution timed out.');

      const memoryBombObjects = getJavaScriptStep(
        //
        execution as WorkflowExecutionDto,
        'perf-memory-bomb-objects'
      );
      expect(memoryBombObjects.executionTimeMs).toBeLessThan(2_000);
      expectStepFailedWithMessage(memoryBombObjects, 'Script failed due to out of memory');
    });
  }
);
