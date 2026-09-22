/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StackFrame } from '@kbn/workflows';
import type { GraphNodeUnion } from '@kbn/workflows/graph';
import { ExecutionError } from '@kbn/workflows/server';
import type {
  WorkflowExecutionCursorApi,
  WorkflowExecutionCursorInit,
} from '../workflow_execution_cursor';
import { WorkflowExecutionCursor } from '../workflow_execution_cursor';

export interface MockWorkflowExecutionCursorOptions {
  currentNode?: GraphNodeUnion | null;
  nextNode?: GraphNodeUnion | null;
  currentStackFrames?: StackFrame[];
  error?: Error;
  isExecuting?: boolean;
}

export type MockWorkflowExecutionCursor = jest.Mocked<WorkflowExecutionCursorApi> & {
  setMockCurrentNode: (node: GraphNodeUnion | null) => void;
  setMockIsExecuting: (executing: boolean) => void;
  setMockError: (error: Error | undefined) => void;
  setMockCurrentStackFrames: (stackFrames: StackFrame[]) => void;
};

export interface WorkflowExecutionCursorTestApi extends WorkflowExecutionCursorApi {
  setCurrentNodeId(nodeId: string | undefined): void;
}

/**
 * Jest-based {@link WorkflowExecutionCursor} stand-in for execution-loop unit tests.
 */
export const createMockWorkflowExecutionCursor = (
  options: MockWorkflowExecutionCursorOptions = {}
): MockWorkflowExecutionCursor => {
  let isExecuting = options.isExecuting ?? true;
  let error = options.error;
  let currentNode = options.currentNode ?? null;
  const nextNode = options.nextNode ?? null;
  let currentStackFrames = options.currentStackFrames ?? [];

  const workflowExecutionCursor = {
    get isExecuting() {
      return isExecuting;
    },
    get error() {
      return error;
    },
    captureError: jest.fn((caught: unknown) => {
      error = ExecutionError.fromError(
        caught instanceof Error ? caught : new Error(String(caught))
      );
    }),
    clearError: jest.fn(() => {
      error = undefined;
    }),
    get currentNode() {
      return currentNode;
    },
    get nextNode() {
      return nextNode;
    },
    get currentStackFrames() {
      return currentStackFrames;
    },
    start: jest.fn(() => {
      isExecuting = true;
    }),
    stop: jest.fn(() => {
      isExecuting = false;
    }),
    commitPendingNavigation: jest.fn(),
    navigateToNode: jest.fn(),
    navigateToNextNode: jest.fn(),
    navigateToAfterNode: jest.fn(),
    setCurrentScopeId: jest.fn(),
    setMockCurrentNode: (node: GraphNodeUnion | null) => {
      currentNode = node;
    },
    setMockIsExecuting: (executing: boolean) => {
      isExecuting = executing;
    },
    setMockError: (nextError: Error | undefined) => {
      error = nextError;
    },
    setMockCurrentStackFrames: (stackFrames: StackFrame[]) => {
      currentStackFrames = stackFrames;
    },
  };

  return workflowExecutionCursor as MockWorkflowExecutionCursor;
};

/**
 * Real cursor with typed test helpers (graph navigation, scope stack). Prefer
 * {@link createMockWorkflowExecutionCursor} when only the public API surface is needed.
 */
export class WorkflowExecutionCursorTestHarness
  extends WorkflowExecutionCursor
  implements WorkflowExecutionCursorTestApi
{
  public setCurrentNodeId(nodeId: string | undefined): void {
    const internalCursor = this as unknown as {
      currentNodeId: string | undefined;
      nextNodeId: string | undefined;
    };
    internalCursor.currentNodeId = nodeId;
    if (nodeId === undefined) {
      internalCursor.nextNodeId = undefined;
    }
  }
}

export const createWorkflowExecutionCursorTestHarness = (
  init: WorkflowExecutionCursorInit
): WorkflowExecutionCursorTestHarness => new WorkflowExecutionCursorTestHarness(init);
