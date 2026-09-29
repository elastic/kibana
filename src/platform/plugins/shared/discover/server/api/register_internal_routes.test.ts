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
import { SavedSearchType, type StoredDiscoverSession } from '@kbn/saved-search-plugin/common';
import {
  DISCOVER_SESSION_API_VERSION,
  DISCOVER_SESSION_INTERNAL_API_BASE_PATH,
} from '../../common/constants';
import { storedDiscoverSessionParamsSchema, storedDiscoverSessionSchema } from './internal_schema';
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
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              index: { id: 'inline-view-id', title: 'logs-*', timeFieldName: '@timestamp' },
              filter: [
                {
                  meta: { indexRefName: FILTER_REFERENCE_NAME },
                  query: { exists: { field: 'host.name' } },
                },
              ],
            }),
          },
        },
      },
    ],
  },
  references: [
    { name: FILTER_REFERENCE_NAME, type: 'index-pattern', id: 'inline-view-id' },
    { name: 'tag-ref-tag-1', type: 'tag', id: 'tag-1' },
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

const expectedBody = {
  id: 'session-id',
  data: storedSession,
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
  let trackUserAction: jest.Mock;

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    trackUserAction = jest.fn();
    const userActivity: CoreSetup['userActivity'] = { trackUserAction };
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
    request: { params?: { id: string }; body?: StoredDiscoverSession }
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
    ['post', DISCOVER_SESSION_INTERNAL_API_BASE_PATH, { body: storedDiscoverSessionSchema }],
    [
      'put',
      SESSION_PATH,
      { params: storedDiscoverSessionParamsSchema, body: storedDiscoverSessionSchema },
    ],
    ['get', SESSION_PATH, { params: storedDiscoverSessionParamsSchema }],
  ] as const)('registers %s with internal access and validation', (method, path, requestSchema) => {
    const { config } = router.versioned.getRoute(method, path);

    expect(config.access).toBe('internal');
    expect(config.security).toEqual({ authz: AuthzDisabled.delegateToSOClient });
    expect(getVersion(method, path).config.validate).toMatchObject({ request: requestSchema });
  });

  describe('POST', () => {
    it('creates the session with unchanged attributes, references and inline IDs', async () => {
      core.savedObjects.client.create.mockResolvedValue(savedObject);

      const response = await callRoute('post', DISCOVER_SESSION_INTERNAL_API_BASE_PATH, {
        body: storedSession,
      });

      expect(core.savedObjects.client.create).toHaveBeenCalledWith(
        SavedSearchType,
        storedSession.attributes,
        { references: storedSession.references }
      );
      expect(response.created).toHaveBeenCalledWith({ body: expectedBody });
      expect(trackUserAction).toHaveBeenCalledWith(
        expect.objectContaining({
          event: { action: 'discover_session_create', type: ['creation'] },
          object: {
            id: 'session-id',
            name: 'Stored session',
            type: 'discover_session',
            tags: ['tag-1'],
          },
        })
      );
    });

    it('propagates unexpected errors', async () => {
      core.savedObjects.client.create.mockRejectedValue(new Error('Unexpected failure'));

      await expect(
        callRoute('post', DISCOVER_SESSION_INTERNAL_API_BASE_PATH, { body: storedSession })
      ).rejects.toThrow('Unexpected failure');
      expect(trackUserAction).not.toHaveBeenCalled();
    });
  });

  describe('PUT', () => {
    it('updates the session with the exact ID and returns what was stored', async () => {
      core.savedObjects.client.update.mockResolvedValue({
        id: 'session-id',
        type: SavedSearchType,
        ...storedSession,
      });
      core.savedObjects.client.get.mockResolvedValue(savedObject);

      const response = await callRoute('put', SESSION_PATH, {
        params: { id: 'session-id' },
        body: storedSession,
      });

      expect(core.savedObjects.client.update).toHaveBeenCalledWith(
        SavedSearchType,
        'session-id',
        storedSession.attributes,
        { references: storedSession.references, mergeAttributes: false }
      );
      expect(core.savedObjects.client.get).toHaveBeenCalledWith(SavedSearchType, 'session-id');
      expect(core.savedObjects.client.resolve).not.toHaveBeenCalled();
      expect(core.savedObjects.client.create).not.toHaveBeenCalled();
      expect(response.ok).toHaveBeenCalledWith({ body: expectedBody });
      expect(trackUserAction).toHaveBeenCalledWith(
        expect.objectContaining({
          event: { action: 'discover_session_update', type: ['change'] },
          object: {
            id: 'session-id',
            name: 'Stored session',
            type: 'discover_session',
            tags: ['tag-1'],
          },
        })
      );
    });

    it('returns 404 instead of recreating a missing session', async () => {
      core.savedObjects.client.update.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(SavedSearchType, 'deleted-session')
      );

      const response = await callRoute('put', SESSION_PATH, {
        params: { id: 'deleted-session' },
        body: storedSession,
      });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: 'A Discover session with ID [deleted-session] was not found.' },
      });
      expect(core.savedObjects.client.create).not.toHaveBeenCalled();
      expect(core.savedObjects.client.get).not.toHaveBeenCalled();
      expect(trackUserAction).not.toHaveBeenCalled();
    });

    it('returns 409 when the saved objects client reports a conflict', async () => {
      const conflict = SavedObjectsErrorHelpers.createConflictError(SavedSearchType, 'session-id');
      core.savedObjects.client.update.mockRejectedValue(conflict);

      const response = await callRoute('put', SESSION_PATH, {
        params: { id: 'session-id' },
        body: storedSession,
      });

      expect(response.conflict).toHaveBeenCalledWith({ body: { message: conflict.message } });
      expect(trackUserAction).not.toHaveBeenCalled();
    });
  });

  describe('GET', () => {
    it('returns the stored session with its resolution outcome', async () => {
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
  });

  describe('request validation', () => {
    it('validates the stored session body', () => {
      const bodySchema = storedDiscoverSessionSchema;

      expect(() => bodySchema.validate(storedSession)).not.toThrow();
      expect(() =>
        bodySchema.validate({ ...storedSession, attributes: { title: 'Session' } })
      ).toThrow(/\[attributes.tabs\]/);
      expect(() =>
        bodySchema.validate({
          ...storedSession,
          references: [
            {
              name: 'reference',
              type: 'index-pattern',
              id: 'a'.repeat(MAX_SAVED_OBJECT_ID_LENGTH + 1),
            },
          ],
        })
      ).toThrow(/\[references.0.id\]/);
      expect(() =>
        bodySchema.validate({
          ...storedSession,
          references: new Array(10_001).fill({ name: 'reference', type: 'tag', id: 'tag' }),
        })
      ).toThrow(/\[references\]: array size is/);
    });

    it('validates the session ID parameter', () => {
      const paramsSchema = storedDiscoverSessionParamsSchema;

      expect(() => paramsSchema.validate({ id: 'session-id' })).not.toThrow();
      expect(() => paramsSchema.validate({ id: '' })).toThrow(/\[id\]/);
      expect(() =>
        paramsSchema.validate({ id: 'a'.repeat(MAX_SAVED_OBJECT_ID_LENGTH + 1) })
      ).toThrow(/\[id\]/);
    });
  });
});
