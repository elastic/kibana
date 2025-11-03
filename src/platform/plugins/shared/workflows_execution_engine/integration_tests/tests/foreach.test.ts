/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonObject } from '@kbn/utility-types';
import { ExecutionStatus } from '@kbn/workflows';
import { FakeConnectors } from '../mocks/actions_plugin.mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

describe('workflow with foreach', () => {
  let workflowRunFixture: WorkflowRunFixture;
  let outerArray: string[];
  let innerArray: string[];

  beforeEach(async () => {
    workflowRunFixture = new WorkflowRunFixture();
    outerArray = ['outer1', 'outer2'];
    innerArray = ['inner1', 'inner2', 'inner3'];
  });

  function buildYaml() {
    return `
consts:
  outerForeachArray: '${JSON.stringify(outerArray)}'
steps:
  - name: outerForeachStep
    foreach: '{{consts.outerForeachArray}}'
    type: foreach
    steps:
      - name: outerForeachChildConnectorStep
        type: slack
        connector-id: ${FakeConnectors.slack1.name}
        with:
          message: 'Foreach item: {{foreach.item}}; Foreach index: {{foreach.index}}; Foreach total: {{foreach.total}}'
      - name: innerForeachStep
        foreach: '{{inputs.innerArray}}'
        type: foreach
        steps:
          - name: innerForeachChildConnectorStep
            type: slack
            connector-id: ${FakeConnectors.slack2.name}
            with:
              message: 'OuterForeach index: {{steps.outerForeachStep.index}}; InnerForeach item: {{foreach.item}}; InnerForeach index: {{foreach.index}}; InnerForeach total: {{foreach.total}}'
`;
  }

  it('should successfully execute workflow', async () => {
    await workflowRunFixture.runWorkflow({
      workflowYaml: buildYaml(),
      inputs: { innerArray },
    });
    const workflowExecutionDoc =
      workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
    expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.COMPLETED);
    expect(workflowExecutionDoc?.error).toBe(undefined);
    expect(workflowExecutionDoc?.scopeStack).toEqual([]);
  });

  describe('outer foreach checks', () => {
    it('should have correct amount of outerForeachChildConnectorStep executions', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: buildYaml(),
        inputs: { innerArray },
      });
      const outerForeachChildConnectorStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'outerForeachChildConnectorStep');
      expect(outerForeachChildConnectorStepExecutions.length).toBe(2);
      outerArray.forEach((item, index) => {
        expect((outerForeachChildConnectorStepExecutions[index].input as JsonObject).message).toBe(
          `Foreach item: ${item}; Foreach index: ${index}; Foreach total: 2`
        );
        expect(outerForeachChildConnectorStepExecutions[index].status).toBe(
          ExecutionStatus.COMPLETED
        );
      });
    });

    it('should invoke connector with correct foreach context in outerForeachChildConnectorStep', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: buildYaml(),
        inputs: { innerArray },
      });
      outerArray.forEach((item, index) => {
        expect(workflowRunFixture.unsecuredActionsClientMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            id: FakeConnectors.slack1.id,
            params: {
              message: `Foreach item: ${item}; Foreach index: ${index}; Foreach total: 2`,
            },
          })
        );
      });
    });
  });

  describe('inner foreach checks', () => {
    it('should have correct amount of innerForeachChildConnectorStep executions', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: buildYaml(),
        inputs: { innerArray },
      });
      const stepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'innerForeachChildConnectorStep');
      expect(stepExecutions.length).toBe(6);
    });

    it('should have correct amount of innerForeachStep executions', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: buildYaml(),
        inputs: { innerArray },
      });
      const stepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'innerForeachStep');
      expect(stepExecutions.length).toBe(outerArray.length);
    });

    it('should invoke connector with correct foreach context in innerForeachChildConnectorStep', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: buildYaml(),
        inputs: { innerArray },
      });

      outerArray.forEach((_, outerIndex) => {
        innerArray.forEach((innerItem, innerIndex) => {
          expect(workflowRunFixture.unsecuredActionsClientMock.execute).toHaveBeenCalledWith(
            expect.objectContaining({
              id: FakeConnectors.slack2.id,
              params: {
                message: `OuterForeach index: ${outerIndex}; InnerForeach item: ${innerItem}; InnerForeach index: ${innerIndex}; InnerForeach total: 3`,
              },
            })
          );
        });
      });
    });
  });
});
