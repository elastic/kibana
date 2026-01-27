/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { FakeConnectors } from '../mocks/actions_plugin.mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

describe('when cancellation requested', () => {
  let workflowRunFixture: WorkflowRunFixture;
  let outerArray = ['outer1', 'outer2', 'outer3', 'outer4'];
  let runWorkflowPromise: Promise<void>;
  let requestCancellationPromise: Promise<void>;

  beforeAll(async () => {
    workflowRunFixture = new WorkflowRunFixture();
    outerArray = ['outer1', 'outer2', 'outer3', 'outer4'];
  });

  const workflowYaml = `
consts:
  outerForeachArray: '${JSON.stringify(outerArray)}'
steps:
  - name: outerForeachStep
    foreach: '{{consts.outerForeachArray}}'
    type: foreach
    steps:
      - name: outerForeachChildConnectorStep
        type: ${FakeConnectors.slow_1sec_inference.actionTypeId}
        connector-id: ${FakeConnectors.slow_1sec_inference.name}
        with:
          message: 'Foreach item: {{foreach.item}}; Foreach index: {{foreach.index}}; Foreach total: {{foreach.total}}'
      
      - name: anotherStep
        type: ${FakeConnectors.slack1.actionTypeId}
        connector-id: ${FakeConnectors.slack1.name}
        with:
          message: dummy
      
`;

  describe('cancellation triggered by user', () => {
    beforeAll(() => {
      runWorkflowPromise = workflowRunFixture.runWorkflow({
        workflowYaml,
      });

      requestCancellationPromise = (async function () {
        while (true) {
          const outerForeachStep = Array.from(
            workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
          ).find((se) => se.stepId === 'outerForeachStep');
          if (outerForeachStep?.state?.index === 2) {
            const workflowExecutionDoc =
              workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
                'fake_workflow_execution_id'
              )!;
            workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.set(
              workflowExecutionDoc.id,
              {
                ...workflowExecutionDoc,
                cancelRequested: true,
              }
            );

            break;
          }

          await new Promise<void>((resolve) => setTimeout(() => resolve(), 100));
        }
      })();
    });

    it('should successfully execute workflow', async () => {
      await Promise.all([runWorkflowPromise, requestCancellationPromise]);
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.CANCELLED);
      expect(workflowExecutionDoc?.error).toBe(undefined);
      expect(workflowExecutionDoc?.scopeStack).not.toEqual([]);
    });

    it('should have correct amount of outerForeachChildConnectorStep executions', async () => {
      await Promise.all([runWorkflowPromise, requestCancellationPromise]);
      const outerForeachChildConnectorStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'outerForeachChildConnectorStep');
      expect(outerForeachChildConnectorStepExecutions.length).toBe(3);
    });
  });

  describe('cancellation triggered by task', () => {
    beforeAll(() => {
      runWorkflowPromise = workflowRunFixture.runWorkflow({
        workflowYaml,
      });

      requestCancellationPromise = (async function () {
        while (true) {
          const outerForeachStep = Array.from(
            workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
          ).find((se) => se.stepId === 'outerForeachStep');
          if (outerForeachStep?.state?.index === 2) {
            workflowRunFixture.taskAbortController.abort();
            break;
          }

          await new Promise<void>((resolve) => setTimeout(() => resolve(), 100));
        }
      })();
    });

    it('should successfully execute workflow', async () => {
      await Promise.all([runWorkflowPromise, requestCancellationPromise]);
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.CANCELLED);
      expect(workflowExecutionDoc?.cancelRequested).toBe(true);
      expect(workflowExecutionDoc?.cancellationReason).toBe('Task aborted');
      expect(workflowExecutionDoc?.error).toBe(undefined);
      expect(workflowExecutionDoc?.scopeStack).not.toEqual([]);
    });

    it('should have correct amount of outerForeachChildConnectorStep executions', async () => {
      await Promise.all([runWorkflowPromise, requestCancellationPromise]);
      const outerForeachChildConnectorStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'outerForeachChildConnectorStep');
      expect(outerForeachChildConnectorStepExecutions.length).toBe(3);
    });
  });
});
