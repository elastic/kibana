/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import type { EsWorkflowExecution, WorkflowDetailDto } from '@kbn/workflows';
import type { WorkflowRepository } from '@kbn/workflows/server';
import { TriggerEventHandler, type TriggerEventHandlerDeps } from './trigger_event_handler';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

jest.mock('./event_logs', () => ({
  initializeTriggerEventsClient: jest.fn().mockResolvedValue(null),
  writeTriggerEvent: jest.fn().mockResolvedValue(undefined),
}));

const mockGetWorkflowExecutionById = jest.fn().mockResolvedValue(null);

jest.mock('../repositories/workflow_execution_repository', () => ({
  WorkflowExecutionRepository: jest.fn().mockImplementation(() => ({
    getWorkflowExecutionById: (...args: unknown[]) => mockGetWorkflowExecutionById(...args),
  })),
}));

jest.mock('@kbn/workflows/server', () => ({
  validateWorkflowForExecution: jest.fn(),
}));

const mockGetEventChainContext = jest.fn().mockReturnValue(undefined);
const mockGetEmitterWorkflowExecutionIdFromRequest = jest.fn().mockReturnValue(undefined);

jest.mock('./event_context/event_chain_context', () => {
  const actual = jest.requireActual<typeof import('./event_context/event_chain_context')>(
    './event_context/event_chain_context'
  );
  return {
    ...actual,
    getEventChainContext: (...args: unknown[]) => mockGetEventChainContext(...args),
    getEmitterWorkflowExecutionIdFromRequest: (...args: unknown[]) =>
      mockGetEmitterWorkflowExecutionIdFromRequest(...args),
  };
});

jest.mock('../lib/telemetry/workflow_execution_telemetry_client', () => ({
  WorkflowExecutionTelemetryClient: jest.fn().mockImplementation(() => ({
    reportTriggerEventDispatched: jest.fn(),
  })),
}));

const { WorkflowExecutionTelemetryClient } = jest.requireMock(
  '../lib/telemetry/workflow_execution_telemetry_client'
) as { WorkflowExecutionTelemetryClient: jest.Mock };

/** Custom trigger types such as `cases.updated` are not in the built-in workflow YAML union. */
interface TestWorkflowDefinition {
  triggers?: Array<{
    type: string;
    'connector-id'?: string;
    on?: { condition?: string; workflowEvents?: string };
  }>;
  steps?: unknown[];
}

const createMockWorkflow = (
  overrides: Omit<Partial<WorkflowDetailDto>, 'definition'> & {
    definition?: TestWorkflowDefinition;
  } = {}
): WorkflowDetailDto => {
  const { definition, ...rest } = overrides;
  return {
    id: 'wf-1',
    name: 'Test Workflow',
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'test',
    lastUpdatedAt: '2026-01-01T00:00:00.000Z',
    lastUpdatedBy: 'test',
    yaml: 'triggers: [{ type: "cases.updated" }]\nsteps: []',
    valid: true,
    ...rest,
    definition: {
      triggers: [{ type: 'cases.updated' }],
      steps: [],
      ...definition,
    } as unknown as WorkflowDetailDto['definition'],
  };
};

const createWorkflowRepositoryMock = (subscribed: WorkflowDetailDto[] = []): WorkflowRepository =>
  ({
    getWorkflowsSubscribedToTrigger: jest.fn().mockResolvedValue(subscribed),
    getWorkflowsByIds: jest.fn(async (ids: readonly string[]) =>
      subscribed.filter((workflow) => ids.includes(workflow.id))
    ),
  } as unknown as WorkflowRepository);

function createDeps(overrides: Partial<TriggerEventHandlerDeps> = {}): TriggerEventHandlerDeps {
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

  return {
    coreStart: coreMock.createStart(),
    workflowRepository: createWorkflowRepositoryMock(),
    workflowExecutionRepository: {
      getWorkflowExecutionById: (...args: unknown[]) => mockGetWorkflowExecutionById(...args),
    } as unknown as WorkflowExecutionRepository,
    workflowsExtensions: {
      getTriggerDefinition: jest.fn().mockReturnValue({ id: 'cases.updated' }),
    } as any,
    spaces: {
      getSpaceId: jest.fn().mockReturnValue('default'),
    } as any,
    config: {
      enabled: true,
      logEvents: true,
      maxChainDepth: 10,
      subscriptionCacheTtl: moment.duration(60, 's'),
    },
    scheduleWorkflow: jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-1' }),
    logger: mockLogger,
    ...overrides,
  };
}

const mockRequest = {} as any;

function getTelemetryMock(): jest.Mock {
  return WorkflowExecutionTelemetryClient.mock.results[
    WorkflowExecutionTelemetryClient.mock.results.length - 1
  ]?.value?.reportTriggerEventDispatched;
}

describe('TriggerEventHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEventChainContext.mockReturnValue(undefined);
    mockGetEmitterWorkflowExecutionIdFromRequest.mockReturnValue(undefined);
    mockGetWorkflowExecutionById.mockResolvedValue(null);
  });

  it('should throw when triggerId is not registered', async () => {
    const deps = createDeps({
      workflowsExtensions: {
        getTriggerDefinition: jest.fn().mockReturnValue(undefined),
      } as any,
    });
    const handler = new TriggerEventHandler(deps);

    await expect(
      handler.handleEvent({
        triggerId: 'unknown.trigger',
        payload: {},
        request: mockRequest,
      })
    ).rejects.toThrow('Trigger "unknown.trigger" is not registered');
  });

  it('should throw when payload does not match the trigger eventSchema', async () => {
    const deps = createDeps({
      workflowsExtensions: {
        getTriggerDefinition: jest.fn().mockReturnValue({
          id: 'cases.updated',
          eventSchema: {
            safeParse: () => ({
              success: false,
              error: new Error('Invalid payload'),
            }),
          },
        }),
      } as any,
    });
    const handler = new TriggerEventHandler(deps);

    await expect(
      handler.handleEvent({
        triggerId: 'cases.updated',
        payload: { wrong: 'shape' },
        request: mockRequest,
      })
    ).rejects.toThrow(/did not match the trigger's eventSchema/);
  });

  it('should schedule workflows when execution is enabled', async () => {
    const scheduleWorkflow = jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-1' });
    const deps = createDeps({
      scheduleWorkflow,
      workflowRepository: createWorkflowRepositoryMock([
        createMockWorkflow({
          id: 'wf-1',
          managed: true,
          managedBy: 'workflowsExtensionsExample',
          originManagedWorkflowId: 'system-example-greeting',
          managedVersion: 3,
        }),
      ]),
    });
    const handler = new TriggerEventHandler(deps);

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: { caseId: 'case-123' },
      request: mockRequest,
    });

    expect(scheduleWorkflow).toHaveBeenCalledTimes(1);
    const [workflowArg, contextArg, requestArg] = scheduleWorkflow.mock.calls[0];
    expect(workflowArg).toMatchObject({
      id: 'wf-1',
      managed: true,
      managedBy: 'workflowsExtensionsExample',
      originManagedWorkflowId: 'system-example-greeting',
      managedVersion: 3,
    });
    expect(requestArg).toBe(mockRequest);
    expect(contextArg.triggeredBy).toBe('cases.updated');
    expect(contextArg.event.caseId).toBe('case-123');
    expect(contextArg.event.eventChainDepth).toBe(1);
    expect(contextArg.event.eventChainVisitedWorkflowIds).toEqual([]);
  });

  it('should pass the same eventChainDepth into KQL resolution as into the scheduled event payload', async () => {
    mockGetEventChainContext.mockReturnValue({
      depth: 2,
      sourceExecutionId: 'exec-other',
      visitedWorkflowIds: ['wf-other'],
    });

    const scheduleWorkflow = jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-1' });
    const deps = createDeps({
      scheduleWorkflow,
      workflowRepository: createWorkflowRepositoryMock([
        createMockWorkflow({
          id: 'wf-1',
          definition: {
            triggers: [{ type: 'cases.updated', on: { condition: 'event.eventChainDepth: 3' } }],
            steps: [],
          },
        }),
      ]),
    });
    const handler = new TriggerEventHandler(deps);

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: { id: '1' },
      request: mockRequest,
    });

    expect(scheduleWorkflow).toHaveBeenCalledTimes(1);
    const contextArg = scheduleWorkflow.mock.calls[0][1] as { event: Record<string, unknown> };
    expect(contextArg.event.eventChainDepth).toBe(3);
    expect(contextArg.event.eventChainVisitedWorkflowIds).toEqual(['wf-other']);
  });

  it('should not resolve or schedule when execution and logEvents are both disabled', async () => {
    const scheduleWorkflow = jest.fn();
    const deps = createDeps({
      scheduleWorkflow,
      config: {
        enabled: false,
        logEvents: false,
        maxChainDepth: 10,
        subscriptionCacheTtl: moment.duration(60, 's'),
      },
    });
    const handler = new TriggerEventHandler(deps);

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: {},
      request: mockRequest,
    });

    expect(scheduleWorkflow).not.toHaveBeenCalled();
    expect(deps.logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Event-driven triggers are off')
    );
  });

  it('should not schedule when no workflows are subscribed', async () => {
    const scheduleWorkflow = jest.fn();
    const deps = createDeps({
      scheduleWorkflow,
      workflowRepository: createWorkflowRepositoryMock([]),
    });
    const handler = new TriggerEventHandler(deps);

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: {},
      request: mockRequest,
    });

    expect(scheduleWorkflow).not.toHaveBeenCalled();
  });

  it('should report telemetry with resolution and schedule stats', async () => {
    const deps = createDeps({
      workflowRepository: createWorkflowRepositoryMock([createMockWorkflow()]),
    });
    const handler = new TriggerEventHandler(deps);

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: { caseId: 'case-1' },
      request: mockRequest,
    });

    const reportMock = getTelemetryMock();
    expect(reportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerId: 'cases.updated',
        eventId: expect.any(String),
        subscriberResolutionMs: expect.any(Number),
        subscriptionCacheOutcome: 'miss',
        resolutionStats: expect.objectContaining({ matchedCount: 1 }),
        scheduleStats: expect.objectContaining({
          scheduledSuccessCount: 1,
          workflowEventsIgnoreSkippedCount: 0,
          workflowEventsCycleSkippedCount: 0,
        }),
      })
    );
  });

  it('should pass requiresConnectorId from the trigger definition', async () => {
    const scheduleWorkflow = jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-1' });
    const deps = createDeps({
      scheduleWorkflow,
      workflowsExtensions: {
        getTriggerDefinition: jest.fn().mockReturnValue({
          id: 'inboundWebhook.received',
          requiresConnectorId: true,
        }),
      } as any,
      workflowRepository: createWorkflowRepositoryMock([
        createMockWorkflow({
          id: 'wf-matching-connector',
          definition: {
            triggers: [{ type: 'inboundWebhook.received', 'connector-id': 'webhook-1' }],
            steps: [],
          },
        }),
      ]),
    });
    const handler = new TriggerEventHandler(deps);

    await handler.handleEvent({
      triggerId: 'inboundWebhook.received',
      payload: { connectorId: 'webhook-1' },
      request: { headers: { authorization: 'ApiKey encoded-key' } } as KibanaRequest,
    });

    expect(scheduleWorkflow).toHaveBeenCalledTimes(1);
    expect(scheduleWorkflow.mock.calls[0][0]).toMatchObject({ id: 'wf-matching-connector' });
  });

  it('should not schedule workflows skipped by connector-id mismatch', async () => {
    const scheduleWorkflow = jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-1' });
    const deps = createDeps({
      scheduleWorkflow,
      workflowsExtensions: {
        getTriggerDefinition: jest.fn().mockReturnValue({
          id: 'inboundWebhook.received',
          requiresConnectorId: true,
        }),
      } as any,
      workflowRepository: createWorkflowRepositoryMock([
        createMockWorkflow({
          id: 'wf-other-connector',
          definition: {
            triggers: [{ type: 'inboundWebhook.received', 'connector-id': 'other' }],
            steps: [],
          },
        }),
        createMockWorkflow({
          id: 'wf-matching-connector',
          definition: {
            triggers: [{ type: 'inboundWebhook.received', 'connector-id': 'webhook-1' }],
            steps: [],
          },
        }),
      ]),
    });
    const handler = new TriggerEventHandler(deps);

    await handler.handleEvent({
      triggerId: 'inboundWebhook.received',
      payload: { connectorId: 'webhook-1' },
      request: { headers: { authorization: 'ApiKey encoded-key' } } as KibanaRequest,
    });

    expect(scheduleWorkflow).toHaveBeenCalledTimes(1);
    expect(scheduleWorkflow.mock.calls[0][0]).toMatchObject({ id: 'wf-matching-connector' });
    expect(getTelemetryMock()).toHaveBeenCalledWith(
      expect.objectContaining({
        resolutionStats: expect.objectContaining({
          connectorIdMismatchCount: 1,
          matchedCount: 1,
        }),
      })
    );
  });

  it('should log warning and continue when one workflow fails scheduling', async () => {
    const wf1 = createMockWorkflow({ id: 'wf-1' });
    const wf2 = createMockWorkflow({ id: 'wf-2' });
    const scheduleWorkflow = jest.fn().mockImplementation(async (workflow: { id: string }) => {
      if (workflow.id === 'wf-2') throw new Error('Scheduling failed for wf-2');
      return { workflowExecutionId: workflow.id };
    });
    const deps = createDeps({
      scheduleWorkflow,
      workflowRepository: createWorkflowRepositoryMock([wf1, wf2]),
    });
    const handler = new TriggerEventHandler(deps);

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: {},
      request: mockRequest,
    });

    expect(scheduleWorkflow).toHaveBeenCalledTimes(2);
    expect(deps.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Event-driven workflow scheduling failed')
    );
  });

  it('should skip scheduling when event chain depth exceeds max', async () => {
    mockGetEventChainContext.mockReturnValue({ depth: 5, sourceExecutionId: 'exec-1' });

    const scheduleWorkflow = jest.fn();
    const deps = createDeps({
      scheduleWorkflow,
      config: {
        enabled: true,
        logEvents: true,
        maxChainDepth: 5,
        subscriptionCacheTtl: moment.duration(60, 's'),
      },
      workflowRepository: createWorkflowRepositoryMock([createMockWorkflow()]),
    });
    const handler = new TriggerEventHandler(deps);

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: {},
      request: mockRequest,
    });

    expect(deps.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Event chain depth (6) exceeds max')
    );
    expect(scheduleWorkflow).not.toHaveBeenCalled();
  });

  it('should skip scheduling when target workflow is already in the event chain (cycle guard)', async () => {
    mockGetEventChainContext.mockReturnValue({
      depth: 2,
      sourceExecutionId: 'exec-1',
      visitedWorkflowIds: ['wf-1'],
    });
    const scheduleWorkflow = jest.fn();
    const deps = createDeps({
      scheduleWorkflow,
      workflowRepository: createWorkflowRepositoryMock([createMockWorkflow({ id: 'wf-1' })]),
    });
    const handler = new TriggerEventHandler(deps);

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: { id: '1' },
      request: mockRequest,
    });

    expect(scheduleWorkflow).not.toHaveBeenCalled();
    expect(deps.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Event chain cycle guard skipped scheduling workflow wf-1')
    );
    const reportMock = getTelemetryMock();
    expect(reportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleStats: expect.objectContaining({
          workflowEventsCycleSkippedCount: 1,
          scheduledSuccessCount: 0,
        }),
      })
    );
  });

  it('should skip scheduling when on.workflowEvents is ignore and emit has workflow chain context', async () => {
    mockGetEventChainContext.mockReturnValue({ depth: 0, sourceExecutionId: 'exec-x' });
    const wf = createMockWorkflow({
      id: 'wf-1',
      definition: {
        triggers: [{ type: 'cases.updated', on: { workflowEvents: 'ignore' } }],
        steps: [],
      },
    });
    const scheduleWorkflow = jest.fn();
    const deps = createDeps({
      scheduleWorkflow,
      workflowRepository: createWorkflowRepositoryMock([wf]),
    });
    const handler = new TriggerEventHandler(deps);

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: {},
      request: mockRequest,
    });

    expect(scheduleWorkflow).not.toHaveBeenCalled();
    const reportMock = getTelemetryMock();
    expect(reportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleStats: expect.objectContaining({
          workflowEventsIgnoreSkippedCount: 1,
        }),
      })
    );
  });

  it('should use on.workflowEvents from the connector-id matching trigger, not the first same-type block', async () => {
    mockGetEventChainContext.mockReturnValue({ depth: 0, sourceExecutionId: 'exec-x' });
    const wf = createMockWorkflow({
      id: 'wf-1',
      definition: {
        triggers: [
          {
            type: 'inboundWebhook.received',
            'connector-id': 'webhook-1',
            on: { workflowEvents: 'ignore' },
          },
          {
            type: 'inboundWebhook.received',
            'connector-id': 'webhook-2',
            on: { workflowEvents: 'allow-all' },
          },
        ],
        steps: [],
      },
    });
    const scheduleWorkflow = jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-1' });
    const deps = createDeps({
      scheduleWorkflow,
      workflowsExtensions: {
        getTriggerDefinition: jest.fn().mockReturnValue({
          id: 'inboundWebhook.received',
          requiresConnectorId: true,
        }),
      } as any,
      workflowRepository: createWorkflowRepositoryMock([wf]),
    });
    const handler = new TriggerEventHandler(deps);

    await handler.handleEvent({
      triggerId: 'inboundWebhook.received',
      payload: { connectorId: 'webhook-2' },
      request: { headers: { authorization: 'ApiKey encoded-key' } } as KibanaRequest,
    });

    expect(scheduleWorkflow).toHaveBeenCalledTimes(1);
    expect(getTelemetryMock()).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleStats: expect.objectContaining({
          workflowEventsIgnoreSkippedCount: 0,
          scheduledSuccessCount: 1,
        }),
      })
    );
  });

  it('warns when emitter execution persisted depth disagrees with depth header on internal requests', async () => {
    mockGetEventChainContext.mockReturnValue(undefined);
    mockGetEmitterWorkflowExecutionIdFromRequest.mockReturnValue('exec-emit');
    mockGetWorkflowExecutionById.mockResolvedValue({
      id: 'exec-emit',
      workflowId: 'wf-emitter',
      eventChainDepth: 2,
    } as unknown as EsWorkflowExecution);

    const scheduleWorkflow = jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-new' });
    const deps = createDeps({
      scheduleWorkflow,
      workflowRepository: createWorkflowRepositoryMock([
        createMockWorkflow({ id: 'wf-subscriber' }),
      ]),
    });
    const handler = new TriggerEventHandler(deps);

    const request = {
      isInternalApiRequest: true,
      headers: { 'x-kibana-event-chain-depth': '5' },
    } as unknown as KibanaRequest;

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: { caseId: '1' },
      request,
    });

    expect(deps.logger.warn).toHaveBeenCalledWith(
      expect.stringMatching(/depth header \(5\).*persisted depth \(2\)/)
    );
    expect(scheduleWorkflow).toHaveBeenCalledTimes(1);
  });

  it('does not warn about depth mismatch when header matches persisted emitter execution depth', async () => {
    mockGetEventChainContext.mockReturnValue(undefined);
    mockGetEmitterWorkflowExecutionIdFromRequest.mockReturnValue('exec-emit');
    mockGetWorkflowExecutionById.mockResolvedValue({
      id: 'exec-emit',
      workflowId: 'wf-emitter',
      eventChainDepth: 3,
    } as unknown as EsWorkflowExecution);

    const scheduleWorkflow = jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-new' });
    const deps = createDeps({
      scheduleWorkflow,
      workflowRepository: createWorkflowRepositoryMock([
        createMockWorkflow({ id: 'wf-subscriber' }),
      ]),
    });
    const handler = new TriggerEventHandler(deps);

    const request = {
      isInternalApiRequest: true,
      headers: { 'x-kibana-event-chain-depth': '3' },
    } as unknown as KibanaRequest;

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: { caseId: '1' },
      request,
    });

    expect(deps.logger.warn).not.toHaveBeenCalledWith(
      expect.stringMatching(/does not match persisted depth/)
    );
    expect(scheduleWorkflow).toHaveBeenCalledTimes(1);
  });

  it('skips schedule for a connector-sourced event without Authorization', async () => {
    const scheduleWorkflow = jest.fn();
    const deps = createDeps({
      scheduleWorkflow,
      workflowRepository: createWorkflowRepositoryMock([createMockWorkflow()]),
    });
    const handler = new TriggerEventHandler(deps);

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: { connectorId: 'c1' },
      request: { headers: {} } as KibanaRequest,
    });

    expect(scheduleWorkflow).not.toHaveBeenCalled();
    expect(deps.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('request has no Authorization header')
    );
  });

  it('schedules a connector-sourced event when Authorization is present', async () => {
    const scheduleWorkflow = jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-1' });
    const deps = createDeps({
      scheduleWorkflow,
      workflowRepository: createWorkflowRepositoryMock([createMockWorkflow()]),
    });
    const handler = new TriggerEventHandler(deps);

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: { connectorId: 'c1' },
      request: { headers: { authorization: 'ApiKey encoded-key' } } as KibanaRequest,
    });

    expect(scheduleWorkflow).toHaveBeenCalledTimes(1);
  });

  it('skips schedule when connector-id does not match', async () => {
    const scheduleWorkflow = jest.fn();
    const deps = createDeps({
      scheduleWorkflow,
      workflowsExtensions: {
        getTriggerDefinition: jest.fn().mockReturnValue({
          id: 'cases.updated',
          requiresConnectorId: true,
        }),
      } as any,
      workflowRepository: createWorkflowRepositoryMock([
        createMockWorkflow({
          definition: {
            triggers: [{ type: 'cases.updated', 'connector-id': 'inbound-a' }],
            steps: [],
          },
        }),
      ]),
    });
    const handler = new TriggerEventHandler(deps);

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: { connectorId: 'inbound-b' },
      request: { headers: { authorization: 'ApiKey encoded-key' } } as KibanaRequest,
    });

    expect(scheduleWorkflow).not.toHaveBeenCalled();
  });

  it('still schedules Manual Run events that have no Authorization header', async () => {
    const scheduleWorkflow = jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-1' });
    const deps = createDeps({
      scheduleWorkflow,
      workflowRepository: createWorkflowRepositoryMock([createMockWorkflow()]),
    });
    const handler = new TriggerEventHandler(deps);

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: { caseId: 'case-1' },
      request: mockRequest,
    });

    expect(scheduleWorkflow).toHaveBeenCalledTimes(1);
  });

  it('does not reload subscribers on a later emit for the same space and trigger', async () => {
    const workflowRepository = createWorkflowRepositoryMock([createMockWorkflow()]);
    const scheduleWorkflow = jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-1' });
    const handler = new TriggerEventHandler(createDeps({ scheduleWorkflow, workflowRepository }));

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: { n: 1 },
      request: mockRequest,
    });
    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: { n: 2 },
      request: mockRequest,
    });

    expect(workflowRepository.getWorkflowsSubscribedToTrigger).toHaveBeenCalledTimes(1);
    expect(workflowRepository.getWorkflowsByIds).toHaveBeenCalledTimes(1);
    expect(workflowRepository.getWorkflowsByIds).toHaveBeenCalledWith(['wf-1'], 'default');
    expect(scheduleWorkflow).toHaveBeenCalledTimes(2);
    const reportMock = getTelemetryMock();
    expect(reportMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ subscriptionCacheOutcome: 'miss' })
    );
    expect(reportMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ subscriptionCacheOutcome: 'hit' })
    );
  });

  it('loads subscribers again for the same trigger in another space', async () => {
    const workflowRepository = createWorkflowRepositoryMock([createMockWorkflow()]);
    const handler = new TriggerEventHandler(
      createDeps({
        workflowRepository,
        spaces: {
          getSpaceId: jest.fn().mockReturnValueOnce('space-a').mockReturnValueOnce('space-b'),
        } as any,
      })
    );

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: {},
      request: mockRequest,
    });
    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: {},
      request: mockRequest,
    });

    expect(workflowRepository.getWorkflowsSubscribedToTrigger).toHaveBeenCalledTimes(2);
    expect(workflowRepository.getWorkflowsSubscribedToTrigger).toHaveBeenNthCalledWith(
      1,
      'cases.updated',
      'space-a'
    );
    expect(workflowRepository.getWorkflowsSubscribedToTrigger).toHaveBeenNthCalledWith(
      2,
      'cases.updated',
      'space-b'
    );
  });

  it('reports an expired subscriber cache entry as a miss', async () => {
    jest.useFakeTimers();
    try {
      const workflowRepository = createWorkflowRepositoryMock([createMockWorkflow()]);
      const handler = new TriggerEventHandler(
        createDeps({
          workflowRepository,
          config: {
            enabled: true,
            logEvents: true,
            maxChainDepth: 10,
            subscriptionCacheTtl: moment.duration(1, 's'),
          },
        })
      );

      await handler.handleEvent({
        triggerId: 'cases.updated',
        payload: {},
        request: mockRequest,
      });
      await jest.advanceTimersByTimeAsync(1000);
      await handler.handleEvent({
        triggerId: 'cases.updated',
        payload: {},
        request: mockRequest,
      });

      expect(workflowRepository.getWorkflowsSubscribedToTrigger).toHaveBeenCalledTimes(2);
      const reportMock = getTelemetryMock();
      expect(reportMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ subscriptionCacheOutcome: 'miss' })
      );
      expect(reportMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ subscriptionCacheOutcome: 'miss' })
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
