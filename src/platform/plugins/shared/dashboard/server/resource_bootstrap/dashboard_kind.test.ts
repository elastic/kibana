/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { coreMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers, SPACES_EXTENSION_ID } from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';
import { loggerMock } from '@kbn/logging-mocks';

import { getDashboardStateSchema } from '../api/dashboard_state_schemas';
import { deleteDashboard } from '../api/delete';
import { update } from '../api/update/update';
import { createDashboardKind, DASHBOARD_KIND_ID } from './dashboard_kind';

jest.mock('../api/update/update');
jest.mock('../api/delete');
jest.mock('../api/dashboard_state_schemas');

const parseState = jest.fn((body: object) => body);
const mockedGetSchema = jest.mocked(getDashboardStateSchema);
const mockedUpdate = jest.mocked(update);
const mockedDelete = jest.mocked(deleteDashboard);

const state: DashboardState = {
  title: 'My dashboard',
  panels: [],
  pinned_panels: [],
  options: {
    auto_apply_filters: true,
    hide_panel_borders: false,
    hide_panel_titles: false,
    sync_colors: false,
    sync_cursor: true,
    sync_tooltips: false,
    use_margins: true,
  },
};
const dashboard = { id: 'my-dashboard', state };

describe('dashboard kind', () => {
  const internalClient = savedObjectsClientMock.create();
  const scopedClient = savedObjectsClientMock.create();
  /** The client without the spaces extension, which looks dashboards up in every space. */
  const lookupClient = savedObjectsClientMock.create();
  const coreStart = coreMock.createStart();

  const buildKind = () => {
    const core = coreMock.createSetup();
    internalClient.asScopedToNamespace.mockReturnValue(scopedClient);
    coreStart.savedObjects.getUnsafeInternalClient.mockImplementation((options) =>
      options?.excludedExtensions?.includes(SPACES_EXTENSION_ID) ? lookupClient : internalClient
    );
    core.getStartServices.mockResolvedValue([coreStart, {}, {}]);
    return createDashboardKind({ core });
  };

  const context = (resources = [dashboard], spaceId = 'default') => ({
    spaceId,
    spaces: [spaceId],
    resources,
    declared: resources,
    managed: true,
    signal: new AbortController().signal,
    logger: loggerMock.create(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetSchema.mockReturnValue({ parse: parseState } as never);
    mockedUpdate.mockResolvedValue({ body: {}, operation: 'update' } as never);
  });

  it('is applied after data views', () => {
    expect(buildKind().id).toBe(DASHBOARD_KIND_ID);
    expect(buildKind().dependsOn).toEqual(['data_view']);
  });

  describe('parse', () => {
    it('splits the id from the body, which is validated as the API body', () => {
      const parsed = buildKind().parse({ id: 'my-dashboard', title: 'T', panels: [] });

      expect(parseState).toHaveBeenCalledWith({ title: 'T', panels: [] });
      expect(parsed.id).toBe('my-dashboard');
    });

    it('rejects an entry without an id', () => {
      expect(() => buildKind().parse({ title: 'T' })).toThrow();
    });

    it.each([null, 'text', 7, [{ id: 'a' }]])('rejects %j as an entry', (entry) => {
      expect(() => buildKind().parse(entry)).toThrow(/expected an object/);
    });

    // Without a user, a create drops the access mode and a later apply that changes it throws.
    it.each(['write_restricted', 'default'])(
      'rejects an "access_control" with the %s access mode, which needs an owning user',
      (accessMode) => {
        expect(() =>
          buildKind().parse({
            id: 'my-dashboard',
            title: 'T',
            access_control: { access_mode: accessMode },
          })
        ).toThrow(/"access_control" is not supported/);
      }
    );

    it('builds the state schema when parsing, not when the kind is created', () => {
      buildKind();
      expect(mockedGetSchema).not.toHaveBeenCalled();
    });

    it('builds the state schema once and reuses it for every document and apply', async () => {
      const kind = buildKind();
      kind.parse({ id: 'a', title: 'A' });
      kind.parse({ id: 'b', title: 'B' });
      await kind.apply(context());

      expect(mockedGetSchema).toHaveBeenCalledTimes(1);
    });
  });

  describe('apply', () => {
    it('upserts through the dashboard API function, in the space, without a user', async () => {
      const result = await buildKind().apply(context([dashboard], 'team-a'));

      expect(internalClient.asScopedToNamespace).toHaveBeenCalledWith('team-a');
      const [services, , id, body, options] = mockedUpdate.mock.calls[0];
      expect(services.savedObjects.client).toBe(scopedClient);
      expect(services.savedObjects.typeRegistry).toBe(coreStart.savedObjects.getTypeRegistry());
      expect(services.security.authc.getCurrentUser()).toBeNull();
      expect([id, body, options]).toEqual(['my-dashboard', state, { spaceId: 'team-a' }]);
      expect(result).toEqual({ applied: 1, errors: [] });
    });

    it('reports a dashboard that fails with its id and carries on', async () => {
      mockedUpdate.mockRejectedValueOnce(new Error('invalid panel'));

      const result = await buildKind().apply(
        context([dashboard, { id: 'other', state }], 'default')
      );

      expect(result.applied).toBe(1);
      expect(result.errors).toEqual([{ id: 'my-dashboard', message: 'invalid panel' }]);
      expect(mockedUpdate).toHaveBeenCalledTimes(2);
    });

    it('reports a dashboard the API rejects as permanent, since a retry gets the same answer', async () => {
      mockedUpdate.mockRejectedValueOnce(
        Boom.badRequest('Dashboard does not support access control.')
      );

      const result = await buildKind().apply(context([dashboard], 'default'));

      expect(result.errors).toEqual([
        {
          id: 'my-dashboard',
          message: 'Dashboard does not support access control.',
          permanent: true,
        },
      ]);
    });

    describe('a conflict', () => {
      const conflict = () =>
        SavedObjectsErrorHelpers.createConflictError('dashboard', 'my-dashboard');
      const foundIn = (namespaces: string[]) =>
        ({
          saved_objects: [{ type: 'dashboard', id: 'my-dashboard', namespaces }],
        } as never);

      it('names the space the dashboard already lives in, since ids are unique across spaces', async () => {
        mockedUpdate.mockRejectedValueOnce(conflict());
        lookupClient.find.mockResolvedValueOnce(foundIn(['team-a']));

        const result = await buildKind().apply(context([dashboard], 'team-b'));

        // `bulkGet` rejects every space for a space-isolated type, so this goes through `find`,
        // without the spaces extension, which needs a user request.
        expect(coreStart.savedObjects.getUnsafeInternalClient).toHaveBeenCalledWith({
          excludedExtensions: [SPACES_EXTENSION_ID],
        });
        expect(lookupClient.bulkGet).not.toHaveBeenCalled();
        expect(scopedClient.find).not.toHaveBeenCalled();
        expect(lookupClient.find).toHaveBeenCalledWith({
          type: 'dashboard',
          namespaces: ['*'],
          filter: nodeBuilder.is('dashboard.id', 'dashboard:my-dashboard'),
          fields: ['__none'],
          perPage: 1,
        });
        expect(result.errors).toEqual([
          {
            id: 'my-dashboard',
            message:
              'The dashboard "my-dashboard" already exists in the space "team-a", and dashboard ids are unique across spaces. Delete it there, or declare it in "team-b" with another id',
            permanent: true,
            conflict: true,
          },
        ]);
      });

      it('is reported as it is when the dashboard is in no other space', async () => {
        mockedUpdate.mockRejectedValueOnce(conflict());
        lookupClient.find.mockResolvedValueOnce(foundIn(['team-b']));

        const result = await buildKind().apply(context([dashboard], 'team-b'));

        expect(result.errors).toEqual([
          { id: 'my-dashboard', message: conflict().message, conflict: true },
        ]);
      });

      it('is reported as it is, and the failed lookup logged, when the lookup fails', async () => {
        mockedUpdate.mockRejectedValueOnce(conflict());
        lookupClient.find.mockRejectedValueOnce(new Error('elasticsearch is down'));
        const runContext = context([dashboard], 'team-b');

        const result = await buildKind().apply(runContext);

        expect(result.errors).toEqual([
          { id: 'my-dashboard', message: conflict().message, conflict: true },
        ]);
        expect(runContext.logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('elasticsearch is down')
        );
      });

      it('does not look anything up for other errors', async () => {
        mockedUpdate.mockRejectedValueOnce(new Error('invalid panel'));

        await buildKind().apply(context([dashboard], 'team-b'));

        expect(lookupClient.find).not.toHaveBeenCalled();
      });
    });
  });

  describe('ownership', () => {
    it('identifies a dashboard by its id', () => {
      expect(buildKind().idOf(dashboard)).toBe('my-dashboard');
    });

    it('removes through the dashboard delete function so history is kept', async () => {
      const result = await buildKind().ownership?.remove?.({
        spaceId: 'team-a',
        ids: ['a', 'b'],
        signal: new AbortController().signal,
        logger: loggerMock.create(),
      });

      expect(mockedDelete).toHaveBeenCalledTimes(2);
      expect(mockedDelete.mock.calls[0][1]).toBe('a');
      expect(mockedDelete.mock.calls[0][3]).toBe('team-a');
      expect(result).toEqual({ removed: 2, errors: [] });
    });

    it('does not report a dashboard that is already gone, but reports real failures', async () => {
      mockedDelete
        .mockRejectedValueOnce(
          SavedObjectsErrorHelpers.createGenericNotFoundError('dashboard', 'a')
        )
        .mockRejectedValueOnce(new Error('forbidden'));

      const result = await buildKind().ownership?.remove?.({
        spaceId: 'default',
        ids: ['a', 'b'],
        signal: new AbortController().signal,
        logger: loggerMock.create(),
      });

      expect(result).toEqual({ removed: 0, errors: [{ id: 'b', message: 'forbidden' }] });
    });
  });

  describe('when the run is aborted', () => {
    it('stops before the next dashboard and lets the abort through, not reporting it as a failure', async () => {
      const controller = new AbortController();
      mockedUpdate.mockImplementationOnce(async () => {
        controller.abort();
        return { body: {}, operation: 'create' } as never;
      });

      await expect(
        buildKind().apply({
          ...context([dashboard, { id: 'other', state }]),
          signal: controller.signal,
        })
      ).rejects.toThrow();

      expect(mockedUpdate).toHaveBeenCalledTimes(1);
    });

    it('does not remove anything when already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        buildKind().ownership?.remove?.({
          spaceId: 'default',
          ids: ['a', 'b'],
          signal: controller.signal,
          logger: loggerMock.create(),
        })
      ).rejects.toThrow();

      expect(mockedDelete).not.toHaveBeenCalled();
    });
  });
});
