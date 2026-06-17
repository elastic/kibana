/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './unknown_object_types.test.mocks';

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { deleteUnknownTypeObjects, getUnknownTypesDeprecations } from './unknown_object_types';
import { typeRegistryMock } from '@kbn/core-saved-objects-base-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { type SavedObjectsType, ALL_SAVED_OBJECT_INDICES } from '@kbn/core-saved-objects-server';

const createAggregateTypesSearchResponse = (
  typesIds: Record<string, string[]> = {}
): SearchResponse => {
  return {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: Object.keys(typesIds).length,
        relation: 'eq',
      },
      max_score: null,
      hits: [],
    },
    aggregations: {
      typesAggregation: {
        buckets: Object.entries(typesIds).map(([type, ids]) => ({
          key: type,
          docs: { hits: { hits: ids.map((_id) => ({ _id })) } },
        })),
      },
    },
  };
};

describe('unknown saved object types deprecation', () => {
  const kibanaVersion = '8.0.0';
  const expectedTargetIndices = ALL_SAVED_OBJECT_INDICES.map(
    (index) => `${index}_${kibanaVersion}`
  );

  let typeRegistry: ReturnType<typeof typeRegistryMock.create>;
  let esClient: ReturnType<typeof elasticsearchClientMock.createScopedClusterClient>;

  beforeEach(() => {
    typeRegistry = typeRegistryMock.create();
    esClient = elasticsearchClientMock.createScopedClusterClient();

    typeRegistry.getAllTypes.mockReturnValue([
      { name: 'foo' },
      { name: 'bar' },
    ] as SavedObjectsType[]);
  });

  describe('getUnknownTypesDeprecations', () => {
    beforeEach(() => {
      esClient.asInternalUser.search.mockResponse(createAggregateTypesSearchResponse());
    });

    it('searches all known Kibana SO indices for the current version', async () => {
      await getUnknownTypesDeprecations({
        esClient,
        typeRegistry,
        kibanaVersion,
      });

      expect(esClient.asInternalUser.search).toHaveBeenCalledTimes(1);
      expect(esClient.asInternalUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: expectedTargetIndices,
          ignore_unavailable: true,
        })
      );
    });

    it('excludes all registered types from the search query', async () => {
      await getUnknownTypesDeprecations({
        esClient,
        typeRegistry,
        kibanaVersion,
      });

      expect(esClient.asInternalUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must_not: [{ term: { type: 'foo' } }, { term: { type: 'bar' } }],
            },
          },
        })
      );
    });

    it('returns no deprecation if no unknown type docs are found', async () => {
      esClient.asInternalUser.search.mockResponse(createAggregateTypesSearchResponse());

      const deprecations = await getUnknownTypesDeprecations({
        esClient,
        typeRegistry,
        kibanaVersion,
      });

      expect(deprecations.length).toEqual(0);
    });

    it('returns a deprecation if any unknown type docs are found', async () => {
      esClient.asInternalUser.search.mockResponse(
        createAggregateTypesSearchResponse({
          someType: ['id1', 'id2'],
          anotherType: ['id3'],
          __UNKNOWN__: ['id4'],
        })
      );

      const deprecations = await getUnknownTypesDeprecations({
        esClient,
        typeRegistry,
        kibanaVersion,
      });

      expect(deprecations.length).toEqual(1);
      expect(deprecations[0]).toEqual({
        title: expect.any(String),
        message: expect.any(String),
        level: 'critical',
        requireRestart: false,
        deprecationType: undefined,
        correctiveActions: {
          manualSteps: expect.any(Array),
          api: {
            path: '/internal/saved_objects/deprecations/_delete_unknown_types',
            method: 'POST',
            body: {},
          },
        },
      });
    });

    it('detects unknown types even when no types are registered (all plugins disabled)', async () => {
      typeRegistry.getAllTypes.mockReturnValue([]);

      esClient.asInternalUser.search.mockResponse(
        createAggregateTypesSearchResponse({
          'cloud-security-posture-settings': ['id1'],
        })
      );

      const deprecations = await getUnknownTypesDeprecations({
        esClient,
        typeRegistry,
        kibanaVersion,
      });

      // ALL_SAVED_OBJECT_INDICES ensures the index is still scanned even without registered
      // types; documents from disabled plugins are detected.
      expect(deprecations.length).toEqual(1);
    });
  });

  describe('deleteUnknownTypeObjects', () => {
    it('deletes from all known Kibana SO indices for the current version', async () => {
      await deleteUnknownTypeObjects({
        esClient,
        typeRegistry,
        kibanaVersion,
      });

      expect(esClient.asInternalUser.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(esClient.asInternalUser.deleteByQuery).toHaveBeenCalledWith({
        index: expectedTargetIndices,
        wait_for_completion: false,
        ignore_unavailable: true,
        query: {
          bool: {
            must_not: [{ term: { type: 'foo' } }, { term: { type: 'bar' } }],
          },
        },
      });
    });
  });
});
