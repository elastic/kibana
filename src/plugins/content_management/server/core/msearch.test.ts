/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EventBus } from './event_bus';
import { MSearchService } from './msearch';
import { ContentRegistry } from './registry';
import { createMockedStorage } from './mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { StorageContext } from '.';

const setup = () => {
  const contentRegistry = new ContentRegistry(new EventBus());
  const storage = createMockedStorage();
  storage.mSearch = {
    savedObjectType: 'foo-type',
    toItemResult: (ctx, so) => ({ item: so }),
  };
  contentRegistry.register({
    id: `foo`,
    storage,
    version: {
      latest: 2,
    },
  });

  const savedObjectsClient = savedObjectsClientMock.create();
  const mSearchService = new MSearchService({
    getSavedObjectsClient: async () => savedObjectsClient,
    contentRegistry,
  });

  return { mSearchService, savedObjectsClient, contentRegistry };
};

const mockStorageContext = (ctx: Partial<StorageContext> = {}): StorageContext => {
  return {
    requestHandlerContext: 'mockRequestHandlerContext' as any,
    utils: 'mockUtils' as any,
    version: {
      latest: 1,
      request: 1,
    },
    ...ctx,
  };
};

test('should search saved objects', async () => {
  const { savedObjectsClient, mSearchService } = setup();

  const soResult = {
    id: 'fooid',
    score: 0,
    type: 'foo-type',
    references: [],
    attributes: {
      title: 'foo',
    },
  };

  savedObjectsClient.find.mockResolvedValueOnce({
    saved_objects: [soResult],
    total: 1,
    page: 1,
    per_page: 10,
  });

  const result = await mSearchService.search([{ id: 'foo', ctx: mockStorageContext() }], {
    text: 'foo',
  });

  expect(result).toEqual({
    hits: [{ item: soResult }],
    pagination: {
      total: 1,
    },
  });
});

test('should error if content is not registered', async () => {
  const { mSearchService } = setup();

  await expect(
    mSearchService.search(
      [
        { id: 'foo', ctx: mockStorageContext() },
        { id: 'foo-fake', ctx: mockStorageContext() },
      ],
      {
        text: 'foo',
      }
    )
  ).rejects.toThrowErrorMatchingInlineSnapshot(`"Content [foo-fake] is not registered."`);
});

test('should error if content is registered, but no mSearch support', async () => {
  const { mSearchService, contentRegistry } = setup();

  contentRegistry.register({
    id: `foo2`,
    storage: createMockedStorage(),
    version: {
      latest: 1,
    },
  });

  await expect(
    mSearchService.search(
      [
        { id: 'foo', ctx: mockStorageContext() },
        { id: 'foo2', ctx: mockStorageContext() },
      ],
      {
        text: 'foo',
      }
    )
  ).rejects.toThrowErrorMatchingInlineSnapshot(`"Content type foo2 does not support mSearch"`);
});
