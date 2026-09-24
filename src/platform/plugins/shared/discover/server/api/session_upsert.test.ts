/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext, SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import { discoverSessionApiData } from './transforms/transform_discover_session.fixtures';
import { transformDiscoverSessionIn } from './transforms';
import { upsertDiscoverSession } from './session_upsert';

const { attributes, references } = transformDiscoverSessionIn(discoverSessionApiData);

const createSavedObject = (
  id: string,
  overrides: Partial<SavedObject<DiscoverSessionAttributes>> = {}
): SavedObject<DiscoverSessionAttributes> => ({
  id,
  type: SavedSearchType,
  attributes,
  references,
  version: 'WzEsMV0=',
  ...overrides,
});

describe('upsertDiscoverSession', () => {
  const requestId = 'discover-session';
  let coreContext: ReturnType<typeof coreMock.createRequestHandlerContext>;
  let requestContext: RequestHandlerContext;

  beforeEach(() => {
    coreContext = coreMock.createRequestHandlerContext();
    requestContext = jest.mocked<RequestHandlerContext>({
      core: Promise.resolve(coreContext),
      resolve: jest.fn().mockResolvedValue({ core: coreContext }),
    });
  });

  it('updates the requested session with full-replacement options', async () => {
    const updated = createSavedObject(requestId, {
      updated_at: '2026-07-15T12:00:00.000Z',
      version: 'WzIsMV0=',
    });

    coreContext.savedObjects.client.get
      .mockResolvedValueOnce(createSavedObject(requestId))
      .mockResolvedValueOnce(updated);
    coreContext.savedObjects.client.update.mockResolvedValue(updated);

    const result = await upsertDiscoverSession(requestContext, requestId, discoverSessionApiData);

    expect(coreContext.savedObjects.client.update).toHaveBeenCalledWith(
      SavedSearchType,
      requestId,
      attributes,
      {
        upsert: attributes,
        references,
        mergeAttributes: false,
      }
    );
    expect(coreContext.savedObjects.client.get).toHaveBeenNthCalledWith(
      1,
      SavedSearchType,
      requestId
    );
    expect(coreContext.savedObjects.client.get).toHaveBeenNthCalledWith(
      2,
      SavedSearchType,
      requestId
    );
    expect(result.body.id).toBe(requestId);
    expect(result.operation).toBe('update');
  });

  it('propagates non-not-found errors from the existence check', async () => {
    const error = new Error('Get failed');
    coreContext.savedObjects.client.get.mockRejectedValue(error);

    await expect(
      upsertDiscoverSession(requestContext, requestId, discoverSessionApiData)
    ).rejects.toBe(error);

    expect(coreContext.savedObjects.client.update).not.toHaveBeenCalled();
  });

  it('updates an existing legacy ID without applying the new ID validation', async () => {
    const legacyId = 'Legacy-Discover-Session';
    const updated = createSavedObject(legacyId, {
      updated_at: '2026-07-15T12:00:00.000Z',
      version: 'WzIsMV0=',
    });

    coreContext.savedObjects.client.update.mockResolvedValue(updated);
    coreContext.savedObjects.client.get.mockResolvedValue(updated);

    const result = await upsertDiscoverSession(requestContext, legacyId, discoverSessionApiData);

    expect(coreContext.savedObjects.client.update).toHaveBeenCalledWith(
      SavedSearchType,
      legacyId,
      attributes,
      {
        upsert: attributes,
        references,
        mergeAttributes: false,
      }
    );
    expect(coreContext.savedObjects.client.get).toHaveBeenCalledWith(SavedSearchType, legacyId);
    expect(result.body.id).toBe(legacyId);
    expect(result.operation).toBe('update');
  });

  it('propagates conflicts from update without performing the final fetch', async () => {
    const error = SavedObjectsErrorHelpers.createConflictError(SavedSearchType, requestId);
    coreContext.savedObjects.client.get.mockResolvedValue(createSavedObject(requestId));
    coreContext.savedObjects.client.update.mockRejectedValue(error);

    await expect(
      upsertDiscoverSession(requestContext, requestId, discoverSessionApiData)
    ).rejects.toBe(error);

    expect(coreContext.savedObjects.client.get).toHaveBeenCalledTimes(1);
  });

  it('creates a session when the exact ID does not exist', async () => {
    const created = createSavedObject(requestId, { created_at: '2026-07-15T12:00:00.000Z' });
    coreContext.savedObjects.client.get
      .mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(SavedSearchType, requestId)
      )
      .mockResolvedValueOnce(created);
    coreContext.savedObjects.client.update.mockResolvedValue(created);

    const result = await upsertDiscoverSession(requestContext, requestId, discoverSessionApiData);

    expect(result.operation).toBe('create');
    expect(result.body.id).toBe(requestId);
    expect(coreContext.savedObjects.client.update).toHaveBeenCalledWith(
      SavedSearchType,
      requestId,
      attributes,
      {
        upsert: attributes,
        references,
        mergeAttributes: false,
      }
    );
  });
});
