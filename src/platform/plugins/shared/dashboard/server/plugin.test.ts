/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardPlugin } from './plugin';
import { coreMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { createEmbeddableStartMock } from '@kbn/embeddable-plugin/server/mocks';
import { scheduleDashboardTelemetry, TASK_ID } from './usage/dashboard_telemetry_collection_task';
import type { DashboardCreateRequestBody, DashboardUpdateRequestBody } from './api';

jest.mock('./usage/dashboard_telemetry_collection_task', () => ({
  scheduleDashboardTelemetry: jest.fn().mockResolvedValue('ok'),
  TASK_ID: 'mockTaskID',
}));

const mockEmbeddable = createEmbeddableStartMock();

describe('DashboardPlugin', () => {
  describe('start', () => {
    let mockCoreStart: ReturnType<typeof coreMock.createStart>;
    let initContext: ReturnType<typeof coreMock.createPluginInitializerContext>;
    let mockTaskManager: ReturnType<typeof taskManagerMock.createStart>;

    beforeEach(() => {
      mockCoreStart = coreMock.createStart();
      mockTaskManager = taskManagerMock.createStart();
      initContext = coreMock.createPluginInitializerContext();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should call mockTaskManager.runSoon', async () => {
      const dashboardPlugin = new DashboardPlugin(initContext);
      dashboardPlugin.start(mockCoreStart, {
        embeddable: mockEmbeddable,
        taskManager: mockTaskManager,
      });
      expect(scheduleDashboardTelemetry).toHaveBeenCalledTimes(1);
      expect(await mockTaskManager.runSoon).toHaveBeenCalledTimes(1);
      expect(await mockTaskManager.runSoon).toHaveBeenCalledWith(TASK_ID);
    });

    test('error from runSoon is handled gracefully', async () => {
      const dashboardPlugin = new DashboardPlugin(initContext);
      mockTaskManager.runSoon.mockRejectedValueOnce(500);
      const response = dashboardPlugin.start(mockCoreStart, {
        embeddable: mockEmbeddable,
        taskManager: mockTaskManager,
      });
      expect(scheduleDashboardTelemetry).toHaveBeenCalledTimes(1);
      expect(await mockTaskManager.runSoon).toHaveBeenCalledTimes(1);
      expect(response).toEqual({
        getDashboard: expect.any(Function),
        scanDashboards: expect.any(Function),
        client: expect.any(Object),
      });
    });
  });

  describe('client', () => {
    let mockCoreStart: ReturnType<typeof coreMock.createStart>;
    let initContext: ReturnType<typeof coreMock.createPluginInitializerContext>;
    let mockTaskManager: ReturnType<typeof taskManagerMock.createStart>;
    let mockRequestHandlerContext: any;
    let mockCoreContext: ReturnType<typeof coreMock.createRequestHandlerContext>;
    let dashboardPlugin: DashboardPlugin;
    let pluginStart: ReturnType<DashboardPlugin['start']>;

    beforeEach(() => {
      mockCoreStart = coreMock.createStart();
      mockTaskManager = taskManagerMock.createStart();
      initContext = coreMock.createPluginInitializerContext();
      mockCoreContext = coreMock.createRequestHandlerContext();

      // Create a proper mock RequestHandlerContext with resolve method
      mockRequestHandlerContext = {
        core: Promise.resolve(mockCoreContext),
        resolve: jest.fn().mockImplementation(async (deps: string[]) => {
          const resolved: any = {};
          for (const dep of deps) {
            if (dep === 'core') {
              resolved.core = mockCoreContext;
            }
          }
          return resolved;
        }),
      };

      dashboardPlugin = new DashboardPlugin(initContext);
      pluginStart = dashboardPlugin.start(mockCoreStart, {
        embeddable: mockEmbeddable,
        taskManager: mockTaskManager,
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('client should be an object with create, read, update, delete methods', () => {
      expect(typeof pluginStart.client.create).toBe('function');
      expect(typeof pluginStart.client.read).toBe('function');
      expect(typeof pluginStart.client.update).toBe('function');
      expect(typeof pluginStart.client.delete).toBe('function');
    });

    test('client.create should call the create function', async () => {
      const mockSavedObject = {
        id: 'test-id',
        type: 'dashboard',
        attributes: {
          title: 'Test Dashboard',
          description: 'Test Description',
        },
        references: [],
      };

      mockCoreContext.savedObjects.client.create = jest.fn().mockResolvedValue(mockSavedObject);

      const createBody: DashboardCreateRequestBody = {
        data: {
          title: 'Test Dashboard',
          description: 'Test Description',
        },
      };

      await pluginStart.client.create(mockRequestHandlerContext, createBody);

      expect(mockCoreContext.savedObjects.client.create).toHaveBeenCalled();
    });

    test('client.read should call the read function', async () => {
      const mockResolvedObject = {
        saved_object: {
          id: 'test-id',
          type: 'dashboard',
          attributes: {
            title: 'Test Dashboard',
            description: 'Test Description',
          },
          references: [],
        },
        outcome: 'exactMatch' as const,
      };

      mockCoreContext.savedObjects.client.resolve = jest.fn().mockResolvedValue(mockResolvedObject);

      await pluginStart.client.read(mockRequestHandlerContext, 'test-id');

      expect(mockCoreContext.savedObjects.client.resolve).toHaveBeenCalledWith(
        'dashboard',
        'test-id'
      );
    });

    test('client.update should call the update function', async () => {
      const mockUpdatedObject = {
        id: 'test-id',
        type: 'dashboard',
        attributes: {
          title: 'Updated Dashboard',
          description: 'Updated Description',
        },
        references: [],
      };

      mockCoreContext.savedObjects.client.update = jest.fn().mockResolvedValue(mockUpdatedObject);

      const updateBody: DashboardUpdateRequestBody = {
        data: {
          title: 'Updated Dashboard',
          description: 'Updated Description',
        },
      };

      await pluginStart.client.update(mockRequestHandlerContext, 'test-id', updateBody);

      expect(mockCoreContext.savedObjects.client.update).toHaveBeenCalled();
    });

    test('client.delete should call the delete function', async () => {
      mockCoreContext.savedObjects.client.delete = jest.fn().mockResolvedValue({});

      await pluginStart.client.delete(mockRequestHandlerContext, 'test-id');

      expect(mockCoreContext.savedObjects.client.delete).toHaveBeenCalledWith(
        'dashboard',
        'test-id'
      );
    });
  });
});
