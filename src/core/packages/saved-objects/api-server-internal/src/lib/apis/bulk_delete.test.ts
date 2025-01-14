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
  mockDeleteLegacyUrlAliases,
  mockGetSearchDsl,
} from '../repository.test.mock';

import type { Payload } from '@hapi/boom';
import * as estypes from '@elastic/elasticsearch/lib/api/types';

import type {
  SavedObjectsBulkDeleteObject,
  SavedObjectsBulkDeleteOptions,
} from '@kbn/core-saved-objects-api-server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { SavedObjectsRepository } from '../repository';
import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import { kibanaMigratorMock } from '../../mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { savedObjectsExtensionsMock } from '../../mocks/saved_objects_extensions.mock';
import type { ISavedObjectsSecurityExtension } from '@kbn/core-saved-objects-server';

import {
  NAMESPACE_AGNOSTIC_TYPE,
  MULTI_NAMESPACE_TYPE,
  MULTI_NAMESPACE_ISOLATED_TYPE,
  HIDDEN_TYPE,
  mockTimestamp,
  mappings,
  createRegistry,
  createDocumentMigrator,
  getMockMgetResponse,
  type TypeIdTuple,
  createSpySerializer,
  expectErrorInvalidType,
  expectErrorNotFound,
  createBadRequestErrorPayload,
  getMockEsBulkDeleteResponse,
  bulkDeleteSuccess,
  createBulkDeleteSuccessStatus,
} from '../../test_helpers/repository.test.common';

interface ExpectedErrorResult {
  type: string;
  id: string;
  error: Record<string, any>;
}

describe('#bulkDelete', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repository: SavedObjectsRepository;
  let migrator: ReturnType<typeof kibanaMigratorMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let serializer: jest.Mocked<SavedObjectsSerializer>;
  let securityExtension: jest.Mocked<ISavedObjectsSecurityExtension>;

  const registry = createRegistry();
  const documentMigrator = createDocumentMigrator(registry);

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

  // Setup migration mock for creating an object

  describe('performBulkDelete', () => {
    const obj1: SavedObjectsBulkDeleteObject = {
      type: 'config',
      id: '6.0.0-alpha1',
    };
    const obj2: SavedObjectsBulkDeleteObject = {
      type: 'index-pattern',
      id: 'logstash-*',
    };

    const namespace = 'foo-namespace';

    const createNamespaceAwareGetId = (type: string, id: string) =>
      `${registry.isSingleNamespace(type) && namespace ? `${namespace}:` : ''}${type}:${id}`;

    // bulk delete calls only has one object for each source -- the action
    const expectClientCallBulkDeleteArgsAction = (
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
      for (const { type, id } of objects) {
        operations.push({
          [method]: {
            _index,
            _id: getId(type, id),
            ...overrides,
          },
        });
      }

      expect(client.bulk).toHaveBeenCalledWith(
        expect.objectContaining({ operations }),
        expect.anything()
      );
    };

    const createBulkDeleteFailStatus = ({
      type,
      id,
      error,
    }: {
      type: string;
      id: string;
      error?: ExpectedErrorResult['error'];
    }) => ({
      type,
      id,
      success: false,
      error: error ?? SavedObjectsErrorHelpers.createBadRequestError(),
    });

    // mocks a combination of success, error results for hidden and unknown object object types.
    const repositoryBulkDeleteError = async (
      obj: SavedObjectsBulkDeleteObject,
      isBulkError: boolean,
      expectedErrorResult: ExpectedErrorResult
    ) => {
      const objects = [obj1, obj, obj2];
      const mockedBulkDeleteResponse = getMockEsBulkDeleteResponse(registry, objects);
      if (isBulkError) {
        mockGetBulkOperationError.mockReturnValueOnce(undefined);
        mockGetBulkOperationError.mockReturnValueOnce(expectedErrorResult.error as Payload);
      }
      client.bulk.mockResponseOnce(mockedBulkDeleteResponse);

      const result = await repository.bulkDelete(objects);
      expect(client.bulk).toHaveBeenCalled();
      expect(result).toEqual({
        statuses: [
          createBulkDeleteSuccessStatus(obj1),
          createBulkDeleteFailStatus({ ...obj, error: expectedErrorResult.error }),
          createBulkDeleteSuccessStatus(obj2),
        ],
      });
    };

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
      for (const { type, id } of objects) {
        operations.push({
          [method]: {
            _index,
            _id: getId(type, id),
            ...overrides,
          },
        });
      }
      expect(client.bulk).toHaveBeenCalledWith(
        expect.objectContaining({ operations }),
        expect.anything()
      );
    };

    const bulkDeleteMultiNamespaceError = async (
      [obj1, _obj, obj2]: SavedObjectsBulkDeleteObject[],
      options: SavedObjectsBulkDeleteOptions | undefined,
      mgetResponse: estypes.MgetResponse,
      mgetOptions?: { statusCode?: number }
    ) => {
      const getId = (type: string, id: string) => `${options?.namespace}:${type}:${id}`;
      // mock the response for the not found doc
      client.mget.mockResponseOnce(mgetResponse, { statusCode: mgetOptions?.statusCode });
      // get a mocked response for the valid docs
      const bulkResponse = getMockEsBulkDeleteResponse(registry, [obj1, obj2], { namespace });
      client.bulk.mockResponseOnce(bulkResponse);

      const result = await repository.bulkDelete([obj1, _obj, obj2], options);
      expect(client.bulk).toHaveBeenCalledTimes(1);
      expect(client.mget).toHaveBeenCalledTimes(1);

      expectClientCallArgsAction([obj1, obj2], { method: 'delete', getId });
      expect(result).toEqual({
        statuses: [
          createBulkDeleteSuccessStatus(obj1),
          { ...expectErrorNotFound(_obj), success: false },
          createBulkDeleteSuccessStatus(obj2),
        ],
      });
    };

    beforeEach(() => {
      mockDeleteLegacyUrlAliases.mockClear();
      mockDeleteLegacyUrlAliases.mockResolvedValue();
    });

    describe('client calls', () => {
      it(`should use the ES bulk action by default`, async () => {
        await bulkDeleteSuccess(client, repository, registry, [obj1, obj2]);
        expect(client.bulk).toHaveBeenCalled();
      });

      it(`should use the ES mget action before bulk action for any types that are multi-namespace`, async () => {
        const objects = [obj1, { ...obj2, type: MULTI_NAMESPACE_ISOLATED_TYPE }];
        await bulkDeleteSuccess(client, repository, registry, objects);
        expect(client.bulk).toHaveBeenCalled();
        expect(client.mget).toHaveBeenCalled();

        const docs = [
          expect.objectContaining({ _id: `${MULTI_NAMESPACE_ISOLATED_TYPE}:${obj2.id}` }),
        ];
        expect(client.mget).toHaveBeenCalledWith(
          expect.objectContaining({ docs }),
          expect.anything()
        );
      });

      it(`should not use the ES bulk action when there are no valid documents to delete`, async () => {
        const objects = [obj1, obj2].map((x) => ({ ...x, type: 'unknownType' }));
        await repository.bulkDelete(objects);
        expect(client.bulk).toHaveBeenCalledTimes(0);
      });

      it(`formats the ES request`, async () => {
        const getId = createNamespaceAwareGetId;
        await bulkDeleteSuccess(client, repository, registry, [obj1, obj2], { namespace });
        expectClientCallBulkDeleteArgsAction([obj1, obj2], { method: 'delete', getId });
      });

      it(`formats the ES request for any types that are multi-namespace`, async () => {
        const _obj2 = { ...obj2, type: MULTI_NAMESPACE_ISOLATED_TYPE };
        const getId = createNamespaceAwareGetId;
        await bulkDeleteSuccess(client, repository, registry, [obj1, _obj2], { namespace });
        expectClientCallBulkDeleteArgsAction([obj1, _obj2], { method: 'delete', getId });
      });

      it(`defaults to a refresh setting of wait_for`, async () => {
        await bulkDeleteSuccess(client, repository, registry, [obj1, obj2]);
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ refresh: 'wait_for' }),
          expect.anything()
        );
      });

      it(`does not include the version of the existing document when not using a multi-namespace type`, async () => {
        const objects = [obj1, { ...obj2, type: NAMESPACE_AGNOSTIC_TYPE }];
        await bulkDeleteSuccess(client, repository, registry, objects);
        expectClientCallBulkDeleteArgsAction(objects, { method: 'delete' });
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        const getId = createNamespaceAwareGetId;
        await bulkDeleteSuccess(client, repository, registry, [obj1, obj2], { namespace });
        expectClientCallBulkDeleteArgsAction([obj1, obj2], { method: 'delete', getId });
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        const getId = (type: string, id: string) => `${type}:${id}`;
        await bulkDeleteSuccess(client, repository, registry, [obj1, obj2]);
        expectClientCallBulkDeleteArgsAction([obj1, obj2], { method: 'delete', getId });
      });

      it(`normalizes options.namespace from 'default' to undefined`, async () => {
        const getId = (type: string, id: string) => `${type}:${id}`;
        await bulkDeleteSuccess(client, repository, registry, [obj1, obj2], {
          namespace: 'default',
        });
        expectClientCallBulkDeleteArgsAction([obj1, obj2], { method: 'delete', getId });
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        const getId = (type: string, id: string) => `${type}:${id}`; // not expecting namespace prefix;
        const _obj1 = { ...obj1, type: NAMESPACE_AGNOSTIC_TYPE };
        const _obj2 = { ...obj2, type: MULTI_NAMESPACE_ISOLATED_TYPE };

        await bulkDeleteSuccess(client, repository, registry, [_obj1, _obj2], { namespace });
        expectClientCallBulkDeleteArgsAction([_obj1, _obj2], { method: 'delete', getId });
      });
    });

    describe('legacy URL aliases', () => {
      it(`doesn't delete legacy URL aliases for single-namespace object types`, async () => {
        await bulkDeleteSuccess(client, repository, registry, [obj1, obj2]);
        expect(mockDeleteLegacyUrlAliases).not.toHaveBeenCalled();
      });

      it(`deletes legacy URL aliases for multi-namespace object types (all spaces)`, async () => {
        const testObject = { ...obj1, type: MULTI_NAMESPACE_TYPE };
        const internalOptions = {
          mockMGetResponseObjects: [
            {
              ...testObject,
              initialNamespaces: [ALL_NAMESPACES_STRING],
            },
          ],
        };
        await bulkDeleteSuccess(
          client,
          repository,
          registry,
          [testObject],
          { namespace, force: true },
          internalOptions
        );
        expect(mockDeleteLegacyUrlAliases).toHaveBeenCalledWith(
          expect.objectContaining({
            type: MULTI_NAMESPACE_TYPE,
            id: testObject.id,
            namespaces: [],
            deleteBehavior: 'exclusive',
          })
        );
      });

      it(`deletes legacy URL aliases for multi-namespace object types (specific space)`, async () => {
        const testObject = { ...obj1, type: MULTI_NAMESPACE_TYPE };
        const internalOptions = {
          mockMGetResponseObjects: [
            {
              ...testObject,
              initialNamespaces: [namespace],
            },
          ],
        };
        // specifically test against the current namespace
        await bulkDeleteSuccess(
          client,
          repository,
          registry,
          [testObject],
          { namespace },
          internalOptions
        );
        expect(mockDeleteLegacyUrlAliases).toHaveBeenCalledWith(
          expect.objectContaining({
            type: MULTI_NAMESPACE_TYPE,
            id: testObject.id,
            namespaces: [namespace],
            deleteBehavior: 'inclusive',
          })
        );
      });

      it(`deletes legacy URL aliases for multi-namespace object types shared to many specific spaces`, async () => {
        const testObject = { ...obj1, type: MULTI_NAMESPACE_TYPE };
        const initialTestObjectNamespaces = [namespace, 'bar-namespace'];
        const internalOptions = {
          mockMGetResponseObjects: [
            {
              ...testObject,
              initialNamespaces: initialTestObjectNamespaces,
            },
          ],
        };
        // specifically test against named spaces ('*' is handled specifically, this assures we also take care of named spaces)
        await bulkDeleteSuccess(
          client,
          repository,
          registry,
          [testObject],
          { namespace, force: true },
          internalOptions
        );
        expect(mockDeleteLegacyUrlAliases).toHaveBeenCalledWith(
          expect.objectContaining({
            type: MULTI_NAMESPACE_TYPE,
            id: testObject.id,
            namespaces: initialTestObjectNamespaces,
            deleteBehavior: 'inclusive',
          })
        );
      });

      it(`logs a message when deleteLegacyUrlAliases returns an error`, async () => {
        const testObject = { type: MULTI_NAMESPACE_ISOLATED_TYPE, id: obj1.id };

        client.mget.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(
            getMockMgetResponse(registry, [testObject], namespace)
          )
        );
        const mockedBulkResponse = getMockEsBulkDeleteResponse(registry, [testObject], {
          namespace,
        });
        client.bulk.mockResolvedValueOnce(mockedBulkResponse);

        mockDeleteLegacyUrlAliases.mockRejectedValueOnce(new Error('Oh no!'));

        await repository.bulkDelete([testObject], { namespace });

        expect(client.mget).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
          'Unable to delete aliases when deleting an object: Oh no!'
        );
      });
    });

    describe('errors', () => {
      it(`throws an error when options.namespace is '*'`, async () => {
        await expect(
          repository.bulkDelete([obj1], { namespace: ALL_NAMESPACES_STRING })
        ).rejects.toThrowError(
          SavedObjectsErrorHelpers.createBadRequestError('"options.namespace" cannot be "*"')
        );
      });

      it(`throws an error when client bulk response is not defined`, async () => {
        client.mget.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(
            getMockMgetResponse(registry, [obj1], namespace)
          )
        );
        const mockedBulkResponse = undefined;
        // we have to cast here to test the assumption we always get a response.
        client.bulk.mockResponseOnce(mockedBulkResponse as unknown as estypes.BulkResponse);
        await expect(repository.bulkDelete([obj1], { namespace })).rejects.toThrowError(
          'Unexpected error in bulkDelete saved objects: bulkDeleteResponse is undefined'
        );
      });

      it(`returns an error for the object when the object's type is invalid`, async () => {
        const unknownObjType = { ...obj1, type: 'unknownType' };
        await repositoryBulkDeleteError(
          unknownObjType,
          false,
          expectErrorInvalidType(unknownObjType)
        );
      });

      it(`returns an error for an object when the object's type is hidden`, async () => {
        const hiddenObject = { ...obj1, type: HIDDEN_TYPE };
        await repositoryBulkDeleteError(hiddenObject, false, expectErrorInvalidType(hiddenObject));
      });

      it(`returns an error when ES is unable to find the document during mget`, async () => {
        const notFoundObj = { ...obj1, type: MULTI_NAMESPACE_ISOLATED_TYPE, found: false };
        const mgetResponse = getMockMgetResponse(registry, [notFoundObj], namespace);
        await bulkDeleteMultiNamespaceError([obj1, notFoundObj, obj2], { namespace }, mgetResponse);
      });

      it(`returns an error when ES is unable to find the index during mget`, async () => {
        const notFoundObj = { ...obj1, type: MULTI_NAMESPACE_ISOLATED_TYPE, found: false };
        await bulkDeleteMultiNamespaceError(
          [obj1, notFoundObj, obj2],
          { namespace },
          { docs: [] } as estypes.MgetResponse,
          {
            statusCode: 404,
          }
        );
      });

      it(`returns an error when the type is multi-namespace and the document exists, but not in this namespace`, async () => {
        const obj = {
          type: MULTI_NAMESPACE_ISOLATED_TYPE,
          id: 'three',
          namespace: 'bar-namespace',
        };
        const mgetResponse = getMockMgetResponse(registry, [obj], namespace);
        await bulkDeleteMultiNamespaceError([obj1, obj, obj2], { namespace }, mgetResponse);
      });

      it(`returns an error when the type is multi-namespace and the document has multiple namespaces and the force option is not enabled`, async () => {
        const testObject = { ...obj1, type: MULTI_NAMESPACE_TYPE };
        const internalOptions = {
          mockMGetResponseObjects: [
            {
              ...testObject,
              initialNamespaces: [namespace, 'bar-namespace'],
            },
          ],
        };
        const result = await bulkDeleteSuccess(
          client,
          repository,
          registry,
          [testObject],
          { namespace },
          internalOptions
        );
        expect(result.statuses[0]).toStrictEqual(
          createBulkDeleteFailStatus({
            ...testObject,
            error: createBadRequestErrorPayload(
              'Unable to delete saved object that exists in multiple namespaces, use the `force` option to delete it anyway'
            ),
          })
        );
      });

      it(`returns an error when the type is multi-namespace and the document has all namespaces and the force option is not enabled`, async () => {
        const testObject = { ...obj1, type: ALL_NAMESPACES_STRING };
        const internalOptions = {
          mockMGetResponseObjects: [
            {
              ...testObject,
              initialNamespaces: [namespace, 'bar-namespace'],
            },
          ],
        };
        const result = await bulkDeleteSuccess(
          client,
          repository,
          registry,
          [testObject],
          { namespace },
          internalOptions
        );
        expect(result.statuses[0]).toStrictEqual(
          createBulkDeleteFailStatus({
            ...testObject,
            error: createBadRequestErrorPayload("Unsupported saved object type: '*'"),
          })
        );
      });
    });

    describe('returns', () => {
      it(`returns early for empty objects argument`, async () => {
        await repository.bulkDelete([], { namespace });
        expect(client.bulk).toHaveBeenCalledTimes(0);
      });

      it(`formats the ES response`, async () => {
        const response = await bulkDeleteSuccess(client, repository, registry, [obj1, obj2], {
          namespace,
        });
        expect(response).toEqual({
          statuses: [obj1, obj2].map(createBulkDeleteSuccessStatus),
        });
      });

      it(`handles a mix of successful deletes and errors`, async () => {
        const notFoundObj = { ...obj1, type: MULTI_NAMESPACE_ISOLATED_TYPE, found: false };
        await bulkDeleteMultiNamespaceError(
          [obj1, notFoundObj, obj2],
          { namespace },
          { docs: [] } as estypes.MgetResponse,
          { statusCode: 404 }
        );
      });
    });

    describe('security', () => {
      it('correctly passes params to securityExtension.authorizeBulkDelete', async () => {
        const testObject1 = { id: 'test_object_1', type: MULTI_NAMESPACE_TYPE };
        const testObject2 = { id: 'test_object_2', type: MULTI_NAMESPACE_ISOLATED_TYPE };

        const internalOptions = {
          mockMGetResponseObjects: [
            {
              ...testObject1,
              initialNamespaces: [namespace, 'bar-namespace'],
            },
            {
              ...testObject2,
              initialNamespaces: [namespace, 'bar-namespace'],
            },
          ],
        };

        await bulkDeleteSuccess(
          client,
          repository,
          registry,
          [testObject1, testObject2],
          {
            namespace,
            force: true,
          },
          internalOptions
        );

        expect(securityExtension.authorizeBulkDelete).toHaveBeenCalledWith(
          expect.objectContaining({
            objects: expect.arrayContaining([
              expect.objectContaining({
                id: 'test_object_1',
                name: 'Testing',
              }),
              expect.objectContaining({
                id: 'test_object_2',
                name: 'Testing',
              }),
            ]),
          })
        );
      });
    });
  });
});
