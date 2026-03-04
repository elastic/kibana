/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowDetailDto } from '@kbn/workflows';
import { createTriggerEventHandler } from './trigger_event_handler';

const createMockWorkflow = (overrides: Partial<WorkflowDetailDto> = {}): WorkflowDetailDto =>
  ({
    id: 'wf-1',
    name: 'Test Workflow',
    enabled: true,
    definition: {
      triggers: [{ type: 'cases.updated' }],
      steps: [],
    },
    yaml: 'triggers: [{ type: "cases.updated" }]\nsteps: []',
    valid: true,
    ...overrides,
  } as WorkflowDetailDto);

describe('createTriggerEventHandler', () => {
  const mockLogger: Logger = {
    debug: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
    warn: jest.fn(),
    get: jest.fn().mockReturnThis(),
  } as unknown as Logger;

  const mockRequest = {} as any;

  it('should pass event with timestamp, spaceId, and payload to runWorkflow', async () => {
    const timestamp = '2025-01-01T12:00:00.000Z';
    const triggerId = 'cases.updated';
    const spaceId = 'default';
    const payload = { caseId: 'case-123', status: 'open' as const };
    const eventContext = { ...payload, timestamp, spaceId };

    const runWorkflow = jest.fn().mockResolvedValue(undefined);
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue([createMockWorkflow({ id: 'wf-1' })]);

    const handler = createTriggerEventHandler({
      api: { runWorkflow } as any,
      logger: mockLogger,
      getTriggerEventsClient: () => null,
      resolveMatchingWorkflowSubscriptions,
    });

    await handler({
      timestamp,
      triggerId,
      spaceId,
      payload,
      request: mockRequest,
    });

    expect(resolveMatchingWorkflowSubscriptions).toHaveBeenCalledTimes(1);
    expect(resolveMatchingWorkflowSubscriptions).toHaveBeenCalledWith({
      triggerId,
      spaceId,
      eventContext,
    });
    expect(runWorkflow).toHaveBeenCalledTimes(1);

    const [workflowArg, spaceIdArg, inputsArg, requestArg, triggerIdArg] =
      runWorkflow.mock.calls[0];

    expect(spaceIdArg).toBe(spaceId);
    expect(requestArg).toBe(mockRequest);
    expect(triggerIdArg).toBe(triggerId);
    expect(workflowArg.id).toBe('wf-1');

    const event = inputsArg?.event as Record<string, unknown>;
    expect(event).toBeDefined();
    expect(event.timestamp).toBe(timestamp);
    expect(event.spaceId).toBe(spaceId);
    expect(event.caseId).toBe('case-123');
    expect(event.status).toBe('open');
  });

  it('should not call runWorkflow when no workflows are subscribed', async () => {
    const runWorkflow = jest.fn();
    const resolveMatchingWorkflowSubscriptions = jest.fn().mockResolvedValue([]);

    const handler = createTriggerEventHandler({
      api: { runWorkflow } as any,
      logger: mockLogger,
      getTriggerEventsClient: () => null,
      resolveMatchingWorkflowSubscriptions,
    });

    await handler({
      timestamp: '2025-01-01T12:00:00.000Z',
      triggerId: 'cases.updated',
      spaceId: 'default',
      payload: {},
      request: mockRequest,
    });

    expect(resolveMatchingWorkflowSubscriptions).toHaveBeenCalledWith({
      triggerId: 'cases.updated',
      spaceId: 'default',
      eventContext: expect.objectContaining({
        timestamp: '2025-01-01T12:00:00.000Z',
        spaceId: 'default',
      }),
    });
    expect(runWorkflow).not.toHaveBeenCalled();
  });
});
