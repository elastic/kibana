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
import type { TriggerResolutionStats } from './resolve_workflow_subscriptions';
import { createTriggerEventHandler } from './trigger_event_handler';

function mockResolveResult(
  workflows: WorkflowDetailDto[],
  statsOverrides?: Partial<TriggerResolutionStats>
) {
  const stats: TriggerResolutionStats = {
    subscribedCount: workflows.length,
    disabledCount: 0,
    kqlFalseCount: 0,
    kqlErrorCount: 0,
    matchedCount: workflows.length,
    ...statsOverrides,
  };
  return { workflows, stats };
}

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
    const scheduleWorkflow = jest.fn().mockResolvedValue(undefined);
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue(mockResolveResult([createMockWorkflow({ id: 'wf-1' })]));
    const telemetryClient = { reportTriggerEventDispatched: jest.fn() };

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      telemetryClient,
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
      eventContext: expect.objectContaining({
        ...payload,
        timestamp,
        spaceId,
        eventChainDepth: 1,
      }),
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
    expect(event.eventChainDepth).toBe(1);
    expect(event.eventId).toBeUndefined();
    const scheduleMeta = scheduleWorkflow.mock.calls[0][5] as Record<string, unknown>;
    expect(scheduleMeta).toEqual(
      expect.objectContaining({
        eventDispatchTimestamp: timestamp,
        eventTriggerId: triggerId,
        eventId: expect.any(String),
      })
    );
  });

  it('should skip scheduling workflow and log when event chain depth exceeds max', async () => {
    const maxEventChainDepth = 5;
    const timestamp = '2025-01-01T12:00:00.000Z';
    const scheduleWorkflow = jest.fn();
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue(mockResolveResult([createMockWorkflow({ id: 'wf-1' })]));
    const telemetryClient = { reportTriggerEventDispatched: jest.fn() };

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      telemetryClient,
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
        sourceExecutionId: 'exec-1',
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
      .mockResolvedValue(mockResolveResult([createMockWorkflow({ id: 'wf-1' })]));
    const telemetryClient = { reportTriggerEventDispatched: jest.fn() };

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      telemetryClient,
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
      eventChainContext: { depth: 2, sourceExecutionId: 'exec-other' },
    });

    expect(resolveMatchingWorkflowSubscriptions).toHaveBeenCalledWith(
      expect.objectContaining({
        eventContext: expect.objectContaining({ eventChainDepth: 1 }),
      })
    );
    expect(scheduleWorkflow).toHaveBeenCalledTimes(1);
    const event = (scheduleWorkflow.mock.calls[0][2] as { event: Record<string, unknown> }).event;
    expect(event.eventChainDepth).toBe(3);
    expect(event.eventId).toBeUndefined();
  });

  it('should pass incremented eventChainDepth when same workflow re-triggers (self-loop)', async () => {
    const scheduleWorkflow = jest.fn().mockResolvedValue(undefined);
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue(mockResolveResult([createMockWorkflow({ id: 'wf-1' })]));
    const telemetryClient = { reportTriggerEventDispatched: jest.fn() };

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      telemetryClient,
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
      eventChainContext: { depth: 2, sourceExecutionId: 'exec-1' },
    });

    expect(resolveMatchingWorkflowSubscriptions).toHaveBeenCalledWith(
      expect.objectContaining({
        eventContext: expect.objectContaining({ eventChainDepth: 1 }),
      })
    );
    expect(scheduleWorkflow).toHaveBeenCalledTimes(1);
    const event = (scheduleWorkflow.mock.calls[0][2] as { event: Record<string, unknown> }).event;
    expect(event.eventChainDepth).toBe(3);
    expect(event.eventId).toBeUndefined();
  });

  it('should not resolve or schedule when event-driven execution is disabled and logEvents is disabled', async () => {
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue(mockResolveResult([createMockWorkflow({ id: 'wf-1' })]));
    const scheduleWorkflow = jest.fn();

    const telemetryClient = { reportTriggerEventDispatched: jest.fn() };
    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      telemetryClient,
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
    expect(telemetryClient.reportTriggerEventDispatched).not.toHaveBeenCalled();
  });

  it('should resolve and write trigger event but not schedule when execution is disabled and logEvents is enabled', async () => {
    const timestamp = '2025-01-01T12:00:00.000Z';
    const triggerId = 'cases.updated';
    const spaceId = 'default';
    const payload = { caseId: 'case-123' };

    const scheduleWorkflow = jest.fn();
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue(mockResolveResult([createMockWorkflow({ id: 'wf-1' })]));

    const createMock = jest.fn().mockResolvedValue(undefined);
    const mockTriggerEventsClient = { create: createMock };
    const telemetryClient = { reportTriggerEventDispatched: jest.fn() };

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      telemetryClient,
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
      eventContext: expect.objectContaining({
        ...payload,
        timestamp,
        spaceId,
        eventChainDepth: 1,
      }),
    });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      documents: [
        expect.objectContaining({
          '@timestamp': timestamp,
          eventId: expect.any(String),
          triggerId,
          spaceId,
          subscriptions: ['wf-1'],
          payload,
        }),
      ],
    });
    expect(scheduleWorkflow).not.toHaveBeenCalled();
    expect(telemetryClient.reportTriggerEventDispatched).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerId,
        executionEnabled: false,
        logEventsEnabled: true,
        eventChainDepth: 0,
        eventId: expect.any(String),
        auditOnly: true,
        subscriberResolutionMs: expect.any(Number),
        matchedCount: 1,
        scheduledAttemptCount: 0,
      })
    );
  });

  it('should schedule but not write to data stream when execution is enabled and logEvents is disabled', async () => {
    const timestamp = '2025-01-01T12:00:00.000Z';
    const triggerId = 'cases.updated';
    const spaceId = 'default';
    const payload = { caseId: 'case-1' };
    const scheduleWorkflow = jest.fn().mockResolvedValue(undefined);
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue(mockResolveResult([createMockWorkflow({ id: 'wf-1' })]));

    const createMock = jest.fn().mockResolvedValue(undefined);
    const mockTriggerEventsClient = { create: createMock };

    const telemetryClient = { reportTriggerEventDispatched: jest.fn() };
    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      telemetryClient,
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
      triggerId,
      expect.objectContaining({
        eventDispatchTimestamp: timestamp,
        eventTriggerId: triggerId,
        eventId: expect.any(String),
      })
    );
    expect(telemetryClient.reportTriggerEventDispatched).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerId,
        executionEnabled: true,
        logEventsEnabled: false,
        eventChainDepth: 0,
        eventId: expect.any(String),
        auditOnly: false,
        subscriberResolutionMs: expect.any(Number),
        matchedCount: 1,
        scheduledAttemptCount: 1,
      })
    );
  });

  it('should include eventChainDepth from event chain context on dispatched telemetry', async () => {
    const timestamp = '2025-01-01T12:00:00.000Z';
    const triggerId = 'cases.updated';
    const spaceId = 'default';
    const payload = { caseId: 'case-1' };
    const scheduleWorkflow = jest.fn().mockResolvedValue(undefined);
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue(mockResolveResult([createMockWorkflow({ id: 'wf-1' })]));

    const telemetryClient = { reportTriggerEventDispatched: jest.fn() };
    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      telemetryClient,
      getTriggerEventsClient: () => null,
      getWorkflowExecutionEngine: getEngineMock(true, false),
      resolveMatchingWorkflowSubscriptions,
    });

    await handler({
      timestamp,
      triggerId,
      spaceId,
      payload,
      request: mockRequest,
      eventChainContext: { depth: 3, sourceExecutionId: 'exec-parent' },
    });

    expect(telemetryClient.reportTriggerEventDispatched).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerId,
        eventChainDepth: 3,
        sourceExecutionId: 'exec-parent',
        eventId: expect.any(String),
        matchedCount: 1,
      })
    );
  });

  it('records enough data across two dispatches to reconstruct execution → event → execution → event', async () => {
    const wf = createMockWorkflow({ id: 'wf-chain' });
    const scheduleWorkflow = jest.fn().mockResolvedValue(undefined);
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue(mockResolveResult([wf]));
    const telemetryClient = { reportTriggerEventDispatched: jest.fn() };

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      telemetryClient,
      getTriggerEventsClient: () => null,
      getWorkflowExecutionEngine: getEngineMock(true),
      resolveMatchingWorkflowSubscriptions,
    });

    const spaceId = 'default';

    // Dispatch 1: external / root emit — no workflow execution is in the chain yet.
    await handler({
      timestamp: '2025-01-01T12:00:00.000Z',
      triggerId: 'cases.updated',
      spaceId,
      payload: { caseId: 'case-1' },
      request: mockRequest,
    });

    const metaDispatch1 = scheduleWorkflow.mock.calls[0][5] as { eventId: string };
    const eventForRunB = (scheduleWorkflow.mock.calls[0][2] as { event: Record<string, unknown> })
      .event;
    const telemetryDispatch1 = telemetryClient.reportTriggerEventDispatched.mock.calls[0][0] as {
      eventId: string;
      sourceExecutionId?: string;
      eventChainDepth: number;
    };

    expect(eventForRunB.eventChainDepth).toBe(1);
    expect(telemetryDispatch1.eventId).toBe(metaDispatch1.eventId);
    expect(telemetryDispatch1.eventChainDepth).toBe(0);
    expect(telemetryDispatch1.sourceExecutionId).toBeUndefined();

    // Pretend workflow run B was created for dispatch 1 and persisted execution id `exec-b`.
    const executionIdRunB = 'exec-b';

    scheduleWorkflow.mockClear();
    telemetryClient.reportTriggerEventDispatched.mockClear();
    resolveMatchingWorkflowSubscriptions.mockClear();

    // Dispatch 2: run B emits — chain context identifies which execution caused this hop.
    await handler({
      timestamp: '2025-01-01T12:00:05.000Z',
      triggerId: 'cases.comment_added',
      spaceId,
      payload: { caseId: 'case-1', commentId: 'note-1' },
      request: mockRequest,
      eventChainContext: { depth: 1, sourceExecutionId: executionIdRunB },
    });

    const metaDispatch2 = scheduleWorkflow.mock.calls[0][5] as { eventId: string };
    const eventForRunC = (scheduleWorkflow.mock.calls[0][2] as { event: Record<string, unknown> })
      .event;
    const telemetryDispatch2 = telemetryClient.reportTriggerEventDispatched.mock.calls[0][0] as {
      eventId: string;
      sourceExecutionId?: string;
      eventChainDepth: number;
    };

    expect(eventForRunC.eventChainDepth).toBe(2);
    expect(telemetryDispatch2.eventChainDepth).toBe(1);
    expect(telemetryDispatch2.sourceExecutionId).toBe(executionIdRunB);
    expect(telemetryDispatch2.eventId).toBe(metaDispatch2.eventId);

    // Reconstruction narrative (what operators / tooling can infer):
    // - Run C's execution document should carry dispatchEventId === metaDispatch2.eventId and
    //   context.event.eventChainDepth === 2 (from eventForRunC).
    // - Telemetry (and trigger-event audit when enabled) ties dispatch 2 to emitter executionIdRunB.
    // - Run B was scheduled by dispatch 1 (dispatchEventId === metaDispatch1.eventId on exec-b).
    expect(metaDispatch1.eventId).not.toBe(metaDispatch2.eventId);
  });

  it('should not call scheduleWorkflow when no workflows are subscribed', async () => {
    const scheduleWorkflow = jest.fn();
    const resolveMatchingWorkflowSubscriptions = jest.fn().mockResolvedValue(mockResolveResult([]));
    const telemetryClient = { reportTriggerEventDispatched: jest.fn() };

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      telemetryClient,
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
        eventChainDepth: 1,
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

    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue(mockResolveResult([wf1, wf2, wf3]));
    const telemetryClient = { reportTriggerEventDispatched: jest.fn() };

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      telemetryClient,
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
      'cases.updated',
      expect.objectContaining({
        eventDispatchTimestamp: '2025-01-01T12:00:00.000Z',
        eventTriggerId: 'cases.updated',
        eventId: expect.any(String),
      })
    );
    expect(scheduleWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-2' }),
      'default',
      expect.objectContaining({ event: expect.any(Object) }),
      mockRequest,
      'cases.updated',
      expect.objectContaining({
        eventDispatchTimestamp: '2025-01-01T12:00:00.000Z',
        eventTriggerId: 'cases.updated',
        eventId: expect.any(String),
      })
    );
    expect(scheduleWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-3' }),
      'default',
      expect.objectContaining({ event: expect.any(Object) }),
      mockRequest,
      'cases.updated',
      expect.objectContaining({
        eventDispatchTimestamp: '2025-01-01T12:00:00.000Z',
        eventTriggerId: 'cases.updated',
        eventId: expect.any(String),
      })
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
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue(mockResolveResult([wf1, wf2]));
    const telemetryClient = { reportTriggerEventDispatched: jest.fn() };

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      telemetryClient,
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
      'cases.updated',
      expect.objectContaining({
        eventDispatchTimestamp: '2025-01-01T12:00:00.000Z',
        eventTriggerId: 'cases.updated',
        eventId: expect.any(String),
      })
    );
    expect(scheduleWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-2' }),
      'default',
      expect.objectContaining({ event: expect.any(Object) }),
      mockRequest,
      'cases.updated',
      expect.objectContaining({
        eventDispatchTimestamp: '2025-01-01T12:00:00.000Z',
        eventTriggerId: 'cases.updated',
        eventId: expect.any(String),
      })
    );
  });

  it('should schedule all resolved workflows when none have conditions', async () => {
    const wf1 = createMockWorkflow({ id: 'wf-no-condition-1' });
    const wf2 = createMockWorkflow({ id: 'wf-no-condition-2' });
    const scheduleWorkflow = jest.fn().mockResolvedValue(undefined);
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue(mockResolveResult([wf1, wf2]));
    const telemetryClient = { reportTriggerEventDispatched: jest.fn() };

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      telemetryClient,
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
      'cases.updated',
      expect.objectContaining({
        eventDispatchTimestamp: '2025-01-01T12:00:00.000Z',
        eventTriggerId: 'cases.updated',
        eventId: expect.any(String),
      })
    );
    expect(scheduleWorkflow).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 'wf-no-condition-2' }),
      'default',
      expect.objectContaining({ event: expect.any(Object) }),
      mockRequest,
      'cases.updated',
      expect.objectContaining({
        eventDispatchTimestamp: '2025-01-01T12:00:00.000Z',
        eventTriggerId: 'cases.updated',
        eventId: expect.any(String),
      })
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
      .mockResolvedValue(mockResolveResult([validWf1, invalidWf, validWf2]));
    const telemetryClient = { reportTriggerEventDispatched: jest.fn() };

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      telemetryClient,
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
      'cases.updated',
      expect.objectContaining({
        eventDispatchTimestamp: '2025-01-01T12:00:00.000Z',
        eventTriggerId: 'cases.updated',
        eventId: expect.any(String),
      })
    );
    expect(scheduleWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-valid-2' }),
      'default',
      expect.objectContaining({ event: expect.any(Object) }),
      mockRequest,
      'cases.updated',
      expect.objectContaining({
        eventDispatchTimestamp: '2025-01-01T12:00:00.000Z',
        eventTriggerId: 'cases.updated',
        eventId: expect.any(String),
      })
    );
    expect(scheduleWorkflow).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-invalid' }),
      expect.anything(),
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

    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue(mockResolveResult(workflows));
    const telemetryClient = { reportTriggerEventDispatched: jest.fn() };

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      telemetryClient,
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
    const resolveMatchingWorkflowSubscriptions = jest
      .fn()
      .mockResolvedValue(mockResolveResult([wf1, wf2]));
    const telemetryClient = { reportTriggerEventDispatched: jest.fn() };

    const handler = createTriggerEventHandler({
      api: { scheduleWorkflow } as any,
      logger: mockLogger,
      telemetryClient,
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
