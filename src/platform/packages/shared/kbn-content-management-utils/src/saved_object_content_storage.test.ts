/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { MockedLogger } from '@kbn/logging-mocks';

import {
  SOContentStorage,
  searchArgsToSOFindOptionsDefault,
  buildCreatedByFilter,
  buildFavoritesFilter,
  buildFacetAggregations,
  parseFacetAggregations,
} from './saved_object_content_storage';
import type { ContentManagementCrudTypes } from './types';

import { schema } from '@kbn/config-schema';
import type {
  ContentManagementServicesDefinition as ServicesDefinition,
  Version,
} from '@kbn/object-versioning';
import { getContentManagementServicesTransforms } from '@kbn/object-versioning';
import { savedObjectSchema, objectTypeToGetResultSchema, createResultSchema } from './schema';

import { coreMock } from '@kbn/core/server/mocks';
import type { RequestHandlerContext, SavedObject } from '@kbn/core/server';
import { mockRouter } from '@kbn/core-http-router-server-mocks';

interface MockAttributes {
  title: string;
  description: string | null;
}
type MockCrudTypes = ContentManagementCrudTypes<'content-id', MockAttributes, {}, {}, {}>;

const testAttributesSchema = schema.object(
  {
    title: schema.string(),
    description: schema.string(),
  },
  { unknowns: 'forbid' }
);

const testSavedObjectSchema = savedObjectSchema(testAttributesSchema);

export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: objectTypeToGetResultSchema(testSavedObjectSchema),
      },
    },
  },
  create: {
    out: {
      result: {
        schema: createResultSchema(testSavedObjectSchema),
      },
    },
  },
  update: {
    out: {
      result: {
        schema: createResultSchema(testSavedObjectSchema),
      },
    },
  },
  search: {
    out: {
      result: {
        schema: schema.object({ hits: schema.arrayOf(testSavedObjectSchema) }),
      },
    },
  },
  mSearch: {
    out: {
      result: {
        schema: testSavedObjectSchema,
      },
    },
  },
};

export const cmServicesDefinition: { [version: Version]: ServicesDefinition } = {
  1: serviceDefinition,
};

const transforms = getContentManagementServicesTransforms(cmServicesDefinition, 1);

class TestSOContentStorage extends SOContentStorage<MockCrudTypes> {
  constructor({
    throwOnResultValidationError,
    logger,
  }: { throwOnResultValidationError?: boolean; logger?: MockedLogger } = {}) {
    super({
      savedObjectType: 'test',
      cmServicesDefinition,
      allowedSavedObjectAttributes: ['title', 'description'],
      logger: logger ?? loggerMock.create(),
      throwOnResultValidationError: throwOnResultValidationError ?? false,
      enableMSearch: true,
    });
  }
}

const setup = ({ storage }: { storage?: TestSOContentStorage } = {}) => {
  storage = storage ?? new TestSOContentStorage();
  const requestHandlerCoreContext = coreMock.createRequestHandlerContext();
  const requestHandlerContext = jest.mocked<RequestHandlerContext>({
    core: Promise.resolve(requestHandlerCoreContext),
    resolve: jest.fn(),
  });

  return {
    get: (mockSavedObject: SavedObject) => {
      requestHandlerCoreContext.savedObjects.client.resolve.mockResolvedValue({
        saved_object: mockSavedObject,
        outcome: 'exactMatch',
      });

      return storage!.get(
        {
          request: mockRouter.createFakeKibanaRequest({}),
          requestHandlerContext,
          version: {
            request: 1,
            latest: 1,
          },
          utils: {
            getTransforms: () => transforms,
          },
        },
        mockSavedObject.id
      );
    },
    create: (mockSavedObject: SavedObject<MockAttributes>) => {
      requestHandlerCoreContext.savedObjects.client.create.mockResolvedValue(mockSavedObject);

      return storage!.create(
        {
          request: mockRouter.createFakeKibanaRequest({}),
          requestHandlerContext,
          version: {
            request: 1,
            latest: 1,
          },
          utils: {
            getTransforms: () => transforms,
          },
        },
        mockSavedObject.attributes,
        {}
      );
    },
    update: (mockSavedObject: SavedObject<MockAttributes>) => {
      requestHandlerCoreContext.savedObjects.client.update.mockResolvedValue(mockSavedObject);

      return storage!.update(
        {
          request: mockRouter.createFakeKibanaRequest({}),
          requestHandlerContext,
          version: {
            request: 1,
            latest: 1,
          },
          utils: {
            getTransforms: () => transforms,
          },
        },
        mockSavedObject.id,
        mockSavedObject.attributes,
        {}
      );
    },
    search: (mockSavedObject: SavedObject<MockAttributes>) => {
      requestHandlerCoreContext.savedObjects.client.find.mockResolvedValue({
        saved_objects: [{ ...mockSavedObject, score: 100 }],
        total: 1,
        per_page: 10,
        page: 1,
      });

      return storage!.search(
        {
          request: mockRouter.createFakeKibanaRequest({}),
          requestHandlerContext,
          version: {
            request: 1,
            latest: 1,
          },
          utils: {
            getTransforms: () => transforms,
          },
        },
        {},
        {}
      );
    },
    mSearch: async (mockSavedObject: SavedObject<MockAttributes>) => {
      return storage!.mSearch!.toItemResult(
        {
          request: mockRouter.createFakeKibanaRequest({}),
          requestHandlerContext,
          version: {
            request: 1,
            latest: 1,
          },
          utils: {
            getTransforms: () => transforms,
          },
        },
        { ...mockSavedObject, score: 100 }
      );
    },
  };
};

describe('get', () => {
  test('returns the storage get() result', async () => {
    const get = setup().get;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: 'description',
      },
    };

    const result = await get(testSavedObject);

    expect(result).toEqual({ item: testSavedObject, meta: { outcome: 'exactMatch' } });
  });

  test('filters out unknown attributes', async () => {
    const get = setup().get;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: 'description',
        unknown: 'unknown',
      },
    };

    const result = await get(testSavedObject);
    expect(result.item.attributes).not.toHaveProperty('unknown');
  });

  test('throws response validation error', async () => {
    const get = setup({
      storage: new TestSOContentStorage({ throwOnResultValidationError: true }),
    }).get;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: null,
      },
    };

    await expect(get(testSavedObject)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Invalid response. [item.attributes.description]: expected value of type [string] but got [null]"`
    );
  });

  test('logs response validation error', async () => {
    const logger = loggerMock.create();
    const get = setup({
      storage: new TestSOContentStorage({ throwOnResultValidationError: false, logger }),
    }).get;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: null,
      },
    };

    await expect(get(testSavedObject)).resolves.toBeDefined();
    expect(logger.warn).toBeCalledWith(
      `Invalid response. [item.attributes.description]: expected value of type [string] but got [null]`
    );
  });
});

describe('create', () => {
  test('returns the storage create() result', async () => {
    const create = setup().create;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: 'description',
      },
    };

    const result = await create(testSavedObject);

    expect(result).toEqual({ item: testSavedObject });
  });

  test('filters out unknown attributes', async () => {
    const create = setup().create;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: 'description',
        unknown: 'unknown',
      },
    };

    const result = await create(testSavedObject);
    expect(result.item.attributes).not.toHaveProperty('unknown');
  });

  test('throws response validation error', async () => {
    const create = setup({
      storage: new TestSOContentStorage({ throwOnResultValidationError: true }),
    }).create;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: null,
      },
    };

    await expect(create(testSavedObject)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Invalid response. [item.attributes.description]: expected value of type [string] but got [null]"`
    );
  });

  test('logs response validation error', async () => {
    const logger = loggerMock.create();
    const create = setup({
      storage: new TestSOContentStorage({ throwOnResultValidationError: false, logger }),
    }).create;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: null,
      },
    };

    await expect(create(testSavedObject)).resolves.toBeDefined();
    expect(logger.warn).toBeCalledWith(
      `Invalid response. [item.attributes.description]: expected value of type [string] but got [null]`
    );
  });
});

describe('update', () => {
  test('returns the storage update() result', async () => {
    const update = setup().update;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: 'description',
      },
    };

    const result = await update(testSavedObject);

    expect(result).toEqual({ item: testSavedObject });
  });

  test('filters out unknown attributes', async () => {
    const update = setup().update;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: 'description',
        unknown: 'unknown',
      },
    };

    const result = await update(testSavedObject);
    expect(result.item.attributes).not.toHaveProperty('unknown');
  });

  test('throws response validation error', async () => {
    const update = setup({
      storage: new TestSOContentStorage({ throwOnResultValidationError: true }),
    }).update;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: null,
      },
    };

    await expect(update(testSavedObject)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Invalid response. [item.attributes.description]: expected value of type [string] but got [null]"`
    );
  });

  test('logs response validation error', async () => {
    const logger = loggerMock.create();
    const update = setup({
      storage: new TestSOContentStorage({ throwOnResultValidationError: false, logger }),
    }).update;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: null,
      },
    };

    await expect(update(testSavedObject)).resolves.toBeDefined();
    expect(logger.warn).toBeCalledWith(
      `Invalid response. [item.attributes.description]: expected value of type [string] but got [null]`
    );
  });
});

describe('search', () => {
  test('returns the storage search() result', async () => {
    const search = setup().search;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: 'description',
      },
    };

    const result = await search(testSavedObject);

    expect(result).toEqual({ hits: [testSavedObject], pagination: { total: 1 } });
  });

  test('filters out unknown attributes', async () => {
    const search = setup().search;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: 'description',
        unknown: 'unknown',
      },
    };

    const result = await search(testSavedObject);
    expect(result.hits[0].attributes).not.toHaveProperty('unknown');
  });

  test('throws response validation error', async () => {
    const search = setup({
      storage: new TestSOContentStorage({ throwOnResultValidationError: true }),
    }).search;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: null,
      },
    };

    await expect(search(testSavedObject)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Invalid response. [hits.0.attributes.description]: expected value of type [string] but got [null]"`
    );
  });

  test('logs response validation error', async () => {
    const logger = loggerMock.create();
    const update = setup({
      storage: new TestSOContentStorage({ throwOnResultValidationError: false, logger }),
    }).search;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: null,
      },
    };

    await expect(update(testSavedObject)).resolves.toBeDefined();
    expect(logger.warn).toBeCalledWith(
      `Invalid response. [hits.0.attributes.description]: expected value of type [string] but got [null]`
    );
  });
});

describe('mSearch', () => {
  test('returns the storage mSearch() result', async () => {
    const mSearch = setup().mSearch;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: 'description',
      },
    };

    const result = await mSearch(testSavedObject);

    expect(result).toEqual(testSavedObject);
  });

  test('filters out unknown attributes', async () => {
    const mSearch = setup().mSearch;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: 'description',
        unknown: 'unknown',
      },
    };

    const result = await mSearch(testSavedObject);
    expect(result.attributes).not.toHaveProperty('unknown');
  });

  test('throws response validation error', async () => {
    const mSearch = setup({
      storage: new TestSOContentStorage({ throwOnResultValidationError: true }),
    }).mSearch;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: null,
      },
    };

    await expect(mSearch(testSavedObject)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Invalid response. [attributes.description]: expected value of type [string] but got [null]"`
    );
  });

  test('logs response validation error', async () => {
    const logger = loggerMock.create();
    const mSearch = setup({
      storage: new TestSOContentStorage({ throwOnResultValidationError: false, logger }),
    }).mSearch;

    const testSavedObject = {
      id: 'id',
      type: 'test',
      references: [],
      attributes: {
        title: 'title',
        description: null,
      },
    };

    await expect(mSearch(testSavedObject)).resolves.toBeDefined();
    expect(logger.warn).toBeCalledWith(
      'Invalid response. [attributes.description]: expected value of type [string] but got [null]'
    );
  });
});

describe('searchArgsToSOFindOptionsDefault', () => {
  describe('sort parameter mapping', () => {
    test('should pass sortField and sortOrder when sort is provided', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: {
          text: 'test',
          sort: {
            field: 'updatedAt',
            direction: 'desc',
          },
        },
      });

      expect(result.sortField).toBe('updatedAt');
      expect(result.sortOrder).toBe('desc');
    });

    test('should handle ascending sort direction', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: {
          sort: {
            field: 'title',
            direction: 'asc',
          },
        },
      });

      expect(result.sortField).toBe('title');
      expect(result.sortOrder).toBe('asc');
    });

    test('should not include sortField and sortOrder when sort is not provided', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: {
          text: 'test',
        },
      });

      expect(result.sortField).toBeUndefined();
      expect(result.sortOrder).toBeUndefined();
    });

    test('should handle common sort fields', () => {
      const fields = ['title', 'updatedAt', 'createdAt'];

      for (const field of fields) {
        const result = searchArgsToSOFindOptionsDefault({
          contentTypeId: 'dashboard',
          query: {
            sort: { field, direction: 'asc' },
          },
        });

        expect(result.sortField).toBe(field);
      }
    });
  });

  describe('basic query mapping', () => {
    test('should map contentTypeId to type', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: {},
      });

      expect(result.type).toBe('dashboard');
    });

    test('should map text to search', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: { text: 'my search' },
      });

      expect(result.search).toBe('my search');
    });

    test('should map limit to perPage', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: { limit: 50 },
      });

      expect(result.perPage).toBe(50);
    });

    test('should map cursor to page', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: { cursor: '5' },
      });

      expect(result.page).toBe(5);
    });
  });

  describe('options mapping', () => {
    test('should use custom searchFields when provided', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: {},
        options: { searchFields: ['name', 'summary'] },
      });

      expect(result.searchFields).toEqual(['name', 'summary']);
    });

    test('should use default searchFields when not provided', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: {},
      });

      expect(result.searchFields).toEqual(['description', 'title']);
    });

    test('should use custom fields when provided', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: {},
        options: { fields: ['id', 'name'] },
      });

      expect(result.fields).toEqual(['id', 'name']);
    });
  });

  describe('createdBy filter mapping', () => {
    test('should add filter when createdBy.included is provided', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: {
          createdBy: { included: ['user-a'] },
        },
      });

      expect(result.filter).toBe('dashboard.created_by:"user-a"');
    });

    test('should add OR filter when multiple users are included', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: {
          createdBy: { included: ['user-a', 'user-b'] },
        },
      });

      expect(result.filter).toBe(
        '(dashboard.created_by:"user-a" OR dashboard.created_by:"user-b")'
      );
    });

    test('should add exclude filter when createdBy.excluded is provided', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: {
          createdBy: { excluded: ['user-x'] },
        },
      });

      expect(result.filter).toBe('NOT dashboard.created_by:"user-x"');
    });

    test('should add filter for items with no creator when includeNoCreator is true', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: {
          createdBy: { includeNoCreator: true },
        },
      });

      expect(result.filter).toBe('NOT dashboard.created_by:*');
    });

    test('should combine include and exclude filters', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: {
          createdBy: {
            included: ['user-a'],
            excluded: ['user-x'],
          },
        },
      });

      expect(result.filter).toBe(
        'dashboard.created_by:"user-a" AND NOT dashboard.created_by:"user-x"'
      );
    });
  });

  describe('favorites filter mapping', () => {
    test('should add filter when favorites.only is true with IDs', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: {
          favorites: {
            only: true,
            ids: ['id-1'],
          },
        },
      });

      expect(result.filter).toBe('dashboard.id:"id-1"');
    });

    test('should add OR filter for multiple favorite IDs', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: {
          favorites: {
            only: true,
            ids: ['id-1', 'id-2', 'id-3'],
          },
        },
      });

      expect(result.filter).toBe(
        '(dashboard.id:"id-1" OR dashboard.id:"id-2" OR dashboard.id:"id-3")'
      );
    });

    test('should return empty-matching filter when favorites.only is true but no IDs', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: {
          favorites: {
            only: true,
            ids: [],
          },
        },
      });

      // This filter should match nothing.
      expect(result.filter).toBe('dashboard.id:""');
    });

    test('should not add filter when favorites.only is false', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: {
          favorites: {
            only: false,
            ids: ['id-1'],
          },
        },
      });

      expect(result.filter).toBeUndefined();
    });
  });

  describe('combined filters', () => {
    test('should combine createdBy and favorites filters', () => {
      const result = searchArgsToSOFindOptionsDefault({
        contentTypeId: 'dashboard',
        query: {
          createdBy: { included: ['user-a'] },
          favorites: { only: true, ids: ['id-1'] },
        },
      });

      expect(result.filter).toBe('(dashboard.created_by:"user-a") AND (dashboard.id:"id-1")');
    });
  });
});

describe('buildCreatedByFilter', () => {
  const soType = 'dashboard';

  test('should return undefined when createdBy is undefined', () => {
    const result = buildCreatedByFilter(undefined, soType);
    expect(result).toBeUndefined();
  });

  test('should return undefined when createdBy is empty object', () => {
    const result = buildCreatedByFilter({}, soType);
    expect(result).toBeUndefined();
  });

  test('should build filter for single included user', () => {
    const result = buildCreatedByFilter({ included: ['user-a'] }, soType);
    expect(result).toBe('dashboard.created_by:"user-a"');
  });

  test('should build OR filter for multiple included users', () => {
    const result = buildCreatedByFilter({ included: ['user-a', 'user-b'] }, soType);
    expect(result).toBe('(dashboard.created_by:"user-a" OR dashboard.created_by:"user-b")');
  });

  test('should build NOT filter for excluded users', () => {
    const result = buildCreatedByFilter({ excluded: ['user-x', 'user-y'] }, soType);
    expect(result).toBe('NOT dashboard.created_by:"user-x" AND NOT dashboard.created_by:"user-y"');
  });

  test('should build filter for includeNoCreator (null user)', () => {
    const result = buildCreatedByFilter({ includeNoCreator: true }, soType);
    expect(result).toBe('NOT dashboard.created_by:*');
  });

  test('should combine all filter types', () => {
    const result = buildCreatedByFilter(
      {
        included: ['user-a'],
        excluded: ['user-x'],
        includeNoCreator: true,
      },
      soType
    );
    expect(result).toBe(
      'dashboard.created_by:"user-a" AND NOT dashboard.created_by:"user-x" AND NOT dashboard.created_by:*'
    );
  });
});

describe('buildFavoritesFilter', () => {
  const soType = 'dashboard';

  test('should return undefined when favorites is undefined', () => {
    const result = buildFavoritesFilter(undefined, soType);
    expect(result).toBeUndefined();
  });

  test('should return undefined when favorites.only is false', () => {
    const result = buildFavoritesFilter({ only: false, ids: ['id-1'] }, soType);
    expect(result).toBeUndefined();
  });

  test('should return empty-matching filter when favorites.only is true but no IDs', () => {
    const result = buildFavoritesFilter({ only: true, ids: [] }, soType);
    expect(result).toBe('dashboard.id:""');
  });

  test('should return empty-matching filter when favorites.only is true but IDs undefined', () => {
    const result = buildFavoritesFilter({ only: true }, soType);
    expect(result).toBe('dashboard.id:""');
  });

  test('should build filter for single favorite ID', () => {
    const result = buildFavoritesFilter({ only: true, ids: ['id-1'] }, soType);
    expect(result).toBe('dashboard.id:"id-1"');
  });

  test('should build OR filter for multiple favorite IDs', () => {
    const result = buildFavoritesFilter({ only: true, ids: ['id-1', 'id-2'] }, soType);
    expect(result).toBe('(dashboard.id:"id-1" OR dashboard.id:"id-2")');
  });
});

describe('buildFacetAggregations', () => {
  const soType = 'dashboard';

  test('should return undefined when facets is undefined', () => {
    const result = buildFacetAggregations(undefined, soType);
    expect(result).toBeUndefined();
  });

  test('should return undefined when facets is empty object', () => {
    const result = buildFacetAggregations({}, soType);
    expect(result).toBeUndefined();
  });

  test('should build tag facet aggregation with nested structure', () => {
    const result = buildFacetAggregations({ tags: {} }, soType);

    expect(result).toEqual({
      tagFacet: {
        nested: { path: 'references' },
        aggs: {
          tagFilter: {
            filter: { term: { 'references.type': 'tag' } },
            aggs: {
              tagIds: {
                terms: {
                  field: 'references.id',
                  size: 100, // Default size.
                },
              },
            },
          },
        },
      },
    });
  });

  test('should build tag facet aggregation with custom size', () => {
    const result = buildFacetAggregations({ tags: { size: 50 } }, soType);

    expect(result?.tagFacet.aggs?.tagFilter.aggs?.tagIds.terms?.size).toBe(50);
  });

  test('should build createdBy facet aggregation', () => {
    const result = buildFacetAggregations({ createdBy: {} }, soType);

    expect(result).toEqual({
      createdByFacet: {
        terms: {
          field: 'dashboard.created_by',
          size: 100, // Default size.
        },
      },
    });
  });

  test('should build createdBy facet with custom size', () => {
    const result = buildFacetAggregations({ createdBy: { size: 25 } }, soType);

    expect(result?.createdByFacet.terms?.size).toBe(25);
  });

  test('should build createdBy facet with includeMissing', () => {
    const result = buildFacetAggregations({ createdBy: { includeMissing: true } }, soType);

    expect(result?.createdByFacet.terms?.missing).toBe('__missing__');
  });

  test('should build both tag and createdBy facets together', () => {
    const result = buildFacetAggregations(
      {
        tags: { size: 50 },
        createdBy: { size: 25 },
      },
      soType
    );

    expect(result).toHaveProperty('tagFacet');
    expect(result).toHaveProperty('createdByFacet');
  });
});

describe('parseFacetAggregations', () => {
  test('should return undefined when aggregations is undefined', () => {
    const result = parseFacetAggregations(undefined);
    expect(result).toBeUndefined();
  });

  test('should return undefined when aggregations is null', () => {
    const result = parseFacetAggregations(null);
    expect(result).toBeUndefined();
  });

  test('should return undefined when aggregations is empty object', () => {
    const result = parseFacetAggregations({});
    expect(result).toBeUndefined();
  });

  test('should parse tag facet results from nested aggregation', () => {
    const aggregations = {
      tagFacet: {
        tagFilter: {
          tagIds: {
            buckets: [
              { key: 'tag-1', doc_count: 10 },
              { key: 'tag-2', doc_count: 5 },
            ],
          },
        },
      },
    };

    const result = parseFacetAggregations(aggregations);

    expect(result).toEqual({
      tags: [
        { key: 'tag-1', doc_count: 10 },
        { key: 'tag-2', doc_count: 5 },
      ],
    });
  });

  test('should parse createdBy facet results', () => {
    const aggregations = {
      createdByFacet: {
        buckets: [
          { key: 'user-a', doc_count: 15 },
          { key: 'user-b', doc_count: 8 },
        ],
      },
    };

    const result = parseFacetAggregations(aggregations);

    expect(result).toEqual({
      createdBy: [
        { key: 'user-a', doc_count: 15 },
        { key: 'user-b', doc_count: 8 },
      ],
    });
  });

  test('should parse both tag and createdBy facets together', () => {
    const aggregations = {
      tagFacet: {
        tagFilter: {
          tagIds: {
            buckets: [{ key: 'tag-1', doc_count: 10 }],
          },
        },
      },
      createdByFacet: {
        buckets: [{ key: 'user-a', doc_count: 15 }],
      },
    };

    const result = parseFacetAggregations(aggregations);

    expect(result).toEqual({
      tags: [{ key: 'tag-1', doc_count: 10 }],
      createdBy: [{ key: 'user-a', doc_count: 15 }],
    });
  });

  test('should handle empty buckets', () => {
    const aggregations = {
      tagFacet: {
        tagFilter: {
          tagIds: {
            buckets: [],
          },
        },
      },
    };

    const result = parseFacetAggregations(aggregations);

    expect(result).toEqual({
      tags: [],
    });
  });
});

describe('searchArgsToSOFindOptionsDefault facets', () => {
  test('should include aggs when facets.tags is requested', () => {
    const result = searchArgsToSOFindOptionsDefault({
      contentTypeId: 'dashboard',
      query: {
        facets: { tags: {} },
      },
    });

    expect(result.aggs).toBeDefined();
    expect(result.aggs).toHaveProperty('tagFacet');
  });

  test('should include aggs when facets.createdBy is requested', () => {
    const result = searchArgsToSOFindOptionsDefault({
      contentTypeId: 'dashboard',
      query: {
        facets: { createdBy: {} },
      },
    });

    expect(result.aggs).toBeDefined();
    expect(result.aggs).toHaveProperty('createdByFacet');
  });

  test('should not include aggs when facets is not requested', () => {
    const result = searchArgsToSOFindOptionsDefault({
      contentTypeId: 'dashboard',
      query: {},
    });

    expect(result.aggs).toBeUndefined();
  });

  test('should include both facet aggs when both are requested', () => {
    const result = searchArgsToSOFindOptionsDefault({
      contentTypeId: 'dashboard',
      query: {
        facets: {
          tags: { size: 50 },
          createdBy: { size: 25 },
        },
      },
    });

    expect(result.aggs).toHaveProperty('tagFacet');
    expect(result.aggs).toHaveProperty('createdByFacet');
  });
});
