/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getIndexForTypeMock } from './unknown_object_types.test.mocks';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { deleteUnknownTypeObjects, getUnknownTypesDeprecations } from './unknown_object_types';
import { typeRegistryMock } from '../saved_objects_type_registry.mock';
import { elasticsearchClientMock } from '../../elasticsearch/client/mocks';
import { SavedObjectsType } from '../..';

const createSearchResponse = (count: number): estypes.SearchResponse => {
  return {
    hits: {
      total: count,
      max_score: 0,
      hits: new Array(count).fill({}),
    },
  } as estypes.SearchResponse;
};

describe('unknown saved object types deprecation', () => {
  const kibanaVersion = '8.0.0';

  let typeRegistry: ReturnType<typeof typeRegistryMock.create>;
  let esClient: ReturnType<typeof elasticsearchClientMock.createScopedClusterClient>;
  const kibanaIndex = '.kibana';

  beforeEach(() => {
    typeRegistry = typeRegistryMock.create();
    esClient = elasticsearchClientMock.createScopedClusterClient();

    typeRegistry.getAllTypes.mockReturnValue([
      { name: 'foo' },
      { name: 'bar' },
    ] as SavedObjectsType[]);
    getIndexForTypeMock.mockImplementation(({ type }: { type: string }) => `${type}-index`);
  });

  afterEach(() => {
    getIndexForTypeMock.mockReset();
  });

  describe('getUnknownTypesDeprecations', () => {
    beforeEach(() => {
      esClient.asInternalUser.search.mockResponse(createSearchResponse(0));
    });

    it('calls `esClient.asInternalUser.search` with the correct parameters', async () => {
      await getUnknownTypesDeprecations({
        esClient,
        typeRegistry,
        kibanaIndex,
        kibanaVersion,
      });

      expect(esClient.asInternalUser.search).toHaveBeenCalledTimes(1);
      expect(esClient.asInternalUser.search).toHaveBeenCalledWith({
        index: ['foo-index', 'bar-index'],
        body: {
          size: 10000,
          query: {
            bool: {
              must_not: [{ term: { type: 'foo' } }, { term: { type: 'bar' } }],
            },
          },
        },
      });
    });

    it('returns no deprecation if no unknown type docs are found', async () => {
      esClient.asInternalUser.search.mockResponse(createSearchResponse(0));

      const deprecations = await getUnknownTypesDeprecations({
        esClient,
        typeRegistry,
        kibanaIndex,
        kibanaVersion,
      });

      expect(deprecations.length).toEqual(0);
    });

    it('returns a deprecation if any unknown type docs are found', async () => {
      esClient.asInternalUser.search.mockResponse(createSearchResponse(1));

      const deprecations = await getUnknownTypesDeprecations({
        esClient,
        typeRegistry,
        kibanaIndex,
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
  });

  describe('deleteUnknownTypeObjects', () => {
    it('calls `esClient.asInternalUser.search` with the correct parameters', async () => {
      await deleteUnknownTypeObjects({
        esClient,
        typeRegistry,
        kibanaIndex,
        kibanaVersion,
      });

      expect(esClient.asInternalUser.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(esClient.asInternalUser.deleteByQuery).toHaveBeenCalledWith({
        index: ['foo-index', 'bar-index'],
        wait_for_completion: false,
        body: {
          query: {
            bool: {
              must_not: [{ term: { type: 'foo' } }, { term: { type: 'bar' } }],
            },
          },
        },
      });
    });
  });
});
