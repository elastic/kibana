/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock, MockedClass, MockedFunction } from 'vitest';

vi.mock('./api/routes', () => {
      const mocked = { defineRoutes: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('./api/workflows_management_api', () => {
      const mocked = {
      WorkflowsManagementApi: vi.fn().mockImplementation(() => ({
        setAuditLog: vi.fn(),
      })),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./api/workflows_management_service');
vi.mock('@kbn/workflows-execution-engine/server', () => {
      const mocked = {
      registerHitlLifecycleAuditor: vi.fn(() => vi.fn()),
    };
      return { ...mocked, default: mocked };
    });

import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { registerHitlLifecycleAuditor } from '@kbn/workflows-execution-engine/server';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';

import { WorkflowsService } from './api/workflows_management_service';
import { ExecutionDataViewsBootstrap } from './execution_data_views_bootstrap';
import { WorkflowsPlugin } from './plugin';

const MockedWorkflowsService = WorkflowsService as MockedClass<typeof WorkflowsService>;
const mockRegisterHitlLifecycleAuditor = registerHitlLifecycleAuditor as MockedFunction<
  typeof registerHitlLifecycleAuditor
>;

describe('WorkflowsPlugin', () => {
  const setStopping = vi.fn();
  const cleanupUnregisteredOrphans = vi.fn().mockResolvedValue(undefined);
  const unregisterHitlLifecycleAuditor = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRegisterHitlLifecycleAuditor.mockReturnValue(unregisterHitlLifecycleAuditor);
    MockedWorkflowsService.mockImplementation(
      () =>
        ({
          getCoreStart: vi.fn().mockResolvedValue({ security: { authc: {} } }),
          cleanupUnregisteredOrphans,
          setStopping,
        } as unknown as WorkflowsService)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an empty start contract and clears the stopping flag', () => {
    const initializerContext = coreMock.createPluginInitializerContext({
      enabled: true,
      logging: { console: false },
      available: true,
      library: { ttlMs: 600_000 },
    });

    const plugin = new WorkflowsPlugin(initializerContext);
    const coreSetup = coreMock.createSetup();

    plugin.setup(coreSetup, {
      spaces: { spacesService: { getActiveSpace: vi.fn() } } as any,
      workflowsExtensions: workflowsExtensionsMock.createSetup(),
    });

    const start = plugin.start(coreMock.createStart(), {
      taskManager: {} as any,
      workflowsExecutionEngine: {} as any,
      actions: {} as any,
      spaces: {} as any,
      workflowsExtensions: workflowsExtensionsMock.createStart(),
      licensing: {} as any,
      dataViews: {} as any,
    });

    expect(start).toEqual({});
    expect(setStopping).toHaveBeenCalledWith(false);
    expect(mockRegisterHitlLifecycleAuditor).toHaveBeenCalled();
  });

  it('marks the workflows service as stopping on stop()', () => {
    const initializerContext = coreMock.createPluginInitializerContext({
      enabled: true,
      logging: { console: false },
      available: true,
      library: { ttlMs: 600_000 },
    });

    const plugin = new WorkflowsPlugin(initializerContext);
    plugin.setup(coreMock.createSetup(), {
      spaces: { spacesService: { getActiveSpace: vi.fn() } } as any,
      workflowsExtensions: workflowsExtensionsMock.createSetup(),
    });
    plugin.start(coreMock.createStart(), {
      taskManager: {} as any,
      workflowsExecutionEngine: {} as any,
      actions: {} as any,
      spaces: {} as any,
      workflowsExtensions: workflowsExtensionsMock.createStart(),
      licensing: {} as any,
      dataViews: {} as any,
    });

    setStopping.mockClear();
    plugin.stop();

    expect(setStopping).toHaveBeenCalledWith(true);
    expect(unregisterHitlLifecycleAuditor).toHaveBeenCalled();
  });

  it('bootstraps data views with internal clients scoped to the request space', async () => {
    const initializerContext = coreMock.createPluginInitializerContext({
      enabled: true,
      logging: { console: false },
      available: true,
      library: { ttlMs: 600_000 },
    });
    const plugin = new WorkflowsPlugin(initializerContext);
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const dataViews = { dataViewsServiceFactory: vi.fn() };
    coreSetup.getStartServices.mockResolvedValue([coreStart, { dataViews }, {}] as never);
    const spaces = {
      spacesService: {
        getActiveSpace: vi.fn(),
        getSpaceId: vi.fn().mockReturnValue('marketing'),
      },
    };
    const ensureForSpace = vi
      .spyOn(ExecutionDataViewsBootstrap.prototype, 'ensureForSpaceFireAndForget')
      .mockImplementation();

    plugin.setup(coreSetup, {
      spaces: spaces as never,
      workflowsExtensions: workflowsExtensionsMock.createSetup(),
    });

    const registerRouteHandlerContext = coreSetup.http.registerRouteHandlerContext as Mock;
    const contextProvider = registerRouteHandlerContext.mock.calls.find(
      ([contextName]: [string]) => contextName === 'workflowsManagement'
    )?.[1];
    expect(contextProvider).toBeDefined();
    await contextProvider?.(
      {} as never,
      httpServerMock.createKibanaRequest(),
      httpServerMock.createResponseFactory()
    );

    expect(coreStart.savedObjects.getUnsafeInternalClient).toHaveBeenCalledTimes(1);
    const internalSavedObjectsClient =
      coreStart.savedObjects.getUnsafeInternalClient.mock.results[0].value;
    expect(internalSavedObjectsClient.asScopedToNamespace).toHaveBeenCalledWith('marketing');
    expect(ensureForSpace).toHaveBeenCalledWith(
      'marketing',
      internalSavedObjectsClient.asScopedToNamespace.mock.results[0].value,
      coreStart.elasticsearch.client.asInternalUser
    );
    expect(coreStart.savedObjects.getScopedClient).not.toHaveBeenCalled();
  });

  it('does not register connector-event triggers when inbound events are disabled', () => {
    const actions = actionsMock.createSetup();
    (
      actions.getActionsConfigurationUtilities().isInboundEventsEnabled as Mock
    ).mockReturnValue(false);
    const workflowsExtensions = workflowsExtensionsMock.createSetup();
    const plugin = new WorkflowsPlugin(
      coreMock.createPluginInitializerContext({
        enabled: true,
        logging: { console: false },
        available: true,
        library: { ttlMs: 600_000 },
      })
    );

    plugin.setup(coreMock.createSetup(), {
      actions,
      spaces: { spacesService: { getActiveSpace: vi.fn() } } as any,
      workflowsExtensions,
    });

    const connectorEventRegistrations =
      workflowsExtensions.registerTriggerDefinition.mock.calls.filter(
        ([definition]) => definition.id === 'inboundWebhook.received'
      );
    expect(connectorEventRegistrations).toHaveLength(0);
  });

  it('registers inboundWebhook.received when inbound events are enabled', () => {
    const actions = actionsMock.createSetup();
    (
      actions.getActionsConfigurationUtilities().isInboundEventsEnabled as Mock
    ).mockReturnValue(true);
    const workflowsExtensions = workflowsExtensionsMock.createSetup();
    const plugin = new WorkflowsPlugin(
      coreMock.createPluginInitializerContext({
        enabled: true,
        logging: { console: false },
        available: true,
        library: { ttlMs: 600_000 },
      })
    );

    plugin.setup(coreMock.createSetup(), {
      actions,
      spaces: { spacesService: { getActiveSpace: vi.fn() } } as any,
      workflowsExtensions,
    });

    expect(workflowsExtensions.registerTriggerDefinition).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'inboundWebhook.received',
        stability: 'tech_preview',
        requiresConnectorId: true,
      })
    );
  });
});
