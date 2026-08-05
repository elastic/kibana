/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { FakeConnectors } from '../mocks/actions_plugin_mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

const PARENT_EXECUTION_ID = 'fake_workflow_execution_id';
const SPACE_ID = 'fake_space_id';
const COVERAGE_GAP_WORKFLOW_ID = 'child-coverage-gap';
const CORRELATION_WORKFLOW_ID = 'child-correlation';
const CHILD_WORKFLOW_IDS = [COVERAGE_GAP_WORKFLOW_ID, CORRELATION_WORKFLOW_ID];

const childExecutionId = (workflowId: string) => `child-exec-${workflowId}`;

const getExecution = (fixture: WorkflowRunFixture) =>
  fixture.workflowExecutionRepositoryMock.workflowExecutions.get(PARENT_EXECUTION_ID);

const stepExecutionsFor = (fixture: WorkflowRunFixture, stepId: string) =>
  Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values()).filter(
    (se) => se.stepId === stepId
  );

/**
 * A `workflow.execute` branch parks in WAITING_FOR_CHILD without writing its own
 * `resumeAt`, so the parallel node re-ticks on its floor rather than a timer.
 * Pump `resumeWorkflow()` the same way the timer-based parallel tests do.
 */
const driveToTerminal = async (fixture: WorkflowRunFixture, maxGuard = 10): Promise<void> => {
  let guard = 0;
  while (getExecution(fixture)?.status === ExecutionStatus.WAITING && guard < maxGuard) {
    await fixture.resumeWorkflow();
    guard += 1;
  }
};

const childWorkflowSource = (workflowId: string) => ({
  name: workflowId,
  description: workflowId,
  enabled: true,
  valid: true,
  tags: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  createdBy: 'system',
  lastUpdatedBy: 'system',
  yaml: '',
  definition: {
    version: '1',
    name: workflowId,
    enabled: true,
    triggers: [{ type: 'manual', enabled: true }],
    steps: [
      {
        name: 'childStep',
        type: 'console',
        with: { message: workflowId },
      },
    ],
  },
});

const workflowYaml = `
steps:
  - name: fanOut
    type: parallel
    branches:
      - name: coverageGap
        steps:
          - name: coverageGapChild
            type: workflow.execute
            with:
              workflow-id: ${COVERAGE_GAP_WORKFLOW_ID}
              inputs:
                reportId: report-1
      - name: correlation
        steps:
          - name: correlationChild
            type: workflow.execute
            with:
              workflow-id: ${CORRELATION_WORKFLOW_ID}
              inputs:
                reportId: report-1
  - name: afterJoin
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'joined'
`;

/**
 * Wires the child-workflow lookup (an ES search behind `WorkflowRepository`) and
 * makes `executeWorkflow` register a RUNNING child execution the sync strategy
 * can later read back, standing in for a real child run.
 */
const createFixture = () => {
  const fixture = new WorkflowRunFixture();

  const esClient = fixture.dependencies.coreStart.elasticsearch.client.asInternalUser;
  (esClient.search as unknown as jest.Mock).mockImplementation(async (params: unknown) => {
    const serializedQuery = JSON.stringify(params ?? {});
    const workflowId = CHILD_WORKFLOW_IDS.find((id) => serializedQuery.includes(id));
    if (!workflowId) {
      return { hits: { hits: [] } };
    }
    return {
      hits: { hits: [{ _id: workflowId, _source: childWorkflowSource(workflowId) }] },
    };
  });

  (fixture.workflowsExecutionEngineMock.executeWorkflow as jest.Mock).mockImplementation(
    async (workflow: WorkflowExecutionEngineModel) => {
      const workflowExecutionId = childExecutionId(workflow.id);
      await fixture.workflowExecutionRepositoryMock.createWorkflowExecution({
        id: workflowExecutionId,
        spaceId: SPACE_ID,
        workflowId: workflow.id,
        status: ExecutionStatus.RUNNING,
        createdAt: new Date().toISOString(),
      });
      return { workflowExecutionId };
    }
  );

  return fixture;
};

const completeChild = async (fixture: WorkflowRunFixture, workflowId: string) => {
  await fixture.workflowExecutionRepositoryMock.updateWorkflowExecution({
    id: childExecutionId(workflowId),
    status: ExecutionStatus.COMPLETED,
    context: { output: { ranFor: workflowId } },
  } as never);
};

describe('parallel step fanning out to sync sub-workflows', () => {
  describe('while both children are still running', () => {
    let fixture: WorkflowRunFixture;

    beforeAll(async () => {
      fixture = createFixture();
      await fixture.runWorkflow({ workflowYaml });
    });

    it('parks the parent execution', () => {
      expect(getExecution(fixture)?.status).toBe(ExecutionStatus.WAITING);
    });

    it('starts both children concurrently', () => {
      expect(fixture.workflowsExecutionEngineMock.executeWorkflow).toHaveBeenCalledTimes(2);
    });

    it('starts each child as a sync invocation', () => {
      expect(fixture.workflowsExecutionEngineMock.executeWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ parentWorkflowInvocation: 'sync' }),
        expect.anything()
      );
    });

    it('does not run the step after the join', () => {
      expect(stepExecutionsFor(fixture, 'afterJoin')).toHaveLength(0);
    });
  });

  describe('after both children complete', () => {
    let fixture: WorkflowRunFixture;

    beforeAll(async () => {
      fixture = createFixture();
      await fixture.runWorkflow({ workflowYaml });
      await completeChild(fixture, COVERAGE_GAP_WORKFLOW_ID);
      await completeChild(fixture, CORRELATION_WORKFLOW_ID);
      await driveToTerminal(fixture);
    });

    it('completes the parent execution', () => {
      expect(getExecution(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
    });

    it('runs the step after the join exactly once', () => {
      expect(stepExecutionsFor(fixture, 'afterJoin')).toHaveLength(1);
    });
  });

  describe('when one child fails', () => {
    let fixture: WorkflowRunFixture;

    beforeAll(async () => {
      fixture = createFixture();
      await fixture.runWorkflow({ workflowYaml });
      await completeChild(fixture, COVERAGE_GAP_WORKFLOW_ID);
      await fixture.workflowExecutionRepositoryMock.updateWorkflowExecution({
        id: childExecutionId(CORRELATION_WORKFLOW_ID),
        status: ExecutionStatus.FAILED,
        error: { type: 'Error', message: 'correlation child blew up' },
      } as never);
      await driveToTerminal(fixture);
    });

    it('fails the parent execution', () => {
      expect(getExecution(fixture)?.status).toBe(ExecutionStatus.FAILED);
    });
  });
});
