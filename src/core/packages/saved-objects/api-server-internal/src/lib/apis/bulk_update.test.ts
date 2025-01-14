/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-shadow */

import {
  pointInTimeFinderMock,
  mockGetBulkOperationError,
  mockGetCurrentTime,
  mockGetSearchDsl,
} from '../repository.test.mock';

import type { Payload } from '@hapi/boom';
import * as estypes from '@elastic/elasticsearch/lib/api/types';

import type {
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateOptions,
} from '@kbn/core-saved-objects-api-server';
import { type SavedObjectReference } from '@kbn/core-saved-objects-server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import { SavedObjectsRepository } from '../repository';
import { loggerMock } from '@kbn/logging-mocks';
import {
  SavedObjectsSerializer,
  encodeHitVersion,
} from '@kbn/core-saved-objects-base-server-internal';
import { kibanaMigratorMock } from '../../mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import {
  NAMESPACE_AGNOSTIC_TYPE,
  MULTI_NAMESPACE_ISOLATED_TYPE,
  HIDDEN_TYPE,
  mockTimestampFields,
  mockTimestamp,
  mappings,
  createRegistry,
  createDocumentMigrator,
  getMockMgetResponse,
  type TypeIdTuple,
  createSpySerializer,
  bulkUpdateSuccess,
  getMockBulkUpdateResponse,
  expectErrorResult,
  expectErrorNotFound,
  expectError,
  createBadRequestErrorPayload,
  expectUpdateResult,
} from '../../test_helpers/repository.test.common';
import type { ISavedObjectsSecurityExtension } from '@kbn/core-saved-objects-server';
import { savedObjectsExtensionsMock } from '../../mocks/saved_objects_extensions.mock';

interface ExpectedErrorResult {
  type: string;
  id: string;
  error: Record<string, any>;
}

describe('#bulkUpdate', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repository: SavedObjectsRepository;
  let migrator: ReturnType<typeof kibanaMigratorMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let serializer: jest.Mocked<SavedObjectsSerializer>;
  let securityExtension: jest.Mocked<ISavedObjectsSecurityExtension>;

  const registry = createRegistry();
  const documentMigrator = createDocumentMigrator(registry);

  const expectSuccess = ({ type, id }: { type: string; id: string }) => {
    // @ts-expect-error TS is not aware of the extension
    return expect.toBeDocumentWithoutError(type, id);
  };

  const expectMigrationArgs = (args: unknown, contains = true, n = 1) => {
    const obj = contains ? expect.objectContaining(args) : expect.not.objectContaining(args);
    expect(migrator.migrateDocument).toHaveBeenNthCalledWith(
      n,
      obj,
      expect.objectContaining({
        allowDowngrade: expect.any(Boolean),
      })
    );
  };

  beforeEach(() => {
    pointInTimeFinderMock.mockClear();
    client = elasticsearchClientMock.createElasticsearchClient();
    migrator = kibanaMigratorMock.create();
    documentMigrator.prepareMigrations();
    migrator.migrateDocument = jest.fn().mockImplementation(documentMigrator.migrate);
    migrator.runMigrations = jest.fn().mockResolvedValue([{ status: 'skipped' }]);
    logger = loggerMock.create();
    securityExtension = savedObjectsExtensionsMock.createSecurityExtension();

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
      extensions: {
        securityExtension,
      },
    });

    mockGetCurrentTime.mockReturnValue(mockTimestamp);
    mockGetSearchDsl.mockClear();
  });

  describe('performBulkUpdate', () => {
    const obj1: SavedObjectsBulkUpdateObject = {
      type: 'config',
      id: '6.0.0-alpha1',
      attributes: { title: 'Test One' },
    };
    const obj2: SavedObjectsBulkUpdateObject = {
      type: 'index-pattern',
      id: 'logstash-*',
      attributes: { title: 'Test Two' },
    };
    const references = [{ name: 'ref_0', type: 'test', id: '1' }];
    const originId = 'some-origin-id';
    const namespace = 'foo-namespace';

    const getBulkIndexEntry = (
      method: string,
      { type, id }: TypeIdTuple,
      _index = expect.any(String),
      getId: (type: string, id: string) => string = () => expect.any(String),
      overrides: Record<string, unknown> = {}
    ) => {
      return {
        [method]: {
          _index,
          _id: getId(type, id),
          ...overrides,
        },
      };
    };

    // bulk index calls have two objects for each source -- the action, and the source
    const expectClientCallArgsAction = (
      objects: TypeIdTuple[],
      {
        method,
        _index = expect.any(String),
        getId = () => expect.any(String),
        overrides = {},
      }: {
        method: string;
        _index?: string;
        getId?: (type: string, id: string) => string;
        overrides?: Record<string, unknown>;
      }
    ) => {
      const operations = [];
      for (const object of objects) {
        operations.push(getBulkIndexEntry(method, object, _index, getId, overrides));
        operations.push(expect.any(Object));
      }
      expect(client.bulk).toHaveBeenCalledWith(
        expect.objectContaining({ operations }),
        expect.anything()
      );
    };

    const expectObjArgs = (
      {
        type,
        attributes,
        references,
      }: {
        type: string;
        attributes: unknown;
        references?: SavedObjectReference[];
      },
      overrides: Record<string, unknown> = {}
    ) => [
      expect.any(Object),
      expect.objectContaining({
        [type]: attributes,
        references,
        type,
        ...overrides,
        ...mockTimestampFields,
      }),
    ];

    describe('client calls', () => {
      it(`should use the ES bulk action by default`, async () => {
        await bulkUpdateSuccess(client, repository, registry, [obj1, obj2]);
        expect(client.bulk).toHaveBeenCalled();
      });

      it(`should use the ES mget action before bulk action for any types that are valid`, async () => {
        const objects = [obj1, { ...obj2, type: MULTI_NAMESPACE_ISOLATED_TYPE }];
        await bulkUpdateSuccess(client, repository, registry, objects);
        expect(client.bulk).toHaveBeenCalled();
        expect(client.mget).toHaveBeenCalled();

        const docs = [
          expect.objectContaining({ _id: `${obj1.type}:${obj1.id}` }),
          expect.objectContaining({ _id: `${MULTI_NAMESPACE_ISOLATED_TYPE}:${obj2.id}` }),
        ];
        expect(client.mget).toHaveBeenCalledWith(
          expect.objectContaining({ docs }),
          expect.anything()
        );
      });

      it(`formats the ES request`, async () => {
        await bulkUpdateSuccess(client, repository, registry, [obj1, obj2]);
        // expect client.bulk call args should include the whole doc
        expectClientCallArgsAction([obj1, obj2], { method: 'index' });
      });

      it(`formats the ES request for any types that are multi-namespace`, async () => {
        const _obj2 = { ...obj2, type: MULTI_NAMESPACE_ISOLATED_TYPE };
        await bulkUpdateSuccess(client, repository, registry, [obj1, _obj2]);
        expectClientCallArgsAction([obj1, _obj2], { method: 'index' });
      });

      it('should use the ES bulk action with the merged attributes when mergeAttributes is not false', async () => {
        const _obj1 = { ...obj1, attributes: { foo: 'bar' } };
        const _obj2 = { ...obj2, attributes: { hello: 'dolly' }, mergeAttributes: true };
        await bulkUpdateSuccess(client, repository, registry, [_obj1, _obj2]);

        expect(client.bulk).toHaveBeenCalledTimes(1);
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({
            operations: [
              getBulkIndexEntry('index', _obj1),
              expect.objectContaining({
                [obj1.type]: {
                  title: 'Testing',
                  foo: 'bar',
                },
              }),
              getBulkIndexEntry('index', _obj2),
              expect.objectContaining({
                [obj2.type]: {
                  title: 'Testing',
                  hello: 'dolly',
                },
              }),
            ],
          }),
          expect.any(Object)
        );
      });

      it('should use the ES bulk action only with the provided attributes when mergeAttributes is false', async () => {
        const _obj1 = { ...obj1, attributes: { hello: 'dolly' }, mergeAttributes: false };
        await bulkUpdateSuccess(client, repository, registry, [_obj1]);

        expect(client.bulk).toHaveBeenCalledTimes(1);
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({
            operations: [
              getBulkIndexEntry('index', _obj1),
              expect.objectContaining({
                [obj1.type]: {
                  hello: 'dolly',
                },
              }),
            ],
          }),
          expect.any(Object)
        );
      });

      it(`doesnt call Elasticsearch if there are no valid objects to update`, async () => {
        const objects = [obj1, obj2].map((x) => ({ ...x, type: 'unknownType' }));
        await repository.bulkUpdate(objects);
        expect(client.bulk).toHaveBeenCalledTimes(0);
      });

      it(`defaults to no references`, async () => {
        await bulkUpdateSuccess(client, repository, registry, [obj1, obj2]);
        const operations = [
          ...expectObjArgs({ ...obj1, references: [] }),
          ...expectObjArgs({ ...obj2, references: [] }),
        ];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ operations }),
          expect.anything()
        );
      });

      it(`accepts custom references array`, async () => {
        const test = async (references: SavedObjectReference[]) => {
          const objects = [obj1, obj2].map((obj) => ({ ...obj, references }));
          await bulkUpdateSuccess(client, repository, registry, objects);
          const operations = [
            ...expectObjArgs({ ...obj1, references }),
            ...expectObjArgs({ ...obj2, references }),
          ];
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({ operations }),
            expect.anything()
          );
          client.bulk.mockClear();
          client.mget.mockClear();
        };
        await test(references);
        await test([{ type: 'type', id: 'id', name: 'some ref' }]);
        await test([]);
      });

      it(`doesn't accept custom references if not an array`, async () => {
        const test = async (references: unknown) => {
          const objects = [obj1, obj2];
          await bulkUpdateSuccess(client, repository, registry, objects);
          const operations = [
            ...expectObjArgs({ ...obj1, references: expect.not.arrayContaining([references]) }),
            ...expectObjArgs({ ...obj2, references: expect.not.arrayContaining([references]) }),
          ];
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({ operations }),
            expect.anything()
          );
          client.bulk.mockClear();
          client.mget.mockClear();
        };
        await test('string');
        await test(123);
        await test(true);
        await test(null);
      });

      it(`defaults to a refresh setting of wait_for`, async () => {
        await bulkUpdateSuccess(client, repository, registry, [obj1, obj2]);
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ refresh: 'wait_for' }),
          expect.anything()
        );
      });

      it(`defaults to no version for types that are not multi-namespace`, async () => {
        const objects = [obj1, { ...obj2, type: NAMESPACE_AGNOSTIC_TYPE }];
        await bulkUpdateSuccess(client, repository, registry, objects);
        expectClientCallArgsAction(objects, { method: 'index' });
      });

      it(`accepts version`, async () => {
        const version = encodeHitVersion({ _seq_no: 100, _primary_term: 200 });
        // test with both non-multi-namespace and multi-namespace types
        const objects = [
          { ...obj1, version },
          { ...obj2, type: MULTI_NAMESPACE_ISOLATED_TYPE, version },
        ];
        await bulkUpdateSuccess(client, repository, registry, objects);
        const overrides = { if_seq_no: 100, if_primary_term: 200 };
        expectClientCallArgsAction(objects, { method: 'index', overrides });
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        const getId = (type: string, id: string) => `${namespace}:${type}:${id}`; // test that the raw document ID equals this (e.g., has a namespace prefix)
        await bulkUpdateSuccess(client, repository, registry, [obj1, obj2], { namespace });
        expectClientCallArgsAction([obj1, obj2], { method: 'index', getId });

        jest.clearAllMocks();
        // test again with object namespace string that supersedes the operation's namespace ID
        await bulkUpdateSuccess(client, repository, registry, [
          { ...obj1, namespace },
          { ...obj2, namespace },
        ]);
        expectClientCallArgsAction([obj1, obj2], { method: 'index', getId });
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        const getId = (type: string, id: string) => `${type}:${id}`; // test that the raw document ID equals this (e.g., does not have a namespace prefix)
        await bulkUpdateSuccess(client, repository, registry, [obj1, obj2]);
        expectClientCallArgsAction([obj1, obj2], { method: 'index', getId });

        jest.clearAllMocks();
        // test again with object namespace string that supersedes the operation's namespace ID
        await bulkUpdateSuccess(
          client,
          repository,
          registry,
          [
            { ...obj1, namespace: 'default' },
            { ...obj2, namespace: 'default' },
          ],
          { namespace }
        );
        expectClientCallArgsAction([obj1, obj2], { method: 'index', getId });
      });

      it(`normalizes options.namespace from 'default' to undefined`, async () => {
        const getId = (type: string, id: string) => `${type}:${id}`;
        await bulkUpdateSuccess(client, repository, registry, [obj1, obj2], {
          namespace: 'default',
        });
        expectClientCallArgsAction([obj1, obj2], { method: 'index', getId });
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        const getId = (type: string, id: string) => `${type}:${id}`; // test that the raw document ID equals this (e.g., does not have a namespace prefix)
        const _obj1 = { ...obj1, type: NAMESPACE_AGNOSTIC_TYPE };
        const _obj2 = { ...obj2, type: MULTI_NAMESPACE_ISOLATED_TYPE };

        await bulkUpdateSuccess(client, repository, registry, [_obj1], { namespace });
        expectClientCallArgsAction([_obj1], { method: 'index', getId });
        client.bulk.mockClear();
        client.mget.mockClear();
        await bulkUpdateSuccess(client, repository, registry, [_obj2], { namespace });
        expectClientCallArgsAction([_obj2], { method: 'index', getId });

        jest.clearAllMocks();
        // test again with object namespace string that supersedes the operation's namespace ID
        await bulkUpdateSuccess(client, repository, registry, [{ ..._obj1, namespace }]);
        expectClientCallArgsAction([_obj1], { method: 'index', getId });
        client.bulk.mockClear();
        client.mget.mockClear();
        await bulkUpdateSuccess(client, repository, registry, [{ ..._obj2, namespace }]);
        expectClientCallArgsAction([_obj2], { method: 'index', getId });
      });
    });

    describe('errors', () => {
      afterEach(() => {
        mockGetBulkOperationError.mockReset();
      });

      const obj: SavedObjectsBulkUpdateObject = {
        type: 'dashboard',
        id: 'three',
        attributes: {},
      };

      const bulkUpdateError = async (
        obj: SavedObjectsBulkUpdateObject,
        isBulkError: boolean,
        expectedErrorResult: ExpectedErrorResult
      ) => {
        const objects = [obj1, obj2, obj];

        const mockedMgetResponse = getMockMgetResponse(registry, [obj1, obj2, obj]);
        client.bulk.mockClear();
        client.mget.mockClear();
        client.mget.mockResponseOnce(mockedMgetResponse);

        const mockBulkIndexResponse = getMockBulkUpdateResponse(registry, objects);
        if (isBulkError) {
          // mock the bulk error for only the third object
          mockGetBulkOperationError.mockReturnValueOnce(undefined);
          mockGetBulkOperationError.mockReturnValueOnce(undefined);
          mockGetBulkOperationError.mockReturnValueOnce(expectedErrorResult.error as Payload);
        }
        client.bulk.mockResponseOnce(mockBulkIndexResponse);

        const result = await repository.bulkUpdate(objects);

        expect(client.mget).toHaveBeenCalled();
        expect(client.bulk).toHaveBeenCalled();

        const expectClientCallObjects = isBulkError ? [obj1, obj2, obj] : [obj1, obj2];
        expectClientCallArgsAction(expectClientCallObjects, { method: 'index' });

        expect(result).toEqual({
          saved_objects: [expectSuccess(obj1), expectSuccess(obj2), expectedErrorResult],
        });
      };

      const bulkUpdateMultiError = async (
        [obj1, obj2, _obj]: SavedObjectsBulkUpdateObject[],
        options: SavedObjectsBulkUpdateOptions | undefined,
        mgetResponse: estypes.MgetResponse,
        mgetOptions?: { statusCode?: number }
      ) => {
        client.bulk.mockClear();
        client.mget.mockClear();
        // we only need to mock the response once. A 404 status code will apply to the response for all
        client.mget.mockResponseOnce(mgetResponse, { statusCode: mgetOptions?.statusCode });

        const mockBulkIndexResponse = getMockBulkUpdateResponse(registry, [obj1, obj2], {
          namespace,
        });
        client.bulk.mockResponseOnce(mockBulkIndexResponse);

        const result = await repository.bulkUpdate([obj1, obj2, _obj], options);

        expect(client.mget).toHaveBeenCalled();
        if (mgetOptions?.statusCode === 404) {
          expect(client.bulk).not.toHaveBeenCalled();
          expect(result).toEqual({
            saved_objects: [
              expectErrorNotFound(obj1),
              expectErrorNotFound(obj2),
              expectErrorNotFound(_obj),
            ],
          });
        } else {
          expect(client.bulk).toHaveBeenCalled();
          expectClientCallArgsAction([obj1, obj2], { method: 'index' });

          expect(result).toEqual({
            saved_objects: [expectSuccess(obj1), expectSuccess(obj2), expectErrorNotFound(_obj)],
          });
        }
      };

      it(`throws when options.namespace is '*'`, async () => {
        await expect(
          repository.bulkUpdate([obj], { namespace: ALL_NAMESPACES_STRING })
        ).rejects.toThrowError(createBadRequestErrorPayload('"options.namespace" cannot be "*"'));
      });

      it(`returns error when type is invalid`, async () => {
        const _obj = { ...obj, type: 'unknownType' };
        await bulkUpdateError(_obj, false, expectErrorNotFound(_obj));
      });

      it(`returns error when type is hidden`, async () => {
        const _obj = { ...obj, type: HIDDEN_TYPE };
        await bulkUpdateError(_obj, false, expectErrorNotFound(_obj));
      });

      it(`returns error when object namespace is '*'`, async () => {
        const _obj = { ...obj, namespace: '*' };
        await bulkUpdateError(
          _obj,
          false,
          expectErrorResult(obj, createBadRequestErrorPayload('"namespace" cannot be "*"'))
        );
      });

      it(`returns error when ES is unable to find the document (mget)`, async () => {
        const _obj = { ...obj, type: MULTI_NAMESPACE_ISOLATED_TYPE, found: false };
        const mgetResponse = getMockMgetResponse(registry, [obj1, obj2, _obj]);
        await bulkUpdateMultiError([obj1, obj2, _obj], undefined, mgetResponse);
      });

      it(`returns error when ES is unable to find the index (mget)`, async () => {
        const _obj = { ...obj, type: MULTI_NAMESPACE_ISOLATED_TYPE };
        const mgetResponse = getMockMgetResponse(registry, [obj1, obj2, _obj]);
        await bulkUpdateMultiError([obj1, obj2, _obj], { namespace }, mgetResponse, {
          statusCode: 404,
        });
      });

      it(`returns error when there is a conflict with an existing multi-namespace saved object (mget)`, async () => {
        const _obj = { ...obj, type: MULTI_NAMESPACE_ISOLATED_TYPE };
        const mgetResponse = getMockMgetResponse(registry, [obj1, obj2, _obj], 'bar-namespace');
        await bulkUpdateMultiError([obj1, obj2, _obj], { namespace }, mgetResponse);
      });

      it(`returns bulk error`, async () => {
        const expectedErrorResult = {
          type: obj.type,
          id: obj.id,
          error: { message: 'Oh no, a bulk error!' },
        };
        await bulkUpdateError(obj, true, expectedErrorResult);
      });
    });

    describe('migration', () => {
      it('migrates the fetched documents from Mget', async () => {
        const modifiedObj2 = { ...obj2, coreMigrationVersion: '8.0.0' };
        const objects = [modifiedObj2];
        migrator.migrateDocument.mockImplementationOnce((doc) => ({ ...doc, migrated: true }));

        await bulkUpdateSuccess(client, repository, registry, objects);
        expect(migrator.migrateDocument).toHaveBeenCalledTimes(2);
        expectMigrationArgs({
          id: modifiedObj2.id,
          type: modifiedObj2.type,
        });
      });

      it('migrates namespace agnostic and multinamespace object documents', async () => {
        const modifiedObj2 = {
          ...obj2,
          coreMigrationVersion: '8.0.0',
          type: MULTI_NAMESPACE_ISOLATED_TYPE,
          namespace: 'default',
        };
        const modifiedObj1 = { ...obj1, type: NAMESPACE_AGNOSTIC_TYPE };
        const objects = [modifiedObj2, modifiedObj1];
        migrator.migrateDocument.mockImplementationOnce((doc) => ({ ...doc, migrated: true }));

        await bulkUpdateSuccess(client, repository, registry, objects, { namespace });

        expect(migrator.migrateDocument).toHaveBeenCalledTimes(4);
        expectMigrationArgs(
          {
            id: modifiedObj2.id,
            type: modifiedObj2.type,
          },
          true,
          1
        );
        expectMigrationArgs(
          {
            id: modifiedObj1.id,
            type: modifiedObj1.type,
          },
          true,
          2
        );
      });
    });

    describe('returns', () => {
      it(`formats the ES response`, async () => {
        const response = await bulkUpdateSuccess(client, repository, registry, [obj1, obj2]);
        expect(response).toEqual({
          saved_objects: [obj1, obj2].map(expectUpdateResult),
        });
      });

      it(`includes references`, async () => {
        const objects = [obj1, obj2].map((obj) => ({ ...obj, references }));
        const response = await bulkUpdateSuccess(client, repository, registry, objects);
        expect(response).toEqual({
          saved_objects: objects.map(expectUpdateResult),
        });
      });

      it(`handles a mix of successful updates and errors`, async () => {
        const obj: SavedObjectsBulkUpdateObject = {
          type: 'unknownType',
          id: 'three',
          attributes: {},
        };
        const objects = [obj1, obj2, obj];
        const mockedMgetResponse = getMockMgetResponse(registry, [obj1, obj2, obj]);
        client.bulk.mockClear();
        client.mget.mockClear();
        client.mget.mockResponseOnce(mockedMgetResponse);

        const mockBulkIndexResponse = getMockBulkUpdateResponse(registry, objects);
        client.bulk.mockResponseOnce(mockBulkIndexResponse);
        const result = await repository.bulkUpdate(objects);

        expect(client.mget).toHaveBeenCalled();
        expect(client.bulk).toHaveBeenCalled();

        const expectClientCallObjects = [obj1, obj2];
        expectClientCallArgsAction(expectClientCallObjects, { method: 'index' });

        expect(result).toEqual({
          saved_objects: [expectUpdateResult(obj1), expectUpdateResult(obj2), expectError(obj)],
        });
      });

      it(`includes namespaces property for single-namespace and multi-namespace documents`, async () => {
        const obj: SavedObjectsBulkUpdateObject = {
          type: MULTI_NAMESPACE_ISOLATED_TYPE,
          id: 'three',
          attributes: {},
        };
        const result = await bulkUpdateSuccess(client, repository, registry, [obj1, obj]);
        expect(result).toEqual({
          saved_objects: [
            expect.objectContaining({ namespaces: expect.any(Array) }),
            expect.objectContaining({ namespaces: expect.any(Array) }),
          ],
        });
      });

      it(`includes originId property if present in cluster call response`, async () => {
        const obj: SavedObjectsBulkUpdateObject = {
          type: MULTI_NAMESPACE_ISOLATED_TYPE,
          id: 'three',
          attributes: {},
        };
        client.bulk.mockClear();
        client.mget.mockClear();
        const objects = [
          { ...obj1, originId },
          { ...obj, originId },
        ];
        const mockedMgetResponse = getMockMgetResponse(registry, objects);

        client.mget.mockResponseOnce(mockedMgetResponse);

        const mockBulkIndexResponse = getMockBulkUpdateResponse(registry, objects, {}, originId);
        client.bulk.mockResponseOnce(mockBulkIndexResponse);
        const result = await repository.bulkUpdate(objects);

        expect(client.mget).toHaveBeenCalled();
        expect(client.bulk).toHaveBeenCalled();

        const expectClientCallObjects = objects;
        expectClientCallArgsAction(expectClientCallObjects, { method: 'index' });
        expect(result).toEqual({
          saved_objects: [
            expect.objectContaining({ originId }),
            expect.objectContaining({ originId }),
          ],
        });
      });
    });

    describe('security', () => {
      it('correctly passes params to securityExtension.authorizeBulkUpdate', async () => {
        await bulkUpdateSuccess(client, repository, registry, [obj1, obj2]);

        expect(securityExtension.authorizeBulkUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            objects: expect.arrayContaining([
              expect.objectContaining({
                id: '6.0.0-alpha1',
                name: 'Test One',
              }),
              expect.objectContaining({
                id: 'logstash-*',
                name: 'Test Two',
              }),
            ]),
          })
        );
      });
    });
  });
});
