/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License v 1".
 */

/**
 * `mode: settled` on a STATIC `branches` parallel, with one branch failing or
 * timing out and the others succeeding.
 *
 * `parallel.test.ts` already covers settled fan-out over `foreach` and a static
 * all-success scatter-gather. What is asserted here is the combination a
 * pre-execution writer fan-out depends on (nightshift's
 * `sandbox_materialize_workspace_workflow`):
 *
 *   (a) every branch still runs to a terminal state, so one failure does not
 *       starve its siblings;
 *   (b) the step AFTER the parallel still runs, can read the successful branches'
 *       outputs, and sees the failed branch's step output as absent;
 *   (c) the same holds when the losing branch is killed by `branch-timeout`,
 *       whose branch never produces a step output at all;
 *   (d) the workflow execution itself COMPLETES — `settled` reports the failed
 *       branches in `output.failed`/`output.status` without failing the step.
 *
 * (d) is the load-bearing one for the nightshift use case: a before-agent hook
 * (`runBeforeAgentWorkflows`) turns a FAILED pre-execution workflow into a thrown
 * error that aborts the agent round.
 */

import { ExecutionStatus, StepCategory } from '@kbn/workflows';
import { createPollServerStepDefinition } from '@kbn/workflows-extensions/server';
import { z } from '@kbn/zod/v4';
import { FakeConnectors } from '../mocks/actions_plugin_mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

const getExecution = (fixture: WorkflowRunFixture) =>
  fixture.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id');

const stepExecutionsFor = (fixture: WorkflowRunFixture, stepId: string) =>
  Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values()).filter(
    (se) => se.stepId === stepId
  );

const stepOutput = <T>(fixture: WorkflowRunFixture, stepId: string): T => {
  const [execution] = stepExecutionsFor(fixture, stepId);
  return execution?.output as T;
};

/**
 * Re-ticks a parked workflow until it leaves WAITING (or the guard trips). A
 * branch parked on a poll step only times out once the engine is re-driven past
 * its `branch-timeout`, so these tests must pump `resumeWorkflow()`.
 */
const driveToTerminal = async (fixture: WorkflowRunFixture, maxGuard = 20): Promise<void> => {
  let guard = 0;
  while (getExecution(fixture)?.status === ExecutionStatus.WAITING && guard < maxGuard) {
    await fixture.resumeWorkflow();
    guard += 1;
  }
};

interface ComposeOutput {
  cortex?: string;
  memory?: string;
  decisionTrees?: string;
}

interface AggregateOutput {
  total: number;
  succeeded: number;
  failed: number;
  status: string;
  branches?: Record<string, { status: string; output?: unknown; error?: unknown }>;
}
describe('static parallel with mode: settled tolerates one failing branch', () => {
  let fixture: WorkflowRunFixture;

  beforeAll(async () => {
    fixture = new WorkflowRunFixture();
    const yaml = `
steps:
  - name: materialize_workspaces
    type: parallel
    mode: settled
    branches:
      - name: cortex
        steps:
          - name: hydrate_cortex
            type: data.set
            with:
              notification: 'cortex-fragment'
      - name: memory
        steps:
          - name: hydrate_memory
            type: slack
            connector-id: ${FakeConnectors.constantlyFailing.name}
            with:
              message: 'materialize memory'
      - name: decision_trees
        steps:
          - name: hydrate_decision_trees
            type: data.set
            with:
              notification: 'trees-fragment'
  - name: compose_prompt
    type: data.set
    with:
      cortex: '{{ steps.hydrate_cortex.output.notification }}'
      memory: '{{ steps.hydrate_memory.output.notification }}'
      decisionTrees: '{{ steps.hydrate_decision_trees.output.notification }}'
`;
    jest.clearAllMocks();
    await fixture.runWorkflow({ workflowYaml: yaml });
    await driveToTerminal(fixture);
  });

  it('completes the workflow execution (does not fail it)', () => {
    // (d) A settled parallel must not leave the workflow FAILED: a before-agent
    // hook turns a failed execution into a thrown error that aborts the round.
    expect(getExecution(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
  });

  it('completes the parallel step while reporting the failed branch', () => {
    const [parallel] = stepExecutionsFor(fixture, 'materialize_workspaces');
    expect(parallel.status).toBe(ExecutionStatus.COMPLETED);

    // The aggregate still reports the branch failure, so an author can inspect it.
    const aggregate = parallel.output as AggregateOutput;
    expect(aggregate).toMatchObject({ total: 3, succeeded: 2, failed: 1, status: 'failed' });
  });

  it('runs every branch to a terminal state (no sibling starved)', () => {
    // (a) All three branch bodies executed: the failure did not short-circuit them.
    expect(stepExecutionsFor(fixture, 'hydrate_cortex')).toHaveLength(1);
    expect(stepExecutionsFor(fixture, 'hydrate_memory')).toHaveLength(1);
    expect(stepExecutionsFor(fixture, 'hydrate_decision_trees')).toHaveLength(1);
  });

  it('marks the failed branch failed and the others completed in the projection', () => {
    const aggregate = stepOutput<AggregateOutput>(fixture, 'materialize_workspaces');
    expect(aggregate.branches?.memory.status).toBe('failed');
    expect(aggregate.branches?.memory.error).toBeDefined();
    expect(aggregate.branches?.cortex.status).toBe('completed');
    expect(aggregate.branches?.decision_trees.status).toBe('completed');
  });

  it('runs the step after the parallel and reads the successful branches only', () => {
    // (b) The downstream step runs, sees both successful fragments, and sees the
    // failed branch's step output as absent rather than as an error value.
    const compose = stepOutput<ComposeOutput>(fixture, 'compose_prompt');
    expect(compose.cortex).toBe('cortex-fragment');
    expect(compose.decisionTrees).toBe('trees-fragment');
    expect(compose.memory).toBeFalsy();
  });
});

describe('static parallel with mode: settled tolerates one branch killed by branch-timeout', () => {
  let fixture: WorkflowRunFixture;

  /** A poll step that always asks to poll again; only `branch-timeout` ends it. */
  const neverCompletingPoll = createPollServerStepDefinition({
    id: 'integration.parallelSettledNeverPoll',
    category: StepCategory.Kibana,
    label: 'Never-completing poll branch (integration)',
    description: 'Always asks to poll again',
    inputSchema: z.object({}),
    outputSchema: z.object({}),
    poll: async ({ state }) => {
      const count = (state as { count?: number } | undefined)?.count ?? 0;
      return { state: { count: count + 1 } };
    },
    policy: { strategy: 'fixed', intervalMs: 6_000 },
    ceilings: { maxAttempts: 100, maxWaitMs: 600_000 },
  });

  beforeAll(async () => {
    fixture = new WorkflowRunFixture();
    (
      fixture.dependencies.workflowsExtensions.getStepDefinition as jest.Mock
    ).mockImplementation((id: string) =>
      id === 'integration.parallelSettledNeverPoll' ? neverCompletingPoll : undefined
    );
    (
      fixture.dependencies.workflowsExtensions.hasStepDefinition as jest.Mock
    ).mockImplementation((id: string) => id === 'integration.parallelSettledNeverPoll');

    const yaml = `
steps:
  - name: materialize_workspaces
    type: parallel
    mode: settled
    branch-timeout: '100ms'
    branches:
      - name: cortex
        steps:
          - name: hydrate_cortex
            type: data.set
            with:
              notification: 'cortex-fragment'
      - name: memory
        steps:
          - name: hydrate_memory
            type: integration.parallelSettledNeverPoll
            with: {}
      - name: decision_trees
        steps:
          - name: hydrate_decision_trees
            type: data.set
            with:
              notification: 'trees-fragment'
  - name: compose_prompt
    type: data.set
    with:
      cortex: '{{ steps.hydrate_cortex.output.notification }}'
      memory: '{{ steps.hydrate_memory.output.notification }}'
      decisionTrees: '{{ steps.hydrate_decision_trees.output.notification }}'
`;
    jest.clearAllMocks();
    await fixture.runWorkflow({ workflowYaml: yaml });
    // The poll branch parks the execution in WAITING with a resume scheduled a
    // full poll interval out. Advancing the clock to that deadline also carries it
    // past the branch's `branch-timeout`, which is what ends the branch.
    await fixture.resumeWorkflowAtScheduledTime();
    await driveToTerminal(fixture);
  });

  it('completes the workflow execution (does not fail it)', () => {
    // (c)/(d) A timed-out branch under `settled` must not fail the workflow either.
    expect(getExecution(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
  });

  it('completes the parallel step while reporting the timed-out branch', () => {
    const [parallel] = stepExecutionsFor(fixture, 'materialize_workspaces');
    expect(parallel.status).toBe(ExecutionStatus.COMPLETED);

    const aggregate = parallel.output as AggregateOutput;
    expect(aggregate).toMatchObject({ total: 3, succeeded: 2, failed: 1, status: 'failed' });
    expect(aggregate.branches?.memory.status).toBe('timed_out');
    expect(aggregate.branches?.cortex.status).toBe('completed');
    expect(aggregate.branches?.decision_trees.status).toBe('completed');
  });

  it('records the timed-out branch step as TIMED_OUT, not left RUNNING/WAITING', () => {
    const branchExecutions = stepExecutionsFor(fixture, 'hydrate_memory');
    expect(branchExecutions.length).toBeGreaterThan(0);
    expect(branchExecutions.every((se) => se.status === ExecutionStatus.TIMED_OUT)).toBe(true);
  });

  it('runs the step after the parallel and reads the successful branches only', () => {
    // (c) The timed-out branch never wrote an output at all, so the downstream
    // read is empty — the case the compose step must cover for itself.
    const compose = stepOutput<ComposeOutput>(fixture, 'compose_prompt');
    expect(compose.cortex).toBe('cortex-fragment');
    expect(compose.decisionTrees).toBe('trees-fragment');
    expect(compose.memory).toBeFalsy();
  });
});