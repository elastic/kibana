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

describe('single step run tests', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeAll(() => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  describe('container like steps', () => {
    describe('nested foreach step', () => {
      const inferenceResponse = [
        ['outerItem1', 'outerItem2'],
        ['outerItem3', 'outerItem4'],
      ];
      const overridenOuterForeachItem = ['overriden1', 'overriden2'];
      const overridenOuterForeachIndex = 200;

      beforeAll(async () => {
        const workflowYaml = `
steps:
  - name: step1
    type: ${FakeConnectors.echo_inference.actionTypeId}
    connector-id: ${FakeConnectors.echo_inference.name}
    with:
      message: '${JSON.stringify(inferenceResponse)}'

  - name: outerForeachStep
    foreach: '{{steps.step1.output[0].result}}'
    type: foreach
    steps:
      - name: innerForeachStep
        foreach: '{{foreach.item}}'
        type: foreach
        steps:
          - name: innerForeachChildConnectorStep
            type: slack
            connector-id: ${FakeConnectors.slack2.name}
            with:
              message: 'OuterForeach index: {{steps.outerForeachStep.index}}; InnerForeach item: {{foreach.item}}; InnerForeach index: {{foreach.index}}; InnerForeach total: {{foreach.total}}'
`;
        await workflowRunFixture.runSingleStep({
          workflowYaml,
          stepId: 'innerForeachStep',
          contextOverride: {
            foreach: {
              item: overridenOuterForeachItem,
            },
            steps: {
              outerForeachStep: {
                index: overridenOuterForeachIndex,
              },
            },
          },
        });
      });

      it('should run atomic step successfully', async () => {
        const workflowExecutionDoc =
          workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
            'fake_workflow_execution_id'
          );
        expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.COMPLETED);
        expect(workflowExecutionDoc?.error).toBe(undefined);
        expect(workflowExecutionDoc?.scopeStack).toEqual([]);
      });

      it('should execute only requested step and its descendants', () => {
        const stepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        );
        expect(stepExecutions.length).toBe(3);
        expect(stepExecutions.filter((se) => se.stepId === 'innerForeachStep')).toHaveLength(1);
        expect(
          stepExecutions.filter((se) => se.stepId === 'innerForeachChildConnectorStep')
        ).toHaveLength(2);
      });

      it('should call connector for each innerForeachChildConnectorStep with the correct params', () => {
        overridenOuterForeachItem.forEach((item, index) => {
          expect(workflowRunFixture.unsecuredActionsClientMock.execute).toHaveBeenCalledWith(
            expect.objectContaining({
              id: FakeConnectors.slack2.id,
              params: {
                message: `OuterForeach index: ${overridenOuterForeachIndex}; InnerForeach item: ${item}; InnerForeach index: ${index}; InnerForeach total: ${overridenOuterForeachItem.length}`,
              },
            })
          );
        });
      });
    });
  });

  describe('atomic steps', () => {
    beforeAll(async () => {
      await workflowRunFixture.runSingleStep({
        workflowYaml: `
steps:
  - name: step1
    type: ${FakeConnectors.echo_inference.actionTypeId}
    connector-id: ${FakeConnectors.echo_inference.name}
    with:
      input: 'Hi there! Are you alive?'

  - name: step2
    type: ${FakeConnectors.slack1.actionTypeId}
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'Inference result: {{steps.step1.output[0].result}}'

  - name: step3
    type: ${FakeConnectors.slack1.actionTypeId}
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'Finishing workflow execution.'
          `,
        stepId: 'step2',
        contextOverride: {
          steps: {
            step1: {
              output: [{ result: 'I am alive!' }],
            },
          },
        },
      });
    });

    it('should run atomic step successfully', async () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecutionDoc?.error).toBe(undefined);
      expect(workflowExecutionDoc?.scopeStack).toEqual([]);
    });

    it('should execute only the requested step', async () => {
      const stepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      );
      expect(stepExecutions.length).toBe(1);
      expect(stepExecutions[0].stepId).toBe('step2');
    });

    it('should call the connector with the overriden context', () => {
      expect(workflowRunFixture.unsecuredActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: FakeConnectors.slack1.id,
          params: {
            message: `Inference result: I am alive!`,
          },
        })
      );
    });
  });
});
