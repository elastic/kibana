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
import { FakeConnectors } from '../mocks/actions_plugin_mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

describe('workflow with while', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeEach(async () => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  describe('basic while loop with iteration-based condition', () => {
    const maxIterations = 3;

    function buildYaml() {
      return `
steps:
  - name: poll_loop
    type: while
    condition: \${{ while.iteration < ${maxIterations} }}
    max-iterations: 10
    steps:
      - name: inner_step
        type: slack
        connector-id: ${FakeConnectors.slack1.name}
        with:
          message: 'iteration:{{while.iteration}}'
`;
    }

    it('should complete successfully', async () => {
      await workflowRunFixture.runWorkflow({ workflowYaml: buildYaml() });
      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution?.error).toBeUndefined();
      expect(execution?.scopeStack).toEqual([]);
    });

    it('should execute the inner step the expected number of times', async () => {
      await workflowRunFixture.runWorkflow({ workflowYaml: buildYaml() });
      const innerStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'inner_step');
      expect(innerStepExecutions.length).toBe(maxIterations);
    });

    it('should pass the correct while.iteration to the inner step', async () => {
      await workflowRunFixture.runWorkflow({ workflowYaml: buildYaml() });
      for (let i = 0; i < maxIterations; i++) {
        expect(workflowRunFixture.unsecuredActionsClientMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            id: FakeConnectors.slack1.id,
            params: { message: `iteration:${i}` },
          })
        );
      }
    });
  });

  describe('max-iterations limit', () => {
    it('should stop at max-iterations even when condition is still true', async () => {
      const yaml = `
steps:
  - name: bounded_loop
    type: while
    condition: \${{ while.iteration < 100 }}
    max-iterations: 3
    steps:
      - name: inner_step
        type: slack
        connector-id: ${FakeConnectors.slack1.name}
        with:
          message: 'iter:{{while.iteration}}'
`;
      await workflowRunFixture.runWorkflow({ workflowYaml: yaml });
      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);

      const innerStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'inner_step');
      expect(innerStepExecutions.length).toBe(3);
    });

    it('should fail when on-limit is set to fail', async () => {
      const yaml = `
steps:
  - name: failing_loop
    type: while
    condition: \${{ while.iteration < 100 }}
    max-iterations:
      limit: 2
      on-limit: fail
    steps:
      - name: inner_step
        type: slack
        connector-id: ${FakeConnectors.slack1.name}
        with:
          message: 'iter:{{while.iteration}}'
`;
      await workflowRunFixture.runWorkflow({ workflowYaml: yaml });
      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.FAILED);
      expect(execution?.error).toBeDefined();
    });
  });

  describe('condition evaluates to false on first check (single iteration)', () => {
    it('should run exactly one iteration (do-while semantics)', async () => {
      const yaml = `
steps:
  - name: once_loop
    type: while
    condition: \${{ false }}
    max-iterations: 10
    steps:
      - name: inner_step
        type: slack
        connector-id: ${FakeConnectors.slack1.name}
        with:
          message: 'should run once'
`;
      await workflowRunFixture.runWorkflow({ workflowYaml: yaml });
      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);

      const innerStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'inner_step');
      expect(innerStepExecutions.length).toBe(1);
    });
  });

  describe('nested while loops', () => {
    const outerMax = 2;
    const innerMax = 3;

    function buildNestedYaml() {
      return `
steps:
  - name: outer_loop
    type: while
    condition: \${{ while.iteration < ${outerMax} }}
    max-iterations: 10
    steps:
      - name: inner_loop
        type: while
        condition: \${{ while.iteration < ${innerMax} }}
        max-iterations: 10
        steps:
          - name: leaf_step
            type: slack
            connector-id: ${FakeConnectors.slack1.name}
            with:
              message: 'outer:{{steps.outer_loop.iteration}};inner:{{while.iteration}}'
`;
    }

    it('should complete successfully', async () => {
      await workflowRunFixture.runWorkflow({ workflowYaml: buildNestedYaml() });
      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution?.error).toBeUndefined();
    });

    it('should execute the leaf step outer*inner times', async () => {
      await workflowRunFixture.runWorkflow({ workflowYaml: buildNestedYaml() });
      const leafStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'leaf_step');
      expect(leafStepExecutions.length).toBe(outerMax * innerMax);
    });

    it('should pass correct outer and inner iteration values', async () => {
      await workflowRunFixture.runWorkflow({ workflowYaml: buildNestedYaml() });
      for (let outer = 0; outer < outerMax; outer++) {
        for (let inner = 0; inner < innerMax; inner++) {
          expect(workflowRunFixture.unsecuredActionsClientMock.execute).toHaveBeenCalledWith(
            expect.objectContaining({
              id: FakeConnectors.slack1.id,
              params: { message: `outer:${outer};inner:${inner}` },
            })
          );
        }
      }
    });
  });

  describe('while with step after the loop', () => {
    it('should execute the step after the while loop completes', async () => {
      const yaml = `
steps:
  - name: loop
    type: while
    condition: \${{ while.iteration < 2 }}
    max-iterations: 5
    steps:
      - name: loop_body
        type: slack
        connector-id: ${FakeConnectors.slack1.name}
        with:
          message: 'loop iter:{{while.iteration}}'
  - name: after_loop
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'done'
`;
      await workflowRunFixture.runWorkflow({ workflowYaml: yaml });
      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);

      const afterLoopExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'after_loop');
      expect(afterLoopExecutions.length).toBe(1);
      expect((afterLoopExecutions[0].input as JsonObject).message).toBe('done');
    });
  });

  describe('while inside foreach', () => {
    it('should execute correctly with mixed nesting', async () => {
      const items = ['a', 'b'];
      const whileMax = 2;
      const yaml = `
consts:
  items: '${JSON.stringify(items)}'
steps:
  - name: outer_foreach
    foreach: '{{consts.items}}'
    type: foreach
    steps:
      - name: inner_while
        type: while
        condition: \${{ while.iteration < ${whileMax} }}
        max-iterations: 10
        steps:
          - name: leaf
            type: slack
            connector-id: ${FakeConnectors.slack1.name}
            with:
              message: 'item:{{foreach.item}};iter:{{while.iteration}}'
`;
      await workflowRunFixture.runWorkflow({ workflowYaml: yaml });
      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);

      const leafExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'leaf');
      expect(leafExecutions.length).toBe(items.length * whileMax);

      for (const item of items) {
        for (let i = 0; i < whileMax; i++) {
          expect(workflowRunFixture.unsecuredActionsClientMock.execute).toHaveBeenCalledWith(
            expect.objectContaining({
              id: FakeConnectors.slack1.id,
              params: { message: `item:${item};iter:${i}` },
            })
          );
        }
      }
    });
  });
});
