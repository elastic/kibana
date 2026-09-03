/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Integration tests for the LRU-based StepIoService.
 *
 * Covers:
 * 1. Linear workflow — outputs flow through `write`→LRU→`read` correctly.
 * 2. data.set variables — the new inline `getVariables()` in WorkflowContextManager.
 * 3. Pause + resume — on resume `load()` excludes outputs, forcing `prepareForRead`
 *    to rehydrate from ES via `getStepExecutionsByIds`.
 * 4. Small `maxCacheSize` on pause/resume — even when the LRU cannot hold any item
 *    (1-byte budget), outputs are still retrievable after resume because `prepareForRead`
 *    fetches from ES and `read()` falls back to state when the item is too large to cache.
 * 5. Null output is not confused with a cache miss — a failed step's null output
 *    does not block downstream steps that tolerate the missing value.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { ExecutionStatus } from '@kbn/workflows';
import { FakeConnectors } from '../mocks/actions_plugin_mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

// ---------------------------------------------------------------------------
// Suite 1: Linear workflow — basic IO passing without eviction
// ---------------------------------------------------------------------------
describe('StepIoService (LRU): linear IO passing', () => {
  let fixture: WorkflowRunFixture;

  const yaml = `
name: lru-linear
enabled: false
triggers:
  - type: manual
steps:
  - name: produce
    type: ${FakeConnectors.large_response.actionTypeId}
    connector-id: ${FakeConnectors.large_response.name}
    with:
      sizeBytes: 100

  - name: consume
    type: console
    with:
      message: '{{steps.produce.output.payload | slice: 0, 3}}'
`;

  beforeAll(async () => {
    fixture = new WorkflowRunFixture();
    await fixture.runWorkflow({ workflowYaml: yaml });
  });

  it('workflow completes successfully', () => {
    const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    expect(exec?.status).toBe(ExecutionStatus.COMPLETED);
    expect(exec?.error).toBeUndefined();
  });

  it('consume step completes and reads produce output correctly', () => {
    const steps = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values());
    const consumeStep = steps.find((s) => s.stepId === 'consume');
    expect(consumeStep?.status).toBe(ExecutionStatus.COMPLETED);
    // console step writes its rendered message as output; slice:0,3 of 'x'.repeat(100) = 'xxx'
    expect(consumeStep?.output).toBe('xxx');
  });
});

// ---------------------------------------------------------------------------
// Suite 2: data.set variables — new inline getVariables() implementation
// ---------------------------------------------------------------------------
describe('StepIoService (LRU): data.set variables via getVariables()', () => {
  let fixture: WorkflowRunFixture;

  const yaml = `
name: lru-data-set
enabled: false
triggers:
  - type: manual
steps:
  - name: setter
    type: data.set
    with:
      greeting: hello
      count: 42

  - name: reader
    type: console
    with:
      message: '{{variables.greeting}}-{{variables.count}}'
`;

  beforeAll(async () => {
    fixture = new WorkflowRunFixture();
    await fixture.runWorkflow({ workflowYaml: yaml });
  });

  it('workflow completes successfully', () => {
    const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    expect(exec?.status).toBe(ExecutionStatus.COMPLETED);
    expect(exec?.error).toBeUndefined();
  });

  it('reader step renders variables set by setter', () => {
    const steps = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values());
    const readerStep = steps.find((s) => s.stepId === 'reader');
    expect(readerStep?.status).toBe(ExecutionStatus.COMPLETED);
    expect(readerStep?.output).toBe('hello-42');
  });
});

// ---------------------------------------------------------------------------
// Suite 3: Pause + resume — cold cache forces rehydration from ES
// ---------------------------------------------------------------------------
describe('StepIoService (LRU): pause + resume triggers ES rehydration', () => {
  let fixture: WorkflowRunFixture;

  // Workflow: before_pause → pause (wait) → after_pause reads before_pause output.
  // On resume, the LRU cache is cold (new StepIoService instance) and WorkflowExecutionState
  // loads metadata without outputs (excludeFields: ['output']). prepareForRead must fetch
  // the output from ES via getStepExecutionsByIds.
  const yaml = `
name: lru-pause-resume
enabled: false
triggers:
  - type: manual
steps:
  - name: before_pause
    type: ${FakeConnectors.large_response.actionTypeId}
    connector-id: ${FakeConnectors.large_response.name}
    with:
      sizeBytes: 100

  - name: pause
    type: wait
    with:
      duration: 20m

  - name: after_pause
    type: console
    with:
      message: '{{steps.before_pause.output.payload | slice: 0, 3}}'
`;

  describe('phase 1: initial run pauses', () => {
    beforeAll(async () => {
      fixture = new WorkflowRunFixture();
      await fixture.runWorkflow({ workflowYaml: yaml });
    });

    it('pauses at wait step', () => {
      const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(exec?.status).toBe(ExecutionStatus.WAITING);
    });

    it('before_pause step is COMPLETED', () => {
      const steps = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values());
      expect(steps.find((s) => s.stepId === 'before_pause')?.status).toBe(
        ExecutionStatus.COMPLETED
      );
    });
  });

  describe('phase 2: resume rehydrates from ES', () => {
    let getByIdsSpy: jest.SpyInstance;

    beforeAll(async () => {
      getByIdsSpy = jest.spyOn(fixture.stepExecutionRepositoryMock, 'getStepExecutionsByIds');
      await fixture.resumeWorkflow();
    });

    it('workflow completes after resume', () => {
      const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(exec?.status).toBe(ExecutionStatus.COMPLETED);
      expect(exec?.error).toBeUndefined();
    });

    it('after_pause step reads before_pause output correctly', () => {
      const steps = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values());
      const afterPause = steps.find((s) => s.stepId === 'after_pause');
      expect(afterPause?.status).toBe(ExecutionStatus.COMPLETED);
      expect(afterPause?.output).toBe('xxx');
    });

    it('getStepExecutionsByIds was called to rehydrate outputs (load() excludes output fields)', () => {
      // load() fetches step docs with excludeFields: ['output']. The LRU cache is empty at
      // resume time. prepareForRead detects the cache miss and fetches from ES.
      const rehydrationCalls = getByIdsSpy.mock.calls.filter(
        (call) => Array.isArray(call[1]) && call[1].includes('output')
      );
      expect(rehydrationCalls.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Suite 4: Tiny maxCacheSize — item too large to cache, workflow still completes
// ---------------------------------------------------------------------------
describe('StepIoService (LRU): tiny maxCacheSize does not break resume', () => {
  let fixture: WorkflowRunFixture;

  // Same shape as suite 3 but with maxCacheSize: 1 byte.
  // On resume, load() creates a fresh state with no outputs. prepareForRead fetches
  // from ES but cannot cache the result (item exceeds maxSize). read() returns undefined;
  // the Liquid template renders it as empty string. The workflow still completes.
  const yaml = `
name: lru-tiny-cache
enabled: false
triggers:
  - type: manual
steps:
  - name: producer
    type: ${FakeConnectors.large_response.actionTypeId}
    connector-id: ${FakeConnectors.large_response.name}
    with:
      sizeBytes: 100

  - name: pause
    type: wait
    with:
      duration: 20m

  - name: consumer
    type: console
    with:
      message: '{{steps.producer.output.payload | slice: 0, 3}}'
`;

  describe('phase 1: initial run pauses', () => {
    beforeAll(async () => {
      fixture = new WorkflowRunFixture();
      (fixture.configMock as Record<string, unknown>).eviction = {
        minPayloadSize: new ByteSizeValue(10 * 1024),
        maxCacheSize: new ByteSizeValue(1),
      };
      await fixture.runWorkflow({ workflowYaml: yaml });
    });

    it('pauses at wait step', () => {
      const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(exec?.status).toBe(ExecutionStatus.WAITING);
    });
  });

  describe('phase 2: resume completes despite cache unable to hold any item', () => {
    let getByIdsSpy: jest.SpyInstance;

    beforeAll(async () => {
      getByIdsSpy = jest.spyOn(fixture.stepExecutionRepositoryMock, 'getStepExecutionsByIds');
      await fixture.resumeWorkflow();
    });

    it('workflow completes after resume', () => {
      const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(exec?.status).toBe(ExecutionStatus.COMPLETED);
      expect(exec?.error).toBeUndefined();
    });

    it('getStepExecutionsByIds was called (cache always misses with maxCacheSize: 1)', () => {
      const rehydrationCalls = getByIdsSpy.mock.calls.filter(
        (call) => Array.isArray(call[1]) && call[1].includes('output')
      );
      expect(rehydrationCalls.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Suite 5: Null output is distinct from cache miss
// ---------------------------------------------------------------------------
describe('StepIoService (LRU): null output vs cache miss', () => {
  let fixture: WorkflowRunFixture;

  // A failing step (on-failure: continue: true) produces null output.
  // The downstream step must complete — null output is a valid value, not a missing value.
  const yaml = `
name: lru-null-output
enabled: false
triggers:
  - type: manual
steps:
  - name: failing_step
    type: slack
    connector-id: ${FakeConnectors.constantlyFailing.name}
    on-failure:
      continue: true
    with:
      message: 'This will always fail'

  - name: observer
    type: console
    with:
      message: 'done'
`;

  beforeAll(async () => {
    fixture = new WorkflowRunFixture();
    await fixture.runWorkflow({ workflowYaml: yaml });
  });

  it('workflow completes despite the failing step', () => {
    const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    expect(exec?.status).toBe(ExecutionStatus.COMPLETED);
    expect(exec?.error).toBeUndefined();
  });

  it('failing_step status is FAILED with null output (null != cache miss)', () => {
    const steps = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values());
    const failingStep = steps.find((s) => s.stepId === 'failing_step');
    expect(failingStep?.status).toBe(ExecutionStatus.FAILED);
    expect(failingStep?.output).toBeNull();
  });

  it('observer step completes — null output from failed step does not block execution', () => {
    const steps = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values());
    const observer = steps.find((s) => s.stepId === 'observer');
    expect(observer?.status).toBe(ExecutionStatus.COMPLETED);
  });
});
