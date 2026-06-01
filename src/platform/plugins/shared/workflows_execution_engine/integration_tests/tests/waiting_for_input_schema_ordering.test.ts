/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Regression: nested ai.agent HITL pause drops schema/message/agent_context.
 *
 * Root cause: the workflow-execution doc gains status=WAITING_FOR_INPUT via
 * flushWorkflowDoc(), which is run concurrently (Promise.all) with
 * flushStepChanges(). The poller (waitForWorkflowExecution) can observe the
 * workflow doc BEFORE the step's schema-carrying input lands in the step doc.
 *
 * Fix invariant: flushStepChanges() MUST complete BEFORE the workflow-execution
 * doc is written with status=WAITING_FOR_INPUT.  This test proves that
 * invariant by spying on the workflow-execution repository mock: when
 * updateWorkflowExecution(WAITING_FOR_INPUT) fires, the step repo must already
 * contain the paused step's input (schema/message/agent_context).
 */

import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowRunFixture } from '../workflow_run_fixture';

const CUSTOM_STEP_TYPE = 'test.hitl.approval';

const HITL_SCHEMA = {
  properties: { approve: { type: 'boolean' } },
  type: 'object' as const,
};

const HITL_MESSAGE = 'Approve this action?';

const HITL_AGENT_CONTEXT = {
  intended_tool: 'hitl_approval',
  intended_tool_args: {},
  reasoning: 'approval needed before proceeding',
};

const customStepYaml = `
steps:
  - name: approval
    type: ${CUSTOM_STEP_TYPE}
    with: {}
`;

// Minimal step definition: returns waitingForInput with schema/message/agent_context.
// Type-cast to avoid requiring full zod schema wiring in this integration test.
const customStepDefinition = {
  handler: async () => ({
    waitingForInput: {
      agent_context: HITL_AGENT_CONTEXT,
      message: HITL_MESSAGE,
      schema: HITL_SCHEMA,
    },
  }),
} as unknown as import('@kbn/workflows-extensions/server').ServerStepDefinition;

describe('custom step WAITING_FOR_INPUT: step input must be flushed before workflow status is written', () => {
  let fixture: WorkflowRunFixture;

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    // Register the custom step type so NodesFactory creates a CustomStepImpl.
    (fixture.dependencies.workflowsExtensions.hasStepDefinition as jest.Mock).mockImplementation(
      (type: string) => type === CUSTOM_STEP_TYPE
    );
    (fixture.dependencies.workflowsExtensions.getStepDefinition as jest.Mock).mockImplementation(
      (type: string) => (type === CUSTOM_STEP_TYPE ? customStepDefinition : undefined)
    );
  });

  it('step input (schema/message/agent_context) is already in the step repo when workflow status becomes WAITING_FOR_INPUT', async () => {
    let stepInputAtWaitingMoment: unknown;

    // Capture the original method before installing the spy so we can still
    // delegate to the real mock behaviour (in-memory map update).
    const origUpdate = fixture.workflowExecutionRepositoryMock.updateWorkflowExecution.bind(
      fixture.workflowExecutionRepositoryMock
    );

    // Spy: intercept every write to the workflow-execution doc.  When the
    // write carries status=WAITING_FOR_INPUT, snapshot the step-repo state.
    // Without the fix, flushWorkflowDoc() fires first inside Promise.all so
    // the step input is NOT yet present at this instant.
    jest
      .spyOn(fixture.workflowExecutionRepositoryMock, 'updateWorkflowExecution')
      .mockImplementation(async (update) => {
        if (update.status === ExecutionStatus.WAITING_FOR_INPUT) {
          const stepDocs = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values());
          const pausedStep = stepDocs.find((s) => s.stepId === 'approval');
          stepInputAtWaitingMoment = pausedStep?.input;
        }
        return origUpdate(update);
      });

    await fixture.runWorkflow({ workflowYaml: customStepYaml });

    // Invariant: the paused step's schema/message/agent_context MUST be
    // durable in the step repo BEFORE the workflow status is written as
    // WAITING_FOR_INPUT.  A waiter that polls on this status must therefore
    // find the schema when it subsequently reads the step docs.
    expect(stepInputAtWaitingMoment).toEqual(
      expect.objectContaining({
        agent_context: HITL_AGENT_CONTEXT,
        message: HITL_MESSAGE,
        schema: HITL_SCHEMA,
      })
    );
  });
});
