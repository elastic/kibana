/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @typescript-eslint/no-shadow */

import {
  pointInTimeFinderMock,
  mockGetBulkOperationError,
  mockGetCurrentTime,
  mockGetSearchDsl,
} from '../repository.test.mock';

import type { Payload } from '@hapi/boom';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

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

interface ExpectedErrorResult {
  type: string;
  id: string;
  error: Record<string, any>;
}

describe('SavedObjectsRepository', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repository: SavedObjectsRepository;
  let migrator: ReturnType<typeof kibanaMigratorMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let serializer: jest.Mocked<SavedObjectsSerializer>;

  const registry = createRegistry();
  const documentMigrator = createDocumentMigrator(registry);

  const expectSuccess = ({ type, id }: { type: string; id: string }) => {
    // @ts-expect-error TS is not aware of the extension
    return expect.toBeDocumentWithoutError(type, id);
  };

  beforeEach(() => {
    pointInTimeFinderMock.mockClear();
    client = elasticsearchClientMock.createElasticsearchClient();
    migrator = kibanaMigratorMock.create();
    documentMigrator.prepareMigrations();
    migrator.migrateDocument = jest.fn().mockImplementation(documentMigrator.migrate);
    migrator.runMigrations = jest.fn().mockResolvedValue([{ status: 'skipped' }]);
    logger = loggerMock.create();

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
    });

    mockGetCurrentTime.mockReturnValue(mockTimestamp);
    mockGetSearchDsl.mockClear();
  });

  describe('#bulkUpdate', () => {
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

    // bulk create calls have two objects for each source -- the action, and the source
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
      const body = [];
      for (const { type, id } of objects) {
        body.push({
          [method]: {
            _index,
            _id: getId(type, id),
            ...overrides,
          },
        });
        body.push(expect.any(Object));
      }
      expect(client.bulk).toHaveBeenCalledWith(
        expect.objectContaining({ body }),
        expect.anything()
      );
    };

    const expectObjArgs = ({ type, attributes }: { type: string; attributes: unknown }) => [
      expect.any(Object),
      {
        doc: expect.objectContaining({
          [type]: attributes,
          ...mockTimestampFields,
        }),
      },
    ];

    describe('client calls', () => {
      it(`should use the ES bulk action by default`, async () => {
        await bulkUpdateSuccess(client, repository, registry, [obj1, obj2]);
        expect(client.bulk).toHaveBeenCalled();
      });

      it(`should use the ES mget action before bulk action for any types that are multi-namespace`, async () => {
        const objects = [obj1, { ...obj2, type: MULTI_NAMESPACE_ISOLATED_TYPE }];
        await bulkUpdateSuccess(client, repository, registry, objects);
        expect(client.bulk).toHaveBeenCalled();
        expect(client.mget).toHaveBeenCalled();

        const docs = [
          expect.objectContaining({ _id: `${MULTI_NAMESPACE_ISOLATED_TYPE}:${obj2.id}` }),
        ];
        expect(client.mget).toHaveBeenCalledWith(
          expect.objectContaining({ body: { docs } }),
          expect.anything()
        );
      });

      it(`formats the ES request`, async () => {
        await bulkUpdateSuccess(client, repository, registry, [obj1, obj2]);
        const body = [...expectObjArgs(obj1), ...expectObjArgs(obj2)];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body }),
          expect.anything()
        );
      });

      it(`formats the ES request for any types that are multi-namespace`, async () => {
        const _obj2 = { ...obj2, type: MULTI_NAMESPACE_ISOLATED_TYPE };
        await bulkUpdateSuccess(client, repository, registry, [obj1, _obj2]);
        const body = [...expectObjArgs(obj1), ...expectObjArgs(_obj2)];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body }),
          expect.anything()
        );
      });

      it(`doesnt call Elasticsearch if there are no valid objects to update`, async () => {
        const objects = [obj1, obj2].map((x) => ({ ...x, type: 'unknownType' }));
        await repository.bulkUpdate(objects);
        expect(client.bulk).toHaveBeenCalledTimes(0);
      });

      it(`defaults to no references`, async () => {
        await bulkUpdateSuccess(client, repository, registry, [obj1, obj2]);
        const expected = { doc: expect.not.objectContaining({ references: expect.anything() }) };
        const body = [expect.any(Object), expected, expect.any(Object), expected];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body }),
          expect.anything()
        );
      });

      it(`accepts custom references array`, async () => {
        const test = async (references: SavedObjectReference[]) => {
          const objects = [obj1, obj2].map((obj) => ({ ...obj, references }));
          await bulkUpdateSuccess(client, repository, registry, objects);
          const expected = { doc: expect.objectContaining({ references }) };
          const body = [expect.any(Object), expected, expect.any(Object), expected];
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({ body }),
            expect.anything()
          );
          client.bulk.mockClear();
        };
        await test(references);
        await test([{ type: 'type', id: 'id', name: 'some ref' }]);
        await test([]);
      });

      it(`doesn't accept custom references if not an array`, async () => {
        const test = async (references: unknown) => {
          const objects = [obj1, obj2]; // .map((obj) => ({ ...obj }));
          await bulkUpdateSuccess(client, repository, registry, objects);
          const expected = { doc: expect.not.objectContaining({ references: expect.anything() }) };
          const body = [expect.any(Object), expected, expect.any(Object), expected];
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({ body }),
            expect.anything()
          );
          client.bulk.mockClear();
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
        expectClientCallArgsAction(objects, { method: 'update' });
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
        expectClientCallArgsAction(objects, { method: 'update', overrides });
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        const getId = (type: string, id: string) => `${namespace}:${type}:${id}`; // test that the raw document ID equals this (e.g., has a namespace prefix)
        await bulkUpdateSuccess(client, repository, registry, [obj1, obj2], { namespace });
        expectClientCallArgsAction([obj1, obj2], { method: 'update', getId });

        jest.clearAllMocks();
        // test again with object namespace string that supersedes the operation's namespace ID
        await bulkUpdateSuccess(client, repository, registry, [
          { ...obj1, namespace },
          { ...obj2, namespace },
        ]);
        expectClientCallArgsAction([obj1, obj2], { method: 'update', getId });
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        const getId = (type: string, id: string) => `${type}:${id}`; // test that the raw document ID equals this (e.g., does not have a namespace prefix)
        await bulkUpdateSuccess(client, repository, registry, [obj1, obj2]);
        expectClientCallArgsAction([obj1, obj2], { method: 'update', getId });

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
        expectClientCallArgsAction([obj1, obj2], { method: 'update', getId });
      });

      it(`normalizes options.namespace from 'default' to undefined`, async () => {
        const getId = (type: string, id: string) => `${type}:${id}`;
        await bulkUpdateSuccess(client, repository, registry, [obj1, obj2], {
          namespace: 'default',
        });
        expectClientCallArgsAction([obj1, obj2], { method: 'update', getId });
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        const getId = (type: string, id: string) => `${type}:${id}`; // test that the raw document ID equals this (e.g., does not have a namespace prefix)
        const _obj1 = { ...obj1, type: NAMESPACE_AGNOSTIC_TYPE };
        const _obj2 = { ...obj2, type: MULTI_NAMESPACE_ISOLATED_TYPE };

        await bulkUpdateSuccess(client, repository, registry, [_obj1], { namespace });
        expectClientCallArgsAction([_obj1], { method: 'update', getId });
        client.bulk.mockClear();
        await bulkUpdateSuccess(client, repository, registry, [_obj2], { namespace });
        expectClientCallArgsAction([_obj2], { method: 'update', getId });

        jest.clearAllMocks();
        // test again with object namespace string that supersedes the operation's namespace ID
        await bulkUpdateSuccess(client, repository, registry, [{ ..._obj1, namespace }]);
        expectClientCallArgsAction([_obj1], { method: 'update', getId });
        client.bulk.mockClear();
        await bulkUpdateSuccess(client, repository, registry, [{ ..._obj2, namespace }]);
        expectClientCallArgsAction([_obj2], { method: 'update', getId });
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
        const objects = [obj1, obj, obj2];
        const mockResponse = getMockBulkUpdateResponse(registry, objects);
        if (isBulkError) {
          // mock the bulk error for only the second object
          mockGetBulkOperationError.mockReturnValueOnce(undefined);
          mockGetBulkOperationError.mockReturnValueOnce(expectedErrorResult.error as Payload);
        }
        client.bulk.mockResponseOnce(mockResponse);

        const result = await repository.bulkUpdate(objects);
        expect(client.bulk).toHaveBeenCalled();
        const objCall = isBulkError ? expectObjArgs(obj) : [];
        const body = [...expectObjArgs(obj1), ...objCall, ...expectObjArgs(obj2)];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body }),
          expect.anything()
        );
        expect(result).toEqual({
          saved_objects: [expectSuccess(obj1), expectedErrorResult, expectSuccess(obj2)],
        });
      };

      const bulkUpdateMultiError = async (
        [obj1, _obj, obj2]: SavedObjectsBulkUpdateObject[],
        options: SavedObjectsBulkUpdateOptions | undefined,
        mgetResponse: estypes.MgetResponse,
        mgetOptions?: { statusCode?: number }
      ) => {
        client.mget.mockResponseOnce(mgetResponse, { statusCode: mgetOptions?.statusCode });

        const bulkResponse = getMockBulkUpdateResponse(registry, [obj1, obj2], { namespace });
        client.bulk.mockResponseOnce(bulkResponse);

        const result = await repository.bulkUpdate([obj1, _obj, obj2], options);
        expect(client.bulk).toHaveBeenCalled();
        expect(client.mget).toHaveBeenCalled();
        const body = [...expectObjArgs(obj1), ...expectObjArgs(obj2)];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body }),
          expect.anything()
        );

        expect(result).toEqual({
          saved_objects: [expectSuccess(obj1), expectErrorNotFound(_obj), expectSuccess(obj2)],
        });
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
        const mgetResponse = getMockMgetResponse(registry, [_obj]);
        await bulkUpdateMultiError([obj1, _obj, obj2], undefined, mgetResponse);
      });

      it(`returns error when ES is unable to find the index (mget)`, async () => {
        const _obj = { ...obj, type: MULTI_NAMESPACE_ISOLATED_TYPE };
        const mgetResponse = getMockMgetResponse(registry, [_obj]);
        await bulkUpdateMultiError([obj1, _obj, obj2], { namespace }, mgetResponse, {
          statusCode: 404,
        });
      });

      it(`returns error when there is a conflict with an existing multi-namespace saved object (mget)`, async () => {
        const _obj = { ...obj, type: MULTI_NAMESPACE_ISOLATED_TYPE };
        const mgetResponse = getMockMgetResponse(registry, [_obj], 'bar-namespace');
        await bulkUpdateMultiError([obj1, _obj, obj2], { namespace }, mgetResponse);
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
        const objects = [obj1, obj, obj2];
        const mockResponse = getMockBulkUpdateResponse(registry, objects);
        client.bulk.mockResponseOnce(mockResponse);

        const result = await repository.bulkUpdate(objects);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
          saved_objects: [expectUpdateResult(obj1), expectError(obj), expectUpdateResult(obj2)],
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
        const result = await bulkUpdateSuccess(
          client,
          repository,
          registry,
          [obj1, obj],
          {},
          originId
        );
        expect(result).toEqual({
          saved_objects: [
            expect.objectContaining({ originId }),
            expect.objectContaining({ originId }),
          ],
        });
      });
    });
  });
});
