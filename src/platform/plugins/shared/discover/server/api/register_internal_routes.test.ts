/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { forbidden } from '@hapi/boom';
import { getMeta } from '@kbn/as-code-shared-schemas';
import type { RequestHandlerContext, SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { AuthzDisabled } from '@kbn/core-security-server';
import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import {
  DISCOVER_SESSION_API_VERSION,
  DISCOVER_SESSION_INTERNAL_API_BASE_PATH,
} from '../../common/constants';
import type { DiscoverSessionInternalData } from './internal_schema';
import { registerInternalRoutes } from './register_internal_routes';
import { discoverSessionAttributes } from './transforms/transform_discover_session.fixtures';

const id = 'session-id';
const firstTab = discoverSessionAttributes.tabs[0];
const data: DiscoverSessionInternalData = {
  attributes: {
    ...discoverSessionAttributes,
    tabs: ['shared-view', 'shared-view', 'independent-view'].map((dataViewId, index) => ({
      ...firstTab,
      id: `tab-${index}`,
      attributes: {
        ...firstTab.attributes,
        kibanaSavedObjectMeta: {
          searchSourceJSON: JSON.stringify({
            index: { id: dataViewId, title: 'changed-logs-*' },
            filter: [
              {
                meta: { index: dataViewId, disabled: false, negate: false, alias: null },
                $state: { store: 'globalState' },
                exists: { field: 'message' },
              },
              { meta: { disabled: false, negate: false }, exists: { field: 'implicit' } },
            ],
          }),
        },
        visContext: {
          suggestionType: 'histogram',
          requestData: { dataViewId },
          attributes: { title: 'Chart', references: [] },
        },
        controlGroupJson: '{"panelsJSON":"{}","chainingSystem":"HIERARCHICAL"}',
      },
    })),
  },
  references: [
    { name: 'tag-1', type: 'tag', id: 'tag-1' },
    { name: 'external-filter', type: 'index-pattern', id: 'external-view' },
  ],
};

const savedObject: SavedObject<DiscoverSessionAttributes> = {
  id,
  type: SavedSearchType,
  ...data,
  version: 'WzEsMV0=',
  managed: false,
  created_at: '2026-09-20T10:00:00.000Z',
  updated_at: '2026-09-20T11:00:00.000Z',
};

describe('Discover internal session routes', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let core: ReturnType<typeof coreMock.createRequestHandlerContext>;
  let context: RequestHandlerContext;
  const userActivity = { trackUserAction: jest.fn() };
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter();
    core = coreMock.createRequestHandlerContext();
    context = jest.mocked<RequestHandlerContext>({
      core: Promise.resolve(core),
      resolve: jest.fn().mockResolvedValue({ core }),
    });
    registerInternalRoutes(router.versioned, userActivity, logger);
    core.savedObjects.client.create.mockResolvedValue(savedObject);
    core.savedObjects.client.resolve.mockResolvedValue({
      outcome: 'exactMatch',
      saved_object: savedObject,
    });
    core.savedObjects.client.update.mockResolvedValue({ ...savedObject, created_at: undefined });
    core.savedObjects.client.get.mockResolvedValue(savedObject);
  });

  const request = async (method: 'get' | 'post' | 'put', requestId = id) => {
    const path =
      method === 'post'
        ? DISCOVER_SESSION_INTERNAL_API_BASE_PATH
        : `${DISCOVER_SESSION_INTERNAL_API_BASE_PATH}/{id}`;
    const version = router.versioned.getRoute(method, path).versions[DISCOVER_SESSION_API_VERSION];
    if (!version) {
      throw new Error(`No route version for ${method} ${path}`);
    }
    const response = httpServerMock.createResponseFactory();
    await version.handler(
      context,
      httpServerMock.createKibanaRequest({
        method,
        path,
        params: { id: requestId },
        ...(method !== 'get' && { body: data }),
      }),
      response
    );
    return response;
  };

  it.each(['get', 'post', 'put'] as const)(
    'delegates %s authorization to the scoped SO client',
    (method) => {
      const path =
        method === 'post'
          ? DISCOVER_SESSION_INTERNAL_API_BASE_PATH
          : `${DISCOVER_SESSION_INTERNAL_API_BASE_PATH}/{id}`;
      expect(router.versioned.getRoute(method, path).config).toMatchObject({
        access: 'internal',
        security: { authz: AuthzDisabled.delegateToSOClient },
      });
    }
  );

  it('creates exactly the submitted state and preserves shared and independent inline identities', async () => {
    const response = await request('post');
    expect(core.savedObjects.client.create).toHaveBeenCalledWith(SavedSearchType, data.attributes, {
      id: undefined,
      references: data.references,
    });
    expect(core.savedObjects.client.resolve).not.toHaveBeenCalled();
    expect(response.created).toHaveBeenCalledWith({
      body: { id, data, meta: getMeta(savedObject) },
    });
    expect(userActivity.trackUserAction).toHaveBeenCalledWith(
      expect.objectContaining({
        event: { action: 'discover_session_create', type: 'creation' },
        object: { id, name: data.attributes.title, type: 'discover_session', tags: ['tag-1'] },
      })
    );
  });

  it('updates the requested session without replacing submitted IDs when the definition changes', async () => {
    core.savedObjects.client.get.mockResolvedValueOnce({
      ...savedObject,
      attributes: discoverSessionAttributes,
    });
    const response = await request('put');
    expect(core.savedObjects.client.get).toHaveBeenNthCalledWith(1, SavedSearchType, id);
    expect(core.savedObjects.client.update).toHaveBeenCalledWith(
      SavedSearchType,
      id,
      data.attributes,
      { references: data.references, mergeAttributes: false }
    );
    expect(core.savedObjects.client.get).toHaveBeenNthCalledWith(2, SavedSearchType, id);
    expect(response.ok).toHaveBeenCalledWith({ body: { id, data, meta: getMeta(savedObject) } });
    expect(userActivity.trackUserAction).toHaveBeenCalledWith(
      expect.objectContaining({ event: { action: 'discover_session_update', type: 'change' } })
    );
  });

  it('returns 201 when PUT creates a missing session', async () => {
    core.savedObjects.client.get.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError(SavedSearchType, id)
    );
    const response = await request('put');
    expect(core.savedObjects.client.create).toHaveBeenCalledWith(SavedSearchType, data.attributes, {
      id,
      references: data.references,
    });
    expect(response.created).toHaveBeenCalledWith({
      body: { id, data, meta: getMeta(savedObject) },
    });
  });

  it('rejects an invalid newly created ID before writing', async () => {
    core.savedObjects.client.get.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError(SavedSearchType, 'Legacy-Session')
    );
    const response = await request('put', 'Legacy-Session');
    expect(response.badRequest).toHaveBeenCalled();
    expect(core.savedObjects.client.update).not.toHaveBeenCalled();
    expect(userActivity.trackUserAction).not.toHaveBeenCalled();
  });

  it('returns a conflict when the exact-ID update fails', async () => {
    core.savedObjects.client.update.mockRejectedValue(
      SavedObjectsErrorHelpers.createConflictError(SavedSearchType, id)
    );
    const response = await request('put');
    expect(response.conflict).toHaveBeenCalled();
    expect(core.savedObjects.client.get).toHaveBeenCalledTimes(1);
    expect(core.savedObjects.client.update).toHaveBeenCalledTimes(1);
    expect(userActivity.trackUserAction).not.toHaveBeenCalled();
  });

  it.each(['aliasMatch', 'conflict'] as const)(
    'returns stored state with %s resolution headers',
    async (outcome) => {
      core.savedObjects.client.resolve.mockResolvedValue({
        outcome,
        saved_object: savedObject,
        alias_target_id: 'alias-target',
        alias_purpose: 'savedObjectConversion',
      });
      const response = await request('get');
      expect(response.ok).toHaveBeenCalledWith({
        body: { id, data, meta: getMeta(savedObject) },
        headers: {
          'kbn-resolve-outcome': outcome,
          'kbn-resolve-alias-target-id': 'alias-target',
          'kbn-resolve-purpose': 'savedObjectConversion',
        },
      });
      expect(userActivity.trackUserAction).not.toHaveBeenCalled();
    }
  );

  it('preserves the readable missing-session response', async () => {
    core.savedObjects.client.resolve.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError(SavedSearchType, id)
    );
    const response = await request('get');
    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: `A Discover session with ID [${id}] was not found.` },
    });
  });

  it.each([
    { method: 'get', lookup: 'resolve' },
    { method: 'put', lookup: 'get' },
  ] as const)('preserves permission failures during $method', async ({ method, lookup }) => {
    core.savedObjects.client[lookup].mockRejectedValue(forbidden('Session access denied'));
    const response = await request(method);
    expect(response.forbidden).toHaveBeenCalledWith({ body: { message: 'Session access denied' } });
    expect(core.savedObjects.client.update).not.toHaveBeenCalled();
  });

  it('propagates unexpected lookup failures instead of attempting an upsert', async () => {
    const error = new Error('Get failed');
    core.savedObjects.client.get.mockRejectedValue(error);
    await expect(request('put')).rejects.toBe(error);
    expect(core.savedObjects.client.update).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  it('does not fail a successful save when activity tracking throws', async () => {
    userActivity.trackUserAction.mockImplementationOnce(() => {
      throw new Error('Activity tracking unavailable');
    });
    const response = await request('post');
    expect(response.created).toHaveBeenCalled();
  });
});
