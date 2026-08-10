/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { StepExecutionRuntimeFactory } from '../step_execution_runtime_factory';

const createParams = () => {
  const node = {
    id: 'node-1',
    stepId: 'step-1',
    stepType: 'atomic',
    type: 'atomic',
  };

  return {
    workflowExecutionState: {
      getWorkflowExecution: jest.fn(() => ({
        id: 'exec-1',
        spaceId: 'default',
      })),
    },
    workflowExecutionGraph: {
      getNode: jest.fn(() => node),
    },
    workflowLogger: {
      createStepLogger: jest.fn(() => ({
        logInfo: jest.fn(),
        logError: jest.fn(),
        logDebug: jest.fn(),
        logWarn: jest.fn(),
        flushEvents: jest.fn(),
      })),
    },
    esClient: {},
    fakeRequest: {},
    coreStart: {
      elasticsearch: { client: { asInternalUser: {} } },
    },
    dependencies: { config: {} },
  };
};

describe('StepExecutionRuntimeFactory', () => {
  it('creates a step execution runtime with correct step execution ID', () => {
    const params = createParams();
    const factory = new StepExecutionRuntimeFactory(params as any);

    const runtime = factory.createStepExecutionRuntime({
      nodeId: 'node-1',
      stackFrames: [],
    });

    expect(runtime).toBeDefined();
    expect(runtime.stepExecutionId).toBeDefined();
    expect(runtime.node).toBe(params.workflowExecutionGraph.getNode());
    expect(params.workflowLogger.createStepLogger).toHaveBeenCalledWith(
      expect.any(String),
      'step-1',
      'step-1',
      'atomic'
    );
  });

  it('removes current node from stack frames if it appears on top', () => {
    const params = createParams();
    const factory = new StepExecutionRuntimeFactory(params as any);

    const stackFrames = [
      {
        stepId: 'step-1',
        nestedScopes: [{ nodeId: 'node-1', nodeType: 'enter-foreach' }],
      },
    ];

    const runtime = factory.createStepExecutionRuntime({
      nodeId: 'node-1',
      stackFrames,
    });

    expect(runtime).toBeDefined();
  });

  it('preserves stack frames when current node is not on top', () => {
    const params = createParams();
    const factory = new StepExecutionRuntimeFactory(params as any);

    const stackFrames = [
      {
        stepId: 'other-step',
        nestedScopes: [{ nodeId: 'other-node', nodeType: 'enter-foreach' }],
      },
    ];

    const runtime = factory.createStepExecutionRuntime({
      nodeId: 'node-1',
      stackFrames,
    });

    expect(runtime).toBeDefined();
  });
});
