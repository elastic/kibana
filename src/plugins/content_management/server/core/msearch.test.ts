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

  contentRegistry.register({
    id: `foo`,
    storage: {
      ...createMockedStorage(),
      mSearch: {
        savedObjectType: 'foo-type',
        toItemResult: (ctx, so) => ({ itemFoo: so }),
        additionalSearchFields: ['special-foo-field'],
      },
    },
    version: {
      latest: 1,
    },
  });

  contentRegistry.register({
    id: `bar`,
    storage: {
      ...createMockedStorage(),
      mSearch: {
        savedObjectType: 'bar-type',
        toItemResult: (ctx, so) => ({ itemBar: so }),
        additionalSearchFields: ['special-bar-field'],
      },
    },
    version: {
      latest: 1,
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

test('should cross-content search using saved objects api', async () => {
  const { savedObjectsClient, mSearchService } = setup();

  const soResultFoo = {
    id: 'fooid',
    score: 0,
    type: 'foo-type',
    references: [],
    attributes: {
      title: 'foo',
    },
  };

  const soResultBar = {
    id: 'barid',
    score: 0,
    type: 'bar-type',
    references: [],
    attributes: {
      title: 'bar',
    },
  };

  savedObjectsClient.find.mockResolvedValueOnce({
    saved_objects: [soResultFoo, soResultBar],
    total: 2,
    page: 1,
    per_page: 10,
  });

  const result = await mSearchService.search(
    [
      { id: 'foo', ctx: mockStorageContext() },
      { id: 'bar', ctx: mockStorageContext() },
    ],
    {
      text: 'search text',
    }
  );

  expect(savedObjectsClient.find).toHaveBeenCalledWith({
    defaultSearchOperator: 'AND',
    search: 'search text',
    searchFields: ['title^3', 'description', 'special-foo-field', 'special-bar-field'],
    type: ['foo-type', 'bar-type'],
  });

  expect(result).toEqual({
    hits: [{ itemFoo: soResultFoo }, { itemBar: soResultBar }],
    pagination: {
      total: 2,
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
