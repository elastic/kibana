/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardPlugin } from './plugin';
import { coreMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { scheduleDashboardTelemetry, TASK_ID } from './usage/dashboard_telemetry_collection_task';

jest.mock('./usage/dashboard_telemetry_collection_task', () => ({
  scheduleDashboardTelemetry: jest.fn().mockResolvedValue('ok'),
  TASK_ID: 'mockTaskID',
}));

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
        taskManager: mockTaskManager,
      });
      expect(scheduleDashboardTelemetry).toHaveBeenCalledTimes(1);
      expect(await mockTaskManager.runSoon).toHaveBeenCalledTimes(1);
      expect(response).toEqual({});
    });
  });
});
