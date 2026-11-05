/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardPlugin } from './plugin';
import { coreMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { createEmbeddableStartMock } from '@kbn/embeddable-plugin/server/mocks';
import { scheduleDashboardTelemetry, TASK_ID } from './usage/dashboard_telemetry_collection_task';
import { read } from './api';

jest.mock('./usage/dashboard_telemetry_collection_task', () => ({
  scheduleDashboardTelemetry: jest.fn().mockResolvedValue('ok'),
  TASK_ID: 'mockTaskID',
}));

jest.mock('./api', () => ({
  ...jest.requireActual('./api'),
  read: jest.fn().mockResolvedValue({ body: {} }),
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
        scanDashboards: expect.any(Function),
        client: expect.any(Object),
      });
    });

    test('client.read forwards isDashboardAppRequest to read', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const { client } = new DashboardPlugin(initContext).start(mockCoreStart, {
        embeddable: mockEmbeddable,
        taskManager: mockTaskManager,
      });

      await client.read(savedObjectsClient, 'dashboard-1', { isDashboardAppRequest: true });

      expect(read).toHaveBeenCalledWith(
        savedObjectsClient,
        expect.anything(),
        'dashboard-1',
        undefined,
        true
      );
    });
  });
});
