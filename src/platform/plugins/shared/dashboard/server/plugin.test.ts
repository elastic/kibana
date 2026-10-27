/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardPlugin } from './plugin';
import { coreMock, httpServerMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { AuthenticatedUser } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { asSpaceId } from '@kbn/core-spaces-common';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { createEmbeddableStartMock } from '@kbn/embeddable-plugin/server/mocks';
import { DEFAULT_DASHBOARD_STATE } from '../common/default_dashboard_state';
import { scheduleDashboardTelemetry, TASK_ID } from './usage/dashboard_telemetry_collection_task';
import { create, read, update } from './api';

jest.mock('./usage/dashboard_telemetry_collection_task', () => ({
  scheduleDashboardTelemetry: jest.fn().mockResolvedValue('ok'),
  TASK_ID: 'mockTaskID',
}));

jest.mock('./api', () => {
  const actual = jest.requireActual('./api');
  return {
    ...actual,
    read: jest.fn().mockResolvedValue({ body: {} }),
    create: jest.fn(actual.create),
    update: jest.fn(actual.update),
  };
});

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

    describe('client writes', () => {
      const request = httpServerMock.createKibanaRequest();
      const user = { username: 'elastic' } as AuthenticatedUser;
      let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

      const savedDashboard = (id: string, title: string) => ({
        id,
        type: 'dashboard',
        attributes: { title, panelsJSON: '[]', optionsJSON: '{}' },
        references: [],
      });

      const startClient = () => {
        const spaces = spacesMock.createStart();
        spaces.spacesService.getSpaceId.mockReturnValue(asSpaceId('my-space'));
        return new DashboardPlugin(initContext).start(mockCoreStart, {
          embeddable: mockEmbeddable,
          taskManager: mockTaskManager,
          spaces,
        }).client;
      };

      beforeEach(() => {
        savedObjectsClient = savedObjectsClientMock.create();
        mockCoreStart.savedObjects.getScopedClient.mockReturnValue(savedObjectsClient);
        jest.mocked(mockCoreStart.security.authc.getCurrentUser).mockReturnValue(user);
      });

      test('create writes as the user of the request, in its space', async () => {
        savedObjectsClient.create.mockResolvedValue(savedDashboard('new-id', 'My dashboard'));

        const body = await startClient().create(
          request,
          { ...DEFAULT_DASHBOARD_STATE, title: 'My dashboard' },
          { isDashboardAppRequest: true }
        );

        expect(mockCoreStart.savedObjects.getScopedClient).toHaveBeenCalledWith(request);
        expect(savedObjectsClient.create).toHaveBeenCalledWith(
          'dashboard',
          expect.objectContaining({ title: 'My dashboard' }),
          expect.anything()
        );
        const [services, , , options] = jest.mocked(create).mock.calls[0];
        expect(services.security.authc.getCurrentUser()).toBe(user);
        expect(mockCoreStart.security.authc.getCurrentUser).toHaveBeenCalledWith(request);
        expect(options).toEqual({ spaceId: 'my-space', isDashboardAppRequest: true });
        expect(body).toMatchObject({ id: 'new-id', data: { title: 'My dashboard' } });
      });

      test('update overwrites the dashboard as the user of the request, in its space', async () => {
        savedObjectsClient.get
          .mockResolvedValueOnce(savedDashboard('existing-id', 'Old title'))
          .mockResolvedValueOnce(savedDashboard('existing-id', 'New title'));
        savedObjectsClient.update.mockResolvedValue(savedDashboard('existing-id', 'New title'));

        const body = await startClient().update(request, 'existing-id', {
          ...DEFAULT_DASHBOARD_STATE,
          title: 'New title',
        });

        expect(savedObjectsClient.update).toHaveBeenCalledWith(
          'dashboard',
          'existing-id',
          expect.objectContaining({ title: 'New title' }),
          expect.objectContaining({ mergeAttributes: false })
        );
        expect(savedObjectsClient.create).not.toHaveBeenCalled();
        const [services, , , , options] = jest.mocked(update).mock.calls[0];
        expect(services.security.authc.getCurrentUser()).toBe(user);
        expect(options).toEqual({ spaceId: 'my-space', isDashboardAppRequest: undefined });
        expect(body).toMatchObject({ id: 'existing-id', data: { title: 'New title' } });
      });

      test('update creates the dashboard when the id does not exist', async () => {
        savedObjectsClient.get.mockRejectedValue(
          SavedObjectsErrorHelpers.createGenericNotFoundError('dashboard', 'missing-id')
        );
        savedObjectsClient.create.mockResolvedValue(savedDashboard('missing-id', 'Fresh'));

        const body = await startClient().update(request, 'missing-id', {
          ...DEFAULT_DASHBOARD_STATE,
          title: 'Fresh',
        });

        expect(savedObjectsClient.create).toHaveBeenCalledWith(
          'dashboard',
          expect.objectContaining({ title: 'Fresh' }),
          expect.objectContaining({ id: 'missing-id' })
        );
        expect(body).toMatchObject({ id: 'missing-id', data: { title: 'Fresh' } });
      });
    });
  });
});
