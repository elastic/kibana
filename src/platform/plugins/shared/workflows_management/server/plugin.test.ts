/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('./api/routes', () => ({ defineRoutes: jest.fn() }));
jest.mock('./api/workflows_management_api', () => ({
  WorkflowsManagementApi: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('./api/workflows_management_service', () => ({
  WorkflowsService: jest.fn().mockImplementation(() => ({
    getCoreStart: jest.fn().mockResolvedValue({ security: { authc: {} } }),
    cleanupUnregisteredOrphans: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('./services/workflow_change_history_service');

import { coreMock } from '@kbn/core/server/mocks';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';

import { WorkflowsPlugin } from './plugin';
import { WorkflowChangeHistoryService } from './services/workflow_change_history_service';

const MockedWorkflowChangeHistoryService = WorkflowChangeHistoryService as jest.MockedClass<
  typeof WorkflowChangeHistoryService
>;

describe('WorkflowsPlugin change history', () => {
  let changeHistoryInstance: { initialize: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    changeHistoryInstance = { initialize: jest.fn() };
    MockedWorkflowChangeHistoryService.mockImplementation(
      () => changeHistoryInstance as unknown as WorkflowChangeHistoryService
    );
  });

  it('exposes change history on start and initializes the service', () => {
    const initializerContext = coreMock.createPluginInitializerContext({
      enabled: true,
      logging: { console: false },
      available: true,
      globalExecutionsView: { enabled: false },
    });

    const plugin = new WorkflowsPlugin(initializerContext);
    const coreSetup = coreMock.createSetup();
    const spacesMock = { spacesService: { getActiveSpace: jest.fn() } };

    plugin.setup(coreSetup, {
      spaces: spacesMock as any,
      workflowsExtensions: workflowsExtensionsMock.createSetup(),
    });

    const coreStart = coreMock.createStart();

    const start = plugin.start(coreStart, {
      taskManager: {} as any,
      workflowsExecutionEngine: {} as any,
      actions: {} as any,
      spaces: {} as any,
      workflowsExtensions: workflowsExtensionsMock.createStart(),
      licensing: {} as any,
    });

    expect(start.changeHistory).toBe(changeHistoryInstance);
    expect(changeHistoryInstance.initialize).toHaveBeenCalledWith({
      elasticsearchClient: coreStart.elasticsearch.client.asInternalUser,
      authService: coreStart.security.authc,
    });
  });
});
