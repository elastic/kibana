/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@elastic/elasticsearch';
import type { IndicesGetMappingResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { IndexTypesMap } from '@kbn/core-saved-objects-base-server-internal';
import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { loggerMock } from '@kbn/logging-mocks';
import { DEFAULT_INDEX_TYPES_MAP } from './kibana_migrator_constants';
import {
  calculateTypeStatuses,
  createMultiPromiseDefer,
  getCurrentIndexTypesMap,
  getIndicesInvolvedInRelocation,
  indexMapToIndexTypesMap,
} from './kibana_migrator_utils';
import { INDEX_MAP_BEFORE_SPLIT } from './kibana_migrator_utils.fixtures';

describe('createMultiPromiseDefer', () => {
  it('creates defer objects with the same Promise', () => {
    const defers = createMultiPromiseDefer(['.kibana', '.kibana_cases']);
    expect(Object.keys(defers)).toHaveLength(2);
    expect(defers['.kibana'].promise).toEqual(defers['.kibana_cases'].promise);
    expect(defers['.kibana'].resolve).not.toEqual(defers['.kibana_cases'].resolve);
    expect(defers['.kibana'].reject).not.toEqual(defers['.kibana_cases'].reject);
  });

  it('the common Promise resolves when all defers resolve', async () => {
    const defers = createMultiPromiseDefer(['.kibana', '.kibana_cases']);
    let resolved = 0;
    Object.values(defers).forEach((defer) => defer.promise.then(() => ++resolved));
    defers['.kibana'].resolve();
    await new Promise((resolve) => setImmediate(resolve)); // next tick
    expect(resolved).toEqual(0);
    defers['.kibana_cases'].resolve();
    await new Promise((resolve) => setImmediate(resolve)); // next tick
    expect(resolved).toEqual(2);
  });
});

describe('getCurrentIndexTypesMap', () => {
  const defaultIndexTypesMap: IndexTypesMap = {
    '.my_index': ['type1', 'type2', 'type3'],
    '.task_index': ['type4'],
  };

  describe('when mainIndex does NOT exist', () => {
    it('assumes we are targeting a fresh ES cluster', async () => {
      const notFoundError = new errors.ResponseError(
        elasticsearchClientMock.createApiResponse({
          statusCode: 404,
          body: { ok: false, message: 'Unknown resource.' },
        })
      );
      const client = elasticsearchClientMock.createInternalClient(
        elasticsearchClientMock.createErrorTransportRequestPromise(notFoundError)
      );

      const currentIndexTypesMap = await getCurrentIndexTypesMap({
        client,
        mainIndex: '.my_index',
        defaultIndexTypesMap: {},
        logger: loggerMock.create(),
      });

      expect(currentIndexTypesMap).toBeUndefined();
    });
  });

  describe('when mainIndex exists, but it does not have an indexTypesMap in its mapping._meta', () => {
    it('returns the defaultIndexTypesMap', async () => {
      const getMappingResponse: IndicesGetMappingResponse = {
        '.my_index_8.8.0_001': {
          mappings: {
            _meta: {
              migrationMappingPropertyHashes: {
                application_usage_daily: '43b8830d5d0df85a6823d290885fc9fd',
                application_usage_totals: '3d1b76c39bfb2cc8296b024d73854724',
                application_usage_transactional: '3d1b76c39bfb2cc8296b024d73854724',
              },
            },
          },
        },
      };

      const client = elasticsearchClientMock.createInternalClient();
      client.indices.getMapping.mockResolvedValueOnce(getMappingResponse);

      const currentIndexTypesMap = await getCurrentIndexTypesMap({
        client,
        mainIndex: '.my_index',
        defaultIndexTypesMap,
        logger: loggerMock.create(),
      });

      expect(currentIndexTypesMap).toEqual(defaultIndexTypesMap);
    });
  });

  describe('when mainIndex exists and it does have an indexTypesMap property in its mapping._meta', () => {
    it('returns the stored indexTypesMap', async () => {
      const storedIndexTypesMap: IndexTypesMap = {
        '.my_index': ['type1', 'type2'],
        '.task_index': ['type4'],
        '.other_index': ['type3'],
      };
      const getMappingResponse: IndicesGetMappingResponse = {
        '.my_index_8.8.0_001': {
          mappings: {
            _meta: {
              migrationMappingPropertyHashes: {
                application_usage_daily: '43b8830d5d0df85a6823d290885fc9fd',
                application_usage_totals: '3d1b76c39bfb2cc8296b024d73854724',
                application_usage_transactional: '3d1b76c39bfb2cc8296b024d73854724',
              },
              indexTypesMap: storedIndexTypesMap,
            },
          },
        },
      };

      const client = elasticsearchClientMock.createInternalClient();
      client.indices.getMapping.mockResolvedValueOnce(getMappingResponse);

      const currentIndexTypesMap = await getCurrentIndexTypesMap({
        client,
        mainIndex: '.my_index',
        defaultIndexTypesMap,
        logger: loggerMock.create(),
      });

      expect(currentIndexTypesMap).toEqual(storedIndexTypesMap);
    });
  });

  describe('when retriable errors occur', () => {
    it('keeps trying to fetch the index mappings forever', async () => {
      const unavailable = new errors.ResponseError(
        elasticsearchClientMock.createApiResponse({
          statusCode: 503,
          headers: { 'Retry-After': '30' },
          body: 'Kibana server is not ready yet',
        })
      );

      const notFound = new errors.ResponseError(
        elasticsearchClientMock.createApiResponse({
          statusCode: 404,
          body: { ok: false, message: 'Unknown resource.' },
        })
      );

      const client = elasticsearchClientMock.createInternalClient();
      client.indices.getMapping.mockRejectedValueOnce(unavailable);
      client.indices.getMapping.mockRejectedValueOnce(unavailable);
      client.indices.getMapping.mockRejectedValueOnce(unavailable);
      client.indices.getMapping.mockRejectedValueOnce(unavailable);
      client.indices.getMapping.mockRejectedValueOnce(unavailable);
      client.indices.getMapping.mockRejectedValueOnce(unavailable);
      client.indices.getMapping.mockRejectedValueOnce(unavailable);
      client.indices.getMapping.mockRejectedValueOnce(unavailable);
      client.indices.getMapping.mockRejectedValueOnce(unavailable);
      client.indices.getMapping.mockRejectedValueOnce(notFound);

      await getCurrentIndexTypesMap({
        client,
        mainIndex: '.my_index',
        defaultIndexTypesMap,
        logger: loggerMock.create(),
        retryDelay: 1,
      });

      expect(client.indices.getMapping).toHaveBeenCalledTimes(10);
    });
  });
});

describe('getIndicesInvolvedInRelocation', () => {
  const getIndicesInvolvedInRelocationParams = () => {
    const client = elasticsearchClientMock.createElasticsearchClient();
    (client as any).child = jest.fn().mockImplementation(() => client);

    return {
      client,
      mainIndex: MAIN_SAVED_OBJECT_INDEX,
      indexTypesMap: {},
      defaultIndexTypesMap: DEFAULT_INDEX_TYPES_MAP,
      logger: loggerMock.create(),
    };
  };

  it('tries to get the indexTypesMap from the mainIndex', async () => {
    const params = getIndicesInvolvedInRelocationParams();
    try {
      await getIndicesInvolvedInRelocation(params);
    } catch (err) {
      // ignore
    }

    expect(params.client.indices.getMapping).toHaveBeenCalledTimes(1);
    expect(params.client.indices.getMapping).toHaveBeenCalledWith({
      index: MAIN_SAVED_OBJECT_INDEX,
    });
  });

  it('fails if the query to get indexTypesMap fails with critical error', async () => {
    const params = getIndicesInvolvedInRelocationParams();
    params.client.indices.getMapping.mockImplementation(() =>
      elasticsearchClientMock.createErrorTransportRequestPromise(
        new errors.ResponseError({
          statusCode: 500,
          body: {
            error: {
              type: 'error_type',
              reason: 'error_reason',
            },
          },
          warnings: [],
          headers: {},
          meta: {} as any,
        })
      )
    );
    expect(getIndicesInvolvedInRelocation(params)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error_type"`
    );
  });

  it('assumes fresh deployment if the mainIndex does not exist, returns an empty list of moving types', async () => {
    const params = getIndicesInvolvedInRelocationParams();
    params.client.indices.getMapping.mockImplementation(() =>
      elasticsearchClientMock.createErrorTransportRequestPromise(
        new errors.ResponseError({
          statusCode: 404,
          body: {
            error: {
              type: 'error_type',
              reason: 'error_reason',
            },
          },
          warnings: [],
          headers: {},
          meta: {} as any,
        })
      )
    );
    expect(getIndicesInvolvedInRelocation(params)).resolves.toEqual([]);
  });

  describe('if mainIndex exists', () => {
    describe('but it does not have an indexTypeMap stored', () => {
      it('uses the defaultIndexTypeMap and finds out which indices are involved in a relocation', async () => {
        const params = getIndicesInvolvedInRelocationParams();
        params.client.indices.getMapping.mockReturnValue(
          Promise.resolve({
            '.kibana_8.7.0_001': {
              mappings: {
                dynamic: 'strict',
                _meta: {
                  migrationMappingPropertyHashes: {
                    someType: '7997cf5a56cc02bdc9c93361bde732b0',
                  },
                },
                properties: {
                  someProperty: {},
                },
              },
            },
          })
        );
        params.defaultIndexTypesMap = {
          '.indexA': ['type1', 'type2', 'type3'],
          '.indexB': ['type4', 'type5', 'type6'],
        };

        params.indexTypesMap = {
          '.indexA': ['type1'], // move type2 and type 3 over to new indexC
          '.indexB': ['type4', 'type5', 'type6'], // stays the same
          '.indexC': ['type2', 'type3'],
        };

        expect(getIndicesInvolvedInRelocation(params)).resolves.toEqual(['.indexA', '.indexC']);
      });
    });

    describe('and it has an indexTypeMap stored', () => {
      it('compares stored indexTypeMap against desired one, and finds out which indices are involved in a relocation', async () => {
        const params = getIndicesInvolvedInRelocationParams();
        params.client.indices.getMapping.mockReturnValue(
          Promise.resolve({
            '.kibana_8.8.0_001': {
              mappings: {
                dynamic: 'strict',
                _meta: {
                  migrationMappingPropertyHashes: {
                    someType: '7997cf5a56cc02bdc9c93361bde732b0',
                  },
                  // map stored on index
                  indexTypesMap: {
                    '.indexA': ['type1'],
                    '.indexB': ['type4', 'type5', 'type6'],
                    '.indexC': ['type2', 'type3'],
                  },
                },
                properties: {
                  someProperty: {},
                },
              },
            },
          })
        );

        // exists on index, so this one will NOT be taken into account
        params.defaultIndexTypesMap = {
          '.indexA': ['type1', 'type2', 'type3'],
          '.indexB': ['type4', 'type5', 'type6'],
        };

        params.indexTypesMap = {
          '.indexA': ['type1'],
          '.indexB': ['type4'],
          '.indexC': ['type2', 'type3'],
          '.indexD': ['type5', 'type6'],
        };

        expect(getIndicesInvolvedInRelocation(params)).resolves.toEqual(['.indexB', '.indexD']);
      });
    });
  });
});

describe('indexMapToIndexTypesMap', () => {
  it('converts IndexMap to IndexTypesMap', () => {
    expect(indexMapToIndexTypesMap(INDEX_MAP_BEFORE_SPLIT)).toEqual(DEFAULT_INDEX_TYPES_MAP);
  });
});

describe('calculateTypeStatuses', () => {
  it('takes two indexTypesMaps and checks what types have been added, removed and relocated', () => {
    const currentIndexTypesMap = {
      '.indexA': ['type1', 'type2', 'type3'],
      '.indexB': ['type4', 'type5', 'type6'],
    };
    const desiredIndexTypesMap = {
      '.indexA': ['type2'],
      '.indexB': ['type3', 'type5'],
      '.indexC': ['type4', 'type6', 'type7'],
      '.indexD': ['type8'],
    };

    expect(calculateTypeStatuses(currentIndexTypesMap, desiredIndexTypesMap)).toEqual({
      type1: {
        currentIndex: '.indexA',
        status: 'removed',
      },
      type2: {
        currentIndex: '.indexA',
        status: 'untouched',
        targetIndex: '.indexA',
      },
      type3: {
        currentIndex: '.indexA',
        status: 'moved',
        targetIndex: '.indexB',
      },
      type4: {
        currentIndex: '.indexB',
        status: 'moved',
        targetIndex: '.indexC',
      },
      type5: {
        currentIndex: '.indexB',
        status: 'untouched',
        targetIndex: '.indexB',
      },
      type6: {
        currentIndex: '.indexB',
        status: 'moved',
        targetIndex: '.indexC',
      },
      type7: {
        status: 'added',
        targetIndex: '.indexC',
      },
      type8: {
        status: 'added',
        targetIndex: '.indexD',
      },
    });
  });
});
