/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import {
  buildIterationPseudoStep,
  buildIterationVirtualId,
  resolveForeachItem,
} from './build_iteration_pseudo_step';

const createExecution = (
  overrides: Partial<WorkflowExecutionDto> & {
    stepExecutions: WorkflowStepExecutionDto[];
  }
): WorkflowExecutionDto =>
  ({
    id: 'exec-1',
    workflowId: 'wf-1',
    status: ExecutionStatus.COMPLETED,
    ...overrides,
  } as WorkflowExecutionDto);

describe('buildIterationPseudoStep', () => {
  it('builds Input from resolved foreach.item and omits output', () => {
    const item = { name: 'alpha' };
    const execution = createExecution({
      stepExecutions: [
        {
          id: 'foreach-exec',
          stepId: 'loop',
          stepType: 'foreach',
          status: ExecutionStatus.COMPLETED,
          state: { index: 1, total: 2, items: [{ name: 'alpha' }, { name: 'beta' }] },
          scopeStack: [],
          workflowRunId: 'exec-1',
          workflowId: 'wf-1',
          startedAt: '',
          globalExecutionIndex: 0,
          stepExecutionIndex: 0,
          topologicalIndex: 0,
        } as WorkflowStepExecutionDto,
        {
          id: 'step-0',
          stepId: 'log',
          stepType: 'console',
          status: ExecutionStatus.COMPLETED,
          executionTimeMs: 12,
          scopeStack: [
            {
              stepId: 'loop',
              nestedScopes: [{ nodeId: 'enterForeach', nodeType: 'foreach', scopeId: '0' }],
            },
          ],
          workflowRunId: 'exec-1',
          workflowId: 'wf-1',
          startedAt: '',
          globalExecutionIndex: 1,
          stepExecutionIndex: 0,
          topologicalIndex: 1,
        } as WorkflowStepExecutionDto,
      ],
    });

    const virtualId = buildIterationVirtualId('foreach-iteration', 'loop', 0);
    const pseudo = buildIterationPseudoStep(virtualId, execution);

    expect(pseudo).not.toBeNull();
    expect(pseudo!.stepId).toBe('Iteration #0');
    expect(pseudo!.stepType).toBe('foreach-iteration');
    expect(pseudo!.status).toBe(ExecutionStatus.COMPLETED);
    expect(pseudo!.input).toEqual(item);
    expect(pseudo!.output).toBeUndefined();
    expect(pseudo!.executionTimeMs).toBe(12);
  });
});

describe('resolveForeachItem', () => {
  it('reads items[index] from foreach state when available', () => {
    expect(
      resolveForeachItem(
        {
          state: { items: ['a', 'b'], index: 1, total: 2 },
        } as WorkflowStepExecutionDto,
        1
      )
    ).toBe('b');
  });
});
