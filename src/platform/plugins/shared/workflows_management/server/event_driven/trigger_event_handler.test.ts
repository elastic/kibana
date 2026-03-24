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
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import { createTriggerEventHandler } from './trigger_event_handler';

function getEngineMock(
  executionEnabled: boolean,
  logEventsEnabled: boolean = true,
  maxEventChainDepth: number = 10
): () => Promise<WorkflowsExecutionEnginePluginStart> {
  return () =>
    Promise.resolve({
      isEventDrivenExecutionEnabled: () => executionEnabled,
      isLogTriggerEventsEnabled: () => logEventsEnabled,
      getMaxEventChainDepth: () => maxEventChainDepth,
      getMaxWorkflowDepth: () => 10,
    } as WorkflowsExecutionEnginePluginStart);
}

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

  it('should pass event with timestamp, spaceId, and payload to scheduleWorkflow', async () => {
    const timestamp = '2025-01-01T12:00:00.000Z';
    const triggerId = 'cases.updated';
    const spaceId = 'default';
    const payload = { caseId: 'case-123', status: 'open' as const };
    const eventContext = { ...payload, timestamp, spaceId, eventChainDepth: 0 };

    const scheduleWorkflow = jest.fn().mockResolvedValue(undefined);
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue([createMockWorkflow({ id: 'wf-1' })]);

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      getTriggerEventsClient: () => null,
      getWorkflowExecutionEngine: getEngineMock(true),
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
    expect(scheduleWorkflow).toHaveBeenCalledTimes(1);

    const [workflowArg, spaceIdArg, inputsArg, requestArg, triggerIdArg] =
      scheduleWorkflow.mock.calls[0];

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
    expect(event.eventChainDepth).toBe(0);
  });

  it('should skip scheduling workflow and log when event chain depth exceeds max', async () => {
    const maxEventChainDepth = 5;
    const timestamp = '2025-01-01T12:00:00.000Z';
    const scheduleWorkflow = jest.fn();
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue([createMockWorkflow({ id: 'wf-1' })]);

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      getTriggerEventsClient: () => null,
      getWorkflowExecutionEngine: getEngineMock(true, true, maxEventChainDepth),
      resolveMatchingWorkflowSubscriptions,
    });

    await handler({
      timestamp,
      triggerId: 'cases.updated',
      spaceId: 'default',
      payload: {},
      request: mockRequest,
      eventChainContext: {
        depth: maxEventChainDepth,
        sourceWorkflowId: 'wf-1',
      },
    });

    expect(resolveMatchingWorkflowSubscriptions).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`Event chain depth (${maxEventChainDepth + 1}) exceeds max`)
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('skipping workflow wf-1'));
    expect(scheduleWorkflow).not.toHaveBeenCalled();
  });

  it('should always increment depth (e.g. composition: different workflow gets depth 3 from 2)', async () => {
    const scheduleWorkflow = jest.fn().mockResolvedValue(undefined);
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue([createMockWorkflow({ id: 'wf-1' })]);

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      getTriggerEventsClient: () => null,
      getWorkflowExecutionEngine: getEngineMock(true),
      resolveMatchingWorkflowSubscriptions,
    });

    await handler({
      timestamp: '2025-01-01T12:00:00.000Z',
      triggerId: 'cases.updated',
      spaceId: 'default',
      payload: { id: '1' },
      request: mockRequest,
      eventChainContext: { depth: 2, sourceWorkflowId: 'wf-other' },
    });

    expect(resolveMatchingWorkflowSubscriptions).toHaveBeenCalledWith(
      expect.objectContaining({
        eventContext: expect.objectContaining({ eventChainDepth: 0 }),
      })
    );
    expect(scheduleWorkflow).toHaveBeenCalledTimes(1);
    const event = (scheduleWorkflow.mock.calls[0][2] as { event: Record<string, unknown> }).event;
    expect(event.eventChainDepth).toBe(3);
  });

  it('should pass incremented eventChainDepth when same workflow re-triggers (self-loop)', async () => {
    const scheduleWorkflow = jest.fn().mockResolvedValue(undefined);
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue([createMockWorkflow({ id: 'wf-1' })]);

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      getTriggerEventsClient: () => null,
      getWorkflowExecutionEngine: getEngineMock(true),
      resolveMatchingWorkflowSubscriptions,
    });

    await handler({
      timestamp: '2025-01-01T12:00:00.000Z',
      triggerId: 'cases.updated',
      spaceId: 'default',
      payload: { id: '1' },
      request: mockRequest,
      eventChainContext: { depth: 2, sourceWorkflowId: 'wf-1' },
    });

    expect(resolveMatchingWorkflowSubscriptions).toHaveBeenCalledWith(
      expect.objectContaining({
        eventContext: expect.objectContaining({ eventChainDepth: 0 }),
      })
    );
    expect(scheduleWorkflow).toHaveBeenCalledTimes(1);
    const event = (scheduleWorkflow.mock.calls[0][2] as { event: Record<string, unknown> }).event;
    expect(event.eventChainDepth).toBe(3);
  });

  it('should not resolve or schedule when event-driven execution is disabled and logEvents is disabled', async () => {
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue([createMockWorkflow({ id: 'wf-1' })]);
    const scheduleWorkflow = jest.fn();

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      getTriggerEventsClient: () => null,
      getWorkflowExecutionEngine: getEngineMock(false, false),
      resolveMatchingWorkflowSubscriptions,
    });

    await handler({
      timestamp: '2025-01-01T12:00:00.000Z',
      triggerId: 'cases.updated',
      spaceId: 'default',
      payload: {},
      request: mockRequest,
    });

    expect(resolveMatchingWorkflowSubscriptions).not.toHaveBeenCalled();
    expect(scheduleWorkflow).not.toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Event-driven execution is disabled (eventDrivenExecutionEnabled: false); skipping workflow scheduling.'
    );
  });

  it('should resolve and write trigger event but not schedule when execution is disabled and logEvents is enabled', async () => {
    const timestamp = '2025-01-01T12:00:00.000Z';
    const triggerId = 'cases.updated';
    const spaceId = 'default';
    const payload = { caseId: 'case-123' };
    const eventContext = { ...payload, timestamp, spaceId, eventChainDepth: 0 };

    const scheduleWorkflow = jest.fn();
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue([createMockWorkflow({ id: 'wf-1' })]);

    const createMock = jest.fn().mockResolvedValue(undefined);
    const mockTriggerEventsClient = { create: createMock };

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      getTriggerEventsClient: () => mockTriggerEventsClient as any,
      getWorkflowExecutionEngine: getEngineMock(false, true),
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
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      documents: [
        expect.objectContaining({
          '@timestamp': timestamp,
          triggerId,
          spaceId,
          subscriptions: ['wf-1'],
          payload,
        }),
      ],
    });
    expect(scheduleWorkflow).not.toHaveBeenCalled();
  });

  it('should schedule but not write to data stream when execution is enabled and logEvents is disabled', async () => {
    const timestamp = '2025-01-01T12:00:00.000Z';
    const triggerId = 'cases.updated';
    const spaceId = 'default';
    const payload = { caseId: 'case-1' };
    const scheduleWorkflow = jest.fn().mockResolvedValue(undefined);
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue([createMockWorkflow({ id: 'wf-1' })]);

    const createMock = jest.fn().mockResolvedValue(undefined);
    const mockTriggerEventsClient = { create: createMock };

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      getTriggerEventsClient: () => mockTriggerEventsClient as any,
      getWorkflowExecutionEngine: getEngineMock(true, false),
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
    expect(createMock).not.toHaveBeenCalled();
    expect(scheduleWorkflow).toHaveBeenCalledTimes(1);
    expect(scheduleWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-1' }),
      spaceId,
      expect.objectContaining({ event: expect.any(Object) }),
      mockRequest,
      triggerId
    );
  });

  it('should not call scheduleWorkflow when no workflows are subscribed', async () => {
    const scheduleWorkflow = jest.fn();
    const resolveMatchingWorkflowSubscriptions = jest.fn().mockResolvedValue([]);

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      getTriggerEventsClient: () => null,
      getWorkflowExecutionEngine: getEngineMock(true),
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
        eventChainDepth: 0,
      }),
    });
    expect(scheduleWorkflow).not.toHaveBeenCalled();
  });

  it('should schedule all workflows and log once per failure when one scheduleWorkflow rejects', async () => {
    const wf1 = createMockWorkflow({ id: 'wf-1' });
    const wf2 = createMockWorkflow({ id: 'wf-2' });
    const wf3 = createMockWorkflow({ id: 'wf-3' });

    const scheduleWorkflow = jest.fn().mockImplementation(async (workflow: { id: string }) => {
      if (workflow.id === 'wf-2') {
        throw new Error('Scheduling failed for wf-2');
      }
      return undefined;
    });

    const resolveMatchingWorkflowSubscriptions = jest.fn().mockResolvedValue([wf1, wf2, wf3]);

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      getTriggerEventsClient: () => null,
      getWorkflowExecutionEngine: getEngineMock(true),
      resolveMatchingWorkflowSubscriptions,
    });

    await handler({
      timestamp: '2025-01-01T12:00:00.000Z',
      triggerId: 'cases.updated',
      spaceId: 'default',
      payload: {},
      request: mockRequest,
    });

    expect(scheduleWorkflow).toHaveBeenCalledTimes(3);
    expect(scheduleWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-1' }),
      'default',
      expect.objectContaining({ event: expect.any(Object) }),
      mockRequest,
      'cases.updated'
    );
    expect(scheduleWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-2' }),
      'default',
      expect.objectContaining({ event: expect.any(Object) }),
      mockRequest,
      'cases.updated'
    );
    expect(scheduleWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-3' }),
      'default',
      expect.objectContaining({ event: expect.any(Object) }),
      mockRequest,
      'cases.updated'
    );

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Event-driven workflow scheduling failed')
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('wf-2'));
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Scheduling failed for wf-2')
    );
  });

  it('should schedule only workflows returned by resolver (KQL-matched and enabled)', async () => {
    const wf1 = createMockWorkflow({ id: 'wf-1' });
    const wf2 = createMockWorkflow({ id: 'wf-2' });
    const scheduleWorkflow = jest.fn().mockResolvedValue(undefined);
    const resolveMatchingWorkflowSubscriptions = jest.fn().mockResolvedValue([wf1, wf2]);

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      getTriggerEventsClient: () => null,
      getWorkflowExecutionEngine: getEngineMock(true),
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
    expect(scheduleWorkflow).toHaveBeenCalledTimes(2);
    expect(scheduleWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-1' }),
      'default',
      expect.objectContaining({ event: expect.any(Object) }),
      mockRequest,
      'cases.updated'
    );
    expect(scheduleWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-2' }),
      'default',
      expect.objectContaining({ event: expect.any(Object) }),
      mockRequest,
      'cases.updated'
    );
  });

  it('should schedule all resolved workflows when none have conditions', async () => {
    const wf1 = createMockWorkflow({ id: 'wf-no-condition-1' });
    const wf2 = createMockWorkflow({ id: 'wf-no-condition-2' });
    const scheduleWorkflow = jest.fn().mockResolvedValue(undefined);
    const resolveMatchingWorkflowSubscriptions = jest.fn().mockResolvedValue([wf1, wf2]);

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      getTriggerEventsClient: () => null,
      getWorkflowExecutionEngine: getEngineMock(true),
      resolveMatchingWorkflowSubscriptions,
    });

    await handler({
      timestamp: '2025-01-01T12:00:00.000Z',
      triggerId: 'cases.updated',
      spaceId: 'default',
      payload: {},
      request: mockRequest,
    });

    expect(scheduleWorkflow).toHaveBeenCalledTimes(2);
    expect(scheduleWorkflow).toHaveBeenNthCalledWith(
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
    expect(scheduleWorkflow).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 'wf-no-condition-2' }),
      'default',
      expect.objectContaining({ event: expect.any(Object) }),
      mockRequest,
      'cases.updated'
    );
  });

  it('should schedule valid workflows and log warning when one fails validation', async () => {
    const validWf1 = createMockWorkflow({ id: 'wf-valid-1' });
    const invalidWf = createMockWorkflow({
      id: 'wf-invalid',
      definition: null,
      valid: false,
    } as Partial<WorkflowDetailDto>);
    const validWf2 = createMockWorkflow({ id: 'wf-valid-2' });

    const scheduleWorkflow = jest.fn().mockResolvedValue(undefined);
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue([validWf1, invalidWf, validWf2]);

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      getTriggerEventsClient: () => null,
      getWorkflowExecutionEngine: getEngineMock(true),
      resolveMatchingWorkflowSubscriptions,
    });

    await handler({
      timestamp: '2025-01-01T12:00:00.000Z',
      triggerId: 'cases.updated',
      spaceId: 'default',
      payload: {},
      request: mockRequest,
    });

    expect(scheduleWorkflow).toHaveBeenCalledTimes(2);
    expect(scheduleWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-valid-1' }),
      'default',
      expect.objectContaining({ event: expect.any(Object) }),
      mockRequest,
      'cases.updated'
    );
    expect(scheduleWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-valid-2' }),
      'default',
      expect.objectContaining({ event: expect.any(Object) }),
      mockRequest,
      'cases.updated'
    );
    expect(scheduleWorkflow).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-invalid' }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Event-driven workflow scheduling failed')
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('wf-invalid'));
  });

  it('should cap concurrent scheduleWorkflow calls at SCHEDULE_CONCURRENCY (20)', async () => {
    const workflowCount = 25;
    const workflows = Array.from({ length: workflowCount }, (_, i) =>
      createMockWorkflow({ id: `wf-${i}` })
    );

    let currentConcurrent = 0;
    let maxConcurrent = 0;
    const scheduleWorkflow = jest.fn().mockImplementation(() => {
      currentConcurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          currentConcurrent -= 1;
          resolve();
        }, 1);
      });
    });

    const resolveMatchingWorkflowSubscriptions = jest.fn().mockResolvedValue(workflows);

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      getTriggerEventsClient: () => null,
      getWorkflowExecutionEngine: getEngineMock(true),
      resolveMatchingWorkflowSubscriptions,
    });

    await handler({
      timestamp: '2025-01-01T12:00:00.000Z',
      triggerId: 'cases.updated',
      spaceId: 'default',
      payload: {},
      request: mockRequest,
    });

    expect(scheduleWorkflow).toHaveBeenCalledTimes(workflowCount);
    expect(maxConcurrent).toBeLessThanOrEqual(20);
  });

  it('should resolve after all scheduleWorkflow calls are invoked (fire-and-forget scheduling)', async () => {
    const resolveOrder: string[] = [];
    const scheduleWorkflow = jest.fn().mockImplementation((workflow: { id: string }) => {
      resolveOrder.push(`schedule-start-${workflow.id}`);
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          resolveOrder.push(`schedule-done-${workflow.id}`);
          resolve();
        }, 5);
      });
    });

    const wf1 = createMockWorkflow({ id: 'wf-1' });
    const wf2 = createMockWorkflow({ id: 'wf-2' });
    const resolveMatchingWorkflowSubscriptions = jest.fn().mockResolvedValue([wf1, wf2]);

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      getTriggerEventsClient: () => null,
      getWorkflowExecutionEngine: getEngineMock(true),
      resolveMatchingWorkflowSubscriptions,
    });

    const handlerPromise = handler({
      timestamp: '2025-01-01T12:00:00.000Z',
      triggerId: 'cases.updated',
      spaceId: 'default',
      payload: {},
      request: mockRequest,
    });

    await handlerPromise;

    expect(scheduleWorkflow).toHaveBeenCalledTimes(2);
    expect(resolveOrder).toContain('schedule-start-wf-1');
    expect(resolveOrder).toContain('schedule-start-wf-2');
    expect(resolveOrder).toContain('schedule-done-wf-1');
    expect(resolveOrder).toContain('schedule-done-wf-2');
  });
});
