/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DeeplyMockedKeys } from '@kbn/utility-types/target/jest';
import type { ElasticsearchClient } from 'src/core/server/elasticsearch';
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

import { typeRegistryMock } from '../../saved_objects_type_registry.mock';
import { SavedObjectsSerializer } from '../../serialization';
import { encodeHitVersion } from '../../version';
import type { SavedObjectsCollectMultiNamespaceReferencesObject } from './collect_multi_namespace_references';
import { collectMultiNamespaceReferences } from './collect_multi_namespace_references';

const SPACES = ['default', 'another-space'];
const VERSION_PROPS = { _seq_no: 1, _primary_term: 1 };
const VERSION_STRING = encodeHitVersion(VERSION_PROPS);

const MULTI_NAMESPACE_OBJ_TYPE = 'type-a';
const NON_MULTI_NAMESPACE_OBJ_TYPE = 'type-b';
const MULTI_NAMESPACE_HIDDEN_OBJ_TYPE = 'type-c';

describe('collectMultiNamespaceReferences', () => {
  let client: DeeplyMockedKeys<ElasticsearchClient>;

  /** Sets up the type registry, saved objects client, etc. and return the full parameters object to be passed to `collectMultiNamespaceReferences` */
  function setup(...objects: SavedObjectsCollectMultiNamespaceReferencesObject[]) {
    const registry = typeRegistryMock.create();
    registry.isMultiNamespace.mockImplementation(
      (type) => [MULTI_NAMESPACE_OBJ_TYPE, MULTI_NAMESPACE_HIDDEN_OBJ_TYPE].includes(type) // NON_MULTI_NAMESPACE_TYPE is excluded
    );
    client = elasticsearchClientMock.createElasticsearchClient();
    const serializer = new SavedObjectsSerializer(registry);
    return {
      registry,
      allowedTypes: [MULTI_NAMESPACE_OBJ_TYPE, NON_MULTI_NAMESPACE_OBJ_TYPE], // MULTI_NAMESPACE_HIDDEN_TYPE is excluded
      client,
      serializer,
      getIndexForType: (type: string) => `index-for-${type}`,
      objects,
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
    const params = setup();

    const result = await collectMultiNamespaceReferences(params);
    expect(client.mget).not.toHaveBeenCalled();
    expect(result.objects).toEqual([]);
  });

  it('excludes args that have unsupported types', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE, id: 'id-1' };
    const obj2 = { type: NON_MULTI_NAMESPACE_OBJ_TYPE, id: 'id-2' };
    const obj3 = { type: MULTI_NAMESPACE_HIDDEN_OBJ_TYPE, id: 'id-3' };
    const params = setup(obj1, obj2, obj3);
    mockMgetResults({ found: true }); // results for obj1

    const result = await collectMultiNamespaceReferences(params);
    expect(client.mget).toHaveBeenCalledTimes(1);
    expectMgetArgs(1, obj1); // the non-multi-namespace type and the hidden type are excluded
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, from: [], version: VERSION_STRING },
      // even though they are excluded from the cluster call, obj2 and obj3 are included in the results
      { ...obj2, spaces: [], from: [] },
      { ...obj3, spaces: [], from: [] },
    ]);
  });

  it('excludes references that have unsupported types', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE, id: 'id-1' };
    const obj2 = { type: NON_MULTI_NAMESPACE_OBJ_TYPE, id: 'id-2' };
    const obj3 = { type: MULTI_NAMESPACE_HIDDEN_OBJ_TYPE, id: 'id-3' };
    const params = setup(obj1);
    mockMgetResults({ found: true, references: [obj2, obj3] }); // results for obj1

    const result = await collectMultiNamespaceReferences(params);
    expect(client.mget).toHaveBeenCalledTimes(1);
    expectMgetArgs(1, obj1);
    // obj2 and obj3 are not retrieved in a second cluster call
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, from: [], version: VERSION_STRING },
      // obj2 and obj3 are excluded from the results
    ]);
  });

  it('handles circular references', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE, id: 'id-1' };
    const params = setup(obj1);
    mockMgetResults({ found: true, references: [obj1] }); // results for obj1

    const result = await collectMultiNamespaceReferences(params);
    expect(params.client.mget).toHaveBeenCalledTimes(1);
    expectMgetArgs(1, obj1); // obj1 is retrieved once, and it is not retrieved again in a second cluster call
    expect(result.objects).toEqual([
      // obj1 reflects the inbound reference to itself
      { ...obj1, spaces: SPACES, from: [{ ...obj1, name: 'ref-name' }], version: VERSION_STRING },
    ]);
  });

  it('handles multiple inbound references', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE, id: 'id-1' };
    const obj2 = { type: MULTI_NAMESPACE_OBJ_TYPE, id: 'id-2' };
    const obj3 = { type: MULTI_NAMESPACE_OBJ_TYPE, id: 'id-3' };
    const params = setup(obj1, obj2);
    mockMgetResults({ found: true, references: [obj3] }, { found: true, references: [obj3] }); // results for obj1 and obj2
    mockMgetResults({ found: true }); // results for obj3

    const result = await collectMultiNamespaceReferences(params);
    expect(params.client.mget).toHaveBeenCalledTimes(2);
    expectMgetArgs(1, obj1, obj2);
    expectMgetArgs(2, obj3); // obj3 is retrieved in a second cluster call
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, from: [], version: VERSION_STRING },
      { ...obj2, spaces: SPACES, from: [], version: VERSION_STRING },
      {
        ...obj3,
        spaces: SPACES,
        from: [
          // obj3 reflects both inbound references
          { ...obj1, name: 'ref-name' },
          { ...obj2, name: 'ref-name' },
        ],
        version: VERSION_STRING,
      },
    ]);
  });

  it('handles transitive references', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE, id: 'id-1' };
    const obj2 = { type: MULTI_NAMESPACE_OBJ_TYPE, id: 'id-2' };
    const obj3 = { type: MULTI_NAMESPACE_OBJ_TYPE, id: 'id-3' };
    const params = setup(obj1);
    mockMgetResults({ found: true, references: [obj2] }); // results for obj1
    mockMgetResults({ found: true, references: [obj3] }); // results for obj2
    mockMgetResults({ found: true }); // results for obj3

    const result = await collectMultiNamespaceReferences(params);
    expect(params.client.mget).toHaveBeenCalledTimes(3);
    expectMgetArgs(1, obj1);
    expectMgetArgs(2, obj2); // obj2 is retrieved in a second cluster call
    expectMgetArgs(3, obj3); // obj3 is retrieved in a third cluster call
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, from: [], version: VERSION_STRING },
      { ...obj2, spaces: SPACES, from: [{ ...obj1, name: 'ref-name' }], version: VERSION_STRING }, // obj2 reflects the inbound reference
      { ...obj3, spaces: SPACES, from: [{ ...obj2, name: 'ref-name' }], version: VERSION_STRING }, // obj3 reflects the inbound reference
    ]);
  });

  it('handles missing references', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE, id: 'id-1' };
    const obj2 = { type: MULTI_NAMESPACE_OBJ_TYPE, id: 'id-2' };
    const params = setup(obj1);
    mockMgetResults({ found: true, references: [obj2] }); // results for obj1
    mockMgetResults({ found: false }); // results for obj2

    const result = await collectMultiNamespaceReferences(params);
    expect(params.client.mget).toHaveBeenCalledTimes(2);
    expectMgetArgs(1, obj1);
    expectMgetArgs(2, obj2);
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, from: [], version: VERSION_STRING },
      { ...obj2, spaces: [], from: [{ ...obj1, name: 'ref-name' }], isMissing: true },
    ]);
  });
});
