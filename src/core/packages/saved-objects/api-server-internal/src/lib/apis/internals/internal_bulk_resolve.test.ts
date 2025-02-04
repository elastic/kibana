/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  mockGetSavedObjectFromSource,
  mockRawDocExistsInNamespace,
  mockIsNotFoundFromUnsupportedServer,
} from './internal_bulk_resolve.test.mock';

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type {
  SavedObjectsBulkResolveObject,
  SavedObjectsBaseOptions,
} from '@kbn/core-saved-objects-api-server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import {
  SavedObjectsSerializer,
  LEGACY_URL_ALIAS_TYPE,
} from '@kbn/core-saved-objects-base-server-internal';
import { typeRegistryMock } from '@kbn/core-saved-objects-base-server-mocks';
import { internalBulkResolve, type InternalBulkResolveParams } from './internal_bulk_resolve';
import { normalizeNamespace } from '../utils';
import {
  type ISavedObjectsSecurityExtension,
  type SavedObject,
  SavedObjectsErrorHelpers,
} from '@kbn/core-saved-objects-server';
import {
  enforceError,
  setupAuthorizeAndRedactInternalBulkResolveFailure,
  setupAuthorizeAndRedactInternalBulkResolveSuccess,
} from '../../../test_helpers/repository.test.common';
import { savedObjectsExtensionsMock } from '../../../mocks/saved_objects_extensions.mock';
import { apiContextMock, type ApiExecutionContextMock } from '../../../mocks';

const VERSION_PROPS = { _seq_no: 1, _primary_term: 1 };
const OBJ_TYPE = 'obj-type';
const UNSUPPORTED_TYPE = 'unsupported-type';
const ENCRYPTED_TYPE = 'encrypted-type';

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
  let incrementCounterInternal: jest.Mock<any, any>;
  let serializer: SavedObjectsSerializer;
  let apiContext: ApiExecutionContextMock;

  beforeEach(() => {
    apiContext = apiContextMock.create({ allowedTypes: [OBJ_TYPE, ENCRYPTED_TYPE] });

    apiContext.helpers.common.getIndexForType.mockImplementation(
      (type: string) => `index-for-${type}`
    );

    apiContext.helpers.migration.migrateAndDecryptStorageDocument.mockImplementation(
      ({ document }) => Promise.resolve(document as SavedObject)
    );

    apiContext.extensions = {} as unknown as typeof apiContext.extensions;

    client = apiContext.client;

    const registry = typeRegistryMock.create();
    serializer = new SavedObjectsSerializer(registry);
    apiContext.serializer = serializer as unknown as typeof apiContext.serializer;
  });

  /** Sets up the type registry, saved objects client, etc. and return the full parameters object to be passed to `internalBulkResolve` */
  function setup(
    objects: SavedObjectsBulkResolveObject[],
    options: SavedObjectsBaseOptions = {}
  ): InternalBulkResolveParams {
    incrementCounterInternal = jest.fn().mockRejectedValue(new Error('increment error')); // mock error to implicitly test that it is caught and swallowed
    return {
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
  function mockMgetResults(
    ...results: Array<{ found: boolean; _source?: Record<string, unknown> }>
  ) {
    client.mget.mockResponseOnce({
      docs: results.map((x) => {
        return x.found
          ? {
              _id: 'doesnt-matter',
              _index: 'doesnt-matter',
              _source: {
                foo: 'bar',
                ...(x._source ?? {}),
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
        operations: aliasIds
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
        docs: objectIds.map((id) => ({
          _id: serializer.generateRawId(normalizedNamespace, OBJ_TYPE, id),
          _index: `index-for-${OBJ_TYPE}`,
        })),
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

  describe.each([undefined, 'default', 'space-x'])(`with namespace '%s'`, (namespace) => {
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

      await expect(() => internalBulkResolve(params, apiContext)).rejects.toThrow(
        SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError()
      );
      expect(client.bulk).toHaveBeenCalledTimes(1);
      expect(client.mget).toHaveBeenCalledTimes(1);
    });

    it('returns an empty array if no object args are passed in', async () => {
      const params = setup([], { namespace });

      const result = await internalBulkResolve(params, apiContext);
      expect(client.bulk).not.toHaveBeenCalled();
      expect(client.mget).not.toHaveBeenCalled();
      expect(result.resolved_objects).toEqual([]);
    });

    it('returns errors for unsupported object types', async () => {
      const objects = [{ type: UNSUPPORTED_TYPE, id: '1' }];
      const params = setup(objects, { namespace });

      const result = await internalBulkResolve(params, apiContext);
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

      const result = await internalBulkResolve(params, apiContext);
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

      const result = await internalBulkResolve(params, apiContext);
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

      const result = await internalBulkResolve(params, apiContext);
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

    it('migrates and decrypts the resolved objects', async () => {
      const objects = [
        { type: OBJ_TYPE, id: '1' },
        { type: OBJ_TYPE, id: '2' },
      ];
      const params = setup(objects, { namespace });
      mockBulkResults({ found: false }, { found: false });
      mockMgetResults({ found: true }, { found: true });
      const migrationHelper = apiContext.helpers.migration;
      migrationHelper.migrateAndDecryptStorageDocument.mockImplementation(({ document }) =>
        Promise.resolve(`migrated-${document}` as unknown as SavedObject)
      );

      await expect(internalBulkResolve(params, apiContext)).resolves.toHaveProperty(
        'resolved_objects',
        [
          expect.objectContaining({ saved_object: 'migrated-mock-obj-for-1' }),
          expect.objectContaining({ saved_object: 'migrated-mock-obj-for-2' }),
        ]
      );

      expect(migrationHelper.migrateAndDecryptStorageDocument).toHaveBeenCalledTimes(2);
      expect(migrationHelper.migrateAndDecryptStorageDocument).nthCalledWith(1, {
        document: 'mock-obj-for-1',
        typeMap: undefined,
      });
      expect(migrationHelper.migrateAndDecryptStorageDocument).nthCalledWith(2, {
        document: 'mock-obj-for-2',
        typeMap: undefined,
      });
    });
  });

  describe('with security extension', () => {
    const namespace = 'foo';
    const objects = [
      { type: OBJ_TYPE, id: '13' },
      { type: OBJ_TYPE, id: '14' },
    ];
    let mockSecurityExt: jest.Mocked<ISavedObjectsSecurityExtension>;
    let params: InternalBulkResolveParams;

    const expectedObjects = [
      expect.objectContaining({
        outcome: 'exactMatch',
        saved_object: expect.objectContaining({ id: objects[0].id }),
      }),
      expect.objectContaining({
        outcome: 'exactMatch',
        saved_object: expect.objectContaining({ id: objects[1].id }),
      }),
    ];

    beforeEach(() => {
      mockGetSavedObjectFromSource.mockReset();
      mockGetSavedObjectFromSource.mockImplementation((_registry, type, id, doc) => {
        return {
          id,
          type,
          namespaces: [namespace],
          attributes: doc?._source?.[type] ?? {},
          references: [],
        } as SavedObject;
      });

      mockSecurityExt = savedObjectsExtensionsMock.createSecurityExtension();
      apiContext.extensions.securityExtension = mockSecurityExt;
      params = setup(objects, { namespace });

      mockBulkResults(
        // No alias matches
        { found: false },
        { found: false }
      );
    });

    test(`propagates decorated error when unauthorized`, async () => {
      mockMgetResults({ found: true }, { found: true });
      setupAuthorizeAndRedactInternalBulkResolveFailure(mockSecurityExt);
      await expect(internalBulkResolve(params, apiContext)).rejects.toThrow(enforceError);
      expect(mockSecurityExt.authorizeAndRedactInternalBulkResolve).toHaveBeenCalledTimes(1);
    });

    test(`returns result when successful`, async () => {
      mockMgetResults({ found: true }, { found: true });
      setupAuthorizeAndRedactInternalBulkResolveSuccess(mockSecurityExt);

      const result = await internalBulkResolve(params, apiContext);
      expect(mockSecurityExt.authorizeAndRedactInternalBulkResolve).toHaveBeenCalledTimes(1);

      const bulkIds = objects.map((obj) => obj.id);
      const expectedNamespaceString = SavedObjectsUtils.namespaceIdToString(namespace);
      expectBulkArgs(expectedNamespaceString, bulkIds);
      const mgetIds = bulkIds;
      expectMgetArgs(namespace, mgetIds);
      expect(result.resolved_objects).toEqual(expectedObjects);
    });

    test(`returns empty array when no objects are provided`, async () => {
      mockMgetResults({ found: true }, { found: true });
      setupAuthorizeAndRedactInternalBulkResolveSuccess(mockSecurityExt);

      const result = await internalBulkResolve({ ...params, objects: [] }, apiContext);
      expect(result).toEqual({ resolved_objects: [] });
      expect(mockSecurityExt.authorizeAndRedactInternalBulkResolve).not.toHaveBeenCalled();
    });

    describe('calls authorizeAndRedactInternalBulkResolve of the security extension', () => {
      beforeEach(() => {
        mockMgetResults({ found: true }, { found: true });
        setupAuthorizeAndRedactInternalBulkResolveFailure(mockSecurityExt);
      });

      test(`in the default space`, async () => {
        await expect(
          internalBulkResolve({ ...params, options: { namespace: 'default' } }, apiContext)
        ).rejects.toThrow(enforceError);
        expect(mockSecurityExt.authorizeAndRedactInternalBulkResolve).toHaveBeenCalledTimes(1);

        const { namespace: actualNamespace, objects: actualObjects } =
          mockSecurityExt.authorizeAndRedactInternalBulkResolve.mock.calls[0][0];
        expect(actualNamespace).toBeUndefined();
        expect(actualObjects).toEqual(expectedObjects);
      });

      test(`in a non-default space`, async () => {
        mockMgetResults({ found: true }, { found: true });
        await expect(internalBulkResolve(params, apiContext)).rejects.toThrow(enforceError);
        expect(mockSecurityExt.authorizeAndRedactInternalBulkResolve).toHaveBeenCalledTimes(1);

        const { namespace: actualNamespace, objects: actualObjects } =
          mockSecurityExt.authorizeAndRedactInternalBulkResolve.mock.calls[0][0];
        expect(actualNamespace).toEqual(namespace);
        expect(actualObjects).toEqual(expectedObjects);
      });
    });

    it('correctly passes params to securityExtension.authorizeAndRedactInternalBulkResolve', async () => {
      mockMgetResults(
        // exact matches
        { found: true, _source: { [OBJ_TYPE]: { title: 'foo_title' } } },
        { found: true, _source: { [OBJ_TYPE]: { name: 'bar_name' } } }
      );

      setupAuthorizeAndRedactInternalBulkResolveSuccess(mockSecurityExt);

      await internalBulkResolve(params, apiContext);

      expect(mockSecurityExt.authorizeAndRedactInternalBulkResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          objects: expect.arrayContaining([
            expect.objectContaining({
              outcome: 'exactMatch',
              saved_object: expect.objectContaining({
                attributes: { name: 'bar_name' },
                id: '14',
                name: 'bar_name',
              }),
            }),
            expect.objectContaining({
              outcome: 'exactMatch',
              saved_object: expect.objectContaining({
                attributes: { title: 'foo_title' },
                id: '13',
                name: 'foo_title',
              }),
            }),
          ]),
        })
      );
    });
  });
});
