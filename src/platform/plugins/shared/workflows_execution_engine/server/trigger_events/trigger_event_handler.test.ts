/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import type { WorkflowDetailDto } from '@kbn/workflows';
import { TriggerEventHandler, type TriggerEventHandlerDeps } from './trigger_event_handler';

jest.mock('./filter_workflows_by_trigger_condition', () => ({
  classifyWorkflowTriggerMatch: jest.fn().mockReturnValue('matched'),
}));

jest.mock('./event_logs', () => ({
  initializeTriggerEventsClient: jest.fn().mockResolvedValue(null),
  writeTriggerEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@kbn/workflows', () => ({
  WorkflowRepository: jest.fn().mockImplementation(() => ({
    getWorkflowsSubscribedToTrigger: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock('@kbn/workflows/server', () => ({
  validateWorkflowForExecution: jest.fn(),
}));

jest.mock('./event_context/event_chain_context', () => ({
  getEventChainContext: jest.fn().mockReturnValue(undefined),
}));

jest.mock('../lib/telemetry/workflow_execution_telemetry_client', () => ({
  WorkflowExecutionTelemetryClient: jest.fn().mockImplementation(() => ({
    reportTriggerEventDispatched: jest.fn(),
  })),
}));

const { WorkflowRepository } = jest.requireMock('@kbn/workflows') as {
  WorkflowRepository: jest.Mock;
};

const { WorkflowExecutionTelemetryClient } = jest.requireMock(
  '../lib/telemetry/workflow_execution_telemetry_client'
) as { WorkflowExecutionTelemetryClient: jest.Mock };

const createMockWorkflow = (overrides: Partial<WorkflowDetailDto> = {}): WorkflowDetailDto =>
  ({
    id: 'wf-1',
    name: 'Test Workflow',
    enabled: true,
    definition: { triggers: [{ type: 'cases.updated' }], steps: [] },
    yaml: 'triggers: [{ type: "cases.updated" }]\nsteps: []',
    valid: true,
    ...overrides,
  } as WorkflowDetailDto);

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
    WorkflowRepository.mockImplementation(() => ({
      getWorkflowsSubscribedToTrigger: jest
        .fn()
        .mockResolvedValue([createMockWorkflow({ id: 'wf-1' })]),
    }));

    const scheduleWorkflow = jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-1' });
    const deps = createDeps({ scheduleWorkflow });
    const handler = new TriggerEventHandler(deps);

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: { caseId: 'case-123' },
      request: mockRequest,
    });

    expect(scheduleWorkflow).toHaveBeenCalledTimes(1);
    const [workflowArg, contextArg, requestArg] = scheduleWorkflow.mock.calls[0];
    expect(workflowArg.id).toBe('wf-1');
    expect(requestArg).toBe(mockRequest);
    expect(contextArg.triggeredBy).toBe('cases.updated');
    expect(contextArg.event.caseId).toBe('case-123');
    expect(contextArg.event.eventChainDepth).toBe(1);
  });

  it('should not resolve or schedule when execution and logEvents are both disabled', async () => {
    const scheduleWorkflow = jest.fn();
    const deps = createDeps({
      scheduleWorkflow,
      config: { enabled: false, logEvents: false, maxChainDepth: 10 },
    });
    const handler = new TriggerEventHandler(deps);

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: {},
      request: mockRequest,
    });

    expect(scheduleWorkflow).not.toHaveBeenCalled();
    expect(deps.logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Event-driven triggers are disabled')
    );
  });

  it('should not schedule when no workflows are subscribed', async () => {
    WorkflowRepository.mockImplementation(() => ({
      getWorkflowsSubscribedToTrigger: jest.fn().mockResolvedValue([]),
    }));
    const scheduleWorkflow = jest.fn();
    const deps = createDeps({ scheduleWorkflow });
    const handler = new TriggerEventHandler(deps);

    await handler.handleEvent({
      triggerId: 'cases.updated',
      payload: {},
      request: mockRequest,
    });

    expect(scheduleWorkflow).not.toHaveBeenCalled();
  });

  it('should report telemetry with resolution and schedule stats', async () => {
    WorkflowRepository.mockImplementation(() => ({
      getWorkflowsSubscribedToTrigger: jest.fn().mockResolvedValue([createMockWorkflow()]),
    }));
    const deps = createDeps();
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
        resolutionStats: expect.objectContaining({ matchedCount: 1 }),
        scheduleStats: expect.objectContaining({ scheduledSuccessCount: 1 }),
      })
    );
  });

  it('should log warning and continue when one workflow fails scheduling', async () => {
    const wf1 = createMockWorkflow({ id: 'wf-1' });
    const wf2 = createMockWorkflow({ id: 'wf-2' });
    WorkflowRepository.mockImplementation(() => ({
      getWorkflowsSubscribedToTrigger: jest.fn().mockResolvedValue([wf1, wf2]),
    }));
    const scheduleWorkflow = jest.fn().mockImplementation(async (workflow: { id: string }) => {
      if (workflow.id === 'wf-2') throw new Error('Scheduling failed for wf-2');
      return { workflowExecutionId: workflow.id };
    });
    const deps = createDeps({ scheduleWorkflow });
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
    const { getEventChainContext } = jest.requireMock('./event_context/event_chain_context') as {
      getEventChainContext: jest.Mock;
    };
    getEventChainContext.mockReturnValue({ depth: 5, sourceExecutionId: 'exec-1' });

    WorkflowRepository.mockImplementation(() => ({
      getWorkflowsSubscribedToTrigger: jest.fn().mockResolvedValue([createMockWorkflow()]),
    }));
    const scheduleWorkflow = jest.fn();
    const deps = createDeps({
      scheduleWorkflow,
      config: { enabled: true, logEvents: true, maxChainDepth: 5 },
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
});
