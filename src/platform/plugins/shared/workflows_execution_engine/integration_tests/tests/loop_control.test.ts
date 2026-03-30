/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { FakeConnectors } from '../mocks/actions_plugin_mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

describe('workflow loop control (loop.break / loop.continue)', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeEach(() => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  describe('loop.break inside a foreach loop', () => {
    it('should stop iterating and execute the step after the loop', async () => {
      const yaml = `
consts:
  items: '["a","b","c","d","e"]'
steps:
  - name: my_loop
    foreach: '{{consts.items}}'
    type: foreach
    steps:
      - name: stop_early
        type: loop.break
        if: \${{ foreach.index == 2 }}
      - name: loop_body
        type: slack
        connector-id: ${FakeConnectors.slack1.name}
        with:
          message: 'item:{{foreach.item}}'
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
      expect(execution?.error).toBeUndefined();
      expect(execution?.scopeStack).toEqual([]);

      const loopBodyExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'loop_body');
      expect(loopBodyExecutions.length).toBe(2);

      const afterLoopExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'after_loop');
      expect(afterLoopExecutions.length).toBe(1);
    });
  });

  describe('loop.break inside a while loop', () => {
    it('should stop iterating and execute the step after the loop', async () => {
      const yaml = `
steps:
  - name: my_loop
    type: while
    condition: \${{ while.iteration < 100 }}
    max-iterations: 100
    steps:
      - name: stop_at_3
        type: loop.break
        if: \${{ while.iteration == 3 }}
      - name: loop_body
        type: slack
        connector-id: ${FakeConnectors.slack1.name}
        with:
          message: 'iter:{{while.iteration}}'
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
      expect(execution?.error).toBeUndefined();
      expect(execution?.scopeStack).toEqual([]);

      const loopBodyExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'loop_body');
      expect(loopBodyExecutions.length).toBe(3);

      const afterLoopExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'after_loop');
      expect(afterLoopExecutions.length).toBe(1);
    });
  });

  describe('loop.continue inside a foreach loop', () => {
    it('should skip the rest of the iteration body but continue the loop', async () => {
      const yaml = `
consts:
  items: '["a","b","c","d"]'
steps:
  - name: my_loop
    foreach: '{{consts.items}}'
    type: foreach
    steps:
      - name: skip_b
        type: loop.continue
        if: \${{ foreach.item == "b" }}
      - name: loop_body
        type: slack
        connector-id: ${FakeConnectors.slack1.name}
        with:
          message: 'item:{{foreach.item}}'
`;
      await workflowRunFixture.runWorkflow({ workflowYaml: yaml });
      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution?.error).toBeUndefined();
      expect(execution?.scopeStack).toEqual([]);

      const loopBodyExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'loop_body');
      expect(loopBodyExecutions.length).toBe(3);

      expect(workflowRunFixture.unsecuredActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({ params: { message: 'item:a' } })
      );
      expect(workflowRunFixture.unsecuredActionsClientMock.execute).not.toHaveBeenCalledWith(
        expect.objectContaining({ params: { message: 'item:b' } })
      );
      expect(workflowRunFixture.unsecuredActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({ params: { message: 'item:c' } })
      );
      expect(workflowRunFixture.unsecuredActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({ params: { message: 'item:d' } })
      );
    });
  });

  describe('loop.break inside nested loops', () => {
    it('should only break the inner loop while the outer loop continues', async () => {
      const yaml = `
consts:
  outer: '["x","y"]'
  inner: '["1","2","3","4"]'
steps:
  - name: outer_loop
    foreach: '{{consts.outer}}'
    type: foreach
    steps:
      - name: inner_loop
        foreach: '{{consts.inner}}'
        type: foreach
        steps:
          - name: break_inner
            type: loop.break
            if: \${{ foreach.index == 2 }}
          - name: inner_body
            type: slack
            connector-id: ${FakeConnectors.slack1.name}
            with:
              message: 'outer:{{steps.outer_loop.item}};inner:{{foreach.item}}'
`;
      await workflowRunFixture.runWorkflow({ workflowYaml: yaml });
      const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution?.error).toBeUndefined();
      expect(execution?.scopeStack).toEqual([]);

      const innerBodyExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'inner_body');
      expect(innerBodyExecutions.length).toBe(4);
    });
  });

  describe('loop.break inside an if block inside a loop', () => {
    it('should correctly unwind the if scope before exiting the loop', async () => {
      const yaml = `
steps:
  - name: my_loop
    type: while
    condition: \${{ while.iteration < 100 }}
    max-iterations: 100
    steps:
      - name: check
        type: if
        condition: \${{ while.iteration == 2 }}
        steps:
          - name: break_here
            type: loop.break
      - name: loop_body
        type: slack
        connector-id: ${FakeConnectors.slack1.name}
        with:
          message: 'iter:{{while.iteration}}'
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
      expect(execution?.error).toBeUndefined();
      expect(execution?.scopeStack).toEqual([]);

      const loopBodyExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'loop_body');
      expect(loopBodyExecutions.length).toBe(2);

      const afterLoopExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'after_loop');
      expect(afterLoopExecutions.length).toBe(1);
    });
  });

  describe('loop.continue inside a while loop', () => {
    it('should skip the rest of the iteration but re-evaluate the condition', async () => {
      const yaml = `
steps:
  - name: my_loop
    type: while
    condition: \${{ while.iteration < 4 }}
    max-iterations: 10
    steps:
      - name: skip_iter_2
        type: loop.continue
        if: \${{ while.iteration == 2 }}
      - name: loop_body
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
      expect(execution?.error).toBeUndefined();
      expect(execution?.scopeStack).toEqual([]);

      const loopBodyExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'loop_body');
      expect(loopBodyExecutions.length).toBe(3);

      expect(workflowRunFixture.unsecuredActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({ params: { message: 'iter:0' } })
      );
      expect(workflowRunFixture.unsecuredActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({ params: { message: 'iter:1' } })
      );
      expect(workflowRunFixture.unsecuredActionsClientMock.execute).not.toHaveBeenCalledWith(
        expect.objectContaining({ params: { message: 'iter:2' } })
      );
      expect(workflowRunFixture.unsecuredActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({ params: { message: 'iter:3' } })
      );
    });
  });
});
