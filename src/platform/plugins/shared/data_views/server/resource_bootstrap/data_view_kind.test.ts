/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsErrorHelpers, SPACES_EXTENSION_ID } from '@kbn/core/server';
import { coreMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { DuplicateDataViewError } from '../../common/errors';
import { createDataViewKind, DATA_VIEW_KIND_ID } from './data_view_kind';

describe('data view kind', () => {
  const internalClient = savedObjectsClientMock.create();
  const scopedClient = savedObjectsClientMock.create();
  /** The client without the spaces extension, which looks data views up in the spaces named. */
  const lookupClient = savedObjectsClientMock.create();
  /**
   * The client scoped to each space: it shares every mock with `scopedClient` but has its own
   * `updateObjectsSpaces`, so a test can tell which space changed the data view's spaces.
   */
  const clientsBySpace = new Map<string, typeof scopedClient>();
  const clientIn = (spaceId: string): typeof scopedClient => {
    const existing = clientsBySpace.get(spaceId);
    if (existing) {
      return existing;
    }
    const { updateObjectsSpaces } = savedObjectsClientMock.create();
    updateObjectsSpaces.mockResolvedValue({ objects: [] });
    const client = { ...scopedClient, updateObjectsSpaces };
    clientsBySpace.set(spaceId, client);
    return client;
  };
  const service = {
    createAndSaveDataViewLazy: jest.fn(),
    createFromSpecLazy: jest.fn(),
  };
  const dataViewsServiceFactory = jest.fn();

  const buildKind = () => {
    const core = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    internalClient.asScopedToNamespace.mockImplementation(clientIn);
    coreStart.savedObjects.getUnsafeInternalClient.mockImplementation((options) =>
      options?.excludedExtensions?.includes(SPACES_EXTENSION_ID) ? lookupClient : internalClient
    );
    core.getStartServices.mockResolvedValue([coreStart, {}, { dataViewsServiceFactory }] as never);
    return { kind: createDataViewKind({ core }), coreStart };
  };

  type Declared = Array<{ id: string; title: string; name?: string; namespaces?: string[] }>;

  /** The context of one group; `declared` adds what the files declare for other spaces. */
  const context = (
    resources: Declared,
    spaces = ['default'],
    declaredElsewhere: Declared = []
  ) => ({
    spaceId: spaces[0],
    spaces,
    resources: resources as never,
    declared: [...resources, ...declaredElsewhere] as never,
    managed: true,
    signal: new AbortController().signal,
    logger: loggerMock.create(),
  });

  /** The data views that exist, by id, with the spaces they are in. */
  const existingIn = (spacesById: Record<string, string[]>) =>
    lookupClient.bulkGet.mockImplementation(
      async (objects) =>
        ({
          saved_objects: objects.map(({ type, id }) =>
            spacesById[id]
              ? { type, id, namespaces: spacesById[id], attributes: {}, references: [] }
              : { type, id, error: { statusCode: 404, error: 'Not Found', message: 'Not found' } }
          ),
        } as never)
    );

  beforeEach(() => {
    jest.resetAllMocks();
    clientsBySpace.clear();
    dataViewsServiceFactory.mockResolvedValue(service);
    lookupClient.find.mockResolvedValue({ saved_objects: [] } as never);
    service.createFromSpecLazy.mockResolvedValue({ getAsSavedObjectBody: () => ({}) });
    existingIn({});
  });

  it('depends on no other kind, so the kinds that reference data views can follow it', () => {
    const { kind } = buildKind();

    expect(kind.id).toBe(DATA_VIEW_KIND_ID);
    expect(kind.dependsOn).toBeUndefined();
  });

  it('lives as one data view in every space a document names', () => {
    expect(buildKind().kind.spaces).toBe('shared');
  });

  describe('parse', () => {
    const { kind } = buildKind();

    it('accepts the full spec of the data views API, not just a few fields', () => {
      const spec = {
        id: 'logs',
        title: 'logs-*',
        name: 'Logs',
        timeFieldName: '@timestamp',
        allowNoIndex: true,
        sourceFilters: [{ value: 'secret_*' }],
        runtimeFieldMap: { day: { type: 'keyword', script: { source: "emit('x')" } } },
        fieldFormats: { bytes: { id: 'bytes' } },
      };

      expect(kind.parse(spec)).toEqual(spec);
    });

    it('requires an id, which the API treats as optional, so applies update the same view', () => {
      expect(() => kind.parse({ title: 'logs-*' })).toThrow(/"id" is required/);
    });

    it('requires a title', () => {
      expect(() => kind.parse({ id: 'logs' })).toThrow();
    });

    it('rejects keys the API rejects', () => {
      expect(() => kind.parse({ id: 'logs', title: 'logs-*', bogus: 1 })).toThrow();
    });
  });

  describe('apply', () => {
    it('creates a new data view through the service the API uses, in every declared space', async () => {
      const { kind } = buildKind();

      const result = await kind.apply(
        context([{ id: 'logs', title: 'logs-*' }], ['team-a', 'team-b'])
      );

      expect(internalClient.asScopedToNamespace).toHaveBeenCalledWith('team-a');
      expect(dataViewsServiceFactory).toHaveBeenCalledWith(
        clientIn('team-a'),
        expect.anything(),
        undefined,
        true
      );
      expect(service.createAndSaveDataViewLazy).toHaveBeenCalledWith(
        {
          id: 'logs',
          title: 'logs-*',
          name: 'logs-*',
          managed: true,
          namespaces: ['team-a', 'team-b'],
        },
        false
      );
      expect(result).toEqual({ applied: 1, errors: [] });
    });

    it('looks for an existing data view in every space, not only the declared ones', async () => {
      const { kind } = buildKind();

      await kind.apply(context([{ id: 'logs', title: 'logs-*' }]));

      expect(lookupClient.bulkGet).toHaveBeenCalledWith([
        { type: 'index-pattern', id: 'logs', fields: ['__none'], namespaces: ['*'] },
      ]);
    });

    it('looks data views up without the spaces extension, which needs a user request, and writes through the space', async () => {
      const { kind, coreStart } = buildKind();
      existingIn({ logs: ['team-a'] });

      await kind.apply(context([{ id: 'logs', title: 'logs-*', name: 'Logs' }], ['team-a']));

      expect(coreStart.savedObjects.getUnsafeInternalClient).toHaveBeenCalledWith({
        excludedExtensions: [SPACES_EXTENSION_ID],
      });
      expect(lookupClient.bulkGet).toHaveBeenCalled();
      expect(lookupClient.find).toHaveBeenCalled();
      expect(scopedClient.bulkGet).not.toHaveBeenCalled();
      expect(scopedClient.find).not.toHaveBeenCalled();
      expect(lookupClient.create).not.toHaveBeenCalled();
      expect(scopedClient.create).toHaveBeenCalled();
    });

    it('reports a data view as failed when checking for it fails', async () => {
      const { kind } = buildKind();
      lookupClient.bulkGet.mockRejectedValueOnce(new Error('elasticsearch is down'));

      const result = await kind.apply(context([{ id: 'a', title: 'a-*' }]));

      expect(service.createAndSaveDataViewLazy).not.toHaveBeenCalled();
      expect(result.errors).toEqual([{ id: 'a', message: 'elasticsearch is down' }]);
    });

    it('does not apply a data view whose name another data view has in its spaces', async () => {
      const { kind } = buildKind();
      lookupClient.find.mockResolvedValueOnce({ saved_objects: [{ id: 'old' }] } as never);

      const result = await kind.apply(
        context([{ id: 'new', title: 'logs-*', name: 'Logs' }], ['team-a', 'team-b'])
      );

      expect(lookupClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'index-pattern',
          search: '"Logs"',
          namespaces: ['team-a', 'team-b'],
        })
      );
      expect(service.createAndSaveDataViewLazy).not.toHaveBeenCalled();
      expect(result.applied).toBe(0);
      expect(result.errors).toEqual([
        {
          id: 'new',
          message: expect.stringContaining('already used by the data view old'),
          permanent: true,
        },
      ]);
    });

    it('retries a data view whose name a data view declared next to it still has', async () => {
      const { kind } = buildKind();
      lookupClient.find.mockResolvedValueOnce({ saved_objects: [{ id: 'old' }] } as never);

      const result = await kind.apply(
        context([
          { id: 'new', title: 'logs-*', name: 'Logs' },
          { id: 'old', title: 'logs-*', name: 'Old logs' },
        ])
      );

      // `old` gives the name up in this run, so a retry applies `new`.
      expect(result.applied).toBe(1);
      expect(result.errors).toEqual([
        {
          id: 'new',
          message: expect.stringContaining('which these files also declare'),
        },
      ]);
    });

    it('does not retry when a data view the files do not declare also has the name', async () => {
      const { kind } = buildKind();
      lookupClient.find.mockResolvedValueOnce({
        saved_objects: [{ id: 'old' }, { id: 'manual' }],
      } as never);

      const result = await kind.apply(
        context([
          { id: 'new', title: 'logs-*', name: 'Logs' },
          { id: 'old', title: 'logs-*', name: 'Old logs' },
        ])
      );

      expect(result.errors).toEqual([
        {
          id: 'new',
          message: expect.stringContaining('already used by the data view old, manual'),
          permanent: true,
        },
      ]);
    });

    it('retries a data view whose name a data view declared for other spaces still has', async () => {
      const { kind } = buildKind();
      lookupClient.find.mockResolvedValueOnce({ saved_objects: [{ id: 'old' }] } as never);

      const result = await kind.apply(
        context(
          [{ id: 'new', title: 'logs-*', name: 'Logs' }],
          ['default'],
          [{ id: 'old', title: 'logs-*', name: 'Old logs' }]
        )
      );

      expect(result.errors).toEqual([
        {
          id: 'new',
          message: expect.stringContaining('which these files also declare'),
        },
      ]);
    });

    it('does not retry when a data view the files declare with the same name has it', async () => {
      const { kind } = buildKind();
      lookupClient.find
        .mockResolvedValueOnce({ saved_objects: [] } as never)
        .mockResolvedValueOnce({ saved_objects: [{ id: 'first' }] } as never);

      const result = await kind.apply(
        context([
          { id: 'first', title: 'logs-*', name: 'Logs' },
          { id: 'second', title: 'logs-*', name: 'Logs' },
        ])
      );

      // A retry would find the name taken again, so it is not attempted.
      expect(result.applied).toBe(1);
      expect(result.errors).toEqual([
        {
          id: 'second',
          message:
            'The name "Logs" is also declared for the data view first. Give each data view its own name',
          permanent: true,
        },
      ]);
    });

    it('does not apply a data view whose namespaces differ from its spaces', async () => {
      const { kind } = buildKind();

      const result = await kind.apply(
        context([{ id: 'elsewhere', title: 'a-*', namespaces: ['team-b'] }], ['team-a'])
      );

      expect(service.createAndSaveDataViewLazy).not.toHaveBeenCalled();
      expect(result.errors).toEqual([
        {
          id: 'elsewhere',
          message: expect.stringContaining('must name the same spaces'),
          permanent: true,
        },
      ]);
    });

    it('applies a data view whose namespaces repeat its spaces, in any order', async () => {
      const { kind } = buildKind();

      const result = await kind.apply(
        context(
          [{ id: 'logs', title: 'logs-*', namespaces: ['team-b', 'team-a'] }],
          ['team-a', 'team-b']
        )
      );

      expect(result).toEqual({ applied: 1, errors: [] });
    });

    it('escapes quotes and backslashes in the name it searches for', async () => {
      const { kind } = buildKind();

      await kind.apply(context([{ id: 'new', title: 'logs-*', name: 'My "Logs" \\ view' }]));

      expect(lookupClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ search: '"My \\"Logs\\" \\\\ view"' })
      );
    });

    it('still updates a data view that has its own name, and carries on after one that clashes', async () => {
      const { kind } = buildKind();
      lookupClient.find
        .mockResolvedValueOnce({ saved_objects: [{ id: 'other' }] } as never)
        .mockResolvedValueOnce({ saved_objects: [{ id: 'b' }] } as never);

      const result = await kind.apply(
        context([
          { id: 'a', title: 'a-*' },
          { id: 'b', title: 'b-*' },
        ])
      );

      expect(result.applied).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(service.createAndSaveDataViewLazy).toHaveBeenCalledTimes(1);
      expect(service.createAndSaveDataViewLazy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'b' }),
        false
      );
    });

    it('keeps an explicit name', async () => {
      const { kind } = buildKind();

      await kind.apply(context([{ id: 'logs', title: 'logs-*', name: 'Logs' }]));

      expect(service.createAndSaveDataViewLazy).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Logs' }),
        false
      );
    });

    describe('a data view that already exists', () => {
      const body = { title: 'logs-*', name: 'Logs', type: 'rollup' };

      beforeEach(() => {
        service.createFromSpecLazy.mockResolvedValue({ getAsSavedObjectBody: () => body });
      });

      it('is overwritten in place, never deleted or created again', async () => {
        const { kind } = buildKind();
        existingIn({ logs: ['team-a'] });

        const result = await kind.apply(
          context([{ id: 'logs', title: 'logs-*', name: 'Logs' }], ['team-a'])
        );

        expect(service.createFromSpecLazy).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'logs', name: 'Logs', managed: true })
        );
        expect(scopedClient.create).toHaveBeenCalledWith('index-pattern', body, {
          id: 'logs',
          overwrite: true,
          managed: true,
        });
        expect(service.createAndSaveDataViewLazy).not.toHaveBeenCalled();
        expect(scopedClient.delete).not.toHaveBeenCalled();
        for (const client of clientsBySpace.values()) {
          expect(client.updateObjectsSpaces).not.toHaveBeenCalled();
        }
        expect(result).toEqual({ applied: 1, errors: [] });
      });

      it('is moved into exactly its declared spaces before it is overwritten', async () => {
        const { kind } = buildKind();
        // Shared by hand with `team-c`, and no longer declared in `team-b`.
        existingIn({ logs: ['team-b', 'team-c'] });

        await kind.apply(context([{ id: 'logs', title: 'logs-*' }], ['team-a', 'team-b']));

        // Not through `team-a`, the first declared space, where it is not found yet.
        expect(clientIn('team-a').updateObjectsSpaces).not.toHaveBeenCalled();
        expect(clientIn('team-b').updateObjectsSpaces).toHaveBeenCalledWith(
          [{ type: 'index-pattern', id: 'logs' }],
          ['team-a'],
          ['team-c']
        );
        expect(clientIn('team-b').updateObjectsSpaces.mock.invocationCallOrder[0]).toBeLessThan(
          scopedClient.create.mock.invocationCallOrder[0]
        );
      });

      it('is moved through a space it is in when it is in none of its declared spaces yet', async () => {
        const { kind } = buildKind();
        existingIn({ logs: ['team-c'] });

        await kind.apply(context([{ id: 'logs', title: 'logs-*' }], ['team-a', 'team-b']));

        expect(clientIn('team-c').updateObjectsSpaces).toHaveBeenCalledWith(
          [{ type: 'index-pattern', id: 'logs' }],
          ['team-a', 'team-b'],
          ['team-c']
        );
      });

      it('is taken out of every space when it was shared with all of them', async () => {
        const { kind } = buildKind();
        existingIn({ logs: ['*'] });

        await kind.apply(context([{ id: 'logs', title: 'logs-*' }], ['team-a']));

        expect(clientIn('team-a').updateObjectsSpaces).toHaveBeenCalledWith(
          [{ type: 'index-pattern', id: 'logs' }],
          ['team-a'],
          ['*']
        );
      });

      it('is reported as failed, and not overwritten, when it is in no space', async () => {
        const { kind } = buildKind();
        existingIn({ logs: [] });

        const result = await kind.apply(context([{ id: 'logs', title: 'logs-*' }], ['team-a']));

        for (const client of clientsBySpace.values()) {
          expect(client.updateObjectsSpaces).not.toHaveBeenCalled();
        }
        expect(scopedClient.create).not.toHaveBeenCalled();
        expect(result.errors).toEqual([
          { id: 'logs', message: 'The data view "logs" exists but is in no space' },
        ]);
      });

      it('is reported as failed, and not overwritten, when its spaces cannot be aligned', async () => {
        const { kind } = buildKind();
        existingIn({ logs: ['team-b'] });
        clientIn('team-b').updateObjectsSpaces.mockResolvedValueOnce({
          objects: [
            {
              type: 'index-pattern',
              id: 'logs',
              spaces: [],
              error: { statusCode: 403, error: 'Forbidden', message: 'not allowed' },
            },
          ],
        });

        const result = await kind.apply(context([{ id: 'logs', title: 'logs-*' }], ['team-a']));

        expect(scopedClient.create).not.toHaveBeenCalled();
        expect(result.errors).toEqual([{ id: 'logs', message: 'not allowed' }]);
      });

      it('is not overwritten with a name another data view has, which would save a duplicate', async () => {
        const { kind } = buildKind();
        existingIn({ logs: ['default'] });
        lookupClient.find.mockResolvedValueOnce({ saved_objects: [{ id: 'other' }] } as never);

        const result = await kind.apply(context([{ id: 'logs', title: 'logs-*', name: 'Logs' }]));

        expect(scopedClient.create).not.toHaveBeenCalled();
        expect(result.errors).toEqual([
          {
            id: 'logs',
            message: expect.stringContaining('already used by the data view other'),
            permanent: true,
          },
        ]);
      });

      it('is reported as failed with its id when the overwrite fails', async () => {
        const { kind } = buildKind();
        existingIn({ logs: ['default'] });
        scopedClient.create.mockRejectedValueOnce(new Error('write rejected'));

        const result = await kind.apply(context([{ id: 'logs', title: 'logs-*' }]));

        expect(result.applied).toBe(0);
        expect(result.errors).toEqual([{ id: 'logs', message: 'write rejected' }]);
      });
    });

    it('reports a data view that fails with its id and carries on', async () => {
      const { kind } = buildKind();
      service.createAndSaveDataViewLazy.mockRejectedValueOnce(new Error('duplicate title'));

      const result = await kind.apply(
        context([
          { id: 'a', title: 'a-*' },
          { id: 'b', title: 'b-*' },
        ])
      );

      expect(result.applied).toBe(1);
      expect(result.errors).toEqual([{ id: 'a', message: 'duplicate title' }]);
    });

    it('reports a data view the saved objects client rejects as permanent', async () => {
      const { kind } = buildKind();
      service.createAndSaveDataViewLazy.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createBadRequestError('invalid field')
      );

      const result = await kind.apply(context([{ id: 'a', title: 'a-*' }]));

      expect(result.errors).toEqual([
        { id: 'a', message: expect.stringContaining('invalid field'), permanent: true },
      ]);
    });

    it.each([
      [
        'a data view with its id',
        SavedObjectsErrorHelpers.createConflictError('index-pattern', 'a'),
      ],
      ['a data view with its name', new DuplicateDataViewError('Duplicate data view: a-*')],
    ])(
      'reports a create refused because %s appeared since the checks as a conflict',
      async (_, error) => {
        const { kind } = buildKind();
        service.createAndSaveDataViewLazy.mockRejectedValueOnce(error);

        const result = await kind.apply(context([{ id: 'a', title: 'a-*' }]));

        expect(result.errors).toEqual([{ id: 'a', message: error.message, conflict: true }]);
      }
    );
  });

  describe('ownership', () => {
    const ownershipContext = (ids: string[], spaceId = 'default') => ({
      spaceId,
      ids,
      signal: new AbortController().signal,
      logger: loggerMock.create(),
    });

    it('identifies a data view by its id', () => {
      expect(buildKind().kind.idOf({ id: 'logs', title: 'logs-*' })).toBe('logs');
    });

    it('reads the versions of the data views that exist, in whatever space they are', async () => {
      const { kind } = buildKind();
      lookupClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          { type: 'index-pattern', id: 'a', version: 'v1', namespaces: ['team-b'] },
          { type: 'index-pattern', id: 'gone', error: { statusCode: 404, message: 'Not found' } },
        ],
      } as never);

      const versions = await kind.ownership?.versions(ownershipContext(['a', 'gone']));

      expect(versions).toEqual({ a: { version: 'v1' } });
      expect(lookupClient.bulkGet).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 'a', namespaces: ['*'] })])
      );
    });

    it('deletes from every space, and does not report a data view that is already gone', async () => {
      const { kind } = buildKind();
      scopedClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { type: 'index-pattern', id: 'a', success: true },
          {
            type: 'index-pattern',
            id: 'gone',
            success: false,
            error: { statusCode: 404, message: 'Not found' },
          },
          {
            type: 'index-pattern',
            id: 'locked',
            success: false,
            error: { statusCode: 403, message: 'forbidden' },
          },
        ],
      } as never);

      const result = await kind.ownership?.remove?.(ownershipContext(['a', 'gone', 'locked']));

      expect(result).toEqual({ removed: 1, errors: [{ id: 'locked', message: 'forbidden' }] });
      expect(scopedClient.bulkDelete).toHaveBeenCalledWith(
        [
          { type: 'index-pattern', id: 'a' },
          { type: 'index-pattern', id: 'gone' },
          { type: 'index-pattern', id: 'locked' },
        ],
        { force: true }
      );
    });
  });

  describe('when the run is aborted', () => {
    it('stops before the next data view and lets the abort through, not reporting it as a failure', async () => {
      const { kind } = buildKind();
      const controller = new AbortController();
      service.createAndSaveDataViewLazy.mockImplementationOnce(async () => controller.abort());

      await expect(
        kind.apply({
          ...context([
            { id: 'a', title: 'a-*' },
            { id: 'b', title: 'b-*' },
          ]),
          signal: controller.signal,
        })
      ).rejects.toThrow();

      expect(service.createAndSaveDataViewLazy).toHaveBeenCalledTimes(1);
    });

    it('does not remove anything when already aborted', async () => {
      const { kind } = buildKind();
      const controller = new AbortController();
      controller.abort();

      await expect(
        kind.ownership?.remove?.({
          spaceId: 'default',
          ids: ['a', 'b'],
          signal: controller.signal,
          logger: loggerMock.create(),
        })
      ).rejects.toThrow();

      expect(scopedClient.bulkDelete).not.toHaveBeenCalled();
    });
  });
});
