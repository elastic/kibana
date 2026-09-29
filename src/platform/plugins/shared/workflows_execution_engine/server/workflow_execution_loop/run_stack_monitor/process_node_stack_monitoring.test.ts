/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { processNodeStackMonitoring } from './process_node_stack_monitoring';

vi.mock('../cancel_workflow_if_requested', () => {
  const mocked = {
    cancelWorkflowIfRequested: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { cancelWorkflowIfRequested } = await import('../cancel_workflow_if_requested');

describe('processNodeStackMonitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invokes monitor on monitorable nodes and cancellation check', async () => {
    const monitorFn = vi.fn();
    const nodeWithMonitor = { monitor: monitorFn, run: vi.fn() };
    const nodeWithoutMonitor = { run: vi.fn() };

    const stackFrames = [
      { stepId: 'scope-1', nestedScopes: [{ nodeId: 'node-a', nodeType: 'enter-retry' }] },
      { stepId: 'scope-2', nestedScopes: [{ nodeId: 'node-b', nodeType: 'atomic' }] },
    ];

    const monitoredRuntime = {
      abortController: new AbortController(),
    };

    const params = {
      workflowRuntime: {
        getCurrentNodeScope: vi.fn(() => stackFrames),
      },
      stepExecutionRuntimeFactory: {
        createStepExecutionRuntime: vi.fn(() => ({})),
      },
      nodesFactory: {
        create: vi
          .fn()
          .mockReturnValueOnce(nodeWithMonitor)
          .mockReturnValueOnce(nodeWithoutMonitor),
      },
      workflowExecutionRepository: {},
      workflowExecutionState: {},
      workflowLogger: {},
    };

    await processNodeStackMonitoring(params as any, monitoredRuntime as any);

    expect(monitorFn).toHaveBeenCalledWith(monitoredRuntime);
    expect(cancelWorkflowIfRequested).toHaveBeenCalled();
  });

  it('processes empty stack and still checks cancellation', async () => {
    const monitoredRuntime = {
      abortController: new AbortController(),
    };

    const params = {
      workflowRuntime: {
        getCurrentNodeScope: vi.fn(() => []),
      },
      stepExecutionRuntimeFactory: {
        createStepExecutionRuntime: vi.fn(),
      },
      nodesFactory: {
        create: vi.fn(),
      },
      workflowExecutionRepository: {},
      workflowExecutionState: {},
      workflowLogger: {},
    };

    await processNodeStackMonitoring(params as any, monitoredRuntime as any);

    expect(params.nodesFactory.create).not.toHaveBeenCalled();
    expect(cancelWorkflowIfRequested).toHaveBeenCalled();
  });
});
