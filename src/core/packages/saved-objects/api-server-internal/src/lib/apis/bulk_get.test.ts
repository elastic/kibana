/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  pointInTimeFinderMock,
  mockGetBulkOperationError,
  mockGetCurrentTime,
  mockGetSearchDsl,
} from '../repository.test.mock';

import type { ISavedObjectsSecurityExtension } from '@kbn/core-saved-objects-server';

import type { Payload } from '@hapi/boom';
import * as estypes from '@elastic/elasticsearch/lib/api/types';

import type { SavedObjectsBulkGetObject } from '@kbn/core-saved-objects-api-server';
import { type SavedObjectsRawDocSource, type SavedObject } from '@kbn/core-saved-objects-server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import { SavedObjectsRepository } from '../repository';
import { loggerMock } from '@kbn/logging-mocks';
import {
  SavedObjectsSerializer,
  encodeHitVersion,
} from '@kbn/core-saved-objects-base-server-internal';
import { kibanaMigratorMock } from '../../mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { savedObjectsExtensionsMock } from '../../mocks/saved_objects_extensions.mock';

import {
  NAMESPACE_AGNOSTIC_TYPE,
  MULTI_NAMESPACE_ISOLATED_TYPE,
  HIDDEN_TYPE,
  mockTimestamp,
  mappings,
  bulkGetSuccess,
  createRegistry,
  createDocumentMigrator,
  getMockMgetResponse,
  type TypeIdTuple,
  createSpySerializer,
  bulkGet,
  expectErrorResult,
  expectErrorInvalidType,
  expectErrorNotFound,
  expectError,
  createBadRequestErrorPayload,
} from '../../test_helpers/repository.test.common';

interface ExpectedErrorResult {
  type: string;
  id: string;
  error: Record<string, any>;
}

describe('#bulkGet', () => {
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

  describe('performBulkGet', () => {
    const obj1: SavedObject<unknown> = {
      type: 'config',
      id: '6.0.0-alpha1',
      attributes: { title: 'Testing' },
      references: [
        {
          name: 'ref_0',
          type: 'test',
          id: '1',
        },
      ],
      originId: 'some-origin-id', // only one of the results has an originId, this is intentional to test both a positive and negative case
    };
    const obj2: SavedObject<unknown> = {
      type: 'index-pattern',
      id: 'logstash-*',
      attributes: { title: 'Testing' },
      references: [
        {
          name: 'ref_0',
          type: 'test',
          id: '2',
        },
      ],
    };
    const namespace = 'foo-namespace';

    const _expectClientCallArgs = (
      objects: TypeIdTuple[],
      {
        _index = expect.any(String),
        getId = () => expect.any(String),
      }: { _index?: string; getId?: (type: string, id: string) => string }
    ) => {
      expect(client.mget).toHaveBeenCalledWith(
        expect.objectContaining({
          docs: objects.map(({ type, id }) =>
            expect.objectContaining({
              _index,
              _id: getId(type, id),
            })
          ),
        }),
        expect.anything()
      );
    };

    describe('client calls', () => {
      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        const getId = (type: string, id: string) => `${namespace}:${type}:${id}`; // test that the raw document ID equals this (e.g., has a namespace prefix)
        await bulkGetSuccess(client, repository, registry, [obj1, obj2], { namespace });
        _expectClientCallArgs([obj1, obj2], { getId });
      });

      it(`prepends namespace to the id when providing namespaces for single-namespace type`, async () => {
        const getId = (type: string, id: string) => `${namespace}:${type}:${id}`; // test that the raw document ID equals this (e.g., has a namespace prefix)
        const objects = [obj1, obj2].map((obj) => ({ ...obj, namespaces: [namespace] }));
        await bulkGetSuccess(client, repository, registry, objects, { namespace: 'some-other-ns' });
        _expectClientCallArgs([obj1, obj2], { getId });
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        const getId = (type: string, id: string) => `${type}:${id}`; // test that the raw document ID equals this (e.g., does not have a namespace prefix)
        await bulkGetSuccess(client, repository, registry, [obj1, obj2]);
        _expectClientCallArgs([obj1, obj2], { getId });
      });

      it(`normalizes options.namespace from 'default' to undefined`, async () => {
        const getId = (type: string, id: string) => `${type}:${id}`; // test that the raw document ID equals this (e.g., does not have a namespace prefix)
        await bulkGetSuccess(client, repository, registry, [obj1, obj2], { namespace: 'default' });
        _expectClientCallArgs([obj1, obj2], { getId });
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        const getId = (type: string, id: string) => `${type}:${id}`; // test that the raw document ID equals this (e.g., does not have a namespace prefix)
        let objects = [obj1, obj2].map((obj) => ({ ...obj, type: NAMESPACE_AGNOSTIC_TYPE }));
        await bulkGetSuccess(client, repository, registry, objects, { namespace });
        _expectClientCallArgs(objects, { getId });

        client.mget.mockClear();
        objects = [obj1, { ...obj2, namespaces: ['some-other-ns'] }].map((obj) => ({
          ...obj,
          type: MULTI_NAMESPACE_ISOLATED_TYPE,
        }));
        await bulkGetSuccess(client, repository, registry, objects, { namespace });
        _expectClientCallArgs(objects, { getId });
      });
    });

    describe('errors', () => {
      const bulkGetError = async (
        obj: SavedObjectsBulkGetObject & { found?: boolean },
        isBulkError: boolean,
        expectedErrorResult: ExpectedErrorResult
      ) => {
        let response;
        if (isBulkError) {
          // mock the bulk error for only the second object
          mockGetBulkOperationError.mockReturnValueOnce(undefined);
          mockGetBulkOperationError.mockReturnValueOnce(expectedErrorResult.error as Payload);
          response = getMockMgetResponse(registry, [obj1, obj, obj2]);
        } else {
          response = getMockMgetResponse(registry, [obj1, obj2]);
        }
        client.mget.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );

        const objects = [obj1, obj, obj2];
        const result = await bulkGet(repository, objects);
        expect(client.mget).toHaveBeenCalled();
        expect(result).toEqual({
          saved_objects: [expectSuccess(obj1), expectedErrorResult, expectSuccess(obj2)],
        });
      };

      it(`throws when options.namespace is '*'`, async () => {
        const obj = { type: 'dashboard', id: 'three' };
        await expect(
          repository.bulkGet([obj], { namespace: ALL_NAMESPACES_STRING })
        ).rejects.toThrowError(createBadRequestErrorPayload('"options.namespace" cannot be "*"'));
      });

      it(`returns error when namespaces is used with a space-agnostic object`, async () => {
        const obj = { type: NAMESPACE_AGNOSTIC_TYPE, id: 'three', namespaces: [] };
        await bulkGetError(
          obj,
          false,
          expectErrorResult(
            obj,
            createBadRequestErrorPayload('"namespaces" cannot be used on space-agnostic types')
          )
        );
      });

      it(`returns error when namespaces is used with a space-isolated object and does not specify a single space`, async () => {
        const doTest = async (objType: string, namespaces?: string[]) => {
          const obj = { type: objType, id: 'three', namespaces };
          await bulkGetError(
            obj,
            false,
            expectErrorResult(
              obj,
              createBadRequestErrorPayload(
                '"namespaces" can only specify a single space when used with space-isolated types'
              )
            )
          );
        };
        await doTest('dashboard', ['spacex', 'spacey']);
        await doTest('dashboard', ['*']);
        await doTest(MULTI_NAMESPACE_ISOLATED_TYPE, ['spacex', 'spacey']);
        await doTest(MULTI_NAMESPACE_ISOLATED_TYPE, ['*']);
      });

      it(`returns error when type is invalid`, async () => {
        const obj: SavedObjectsBulkGetObject = { type: 'unknownType', id: 'three' };
        await bulkGetError(obj, false, expectErrorInvalidType(obj));
      });

      it(`returns error when type is hidden`, async () => {
        const obj: SavedObjectsBulkGetObject = { type: HIDDEN_TYPE, id: 'three' };
        await bulkGetError(obj, false, expectErrorInvalidType(obj));
      });

      it(`returns error when document is not found`, async () => {
        const obj: SavedObjectsBulkGetObject & { found: boolean } = {
          type: 'dashboard',
          id: 'three',
          found: false,
        };
        await bulkGetError(obj, true, expectErrorNotFound(obj));
      });

      it(`handles missing ids gracefully`, async () => {
        const obj: SavedObjectsBulkGetObject & { found: boolean } = {
          type: 'dashboard',
          // @ts-expect-error id is undefined
          id: undefined,
          found: false,
        };
        await bulkGetError(obj, true, expectErrorNotFound(obj));
      });

      it(`returns error when type is multi-namespace and the document exists, but not in this namespace`, async () => {
        const obj = {
          type: MULTI_NAMESPACE_ISOLATED_TYPE,
          id: 'three',
          namespace: 'bar-namespace',
        };
        await bulkGetError(obj, true, expectErrorNotFound(obj));
      });
    });

    describe('returns', () => {
      const expectSuccessResult = (
        { type, id }: TypeIdTuple,
        doc: estypes.GetGetResult<SavedObjectsRawDocSource>
      ) => ({
        type,
        id,
        namespaces: doc._source!.namespaces ?? ['default'],
        ...(doc._source!.originId && { originId: doc._source!.originId }),
        ...(doc._source!.updated_at && { updated_at: doc._source!.updated_at }),
        ...(doc._source!.created_at && { created_at: doc._source!.created_at }),
        version: encodeHitVersion(doc),
        attributes: doc._source![type],
        references: doc._source!.references || [],
        coreMigrationVersion: expect.any(String),
        typeMigrationVersion: expect.any(String),
        managed: expect.any(Boolean),
      });

      it(`returns early for empty objects argument`, async () => {
        const result = await bulkGet(repository, []);
        expect(result).toEqual({ saved_objects: [] });
        expect(client.mget).not.toHaveBeenCalled();
      });

      it(`formats the ES response`, async () => {
        const response = getMockMgetResponse(registry, [obj1, obj2]);
        client.mget.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        const result = await bulkGet(repository, [obj1, obj2]);
        expect(client.mget).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
          saved_objects: [
            expectSuccessResult(
              obj1,
              response.docs[0] as estypes.GetGetResult<SavedObjectsRawDocSource>
            ),
            expectSuccessResult(
              obj2,
              response.docs[1] as estypes.GetGetResult<SavedObjectsRawDocSource>
            ),
          ],
        });
      });

      it(`handles a mix of successful gets and errors`, async () => {
        const response = getMockMgetResponse(registry, [obj1, obj2]);
        client.mget.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        const obj: SavedObject = {
          type: 'unknownType',
          id: 'three',
          attributes: {},
          references: [],
        };
        const result = await bulkGet(repository, [obj1, obj, obj2]);
        expect(client.mget).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
          saved_objects: [
            expectSuccessResult(
              obj1,
              response.docs[0] as estypes.GetGetResult<SavedObjectsRawDocSource>
            ),
            expectError(obj),
            expectSuccessResult(
              obj2,
              response.docs[1] as estypes.GetGetResult<SavedObjectsRawDocSource>
            ),
          ],
        });
      });

      it(`includes namespaces property for single-namespace and multi-namespace documents`, async () => {
        const obj: SavedObject = {
          type: MULTI_NAMESPACE_ISOLATED_TYPE,
          id: 'three',
          attributes: {},
          references: [],
        };
        const { result } = await bulkGetSuccess(client, repository, registry, [obj1, obj]);
        expect(result).toEqual({
          saved_objects: [
            expect.objectContaining({ namespaces: ['default'] }),
            expect.objectContaining({ namespaces: expect.any(Array) }),
          ],
        });
      });

      it('migrates the fetched documents', async () => {
        const response = getMockMgetResponse(registry, [obj1, obj2]);
        client.mget.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        migrator.migrateDocument.mockReturnValue(
          'migrated' as unknown as ReturnType<typeof migrator.migrateDocument>
        );

        await expect(bulkGet(repository, [obj1, obj2])).resolves.toHaveProperty('saved_objects', [
          'migrated',
          'migrated',
        ]);
        expect(migrator.migrateDocument).toHaveBeenCalledTimes(2);
        expectMigrationArgs({ id: obj1.id }, true, 1);
        expectMigrationArgs({ id: obj2.id }, true, 2);
      });
    });

    describe('security', () => {
      it('correctly passes params to securityExtension.authorizeBulkGet', async () => {
        const response = getMockMgetResponse(registry, [obj1, obj2]);
        client.mget.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );

        await bulkGet(repository, [obj1, obj2]);

        expect(securityExtension.authorizeBulkGet).toHaveBeenCalledWith(
          expect.objectContaining({
            objects: expect.arrayContaining([
              expect.objectContaining({
                id: '6.0.0-alpha1',
                name: 'Testing',
              }),
              expect.objectContaining({
                id: 'logstash-*',
                name: 'Testing',
              }),
            ]),
          })
        );
      });
    });
  });
});
