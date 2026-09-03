/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus, StepCategory } from '@kbn/workflows';
import { createPollServerStepDefinition } from '@kbn/workflows-extensions/server';
import { z } from '@kbn/zod/v4';
import { FakeConnectors } from '../mocks/actions_plugin_mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

const LONG_POLL_MS = 6_000;

const getExecution = (fixture: WorkflowRunFixture) =>
  fixture.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id');

const stepExecutionsFor = (fixture: WorkflowRunFixture, stepId: string) =>
  Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values()).filter(
    (se) => se.stepId === stepId
  );

const driveToTerminal = async (fixture: WorkflowRunFixture, maxGuard = 10): Promise<void> => {
  let guard = 0;
  while (getExecution(fixture)?.status === ExecutionStatus.WAITING && guard < maxGuard) {
    await fixture.resumeWorkflow();
    guard += 1;
  }
};

// Poll step whose number of polls before completion is item-dependent:
// the branch for item `x` needs `pollsByItem[x]` polls before returning output.
const makePollStep = (pollsByItem: Record<string, number>) =>
  createPollServerStepDefinition({
    id: 'integration.reproPoll',
    category: StepCategory.Kibana,
    label: 'Repro poll',
    description: 'Completes after an item-dependent number of polls',
    inputSchema: z.object({ item: z.string() }),
    outputSchema: z.object({ item: z.string(), approved: z.boolean() }),
    poll: async ({ input, state }) => {
      const { item } = input as { item: string };
      const needed = pollsByItem[item] ?? 1;
      const count = (state as { count?: number } | undefined)?.count ?? 0;
      if (count + 1 >= needed) {
        return { output: { item, approved: true } };
      }
      return { state: { count: count + 1 } };
    },
    policy: { strategy: 'fixed', intervalMs: LONG_POLL_MS },
    ceilings: { maxAttempts: 10, maxWaitMs: 120_000 },
  });

const buildFixture = (pollsByItem: Record<string, number>) => {
  const fixture = new WorkflowRunFixture();
  const pollStep = makePollStep(pollsByItem);
  (fixture.dependencies.workflowsExtensions.getStepDefinition as jest.Mock).mockImplementation(
    (id: string) => (id === 'integration.reproPoll' ? pollStep : undefined)
  );
  (fixture.dependencies.workflowsExtensions.hasStepDefinition as jest.Mock).mockImplementation(
    (id: string) => id === 'integration.reproPoll'
  );
  return fixture;
};

const yaml = `
consts:
  items: '["x", "y"]'
steps:
  - name: fanOut
    type: parallel
    foreach: '{{ consts.items }}'
    steps:
      - name: gate
        type: integration.reproPoll
        with:
          item: '{{ foreach.item }}'
  - name: summarize
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: "status={{ steps.fanOut.output.status }};approved={{ steps.fanOut.output.results | map: 'output' | where: 'approved' | size }}"
`;

const summarizeMessage = (fixture: WorkflowRunFixture): string | undefined => {
  const calls = (fixture.unsecuredActionsClientMock.execute as jest.Mock).mock.calls as Array<
    [{ params: { message: string } }]
  >;
  return calls.map(([arg]) => arg.params.message).find((m) => m.startsWith('status='));
};

// Regression coverage for two resume-tick hazards around the parallel aggregate:
//  1. Concurrent branch pre-warms used to double-track a rehydrated output, so
//     the release after `finish()` re-evicted the freshly written aggregate and
//     the next step re-read a stale (pre-flush) doc — rendering nothing.
//  2. `finish()` used to read branch outputs straight from memory, so a branch
//     that settled on an earlier tick (output deferred-evicted on resume) was
//     recorded in the aggregate with an empty output.
describe('parallel aggregate across resume ticks', () => {
  describe('both branches settle on the same resume tick', () => {
    let fixture: WorkflowRunFixture;

    beforeAll(async () => {
      fixture = buildFixture({ x: 2, y: 2 });
      jest.clearAllMocks();
      await fixture.runWorkflow({ workflowYaml: yaml });
      await driveToTerminal(fixture);
    });

    it('completes the workflow', () => {
      expect(getExecution(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
    });

    it('keeps both branch outputs in the aggregate', () => {
      const [agg] = stepExecutionsFor(fixture, 'fanOut');
      const output = agg.output as { results: Array<{ output?: unknown }> };
      expect(output.results.map(({ output: o }) => o)).toEqual([
        { item: 'x', approved: true },
        { item: 'y', approved: true },
      ]);
    });

    it('renders the aggregate downstream', () => {
      expect(summarizeMessage(fixture)).toBe('status=completed;approved=2');
    });
  });

  describe('branches settle on different resume ticks', () => {
    let fixture: WorkflowRunFixture;

    beforeAll(async () => {
      fixture = buildFixture({ x: 2, y: 3 });
      jest.clearAllMocks();
      await fixture.runWorkflow({ workflowYaml: yaml });
      await driveToTerminal(fixture);
    });

    it('completes the workflow', () => {
      expect(getExecution(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
    });

    it('keeps the early branch output in the aggregate', () => {
      const [agg] = stepExecutionsFor(fixture, 'fanOut');
      const output = agg.output as { results: Array<{ output?: unknown }> };
      expect(output.results.map(({ output: o }) => o)).toEqual([
        { item: 'x', approved: true },
        { item: 'y', approved: true },
      ]);
    });

    it('renders the aggregate downstream', () => {
      expect(summarizeMessage(fixture)).toBe('status=completed;approved=2');
    });
  });
});
