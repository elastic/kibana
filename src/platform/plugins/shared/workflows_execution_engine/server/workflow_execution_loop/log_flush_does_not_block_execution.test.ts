/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ExecutionStatus } from '@kbn/workflows';
import type { GraphNodeUnion } from '@kbn/workflows/graph';

import { runNode } from './run_node';
import type { WorkflowExecutionLoopParams } from './types';
import { workflowExecutionLoop } from './workflow_execution_loop';
import type { LogsRepository, WorkflowLogEvent } from '../repositories/logs_repository';
import { createMockWorkflowExecutionCursor } from '../workflow_context_manager/mocks/workflow_execution_cursor.mock';
import { WorkflowEventQueue } from '../workflow_event_logger/workflow_event_queue';

jest.mock('elastic-apm-node', () => ({
  __esModule: true,
  default: {
    startSpan: jest.fn(() => ({ end: jest.fn() })),
  },
}));

jest.mock('./run_node', () => ({
  runNode: jest.fn(),
}));

describe('workflow execution log flush', () => {
  it('starts the next node while a log write is still pending', async () => {
    const started: string[] = [];
    const nodes = [{ id: 'node-1' } as GraphNodeUnion, { id: 'node-2' } as GraphNodeUnion];
    let nodeIndex = 0;
    const workflowExecutionCursor = createMockWorkflowExecutionCursor({
      currentNode: nodes[0],
    });
    workflowExecutionCursor.commitPendingNavigation.mockImplementation(() => {
      nodeIndex += 1;
      workflowExecutionCursor.setMockCurrentNode(nodes[nodeIndex] ?? null);
    });
    (runNode as jest.Mock).mockImplementation(async () => {
      const currentNode = workflowExecutionCursor.currentNode;
      if (currentNode) {
        started.push(currentNode.id);
      }
    });

    let releaseCreateLogs: (() => void) | undefined;
    const createLogsGate = new Promise<void>((resolve) => {
      releaseCreateLogs = resolve;
    });
    const logsRepository = {
      createLogs: jest.fn(() => createLogsGate),
    } as unknown as jest.Mocked<LogsRepository>;
    const eventQueue = new WorkflowEventQueue(logsRepository, loggerMock.create());
    eventQueue.push({ message: 'already queued' } as WorkflowLogEvent);

    const params = {
      workflowExecutionCursor,
      workflowRuntime: {
        saveState: jest.fn().mockResolvedValue(undefined),
        getWorkflowExecution: jest.fn().mockReturnValue({
          id: 'exec-1',
          status: ExecutionStatus.RUNNING,
        }),
      },
      workflowExecutionState: {
        updateWorkflowExecution: jest.fn(),
      },
      stepIoService: {
        flush: jest.fn().mockResolvedValue(undefined),
        releaseTransientlyRehydratedOutputs: jest.fn(),
      },
      eventQueue,
      signal: new AbortController().signal,
    } as unknown as WorkflowExecutionLoopParams;

    const loopPromise = workflowExecutionLoop(params);

    const deadline = Date.now() + 1000;
    while (!started.includes('node-2')) {
      if (Date.now() > deadline) {
        throw new Error('next node did not start while createLogs was pending');
      }
      await new Promise((resolve) => setImmediate(resolve));
    }

    expect(logsRepository.createLogs).toHaveBeenCalled();
    expect(started).toEqual(['node-1', 'node-2']);

    releaseCreateLogs?.();
    await loopPromise;
  });
});
