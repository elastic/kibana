/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventBus } from './event_bus';
import { MSearchService } from './msearch';
import { ContentRegistry } from './registry';
import { createMockedStorage } from './mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { StorageContext } from '.';

const SEARCH_LISTING_LIMIT = 100;
const SEARCH_PER_PAGE = 10;

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
    getConfig: {
      listingLimit: async () => SEARCH_LISTING_LIMIT,
      perPage: async () => SEARCH_PER_PAGE,
    },
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
    per_page: SEARCH_PER_PAGE,
  });

  const result = await mSearchService.search(
    [
      { contentTypeId: 'foo', ctx: mockStorageContext() },
      { contentTypeId: 'bar', ctx: mockStorageContext() },
    ],
    {
      text: 'search text',
      tags: {
        excluded: ['excluded-tag'],
        included: ['included-tag'],
      },
    }
  );

  expect(savedObjectsClient.find).toHaveBeenCalledWith({
    defaultSearchOperator: 'AND',
    search: 'search text',
    searchFields: ['title^3', 'description', 'special-foo-field', 'special-bar-field'],
    type: ['foo-type', 'bar-type'],
    page: 1,
    perPage: SEARCH_PER_PAGE,
    hasNoReference: [
      {
        id: 'excluded-tag',
        type: 'tag',
      },
    ],
    hasReference: [
      {
        id: 'included-tag',
        type: 'tag',
      },
    ],
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
        { contentTypeId: 'foo', ctx: mockStorageContext() },
        { contentTypeId: 'foo-fake', ctx: mockStorageContext() },
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
        { contentTypeId: 'foo', ctx: mockStorageContext() },
        { contentTypeId: 'foo2', ctx: mockStorageContext() },
      ],
      {
        text: 'foo',
      }
    )
  ).rejects.toThrowErrorMatchingInlineSnapshot(`"Content type foo2 does not support mSearch"`);
});

test('should paginate using cursor', async () => {
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

  savedObjectsClient.find.mockResolvedValueOnce({
    saved_objects: Array(5).fill(soResultFoo),
    total: 7,
    page: 1,
    per_page: 5,
  });

  const result1 = await mSearchService.search(
    [
      { contentTypeId: 'foo', ctx: mockStorageContext() },
      { contentTypeId: 'bar', ctx: mockStorageContext() },
    ],
    {
      text: 'search text',
      limit: 5,
    }
  );

  expect(savedObjectsClient.find).toHaveBeenCalledWith({
    defaultSearchOperator: 'AND',
    search: 'search text',
    searchFields: ['title^3', 'description', 'special-foo-field', 'special-bar-field'],
    type: ['foo-type', 'bar-type'],
    page: 1,
    perPage: 5,
  });

  expect(result1).toEqual({
    hits: Array(5).fill({ itemFoo: soResultFoo }),
    pagination: {
      total: 7,
      cursor: '2',
    },
  });

  savedObjectsClient.find.mockResolvedValueOnce({
    saved_objects: Array(2).fill(soResultFoo),
    total: 7,
    page: 2,
    per_page: 5,
  });

  const result2 = await mSearchService.search(
    [
      { contentTypeId: 'foo', ctx: mockStorageContext() },
      { contentTypeId: 'bar', ctx: mockStorageContext() },
    ],
    {
      text: 'search text',
      limit: 5,
      cursor: result1.pagination.cursor,
    }
  );

  expect(result2).toEqual({
    hits: Array(2).fill({ itemFoo: soResultFoo }),
    pagination: {
      total: 7,
    },
  });
});

test('should error if outside of pagination limit', async () => {
  const { mSearchService } = setup();
  await expect(
    mSearchService.search(
      [
        { contentTypeId: 'foo', ctx: mockStorageContext() },
        { contentTypeId: 'bar', ctx: mockStorageContext() },
      ],

      {
        text: 'search text',
        cursor: '11',
        limit: 10,
      }
    )
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Requested page 11 with 10 items per page exceeds the maximum allowed limit of ${SEARCH_LISTING_LIMIT} items"`
  );
});
