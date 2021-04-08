/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockRawDocExistsInNamespace } from './collect_multi_namespace_references.test.mock';

import type { DeeplyMockedKeys } from '@kbn/utility-types/target/jest';
import type { ElasticsearchClient } from 'src/core/server/elasticsearch';
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

import { typeRegistryMock } from '../../saved_objects_type_registry.mock';
import { SavedObjectsRawDocSource, SavedObjectsSerializer } from '../../serialization';
import type {
  CollectMultiNamespaceReferencesParamsInternal,
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
} from './collect_multi_namespace_references';
import { collectMultiNamespaceReferences } from './collect_multi_namespace_references';
import { LegacyUrlAlias, LEGACY_URL_ALIAS_TYPE } from '../../object_types';
import { Hit } from '@elastic/elasticsearch/api/types';

const SPACES = ['default', 'another-space'];
const VERSION_PROPS = { _seq_no: 1, _primary_term: 1 };
const PIT_ID = 'pit-id';

const MULTI_NAMESPACE_OBJ_TYPE_1 = 'type-a';
const MULTI_NAMESPACE_OBJ_TYPE_2 = 'type-b';
const NON_MULTI_NAMESPACE_OBJ_TYPE = 'type-c';
const MULTI_NAMESPACE_HIDDEN_OBJ_TYPE = 'type-d';

beforeEach(() => {
  mockRawDocExistsInNamespace.mockReset();
  mockRawDocExistsInNamespace.mockReturnValue(true); // return true by default
});

describe('collectMultiNamespaceReferences', () => {
  let client: DeeplyMockedKeys<ElasticsearchClient>;

  /** Sets up the type registry, saved objects client, etc. and return the full parameters object to be passed to `collectMultiNamespaceReferences` */
  function setup(
    objects: SavedObjectsCollectMultiNamespaceReferencesObject[],
    options: SavedObjectsCollectMultiNamespaceReferencesOptions = {},
    internalOptions: { searchPerPage?: number } = {}
  ): CollectMultiNamespaceReferencesParamsInternal {
    const registry = typeRegistryMock.create();
    registry.isMultiNamespace.mockImplementation(
      (type) =>
        [
          MULTI_NAMESPACE_OBJ_TYPE_1,
          MULTI_NAMESPACE_OBJ_TYPE_2,
          MULTI_NAMESPACE_HIDDEN_OBJ_TYPE,
        ].includes(type) // NON_MULTI_NAMESPACE_TYPE is omitted
    );
    registry.isShareable.mockImplementation(
      (type) => [MULTI_NAMESPACE_OBJ_TYPE_1, MULTI_NAMESPACE_HIDDEN_OBJ_TYPE].includes(type) // MULTI_NAMESPACE_OBJ_TYPE_2 and NON_MULTI_NAMESPACE_TYPE are omitted
    );
    client = elasticsearchClientMock.createElasticsearchClient();

    // mock some default results for PIT and search APIs
    client.openPointInTime.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({ id: PIT_ID })
    );
    client.search.mockReturnValue(
      // @ts-expect-error SearchResponse contains other fields, but they are irrelevant for this test suite
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        hits: { hits: [] },
      })
    );
    client.closePointInTime.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        succeeded: true,
        num_freed: 1,
      })
    );

    const serializer = new SavedObjectsSerializer(registry);
    return {
      registry,
      allowedTypes: [
        MULTI_NAMESPACE_OBJ_TYPE_1,
        MULTI_NAMESPACE_OBJ_TYPE_2,
        NON_MULTI_NAMESPACE_OBJ_TYPE,
      ], // MULTI_NAMESPACE_HIDDEN_TYPE is omitted
      client,
      serializer,
      getIndexForType: (type: string) => `index-for-${type}`,
      objects,
      options,
      ...internalOptions,
    };
  }

  /** Mocks the saved objects client so it returns the expected results */
  function mockMgetResults(
    ...results: Array<{
      found: boolean;
      references?: Array<{ type: string; id: string }>;
    }>
  ) {
    client.mget.mockReturnValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        docs: results.map((x) => {
          const references =
            x.references?.map(({ type, id }) => ({ type, id, name: 'ref-name' })) ?? [];
          return x.found
            ? {
                _id: 'doesnt-matter',
                _index: 'doesnt-matter',
                _source: {
                  namespaces: SPACES,
                  references,
                },
                ...VERSION_PROPS,
                found: true,
              }
            : {
                _id: 'doesnt-matter',
                _index: 'doesnt-matter',
                found: false,
              };
        }),
      })
    );
  }

  /** Asserts that mget is called for the given objects */
  function expectMgetArgs(
    n: number,
    ...objects: SavedObjectsCollectMultiNamespaceReferencesObject[]
  ) {
    const docs = objects.map(({ type, id }) => expect.objectContaining({ _id: `${type}:${id}` }));
    expect(client.mget).toHaveBeenNthCalledWith(n, { body: { docs } }, expect.anything());
  }

  it('returns an empty array if no object args are passed in', async () => {
    const params = setup([]);

    const result = await collectMultiNamespaceReferences(params);
    expect(client.mget).not.toHaveBeenCalled();
    expect(result.objects).toEqual([]);
  });

  it('excludes args that have unsupported types', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
    const obj2 = { type: NON_MULTI_NAMESPACE_OBJ_TYPE, id: 'id-2' };
    const obj3 = { type: MULTI_NAMESPACE_HIDDEN_OBJ_TYPE, id: 'id-3' };
    const params = setup([obj1, obj2, obj3]);
    mockMgetResults({ found: true }); // results for obj1

    const result = await collectMultiNamespaceReferences(params);
    expect(client.mget).toHaveBeenCalledTimes(1);
    expectMgetArgs(1, obj1); // the non-multi-namespace type and the hidden type are excluded
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, inboundReferences: [] },
      // even though they are excluded from the cluster call, obj2 and obj3 are included in the results
      { ...obj2, spaces: [], inboundReferences: [] },
      { ...obj3, spaces: [], inboundReferences: [] },
    ]);
  });

  it('excludes references that have unsupported types', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
    const obj2 = { type: NON_MULTI_NAMESPACE_OBJ_TYPE, id: 'id-2' };
    const obj3 = { type: MULTI_NAMESPACE_HIDDEN_OBJ_TYPE, id: 'id-3' };
    const params = setup([obj1]);
    mockMgetResults({ found: true, references: [obj2, obj3] }); // results for obj1

    const result = await collectMultiNamespaceReferences(params);
    expect(client.mget).toHaveBeenCalledTimes(1);
    expectMgetArgs(1, obj1);
    // obj2 and obj3 are not retrieved in a second cluster call
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, inboundReferences: [] },
      // obj2 and obj3 are excluded from the results
    ]);
  });

  it('handles circular references', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
    const params = setup([obj1]);
    mockMgetResults({ found: true, references: [obj1] }); // results for obj1

    const result = await collectMultiNamespaceReferences(params);
    expect(params.client.mget).toHaveBeenCalledTimes(1);
    expectMgetArgs(1, obj1); // obj1 is retrieved once, and it is not retrieved again in a second cluster call
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, inboundReferences: [{ ...obj1, name: 'ref-name' }] }, // obj1 reflects the inbound reference to itself
    ]);
  });

  it('handles a reference graph more than 20 layers deep (circuit-breaker)', async () => {
    const type = MULTI_NAMESPACE_OBJ_TYPE_1;
    const params = setup([{ type, id: 'id-1' }]);
    for (let i = 1; i < 100; i++) {
      mockMgetResults({ found: true, references: [{ type, id: `id-${i + 1}` }] });
    }

    const result = await collectMultiNamespaceReferences(params);
    expect(params.client.mget).toHaveBeenCalledTimes(20);
    expect(result.objects).toHaveLength(21);
    expect(result.objects).toEqual(
      expect.arrayContaining([
        { type, id: 'id-1', spaces: SPACES, inboundReferences: [] },
        {
          type,
          id: 'id-2',
          spaces: SPACES,
          inboundReferences: [{ type, id: 'id-1', name: 'ref-name' }],
        },
        // this assertion is for `arrayContaining`, no need to define objects 3-19...
        {
          type,
          id: 'id-20',
          spaces: SPACES,
          inboundReferences: [{ type, id: 'id-19', name: 'ref-name' }],
        },
        {
          type,
          id: 'id-21',
          spaces: [], // since we hit the circuit-breaker, we know there is a reference to object 21 but we do not know if it exists
          inboundReferences: [{ type, id: 'id-20', name: 'ref-name' }],
          // we do not include `isMissing: true` because we never attempted to fetch this reference
        },
      ])
    );
  });

  it('handles multiple inbound references', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
    const obj2 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-2' };
    const obj3 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-3' };
    const params = setup([obj1, obj2]);
    mockMgetResults({ found: true, references: [obj3] }, { found: true, references: [obj3] }); // results for obj1 and obj2
    mockMgetResults({ found: true }); // results for obj3

    const result = await collectMultiNamespaceReferences(params);
    expect(params.client.mget).toHaveBeenCalledTimes(2);
    expectMgetArgs(1, obj1, obj2);
    expectMgetArgs(2, obj3); // obj3 is retrieved in a second cluster call
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, inboundReferences: [] },
      { ...obj2, spaces: SPACES, inboundReferences: [] },
      {
        ...obj3,
        spaces: SPACES,
        inboundReferences: [
          // obj3 reflects both inbound references
          { ...obj1, name: 'ref-name' },
          { ...obj2, name: 'ref-name' },
        ],
      },
    ]);
  });

  it('handles transitive references', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
    const obj2 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-2' };
    const obj3 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-3' };
    const params = setup([obj1]);
    mockMgetResults({ found: true, references: [obj2] }); // results for obj1
    mockMgetResults({ found: true, references: [obj3] }); // results for obj2
    mockMgetResults({ found: true }); // results for obj3

    const result = await collectMultiNamespaceReferences(params);
    expect(params.client.mget).toHaveBeenCalledTimes(3);
    expectMgetArgs(1, obj1);
    expectMgetArgs(2, obj2); // obj2 is retrieved in a second cluster call
    expectMgetArgs(3, obj3); // obj3 is retrieved in a third cluster call
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, inboundReferences: [] },
      { ...obj2, spaces: SPACES, inboundReferences: [{ ...obj1, name: 'ref-name' }] }, // obj2 reflects the inbound reference
      { ...obj3, spaces: SPACES, inboundReferences: [{ ...obj2, name: 'ref-name' }] }, // obj3 reflects the inbound reference
    ]);
  });

  it('handles missing objects and missing references', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' }; // found, with missing references to obj4 and obj5
    const obj2 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-2' }; // missing object (found, but doesn't exist in the current space))
    const obj3 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-3' }; // missing object (not found
    const obj4 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-4' }; // missing reference (found but doesn't exist in the current space)
    const obj5 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-5' }; // missing reference (not found)
    const params = setup([obj1, obj2, obj3]);
    mockMgetResults({ found: true, references: [obj4, obj5] }, { found: true }, { found: false }); // results for obj1, obj2, and obj3
    mockMgetResults({ found: true }, { found: false }); // results for obj4 and obj5
    mockRawDocExistsInNamespace.mockReturnValueOnce(true); // for obj1
    mockRawDocExistsInNamespace.mockReturnValueOnce(false); // for obj2
    mockRawDocExistsInNamespace.mockReturnValueOnce(false); // for obj4

    const result = await collectMultiNamespaceReferences(params);
    expect(params.client.mget).toHaveBeenCalledTimes(2);
    expectMgetArgs(1, obj1, obj2, obj3);
    expectMgetArgs(2, obj4, obj5);
    expect(mockRawDocExistsInNamespace).toHaveBeenCalledTimes(3);
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, inboundReferences: [] },
      { ...obj2, spaces: [], inboundReferences: [], isMissing: true },
      { ...obj3, spaces: [], inboundReferences: [], isMissing: true },
      { ...obj4, spaces: [], inboundReferences: [{ ...obj1, name: 'ref-name' }], isMissing: true },
      { ...obj5, spaces: [], inboundReferences: [{ ...obj1, name: 'ref-name' }], isMissing: true },
    ]);
  });

  it('handles the typesToExclude option', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
    const obj2 = { type: MULTI_NAMESPACE_OBJ_TYPE_2, id: 'id-2' };
    const obj3 = { type: MULTI_NAMESPACE_OBJ_TYPE_2, id: 'id-3' };
    const params = setup([obj1, obj2], { typesToExclude: [MULTI_NAMESPACE_OBJ_TYPE_2] });
    mockMgetResults({ found: true, references: [obj3] }); // results for obj1

    const result = await collectMultiNamespaceReferences(params);
    expect(client.mget).toHaveBeenCalledTimes(1);
    expectMgetArgs(1, obj1); // obj2 is excluded
    // obj3 is not retrieved in a second cluster call
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, inboundReferences: [] },
      // even though it is excluded from the cluster call, obj2 is included in the results
      { ...obj2, spaces: [], inboundReferences: [] },
      // obj3 is excluded from the results
    ]);
  });

  it('handles the purpose="updateObjectsSpaces" option', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
    const obj2 = { type: MULTI_NAMESPACE_OBJ_TYPE_2, id: 'id-2' };
    const obj3 = { type: MULTI_NAMESPACE_OBJ_TYPE_2, id: 'id-3' };
    const params = setup([obj1, obj2], { purpose: 'updateObjectsSpaces' });
    mockMgetResults({ found: true, references: [obj3] }); // results for obj1

    const result = await collectMultiNamespaceReferences(params);
    expect(client.mget).toHaveBeenCalledTimes(1);
    expectMgetArgs(1, obj1); // obj2 is excluded
    // obj3 is not retrieved in a second cluster call
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, inboundReferences: [] },
      // even though it is excluded from the cluster call, obj2 is included in the results
      { ...obj2, spaces: [], inboundReferences: [] },
      // obj3 is excluded from the results
    ]);
  });

  describe('legacy URL aliases', () => {
    it('uses the point-in-time API to search for legacy URL aliases', async () => {
      const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
      const obj2 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-2' };
      const obj3 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-3' };
      const params = setup([obj1, obj2], {}, { searchPerPage: 1 });
      mockMgetResults({ found: true, references: [obj3] }, { found: true, references: [] }); // results for obj1 and obj2
      mockMgetResults({ found: true, references: [] }); // results for obj3
      // mock search results for four aliases for obj1, and none for obj2 or obj3
      for (let i = 1; i <= 4; i++) {
        const sourceId = obj1.id;
        const targetType = obj1.type;
        const targetNamespace = `space-${i}`;
        const doc: Hit<SavedObjectsRawDocSource> = {
          _id: `${LEGACY_URL_ALIAS_TYPE}:${targetNamespace}:${targetType}:${sourceId}`,
          _index: 'doesnt-matter',
          _source: {
            type: LEGACY_URL_ALIAS_TYPE,
            [LEGACY_URL_ALIAS_TYPE]: {
              sourceId,
              targetId: 'doesnt-matter',
              targetType,
              targetNamespace,
            } as LegacyUrlAlias,
          },
        };
        client.search.mockReturnValueOnce(
          // @ts-expect-error SearchResponse contains other fields, but they are irrelevant for this test suite
          elasticsearchClientMock.createSuccessTransportRequestPromise({ hits: { hits: [doc] } })
        );
      }

      const result = await collectMultiNamespaceReferences(params);
      expect(client.mget).toHaveBeenCalledTimes(2);
      expectMgetArgs(1, obj1, obj2);
      expectMgetArgs(2, obj3); // obj3 is retrieved in a second cluster call
      expect(client.openPointInTime).toHaveBeenCalledTimes(1);
      expect(client.search).toHaveBeenCalledTimes(5);
      for (let i = 0; i < 5; i++) {
        // It searched for aliases five times (and ended there because the fifth search result had no hits)
        expect(client.search).toHaveBeenNthCalledWith(i + 1, {
          body: {
            from: i,
            pit: { id: 'pit-id', keep_alive: '1m' }, // pit-id is mocked above
            query: {
              bool: {
                minimum_should_match: 1,
                must: [{ term: { type: LEGACY_URL_ALIAS_TYPE } }],
                should: [obj1, obj2, obj3].map(({ type, id }) => ({
                  bool: {
                    must: [
                      { term: { [`${LEGACY_URL_ALIAS_TYPE}.targetType`]: type } },
                      { term: { [`${LEGACY_URL_ALIAS_TYPE}.sourceId`]: id } },
                    ],
                  },
                })),
              },
            },
          },
          size: 1, // because we set searchPerPage to 1 above,
        });
      }
      expect(client.closePointInTime).toHaveBeenCalledTimes(1);
      expect(result.objects).toEqual([
        {
          ...obj1,
          spaces: SPACES,
          inboundReferences: [],
          spacesWithMatchingAliases: ['space-1', 'space-2', 'space-3', 'space-4'],
        },
        { ...obj2, spaces: SPACES, inboundReferences: [] },
        { ...obj3, spaces: SPACES, inboundReferences: [{ ...obj1, name: 'ref-name' }] },
      ]);
    });

    it('does not use the point-in-time API or search if no objects are passed in', async () => {
      const params = setup([]);

      await collectMultiNamespaceReferences(params);
      expect(client.openPointInTime).not.toHaveBeenCalled();
      expect(client.search).not.toHaveBeenCalled();
      expect(client.closePointInTime).not.toHaveBeenCalled();
    });

    it('does not search for objects that have an empty spaces array (the object does not exist, or we are not sure)', async () => {
      const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
      const obj2 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-2' };
      const params = setup([obj1, obj2]);
      mockMgetResults({ found: true }, { found: false }); // results for obj1 and obj2

      await collectMultiNamespaceReferences(params);
      expect(client.openPointInTime).toHaveBeenCalledTimes(1);
      expect(client.search).toHaveBeenCalledTimes(1);
      expect(client.search).toHaveBeenCalledWith({
        body: {
          from: 0,
          pit: { id: 'pit-id', keep_alive: '1m' }, // pit-id is mocked above
          query: {
            bool: expect.objectContaining({
              should: [
                {
                  bool: {
                    must: [
                      { term: { [`${LEGACY_URL_ALIAS_TYPE}.targetType`]: obj1.type } },
                      { term: { [`${LEGACY_URL_ALIAS_TYPE}.sourceId`]: obj1.id } },
                    ],
                  },
                },
              ],
            }),
          },
        },
        size: 1000,
      });
      expect(client.closePointInTime).toHaveBeenCalledTimes(1);
    });

    it('does not search at all if all objects that have an empty spaces array (the object does not exist, or we are not sure)', async () => {
      const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
      const params = setup([obj1]);
      mockMgetResults({ found: false }); // results for obj1

      await collectMultiNamespaceReferences(params);
      expect(client.openPointInTime).not.toHaveBeenCalled();
      expect(client.search).not.toHaveBeenCalled();
      expect(client.closePointInTime).not.toHaveBeenCalled();
    });

    it('handles client.openPointInTime errors', async () => {
      const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
      const params = setup([obj1]);
      mockMgetResults({ found: true }); // results for obj1
      client.openPointInTime.mockReturnValue(
        elasticsearchClientMock.createErrorTransportRequestPromise(new Error('Oh no!'))
      );

      await expect(() => collectMultiNamespaceReferences(params)).rejects.toThrow(
        'Failed to retrieve legacy URL aliases'
      );
      expect(client.openPointInTime).toHaveBeenCalledTimes(1);
      expect(client.search).not.toHaveBeenCalled();
      expect(client.closePointInTime).not.toHaveBeenCalled();
    });

    it('handles client.search errors', async () => {
      const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
      const params = setup([obj1]);
      mockMgetResults({ found: true }); // results for obj1
      client.search.mockReturnValue(
        elasticsearchClientMock.createErrorTransportRequestPromise(new Error('Oh no!'))
      );

      await expect(() => collectMultiNamespaceReferences(params)).rejects.toThrow(
        'Failed to retrieve legacy URL aliases'
      );
      expect(client.openPointInTime).toHaveBeenCalledTimes(1);
      expect(client.search).toHaveBeenCalledTimes(1);
      expect(client.closePointInTime).toHaveBeenCalledTimes(1); // we still close the point-in-time, even though the search failed
    });

    it('handles client.closePointInTime errors', async () => {
      const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
      const params = setup([obj1]);
      mockMgetResults({ found: true }); // results for obj1
      client.closePointInTime.mockReturnValue(
        elasticsearchClientMock.createErrorTransportRequestPromise(new Error('Oh no!'))
      );

      await collectMultiNamespaceReferences(params); // does not throw because the search completed successfully
      expect(client.openPointInTime).toHaveBeenCalledTimes(1);
      expect(client.search).toHaveBeenCalledTimes(1);
      expect(client.closePointInTime).toHaveBeenCalledTimes(1);
    });
  });
});
