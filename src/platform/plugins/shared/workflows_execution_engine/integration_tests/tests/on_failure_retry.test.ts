/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';
import { ExecutionStatus } from '@kbn/workflows';
import { FakeConnectors } from '../mocks/actions_plugin.mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

describe('workflow with retry', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeAll(async () => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  let delay: string;
  let retryCondition: boolean | string | undefined;

  describe.each(['step level', 'workflow level'])('retry is on %s', (testCase) => {
    function buildYaml(): string {
      if (testCase === 'step level') {
        return `
steps:
  - name: constantlyFailingStep
    type: ${FakeConnectors.constantlyFailing.actionTypeId}
    connector-id: ${FakeConnectors.constantlyFailing.name}
    on-failure:
      retry:
        max-attempts: 2
        delay: ${delay}
        ${retryCondition !== undefined ? `condition: ${retryCondition}` : ''}
    with:
      message: 'Hi there! Are you alive?'

  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final message!'
`;
      }
      return `
settings:
  on-failure:
    retry:
      max-attempts: 2
      ${retryCondition !== undefined ? `condition: ${retryCondition}` : ''}
      delay: ${delay}
steps:
  - name: constantlyFailingStep
    type: ${FakeConnectors.constantlyFailing.actionTypeId}
    connector-id: ${FakeConnectors.constantlyFailing.name}

    with:
      message: 'Hi there! Are you alive?'

  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final message!'
`;
    }

    describe.each([undefined, true, '${{error.type == "Error"}}'])(
      'performs retries when condition is %s',
      (conditionTestCase) => {
        beforeAll(async () => {
          retryCondition = conditionTestCase;
        });

        describe('when delay is short', () => {
          beforeAll(async () => {
            delay = '1s';
          });

          beforeAll(async () => {
            jest.clearAllMocks();
            await workflowRunFixture.runWorkflow({
              workflowYaml: buildYaml(),
            });
          });

          it('should fail workflow', async () => {
            const workflowExecutionDoc =
              workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
                'fake_workflow_execution_id'
              );
            expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.FAILED);
            expect(workflowExecutionDoc?.error).toEqual({
              type: 'Error',
              message: 'Error: Constantly failing connector',
            });
            expect(workflowExecutionDoc?.scopeStack).toEqual([]);
          });

          it('should have correct workflow duration', async () => {
            const workflowExecutionDoc =
              workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
                'fake_workflow_execution_id'
              );
            // Duration should be at least 2s (2 retries with 1s delay each)
            expect(workflowExecutionDoc?.duration).toBeGreaterThanOrEqual(1999);
            // But less than 10s to avoid test timeout
            expect(workflowExecutionDoc?.duration).toBeLessThan(2100);
          });

          it('should have 3 executions of constantlyFailingStep (1 initial + 2 retries)', async () => {
            const stepExecutions = Array.from(
              workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
            ).filter(
              (se) =>
                se.stepId === 'constantlyFailingStep' &&
                se.stepType === FakeConnectors.constantlyFailing.actionTypeId
            );
            expect(stepExecutions.length).toBe(3);
            stepExecutions.forEach((se) => {
              expect(se.status).toBe(ExecutionStatus.FAILED);
              expect(se.error).toEqual({
                type: 'Error',
                message: 'Error: Constantly failing connector',
              });
            });
          });

          it('should maintain correct delay between retries', async () => {
            const stepExecutions = Array.from(
              workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
            ).filter(
              (se) =>
                se.stepId === 'constantlyFailingStep' &&
                se.stepType === FakeConnectors.constantlyFailing.actionTypeId
            );
            expect(stepExecutions.length).toBe(3);
            const firstExecution = stepExecutions[0];
            const secondExecution = stepExecutions[1];
            const thirdExecution = stepExecutions[2];

            const firstToSecondDelay =
              new Date(secondExecution.startedAt).getTime() -
              new Date(firstExecution.finishedAt!).getTime();
            const secondToThirdDelay =
              new Date(thirdExecution.startedAt).getTime() -
              new Date(secondExecution.finishedAt!).getTime();

            // Each delay should be at least 1000ms (1s)
            expect(firstToSecondDelay).toBeGreaterThanOrEqual(1000);
            expect(secondToThirdDelay).toBeGreaterThanOrEqual(1000);
          });

          it('should not execute finalStep', async () => {
            const stepExecutions = Array.from(
              workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
            ).filter((se) => se.stepId === 'finalStep');
            expect(stepExecutions.length).toBe(0);
          });
        });

        describe('when delay is long', () => {
          beforeAll(async () => {
            delay = '10m';
          });

          beforeAll(async () => {
            jest.clearAllMocks();
            await workflowRunFixture.runWorkflow({
              workflowYaml: buildYaml(),
            });
          });

          it('should put workflow in waiting state', async () => {
            const workflowExecutionDoc =
              workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
                'fake_workflow_execution_id'
              );
            expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.WAITING);
            expect(workflowExecutionDoc?.error).toBe(undefined);
          });

          it('should have correct currentNodeId in workflow execution', async () => {
            const workflowExecutionDoc =
              workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
                'fake_workflow_execution_id'
              );
            expect(workflowExecutionDoc?.currentNodeId).toBe('enterRetry_constantlyFailingStep');
          });

          it('should create resume task', async () => {
            expect(workflowRunFixture.taskManagerMock.schedule).toHaveBeenCalledTimes(1);
            const scheduleCalls = (workflowRunFixture.taskManagerMock.schedule as jest.Mock).mock
              .calls;
            expect(scheduleCalls).toHaveLength(1);

            const scheduleCall = scheduleCalls[0][0] as ConcreteTaskInstance;
            expect(scheduleCall).toEqual(
              expect.objectContaining({
                taskType: 'workflow:resume',
                params: expect.objectContaining({
                  workflowRunId: 'fake_workflow_execution_id',
                  spaceId: 'fake_space_id',
                }),
              })
            );

            // Check that nextRunAt is within expected boundaries (10 minutes from now)
            const nextRunAt = new Date(scheduleCall.runAt);
            const now = new Date();
            const expectedMinTime = new Date(now.getTime() + 9.9 * 60 * 1000); // 9.9 minutes
            const expectedMaxTime = new Date(now.getTime() + 10.1 * 60 * 1000); // 10.1 minutes

            expect(nextRunAt.getTime()).toBeGreaterThan(expectedMinTime.getTime());
            expect(nextRunAt.getTime()).toBeLessThan(expectedMaxTime.getTime());
          });
        });
      }
    );

    describe.each(['${{error.type == "SomeOtherError"}}', '${{false}}'])(
      'does not perform retries when condition is %s',
      (conditionTestCase) => {
        beforeAll(async () => {
          retryCondition = conditionTestCase;
        });

        beforeAll(async () => {
          jest.clearAllMocks();
          await workflowRunFixture.runWorkflow({
            workflowYaml: buildYaml(),
          });
        });

        it('should fail workflow', async () => {
          const workflowExecutionDoc =
            workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
              'fake_workflow_execution_id'
            );
          expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.FAILED);
          expect(workflowExecutionDoc?.error).toEqual({
            type: 'Error',
            message: 'Error: Constantly failing connector',
          });
          expect(workflowExecutionDoc?.scopeStack).toEqual([]);
        });

        it('should have correct workflow duration', async () => {
          const workflowExecutionDoc =
            workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
              'fake_workflow_execution_id'
            );
          // Duration should be at least 2s (2 retries with 1s delay each)
          // But less than 10s to avoid test timeout
          expect(workflowExecutionDoc?.duration).toBeLessThan(10);
        });

        it('should have 1 executions of constantlyFailingStep', async () => {
          const stepExecutions = Array.from(
            workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
          ).filter(
            (se) =>
              se.stepId === 'constantlyFailingStep' &&
              se.stepType === FakeConnectors.constantlyFailing.actionTypeId
          );
          expect(stepExecutions.length).toBe(1);
          stepExecutions.forEach((se) => {
            expect(se.status).toBe(ExecutionStatus.FAILED);
            expect(se.error).toEqual({
              type: 'Error',
              message: 'Error: Constantly failing connector',
            });
          });
        });

        it('should not execute finalStep', async () => {
          const stepExecutions = Array.from(
            workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
          ).filter((se) => se.stepId === 'finalStep');
          expect(stepExecutions.length).toBe(0);
        });
      }
    );
  });
});
