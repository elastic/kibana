/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { resolveSelectedStepExecution } from './resolve_selected_step_execution';
import { createMockStepExecutionDto } from '../../../shared/test_utils';

const parentStep = createMockStepExecutionDto({
  id: 'parent-execute',
  stepId: 'run_child',
  stepType: 'workflow.execute',
});

const childStep = createMockStepExecutionDto({
  id: 'child-lookup',
  stepId: 'lookup_host',
  stepType: 'data.set',
});

const childExecution = {
  parentStepExecutionId: 'parent-execute',
  workflowId: 'flyout-test-child',
  workflowName: 'Flyout test - child',
  executionId: 'child-exec-1',
  status: ExecutionStatus.COMPLETED,
  stepExecutions: [childStep],
};

describe('resolveSelectedStepExecution', () => {
  it('returns the parent execution id when nothing is selected', () => {
    expect(
      resolveSelectedStepExecution({
        selectedStepExecutionId: null,
        parentExecutionId: 'parent-exec',
        parentStepExecutions: [parentStep],
        childExecutions: new Map(),
      })
    ).toEqual({
      lightweightStep: undefined,
      resolvedExecutionId: 'parent-exec',
      childWorkflowExecution: undefined,
      parentWorkflowExecution: undefined,
    });
  });

  it('resolves a parent workflow.execute step and its child run', () => {
    const result = resolveSelectedStepExecution({
      selectedStepExecutionId: 'parent-execute',
      parentExecutionId: 'parent-exec',
      parentStepExecutions: [parentStep],
      childExecutions: new Map([['parent-execute', childExecution]]),
    });

    expect(result.lightweightStep).toBe(parentStep);
    expect(result.resolvedExecutionId).toBe('parent-exec');
    expect(result.childWorkflowExecution).toEqual(childExecution);
    expect(result.parentWorkflowExecution).toBeUndefined();
  });

  it('resolves an injected child step against the child run', () => {
    const result = resolveSelectedStepExecution({
      selectedStepExecutionId: 'child-lookup',
      parentExecutionId: 'parent-exec',
      parentStepExecutions: [parentStep],
      childExecutions: new Map([['parent-execute', childExecution]]),
    });

    expect(result.lightweightStep).toBe(childStep);
    expect(result.resolvedExecutionId).toBe('child-exec-1');
    expect(result.childWorkflowExecution).toBeUndefined();
    expect(result.parentWorkflowExecution).toEqual(childExecution);
  });
});
