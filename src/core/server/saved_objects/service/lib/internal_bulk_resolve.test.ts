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

import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import { LEGACY_URL_ALIAS_TYPE } from '../../object_types';
import { typeRegistryMock } from '../../saved_objects_type_registry.mock';
import { SavedObjectsSerializer } from '../../serialization';
import { SavedObjectsErrorHelpers } from './errors';
import { SavedObjectsBulkResolveObject } from '../saved_objects_client';
import { SavedObject, SavedObjectsBaseOptions } from '../../types';
import { internalBulkResolve, InternalBulkResolveParams } from './internal_bulk_resolve';
import { SavedObjectsUtils } from './utils';
import { normalizeNamespace } from './internal_utils';

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
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
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
    ...results: Array<{ found: boolean; targetId?: string; disabled?: boolean; purpose?: string }>
  ) {
    client.bulk.mockResponseOnce({
      items: results.map(({ found, targetId, disabled, purpose }) => ({
        update: {
          _index: 'doesnt-matter',
          status: 0,
          get: {
            found,
            _source: {
              ...((targetId || disabled) && {
                [LEGACY_URL_ALIAS_TYPE]: { targetId, disabled, purpose },
              }),
            },
            ...VERSION_PROPS,
          },
        },
      })),
      errors: false,
      took: 0,
    });
  }

  /** Mocks the elasticsearch client so it returns the expected results for an mget operation*/
  function mockMgetResults(...results: Array<{ found: boolean }>) {
    client.mget.mockResponseOnce({
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
    });
  }

  /** Asserts that bulk is called for the given aliases */
  function expectBulkArgs(namespaceString: string, aliasIds: string[]) {
    expect(client.bulk).toHaveBeenCalledTimes(1);
    expect(client.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        body: aliasIds
          .map((id) => [
            {
              update: {
                _id: `legacy-url-alias:${namespaceString}:${OBJ_TYPE}:${id}`,
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
    const normalizedNamespace = normalizeNamespace(namespace);
    expect(client.mget).toHaveBeenCalledTimes(1);
    expect(client.mget).toHaveBeenCalledWith(
      {
        body: {
          docs: objectIds.map((id) => ({
            _id: serializer.generateRawId(normalizedNamespace, OBJ_TYPE, id),
            _index: `index-for-${OBJ_TYPE}`,
          })),
        },
      },
      expect.anything()
    );
  }

  function expectUnsupportedTypeError({ id }: { id: string }) {
    const error = SavedObjectsErrorHelpers.createUnsupportedTypeError(UNSUPPORTED_TYPE);
    return { type: UNSUPPORTED_TYPE, id, error };
  }

  function expectNotFoundError({ id }: { id: string }) {
    const error = SavedObjectsErrorHelpers.createGenericNotFoundError(OBJ_TYPE, id);
    return { type: OBJ_TYPE, id, error };
  }

  function expectExactMatchResult({ id }: { id: string }) {
    return { saved_object: `mock-obj-for-${id}`, outcome: 'exactMatch' };
  }

  function expectAliasMatchResult({
    id,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    alias_purpose,
  }: {
    id: string;
    alias_purpose?: string;
  }) {
    return {
      saved_object: `mock-obj-for-${id}`,
      outcome: 'aliasMatch',
      alias_target_id: id,
      alias_purpose,
    };
  }

  function expectConflictResult({
    id,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    alias_target_id,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    alias_purpose,
  }: {
    id: string;
    alias_target_id: string;
    alias_purpose?: string;
  }) {
    return {
      saved_object: `mock-obj-for-${id}`,
      outcome: 'conflict',
      alias_target_id,
      alias_purpose,
    };
  }

  for (const namespace of [undefined, 'default', 'space-x']) {
    const expectedNamespaceString = SavedObjectsUtils.namespaceIdToString(namespace);

    it('throws if mget call results in non-ES-originated 404 error', async () => {
      const objects = [{ type: OBJ_TYPE, id: '1' }];
      const params = setup(objects, { namespace });
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
      const params = setup([], { namespace });

      const result = await internalBulkResolve(params);
      expect(client.bulk).not.toHaveBeenCalled();
      expect(client.mget).not.toHaveBeenCalled();
      expect(result.resolved_objects).toEqual([]);
    });

    it('returns errors for unsupported object types', async () => {
      const objects = [{ type: UNSUPPORTED_TYPE, id: '1' }];
      const params = setup(objects, { namespace });

      const result = await internalBulkResolve(params);
      expect(client.bulk).not.toHaveBeenCalled();
      expect(client.mget).not.toHaveBeenCalled();
      expect(result.resolved_objects).toEqual([expectUnsupportedTypeError({ id: '1' })]);
    });

    it('returns errors for objects that are not found', async () => {
      const objects = [
        { type: OBJ_TYPE, id: '1' }, // does not have an alias, and is not found
        { type: OBJ_TYPE, id: '2' }, // has an alias, but the object _and_ the alias target are not found
        { type: OBJ_TYPE, id: '3' }, // has an alias, and the object and alias target are both found, but the object _and_ the alias target do not exist in this space
      ];
      const params = setup(objects, { namespace });
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
      expectBulkArgs(expectedNamespaceString, ['1', '2', '3']);
      expectMgetArgs(namespace, ['1', '2', '2-newId', '3', '3-newId']);
      expect(mockRawDocExistsInNamespace).toHaveBeenCalledTimes(2); // for objs 3 and 3-newId
      expect(result.resolved_objects).toEqual([
        expectNotFoundError({ id: '1' }),
        expectNotFoundError({ id: '2' }),
        expectNotFoundError({ id: '3' }),
      ]);
    });

    it('ignores aliases that are disabled', async () => {
      const objects = [{ type: OBJ_TYPE, id: '1' }];
      const params = setup(objects, { namespace });
      mockBulkResults(
        { found: true, targetId: '1-newId', disabled: true } // fetch alias for obj 1
      );
      mockMgetResults(
        { found: true } // fetch obj 1
        // does not attempt to fetch obj 1-newId, because that alias is disabled
      );

      const result = await internalBulkResolve(params);
      expectBulkArgs(expectedNamespaceString, ['1']);
      expectMgetArgs(namespace, ['1']);
      expect(result.resolved_objects).toEqual([
        expectExactMatchResult({ id: '1' }), // result for obj 1
      ]);
    });

    it('returns a mix of results and increments the usage stats counter correctly', async () => {
      const objects = [
        { type: UNSUPPORTED_TYPE, id: '1' }, // unsupported type error
        { type: OBJ_TYPE, id: '2' }, // not found error
        { type: OBJ_TYPE, id: '3' }, // exactMatch outcome
        { type: OBJ_TYPE, id: '4' }, // aliasMatch outcome
        { type: OBJ_TYPE, id: '5' }, // aliasMatch outcome with purpose
        { type: OBJ_TYPE, id: '6' }, // conflict outcome
        { type: OBJ_TYPE, id: '7' }, // conflict outcome with purpose
      ];
      const params = setup(objects, { namespace });
      mockBulkResults(
        // does not attempt to fetch alias for obj 1, because that is an unsupported type
        { found: false }, // fetch alias for obj 2
        { found: false }, // fetch alias for obj 3
        { found: true, targetId: '4-newId' }, // fetch alias for obj 4
        { found: true, targetId: '5-newId', purpose: 'x' }, // fetch alias for obj 5
        { found: true, targetId: '6-newId' }, // fetch alias for obj 6
        { found: true, targetId: '7-newId', purpose: 'y' } // fetch alias for obj 7
      );
      mockMgetResults(
        { found: false }, // fetch obj 2
        { found: true }, // fetch obj 3
        { found: false }, // fetch obj 4
        { found: true }, // fetch obj 4-newId
        { found: false }, // fetch obj 5
        { found: true }, // fetch obj 5-newId
        { found: true }, // fetch obj 6
        { found: true }, // fetch obj 6-newId
        { found: true }, // fetch obj 7
        { found: true } // fetch obj 7-newId
      );

      const result = await internalBulkResolve(params);
      const bulkIds = ['2', '3', '4', '5', '6', '7'];
      expectBulkArgs(expectedNamespaceString, bulkIds);
      const mgetIds = ['2', '3', '4', '4-newId', '5', '5-newId', '6', '6-newId', '7', '7-newId'];
      expectMgetArgs(namespace, mgetIds);
      expect(result.resolved_objects).toEqual([
        expectUnsupportedTypeError({ id: '1' }),
        expectNotFoundError({ id: '2' }),
        expectExactMatchResult({ id: '3' }),
        expectAliasMatchResult({ id: '4-newId' }),
        expectAliasMatchResult({ id: '5-newId', alias_purpose: 'x' }),
        expectConflictResult({ id: '6', alias_target_id: '6-newId' }),
        expectConflictResult({ id: '7', alias_target_id: '7-newId', alias_purpose: 'y' }),
      ]);
    });
  }
});
