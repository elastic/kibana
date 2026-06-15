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

const JAVASCRIPT_STEP_HARNESS_YAML = `
version: "1"
name: JavaScript Step — Security & Performance Test Harness
description: |
  Manual test workflow for the experimental scripts.javaScript step.
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
  - name: func-liquid-const-mutation
    type: scripts.javaScript
    with:
      script: |
        var array = {{consts.array | json}}

        for (var i = 4; i < 7; i++) {
          array.push(i);
        }

        return array;

  - name: func-async-await
    type: scripts.javaScript
    with:
      script: |
        const value = await Promise.resolve(42);
        return value;

  - name: func-complex-return-value
    type: scripts.javaScript
    with:
      script: |
        return {
          greeting: '{{consts.greeting}}',
          nested: { ok: true, items: [1, 2, 3] },
        };

  - name: func-cpu-baseline
    type: scripts.javaScript
    with:
      script: |
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;

  - name: sec-no-host-or-node-globals
    type: scripts.javaScript
    with:
      script: |
        return {
          context: typeof context,
          input: typeof input,
          __logBridge__: typeof __logBridge__,
          require: typeof require,
          process: typeof process,
          fetch: typeof fetch,
        };

  - name: sec-wrapper-injection
    type: scripts.javaScript
    on-failure:
      continue: true
    with:
      script: |
        })(); return { injected: true }; (function () {

  - name: sec-empty-script-rejected
    type: scripts.javaScript
    on-failure:
      continue: true
    with:
      script: |
          

  - name: perf-infinite-loop-timeout
    type: scripts.javaScript
    timeout: 5s
    on-failure:
      continue: true
    with:
      script: |
        console.log('starting infinite loop');
        while (true) {}

  - name: perf-memory-bomb-objects
    type: scripts.javaScript
    on-failure:
      continue: true
    with:
      script: |
        console.log('allocating object memory');
        const chunks = [];
        for (let i = 0; i < 10000; i++) {
          chunks.push({ data: new Array(10000).fill(Math.random()) });
        }
        return chunks.length;

  - name: perf-memory-bomb-arraybuffer
    type: scripts.javaScript
    on-failure:
      continue: true
    with:
      script: |
        console.log('allocating ArrayBuffer');
        new ArrayBuffer(100 * 1024 * 1024);
        return 'should not reach here';

  - name: perf-console-cpu-after-cap
    type: scripts.javaScript
    timeout: 3s
    on-failure:
      continue: true
    with:
      script: |
        for (let i = 0; i < 200; i++) {
          console.log('spam-' + i);
        }
        while (true) {
          console.log('post-cap spam');
        }
`;

const EXECUTION_POLL_TIMEOUT_MS = 120_000;

const getStep = (execution: WorkflowExecutionDto, stepId: string): WorkflowStepExecutionDto => {
  const step = execution.stepExecutions.find((s) => s.stepId === stepId);
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
  'scripts.javaScript harness workflow execution',
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

    spaceTest.afterAll(async () => {
      await workflowsApi.deleteAll();
    });

    spaceTest('runs all harness steps with expected outputs and failures', async () => {
      const { workflowExecutionId } = await workflowsApi.run(workflowId, {});
      const execution = await waitForExecution(workflowsApi, workflowExecutionId);

      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution?.stepExecutions).toHaveLength(11);

      const liquidMutation = getStep(
        execution as WorkflowExecutionDto,
        'func-liquid-const-mutation'
      );
      expectStepCompleted(liquidMutation);
      expect(liquidMutation.output).toStrictEqual([1, 2, 3, 4, 5, 6]);

      const asyncAwait = getStep(execution as WorkflowExecutionDto, 'func-async-await');
      expectStepCompleted(asyncAwait);
      expect(asyncAwait.output).toBe(42);

      const complexReturn = getStep(execution as WorkflowExecutionDto, 'func-complex-return-value');
      expectStepCompleted(complexReturn);
      expect(complexReturn.output).toStrictEqual({
        greeting: 'Hello from consts',
        nested: { ok: true, items: [1, 2, 3] },
      });

      const cpuBaseline = getStep(execution as WorkflowExecutionDto, 'func-cpu-baseline');
      expectStepCompleted(cpuBaseline);
      expect(cpuBaseline.output).toBe(499_500);

      const noGlobals = getStep(execution as WorkflowExecutionDto, 'sec-no-host-or-node-globals');
      expectStepCompleted(noGlobals);
      expect(noGlobals.output).toStrictEqual({
        context: 'undefined',
        input: 'undefined',
        __logBridge__: 'undefined',
        require: 'undefined',
        process: 'undefined',
        fetch: 'undefined',
      });

      const wrapperInjection = getStep(execution as WorkflowExecutionDto, 'sec-wrapper-injection');
      expectStepFailedWithMessage(
        wrapperInjection,
        /Script execution failed|SyntaxError|Unexpected token/i
      );

      const emptyScript = getStep(execution as WorkflowExecutionDto, 'sec-empty-script-rejected');
      expectStepFailedWithMessage(emptyScript, 'Script is required');

      const infiniteLoop = getStep(execution as WorkflowExecutionDto, 'perf-infinite-loop-timeout');
      expectStepFailedWithMessage(infiniteLoop, 'Script execution timed out.');

      const memoryBombObjects = getStep(
        execution as WorkflowExecutionDto,
        'perf-memory-bomb-objects'
      );
      expectStepFailedWithMessage(memoryBombObjects, 'Script failed due to out of memory');

      const memoryBombArrayBuffer = getStep(
        execution as WorkflowExecutionDto,
        'perf-memory-bomb-arraybuffer'
      );
      expectStepFailedWithMessage(memoryBombArrayBuffer, 'Script failed due to out of memory');

      const consoleCpuAfterCap = getStep(
        execution as WorkflowExecutionDto,
        'perf-console-cpu-after-cap'
      );
      expectStepFailedWithMessage(consoleCpuAfterCap, 'Script execution timed out.');
    });
  }
);
