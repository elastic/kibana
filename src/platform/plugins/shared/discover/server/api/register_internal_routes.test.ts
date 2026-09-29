/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, RequestHandlerContext } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { MAX_SAVED_OBJECT_ID_LENGTH } from '@kbn/core-saved-objects-server';
import { AuthzDisabled } from '@kbn/core-security-server';
import { ZodError } from '@kbn/zod';
import {
  SavedSearchType,
  VIEW_MODE,
  type StoredDiscoverSession,
} from '@kbn/saved-search-plugin/common';
import {
  DISCOVER_SESSION_API_VERSION,
  DISCOVER_SESSION_INTERNAL_API_BASE_PATH,
} from '../../common/constants';
import {
  discoverSessionInternalParamsSchema,
  discoverSessionInternalDataSchema,
  discoverSessionInternalResponseSchema,
  discoverSessionInternalGetResponseSchema,
  type DiscoverSessionInternalData,
} from './internal_schema';
import { registerInternalRoutes } from './register_internal_routes';

const SESSION_PATH = `${DISCOVER_SESSION_INTERNAL_API_BASE_PATH}/{id}`;
const FILTER_REFERENCE_NAME = 'tab_tab.kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index';

const storedSession: StoredDiscoverSession = {
  attributes: {
    title: 'Stored session',
    description: 'Session description',
    tabs: [
      {
        id: 'tab',
        label: 'Tab',
        attributes: {
          sort: [['@timestamp', 'desc']],
          columns: ['message'],
          grid: {},
          hideChart: false,
          hideTable: false,
          isTextBasedQuery: false,
          usesAdHocDataView: true,
          viewMode: VIEW_MODE.DOCUMENT_LEVEL,
          timeRestore: false,
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              filter: [
                {
                  meta: {
                    key: 'host.name',
                    field: 'host.name',
                    type: 'exists',
                    indexRefName: FILTER_REFERENCE_NAME,
                  },
                  query: { exists: { field: 'host.name' } },
                },
              ],
              index: { title: 'logs-*', timeFieldName: '@timestamp', id: 'inline-view-id' },
            }),
          },
        },
      },
    ],
  },
  references: [
    { name: 'tag-ref-tag-1', type: 'tag', id: 'tag-1' },
    { name: FILTER_REFERENCE_NAME, type: 'index-pattern', id: 'inline-view-id' },
  ],
};

const sessionData: DiscoverSessionInternalData = {
  title: 'Stored session',
  description: 'Session description',
  tags: ['tag-1'],
  tabs: [
    {
      id: 'tab',
      label: 'Tab',
      type: 'default',
      data_source: {
        type: 'data_view_spec',
        id: 'inline-view-id',
        index_pattern: 'logs-*',
        time_field: '@timestamp',
      },
      column_order: ['message'],
      sort: [{ name: '@timestamp', direction: 'desc' }],
      filters: [
        {
          type: 'condition',
          condition: { field: 'host.name', operator: 'exists' },
          data_view_id: 'inline-view-id',
        },
      ],
      view_mode: VIEW_MODE.DOCUMENT_LEVEL,
      hide_chart: false,
      hide_table: false,
    },
  ],
};

const savedObject = {
  id: 'session-id',
  type: SavedSearchType,
  ...storedSession,
  created_at: '2026-09-24T10:00:00.000Z',
  updated_at: '2026-09-25T10:00:00.000Z',
  version: 'WzEsMV0=',
  managed: false,
};

const savedObjectWithInvalidControls = {
  ...savedObject,
  attributes: {
    ...storedSession.attributes,
    tabs: storedSession.attributes.tabs.map((tab) => ({
      ...tab,
      attributes: { ...tab.attributes, controlGroupJson: '{' },
    })),
  },
};

const expectedBody = {
  id: 'session-id',
  data: sessionData,
  meta: {
    created_at: '2026-09-24T10:00:00.000Z',
    updated_at: '2026-09-25T10:00:00.000Z',
    version: 'WzEsMV0=',
    managed: false,
  },
};

describe('registerInternalRoutes', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let core: ReturnType<typeof coreMock.createRequestHandlerContext>;
  let context: RequestHandlerContext;
  let userActivity: jest.Mocked<CoreSetup['userActivity']>;

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    userActivity = { trackUserAction: jest.fn() };
    registerInternalRoutes(router.versioned, userActivity, loggingSystemMock.createLogger());

    core = coreMock.createRequestHandlerContext();
    context = {
      resolve: jest.fn().mockResolvedValue({ core }),
    } as unknown as RequestHandlerContext;
  });

  const getVersion = (method: 'get' | 'post' | 'put', path: string) => {
    const version = router.versioned.getRoute(method, path).versions[DISCOVER_SESSION_API_VERSION];

    if (!version) {
      throw new Error(`No version [${DISCOVER_SESSION_API_VERSION}] registered for ${path}`);
    }

    return version;
  };

  const callRoute = async (
    method: 'get' | 'post' | 'put',
    path: string,
    request: { params?: { id: string }; body?: DiscoverSessionInternalData }
  ) => {
    const response = httpServerMock.createResponseFactory();

    await getVersion(method, path).handler(
      context,
      httpServerMock.createKibanaRequest({ method, path, ...request }),
      response
    );

    return response;
  };

  it.each([
    ['post', DISCOVER_SESSION_INTERNAL_API_BASE_PATH, { body: discoverSessionInternalDataSchema }],
    [
      'put',
      SESSION_PATH,
      { params: discoverSessionInternalParamsSchema, body: discoverSessionInternalDataSchema },
    ],
    ['get', SESSION_PATH, { params: discoverSessionInternalParamsSchema }],
  ] as const)('registers %s with internal access and validation', (method, path, requestSchema) => {
    const { config } = router.versioned.getRoute(method, path);

    expect(config.access).toBe('internal');
    expect(config.security).toEqual({ authz: AuthzDisabled.delegateToSOClient });
    expect(getVersion(method, path).config.validate).toMatchObject({ request: requestSchema });
  });

  describe('POST', () => {
    it('stores the API fields with inline IDs and extracted references', async () => {
      core.savedObjects.client.create.mockResolvedValue(savedObject);

      const response = await callRoute('post', DISCOVER_SESSION_INTERNAL_API_BASE_PATH, {
        body: sessionData,
      });

      expect(core.savedObjects.client.create).toHaveBeenCalledWith(
        SavedSearchType,
        storedSession.attributes,
        { references: storedSession.references }
      );
      expect(response.created).toHaveBeenCalledWith({ body: expectedBody });
      expect(userActivity.trackUserAction).toHaveBeenCalledTimes(1);
      expect(userActivity.trackUserAction).toHaveBeenCalledWith(
        expect.objectContaining({
          event: { action: 'discover_session_create', type: ['creation'] },
          object: {
            id: 'session-id',
            name: sessionData.title,
            type: 'discover_session',
            tags: ['tag-1'],
          },
        })
      );
    });

    it('omits conversion warnings from the write response', async () => {
      core.savedObjects.client.create.mockResolvedValue(savedObjectWithInvalidControls);

      const response = await callRoute('post', DISCOVER_SESSION_INTERNAL_API_BASE_PATH, {
        body: sessionData,
      });

      expect(response.created).toHaveBeenCalledWith({ body: expectedBody });
    });

    it('propagates unexpected errors', async () => {
      core.savedObjects.client.create.mockRejectedValue(new Error('Unexpected failure'));

      await expect(
        callRoute('post', DISCOVER_SESSION_INTERNAL_API_BASE_PATH, { body: sessionData })
      ).rejects.toThrow('Unexpected failure');
      expect(userActivity.trackUserAction).not.toHaveBeenCalled();
    });
  });

  describe('PUT', () => {
    it.each(['session-id', 'Legacy-Session'])(
      'updates the existing session at %s and returns what was stored',
      async (id) => {
        core.savedObjects.client.update.mockResolvedValue({ ...savedObject, id });
        core.savedObjects.client.get.mockResolvedValue({ ...savedObject, id });

        const response = await callRoute('put', SESSION_PATH, {
          params: { id },
          body: sessionData,
        });

        expect(core.savedObjects.client.update).toHaveBeenCalledWith(
          SavedSearchType,
          id,
          storedSession.attributes,
          { references: storedSession.references, mergeAttributes: false }
        );
        expect(core.savedObjects.client.get).toHaveBeenCalledTimes(2);
        expect(core.savedObjects.client.get).toHaveBeenCalledWith(SavedSearchType, id);
        expect(core.savedObjects.client.resolve).not.toHaveBeenCalled();
        expect(core.savedObjects.client.create).not.toHaveBeenCalled();
        expect(response.ok).toHaveBeenCalledWith({ body: { ...expectedBody, id } });
        expect(userActivity.trackUserAction).toHaveBeenCalledTimes(1);
        expect(userActivity.trackUserAction).toHaveBeenCalledWith(
          expect.objectContaining({
            event: { action: 'discover_session_update', type: ['change'] },
            object: {
              id,
              name: sessionData.title,
              type: 'discover_session',
              tags: ['tag-1'],
            },
          })
        );
      }
    );

    it('creates the session at the requested ID when it does not exist', async () => {
      core.savedObjects.client.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(SavedSearchType, 'session-id')
      );
      core.savedObjects.client.create.mockResolvedValue(savedObject);

      const response = await callRoute('put', SESSION_PATH, {
        params: { id: 'session-id' },
        body: sessionData,
      });

      expect(core.savedObjects.client.create).toHaveBeenCalledWith(
        SavedSearchType,
        storedSession.attributes,
        { id: 'session-id', references: storedSession.references }
      );
      expect(core.savedObjects.client.update).not.toHaveBeenCalled();
      expect(response.created).toHaveBeenCalledWith({ body: expectedBody });
      expect(userActivity.trackUserAction).toHaveBeenCalledTimes(1);
      expect(userActivity.trackUserAction).toHaveBeenCalledWith(
        expect.objectContaining({
          event: { action: 'discover_session_create', type: ['creation'] },
          object: {
            id: 'session-id',
            name: sessionData.title,
            type: 'discover_session',
            tags: ['tag-1'],
          },
        })
      );
    });

    it('rejects an invalid new ID without writing a session', async () => {
      core.savedObjects.client.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(SavedSearchType, 'Legacy-Session')
      );

      const response = await callRoute('put', SESSION_PATH, {
        params: { id: 'Legacy-Session' },
        body: sessionData,
      });

      expect(response.badRequest).toHaveBeenCalledWith({
        body: {
          message: expect.stringContaining(
            'ID must contain only lowercase letters, numbers, hyphens, and underscores.'
          ),
        },
      });
      expect(core.savedObjects.client.create).not.toHaveBeenCalled();
      expect(core.savedObjects.client.update).not.toHaveBeenCalled();
    });

    it('propagates an existence-check failure without writing a session', async () => {
      const error = new Error('Get failed');
      core.savedObjects.client.get.mockRejectedValue(error);

      await expect(
        callRoute('put', SESSION_PATH, { params: { id: 'session-id' }, body: sessionData })
      ).rejects.toThrow(error);

      expect(core.savedObjects.client.create).not.toHaveBeenCalled();
      expect(core.savedObjects.client.update).not.toHaveBeenCalled();
    });

    it('omits conversion warnings from the write response', async () => {
      core.savedObjects.client.update.mockResolvedValue(savedObjectWithInvalidControls);
      core.savedObjects.client.get.mockResolvedValue(savedObjectWithInvalidControls);

      const response = await callRoute('put', SESSION_PATH, {
        params: { id: 'session-id' },
        body: sessionData,
      });

      expect(response.ok).toHaveBeenCalledWith({ body: expectedBody });
    });

    it('returns 404 if the session disappears after the existence check', async () => {
      core.savedObjects.client.get.mockResolvedValue({ ...savedObject, id: 'deleted-session' });
      core.savedObjects.client.update.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(SavedSearchType, 'deleted-session')
      );

      const response = await callRoute('put', SESSION_PATH, {
        params: { id: 'deleted-session' },
        body: sessionData,
      });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: 'A Discover session with ID [deleted-session] was not found.' },
      });
      expect(core.savedObjects.client.create).not.toHaveBeenCalled();
      expect(core.savedObjects.client.get).toHaveBeenCalledTimes(1);
    });

    it('returns 409 when the saved objects client reports a conflict', async () => {
      const conflict = SavedObjectsErrorHelpers.createConflictError(SavedSearchType, 'session-id');
      core.savedObjects.client.get.mockResolvedValue(savedObject);
      core.savedObjects.client.update.mockRejectedValue(conflict);

      const response = await callRoute('put', SESSION_PATH, {
        params: { id: 'session-id' },
        body: sessionData,
      });

      expect(response.conflict).toHaveBeenCalledWith({ body: { message: conflict.message } });
      expect(userActivity.trackUserAction).not.toHaveBeenCalled();
    });

    it('returns 409 when creating at an alias ID conflicts', async () => {
      const id = 'alias-session';
      const conflict = SavedObjectsErrorHelpers.createConflictError(SavedSearchType, id);
      core.savedObjects.client.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(SavedSearchType, id)
      );
      core.savedObjects.client.create.mockRejectedValue(conflict);

      const response = await callRoute('put', SESSION_PATH, { params: { id }, body: sessionData });

      expect(core.savedObjects.client.create).toHaveBeenCalledWith(
        SavedSearchType,
        storedSession.attributes,
        { id, references: storedSession.references }
      );
      expect(response.conflict).toHaveBeenCalledWith({ body: { message: conflict.message } });
      expect(core.savedObjects.client.update).not.toHaveBeenCalled();
      expect(userActivity.trackUserAction).not.toHaveBeenCalled();
    });
  });

  describe('GET', () => {
    it('returns API fields with inline IDs and the resolution outcome', async () => {
      core.savedObjects.client.resolve.mockResolvedValue({
        outcome: 'exactMatch',
        saved_object: savedObject,
      });

      const response = await callRoute('get', SESSION_PATH, { params: { id: 'session-id' } });

      expect(core.savedObjects.client.resolve).toHaveBeenCalledWith(SavedSearchType, 'session-id');
      expect(response.ok).toHaveBeenCalledWith({
        body: expectedBody,
        headers: { 'kbn-resolve-outcome': 'exactMatch' },
      });
    });

    it.each(['aliasMatch', 'conflict'] as const)(
      'returns alias headers for a %s outcome',
      async (outcome) => {
        core.savedObjects.client.resolve.mockResolvedValue({
          outcome,
          alias_target_id: 'session-id',
          alias_purpose: 'savedObjectConversion',
          saved_object: savedObject,
        });

        const response = await callRoute('get', SESSION_PATH, { params: { id: 'legacy-id' } });

        expect(response.ok).toHaveBeenCalledWith({
          body: expectedBody,
          headers: {
            'kbn-resolve-outcome': outcome,
            'kbn-resolve-alias-target-id': 'session-id',
            'kbn-resolve-purpose': 'savedObjectConversion',
          },
        });
      }
    );

    it('returns 404 for a missing session', async () => {
      core.savedObjects.client.resolve.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(SavedSearchType, 'missing-session')
      );

      const response = await callRoute('get', SESSION_PATH, { params: { id: 'missing-session' } });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: 'A Discover session with ID [missing-session] was not found.' },
      });
    });

    it('returns a tab warning when stored controls cannot be read', async () => {
      core.savedObjects.client.resolve.mockResolvedValue({
        outcome: 'exactMatch',
        saved_object: savedObjectWithInvalidControls,
      });

      const response = await callRoute('get', SESSION_PATH, { params: { id: 'session-id' } });

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          ...expectedBody,
          warnings: [
            {
              type: 'dropped_property',
              tab_id: 'tab',
              key: 'control_panels',
              message:
                'Unable to transform control panels. Error: controlGroupJson is not valid JSON',
            },
          ],
        },
        headers: { 'kbn-resolve-outcome': 'exactMatch' },
      });
    });

    it('propagates stored-data validation errors instead of returning a bad request', async () => {
      const error = new ZodError([
        { code: 'custom', path: ['control_panels'], message: 'Invalid stored controls' },
      ]);
      core.savedObjects.client.resolve.mockRejectedValue(error);

      await expect(
        callRoute('get', SESSION_PATH, { params: { id: 'session-id' } })
      ).rejects.toStrictEqual(error);
    });
  });

  describe('request validation', () => {
    it('accepts the as-code body and rejects the old stored payload', () => {
      expect(discoverSessionInternalDataSchema.parse(sessionData)).toStrictEqual(sessionData);
      expect(() => discoverSessionInternalDataSchema.parse(storedSession)).toThrow();
    });

    it('validates the response with its inline ID', () => {
      expect(discoverSessionInternalResponseSchema.parse(expectedBody)).toStrictEqual(expectedBody);
    });

    it('allows warnings only in the GET response schema', () => {
      const body = { ...expectedBody, warnings: [] };

      expect(discoverSessionInternalGetResponseSchema.parse(body)).toStrictEqual(body);
      expect(discoverSessionInternalResponseSchema.safeParse(body).success).toBe(false);
    });

    it('validates the session ID parameter', () => {
      const paramsSchema = discoverSessionInternalParamsSchema;

      expect(() => paramsSchema.parse({ id: 'session-id' })).not.toThrow();
      expect(() => paramsSchema.parse({ id: '' })).toThrow();
      expect(() =>
        paramsSchema.parse({ id: 'a'.repeat(MAX_SAVED_OBJECT_ID_LENGTH + 1) })
      ).toThrow();
    });
  });
});
