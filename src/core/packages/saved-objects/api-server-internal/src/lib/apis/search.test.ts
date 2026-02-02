/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { set } from '@kbn/safer-lodash-set';
import Boom from '@hapi/boom';
import type { SavedObjectsSearchOptions } from '@kbn/core-saved-objects-api-server';
import type {
  SavedObjectsExtensions,
  ISavedObjectsSpacesExtension,
  ISavedObjectsSecurityExtension,
  AuthorizationTypeMap,
} from '@kbn/core-saved-objects-server';
import type { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { SavedObjectsRepository } from '../repository';
import { kibanaMigratorMock, savedObjectsExtensionsMock } from '../../mocks';
import {
  HIDDEN_TYPE,
  mappings,
  createRegistry,
  createDocumentMigrator,
  createSpySerializer,
  generateIndexPatternSearchResults,
  CUSTOM_INDEX_TYPE,
  MULTI_NAMESPACE_CUSTOM_INDEX_TYPE,
} from '../../test_helpers/repository.test.common';
import { mergeUserQueryWithNamespacesBool } from './search';
import type { NamespacesBoolFilter } from '../search/search_dsl/query_params';
import type { estypes } from '@elastic/elasticsearch';

const EMPTY_SEARCH_RESPONSE = {
  hits: { hits: [] },
  took: 0,
  timed_out: false,
  _shards: { total: 0, successful: 0, failed: 0 },
};
const UNKNOWN_TYPE = 'unknownType';

describe('search', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repository: SavedObjectsRepository;
  let migrator: ReturnType<typeof kibanaMigratorMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let serializer: jest.Mocked<SavedObjectsSerializer>;
  let extensions: SavedObjectsExtensions;
  let options: SavedObjectsSearchOptions;

  const registry = createRegistry();
  const documentMigrator = createDocumentMigrator(registry);

  beforeEach(() => {
    client = elasticsearchClientMock.createElasticsearchClient();
    migrator = kibanaMigratorMock.create();
    documentMigrator.prepareMigrations();
    migrator.migrateDocument = jest.fn().mockImplementation(documentMigrator.migrate);
    migrator.runMigrations = jest.fn().mockResolvedValue([{ status: 'skipped' }]);
    logger = loggerMock.create();
    extensions = {};
    options = { type: 'index-pattern', namespaces: ['foo-namespace'] };

    // create a mock serializer "shim" so we can track function calls, but use the real serializer's implementation
    serializer = createSpySerializer(registry);

    const allTypes = registry.getAllTypes().map((type) => type.name);
    const allowedTypes = [...new Set(allTypes.filter((type) => !registry.isHidden(type)))];

    // @ts-expect-error must use the private constructor to use the mocked serializer
    repository = new SavedObjectsRepository({
      index: '.kibana-test',
      mappings,
      client,
      migrator,
      typeRegistry: registry,
      serializer,
      allowedTypes,
      logger,
      extensions,
    });

    client.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(EMPTY_SEARCH_RESPONSE)
    );
  });

  it('should throw if options.namespaces is an empty array', async () => {
    await expect(repository.search({ ...options, namespaces: [] })).rejects.toThrowError(
      'options.namespaces cannot be an empty array'
    );
    expect(client.search).not.toHaveBeenCalled();
  });

  it('should throw if options.type is empty', async () => {
    await expect(repository.search({ ...options, type: [] })).rejects.toThrowError(
      'options.type must be a string or an array of strings'
    );
    await expect(repository.search({ ...options, type: '' })).rejects.toThrowError(
      'options.type must be a string or an array of strings'
    );
    expect(client.search).not.toHaveBeenCalled();
  });

  it.each([HIDDEN_TYPE, UNKNOWN_TYPE, [HIDDEN_TYPE, UNKNOWN_TYPE]])(
    'should return an empty response if no types are allowed',
    async (type) => {
      await expect(repository.search({ ...options, type })).resolves.toEqual(EMPTY_SEARCH_RESPONSE);
      expect(client.search).not.toHaveBeenCalled();
    }
  );

  it('should return an empty response if the search returns 404', async () => {
    client.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        { ...EMPTY_SEARCH_RESPONSE, took: 10 },
        { statusCode: 404 }
      )
    );

    await expect(repository.search(options)).resolves.toEqual(EMPTY_SEARCH_RESPONSE);
  });

  it('should filter out invalid and hidden types', async () => {
    await repository.search({
      ...options,
      type: ['config', 'unknownType', HIDDEN_TYPE, 'index-pattern'],
    });

    expect(client.search).toHaveBeenCalledTimes(1);
    const [[searchRequest]] = client.search.mock.calls;
    expect(searchRequest?.query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "must": Array [
            Object {
              "bool": Object {
                "minimum_should_match": 1,
                "should": Array [
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "must": Array [
                        Object {
                          "term": Object {
                            "type": "config",
                          },
                        },
                      ],
                      "must_not": Array [
                        Object {
                          "exists": Object {
                            "field": "namespaces",
                          },
                        },
                      ],
                      "should": Array [
                        Object {
                          "terms": Object {
                            "namespace": Array [
                              "foo-namespace",
                            ],
                          },
                        },
                      ],
                    },
                  },
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "must": Array [
                        Object {
                          "term": Object {
                            "type": "index-pattern",
                          },
                        },
                      ],
                      "must_not": Array [
                        Object {
                          "exists": Object {
                            "field": "namespaces",
                          },
                        },
                      ],
                      "should": Array [
                        Object {
                          "terms": Object {
                            "namespace": Array [
                              "foo-namespace",
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      }
    `);
  });

  it('should set the search index', async () => {
    await expect(repository.search(options)).resolves.toEqual(EMPTY_SEARCH_RESPONSE);
    expect(client.search).toHaveBeenCalledTimes(1);
    const [[request]] = client.search.mock.calls;
    expect(request).toHaveProperty('index', ['.kibana-test_8.0.0-testing']);
  });

  it('should accept pit', async () => {
    const pit = { id: 'abc123', keepAlive: '2m' };
    await expect(repository.search({ ...options, pit })).resolves.toEqual(EMPTY_SEARCH_RESPONSE);
    expect(client.search).toHaveBeenCalledTimes(1);
    const [[request]] = client.search.mock.calls;
    expect(request?.index).toBeUndefined();
    expect(request).toHaveProperty('pit', pit);
  });

  it('should return hits untouched if those are not saved objects', async () => {
    serializer.isRawSavedObject.mockReturnValue(false);
    const results = generateIndexPatternSearchResults();
    client.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(results)
    );

    await expect(repository.search(options)).resolves.toEqual(results);
  });

  it('should not migrate saved objects if specific fields are requested', async () => {
    serializer.isRawSavedObject.mockReturnValue(true);
    const results = generateIndexPatternSearchResults();
    client.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(results)
    );

    await expect(repository.search({ ...options, fields: ['title'] })).resolves.toEqual(results);
    expect(migrator.migrateDocument).not.toHaveBeenCalled();
  });

  it('should return migrated documents', async () => {
    serializer.isRawSavedObject.mockReturnValue(true);
    const results = generateIndexPatternSearchResults();
    client.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(results)
    );
    migrator.migrateDocument.mockImplementationOnce((doc) =>
      set({ ...doc }, 'attributes.migrated', true)
    );

    await expect(repository.search(options)).resolves.toHaveProperty(
      'hits.hits.0._source.index-pattern.migrated',
      true
    );
    expect(migrator.migrateDocument).toHaveBeenCalledTimes(results.hits.hits.length);
  });

  describe('with spaces extension', () => {
    let spacesExtension!: jest.Mocked<ISavedObjectsSpacesExtension>;

    beforeEach(() => {
      spacesExtension = savedObjectsExtensionsMock.createSpacesExtension();
      extensions.spacesExtension = spacesExtension;
    });

    it('should throw an error if failed to get searchable namespaces', async () => {
      const someError = new Error();
      spacesExtension.getSearchableNamespaces.mockRejectedValue(someError);

      await expect(repository.search(options)).rejects.toBe(someError);
      expect(client.search).not.toHaveBeenCalled();
    });

    it('should return an empty response if forbidden to access searchable namespaces', async () => {
      spacesExtension.getSearchableNamespaces.mockRejectedValue(Boom.forbidden());

      await expect(repository.search(options)).resolves.toEqual(EMPTY_SEARCH_RESPONSE);
      expect(client.search).not.toHaveBeenCalled();
    });

    it('should return an empty response if there are no searchable namespaces', async () => {
      spacesExtension.getSearchableNamespaces.mockResolvedValue([]);

      await expect(repository.search(options)).resolves.toEqual(EMPTY_SEARCH_RESPONSE);
      expect(spacesExtension.getSearchableNamespaces).toHaveBeenCalledWith(options.namespaces);
      expect(client.search).not.toHaveBeenCalled();
    });

    it('should use the returned namespaces to perform search', async () => {
      spacesExtension.getSearchableNamespaces.mockResolvedValue(['searchable']);

      await expect(repository.search(options)).resolves.toEqual(EMPTY_SEARCH_RESPONSE);
      expect(client.search).toHaveBeenCalledTimes(1);
      const [[searchRequest]] = client.search.mock.calls;
      expect(searchRequest).toHaveProperty(
        'query.bool.must.0.bool.should.0.bool.should.0.terms.namespace',
        ['searchable']
      );
    });
  });

  describe('with security extension', () => {
    let securityExtension: jest.Mocked<ISavedObjectsSecurityExtension>;

    beforeEach(() => {
      securityExtension = savedObjectsExtensionsMock.createSecurityExtension();
      extensions.securityExtension = securityExtension;
    });

    it('should return an empty response if unauthorized to access anything requested', async () => {
      securityExtension.authorizeFind.mockResolvedValue({
        status: 'unauthorized',
        typeMap: new Map(),
      });

      await expect(repository.search(options)).resolves.toEqual(EMPTY_SEARCH_RESPONSE);
      expect(client.search).not.toHaveBeenCalled();
    });

    it('should map types per namespaces when partially authorized', async () => {
      securityExtension.authorizeFind.mockResolvedValue({
        status: 'partially_authorized',
        typeMap: new Map([
          ['index-pattern', { find: { authorizedSpaces: ['foo-namespace'] } }],
          ['dashboard', { find: { isGloballyAuthorized: true } }],
          [CUSTOM_INDEX_TYPE, { find: { authorizedSpaces: ['bar-namespace'] } }],
          [MULTI_NAMESPACE_CUSTOM_INDEX_TYPE, {}],
        ]) as AuthorizationTypeMap<'find'>,
      });

      await expect(
        repository.search({
          ...options,
          type: [
            'index-pattern',
            'dashboard',
            CUSTOM_INDEX_TYPE,
            MULTI_NAMESPACE_CUSTOM_INDEX_TYPE,
          ],
          namespaces: ['foo-namespace', 'bar-namespace'],
        })
      ).resolves.toEqual(EMPTY_SEARCH_RESPONSE);
      expect(client.search).toHaveBeenCalledTimes(1);
      const [[searchRequest]] = client.search.mock.calls;
      expect(searchRequest?.query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "must": Array [
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "bool": Object {
                        "minimum_should_match": 1,
                        "must": Array [
                          Object {
                            "term": Object {
                              "type": "index-pattern",
                            },
                          },
                        ],
                        "must_not": Array [
                          Object {
                            "exists": Object {
                              "field": "namespaces",
                            },
                          },
                        ],
                        "should": Array [
                          Object {
                            "terms": Object {
                              "namespace": Array [
                                "foo-namespace",
                              ],
                            },
                          },
                        ],
                      },
                    },
                    Object {
                      "bool": Object {
                        "minimum_should_match": 1,
                        "must": Array [
                          Object {
                            "term": Object {
                              "type": "dashboard",
                            },
                          },
                        ],
                        "must_not": Array [
                          Object {
                            "exists": Object {
                              "field": "namespaces",
                            },
                          },
                        ],
                        "should": Array [
                          Object {
                            "terms": Object {
                              "namespace": Array [
                                "foo-namespace",
                                "bar-namespace",
                              ],
                            },
                          },
                        ],
                      },
                    },
                    Object {
                      "bool": Object {
                        "minimum_should_match": 1,
                        "must": Array [
                          Object {
                            "term": Object {
                              "type": "customIndex",
                            },
                          },
                        ],
                        "must_not": Array [
                          Object {
                            "exists": Object {
                              "field": "namespaces",
                            },
                          },
                        ],
                        "should": Array [
                          Object {
                            "terms": Object {
                              "namespace": Array [
                                "bar-namespace",
                              ],
                            },
                          },
                        ],
                      },
                    },
                    Object {
                      "bool": Object {
                        "must": Array [
                          Object {
                            "term": Object {
                              "type": "multiNamespaceTypeCustomIndex",
                            },
                          },
                          Object {
                            "terms": Object {
                              "namespaces": Array [
                                "default",
                                "*",
                              ],
                            },
                          },
                        ],
                        "must_not": Array [
                          Object {
                            "exists": Object {
                              "field": "namespace",
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      `);
    });
  });
});

describe('#mergeUserQueryWithNamespacesBool', () => {
  describe('merges the user query with bool filters as expected', () => {
    it('multi namespace type queries', () => {
      const userQuery: estypes.QueryDslQueryContainer = {
        bool: {
          filter: [{ term: { type: 'a' } }],
        },
      };
      // If this type ever breaks ensure that future objects merge as expected
      const multiNamespaceBoolFilter: NamespacesBoolFilter = {
        bool: {
          should: [
            {
              bool: {
                must: [
                  { term: { type: 'b' } },
                  { terms: { namespaces: ['namespaceA', 'namespaceB'] } },
                ],
                must_not: [{ exists: { field: 'namespace' } }],
              },
            },
          ],
          minimum_should_match: 1,
        },
      };
      const result = mergeUserQueryWithNamespacesBool(userQuery, multiNamespaceBoolFilter);
      expect(result).toEqual({
        bool: {
          must: [multiNamespaceBoolFilter, userQuery],
        },
      });
    });

    it('single namespace type queries', () => {
      const userQuery: estypes.QueryDslQueryContainer = {
        bool: {
          filter: [{ term: { type: 'a' } }],
        },
      };
      // If the type ever breaks ensure that future objects merge as expected
      const singleNamespaceBoolFilter: NamespacesBoolFilter = {
        bool: {
          // This MUST be an array
          should: [
            {
              bool: {
                must: [{ term: { type: 'test' } }],
                should: [
                  { terms: { namespace: ['eligibleNamespace'] } },
                  { bool: { must_not: [{ exists: { field: 'namespace' } }] } },
                ],
                must_not: [{ exists: { field: 'namespaces' } }],
              },
            },
          ],
          minimum_should_match: 1,
        },
      };
      const result = mergeUserQueryWithNamespacesBool(userQuery, singleNamespaceBoolFilter);
      expect(result).toEqual({
        bool: {
          must: [singleNamespaceBoolFilter, userQuery],
        },
      });
    });

    it('agnostic namespace type queries', () => {
      const userQuery: estypes.QueryDslQueryContainer = {
        bool: {
          filter: [{ term: { type: 'a' } }],
        },
      };
      // If the type ever breaks ensure that future objects merge as expected
      const agnosticNamespaceBoolFilter: NamespacesBoolFilter = {
        bool: {
          should: [
            {
              bool: {
                must: [{ term: { type: 'a' } }],
                must_not: [{ exists: { field: 'namespace' } }, { exists: { field: 'namespaces' } }],
              },
            },
          ],
          minimum_should_match: 1,
        },
      };
      const result = mergeUserQueryWithNamespacesBool(userQuery, agnosticNamespaceBoolFilter);
      expect(result).toEqual({
        bool: {
          must: [agnosticNamespaceBoolFilter, userQuery],
        },
      });
    });
  });
});
