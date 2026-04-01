/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { ExecutionStatus } from '@kbn/workflows';
import { FakeConnectors } from '../mocks/actions_plugin_mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

describe('workflow output eviction', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeEach(() => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  describe('with low eviction threshold', () => {
    beforeEach(() => {
      // Set a very low threshold (1 byte) so that all connector step outputs get evicted
      (workflowRunFixture.configMock as Record<string, unknown>).eviction = {
        minPayloadSize: new ByteSizeValue(1),
      };
    });

    it('should complete a linear multi-step workflow with output eviction active', async () => {
      const yaml = `
name: eviction linear workflow
enabled: false
triggers:
  - type: manual
steps:
  - name: step_a
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'Hello from step A'
  - name: step_b
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Step A said: {{steps.step_a.output}}'
  - name: step_c
    type: console
    with:
      message: 'Final: {{steps.step_b.output}}'
`;
      await workflowRunFixture.runWorkflow({ workflowYaml: yaml });

      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution?.error).toBeUndefined();
    });

    it('should resolve data.set variables correctly despite eviction of other steps', async () => {
      const yaml = `
name: eviction variables workflow
enabled: false
triggers:
  - type: manual
steps:
  - name: set_initial
    type: data.set
    with:
      counter: 42

  - name: connector_step
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'Counter is {{variables.counter}}'

  - name: debug
    type: console
    with:
      message: '{{variables | json}}'
`;
      await workflowRunFixture.runWorkflow({ workflowYaml: yaml });

      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution?.error).toBeUndefined();

      const debugStep = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((x) => x.stepId === 'debug');
      expect(debugStep).toBeDefined();
      const parsed = JSON.parse(debugStep?.output as string);
      expect(parsed.counter).toBe(42);
    });

    it('should handle foreach with variable accumulation correctly', async () => {
      const yaml = `
name: eviction foreach workflow
enabled: false
triggers:
  - type: manual
steps:
  - name: init
    type: data.set
    with:
      items: []

  - name: loop
    type: foreach
    foreach: '["a", "b", "c"]'
    steps:
      - name: accumulate
        type: data.set
        with:
          items: '\${{variables.items | push: foreach.item}}'

  - name: result
    type: console
    with:
      message: '{{variables.items | json}}'
`;
      await workflowRunFixture.runWorkflow({ workflowYaml: yaml });

      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);

      const resultStep = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((x) => x.stepId === 'result');
      expect(resultStep).toBeDefined();
      const parsed = JSON.parse(resultStep?.output as string);
      expect(parsed).toEqual(['a', 'b', 'c']);
    });
  });

  describe('with high eviction threshold', () => {
    beforeEach(() => {
      // Set threshold very high so nothing gets evicted
      (workflowRunFixture.configMock as Record<string, unknown>).eviction = {
        minPayloadSize: new ByteSizeValue(100 * 1024 * 1024), // 100MB
      };
    });

    it('should not trigger any rehydration calls when outputs are below threshold', async () => {
      const yaml = `
name: small payload workflow
enabled: false
triggers:
  - type: manual
steps:
  - name: step_a
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'hello'
  - name: step_b
    type: console
    with:
      message: '{{steps.step_a.output}}'
`;
      const getByIdsSpy = jest.spyOn(
        workflowRunFixture.stepExecutionRepositoryMock,
        'getStepExecutionsByIds'
      );

      await workflowRunFixture.runWorkflow({ workflowYaml: yaml });

      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);

      // getStepExecutionsByIds should NOT have been called for rehydration
      // (it may be called for load() on resume, but not for rehydration in a fresh run)
      expect(getByIdsSpy).not.toHaveBeenCalled();
    });
  });
});

describe('workflow output eviction with pause and resume', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeAll(() => {
    workflowRunFixture = new WorkflowRunFixture();
    // Low threshold so connector outputs get evicted
    (workflowRunFixture.configMock as Record<string, unknown>).eviction = {
      minPayloadSize: new ByteSizeValue(1),
    };
  });

  beforeAll(async () => {
    const yaml = `
name: eviction pause resume workflow
enabled: false
triggers:
  - type: manual
steps:
  - name: before_wait
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'Before wait'

  - name: pause
    type: wait
    with:
      duration: 20m

  - name: after_wait
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Before wait said: {{steps.before_wait.output}}'

  - name: final
    type: console
    with:
      message: 'After wait said: {{steps.after_wait.output}}'
`;
    await workflowRunFixture.runWorkflow({ workflowYaml: yaml });
  });

  it('should pause with before_wait output persisted in mock repository', () => {
    const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    expect(execution?.status).toBe(ExecutionStatus.WAITING);

    const beforeWait = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    ).find((s) => s.stepId === 'before_wait');
    expect(beforeWait?.status).toBe(ExecutionStatus.COMPLETED);
    expect(beforeWait?.output).toBeDefined();
  });

  describe('after resume', () => {
    beforeAll(async () => {
      await workflowRunFixture.resumeWorkflow();
    });

    it('should complete workflow successfully after resume with evicted outputs restored', () => {
      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution?.error).toBeUndefined();
    });

    it('should have executed after_wait step referencing before_wait output', () => {
      const afterWait = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((s) => s.stepId === 'after_wait');
      expect(afterWait?.status).toBe(ExecutionStatus.COMPLETED);
      expect(afterWait?.error).toBeUndefined();
    });

    it('should have executed final step referencing after_wait output', () => {
      const final = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((s) => s.stepId === 'final');
      expect(final?.status).toBe(ExecutionStatus.COMPLETED);
      expect(final?.error).toBeUndefined();
    });
  });
});
