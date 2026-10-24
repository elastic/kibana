/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowResumeNotAppliedError } from '@kbn/workflows/common/errors';
import { resumeWaitingWorkflowExecution } from '../../server/execution_functions/resume_waiting_workflow_execution';
import { WorkflowRunFixture } from '../workflow_run_fixture';

describe.each([
  ['waitForInput', { choice: 'first' }, { choice: 'second' }, { choice: 'second' }],
  ['waitForApproval', { approved: false }, { approved: true }, { approved: true }],
])(
  'a %s response whose handoff fails',
  (stepType, firstResponse, secondResponse, appliedResponse) => {
    let fixture: WorkflowRunFixture;
    const execution = () => {
      const document = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      if (!document) throw new Error('Expected persisted execution');
      return document;
    };
    const gateStep = () =>
      Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values()).find(
        (step) => step.stepId === 'gate'
      );
    const respond = (input: Record<string, unknown>, handOff: () => Promise<void>) =>
      resumeWaitingWorkflowExecution(
        {
          workflowExecutionRepository: fixture.workflowExecutionRepositoryMock,
          workflowTaskManager: { isResumeInProgress: async () => false },
          internalResumeWorkflowExecution: handOff,
          assertLicensed: async () => {},
          resolveResumedBy: async () => 'analyst',
          logger: loggingSystemMock.createLogger(),
          retryDelaysMs: [],
        },
        {
          executionId: 'fake_workflow_execution_id',
          spaceId: 'fake_space_id',
          input,
          request: fixture.fakeKibanaRequest,
        }
      );

    beforeEach(async () => {
      fixture = new WorkflowRunFixture();
      const repository = fixture.workflowExecutionRepositoryMock;
      const update = repository.updateWorkflowExecution.bind(repository);
      jest.spyOn(repository, 'updateWorkflowExecution').mockImplementation((patch, options) => {
        // Model ES context merging: an omitted resumeInput does not remove the persisted key.
        const previous = patch.id ? repository.workflowExecutions.get(patch.id) : undefined;
        return update(
          patch.context === undefined
            ? patch
            : { ...patch, context: { ...previous?.context, ...patch.context } },
          options
        );
      });
      await fixture.runWorkflow({
        workflowYaml: `
steps:
  - name: gate
    type: ${stepType}
    timeout: 1h
    with:
      message: Continue?
  - name: after
    type: console
    with:
      message: finished
`,
      });
    });

    it('is taken back, so a later response is the one applied', async () => {
      expect(execution().status).toBe(ExecutionStatus.WAITING_FOR_INPUT);

      await expect(
        respond(firstResponse, async () => {
          throw new Error('the API key could not be granted');
        })
      ).rejects.toBeInstanceOf(WorkflowResumeNotAppliedError);

      expect(execution().status).toBe(ExecutionStatus.WAITING_FOR_INPUT);
      expect(execution().context?.resumeInput).toBeNull();

      // A wake-up arriving now finds no response and parks the step again.
      expect(await fixture.resumeWorkflow()).toEqual({ retryAt: expect.any(Date) });
      expect(gateStep()?.status).toBe(ExecutionStatus.WAITING_FOR_INPUT);

      await expect(respond(secondResponse, async () => {})).resolves.toEqual({
        resumedBy: 'analyst',
      });
      // The runner the successful handoff would have woken.
      await fixture.resumeWorkflow();

      expect(execution().status).toBe(ExecutionStatus.COMPLETED);
      expect(gateStep()?.output).toEqual(
        expect.objectContaining({ response: appliedResponse, respondedBy: 'analyst' })
      );
    });
  }
);
