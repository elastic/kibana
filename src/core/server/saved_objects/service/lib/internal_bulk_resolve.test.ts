/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  mockGetSavedObjectFromSource,
  mockRawDocExistsInNamespace,
  mockIsNotFoundFromUnsupportedServer,
} from './internal_bulk_resolve.test.mock';

import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import type { ElasticsearchClient } from 'src/core/server/elasticsearch';
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

import { LEGACY_URL_ALIAS_TYPE } from '../../object_types';
import { typeRegistryMock } from '../../saved_objects_type_registry.mock';
import { SavedObjectsSerializer } from '../../serialization';
import { SavedObjectsErrorHelpers } from './errors';
import { SavedObjectsBulkResolveObject } from '../saved_objects_client';
import { SavedObject, SavedObjectsBaseOptions } from '../../types';
import { internalBulkResolve, InternalBulkResolveParams } from './internal_bulk_resolve';

const VERSION_PROPS = { _seq_no: 1, _primary_term: 1 };
const OBJ_TYPE = 'obj-type';
const UNSUPPORTED_TYPE = 'unsupported-type';

beforeEach(() => {
  mockGetSavedObjectFromSource.mockReset();
  mockGetSavedObjectFromSource.mockImplementation(
    (_registry, _type, id) => `mock-obj-for-${id}` as unknown as SavedObject
  );
  mockRawDocExistsInNamespace.mockReset();
  mockRawDocExistsInNamespace.mockReturnValue(true); // return true by default
  mockIsNotFoundFromUnsupportedServer.mockReset();
  mockIsNotFoundFromUnsupportedServer.mockReturnValue(false);
});

describe('internalBulkResolve', () => {
  let client: DeeplyMockedKeys<ElasticsearchClient>;
  let serializer: SavedObjectsSerializer;
  let incrementCounterInternal: jest.Mock<any, any>;

  /** Sets up the type registry, saved objects client, etc. and return the full parameters object to be passed to `internalBulkResolve` */
  function setup(
    objects: SavedObjectsBulkResolveObject[],
    options: SavedObjectsBaseOptions = {}
  ): InternalBulkResolveParams {
    const registry = typeRegistryMock.create();
    client = elasticsearchClientMock.createElasticsearchClient();
    serializer = new SavedObjectsSerializer(registry);
    incrementCounterInternal = jest.fn().mockRejectedValue(new Error('increment error')); // mock error to implicitly test that it is caught and swallowed
    return {
      registry: typeRegistryMock.create(), // doesn't need additional mocks for this test suite
      allowedTypes: [OBJ_TYPE],
      client,
      serializer,
      getIndexForType: (type: string) => `index-for-${type}`,
      incrementCounterInternal,
      objects,
      options,
    };
  }

  /** Mocks the elasticsearch client so it returns the expected results for a bulk operation */
  function mockBulkResults(
    ...results: Array<{ found: boolean; targetId?: string; disabled?: boolean }>
  ) {
    client.bulk.mockReturnValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        items: results.map(({ found, targetId, disabled }) => ({
          update: {
            _index: 'doesnt-matter',
            status: 0,
            get: {
              found,
              _source: {
                ...((targetId || disabled) && {
                  [LEGACY_URL_ALIAS_TYPE]: { targetId, disabled },
                }),
              },
              ...VERSION_PROPS,
            },
          },
        })),
        errors: false,
        took: 0,
      })
    );
  }

  /** Mocks the elasticsearch client so it returns the expected results for an mget operation*/
  function mockMgetResults(...results: Array<{ found: boolean }>) {
    client.mget.mockReturnValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        docs: results.map((x) => {
          return x.found
            ? {
                _id: 'doesnt-matter',
                _index: 'doesnt-matter',
                _source: {
                  foo: 'bar',
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

  /** Asserts that bulk is called for the given aliases */
  function expectBulkArgs(namespace: string, aliasIds: string[]) {
    expect(client.bulk).toHaveBeenCalledTimes(1);
    expect(client.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        body: aliasIds
          .map((id) => [
            {
              update: {
                _id: `legacy-url-alias:${namespace}:${OBJ_TYPE}:${id}`,
                _index: `index-for-${LEGACY_URL_ALIAS_TYPE}`,
                _source: true,
              },
            },
            { script: expect.any(Object) },
          ])
          .flat(),
      })
    );
  }

  /** Asserts that mget is called for the given objects */
  function expectMgetArgs(namespace: string | undefined, objectIds: string[]) {
    expect(client.mget).toHaveBeenCalledTimes(1);
    expect(client.mget).toHaveBeenCalledWith(
      {
        body: {
          docs: objectIds.map((id) => ({
            _id: serializer.generateRawId(namespace, OBJ_TYPE, id),
            _index: `index-for-${OBJ_TYPE}`,
          })),
        },
      },
      expect.anything()
    );
  }

  function expectUnsupportedTypeError(id: string) {
    const error = SavedObjectsErrorHelpers.createUnsupportedTypeError(UNSUPPORTED_TYPE);
    return { type: UNSUPPORTED_TYPE, id, error };
  }
  function expectNotFoundError(id: string) {
    const error = SavedObjectsErrorHelpers.createGenericNotFoundError(OBJ_TYPE, id);
    return { type: OBJ_TYPE, id, error };
  }
  function expectExactMatchResult(id: string) {
    return { saved_object: `mock-obj-for-${id}`, outcome: 'exactMatch' };
  }
  function expectAliasMatchResult(id: string) {
    return { saved_object: `mock-obj-for-${id}`, outcome: 'aliasMatch', alias_target_id: id };
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  function expectConflictResult(id: string, alias_target_id: string) {
    return { saved_object: `mock-obj-for-${id}`, outcome: 'conflict', alias_target_id };
  }

  it('throws if mget call results in non-ES-originated 404 error', async () => {
    const objects = [{ type: OBJ_TYPE, id: '1' }];
    const params = setup(objects, { namespace: 'space-x' });
    mockBulkResults(
      { found: false } // fetch alias for obj 1
    );
    mockMgetResults(
      { found: false } // fetch obj 1 (actual result body doesn't matter, just needs statusCode and headers)
    );
    mockIsNotFoundFromUnsupportedServer.mockReturnValue(true);

    await expect(() => internalBulkResolve(params)).rejects.toThrow(
      SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError()
    );
    expect(client.bulk).toHaveBeenCalledTimes(1);
    expect(client.mget).toHaveBeenCalledTimes(1);
  });

  it('returns an empty array if no object args are passed in', async () => {
    const params = setup([], { namespace: 'space-x' });

    const result = await internalBulkResolve(params);
    expect(client.bulk).not.toHaveBeenCalled();
    expect(client.mget).not.toHaveBeenCalled();
    expect(result.resolved_objects).toEqual([]);
  });

  it('returns errors for unsupported object types', async () => {
    const objects = [{ type: UNSUPPORTED_TYPE, id: '1' }];
    const params = setup(objects, { namespace: 'space-x' });

    const result = await internalBulkResolve(params);
    expect(client.bulk).not.toHaveBeenCalled();
    expect(client.mget).not.toHaveBeenCalled();
    expect(result.resolved_objects).toEqual([expectUnsupportedTypeError('1')]);
  });

  it('returns errors for objects that are not found', async () => {
    const objects = [
      { type: OBJ_TYPE, id: '1' }, // does not have an alias, and is not found
      { type: OBJ_TYPE, id: '2' }, // has an alias, but the object _and_ the alias target are not found
      { type: OBJ_TYPE, id: '3' }, // has an alias, and the object and alias target are both found, but the object _and_ the alias target do not exist in this space
    ];
    const params = setup(objects, { namespace: 'space-x' });
    mockBulkResults(
      { found: false }, // fetch alias for obj 1
      { found: true, targetId: '2-newId' }, // fetch alias for obj 2
      { found: true, targetId: '3-newId' } // fetch alias for obj 3
    );
    mockMgetResults(
      { found: false }, // fetch obj 1
      { found: false }, // fetch obj 2
      { found: false }, // fetch obj 2-newId
      { found: true }, // fetch obj 3
      { found: true } // fetch obj 3-newId
    );
    mockRawDocExistsInNamespace.mockReturnValue(false); // for objs 3 and 3-newId

    const result = await internalBulkResolve(params);
    expectBulkArgs('space-x', ['1', '2', '3']);
    expectMgetArgs('space-x', ['1', '2', '2-newId', '3', '3-newId']);
    expect(mockRawDocExistsInNamespace).toHaveBeenCalledTimes(2); // for objs 3 and 3-newId
    expect(result.resolved_objects).toEqual([
      expectNotFoundError('1'),
      expectNotFoundError('2'),
      expectNotFoundError('3'),
    ]);
  });

  it('does not call bulk update in the Default space', async () => {
    // Aliases cannot exist in the Default space, so we skip the alias check part of the algorithm in that case (e.g., bulk update)
    for (const namespace of [undefined, 'default']) {
      const params = setup([{ type: OBJ_TYPE, id: '1' }], { namespace });
      mockMgetResults(
        { found: true } // fetch obj 1
      );

      await internalBulkResolve(params);
      expect(client.bulk).not.toHaveBeenCalled();
      // 'default' is normalized to undefined
      expectMgetArgs(undefined, ['1']);
    }
  });

  it('ignores aliases that are disabled', async () => {
    const objects = [{ type: OBJ_TYPE, id: '1' }];
    const params = setup(objects, { namespace: 'space-x' });
    mockBulkResults(
      { found: true, targetId: '1-newId', disabled: true } // fetch alias for obj 1
    );
    mockMgetResults(
      { found: true } // fetch obj 1
      // does not attempt to fetch obj 1-newId, because that alias is disabled
    );

    const result = await internalBulkResolve(params);
    expectBulkArgs('space-x', ['1']);
    expectMgetArgs('space-x', ['1']);
    expect(result.resolved_objects).toEqual([
      expectExactMatchResult('1'), // result for obj 1
    ]);
  });

  it('returns a mix of results and increments the usage stats counter correctly', async () => {
    const objects = [
      { type: UNSUPPORTED_TYPE, id: '1' }, // unsupported type error
      { type: OBJ_TYPE, id: '2' }, // not found error
      { type: OBJ_TYPE, id: '3' }, // exactMatch outcome
      { type: OBJ_TYPE, id: '4' }, // aliasMatch outcome
      { type: OBJ_TYPE, id: '5' }, // conflict outcome
    ];
    const params = setup(objects, { namespace: 'space-x' });
    mockBulkResults(
      // does not attempt to fetch alias for obj 1, because that is an unsupported type
      { found: false }, // fetch alias for obj 2
      { found: false }, // fetch alias for obj 3
      { found: true, targetId: '4-newId' }, // fetch alias for obj 4
      { found: true, targetId: '5-newId' } // fetch alias for obj 5
    );
    mockMgetResults(
      { found: false }, // fetch obj 2
      { found: true }, // fetch obj 3
      { found: false }, // fetch obj 4
      { found: true }, // fetch obj 4-newId
      { found: true }, // fetch obj 5
      { found: true } // fetch obj 5-newId
    );

    const result = await internalBulkResolve(params);
    expectBulkArgs('space-x', ['2', '3', '4', '5']);
    expectMgetArgs('space-x', ['2', '3', '4', '4-newId', '5', '5-newId']);
    expect(result.resolved_objects).toEqual([
      expectUnsupportedTypeError('1'),
      expectNotFoundError('2'),
      expectExactMatchResult('3'),
      expectAliasMatchResult('4-newId'),
      expectConflictResult('5', '5-newId'),
    ]);
  });
});
