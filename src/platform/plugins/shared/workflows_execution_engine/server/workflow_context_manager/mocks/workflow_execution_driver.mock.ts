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
import type {
  WorkflowExecutionDriverApi,
  WorkflowExecutionDriverInit,
} from '../workflow_execution_driver';
import { WorkflowExecutionDriver } from '../workflow_execution_driver';

export interface MockWorkflowExecutionDriverOptions {
  currentNode?: GraphNodeUnion | null;
  nextNode?: GraphNodeUnion | null;
  currentStackFrames?: StackFrame[];
  error?: Error;
  isExecuting?: boolean;
}

export type MockWorkflowExecutionDriver = jest.Mocked<WorkflowExecutionDriverApi> & {
  setMockCurrentNode: (node: GraphNodeUnion | null) => void;
  setMockIsExecuting: (executing: boolean) => void;
  setMockError: (error: Error | undefined) => void;
  setMockCurrentStackFrames: (stackFrames: StackFrame[]) => void;
};

export interface WorkflowExecutionDriverTestApi extends WorkflowExecutionDriverApi {
  setCurrentNodeId(nodeId: string | undefined): void;
}

/**
 * Jest-based {@link WorkflowExecutionDriver} stand-in for execution-loop unit tests.
 */
export const createMockWorkflowExecutionDriver = (
  options: MockWorkflowExecutionDriverOptions = {}
): MockWorkflowExecutionDriver => {
  let isExecuting = options.isExecuting ?? true;
  let error = options.error;
  let currentNode = options.currentNode ?? null;
  const nextNode = options.nextNode ?? null;
  let currentStackFrames = options.currentStackFrames ?? [];

  const driver = {
    get isExecuting() {
      return isExecuting;
    },
    get error() {
      return error;
    },
    set error(value: Error | undefined) {
      error = value;
    },
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
    handleStartOfCycle: jest.fn(),
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

  return driver as MockWorkflowExecutionDriver;
};

/**
 * Real driver with typed test helpers (graph navigation, scope stack). Prefer
 * {@link createMockWorkflowExecutionDriver} when only the public API surface is needed.
 */
export class WorkflowExecutionDriverTestHarness
  extends WorkflowExecutionDriver
  implements WorkflowExecutionDriverTestApi
{
  public setCurrentNodeId(nodeId: string | undefined): void {
    const internalDriver = this as unknown as {
      currentNodeId: string | undefined;
      nextNodeId: string | undefined;
    };
    internalDriver.currentNodeId = nodeId;
    if (nodeId === undefined) {
      internalDriver.nextNodeId = undefined;
    }
  }
}

export const createWorkflowExecutionDriverTestHarness = (
  init: WorkflowExecutionDriverInit
): WorkflowExecutionDriverTestHarness => new WorkflowExecutionDriverTestHarness(init);
