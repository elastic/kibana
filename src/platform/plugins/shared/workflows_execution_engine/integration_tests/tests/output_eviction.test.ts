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

describe('workflow output targeted rehydration', () => {
  let workflowRunFixture: WorkflowRunFixture;
  let getByIdsSpy: jest.SpyInstance;

  // 4-step workflow: step_a → step_b → pause → step_c
  // After resume, step_c only references step_b — step_a should NOT be rehydrated
  const yaml = `
name: targeted rehydration workflow
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
  - name: pause
    type: wait
    with:
      duration: 20m
  - name: step_c
    type: console
    with:
      message: 'Step B said: {{steps.step_b.output}}'
`;

  beforeAll(async () => {
    workflowRunFixture = new WorkflowRunFixture();
    (workflowRunFixture.configMock as Record<string, unknown>).eviction = {
      minPayloadSize: new ByteSizeValue(1),
    };
    await workflowRunFixture.runWorkflow({ workflowYaml: yaml });
  });

  it('should pause after step_b completes', () => {
    const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    expect(execution?.status).toBe(ExecutionStatus.WAITING);
  });

  describe('after resume', () => {
    beforeAll(async () => {
      getByIdsSpy = jest.spyOn(
        workflowRunFixture.stepExecutionRepositoryMock,
        'getStepExecutionsByIds'
      );
      await workflowRunFixture.resumeWorkflow();
    });

    it('should complete workflow successfully', () => {
      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution?.error).toBeUndefined();
    });

    it('rehydrates step_b (consumer of step_a) at some point during resume', () => {
      // The deferred-release pattern means a single rehydration may serve
      // multiple consumers — once step_b is resident, step_c can read it
      // without a second mget. We therefore check that step_b was rehydrated
      // *at some point* during the resume, not specifically during step_c.
      const rehydrationCalls = getByIdsSpy.mock.calls.filter(
        (call) => Array.isArray(call[1]) && call[1].includes('output')
      );
      const stepBExec = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((s) => s.stepId === 'step_b');

      const rehydratedIds = rehydrationCalls.flatMap((call) => call[0]);
      expect(rehydratedIds).toContain(stepBExec?.id);
    });
  });
});

describe('workflow output rehydration with dynamic steps access', () => {
  let workflowRunFixture: WorkflowRunFixture;
  let getByIdsSpy: jest.SpyInstance;

  // Workflow: set_step_name (data.set) → step_a → pause → dynamic_consumer
  // dynamic_consumer uses steps[variables.step_name] — dynamic bracket access
  // This must trigger fallback to rehydrate ALL predecessors (not targeted)
  const yaml = `
name: dynamic steps access workflow
enabled: false
triggers:
  - type: manual
steps:
  - name: set_step_name
    type: data.set
    with:
      step_name: step_a

  - name: step_a
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'Hello from step A'

  - name: pause
    type: wait
    with:
      duration: 20m

  - name: dynamic_consumer
    type: console
    with:
      message: 'Dynamic ref: {{steps[variables.step_name].output}}'
`;

  beforeAll(async () => {
    workflowRunFixture = new WorkflowRunFixture();
    (workflowRunFixture.configMock as Record<string, unknown>).eviction = {
      minPayloadSize: new ByteSizeValue(1),
    };
    await workflowRunFixture.runWorkflow({ workflowYaml: yaml });
  });

  it('should pause after step_a completes', () => {
    const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    expect(execution?.status).toBe(ExecutionStatus.WAITING);
  });

  describe('after resume', () => {
    beforeAll(async () => {
      getByIdsSpy = jest.spyOn(
        workflowRunFixture.stepExecutionRepositoryMock,
        'getStepExecutionsByIds'
      );
      await workflowRunFixture.resumeWorkflow();
    });

    it('should complete workflow successfully despite dynamic steps access', () => {
      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution?.error).toBeUndefined();
    });

    it('rehydrates step_a (the dynamically-referenced predecessor) at some point', () => {
      // The dynamic access defeats targeted analysis, so the fallback path
      // rehydrates all predecessors. With the deferred-release pattern this
      // may happen during an earlier step (e.g. the `pause` step also takes
      // the fallback path because it has no template references). We verify
      // the *outcome*: step_a's output is reachable during resume.
      const rehydrationCalls = getByIdsSpy.mock.calls.filter(
        (call) => Array.isArray(call[1]) && call[1].includes('output')
      );
      const stepAExec = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((s) => s.stepId === 'step_a');

      const rehydratedIds = rehydrationCalls.flatMap((call) => call[0]);
      expect(rehydratedIds).toContain(stepAExec?.id);
    });
  });
});

describe('workflow input eviction', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeEach(() => {
    workflowRunFixture = new WorkflowRunFixture();
    // Low threshold so connector outputs get evicted
    (workflowRunFixture.configMock as Record<string, unknown>).eviction = {
      minPayloadSize: new ByteSizeValue(1),
    };
  });

  it('should preserve step input in ES after in-memory eviction', async () => {
    const yaml = `
name: input eviction workflow
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
    type: console
    with:
      message: 'Step A said: {{steps.step_a.output}}'
`;
    await workflowRunFixture.runWorkflow({ workflowYaml: yaml });

    const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);

    // step_a's input should be persisted in the mock repository (ES)
    const stepA = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    ).find((s) => s.stepId === 'step_a');
    expect(stepA?.status).toBe(ExecutionStatus.COMPLETED);
    expect(stepA?.input).toBeDefined(); // persisted in the mock (simulates ES)
  });

  it('should complete multi-step workflow with deferred output eviction', async () => {
    const yaml = `
name: deferred output eviction workflow
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
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'Step B said: {{steps.step_b.output}}'
  - name: step_d
    type: console
    with:
      message: 'Step C said: {{steps.step_c.output}}'
`;
    await workflowRunFixture.runWorkflow({ workflowYaml: yaml });

    const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(execution?.error).toBeUndefined();
  });
});

describe('workflow eviction with pause and resume', () => {
  describe('wait step pause/resume with eviction', () => {
    let workflowRunFixture: WorkflowRunFixture;

    beforeAll(async () => {
      workflowRunFixture = new WorkflowRunFixture();
      (workflowRunFixture.configMock as Record<string, unknown>).eviction = {
        minPayloadSize: new ByteSizeValue(1),
      };

      const yaml = `
name: pause resume eviction workflow
enabled: false
triggers:
  - type: manual
steps:
  - name: step_a
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'Before pause'
  - name: pause
    type: wait
    with:
      duration: 20m
  - name: step_b
    type: console
    with:
      message: 'Step A said: {{steps.step_a.output}}'
`;
      await workflowRunFixture.runWorkflow({ workflowYaml: yaml });
    });

    it('should pause at wait step', () => {
      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.WAITING);
    });

    it('should complete after resume with step_a output rehydrated', async () => {
      await workflowRunFixture.resumeWorkflow();

      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution?.error).toBeUndefined();

      const stepB = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((s) => s.stepId === 'step_b');
      expect(stepB?.status).toBe(ExecutionStatus.COMPLETED);
    });
  });

  describe('waitForInput (reply) with evicted inputs from prior steps', () => {
    let workflowRunFixture: WorkflowRunFixture;

    beforeAll(async () => {
      workflowRunFixture = new WorkflowRunFixture();
      (workflowRunFixture.configMock as Record<string, unknown>).eviction = {
        minPayloadSize: new ByteSizeValue(1),
      };

      const yaml = `
name: reply eviction workflow
enabled: false
triggers:
  - type: manual
steps:
  - name: step_a
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'Producing output'
  - name: ask
    type: waitForInput
    with:
      message: 'Approve?'
  - name: step_b
    type: console
    with:
      message: 'Step A: {{steps.step_a.output}}, reply: {{steps.ask.output}}'
`;
      await workflowRunFixture.runWorkflow({ workflowYaml: yaml });
    });

    it('should pause at waitForInput', () => {
      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.WAITING_FOR_INPUT);
    });

    it('should complete after reply with evicted step outputs rehydrated', async () => {
      const exec = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      )!;
      exec.context = { ...exec.context, resumeInput: { approved: true } };
      workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.set(exec.id, exec);

      await workflowRunFixture.resumeWorkflow();

      const updated = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(updated?.status).toBe(ExecutionStatus.COMPLETED);
      expect(updated?.error).toBeUndefined();

      const stepB = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((s) => s.stepId === 'step_b');
      expect(stepB?.status).toBe(ExecutionStatus.COMPLETED);
    });
  });

  describe('multiple pause/resume cycles with eviction', () => {
    let workflowRunFixture: WorkflowRunFixture;

    beforeAll(async () => {
      workflowRunFixture = new WorkflowRunFixture();
      (workflowRunFixture.configMock as Record<string, unknown>).eviction = {
        minPayloadSize: new ByteSizeValue(1),
      };

      const yaml = `
name: multi pause resume eviction workflow
enabled: false
triggers:
  - type: manual
steps:
  - name: step_a
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'Step A'
  - name: pause1
    type: wait
    with:
      duration: 20m
  - name: step_b
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Step A said: {{steps.step_a.output}}'
  - name: pause2
    type: wait
    with:
      duration: 20m
  - name: step_c
    type: console
    with:
      message: 'Step B said: {{steps.step_b.output}}'
`;
      await workflowRunFixture.runWorkflow({ workflowYaml: yaml });
    });

    it('should pause at first wait', () => {
      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.WAITING);
    });

    it('should pause at second wait after first resume', async () => {
      await workflowRunFixture.resumeWorkflow();

      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.WAITING);

      // step_b should have completed successfully using rehydrated step_a output
      const stepB = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((s) => s.stepId === 'step_b');
      expect(stepB?.status).toBe(ExecutionStatus.COMPLETED);
    });

    it('should complete after second resume', async () => {
      await workflowRunFixture.resumeWorkflow();

      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution?.error).toBeUndefined();

      const stepC = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((s) => s.stepId === 'step_c');
      expect(stepC?.status).toBe(ExecutionStatus.COMPLETED);
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
    let getByIdsSpy: jest.SpyInstance;

    beforeAll(async () => {
      getByIdsSpy = jest.spyOn(
        workflowRunFixture.stepExecutionRepositoryMock,
        'getStepExecutionsByIds'
      );
      await workflowRunFixture.resumeWorkflow();
    });

    it('should complete workflow successfully after resume with evicted outputs restored', () => {
      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution?.error).toBeUndefined();
    });

    it('should load step executions with output excluded during resume', () => {
      // The first call to getStepExecutionsByIds during resume should exclude outputs
      const loadCall = getByIdsSpy.mock.calls[0];
      expect(loadCall[1]).toBeUndefined(); // sourceIncludes
      expect(loadCall[2]).toEqual(['output']); // sourceExcludes
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
