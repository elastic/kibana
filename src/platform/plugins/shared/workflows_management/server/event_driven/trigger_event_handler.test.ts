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

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('should run all workflows and log once per failure when one runWorkflow rejects', async () => {
    const wf1 = createMockWorkflow({ id: 'wf-1' });
    const wf2 = createMockWorkflow({ id: 'wf-2' });
    const wf3 = createMockWorkflow({ id: 'wf-3' });

    const runWorkflow = jest.fn().mockImplementation(async (workflow: { id: string }) => {
      if (workflow.id === 'wf-2') {
        throw new Error('Execution failed for wf-2');
      }
      return undefined;
    });

    const resolveMatchingWorkflowSubscriptions = jest.fn().mockResolvedValue([wf1, wf2, wf3]);

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

    expect(runWorkflow).toHaveBeenCalledTimes(3);
    expect(runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-1' }),
      'default',
      expect.any(Object),
      mockRequest,
      'cases.updated'
    );
    expect(runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-2' }),
      'default',
      expect.any(Object),
      mockRequest,
      'cases.updated'
    );
    expect(runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-3' }),
      'default',
      expect.any(Object),
      mockRequest,
      'cases.updated'
    );

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Event-driven workflow execution failed')
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('wf-2'));
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Execution failed for wf-2')
    );
  });

  it('should run only workflows returned by resolver (KQL-matched and enabled)', async () => {
    const wf1 = createMockWorkflow({ id: 'wf-1' });
    const wf2 = createMockWorkflow({ id: 'wf-2' });
    const runWorkflow = jest.fn().mockResolvedValue(undefined);
    const resolveMatchingWorkflowSubscriptions = jest.fn().mockResolvedValue([wf1, wf2]);

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
      payload: { severity: 'high' },
      request: mockRequest,
    });

    expect(resolveMatchingWorkflowSubscriptions).toHaveBeenCalledTimes(1);
    expect(runWorkflow).toHaveBeenCalledTimes(2);
    expect(runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-1' }),
      'default',
      expect.any(Object),
      mockRequest,
      'cases.updated'
    );
    expect(runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-2' }),
      'default',
      expect.any(Object),
      mockRequest,
      'cases.updated'
    );
  });

  it('should run all resolved workflows when none have conditions', async () => {
    const wf1 = createMockWorkflow({ id: 'wf-no-condition-1' });
    const wf2 = createMockWorkflow({ id: 'wf-no-condition-2' });
    const runWorkflow = jest.fn().mockResolvedValue(undefined);
    const resolveMatchingWorkflowSubscriptions = jest.fn().mockResolvedValue([wf1, wf2]);

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

    expect(runWorkflow).toHaveBeenCalledTimes(2);
    expect(runWorkflow).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 'wf-no-condition-1' }),
      'default',
      expect.objectContaining({
        event: expect.objectContaining({
          timestamp: expect.any(String),
          spaceId: 'default',
        }),
      }),
      mockRequest,
      'cases.updated'
    );
    expect(runWorkflow).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 'wf-no-condition-2' }),
      'default',
      expect.any(Object),
      mockRequest,
      'cases.updated'
    );
  });

  it('should run valid workflows and log warning when one fails validation', async () => {
    const validWf1 = createMockWorkflow({ id: 'wf-valid-1' });
    const invalidWf = createMockWorkflow({
      id: 'wf-invalid',
      definition: null,
      valid: false,
    } as Partial<WorkflowDetailDto>);
    const validWf2 = createMockWorkflow({ id: 'wf-valid-2' });

    const runWorkflow = jest.fn().mockResolvedValue(undefined);
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue([validWf1, invalidWf, validWf2]);

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

    expect(runWorkflow).toHaveBeenCalledTimes(2);
    expect(runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-valid-1' }),
      'default',
      expect.any(Object),
      mockRequest,
      'cases.updated'
    );
    expect(runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-valid-2' }),
      'default',
      expect.any(Object),
      mockRequest,
      'cases.updated'
    );
    expect(runWorkflow).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-invalid' }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Event-driven workflow execution failed')
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('wf-invalid'));
  });
});
