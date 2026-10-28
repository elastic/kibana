/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { coreMock, securityServiceMock } from '@kbn/core/server/mocks';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { createEmbeddableStartMock } from '@kbn/embeddable-plugin/server/mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { getChangeHistoryClient } from './change_history/change_history_service';
import type { DashboardSavedObjectAttributes } from './dashboard_saved_object';
import { DashboardValidationError } from './dashboard_validation_error';
import { DashboardPlugin } from './plugin';

jest.mock('./usage/dashboard_telemetry_collection_task', () => ({
  scheduleDashboardTelemetry: jest.fn().mockResolvedValue('ok'),
  TASK_ID: 'mockTaskID',
}));
jest.mock('./change_history/change_history_service');

const mockedGetChangeHistoryClient = getChangeHistoryClient as jest.MockedFunction<
  typeof getChangeHistoryClient
>;

const storedAttributes: DashboardSavedObjectAttributes = {
  pinned_panels: { panels: {} },
  description: '',
  kibanaSavedObjectMeta: {
    searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' } }),
  },
  optionsJSON: JSON.stringify({}),
  panelsJSON: JSON.stringify([]),
  sections: [],
  timeRestore: false,
  title: 'Existing',
  historySequence: 1,
};

describe('dashboard server client writes', () => {
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let embeddable: ReturnType<typeof createEmbeddableStartMock>;
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let historyLog: jest.Mock;
  const request = httpServerMock.createKibanaRequest();
  const user = securityServiceMock.createMockAuthenticatedUser({
    username: 'elastic',
    profile_uid: 'u_1',
  });

  const startClient = () => {
    const spaces = spacesMock.createStart();
    spaces.spacesService.getSpaceId = jest.fn().mockReturnValue('my-space');
    return new DashboardPlugin(coreMock.createPluginInitializerContext()).start(coreStart, {
      embeddable,
      taskManager: taskManagerMock.createStart(),
      spaces,
    }).client;
  };

  const mockDashboardDoesNotExist = () =>
    savedObjectsClient.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('dashboard', 'missing')
    );

  const mockExistingDashboard = (id: string) => {
    savedObjectsClient.get.mockResolvedValue({
      id,
      type: 'dashboard',
      attributes: storedAttributes,
      references: [],
      version: '1',
    });
    savedObjectsClient.update.mockImplementation(async (type, updatedId, attributes) => ({
      id: updatedId,
      type,
      attributes,
      references: [],
      version: '2',
    }));
  };

  beforeEach(() => {
    coreStart = coreMock.createStart();
    embeddable = createEmbeddableStartMock();
    savedObjectsClient = coreStart.savedObjects.getScopedClient(
      request
    ) as jest.Mocked<SavedObjectsClientContract>;
    coreStart.savedObjects.getScopedClient.mockClear();
    jest.mocked(coreStart.security.authc.getCurrentUser).mockReturnValue(user);
    savedObjectsClient.create.mockImplementation(async (type, attributes, options) => ({
      id: options?.id ?? 'generated-id',
      type,
      attributes,
      references: options?.references ?? [],
    }));
    historyLog = jest.fn().mockResolvedValue(undefined);
    mockedGetChangeHistoryClient.mockResolvedValue({
      getHistory: jest.fn().mockResolvedValue({ items: [] }),
      log: historyLog,
    } as never);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('saves the state with schema defaults through the client scoped to the request', async () => {
      const client = startClient();

      const result = await client.create(request, { title: 'My dashboard' });

      expect(coreStart.savedObjects.getScopedClient).toHaveBeenCalledWith(request);
      const [type, attributes] = savedObjectsClient.create.mock.calls[0];
      expect(type).toBe('dashboard');
      expect(JSON.parse((attributes as DashboardSavedObjectAttributes).optionsJSON ?? '')).toEqual({
        autoApplyFilters: true,
        hidePanelBorders: false,
        hidePanelTitles: false,
        syncColors: false,
        syncCursor: true,
        syncTooltips: false,
        useMargins: true,
      });
      expect(result.id).toBe('generated-id');
      expect(result.data.title).toBe('My dashboard');
    });

    it('rejects invalid state with state issues and saves nothing', async () => {
      const client = startClient();

      const error = await client
        .create(request, { title: 42, bogus: true } as never)
        .catch((e) => e);

      expect(error).toBeInstanceOf(DashboardValidationError);
      expect(error.issues).toEqual(
        expect.arrayContaining([
          { type: 'state', path: ['title'], message: expect.any(String) },
          { type: 'state', path: ['bogus'], message: 'Unrecognized key' },
        ])
      );
      expect(savedObjectsClient.create).not.toHaveBeenCalled();
    });

    it('reports a dashboard-app panel config that fails its schema as a panel issue', async () => {
      embeddable.getTransforms.mockReturnValue({ schema: z.object({ size: z.number() }) });
      const client = startClient();

      const error = await client
        .create(
          request,
          {
            title: 'My dashboard',
            panels: [
              {
                type: 'test_panel',
                config: { size: 'big' },
                grid: { x: 0, y: 0, w: 12, h: 8 },
              },
            ],
          } as never,
          { isDashboardAppRequest: true }
        )
        .catch((e) => e);

      expect(error).toBeInstanceOf(DashboardValidationError);
      expect(error.issues).toEqual([
        { type: 'panel', panelType: 'test_panel', message: expect.any(String) },
      ]);
      expect(savedObjectsClient.create).not.toHaveBeenCalled();
    });

    it('passes a forbidden error from saved objects through unchanged', async () => {
      const forbidden = SavedObjectsErrorHelpers.decorateForbiddenError(new Error('forbidden'));
      savedObjectsClient.create.mockRejectedValue(forbidden);
      const client = startClient();

      await expect(client.create(request, { title: 'My dashboard' })).rejects.toBe(forbidden);
    });

    it('does not relabel a ZodError thrown by the saved objects write', async () => {
      const zodError = z.string().safeParse(1).error;
      savedObjectsClient.create.mockRejectedValue(zodError);
      const client = startClient();

      const error = await client.create(request, { title: 'My dashboard' }).catch((e) => e);

      expect(error).toBe(zodError);
      expect(error).not.toBeInstanceOf(DashboardValidationError);
    });

    it("records history for the request's user and space", async () => {
      const client = startClient();

      await client.create(request, { title: 'My dashboard' });

      expect(historyLog).toHaveBeenCalledWith(
        expect.objectContaining({ objectId: 'generated-id' }),
        expect.objectContaining({
          action: 'dashboard_create',
          username: 'elastic',
          userProfileId: 'u_1',
          spaceId: 'my-space',
        })
      );
    });

    it('tracks the create action', async () => {
      const client = startClient();

      await client.create(request, { title: 'My dashboard' });

      expect(coreStart.userActivity.trackUserAction).toHaveBeenCalledWith(
        expect.objectContaining({ event: { action: 'dashboard_create', type: ['creation'] } })
      );
    });

    it('saves even when tracking fails', async () => {
      coreStart.userActivity.trackUserAction.mockImplementation(() => {
        throw new Error('tracking failed');
      });
      const client = startClient();

      await expect(client.create(request, { title: 'My dashboard' })).resolves.toEqual(
        expect.objectContaining({ id: 'generated-id' })
      );
      expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
    });

    it('builds no schema until the first write', async () => {
      const client = startClient();

      expect(embeddable.getAllEmbeddableSchemas).not.toHaveBeenCalled();

      await client.create(request, { title: 'My dashboard' });

      expect(embeddable.getAllEmbeddableSchemas).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('creates a dashboard with a valid new ID', async () => {
      mockDashboardDoesNotExist();
      const client = startClient();

      const { body, operation } = await client.update(request, 'new-dashboard', {
        title: 'My dashboard',
      });

      expect(operation).toBe('create');
      expect(body.id).toBe('new-dashboard');
      expect(savedObjectsClient.create).toHaveBeenCalledWith(
        'dashboard',
        expect.anything(),
        expect.objectContaining({ id: 'new-dashboard' })
      );
      expect(coreStart.userActivity.trackUserAction).toHaveBeenCalledWith(
        expect.objectContaining({ event: { action: 'dashboard_create', type: ['creation'] } })
      );
    });

    it('rejects an invalid new ID with an id issue and saves nothing', async () => {
      mockDashboardDoesNotExist();
      const client = startClient();

      const error = await client
        .update(request, 'Invalid ID', { title: 'My dashboard' })
        .catch((e) => e);

      expect(error).toBeInstanceOf(DashboardValidationError);
      expect(error.issues).toEqual([{ type: 'id', message: expect.any(String) }]);
      expect(savedObjectsClient.create).not.toHaveBeenCalled();
      expect(savedObjectsClient.update).not.toHaveBeenCalled();
    });

    it('updates an existing dashboard with a legacy ID', async () => {
      mockExistingDashboard('Legacy ID');
      const client = startClient();

      const { body, operation } = await client.update(request, 'Legacy ID', {
        title: 'Renamed',
      });

      expect(operation).toBe('update');
      expect(body.id).toBe('Legacy ID');
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        'dashboard',
        'Legacy ID',
        expect.objectContaining({ title: 'Renamed' }),
        expect.anything()
      );
      expect(coreStart.userActivity.trackUserAction).toHaveBeenCalledWith(
        expect.objectContaining({ event: { action: 'dashboard_update', type: ['change'] } })
      );
      expect(historyLog).toHaveBeenCalledWith(
        expect.objectContaining({ objectId: 'Legacy ID' }),
        expect.objectContaining({
          action: 'dashboard_update',
          username: 'elastic',
          spaceId: 'my-space',
        })
      );
    });

    it('passes a conflict error from saved objects through unchanged', async () => {
      mockExistingDashboard('dash-1');
      const conflict = SavedObjectsErrorHelpers.createConflictError('dashboard', 'dash-1');
      savedObjectsClient.update.mockRejectedValue(conflict);
      const client = startClient();

      await expect(client.update(request, 'dash-1', { title: 'Renamed' })).rejects.toBe(conflict);
    });

    it('passes the bad request for unsupported access control through and saves nothing', async () => {
      mockExistingDashboard('dash-1');
      const client = startClient();

      const error = await client
        .update(request, 'dash-1', {
          title: 'Renamed',
          access_control: { access_mode: 'write_restricted' },
        })
        .catch((e) => e);

      expect(error.isBoom).toBe(true);
      expect(error.output.statusCode).toBe(400);
      expect(error).not.toBeInstanceOf(DashboardValidationError);
      expect(savedObjectsClient.update).not.toHaveBeenCalled();
    });
  });
});
