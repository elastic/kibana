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
  mockCollectMultiNamespaceReferences,
  mockGetBulkOperationError,
  mockInternalBulkResolve,
  mockUpdateObjectsSpaces,
  mockGetCurrentTime,
  mockPreflightCheckForCreate,
  mockDeleteLegacyUrlAliases,
  mockGetSearchDsl,
} from './repository.test.mock';

import type { Payload } from '@hapi/boom';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type {
  SavedObjectsBaseOptions,
  SavedObjectsFindOptions,
  SavedObjectsUpdateObjectsSpacesResponse,
  SavedObjectsDeleteByNamespaceOptions,
  SavedObjectsIncrementCounterField,
  SavedObjectsIncrementCounterOptions,
  SavedObjectsCreatePointInTimeFinderDependencies,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsCreateOptions,
  SavedObjectsDeleteOptions,
  SavedObjectsOpenPointInTimeOptions,
  SavedObjectsResolveResponse,
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateObjectsSpacesOptions,
  SavedObjectsBulkDeleteObject,
  SavedObjectsBulkDeleteOptions,
} from '@kbn/core-saved-objects-api-server';
import type {
  SavedObjectsRawDoc,
  SavedObjectsRawDocSource,
  SavedObjectUnsanitizedDoc,
  SavedObject,
  SavedObjectReference,
  BulkResolveError,
} from '@kbn/core-saved-objects-server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { SavedObjectsRepository } from './repository';
import { PointInTimeFinder } from './point_in_time_finder';
import { loggerMock } from '@kbn/logging-mocks';
import {
  SavedObjectsSerializer,
  encodeHitVersion,
  LEGACY_URL_ALIAS_TYPE,
} from '@kbn/core-saved-objects-base-server-internal';
import { kibanaMigratorMock } from '../mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import * as esKuery from '@kbn/es-query';
import { errors as EsErrors } from '@elastic/elasticsearch';

import {
  CUSTOM_INDEX_TYPE,
  NAMESPACE_AGNOSTIC_TYPE,
  MULTI_NAMESPACE_TYPE,
  MULTI_NAMESPACE_ISOLATED_TYPE,
  HIDDEN_TYPE,
  mockVersionProps,
  mockTimestampFields,
  mockTimestamp,
  mappings,
  mockVersion,
  bulkGetSuccess,
  createRegistry,
  createDocumentMigrator,
  getMockGetResponse,
  getMockMgetResponse,
  type TypeIdTuple,
  createSpySerializer,
  bulkCreateSuccess,
  bulkUpdateSuccess,
  getMockBulkCreateResponse,
  bulkGet,
  getMockBulkUpdateResponse,
  updateSuccess,
  mockUpdateResponse,
  expectErrorResult,
  expectErrorInvalidType,
  expectErrorNotFound,
  expectErrorConflict,
  expectError,
  generateIndexPatternSearchResults,
  findSuccess,
  deleteSuccess,
  removeReferencesToSuccess,
  checkConflicts,
  checkConflictsSuccess,
  getSuccess,
  createBadRequestErrorPayload,
  createUnsupportedTypeErrorPayload,
  createConflictErrorPayload,
  createGenericNotFoundErrorPayload,
  expectCreateResult,
  expectUpdateResult,
  mockTimestampFieldsWithCreated,
  getMockEsBulkDeleteResponse,
  bulkDeleteSuccess,
  createBulkDeleteSuccessStatus,
} from '../test_helpers/repository.test.common';

const { nodeTypes } = esKuery;

// BEWARE: The SavedObjectClient depends on the implementation details of the SavedObjectsRepository
// so any breaking changes to this repository are considered breaking changes to the SavedObjectsClient.

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

  const expectMigrationArgs = (args: unknown, contains = true, n = 1) => {
    const obj = contains ? expect.objectContaining(args) : expect.not.objectContaining(args);
    expect(migrator.migrateDocument).toHaveBeenNthCalledWith(n, obj);
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

  const mockMigrationVersion = { foo: '2.3.4' };
  const mockMigrateDocument = (doc: SavedObjectUnsanitizedDoc<any>) => ({
    ...doc,
    attributes: {
      ...doc.attributes,
      ...(doc.attributes?.title && { title: `${doc.attributes.title}!!` }),
    },
    migrationVersion: mockMigrationVersion,
    references: [{ name: 'search_0', type: 'search', id: '123' }],
  });

  describe('#bulkCreate', () => {
    beforeEach(() => {
      mockPreflightCheckForCreate.mockReset();
      mockPreflightCheckForCreate.mockImplementation(({ objects }) => {
        return Promise.resolve(objects.map(({ type, id }) => ({ type, id }))); // respond with no errors by default
      });
    });

    const obj1 = {
      type: 'config',
      id: '6.0.0-alpha1',
      attributes: { title: 'Test One' },
      references: [{ name: 'ref_0', type: 'test', id: '1' }],
    };
    const obj2 = {
      type: 'index-pattern',
      id: 'logstash-*',
      attributes: { title: 'Test Two' },
      references: [{ name: 'ref_0', type: 'test', id: '2' }],
    };
    const namespace = 'foo-namespace';

    // bulk create calls have two objects for each source -- the action, and the source
    const expectClientCallArgsAction = (
      objects: Array<{ type: string; id?: string; if_primary_term?: string; if_seq_no?: string }>,
      {
        method,
        _index = expect.any(String),
        getId = () => expect.any(String),
      }: { method: string; _index?: string; getId?: (type: string, id?: string) => string }
    ) => {
      const body = [];
      for (const { type, id, if_primary_term: ifPrimaryTerm, if_seq_no: ifSeqNo } of objects) {
        body.push({
          [method]: {
            _index,
            _id: getId(type, id),
            ...(ifPrimaryTerm && ifSeqNo
              ? { if_primary_term: expect.any(Number), if_seq_no: expect.any(Number) }
              : {}),
          },
        });
        body.push(expect.any(Object));
      }
      expect(client.bulk).toHaveBeenCalledWith(
        expect.objectContaining({ body }),
        expect.anything()
      );
    };

    const expectObjArgs = (
      {
        type,
        attributes,
        references,
      }: { type: string; attributes: unknown; references?: SavedObjectReference[] },
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
        await bulkCreateSuccess(client, repository, [obj1, obj2]);
        expect(client.bulk).toHaveBeenCalledTimes(1);
      });

      it(`should use the preflightCheckForCreate action before bulk action for any types that are multi-namespace, when id is defined`, async () => {
        const objects = [obj1, { ...obj2, type: MULTI_NAMESPACE_ISOLATED_TYPE }];
        await bulkCreateSuccess(client, repository, objects);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expect(mockPreflightCheckForCreate).toHaveBeenCalledTimes(1);
        expect(mockPreflightCheckForCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            objects: [
              {
                type: MULTI_NAMESPACE_ISOLATED_TYPE,
                id: obj2.id,
                overwrite: false,
                namespaces: ['default'],
              },
            ],
          })
        );
      });

      it(`should use the ES create method if ID is undefined and overwrite=true`, async () => {
        const objects = [obj1, obj2].map((obj) => ({ ...obj, id: undefined }));
        await bulkCreateSuccess(client, repository, objects, { overwrite: true });
        expectClientCallArgsAction(objects, { method: 'create' });
      });

      it(`should use the ES create method if ID is undefined and overwrite=false`, async () => {
        const objects = [obj1, obj2].map((obj) => ({ ...obj, id: undefined }));
        await bulkCreateSuccess(client, repository, objects);
        expectClientCallArgsAction(objects, { method: 'create' });
      });

      it(`should use the ES index method if ID is defined and overwrite=true`, async () => {
        await bulkCreateSuccess(client, repository, [obj1, obj2], { overwrite: true });
        expectClientCallArgsAction([obj1, obj2], { method: 'index' });
      });

      it(`should use the ES index method with version if ID and version are defined and overwrite=true`, async () => {
        await bulkCreateSuccess(
          client,
          repository,
          [
            {
              ...obj1,
              version: mockVersion,
            },
            obj2,
          ],
          { overwrite: true }
        );

        const obj1WithSeq = {
          ...obj1,
          if_seq_no: mockVersionProps._seq_no,
          if_primary_term: mockVersionProps._primary_term,
        };

        expectClientCallArgsAction([obj1WithSeq, obj2], { method: 'index' });
      });

      it(`should use the ES create method if ID is defined and overwrite=false`, async () => {
        await bulkCreateSuccess(client, repository, [obj1, obj2]);
        expectClientCallArgsAction([obj1, obj2], { method: 'create' });
      });

      it(`formats the ES request`, async () => {
        await bulkCreateSuccess(client, repository, [obj1, obj2]);
        const body = [...expectObjArgs(obj1), ...expectObjArgs(obj2)];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body }),
          expect.anything()
        );
      });

      describe('originId', () => {
        it(`returns error if originId is set for non-multi-namespace type`, async () => {
          const result = await repository.bulkCreate([
            { ...obj1, originId: 'some-originId' },
            { ...obj2, type: NAMESPACE_AGNOSTIC_TYPE, originId: 'some-originId' },
          ]);
          expect(result.saved_objects).toEqual([
            expect.objectContaining({ id: obj1.id, type: obj1.type, error: expect.anything() }),
            expect.objectContaining({
              id: obj2.id,
              type: NAMESPACE_AGNOSTIC_TYPE,
              error: expect.anything(),
            }),
          ]);
          expect(client.bulk).not.toHaveBeenCalled();
        });

        it(`defaults to no originId`, async () => {
          const objects = [
            { ...obj1, type: MULTI_NAMESPACE_TYPE },
            { ...obj2, type: MULTI_NAMESPACE_ISOLATED_TYPE },
          ];

          await bulkCreateSuccess(client, repository, objects);
          const expected = expect.not.objectContaining({ originId: expect.anything() });
          const body = [expect.any(Object), expected, expect.any(Object), expected];
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({ body }),
            expect.anything()
          );
        });

        describe('with existing originId', () => {
          beforeEach(() => {
            mockPreflightCheckForCreate.mockImplementation(({ objects }) => {
              const existingDocument = {
                _source: { originId: 'existing-originId' },
              } as SavedObjectsRawDoc;
              return Promise.resolve(
                objects.map(({ type, id }) => ({ type, id, existingDocument }))
              );
            });
          });

          it(`accepts custom originId for multi-namespace type`, async () => {
            // The preflight result has `existing-originId`, but that is discarded
            const objects = [
              { ...obj1, type: MULTI_NAMESPACE_TYPE, originId: 'some-originId' },
              { ...obj2, type: MULTI_NAMESPACE_ISOLATED_TYPE, originId: 'some-originId' },
            ];
            await bulkCreateSuccess(client, repository, objects);
            const expected = expect.objectContaining({ originId: 'some-originId' });
            const body = [expect.any(Object), expected, expect.any(Object), expected];
            expect(client.bulk).toHaveBeenCalledWith(
              expect.objectContaining({ body }),
              expect.anything()
            );
          });

          it(`accepts undefined originId`, async () => {
            // The preflight result has `existing-originId`, but that is discarded
            const objects = [
              { ...obj1, type: MULTI_NAMESPACE_TYPE, originId: undefined },
              { ...obj2, type: MULTI_NAMESPACE_ISOLATED_TYPE, originId: undefined },
            ];
            await bulkCreateSuccess(client, repository, objects);
            const expected = expect.not.objectContaining({ originId: expect.anything() });
            const body = [expect.any(Object), expected, expect.any(Object), expected];
            expect(client.bulk).toHaveBeenCalledWith(
              expect.objectContaining({ body }),
              expect.anything()
            );
          });

          it(`preserves existing originId if originId option is not set`, async () => {
            const objects = [
              { ...obj1, type: MULTI_NAMESPACE_TYPE },
              { ...obj2, type: MULTI_NAMESPACE_ISOLATED_TYPE },
            ];
            await bulkCreateSuccess(client, repository, objects);
            const expected = expect.objectContaining({ originId: 'existing-originId' });
            const body = [expect.any(Object), expected, expect.any(Object), expected];
            expect(client.bulk).toHaveBeenCalledWith(
              expect.objectContaining({ body }),
              expect.anything()
            );
          });
        });
      });

      it(`adds namespace to request body for any types that are single-namespace`, async () => {
        await bulkCreateSuccess(client, repository, [obj1, obj2], { namespace });
        const expected = expect.objectContaining({ namespace });
        const body = [expect.any(Object), expected, expect.any(Object), expected];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body }),
          expect.anything()
        );
      });

      it(`normalizes options.namespace from 'default' to undefined`, async () => {
        await bulkCreateSuccess(client, repository, [obj1, obj2], { namespace: 'default' });
        const expected = expect.not.objectContaining({ namespace: 'default' });
        const body = [expect.any(Object), expected, expect.any(Object), expected];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body }),
          expect.anything()
        );
      });

      it(`doesn't add namespace to request body for any types that are not single-namespace`, async () => {
        const objects = [
          { ...obj1, type: NAMESPACE_AGNOSTIC_TYPE },
          { ...obj2, type: MULTI_NAMESPACE_ISOLATED_TYPE },
        ];
        await bulkCreateSuccess(client, repository, objects, { namespace });
        const expected = expect.not.objectContaining({ namespace: expect.anything() });
        const body = [expect.any(Object), expected, expect.any(Object), expected];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body }),
          expect.anything()
        );
      });

      it(`adds namespaces to request body for any types that are multi-namespace`, async () => {
        const test = async (namespace?: string) => {
          const objects = [obj1, obj2].map((x) => ({ ...x, type: MULTI_NAMESPACE_ISOLATED_TYPE }));
          const [o1, o2] = objects;
          mockPreflightCheckForCreate.mockResolvedValueOnce([
            { type: o1.type, id: o1.id! }, // first object does not have an existing document to overwrite
            {
              type: o2.type,
              id: o2.id!,
              existingDocument: { _id: o2.id!, _source: { namespaces: ['*'], type: o2.type } }, // second object does have an existing document to overwrite
            },
          ]);
          await bulkCreateSuccess(client, repository, objects, { namespace, overwrite: true });
          const expected1 = expect.objectContaining({ namespaces: [namespace ?? 'default'] });
          const expected2 = expect.objectContaining({ namespaces: ['*'] });
          const body = [expect.any(Object), expected1, expect.any(Object), expected2];
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({ body }),
            expect.anything()
          );
          client.bulk.mockClear();
          mockPreflightCheckForCreate.mockReset();
        };
        await test(undefined);
        await test(namespace);
      });

      it(`adds initialNamespaces instead of namespace`, async () => {
        const test = async (namespace?: string) => {
          const ns2 = 'bar-namespace';
          const ns3 = 'baz-namespace';
          const objects = [
            { ...obj1, type: 'dashboard', initialNamespaces: [ns2] },
            { ...obj1, type: MULTI_NAMESPACE_ISOLATED_TYPE, initialNamespaces: [ns2] },
            { ...obj1, type: MULTI_NAMESPACE_TYPE, initialNamespaces: [ns2, ns3] },
          ];
          const [o1, o2, o3] = objects;
          mockPreflightCheckForCreate.mockResolvedValueOnce([
            // first object does not get passed in to preflightCheckForCreate at all
            { type: o2.type, id: o2.id! }, // second object does not have an existing document to overwrite
            {
              type: o3.type,
              id: o3.id!,
              existingDocument: {
                _id: o3.id!,
                _source: { type: o3.type, namespaces: [namespace ?? 'default', 'something-else'] }, // third object does have an existing document to overwrite
              },
            },
          ]);
          await bulkCreateSuccess(client, repository, objects, { namespace, overwrite: true });
          const body = [
            { index: expect.objectContaining({ _id: `${ns2}:dashboard:${o1.id}` }) },
            expect.objectContaining({ namespace: ns2 }),
            {
              index: expect.objectContaining({
                _id: `${MULTI_NAMESPACE_ISOLATED_TYPE}:${o2.id}`,
              }),
            },
            expect.objectContaining({ namespaces: [ns2] }),
            { index: expect.objectContaining({ _id: `${MULTI_NAMESPACE_TYPE}:${o3.id}` }) },
            expect.objectContaining({ namespaces: [ns2, ns3] }),
          ];
          expect(mockPreflightCheckForCreate).toHaveBeenCalledWith(
            expect.objectContaining({
              objects: [
                // assert that the initialNamespaces fields were passed into preflightCheckForCreate instead of the current namespace
                { type: o2.type, id: o2.id, overwrite: true, namespaces: o2.initialNamespaces },
                { type: o3.type, id: o3.id, overwrite: true, namespaces: o3.initialNamespaces },
              ],
            })
          );
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({ body }),
            expect.anything()
          );
          client.bulk.mockClear();
          mockPreflightCheckForCreate.mockReset();
        };
        await test(undefined);
        await test(namespace);
      });

      it(`normalizes initialNamespaces from 'default' to undefined`, async () => {
        const test = async (namespace?: string) => {
          const objects = [{ ...obj1, type: 'dashboard', initialNamespaces: ['default'] }];
          await bulkCreateSuccess(client, repository, objects, { namespace, overwrite: true });
          const body = [
            { index: expect.objectContaining({ _id: `dashboard:${obj1.id}` }) },
            expect.not.objectContaining({ namespace: 'default' }),
          ];
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({ body }),
            expect.anything()
          );
          client.bulk.mockClear();
        };
        await test(undefined);
        await test(namespace);
      });

      it(`doesn't add namespaces to request body for any types that are not multi-namespace`, async () => {
        const test = async (namespace?: string) => {
          const objects = [obj1, { ...obj2, type: NAMESPACE_AGNOSTIC_TYPE }];
          await bulkCreateSuccess(client, repository, objects, { namespace, overwrite: true });
          const expected = expect.not.objectContaining({ namespaces: expect.anything() });
          const body = [expect.any(Object), expected, expect.any(Object), expected];
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({ body }),
            expect.anything()
          );
          client.bulk.mockClear();
        };
        await test(undefined);
        await test(namespace);
      });

      it(`defaults to a refresh setting of wait_for`, async () => {
        await bulkCreateSuccess(client, repository, [obj1, obj2]);
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ refresh: 'wait_for' }),
          expect.anything()
        );
      });

      it(`should use default index`, async () => {
        await bulkCreateSuccess(client, repository, [obj1, obj2]);
        expectClientCallArgsAction([obj1, obj2], {
          method: 'create',
          _index: '.kibana-test_8.0.0-testing',
        });
      });

      it(`should use custom index`, async () => {
        await bulkCreateSuccess(
          client,
          repository,
          [obj1, obj2].map((x) => ({ ...x, type: CUSTOM_INDEX_TYPE }))
        );
        expectClientCallArgsAction([obj1, obj2], {
          method: 'create',
          _index: 'custom_8.0.0-testing',
        });
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        const getId = (type: string, id: string = '') => `${namespace}:${type}:${id}`; // test that the raw document ID equals this (e.g., has a namespace prefix)
        await bulkCreateSuccess(client, repository, [obj1, obj2], { namespace });
        expectClientCallArgsAction([obj1, obj2], { method: 'create', getId });
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        const getId = (type: string, id: string = '') => `${type}:${id}`; // test that the raw document ID equals this (e.g., does not have a namespace prefix)
        await bulkCreateSuccess(client, repository, [obj1, obj2]);
        expectClientCallArgsAction([obj1, obj2], { method: 'create', getId });
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        const getId = (type: string, id: string = '') => `${type}:${id}`; // test that the raw document ID equals this (e.g., does not have a namespace prefix)
        const objects = [
          { ...obj1, type: NAMESPACE_AGNOSTIC_TYPE },
          { ...obj2, type: MULTI_NAMESPACE_ISOLATED_TYPE },
        ];
        await bulkCreateSuccess(client, repository, objects, { namespace });
        expectClientCallArgsAction(objects, { method: 'create', getId });
      });
    });

    describe('errors', () => {
      afterEach(() => {
        mockGetBulkOperationError.mockReset();
      });

      const obj3 = {
        type: 'dashboard',
        id: 'three',
        attributes: { title: 'Test Three' },
        references: [{ name: 'ref_0', type: 'test', id: '2' }],
      };

      const bulkCreateError = async (
        obj: SavedObjectsBulkCreateObject,
        isBulkError: boolean | undefined,
        expectedErrorResult: ExpectedErrorResult
      ) => {
        let response;
        if (isBulkError) {
          // mock the bulk error for only the second object
          mockGetBulkOperationError.mockReturnValueOnce(undefined);
          mockGetBulkOperationError.mockReturnValueOnce(expectedErrorResult.error as Payload);
          response = getMockBulkCreateResponse([obj1, obj, obj2]);
        } else {
          response = getMockBulkCreateResponse([obj1, obj2]);
        }
        client.bulk.mockResponseOnce(response);

        const objects = [obj1, obj, obj2];
        const result = await repository.bulkCreate(objects);
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

      it(`throws when options.namespace is '*'`, async () => {
        await expect(
          repository.bulkCreate([obj3], { namespace: ALL_NAMESPACES_STRING })
        ).rejects.toThrowError(createBadRequestErrorPayload('"options.namespace" cannot be "*"'));
      });

      it(`returns error when initialNamespaces is used with a space-agnostic object`, async () => {
        const obj = { ...obj3, type: NAMESPACE_AGNOSTIC_TYPE, initialNamespaces: [] };
        await bulkCreateError(
          obj,
          undefined,
          expectErrorResult(
            obj,
            createBadRequestErrorPayload(
              '"initialNamespaces" cannot be used on space-agnostic types'
            )
          )
        );
      });

      it(`returns error when initialNamespaces is empty`, async () => {
        const obj = { ...obj3, type: MULTI_NAMESPACE_TYPE, initialNamespaces: [] };
        await bulkCreateError(
          obj,
          undefined,
          expectErrorResult(
            obj,
            createBadRequestErrorPayload('"initialNamespaces" must be a non-empty array of strings')
          )
        );
      });

      it(`returns error when initialNamespaces is used with a space-isolated object and does not specify a single space`, async () => {
        const doTest = async (objType: string, initialNamespaces: string[]) => {
          const obj = { ...obj3, type: objType, initialNamespaces };
          await bulkCreateError(
            obj,
            undefined,
            expectErrorResult(
              obj,
              createBadRequestErrorPayload(
                '"initialNamespaces" can only specify a single space when used with space-isolated types'
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
        const obj = { ...obj3, type: 'unknownType' };
        await bulkCreateError(obj, undefined, expectErrorInvalidType(obj));
      });

      it(`returns error when type is hidden`, async () => {
        const obj = { ...obj3, type: HIDDEN_TYPE };
        await bulkCreateError(obj, undefined, expectErrorInvalidType(obj));
      });

      it(`returns error when there is a conflict from preflightCheckForCreate`, async () => {
        const objects = [
          // only the second, third, and fourth objects are passed to preflightCheckForCreate and result in errors
          obj1,
          { ...obj1, type: MULTI_NAMESPACE_TYPE },
          { ...obj2, type: MULTI_NAMESPACE_TYPE },
          { ...obj3, type: MULTI_NAMESPACE_TYPE },
          obj2,
        ];
        const [o1, o2, o3, o4, o5] = objects;
        mockPreflightCheckForCreate.mockResolvedValueOnce([
          // first and last objects do not get passed in to preflightCheckForCreate at all
          { type: o2.type, id: o2.id!, error: { type: 'conflict' } },
          {
            type: o3.type,
            id: o3.id!,
            error: { type: 'unresolvableConflict', metadata: { isNotOverwritable: true } },
          },
          {
            type: o4.type,
            id: o4.id!,
            error: { type: 'aliasConflict', metadata: { spacesWithConflictingAliases: ['foo'] } },
          },
        ]);
        const bulkResponse = getMockBulkCreateResponse([o1, o5]);
        client.bulk.mockResponseOnce(bulkResponse);

        const options = { overwrite: true };
        const result = await repository.bulkCreate(objects, options);
        expect(mockPreflightCheckForCreate).toHaveBeenCalled();
        expect(mockPreflightCheckForCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            objects: [
              { type: o2.type, id: o2.id, overwrite: true, namespaces: ['default'] },
              { type: o3.type, id: o3.id, overwrite: true, namespaces: ['default'] },
              { type: o4.type, id: o4.id, overwrite: true, namespaces: ['default'] },
            ],
          })
        );
        expect(client.bulk).toHaveBeenCalled();
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body: [...expectObjArgs(o1), ...expectObjArgs(o5)] }),
          expect.anything()
        );
        expect(result).toEqual({
          saved_objects: [
            expectSuccess(o1),
            expectErrorConflict(o2),
            expectErrorConflict(o3, { metadata: { isNotOverwritable: true } }),
            expectErrorConflict(o4, { metadata: { spacesWithConflictingAliases: ['foo'] } }),
            expectSuccess(o5),
          ],
        });
      });

      it(`returns bulk error`, async () => {
        const expectedErrorResult = {
          type: obj3.type,
          id: obj3.id,
          error: { error: 'Oh no, a bulk error!' },
        };
        await bulkCreateError(obj3, true, expectedErrorResult);
      });

      it(`returns errors for any bulk objects with invalid schemas`, async () => {
        const response = getMockBulkCreateResponse([obj3]);
        client.bulk.mockResponseOnce(response);

        const result = await repository.bulkCreate([
          obj3,
          // @ts-expect-error - Title should be a string and is intentionally malformed for testing
          { ...obj3, id: 'three-again', attributes: { title: 123 } },
        ]);
        expect(client.bulk).toHaveBeenCalledTimes(1); // only called once for the valid object
        expect(result.saved_objects).toEqual([
          expect.objectContaining(obj3),
          expect.objectContaining({
            error: new Error(
              '[attributes.title]: expected value of type [string] but got [number]: Bad Request'
            ),
            id: 'three-again',
            type: 'dashboard',
          }),
        ]);
      });
    });

    describe('migration', () => {
      it(`migrates the docs and serializes the migrated docs`, async () => {
        migrator.migrateDocument.mockImplementation(mockMigrateDocument);
        const modifiedObj1 = { ...obj1, coreMigrationVersion: '8.0.0' };

        await bulkCreateSuccess(client, repository, [modifiedObj1, obj2]);
        const docs = [modifiedObj1, obj2].map((x) => ({ ...x, ...mockTimestampFieldsWithCreated }));

        expectMigrationArgs(docs[0], true, 1);
        expectMigrationArgs(docs[1], true, 2);

        const migratedDocs = docs.map((x) => migrator.migrateDocument(x));
        expect(serializer.savedObjectToRaw).toHaveBeenNthCalledWith(1, migratedDocs[0]);
        expect(serializer.savedObjectToRaw).toHaveBeenNthCalledWith(2, migratedDocs[1]);
      });

      it(`adds namespace to body when providing namespace for single-namespace type`, async () => {
        await bulkCreateSuccess(client, repository, [obj1, obj2], { namespace });
        expectMigrationArgs({ namespace }, true, 1);
        expectMigrationArgs({ namespace }, true, 2);
      });

      it(`doesn't add namespace to body when providing no namespace for single-namespace type`, async () => {
        await bulkCreateSuccess(client, repository, [obj1, obj2]);
        expectMigrationArgs({ namespace: expect.anything() }, false, 1);
        expectMigrationArgs({ namespace: expect.anything() }, false, 2);
      });

      it(`doesn't add namespace to body when not using single-namespace type`, async () => {
        const objects = [
          { ...obj1, type: NAMESPACE_AGNOSTIC_TYPE },
          { ...obj2, type: MULTI_NAMESPACE_ISOLATED_TYPE },
        ];
        await bulkCreateSuccess(client, repository, objects, { namespace });
        expectMigrationArgs({ namespace: expect.anything() }, false, 1);
        expectMigrationArgs({ namespace: expect.anything() }, false, 2);
      });

      it(`adds namespaces to body when providing namespace for multi-namespace type`, async () => {
        const objects = [obj1, obj2].map((obj) => ({
          ...obj,
          type: MULTI_NAMESPACE_ISOLATED_TYPE,
        }));
        await bulkCreateSuccess(client, repository, objects, { namespace });
        expectMigrationArgs({ namespaces: [namespace] }, true, 1);
        expectMigrationArgs({ namespaces: [namespace] }, true, 2);
      });

      it(`adds default namespaces to body when providing no namespace for multi-namespace type`, async () => {
        const objects = [obj1, obj2].map((obj) => ({
          ...obj,
          type: MULTI_NAMESPACE_ISOLATED_TYPE,
        }));
        await bulkCreateSuccess(client, repository, objects);
        expectMigrationArgs({ namespaces: ['default'] }, true, 1);
        expectMigrationArgs({ namespaces: ['default'] }, true, 2);
      });

      it(`doesn't add namespaces to body when not using multi-namespace type`, async () => {
        const objects = [obj1, { ...obj2, type: NAMESPACE_AGNOSTIC_TYPE }];
        await bulkCreateSuccess(client, repository, objects);
        expectMigrationArgs({ namespaces: expect.anything() }, false, 1);
        expectMigrationArgs({ namespaces: expect.anything() }, false, 2);
      });
    });

    describe('returns', () => {
      it(`formats the ES response`, async () => {
        const result = await bulkCreateSuccess(client, repository, [obj1, obj2]);
        expect(result).toEqual({
          saved_objects: [obj1, obj2].map((x) => expectCreateResult(x)),
        });
      });

      it.todo(`should return objects in the same order regardless of type`);

      it(`handles a mix of successful creates and errors`, async () => {
        const obj = {
          type: 'unknownType',
          id: 'three',
          attributes: {},
        };
        const objects = [obj1, obj, obj2];
        const response = getMockBulkCreateResponse([obj1, obj2]);
        client.bulk.mockResponseOnce(response);
        const result = await repository.bulkCreate(objects);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
          saved_objects: [expectCreateResult(obj1), expectError(obj), expectCreateResult(obj2)],
        });
      });

      it(`a deserialized saved object`, async () => {
        // Test for fix to https://github.com/elastic/kibana/issues/65088 where
        // we returned raw ID's when an object without an id was created.
        const namespace = 'myspace';
        // FIXME: this test is based on a gigantic hack to have the bulk operation return the source
        //        of the document when it actually does not, forcing to cast to any as BulkResponse
        //        does not contains _source
        const response = getMockBulkCreateResponse([obj1, obj2], namespace) as any;
        client.bulk.mockResponseOnce(response);

        // Bulk create one object with id unspecified, and one with id specified
        const result = await repository.bulkCreate([{ ...obj1, id: undefined }, obj2], {
          namespace,
        });

        // Assert that both raw docs from the ES response are deserialized
        expect(serializer.rawToSavedObject).toHaveBeenNthCalledWith(1, {
          ...response.items[0].create,
          _source: {
            ...response.items[0].create._source,
            namespaces: response.items[0].create._source.namespaces,
            coreMigrationVersion: expect.any(String),
            typeMigrationVersion: '1.1.1',
          },
          _id: expect.stringMatching(/^myspace:config:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/),
        });
        expect(serializer.rawToSavedObject).toHaveBeenNthCalledWith(2, {
          ...response.items[1].create,
          _source: {
            ...response.items[1].create._source,
            namespaces: response.items[1].create._source.namespaces,
            coreMigrationVersion: expect.any(String),
            typeMigrationVersion: '1.1.1',
          },
        });

        // Assert that ID's are deserialized to remove the type and namespace
        expect(result.saved_objects[0].id).toEqual(
          expect.stringMatching(/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/)
        );
        expect(result.saved_objects[1].id).toEqual(obj2.id);
      });
    });
  });

  describe('#bulkGet', () => {
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
          body: {
            docs: objects.map(({ type, id }) =>
              expect.objectContaining({
                _index,
                _id: getId(type, id),
              })
            ),
          },
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
        migrationVersion: doc._source!.migrationVersion,
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
    });
  });

  describe('#bulkResolve', () => {
    afterEach(() => {
      mockInternalBulkResolve.mockReset();
    });

    it('passes arguments to the internalBulkResolve module and returns the expected results', async () => {
      mockInternalBulkResolve.mockResolvedValue({
        resolved_objects: [
          {
            saved_object: { type: 'mock', id: 'mock-object', attributes: {}, references: [] },
            outcome: 'exactMatch',
          },
          {
            type: 'obj-type',
            id: 'obj-id-2',
            error: SavedObjectsErrorHelpers.createGenericNotFoundError('obj-type', 'obj-id-2'),
          },
        ],
      });

      const objects = [
        { type: 'obj-type', id: 'obj-id-1' },
        { type: 'obj-type', id: 'obj-id-2' },
      ];
      await expect(repository.bulkResolve(objects)).resolves.toEqual({
        resolved_objects: [
          {
            saved_object: { type: 'mock', id: 'mock-object', attributes: {}, references: [] },
            outcome: 'exactMatch',
          },
          {
            saved_object: {
              type: 'obj-type',
              id: 'obj-id-2',
              error: {
                error: 'Not Found',
                message: 'Saved object [obj-type/obj-id-2] not found',
                statusCode: 404,
              },
            },
            outcome: 'exactMatch',
          },
        ],
      });
      expect(mockInternalBulkResolve).toHaveBeenCalledTimes(1);
      expect(mockInternalBulkResolve).toHaveBeenCalledWith(expect.objectContaining({ objects }));
    });

    it('throws when internalBulkResolve throws', async () => {
      const error = new Error('Oh no!');
      mockInternalBulkResolve.mockRejectedValue(error);

      await expect(repository.resolve('some-type', 'some-id')).rejects.toEqual(error);
    });
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

  describe('#bulkDelete', () => {
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
      const body = [];
      for (const { type, id } of objects) {
        body.push({
          [method]: {
            _index,
            _id: getId(type, id),
            ...overrides,
          },
        });
      }

      expect(client.bulk).toHaveBeenCalledWith(
        expect.objectContaining({ body }),
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
      const body = [];
      for (const { type, id } of objects) {
        body.push({
          [method]: {
            _index,
            _id: getId(type, id),
            ...overrides,
          },
        });
      }
      expect(client.bulk).toHaveBeenCalledWith(
        expect.objectContaining({ body }),
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
          expect.objectContaining({ body: { docs } }),
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
          {} as estypes.MgetResponse,
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
          {} as estypes.MgetResponse,
          { statusCode: 404 }
        );
      });
    });
  });

  describe('#checkConflicts', () => {
    const obj1 = { type: 'dashboard', id: 'one' };
    const obj2 = { type: 'dashboard', id: 'two' };
    const obj3 = { type: MULTI_NAMESPACE_ISOLATED_TYPE, id: 'three' };
    const obj4 = { type: MULTI_NAMESPACE_ISOLATED_TYPE, id: 'four' };
    const obj5 = { type: MULTI_NAMESPACE_ISOLATED_TYPE, id: 'five' };
    const obj6 = { type: NAMESPACE_AGNOSTIC_TYPE, id: 'six' };
    const obj7 = { type: NAMESPACE_AGNOSTIC_TYPE, id: 'seven' };
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
          body: {
            docs: objects.map(({ type, id }) =>
              expect.objectContaining({
                _index,
                _id: getId(type, id),
              })
            ),
          },
        }),
        expect.anything()
      );
    };

    describe('client calls', () => {
      it(`doesn't make a cluster call if the objects array is empty`, async () => {
        await checkConflicts(repository, []);
        expect(client.mget).not.toHaveBeenCalled();
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        const getId = (type: string, id: string) => `${namespace}:${type}:${id}`; // test that the raw document ID equals this (e.g., has a namespace prefix)
        await checkConflictsSuccess(client, repository, registry, [obj1, obj2], { namespace });
        _expectClientCallArgs([obj1, obj2], { getId });
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        const getId = (type: string, id: string) => `${type}:${id}`; // test that the raw document ID equals this (e.g., does not have a namespace prefix)
        await checkConflictsSuccess(client, repository, registry, [obj1, obj2]);
        _expectClientCallArgs([obj1, obj2], { getId });
      });

      it(`normalizes options.namespace from 'default' to undefined`, async () => {
        const getId = (type: string, id: string) => `${type}:${id}`; // test that the raw document ID equals this (e.g., does not have a namespace prefix)
        await checkConflictsSuccess(client, repository, registry, [obj1, obj2], {
          namespace: 'default',
        });
        _expectClientCallArgs([obj1, obj2], { getId });
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        const getId = (type: string, id: string) => `${type}:${id}`; // test that the raw document ID equals this (e.g., does not have a namespace prefix)
        // obj3 is multi-namespace, and obj6 is namespace-agnostic
        await checkConflictsSuccess(client, repository, registry, [obj3, obj6], { namespace });
        _expectClientCallArgs([obj3, obj6], { getId });
      });
    });

    describe('errors', () => {
      it(`throws when options.namespace is '*'`, async () => {
        await expect(
          repository.checkConflicts([obj1], { namespace: ALL_NAMESPACES_STRING })
        ).rejects.toThrowError(createBadRequestErrorPayload('"options.namespace" cannot be "*"'));
      });
    });

    describe('returns', () => {
      it(`expected results`, async () => {
        const unknownTypeObj = { type: 'unknownType', id: 'three' };
        const hiddenTypeObj = { type: HIDDEN_TYPE, id: 'three' };
        const objects = [unknownTypeObj, hiddenTypeObj, obj1, obj2, obj3, obj4, obj5, obj6, obj7];
        const response = {
          docs: [
            getMockGetResponse(registry, obj1),
            { found: false },
            getMockGetResponse(registry, obj3),
            getMockGetResponse(registry, { ...obj4, namespace: 'bar-namespace' }),
            { found: false },
            getMockGetResponse(registry, obj6),
            { found: false },
          ],
        } as estypes.MgetResponse;
        client.mget.mockResolvedValue(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );

        const result = await checkConflicts(repository, objects);
        expect(client.mget).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
          errors: [
            { ...unknownTypeObj, error: createUnsupportedTypeErrorPayload(unknownTypeObj.type) },
            { ...hiddenTypeObj, error: createUnsupportedTypeErrorPayload(hiddenTypeObj.type) },
            { ...obj1, error: createConflictErrorPayload(obj1.type, obj1.id) },
            // obj2 was not found so it does not result in a conflict error
            { ...obj3, error: createConflictErrorPayload(obj3.type, obj3.id) },
            {
              ...obj4,
              error: {
                ...createConflictErrorPayload(obj4.type, obj4.id),
                metadata: { isNotOverwritable: true },
              },
            },
            // obj5 was not found so it does not result in a conflict error
            { ...obj6, error: createConflictErrorPayload(obj6.type, obj6.id) },
            // obj7 was not found so it does not result in a conflict error
          ],
        });
      });
    });
  });

  describe('#create', () => {
    beforeEach(() => {
      mockPreflightCheckForCreate.mockReset();
      mockPreflightCheckForCreate.mockImplementation(({ objects }) => {
        return Promise.resolve(objects.map(({ type, id }) => ({ type, id }))); // respond with no errors by default
      });
      client.create.mockResponseImplementation((params) => {
        return {
          body: {
            _id: params.id,
            ...mockVersionProps,
          } as estypes.CreateResponse,
        };
      });
    });

    const type = 'index-pattern';
    const attributes = { title: 'Logstash' };
    const id = 'logstash-*';
    const namespace = 'foo-namespace';
    const references = [
      {
        name: 'ref_0',
        type: 'test',
        id: '123',
      },
    ];

    const createSuccess = async <T>(
      type: string,
      attributes: T,
      options?: SavedObjectsCreateOptions
    ) => {
      return await repository.create(type, attributes, options);
    };

    describe('client calls', () => {
      it(`should use the ES index action if ID is not defined and overwrite=true`, async () => {
        await createSuccess(type, attributes, { overwrite: true });
        expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
        expect(client.index).toHaveBeenCalled();
      });

      it(`should use the ES create action if ID is not defined and overwrite=false`, async () => {
        await createSuccess(type, attributes);
        expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
        expect(client.create).toHaveBeenCalled();
      });

      it(`should use the ES index with version if ID and version are defined and overwrite=true`, async () => {
        await createSuccess(type, attributes, { id, overwrite: true, version: mockVersion });
        expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
        expect(client.index).toHaveBeenCalled();
        expect(client.index.mock.calls[0][0]).toMatchObject({
          if_seq_no: mockVersionProps._seq_no,
          if_primary_term: mockVersionProps._primary_term,
        });
      });

      it(`should use the ES create action if ID is defined and overwrite=false`, async () => {
        await createSuccess(type, attributes, { id });
        expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
        expect(client.create).toHaveBeenCalled();
      });

      it(`should use the preflightCheckForCreate action then create action if type is multi-namespace, ID is defined, and overwrite=false`, async () => {
        await createSuccess(MULTI_NAMESPACE_TYPE, attributes, { id });
        expect(mockPreflightCheckForCreate).toHaveBeenCalled();
        expect(mockPreflightCheckForCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            objects: [
              { type: MULTI_NAMESPACE_TYPE, id, overwrite: false, namespaces: ['default'] },
            ],
          })
        );
        expect(client.create).toHaveBeenCalled();
      });

      it(`should use the preflightCheckForCreate action then index action if type is multi-namespace, ID is defined, and overwrite=true`, async () => {
        await createSuccess(MULTI_NAMESPACE_ISOLATED_TYPE, attributes, { id, overwrite: true });
        expect(mockPreflightCheckForCreate).toHaveBeenCalled();
        expect(mockPreflightCheckForCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            objects: [
              { type: MULTI_NAMESPACE_ISOLATED_TYPE, id, overwrite: true, namespaces: ['default'] },
            ],
          })
        );
        expect(client.index).toHaveBeenCalled();
      });

      it(`defaults to empty references array`, async () => {
        await createSuccess(type, attributes, { id });
        expect(
          (client.create.mock.calls[0][0] as estypes.CreateRequest<SavedObjectsRawDocSource>).body!
            .references
        ).toEqual([]);
      });

      it(`accepts custom references array`, async () => {
        const test = async (references: SavedObjectReference[]) => {
          await createSuccess(type, attributes, { id, references });
          expect(
            (client.create.mock.calls[0][0] as estypes.CreateRequest<SavedObjectsRawDocSource>)
              .body!.references
          ).toEqual(references);
          client.create.mockClear();
        };
        await test(references);
        await test([{ type: 'type', id: 'id', name: 'some ref' }]);
        await test([]);
      });

      it(`doesn't accept custom references if not an array`, async () => {
        const test = async (references: unknown) => {
          // @ts-expect-error references is unknown
          await createSuccess(type, attributes, { id, references });
          expect(
            (client.create.mock.calls[0][0] as estypes.CreateRequest<SavedObjectsRawDocSource>)
              .body!.references
          ).not.toBeDefined();
          client.create.mockClear();
        };
        await test('string');
        await test(123);
        await test(true);
        await test(null);
      });

      describe('originId', () => {
        for (const objType of [type, NAMESPACE_AGNOSTIC_TYPE]) {
          it(`throws an error if originId is set for non-multi-namespace type`, async () => {
            await expect(
              repository.create(objType, attributes, { originId: 'some-originId' })
            ).rejects.toThrowError(
              createBadRequestErrorPayload(
                '"originId" can only be set for multi-namespace object types'
              )
            );
          });
        }

        for (const objType of [MULTI_NAMESPACE_TYPE, MULTI_NAMESPACE_ISOLATED_TYPE]) {
          it(`${objType} defaults to no originId`, async () => {
            await createSuccess(objType, attributes, { id });
            expect(client.create).toHaveBeenCalledWith(
              expect.objectContaining({
                body: expect.not.objectContaining({ originId: expect.anything() }),
              }),
              expect.anything()
            );
          });

          describe(`${objType} with existing originId`, () => {
            beforeEach(() => {
              mockPreflightCheckForCreate.mockImplementation(({ objects }) => {
                const existingDocument = {
                  _source: { originId: 'existing-originId' },
                } as SavedObjectsRawDoc;
                return Promise.resolve(
                  objects.map(({ type, id }) => ({ type, id, existingDocument }))
                );
              });
            });

            it(`accepts custom originId for multi-namespace type`, async () => {
              // The preflight result has `existing-originId`, but that is discarded
              await createSuccess(objType, attributes, { id, originId: 'some-originId' });
              expect(client.create).toHaveBeenCalledWith(
                expect.objectContaining({
                  body: expect.objectContaining({ originId: 'some-originId' }),
                }),
                expect.anything()
              );
            });

            it(`accepts undefined originId`, async () => {
              // The preflight result has `existing-originId`, but that is discarded
              await createSuccess(objType, attributes, { id, originId: undefined });
              expect(client.create).toHaveBeenCalledWith(
                expect.objectContaining({
                  body: expect.not.objectContaining({ originId: expect.anything() }),
                }),
                expect.anything()
              );
            });

            it(`preserves existing originId if originId option is not set`, async () => {
              await createSuccess(objType, attributes, { id });
              expect(client.create).toHaveBeenCalledWith(
                expect.objectContaining({
                  body: expect.objectContaining({ originId: 'existing-originId' }),
                }),
                expect.anything()
              );
            });
          });
        }
      });

      it(`defaults to a refresh setting of wait_for`, async () => {
        await createSuccess(type, attributes);
        expect(client.create).toHaveBeenCalledWith(
          expect.objectContaining({ refresh: 'wait_for' }),
          expect.anything()
        );
      });

      it(`should use default index`, async () => {
        await createSuccess(type, attributes, { id });
        expect(client.create).toHaveBeenCalledWith(
          expect.objectContaining({ index: '.kibana-test_8.0.0-testing' }),
          expect.anything()
        );
      });

      it(`should use custom index`, async () => {
        await createSuccess(CUSTOM_INDEX_TYPE, attributes, { id });
        expect(client.create).toHaveBeenCalledWith(
          expect.objectContaining({ index: 'custom_8.0.0-testing' }),
          expect.anything()
        );
      });

      it(`self-generates an id if none is provided`, async () => {
        await createSuccess(type, attributes);
        expect(client.create).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          }),
          expect.anything()
        );
        await createSuccess(type, attributes, { id: '' });
        expect(client.create).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          }),
          expect.anything()
        );
      });

      it(`prepends namespace to the id and adds namespace to the body when providing namespace for single-namespace type`, async () => {
        await createSuccess(type, attributes, { id, namespace });
        expect(client.create).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${namespace}:${type}:${id}`,
            body: expect.objectContaining({ namespace }),
          }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id or add namespace to the body when providing no namespace for single-namespace type`, async () => {
        await createSuccess(type, attributes, { id });
        expect(client.create).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${type}:${id}`,
            body: expect.not.objectContaining({ namespace: expect.anything() }),
          }),
          expect.anything()
        );
      });

      it(`normalizes options.namespace from 'default' to undefined`, async () => {
        await createSuccess(type, attributes, { id, namespace: 'default' });
        expect(client.create).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${type}:${id}`,
            body: expect.not.objectContaining({ namespace: expect.anything() }),
          }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id and adds namespaces to body when using multi-namespace type`, async () => {
        // first object does not have an existing document to overwrite
        await createSuccess(MULTI_NAMESPACE_TYPE, attributes, { id, namespace });
        mockPreflightCheckForCreate.mockResolvedValueOnce([
          {
            type: MULTI_NAMESPACE_TYPE,
            id,
            existingDocument: {
              _id: id,
              _source: { type: MULTI_NAMESPACE_TYPE, namespaces: ['*'] },
            }, // second object does have an existing document to overwrite
          },
        ]);
        await createSuccess(MULTI_NAMESPACE_ISOLATED_TYPE, attributes, {
          id,
          namespace,
          overwrite: true,
        });

        expect(mockPreflightCheckForCreate).toHaveBeenCalledTimes(2);
        expect(mockPreflightCheckForCreate).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            objects: [
              { type: MULTI_NAMESPACE_TYPE, id, overwrite: false, namespaces: [namespace] },
            ],
          })
        );
        expect(mockPreflightCheckForCreate).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            objects: [
              { type: MULTI_NAMESPACE_ISOLATED_TYPE, id, overwrite: true, namespaces: [namespace] },
            ],
          })
        );

        expect(client.create).toHaveBeenCalledTimes(1);
        expect(client.create).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${MULTI_NAMESPACE_TYPE}:${id}`,
            body: expect.objectContaining({ namespaces: [namespace] }),
          }),
          expect.anything()
        );
        expect(client.index).toHaveBeenCalledTimes(1);
        expect(client.index).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${MULTI_NAMESPACE_ISOLATED_TYPE}:${id}`,
            body: expect.objectContaining({ namespaces: ['*'] }),
          }),
          expect.anything()
        );
      });

      it(`adds initialNamespaces instead of namespace`, async () => {
        const ns2 = 'bar-namespace';
        const ns3 = 'baz-namespace';
        // first object does not get passed in to preflightCheckForCreate at all
        await repository.create('dashboard', attributes, {
          id,
          namespace,
          initialNamespaces: [ns2],
        });
        // second object does not have an existing document to overwrite
        await repository.create(MULTI_NAMESPACE_TYPE, attributes, {
          id,
          namespace,
          initialNamespaces: [ns2, ns3],
        });
        mockPreflightCheckForCreate.mockResolvedValueOnce([
          {
            type: MULTI_NAMESPACE_ISOLATED_TYPE,
            id,
            existingDocument: {
              _id: id,
              _source: { type: MULTI_NAMESPACE_ISOLATED_TYPE, namespaces: ['something-else'] },
            }, // third object does have an existing document to overwrite
          },
        ]);
        await repository.create(MULTI_NAMESPACE_ISOLATED_TYPE, attributes, {
          id,
          namespace,
          initialNamespaces: [ns2],
          overwrite: true,
        });

        expect(mockPreflightCheckForCreate).toHaveBeenCalledTimes(2);
        expect(mockPreflightCheckForCreate).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            objects: [{ type: MULTI_NAMESPACE_TYPE, id, overwrite: false, namespaces: [ns2, ns3] }],
          })
        );
        expect(mockPreflightCheckForCreate).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            objects: [
              { type: MULTI_NAMESPACE_ISOLATED_TYPE, id, overwrite: true, namespaces: [ns2] },
            ],
          })
        );

        expect(client.create).toHaveBeenCalledTimes(2);
        expect(client.create).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            id: `${ns2}:dashboard:${id}`,
            body: expect.objectContaining({ namespace: ns2 }),
          }),
          expect.anything()
        );
        expect(client.create).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            id: `${MULTI_NAMESPACE_TYPE}:${id}`,
            body: expect.objectContaining({ namespaces: [ns2, ns3] }),
          }),
          expect.anything()
        );
        expect(client.index).toHaveBeenCalledTimes(1);
        expect(client.index).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${MULTI_NAMESPACE_ISOLATED_TYPE}:${id}`,
            body: expect.objectContaining({ namespaces: [ns2] }),
          }),
          expect.anything()
        );
      });

      it(`normalizes initialNamespaces from 'default' to undefined`, async () => {
        await repository.create('dashboard', attributes, {
          id,
          namespace,
          initialNamespaces: ['default'],
        });

        expect(client.create).toHaveBeenCalledTimes(1);
        expect(client.create).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            id: `dashboard:${id}`,
            body: expect.not.objectContaining({ namespace: 'default' }),
          }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id or add namespace or namespaces fields when using namespace-agnostic type`, async () => {
        await createSuccess(NAMESPACE_AGNOSTIC_TYPE, attributes, { id, namespace });
        expect(client.create).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${NAMESPACE_AGNOSTIC_TYPE}:${id}`,
            body: expect.not.objectContaining({
              namespace: expect.anything(),
              namespaces: expect.anything(),
            }),
          }),
          expect.anything()
        );
      });
    });

    describe('errors', () => {
      it(`throws when options.initialNamespaces is used with a space-agnostic object`, async () => {
        await expect(
          repository.create(NAMESPACE_AGNOSTIC_TYPE, attributes, {
            initialNamespaces: [namespace],
          })
        ).rejects.toThrowError(
          createBadRequestErrorPayload('"initialNamespaces" cannot be used on space-agnostic types')
        );
      });

      it(`throws when options.initialNamespaces is empty`, async () => {
        await expect(
          repository.create(MULTI_NAMESPACE_TYPE, attributes, { initialNamespaces: [] })
        ).rejects.toThrowError(
          createBadRequestErrorPayload('"initialNamespaces" must be a non-empty array of strings')
        );
      });

      it(`throws when options.initialNamespaces is used with a space-isolated object and does not specify a single space`, async () => {
        const doTest = async (objType: string, initialNamespaces?: string[]) => {
          await expect(
            repository.create(objType, attributes, { initialNamespaces })
          ).rejects.toThrowError(
            createBadRequestErrorPayload(
              '"initialNamespaces" can only specify a single space when used with space-isolated types'
            )
          );
        };
        await doTest('dashboard', ['spacex', 'spacey']);
        await doTest('dashboard', ['*']);
        await doTest(MULTI_NAMESPACE_ISOLATED_TYPE, ['spacex', 'spacey']);
        await doTest(MULTI_NAMESPACE_ISOLATED_TYPE, ['*']);
      });

      it(`throws when options.namespace is '*'`, async () => {
        await expect(
          repository.create(type, attributes, { namespace: ALL_NAMESPACES_STRING })
        ).rejects.toThrowError(createBadRequestErrorPayload('"options.namespace" cannot be "*"'));
      });

      it(`throws when type is invalid`, async () => {
        await expect(repository.create('unknownType', attributes)).rejects.toThrowError(
          createUnsupportedTypeErrorPayload('unknownType')
        );
        expect(client.create).not.toHaveBeenCalled();
      });

      it(`throws when type is hidden`, async () => {
        await expect(repository.create(HIDDEN_TYPE, attributes)).rejects.toThrowError(
          createUnsupportedTypeErrorPayload(HIDDEN_TYPE)
        );
        expect(client.create).not.toHaveBeenCalled();
      });

      it(`throws when schema validation fails`, async () => {
        await expect(
          repository.create('dashboard', { title: 123 })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"[attributes.title]: expected value of type [string] but got [number]: Bad Request"`
        );
        expect(client.create).not.toHaveBeenCalled();
      });

      it(`throws when there is a conflict from preflightCheckForCreate`, async () => {
        mockPreflightCheckForCreate.mockResolvedValueOnce([
          { type: MULTI_NAMESPACE_ISOLATED_TYPE, id, error: { type: 'unresolvableConflict' } }, // error type and metadata dont matter
        ]);
        await expect(
          repository.create(MULTI_NAMESPACE_ISOLATED_TYPE, attributes, {
            id,
            overwrite: true,
            namespace,
          })
        ).rejects.toThrowError(createConflictErrorPayload(MULTI_NAMESPACE_ISOLATED_TYPE, id));
        expect(mockPreflightCheckForCreate).toHaveBeenCalled();
      });

      it.todo(`throws when automatic index creation fails`);

      it.todo(`throws when an unexpected failure occurs`);
    });

    describe('migration', () => {
      beforeEach(() => {
        migrator.migrateDocument.mockImplementation(mockMigrateDocument);
      });

      it(`migrates a document and serializes the migrated doc`, async () => {
        const migrationVersion = mockMigrationVersion;
        const coreMigrationVersion = '8.0.0';
        await createSuccess(type, attributes, {
          id,
          references,
          migrationVersion,
          coreMigrationVersion,
        });
        const doc = {
          type,
          id,
          attributes,
          references,
          migrationVersion,
          coreMigrationVersion,
          ...mockTimestampFieldsWithCreated,
        };
        expectMigrationArgs(doc);

        const migratedDoc = migrator.migrateDocument(doc);
        expect(serializer.savedObjectToRaw).toHaveBeenLastCalledWith(migratedDoc);
      });

      it(`adds namespace to body when providing namespace for single-namespace type`, async () => {
        await createSuccess(type, attributes, { id, namespace });
        expectMigrationArgs({ namespace });
      });

      it(`doesn't add namespace to body when providing no namespace for single-namespace type`, async () => {
        await createSuccess(type, attributes, { id });
        expectMigrationArgs({ namespace: expect.anything() }, false);
      });

      it(`doesn't add namespace to body when not using single-namespace type`, async () => {
        await createSuccess(NAMESPACE_AGNOSTIC_TYPE, attributes, { id, namespace });
        expectMigrationArgs({ namespace: expect.anything() }, false, 1);

        client.create.mockClear();
        await createSuccess(MULTI_NAMESPACE_ISOLATED_TYPE, attributes, { id });
        expectMigrationArgs({ namespace: expect.anything() }, false, 2);
      });

      it(`adds namespaces to body when providing namespace for multi-namespace type`, async () => {
        await createSuccess(MULTI_NAMESPACE_ISOLATED_TYPE, attributes, { id, namespace });
        expectMigrationArgs({ namespaces: [namespace] });
      });

      it(`adds default namespaces to body when providing no namespace for multi-namespace type`, async () => {
        await createSuccess(MULTI_NAMESPACE_ISOLATED_TYPE, attributes, { id });
        expectMigrationArgs({ namespaces: ['default'] });
      });

      it(`doesn't add namespaces to body when not using multi-namespace type`, async () => {
        await createSuccess(type, attributes, { id });
        expectMigrationArgs({ namespaces: expect.anything() }, false, 1);

        client.create.mockClear();
        await createSuccess(NAMESPACE_AGNOSTIC_TYPE, attributes, { id });
        expectMigrationArgs({ namespaces: expect.anything() }, false, 2);
      });
    });

    describe('returns', () => {
      it(`formats the ES response`, async () => {
        const result = await createSuccess(MULTI_NAMESPACE_TYPE, attributes, {
          id,
          namespace,
          references,
        });
        expect(result).toEqual({
          type: MULTI_NAMESPACE_TYPE,
          id,
          ...mockTimestampFieldsWithCreated,
          version: mockVersion,
          attributes,
          references,
          namespaces: [namespace ?? 'default'],
          migrationVersion: { [MULTI_NAMESPACE_TYPE]: '1.1.1' },
          coreMigrationVersion: expect.any(String),
          typeMigrationVersion: '1.1.1',
        });
      });
    });
  });

  describe('#delete', () => {
    const type = 'index-pattern';
    const id = 'logstash-*';
    const namespace = 'foo-namespace';

    beforeEach(() => {
      mockDeleteLegacyUrlAliases.mockClear();
      mockDeleteLegacyUrlAliases.mockResolvedValue();
    });

    describe('client calls', () => {
      it(`should use the ES delete action when not using a multi-namespace type`, async () => {
        await deleteSuccess(client, repository, registry, type, id);
        expect(client.get).not.toHaveBeenCalled();
        expect(client.delete).toHaveBeenCalledTimes(1);
      });

      it(`should use ES get action then delete action when using a multi-namespace type`, async () => {
        await deleteSuccess(client, repository, registry, MULTI_NAMESPACE_ISOLATED_TYPE, id);
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(client.delete).toHaveBeenCalledTimes(1);
      });

      it(`does not includes the version of the existing document when using a multi-namespace type`, async () => {
        await deleteSuccess(client, repository, registry, MULTI_NAMESPACE_ISOLATED_TYPE, id);
        const versionProperties = {
          if_seq_no: mockVersionProps._seq_no,
          if_primary_term: mockVersionProps._primary_term,
        };
        expect(client.delete).toHaveBeenCalledWith(
          expect.not.objectContaining(versionProperties),
          expect.anything()
        );
      });

      it(`defaults to a refresh setting of wait_for`, async () => {
        await deleteSuccess(client, repository, registry, type, id);
        expect(client.delete).toHaveBeenCalledWith(
          expect.objectContaining({ refresh: 'wait_for' }),
          expect.anything()
        );
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        await deleteSuccess(client, repository, registry, type, id, { namespace });
        expect(client.delete).toHaveBeenCalledWith(
          expect.objectContaining({ id: `${namespace}:${type}:${id}` }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        await deleteSuccess(client, repository, registry, type, id);
        expect(client.delete).toHaveBeenCalledWith(
          expect.objectContaining({ id: `${type}:${id}` }),
          expect.anything()
        );
      });

      it(`normalizes options.namespace from 'default' to undefined`, async () => {
        await deleteSuccess(client, repository, registry, type, id, { namespace: 'default' });
        expect(client.delete).toHaveBeenCalledWith(
          expect.objectContaining({ id: `${type}:${id}` }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        await deleteSuccess(client, repository, registry, NAMESPACE_AGNOSTIC_TYPE, id, {
          namespace,
        });
        expect(client.delete).toHaveBeenCalledWith(
          expect.objectContaining({ id: `${NAMESPACE_AGNOSTIC_TYPE}:${id}` }),
          expect.anything()
        );

        client.delete.mockClear();
        await deleteSuccess(client, repository, registry, MULTI_NAMESPACE_ISOLATED_TYPE, id, {
          namespace,
        });
        expect(client.delete).toHaveBeenCalledWith(
          expect.objectContaining({ id: `${MULTI_NAMESPACE_ISOLATED_TYPE}:${id}` }),
          expect.anything()
        );
      });
    });

    describe('legacy URL aliases', () => {
      it(`doesn't delete legacy URL aliases for single-namespace object types`, async () => {
        await deleteSuccess(client, repository, registry, type, id, { namespace });
        expect(mockDeleteLegacyUrlAliases).not.toHaveBeenCalled();
      });

      // We intentionally do not include a test case for a multi-namespace object with a "not found" preflight result, because that throws
      // an error (without deleting aliases) and we already have a test case for that

      it(`deletes legacy URL aliases for multi-namespace object types (all spaces)`, async () => {
        const internalOptions = {
          mockGetResponseValue: getMockGetResponse(
            registry,
            { type: MULTI_NAMESPACE_TYPE, id },
            ALL_NAMESPACES_STRING
          ),
        };
        await deleteSuccess(
          client,
          repository,
          registry,
          MULTI_NAMESPACE_TYPE,
          id,
          { namespace, force: true },
          internalOptions
        );
        expect(mockDeleteLegacyUrlAliases).toHaveBeenCalledWith(
          expect.objectContaining({
            type: MULTI_NAMESPACE_TYPE,
            id,
            namespaces: [],
            deleteBehavior: 'exclusive',
          })
        );
      });

      it(`deletes legacy URL aliases for multi-namespace object types (specific spaces)`, async () => {
        await deleteSuccess(client, repository, registry, MULTI_NAMESPACE_TYPE, id, { namespace }); // this function mocks a preflight response with the given namespace by default
        expect(mockDeleteLegacyUrlAliases).toHaveBeenCalledWith(
          expect.objectContaining({
            type: MULTI_NAMESPACE_TYPE,
            id,
            namespaces: [namespace],
            deleteBehavior: 'inclusive',
          })
        );
      });

      it(`logs a message when deleteLegacyUrlAliases returns an error`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(
            getMockGetResponse(registry, { type: MULTI_NAMESPACE_ISOLATED_TYPE, id, namespace })
          )
        );
        client.delete.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            result: 'deleted',
          } as estypes.DeleteResponse)
        );
        mockDeleteLegacyUrlAliases.mockRejectedValueOnce(new Error('Oh no!'));
        await repository.delete(MULTI_NAMESPACE_ISOLATED_TYPE, id, { namespace });
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
          'Unable to delete aliases when deleting an object: Oh no!'
        );
      });
    });

    describe('errors', () => {
      const expectNotFoundError = async (
        type: string,
        id: string,
        options?: SavedObjectsDeleteOptions
      ) => {
        await expect(repository.delete(type, id, options)).rejects.toThrowError(
          createGenericNotFoundErrorPayload(type, id)
        );
      };

      it(`throws when options.namespace is '*'`, async () => {
        await expect(
          repository.delete(type, id, { namespace: ALL_NAMESPACES_STRING })
        ).rejects.toThrowError(createBadRequestErrorPayload('"options.namespace" cannot be "*"'));
      });

      it(`throws when type is invalid`, async () => {
        await expectNotFoundError('unknownType', id);
        expect(client.delete).not.toHaveBeenCalled();
      });

      it(`throws when type is hidden`, async () => {
        await expectNotFoundError(HIDDEN_TYPE, id);
        expect(client.delete).not.toHaveBeenCalled();
      });

      it(`throws when ES is unable to find the document during get`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            found: false,
          } as estypes.GetResponse)
        );
        await expectNotFoundError(MULTI_NAMESPACE_ISOLATED_TYPE, id);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the index during get`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({} as estypes.GetResponse, {
            statusCode: 404,
          })
        );
        await expectNotFoundError(MULTI_NAMESPACE_ISOLATED_TYPE, id);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when the type is multi-namespace and the document exists, but not in this namespace`, async () => {
        const response = getMockGetResponse(
          registry,
          { type: MULTI_NAMESPACE_ISOLATED_TYPE, id },
          namespace
        );
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        await expectNotFoundError(MULTI_NAMESPACE_ISOLATED_TYPE, id, {
          namespace: 'bar-namespace',
        });
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when the type is multi-namespace and the document has multiple namespaces and the force option is not enabled`, async () => {
        const response = getMockGetResponse(registry, {
          type: MULTI_NAMESPACE_ISOLATED_TYPE,
          id,
          namespace,
        });
        response._source!.namespaces = [namespace, 'bar-namespace'];
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        await expect(
          repository.delete(MULTI_NAMESPACE_ISOLATED_TYPE, id, { namespace })
        ).rejects.toThrowError(
          'Unable to delete saved object that exists in multiple namespaces, use the `force` option to delete it anyway'
        );
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when the type is multi-namespace and the document has all namespaces and the force option is not enabled`, async () => {
        const response = getMockGetResponse(registry, {
          type: MULTI_NAMESPACE_ISOLATED_TYPE,
          id,
          namespace,
        });
        response._source!.namespaces = ['*'];
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        await expect(
          repository.delete(MULTI_NAMESPACE_ISOLATED_TYPE, id, { namespace })
        ).rejects.toThrowError(
          'Unable to delete saved object that exists in multiple namespaces, use the `force` option to delete it anyway'
        );
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the document during delete`, async () => {
        client.delete.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            result: 'not_found',
          } as estypes.DeleteResponse)
        );
        await expectNotFoundError(type, id);
        expect(client.delete).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the index during delete`, async () => {
        client.delete.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            // @elastic/elasticsearch doesn't declare error on DeleteResponse
            error: { type: 'index_not_found_exception' },
          } as unknown as estypes.DeleteResponse)
        );
        await expectNotFoundError(type, id);
        expect(client.delete).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES returns an unexpected response`, async () => {
        client.delete.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            result: 'something unexpected' as estypes.Result,
          } as estypes.DeleteResponse)
        );
        await expect(repository.delete(type, id)).rejects.toThrowError(
          'Unexpected Elasticsearch DELETE response'
        );
        expect(client.delete).toHaveBeenCalledTimes(1);
      });
    });

    describe('returns', () => {
      it(`returns an empty object on success`, async () => {
        const result = await deleteSuccess(client, repository, registry, type, id);
        expect(result).toEqual({});
      });
    });
  });

  describe('#deleteByNamespace', () => {
    const namespace = 'foo-namespace';
    const mockUpdateResults = {
      took: 15,
      timed_out: false,
      total: 3,
      updated: 2,
      deleted: 1,
      batches: 1,
      version_conflicts: 0,
      noops: 0,
      retries: { bulk: 0, search: 0 },
      throttled_millis: 0,
      requests_per_second: -1.0,
      throttled_until_millis: 0,
      failures: [],
    };

    const deleteByNamespaceSuccess = async (
      namespace: string,
      options?: SavedObjectsDeleteByNamespaceOptions
    ) => {
      client.updateByQuery.mockResponseOnce(mockUpdateResults);
      const result = await repository.deleteByNamespace(namespace, options);
      expect(mockGetSearchDsl).toHaveBeenCalledTimes(1);
      expect(client.updateByQuery).toHaveBeenCalledTimes(1);
      return result;
    };

    describe('client calls', () => {
      it(`should use the ES updateByQuery action`, async () => {
        await deleteByNamespaceSuccess(namespace);
        expect(client.updateByQuery).toHaveBeenCalledTimes(1);
      });

      it(`should use all indices for types that are not namespace-agnostic`, async () => {
        await deleteByNamespaceSuccess(namespace);
        expect(client.updateByQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            index: ['.kibana-test_8.0.0-testing', 'custom_8.0.0-testing'],
          }),
          expect.anything()
        );
      });
    });

    describe('errors', () => {
      it(`throws when namespace is not a string or is '*'`, async () => {
        const test = async (namespace: unknown) => {
          // @ts-expect-error namespace is unknown
          await expect(repository.deleteByNamespace(namespace)).rejects.toThrowError(
            `namespace is required, and must be a string`
          );
          expect(client.updateByQuery).not.toHaveBeenCalled();
        };
        await test(undefined);
        await test(['namespace']);
        await test(123);
        await test(true);
        await test(ALL_NAMESPACES_STRING);
      });
    });

    describe('returns', () => {
      it(`returns the query results on success`, async () => {
        const result = await deleteByNamespaceSuccess(namespace);
        expect(result).toEqual(mockUpdateResults);
      });
    });

    describe('search dsl', () => {
      it(`constructs a query using all multi-namespace types, and another using all single-namespace types`, async () => {
        await deleteByNamespaceSuccess(namespace);
        const allTypes = registry.getAllTypes().map((type) => type.name);
        expect(mockGetSearchDsl).toHaveBeenCalledWith(mappings, registry, {
          namespaces: [namespace],
          type: [
            ...allTypes.filter((type) => !registry.isNamespaceAgnostic(type)),
            LEGACY_URL_ALIAS_TYPE,
          ],
          kueryNode: expect.anything(),
        });
      });
    });
  });

  describe('#removeReferencesTo', () => {
    const type = 'type';
    const id = 'id';
    const defaultOptions = {};
    const updatedCount = 42;

    describe('client calls', () => {
      it('should use the ES updateByQuery action', async () => {
        await removeReferencesToSuccess(client, repository, type, id);
        expect(client.updateByQuery).toHaveBeenCalledTimes(1);
      });

      it('uses the correct default `refresh` value', async () => {
        await removeReferencesToSuccess(client, repository, type, id);
        expect(client.updateByQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            refresh: true,
          }),
          expect.any(Object)
        );
      });

      it('merges output of getSearchDsl into es request body', async () => {
        const query = { query: 1, aggregations: 2 };
        mockGetSearchDsl.mockReturnValue(query);
        await removeReferencesToSuccess(client, repository, type, id, { type });

        expect(client.updateByQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({ ...query }),
          }),
          expect.anything()
        );
      });

      it('should set index to all known SO indices on the request', async () => {
        await removeReferencesToSuccess(client, repository, type, id);
        expect(client.updateByQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            index: ['.kibana-test_8.0.0-testing', 'custom_8.0.0-testing'],
          }),
          expect.anything()
        );
      });

      it('should use the `refresh` option in the request', async () => {
        const refresh = Symbol();

        await removeReferencesToSuccess(client, repository, type, id, { refresh });
        expect(client.updateByQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            refresh,
          }),
          expect.anything()
        );
      });

      it('should pass the correct parameters to the update script', async () => {
        await removeReferencesToSuccess(client, repository, type, id);
        expect(client.updateByQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({
              script: expect.objectContaining({
                params: {
                  type,
                  id,
                },
              }),
            }),
          }),
          expect.anything()
        );
      });
    });

    describe('search dsl', () => {
      it(`passes mappings and registry to getSearchDsl`, async () => {
        await removeReferencesToSuccess(client, repository, type, id);
        expect(mockGetSearchDsl).toHaveBeenCalledWith(mappings, registry, expect.anything());
      });

      it('passes namespace to getSearchDsl', async () => {
        await removeReferencesToSuccess(client, repository, type, id, { namespace: 'some-ns' });
        expect(mockGetSearchDsl).toHaveBeenCalledWith(
          mappings,
          registry,
          expect.objectContaining({
            namespaces: ['some-ns'],
          })
        );
      });

      it('passes hasReference to getSearchDsl', async () => {
        await removeReferencesToSuccess(client, repository, type, id);
        expect(mockGetSearchDsl).toHaveBeenCalledWith(
          mappings,
          registry,
          expect.objectContaining({
            hasReference: {
              type,
              id,
            },
          })
        );
      });

      it('passes all known types to getSearchDsl', async () => {
        await removeReferencesToSuccess(client, repository, type, id);
        expect(mockGetSearchDsl).toHaveBeenCalledWith(
          mappings,
          registry,
          expect.objectContaining({
            type: registry.getAllTypes().map((type) => type.name),
          })
        );
      });
    });

    describe('returns', () => {
      it('returns the updated count from the ES response', async () => {
        const response = await removeReferencesToSuccess(client, repository, type, id);
        expect(response.updated).toBe(updatedCount);
      });
    });

    describe('errors', () => {
      it(`throws when ES returns failures`, async () => {
        client.updateByQuery.mockResponseOnce({
          updated: 7,
          failures: [
            { id: 'failure' } as estypes.BulkIndexByScrollFailure,
            { id: 'another-failure' } as estypes.BulkIndexByScrollFailure,
          ],
        });

        await expect(repository.removeReferencesTo(type, id, defaultOptions)).rejects.toThrowError(
          createConflictErrorPayload(type, id)
        );
      });
    });
  });

  describe('#find', () => {
    const type = 'index-pattern';
    const namespace = 'foo-namespace';

    describe('client calls', () => {
      it(`should use the ES search action`, async () => {
        await findSuccess(client, repository, { type });
        expect(client.search).toHaveBeenCalledTimes(1);
      });

      it(`merges output of getSearchDsl into es request body`, async () => {
        const query = { query: 1, aggregations: 2 };
        mockGetSearchDsl.mockReturnValue(query);
        await findSuccess(client, repository, { type });

        expect(client.search).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({ ...query }),
          }),
          expect.anything()
        );
      });

      it(`accepts per_page/page`, async () => {
        await findSuccess(client, repository, { type, perPage: 10, page: 6 });
        expect(client.search).toHaveBeenCalledWith(
          expect.objectContaining({
            size: 10,
            from: 50,
          }),
          expect.anything()
        );
      });

      it(`accepts preference`, async () => {
        await findSuccess(client, repository, { type, preference: 'pref' });
        expect(client.search).toHaveBeenCalledWith(
          expect.objectContaining({
            preference: 'pref',
          }),
          expect.anything()
        );
      });

      it(`can filter by fields`, async () => {
        await findSuccess(client, repository, { type, fields: ['title'] });
        expect(client.search).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({
              _source: [
                `${type}.title`,
                'namespace',
                'namespaces',
                'type',
                'references',
                'migrationVersion',
                'coreMigrationVersion',
                'typeMigrationVersion',
                'updated_at',
                'created_at',
                'originId',
                'title',
              ],
            }),
          }),
          expect.anything()
        );
      });

      it(`should set rest_total_hits_as_int to true on a request`, async () => {
        await findSuccess(client, repository, { type });
        expect(client.search).toHaveBeenCalledWith(
          expect.objectContaining({
            rest_total_hits_as_int: true,
          }),
          expect.anything()
        );
      });

      it(`should not make a client call when attempting to find only invalid or hidden types`, async () => {
        const test = async (types: string | string[]) => {
          await repository.find({ type: types });
          expect(client.search).not.toHaveBeenCalled();
        };

        await test('unknownType');
        await test(HIDDEN_TYPE);
        await test(['unknownType', HIDDEN_TYPE]);
      });
    });

    describe('errors', () => {
      it(`throws when type is not defined`, async () => {
        // @ts-expect-error type should be defined
        await expect(repository.find({})).rejects.toThrowError(
          'options.type must be a string or an array of strings'
        );
        expect(client.search).not.toHaveBeenCalled();
      });

      it(`throws when namespaces is an empty array`, async () => {
        await expect(repository.find({ type: 'foo', namespaces: [] })).rejects.toThrowError(
          'options.namespaces cannot be an empty array'
        );
        expect(client.search).not.toHaveBeenCalled();
      });

      it(`throws when searchFields is defined but not an array`, async () => {
        await expect(
          // @ts-expect-error searchFields is an array
          repository.find({ type, searchFields: 'string' })
        ).rejects.toThrowError('options.searchFields must be an array');
        expect(client.search).not.toHaveBeenCalled();
      });

      it(`throws when fields is defined but not an array`, async () => {
        // @ts-expect-error fields is an array
        await expect(repository.find({ type, fields: 'string' })).rejects.toThrowError(
          'options.fields must be an array'
        );
        expect(client.search).not.toHaveBeenCalled();
      });

      it(`throws when a preference is provided with pit`, async () => {
        await expect(
          repository.find({ type: 'foo', pit: { id: 'abc123' }, preference: 'hi' })
        ).rejects.toThrowError('options.preference must be excluded when options.pit is used');
        expect(client.search).not.toHaveBeenCalled();
      });

      it(`throws when KQL filter syntax is invalid`, async () => {
        const findOpts: SavedObjectsFindOptions = {
          namespaces: [namespace],
          search: 'foo*',
          searchFields: ['foo'],
          type: ['dashboard'],
          sortField: 'name',
          sortOrder: 'desc',
          defaultSearchOperator: 'AND',
          hasReference: {
            type: 'foo',
            id: '1',
          },
          filter: 'dashboard.attributes.otherField:<',
        };

        await expect(repository.find(findOpts)).rejects.toMatchInlineSnapshot(`
                          [Error: KQLSyntaxError: Expected "(", "{", value, whitespace but "<" found.
                          dashboard.attributes.otherField:<
                          --------------------------------^: Bad Request]
                      `);
        expect(mockGetSearchDsl).not.toHaveBeenCalled();
        expect(client.search).not.toHaveBeenCalled();
      });
    });

    describe('returns', () => {
      it(`formats the ES response when there is no namespace`, async () => {
        const noNamespaceSearchResults = generateIndexPatternSearchResults();
        client.search.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(noNamespaceSearchResults)
        );
        const count = noNamespaceSearchResults.hits.hits.length;

        const response = await repository.find({ type });

        expect(response.total).toBe(count);
        expect(response.saved_objects).toHaveLength(count);

        noNamespaceSearchResults.hits.hits.forEach((doc, i) => {
          expect(response.saved_objects[i]).toEqual({
            id: doc._id.replace(/(index-pattern|config|globalType)\:/, ''),
            type: doc._source!.type,
            originId: doc._source!.originId,
            ...mockTimestampFields,
            version: mockVersion,
            score: doc._score,
            attributes: doc._source![doc._source!.type],
            references: [],
            namespaces: doc._source!.type === NAMESPACE_AGNOSTIC_TYPE ? undefined : ['default'],
          });
        });
      });

      it(`formats the ES response when there is a namespace`, async () => {
        const namespacedSearchResults = generateIndexPatternSearchResults(namespace);
        client.search.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(namespacedSearchResults)
        );
        const count = namespacedSearchResults.hits.hits.length;

        const response = await repository.find({ type, namespaces: [namespace] });

        expect(response.total).toBe(count);
        expect(response.saved_objects).toHaveLength(count);

        namespacedSearchResults.hits.hits.forEach((doc, i) => {
          expect(response.saved_objects[i]).toEqual({
            id: doc._id.replace(/(foo-namespace\:)?(index-pattern|config|globalType)\:/, ''),
            type: doc._source!.type,
            originId: doc._source!.originId,
            ...mockTimestampFields,
            version: mockVersion,
            score: doc._score,
            attributes: doc._source![doc._source!.type],
            references: [],
            namespaces: doc._source!.type === NAMESPACE_AGNOSTIC_TYPE ? undefined : [namespace],
          });
        });
      });

      it(`should return empty results when attempting to find only invalid or hidden types`, async () => {
        const test = async (types: string | string[]) => {
          const result = await repository.find({ type: types });
          expect(result).toEqual(expect.objectContaining({ saved_objects: [] }));
          expect(client.search).not.toHaveBeenCalled();
        };

        await test('unknownType');
        await test(HIDDEN_TYPE);
        await test(['unknownType', HIDDEN_TYPE]);
      });
    });

    describe('search dsl', () => {
      const commonOptions: SavedObjectsFindOptions = {
        type: [type],
        namespaces: [namespace],
        search: 'foo*',
        searchFields: ['foo'],
        sortField: 'name',
        sortOrder: 'desc',
        defaultSearchOperator: 'AND',
        hasReference: {
          type: 'foo',
          id: '1',
        },
        hasNoReference: {
          type: 'bar',
          id: '1',
        },
      };

      it(`passes mappings, registry, and search options to getSearchDsl`, async () => {
        await findSuccess(client, repository, commonOptions, namespace);
        expect(mockGetSearchDsl).toHaveBeenCalledWith(mappings, registry, commonOptions);
      });

      it(`accepts hasReferenceOperator`, async () => {
        const relevantOpts: SavedObjectsFindOptions = {
          ...commonOptions,
          hasReferenceOperator: 'AND',
        };

        await findSuccess(client, repository, relevantOpts, namespace);
        expect(mockGetSearchDsl).toHaveBeenCalledWith(mappings, registry, {
          ...relevantOpts,
          hasReferenceOperator: 'AND',
        });
      });

      it(`accepts searchAfter`, async () => {
        const relevantOpts: SavedObjectsFindOptions = {
          ...commonOptions,
          searchAfter: ['1', 'a'],
        };

        await findSuccess(client, repository, relevantOpts, namespace);
        expect(mockGetSearchDsl).toHaveBeenCalledWith(mappings, registry, {
          ...relevantOpts,
          searchAfter: ['1', 'a'],
        });
      });

      it(`accepts pit`, async () => {
        const relevantOpts: SavedObjectsFindOptions = {
          ...commonOptions,
          pit: { id: 'abc123', keepAlive: '2m' },
        };

        await findSuccess(client, repository, relevantOpts, namespace);
        expect(mockGetSearchDsl).toHaveBeenCalledWith(mappings, registry, {
          ...relevantOpts,
          pit: { id: 'abc123', keepAlive: '2m' },
        });
      });

      it(`accepts KQL expression filter and passes KueryNode to getSearchDsl`, async () => {
        const findOpts: SavedObjectsFindOptions = {
          namespaces: [namespace],
          search: 'foo*',
          searchFields: ['foo'],
          type: ['dashboard'],
          sortField: 'name',
          sortOrder: 'desc',
          defaultSearchOperator: 'AND',
          hasReference: {
            type: 'foo',
            id: '1',
          },
          filter: 'dashboard.attributes.otherField: *',
        };

        await findSuccess(client, repository, findOpts, namespace);
        const { kueryNode } = mockGetSearchDsl.mock.calls[0][2];
        expect(kueryNode).toMatchInlineSnapshot(`
          Object {
            "arguments": Array [
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "dashboard.otherField",
              },
              Object {
                "type": "wildcard",
                "value": "@kuery-wildcard@",
              },
            ],
            "function": "is",
            "type": "function",
          }
        `);
      });

      it(`accepts KQL KueryNode filter and passes KueryNode to getSearchDsl`, async () => {
        const findOpts: SavedObjectsFindOptions = {
          namespaces: [namespace],
          search: 'foo*',
          searchFields: ['foo'],
          type: ['dashboard'],
          sortField: 'name',
          sortOrder: 'desc',
          defaultSearchOperator: 'AND',
          hasReference: {
            type: 'foo',
            id: '1',
          },
          filter: nodeTypes.function.buildNode('is', `dashboard.attributes.otherField`, '*'),
        };

        await findSuccess(client, repository, findOpts, namespace);
        const { kueryNode } = mockGetSearchDsl.mock.calls[0][2];
        expect(kueryNode).toMatchInlineSnapshot(`
          Object {
            "arguments": Array [
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "dashboard.otherField",
              },
              Object {
                "type": "wildcard",
                "value": "@kuery-wildcard@",
              },
            ],
            "function": "is",
            "type": "function",
          }
        `);
      });

      it(`supports multiple types`, async () => {
        const types = ['config', 'index-pattern'];
        await findSuccess(client, repository, { type: types });

        expect(mockGetSearchDsl).toHaveBeenCalledWith(
          mappings,
          registry,
          expect.objectContaining({
            type: types,
          })
        );
      });

      it(`filters out invalid types`, async () => {
        const types = ['config', 'unknownType', 'index-pattern'];
        await findSuccess(client, repository, { type: types });

        expect(mockGetSearchDsl).toHaveBeenCalledWith(
          mappings,
          registry,
          expect.objectContaining({
            type: ['config', 'index-pattern'],
          })
        );
      });

      it(`filters out hidden types`, async () => {
        const types = ['config', HIDDEN_TYPE, 'index-pattern'];
        await findSuccess(client, repository, { type: types });

        expect(mockGetSearchDsl).toHaveBeenCalledWith(
          mappings,
          registry,
          expect.objectContaining({
            type: ['config', 'index-pattern'],
          })
        );
      });
    });
  });

  describe('#get', () => {
    const type = 'index-pattern';
    const id = 'logstash-*';
    const namespace = 'foo-namespace';
    const originId = 'some-origin-id';

    describe('client calls', () => {
      it(`should use the ES get action`, async () => {
        await getSuccess(client, repository, registry, type, id);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        await getSuccess(client, repository, registry, type, id, { namespace });
        expect(client.get).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${namespace}:${type}:${id}`,
          }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        await getSuccess(client, repository, registry, type, id);
        expect(client.get).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${type}:${id}`,
          }),
          expect.anything()
        );
      });

      it(`normalizes options.namespace from 'default' to undefined`, async () => {
        await getSuccess(client, repository, registry, type, id, { namespace: 'default' });
        expect(client.get).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${type}:${id}`,
          }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        await getSuccess(client, repository, registry, NAMESPACE_AGNOSTIC_TYPE, id, { namespace });
        expect(client.get).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${NAMESPACE_AGNOSTIC_TYPE}:${id}`,
          }),
          expect.anything()
        );

        client.get.mockClear();
        await getSuccess(client, repository, registry, MULTI_NAMESPACE_ISOLATED_TYPE, id, {
          namespace,
        });
        expect(client.get).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${MULTI_NAMESPACE_ISOLATED_TYPE}:${id}`,
          }),
          expect.anything()
        );
      });
    });

    describe('errors', () => {
      const expectNotFoundError = async (
        type: string,
        id: string,
        options?: SavedObjectsBaseOptions
      ) => {
        await expect(repository.get(type, id, options)).rejects.toThrowError(
          createGenericNotFoundErrorPayload(type, id)
        );
      };

      it(`throws when options.namespace is '*'`, async () => {
        await expect(
          repository.get(type, id, { namespace: ALL_NAMESPACES_STRING })
        ).rejects.toThrowError(createBadRequestErrorPayload('"options.namespace" cannot be "*"'));
      });

      it(`throws when type is invalid`, async () => {
        await expectNotFoundError('unknownType', id);
        expect(client.get).not.toHaveBeenCalled();
      });

      it(`throws when type is hidden`, async () => {
        await expectNotFoundError(HIDDEN_TYPE, id);
        expect(client.get).not.toHaveBeenCalled();
      });

      it(`throws when ES is unable to find the document during get`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            found: false,
          } as estypes.GetResponse)
        );
        await expectNotFoundError(type, id);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the index during get`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({} as estypes.GetResponse, {
            statusCode: 404,
          })
        );
        await expectNotFoundError(type, id);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when type is multi-namespace and the document exists, but not in this namespace`, async () => {
        const response = getMockGetResponse(
          registry,
          { type: MULTI_NAMESPACE_ISOLATED_TYPE, id },
          namespace
        );
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        await expectNotFoundError(MULTI_NAMESPACE_ISOLATED_TYPE, id, {
          namespace: 'bar-namespace',
        });
        expect(client.get).toHaveBeenCalledTimes(1);
      });
    });

    describe('returns', () => {
      it(`formats the ES response`, async () => {
        const result = await getSuccess(client, repository, registry, type, id);
        expect(result).toEqual({
          id,
          type,
          updated_at: mockTimestamp,
          version: mockVersion,
          attributes: {
            title: 'Testing',
          },
          references: [],
          namespaces: ['default'],
        });
      });

      it(`includes namespaces if type is multi-namespace`, async () => {
        const result = await getSuccess(
          client,
          repository,
          registry,
          MULTI_NAMESPACE_ISOLATED_TYPE,
          id
        );
        expect(result).toMatchObject({
          namespaces: expect.any(Array),
        });
      });

      it(`include namespaces if type is not multi-namespace`, async () => {
        const result = await getSuccess(client, repository, registry, type, id);
        expect(result).toMatchObject({
          namespaces: ['default'],
        });
      });

      it(`includes originId property if present in cluster call response`, async () => {
        const result = await getSuccess(client, repository, registry, type, id, {}, originId);
        expect(result).toMatchObject({ originId });
      });
    });
  });

  describe('#resolve', () => {
    afterEach(() => {
      mockInternalBulkResolve.mockReset();
    });

    it('passes arguments to the internalBulkResolve module and returns the result', async () => {
      const expectedResult: SavedObjectsResolveResponse = {
        saved_object: { type: 'type', id: 'id', attributes: {}, references: [] },
        outcome: 'exactMatch',
      };
      mockInternalBulkResolve.mockResolvedValue({ resolved_objects: [expectedResult] });

      await expect(repository.resolve('obj-type', 'obj-id')).resolves.toEqual(expectedResult);
      expect(mockInternalBulkResolve).toHaveBeenCalledTimes(1);
      expect(mockInternalBulkResolve).toHaveBeenCalledWith(
        expect.objectContaining({ objects: [{ type: 'obj-type', id: 'obj-id' }] })
      );
    });

    it('throws when internalBulkResolve result is an error', async () => {
      const error = SavedObjectsErrorHelpers.decorateBadRequestError(new Error('Oh no!'));
      const expectedResult: BulkResolveError = { type: 'obj-type', id: 'obj-id', error };
      mockInternalBulkResolve.mockResolvedValue({ resolved_objects: [expectedResult] });

      await expect(repository.resolve('foo', '2')).rejects.toEqual(error);
    });

    it('throws when internalBulkResolve throws', async () => {
      const error = new Error('Oh no!');
      mockInternalBulkResolve.mockRejectedValue(error);

      await expect(repository.resolve('foo', '2')).rejects.toEqual(error);
    });
  });

  describe('#incrementCounter', () => {
    const type = 'config';
    const id = 'one';
    const counterFields = ['buildNum', 'apiCallsCount'];
    const namespace = 'foo-namespace';
    const originId = 'some-origin-id';

    const incrementCounterSuccess = async (
      type: string,
      id: string,
      fields: Array<string | SavedObjectsIncrementCounterField>,
      options?: SavedObjectsIncrementCounterOptions,
      internalOptions: { mockGetResponseValue?: estypes.GetResponse } = {}
    ) => {
      const { mockGetResponseValue } = internalOptions;
      const isMultiNamespace = registry.isMultiNamespace(type);
      if (isMultiNamespace) {
        const response =
          mockGetResponseValue ?? getMockGetResponse(registry, { type, id }, options?.namespace);
        client.get.mockResponseOnce(response);
      }

      client.update.mockResponseImplementation((params) => {
        return {
          body: {
            _id: params.id,
            ...mockVersionProps,
            _index: '.kibana',
            get: {
              found: true,
              _source: {
                type,
                ...mockTimestampFields,
                [type]: {
                  ...fields.reduce((acc, field) => {
                    acc[typeof field === 'string' ? field : field.fieldName] = 8468;
                    return acc;
                  }, {} as Record<string, number>),
                  defaultIndex: 'logstash-*',
                },
              },
            },
          } as estypes.UpdateResponse,
        };
      });

      const result = await repository.incrementCounter(type, id, fields, options);
      expect(client.get).toHaveBeenCalledTimes(isMultiNamespace ? 1 : 0);
      return result;
    };

    beforeEach(() => {
      mockPreflightCheckForCreate.mockReset();
      mockPreflightCheckForCreate.mockImplementation(({ objects }) => {
        return Promise.resolve(objects.map(({ type, id }) => ({ type, id }))); // respond with no errors by default
      });
    });

    describe('client calls', () => {
      it(`should use the ES update action if type is not multi-namespace`, async () => {
        await incrementCounterSuccess(type, id, counterFields, { namespace });
        expect(client.get).not.toHaveBeenCalled();
        expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
        expect(client.update).toHaveBeenCalledTimes(1);
      });

      it(`should use the ES get action then update action if type is multi-namespace, ID is defined, and overwrite=true`, async () => {
        await incrementCounterSuccess(MULTI_NAMESPACE_ISOLATED_TYPE, id, counterFields, {
          namespace,
        });
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
        expect(client.update).toHaveBeenCalledTimes(1);
      });

      it(`should check for alias conflicts if a new multi-namespace object would be created`, async () => {
        await incrementCounterSuccess(
          MULTI_NAMESPACE_ISOLATED_TYPE,
          id,
          counterFields,
          { namespace },
          { mockGetResponseValue: { found: false } as estypes.GetResponse }
        );
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(mockPreflightCheckForCreate).toHaveBeenCalledTimes(1);
        expect(client.update).toHaveBeenCalledTimes(1);
      });

      it(`defaults to a refresh setting of wait_for`, async () => {
        await incrementCounterSuccess(type, id, counterFields, { namespace });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            refresh: 'wait_for',
          }),
          expect.anything()
        );
      });

      it(`uses the 'upsertAttributes' option when specified`, async () => {
        const upsertAttributes = {
          foo: 'bar',
          hello: 'dolly',
        };
        await incrementCounterSuccess(type, id, counterFields, { namespace, upsertAttributes });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({
              upsert: expect.objectContaining({
                [type]: {
                  foo: 'bar',
                  hello: 'dolly',
                  ...counterFields.reduce((aggs, field) => {
                    return {
                      ...aggs,
                      [field]: 1,
                    };
                  }, {}),
                },
              }),
            }),
          }),
          expect.anything()
        );
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        await incrementCounterSuccess(type, id, counterFields, { namespace });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${namespace}:${type}:${id}`,
          }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        await incrementCounterSuccess(type, id, counterFields);
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${type}:${id}`,
          }),
          expect.anything()
        );
      });

      it(`normalizes options.namespace from 'default' to undefined`, async () => {
        await incrementCounterSuccess(type, id, counterFields, { namespace: 'default' });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${type}:${id}`,
          }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        await incrementCounterSuccess(NAMESPACE_AGNOSTIC_TYPE, id, counterFields, { namespace });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${NAMESPACE_AGNOSTIC_TYPE}:${id}`,
          }),
          expect.anything()
        );

        client.update.mockClear();
        await incrementCounterSuccess(MULTI_NAMESPACE_ISOLATED_TYPE, id, counterFields, {
          namespace,
        });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${MULTI_NAMESPACE_ISOLATED_TYPE}:${id}`,
          }),
          expect.anything()
        );
      });
    });

    describe('errors', () => {
      const expectUnsupportedTypeError = async (
        type: string,
        id: string,
        field: Array<string | SavedObjectsIncrementCounterField>
      ) => {
        await expect(repository.incrementCounter(type, id, field)).rejects.toThrowError(
          createUnsupportedTypeErrorPayload(type)
        );
      };

      it(`throws when options.namespace is '*'`, async () => {
        await expect(
          repository.incrementCounter(type, id, counterFields, {
            namespace: ALL_NAMESPACES_STRING,
          })
        ).rejects.toThrowError(createBadRequestErrorPayload('"options.namespace" cannot be "*"'));
      });

      it(`throws when type is not a string`, async () => {
        const test = async (type: unknown) => {
          await expect(
            // @ts-expect-error type is supposed to be a string
            repository.incrementCounter(type, id, counterFields)
          ).rejects.toThrowError(`"type" argument must be a string`);
          expect(client.update).not.toHaveBeenCalled();
        };

        await test(null);
        await test(42);
        await test(false);
        await test({});
      });

      it(`throws when id is empty`, async () => {
        await expect(repository.incrementCounter(type, '', counterFields)).rejects.toThrowError(
          createBadRequestErrorPayload('id cannot be empty')
        );
        expect(client.update).not.toHaveBeenCalled();
      });

      it(`throws when counterField is not CounterField type`, async () => {
        const test = async (field: unknown[]) => {
          await expect(
            // @ts-expect-error field is of wrong type
            repository.incrementCounter(type, id, field)
          ).rejects.toThrowError(
            `"counterFields" argument must be of type Array<string | { incrementBy?: number; fieldName: string }>`
          );
          expect(client.update).not.toHaveBeenCalled();
        };

        await test([null]);
        await test([42]);
        await test([false]);
        await test([{}]);
        await test([{}, false, 42, null, 'string']);
        await test([{ fieldName: 'string' }, false, null, 'string']);
      });

      it(`throws when type is invalid`, async () => {
        await expectUnsupportedTypeError('unknownType', id, counterFields);
        expect(client.update).not.toHaveBeenCalled();
      });

      it(`throws when type is hidden`, async () => {
        await expectUnsupportedTypeError(HIDDEN_TYPE, id, counterFields);
        expect(client.update).not.toHaveBeenCalled();
      });

      it(`throws when there is a conflict with an existing multi-namespace saved object (get)`, async () => {
        const response = getMockGetResponse(
          registry,
          { type: MULTI_NAMESPACE_ISOLATED_TYPE, id },
          'bar-namespace'
        );
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        await expect(
          repository.incrementCounter(MULTI_NAMESPACE_ISOLATED_TYPE, id, counterFields, {
            namespace,
          })
        ).rejects.toThrowError(createConflictErrorPayload(MULTI_NAMESPACE_ISOLATED_TYPE, id));
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
        expect(client.update).not.toHaveBeenCalled();
      });

      it(`throws when there is an alias conflict from preflightCheckForCreate`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            found: false,
          } as estypes.GetResponse)
        );
        mockPreflightCheckForCreate.mockResolvedValue([
          { type: 'foo', id: 'bar', error: { type: 'aliasConflict' } },
        ]);
        await expect(
          repository.incrementCounter(MULTI_NAMESPACE_ISOLATED_TYPE, id, counterFields, {
            namespace,
          })
        ).rejects.toThrowError(createConflictErrorPayload(MULTI_NAMESPACE_ISOLATED_TYPE, id));
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(mockPreflightCheckForCreate).toHaveBeenCalledTimes(1);
        expect(client.update).not.toHaveBeenCalled();
      });

      it(`does not throw when there is a different error from preflightCheckForCreate`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            found: false,
          } as estypes.GetResponse)
        );
        mockPreflightCheckForCreate.mockResolvedValue([
          { type: 'foo', id: 'bar', error: { type: 'conflict' } },
        ]);
        await incrementCounterSuccess(
          MULTI_NAMESPACE_ISOLATED_TYPE,
          id,
          counterFields,
          { namespace },
          { mockGetResponseValue: { found: false } as estypes.GetResponse }
        );
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(mockPreflightCheckForCreate).toHaveBeenCalledTimes(1);
        expect(client.update).toHaveBeenCalledTimes(1);
      });
    });

    describe('migration', () => {
      beforeEach(() => {
        migrator.migrateDocument.mockImplementation(mockMigrateDocument);
      });

      it(`migrates a document and serializes the migrated doc`, async () => {
        const migrationVersion = mockMigrationVersion;
        await incrementCounterSuccess(type, id, counterFields, { migrationVersion });
        const attributes = { buildNum: 1, apiCallsCount: 1 }; // this is added by the incrementCounter function
        const doc = { type, id, attributes, migrationVersion, ...mockTimestampFields };
        expectMigrationArgs(doc);

        const migratedDoc = migrator.migrateDocument(doc);
        expect(serializer.savedObjectToRaw).toHaveBeenLastCalledWith(migratedDoc);
      });
    });

    describe('returns', () => {
      it(`formats the ES response`, async () => {
        client.update.mockResponseImplementation((params) => {
          return {
            body: {
              _id: params.id,
              ...mockVersionProps,
              _index: '.kibana',
              get: {
                found: true,
                _source: {
                  type: 'config',
                  ...mockTimestampFields,
                  config: {
                    buildNum: 8468,
                    apiCallsCount: 100,
                    defaultIndex: 'logstash-*',
                  },
                  originId,
                },
              },
            } as estypes.UpdateResponse,
          };
        });

        const response = await repository.incrementCounter(
          'config',
          '6.0.0-alpha1',
          ['buildNum', 'apiCallsCount'],
          {
            namespace: 'foo-namespace',
          }
        );

        expect(response).toEqual({
          type: 'config',
          id: '6.0.0-alpha1',
          ...mockTimestampFields,
          version: mockVersion,
          references: [],
          attributes: {
            buildNum: 8468,
            apiCallsCount: 100,
            defaultIndex: 'logstash-*',
          },
          originId,
        });
      });

      it('increments counter by incrementBy config', async () => {
        await incrementCounterSuccess(type, id, [{ fieldName: counterFields[0], incrementBy: 3 }]);

        expect(client.update).toBeCalledTimes(1);
        expect(client.update).toBeCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({
              script: expect.objectContaining({
                params: expect.objectContaining({
                  counterFieldNames: [counterFields[0]],
                  counts: [3],
                }),
              }),
            }),
          }),
          expect.anything()
        );
      });

      it('does not increment counter when incrementBy is 0', async () => {
        await incrementCounterSuccess(type, id, [{ fieldName: counterFields[0], incrementBy: 0 }]);

        expect(client.update).toBeCalledTimes(1);
        expect(client.update).toBeCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({
              script: expect.objectContaining({
                params: expect.objectContaining({
                  counterFieldNames: [counterFields[0]],
                  counts: [0],
                }),
              }),
            }),
          }),
          expect.anything()
        );
      });
    });
  });

  describe('#update', () => {
    const id = 'logstash-*';
    const type = 'index-pattern';
    const attributes = { title: 'Testing' };
    const namespace = 'foo-namespace';
    const references = [
      {
        name: 'ref_0',
        type: 'test',
        id: '1',
      },
    ];
    const originId = 'some-origin-id';

    beforeEach(() => {
      mockPreflightCheckForCreate.mockReset();
      mockPreflightCheckForCreate.mockImplementation(({ objects }) => {
        return Promise.resolve(objects.map(({ type, id }) => ({ type, id }))); // respond with no errors by default
      });
    });

    describe('client calls', () => {
      it(`should use the ES update action when type is not multi-namespace`, async () => {
        await updateSuccess(client, repository, registry, type, id, attributes);
        expect(client.get).not.toHaveBeenCalled();
        expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
        expect(client.update).toHaveBeenCalledTimes(1);
      });

      it(`should use the ES get action then update action when type is multi-namespace`, async () => {
        await updateSuccess(
          client,
          repository,
          registry,
          MULTI_NAMESPACE_ISOLATED_TYPE,
          id,
          attributes
        );
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
        expect(client.update).toHaveBeenCalledTimes(1);
      });

      it(`should check for alias conflicts if a new multi-namespace object would be created`, async () => {
        await updateSuccess(
          client,
          repository,
          registry,
          MULTI_NAMESPACE_ISOLATED_TYPE,
          id,
          attributes,
          { upsert: true },
          { mockGetResponseValue: { found: false } as estypes.GetResponse }
        );
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(mockPreflightCheckForCreate).toHaveBeenCalledTimes(1);
        expect(client.update).toHaveBeenCalledTimes(1);
      });

      it(`defaults to no references array`, async () => {
        await updateSuccess(client, repository, registry, type, id, attributes);
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            body: { doc: expect.not.objectContaining({ references: expect.anything() }) },
          }),
          expect.anything()
        );
      });

      it(`accepts custom references array`, async () => {
        const test = async (references: SavedObjectReference[]) => {
          await updateSuccess(client, repository, registry, type, id, attributes, { references });
          expect(client.update).toHaveBeenCalledWith(
            expect.objectContaining({
              body: { doc: expect.objectContaining({ references }) },
            }),
            expect.anything()
          );
          client.update.mockClear();
        };
        await test(references);
        await test([{ type: 'foo', id: '42', name: 'some ref' }]);
        await test([]);
      });

      it(`uses the 'upsertAttributes' option when specified for a single-namespace type`, async () => {
        await updateSuccess(client, repository, registry, type, id, attributes, {
          upsert: {
            title: 'foo',
            description: 'bar',
          },
        });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'index-pattern:logstash-*',
            body: expect.objectContaining({
              upsert: expect.objectContaining({
                type: 'index-pattern',
                'index-pattern': {
                  title: 'foo',
                  description: 'bar',
                },
              }),
            }),
          }),
          expect.anything()
        );
      });

      it(`uses the 'upsertAttributes' option when specified for a multi-namespace type that does not exist`, async () => {
        const options = { upsert: { title: 'foo', description: 'bar' } };
        mockUpdateResponse(client, MULTI_NAMESPACE_ISOLATED_TYPE, id, options);
        await repository.update(MULTI_NAMESPACE_ISOLATED_TYPE, id, attributes, options);
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${MULTI_NAMESPACE_ISOLATED_TYPE}:logstash-*`,
            body: expect.objectContaining({
              upsert: expect.objectContaining({
                type: MULTI_NAMESPACE_ISOLATED_TYPE,
                [MULTI_NAMESPACE_ISOLATED_TYPE]: {
                  title: 'foo',
                  description: 'bar',
                },
              }),
            }),
          }),
          expect.anything()
        );
      });

      it(`ignores use the 'upsertAttributes' option when specified for a multi-namespace type that already exists`, async () => {
        const options = { upsert: { title: 'foo', description: 'bar' } };
        await updateSuccess(
          client,
          repository,
          registry,
          MULTI_NAMESPACE_ISOLATED_TYPE,
          id,
          attributes,
          options
        );
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${MULTI_NAMESPACE_ISOLATED_TYPE}:logstash-*`,
            body: expect.not.objectContaining({
              upsert: expect.anything(),
            }),
          }),
          expect.anything()
        );
      });

      it(`doesn't accept custom references if not an array`, async () => {
        const test = async (references: unknown) => {
          // @ts-expect-error references is unknown
          await updateSuccess(client, repository, registry, type, id, attributes, { references });
          expect(client.update).toHaveBeenCalledWith(
            expect.objectContaining({
              body: { doc: expect.not.objectContaining({ references: expect.anything() }) },
            }),
            expect.anything()
          );
          client.update.mockClear();
        };
        await test('string');
        await test(123);
        await test(true);
        await test(null);
      });

      it(`defaults to a refresh setting of wait_for`, async () => {
        await updateSuccess(client, repository, registry, type, id, { foo: 'bar' });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            refresh: 'wait_for',
          }),
          expect.anything()
        );
      });

      it(`does not default to the version of the existing document when type is multi-namespace`, async () => {
        await updateSuccess(
          client,
          repository,
          registry,
          MULTI_NAMESPACE_ISOLATED_TYPE,
          id,
          attributes,
          { references }
        );
        const versionProperties = {
          if_seq_no: mockVersionProps._seq_no,
          if_primary_term: mockVersionProps._primary_term,
        };
        expect(client.update).toHaveBeenCalledWith(
          expect.not.objectContaining(versionProperties),
          expect.anything()
        );
      });

      it(`accepts version`, async () => {
        await updateSuccess(client, repository, registry, type, id, attributes, {
          version: encodeHitVersion({ _seq_no: 100, _primary_term: 200 }),
        });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({ if_seq_no: 100, if_primary_term: 200 }),
          expect.anything()
        );
      });

      it('default to a `retry_on_conflict` setting of `3` when `version` is not provided', async () => {
        await updateSuccess(client, repository, registry, type, id, attributes, {});
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({ retry_on_conflict: 3 }),
          expect.anything()
        );
      });

      it('default to a `retry_on_conflict` setting of `0` when `version` is provided', async () => {
        await updateSuccess(client, repository, registry, type, id, attributes, {
          version: encodeHitVersion({ _seq_no: 100, _primary_term: 200 }),
        });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({ retry_on_conflict: 0, if_seq_no: 100, if_primary_term: 200 }),
          expect.anything()
        );
      });

      it('accepts a `retryOnConflict` option', async () => {
        await updateSuccess(client, repository, registry, type, id, attributes, {
          version: encodeHitVersion({ _seq_no: 100, _primary_term: 200 }),
          retryOnConflict: 42,
        });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({ retry_on_conflict: 42, if_seq_no: 100, if_primary_term: 200 }),
          expect.anything()
        );
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        await updateSuccess(client, repository, registry, type, id, attributes, { namespace });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({ id: expect.stringMatching(`${namespace}:${type}:${id}`) }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        await updateSuccess(client, repository, registry, type, id, attributes, { references });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({ id: expect.stringMatching(`${type}:${id}`) }),
          expect.anything()
        );
      });

      it(`normalizes options.namespace from 'default' to undefined`, async () => {
        await updateSuccess(client, repository, registry, type, id, attributes, {
          references,
          namespace: 'default',
        });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({ id: expect.stringMatching(`${type}:${id}`) }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        await updateSuccess(client, repository, registry, NAMESPACE_AGNOSTIC_TYPE, id, attributes, {
          namespace,
        });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: expect.stringMatching(`${NAMESPACE_AGNOSTIC_TYPE}:${id}`),
          }),
          expect.anything()
        );

        client.update.mockClear();
        await updateSuccess(
          client,
          repository,
          registry,
          MULTI_NAMESPACE_ISOLATED_TYPE,
          id,
          attributes,
          { namespace }
        );
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: expect.stringMatching(`${MULTI_NAMESPACE_ISOLATED_TYPE}:${id}`),
          }),
          expect.anything()
        );
      });

      it(`includes _source_includes when type is multi-namespace`, async () => {
        await updateSuccess(
          client,
          repository,
          registry,
          MULTI_NAMESPACE_ISOLATED_TYPE,
          id,
          attributes
        );
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({ _source_includes: ['namespace', 'namespaces', 'originId'] }),
          expect.anything()
        );
      });

      it(`includes _source_includes when type is not multi-namespace`, async () => {
        await updateSuccess(client, repository, registry, type, id, attributes);
        expect(client.update).toHaveBeenLastCalledWith(
          expect.objectContaining({
            _source_includes: ['namespace', 'namespaces', 'originId'],
          }),
          expect.anything()
        );
      });
    });

    describe('errors', () => {
      const expectNotFoundError = async (type: string, id: string) => {
        await expect(repository.update(type, id, {})).rejects.toThrowError(
          createGenericNotFoundErrorPayload(type, id)
        );
      };

      it(`throws when options.namespace is '*'`, async () => {
        await expect(
          repository.update(type, id, attributes, { namespace: ALL_NAMESPACES_STRING })
        ).rejects.toThrowError(createBadRequestErrorPayload('"options.namespace" cannot be "*"'));
      });

      it(`throws when type is invalid`, async () => {
        await expectNotFoundError('unknownType', id);
        expect(client.update).not.toHaveBeenCalled();
      });

      it(`throws when type is hidden`, async () => {
        await expectNotFoundError(HIDDEN_TYPE, id);
        expect(client.update).not.toHaveBeenCalled();
      });

      it(`throws when id is empty`, async () => {
        await expect(repository.update(type, '', attributes)).rejects.toThrowError(
          createBadRequestErrorPayload('id cannot be empty')
        );
        expect(client.update).not.toHaveBeenCalled();
      });

      it(`throws when ES is unable to find the document during get`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(
            { found: false } as estypes.GetResponse,
            undefined
          )
        );
        await expectNotFoundError(MULTI_NAMESPACE_ISOLATED_TYPE, id);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the index during get`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({} as estypes.GetResponse, {
            statusCode: 404,
          })
        );
        await expectNotFoundError(MULTI_NAMESPACE_ISOLATED_TYPE, id);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when type is multi-namespace and the document exists, but not in this namespace`, async () => {
        const response = getMockGetResponse(
          registry,
          { type: MULTI_NAMESPACE_ISOLATED_TYPE, id },
          namespace
        );
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        await expectNotFoundError(MULTI_NAMESPACE_ISOLATED_TYPE, id);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when there is an alias conflict from preflightCheckForCreate`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            found: false,
          } as estypes.GetResponse)
        );
        mockPreflightCheckForCreate.mockResolvedValue([
          { type: 'type', id: 'id', error: { type: 'aliasConflict' } },
        ]);
        await expect(
          repository.update(
            MULTI_NAMESPACE_ISOLATED_TYPE,
            id,
            { attr: 'value' },
            {
              upsert: {
                upsertAttr: 'val',
                attr: 'value',
              },
            }
          )
        ).rejects.toThrowError(createConflictErrorPayload(MULTI_NAMESPACE_ISOLATED_TYPE, id));
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(mockPreflightCheckForCreate).toHaveBeenCalledTimes(1);
        expect(client.update).not.toHaveBeenCalled();
      });

      it(`does not throw when there is a different error from preflightCheckForCreate`, async () => {
        mockPreflightCheckForCreate.mockResolvedValue([
          { type: 'type', id: 'id', error: { type: 'conflict' } },
        ]);
        await updateSuccess(
          client,
          repository,
          registry,
          MULTI_NAMESPACE_ISOLATED_TYPE,
          id,
          attributes,
          { upsert: true },
          { mockGetResponseValue: { found: false } as estypes.GetResponse }
        );
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(mockPreflightCheckForCreate).toHaveBeenCalledTimes(1);
        expect(client.update).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the document during update`, async () => {
        const notFoundError = new EsErrors.ResponseError(
          elasticsearchClientMock.createApiResponse({
            statusCode: 404,
            body: { error: { type: 'es_type', reason: 'es_reason' } },
          })
        );
        client.update.mockResolvedValueOnce(
          elasticsearchClientMock.createErrorTransportRequestPromise(notFoundError)
        );
        await expectNotFoundError(type, id);
        expect(client.update).toHaveBeenCalledTimes(1);
      });
    });

    describe('returns', () => {
      it(`returns _seq_no and _primary_term encoded as version`, async () => {
        const result = await updateSuccess(client, repository, registry, type, id, attributes, {
          namespace,
          references,
        });
        expect(result).toEqual({
          id,
          type,
          ...mockTimestampFields,
          version: mockVersion,
          attributes,
          references,
          namespaces: [namespace],
        });
      });

      it(`includes namespaces if type is multi-namespace`, async () => {
        const result = await updateSuccess(
          client,
          repository,
          registry,
          MULTI_NAMESPACE_ISOLATED_TYPE,
          id,
          attributes
        );
        expect(result).toMatchObject({
          namespaces: expect.any(Array),
        });
      });

      it(`includes namespaces if type is not multi-namespace`, async () => {
        const result = await updateSuccess(client, repository, registry, type, id, attributes);
        expect(result).toMatchObject({
          namespaces: ['default'],
        });
      });

      it(`includes originId property if present in cluster call response`, async () => {
        const result = await updateSuccess(
          client,
          repository,
          registry,
          type,
          id,
          attributes,
          {},
          { originId }
        );
        expect(result).toMatchObject({ originId });
      });
    });
  });

  describe('#openPointInTimeForType', () => {
    const type = 'index-pattern';

    const generateResults = (id?: string) => ({ id: id || 'id' });
    const successResponse = async (type: string, options?: SavedObjectsOpenPointInTimeOptions) => {
      client.openPointInTime.mockResponseOnce(generateResults());
      const result = await repository.openPointInTimeForType(type, options);
      expect(client.openPointInTime).toHaveBeenCalledTimes(1);
      return result;
    };

    describe('client calls', () => {
      it(`should use the ES PIT API`, async () => {
        await successResponse(type);
        expect(client.openPointInTime).toHaveBeenCalledTimes(1);
      });

      it(`accepts preference`, async () => {
        await successResponse(type, { preference: 'pref' });
        expect(client.openPointInTime).toHaveBeenCalledWith(
          expect.objectContaining({
            preference: 'pref',
          }),
          expect.anything()
        );
      });

      it(`accepts keepAlive`, async () => {
        await successResponse(type, { keepAlive: '2m' });
        expect(client.openPointInTime).toHaveBeenCalledWith(
          expect.objectContaining({
            keep_alive: '2m',
          }),
          expect.anything()
        );
      });

      it(`defaults keepAlive to 5m`, async () => {
        await successResponse(type);
        expect(client.openPointInTime).toHaveBeenCalledWith(
          expect.objectContaining({
            keep_alive: '5m',
          }),
          expect.anything()
        );
      });
    });

    describe('errors', () => {
      const expectNotFoundError = async (types: string | string[]) => {
        await expect(repository.openPointInTimeForType(types)).rejects.toThrowError(
          createGenericNotFoundErrorPayload()
        );
      };

      it(`throws when ES is unable to find the index`, async () => {
        client.openPointInTime.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(
            { id: 'error' },
            { statusCode: 404 }
          )
        );
        await expectNotFoundError(type);
        expect(client.openPointInTime).toHaveBeenCalledTimes(1);
      });

      it(`should return generic not found error when attempting to find only invalid or hidden types`, async () => {
        const test = async (types: string | string[]) => {
          await expectNotFoundError(types);
          expect(client.openPointInTime).not.toHaveBeenCalled();
        };

        await test('unknownType');
        await test(HIDDEN_TYPE);
        await test(['unknownType', HIDDEN_TYPE]);
      });
    });

    describe('returns', () => {
      it(`returns id in the expected format`, async () => {
        const id = 'abc123';
        const results = generateResults(id);
        client.openPointInTime.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(results)
        );
        const response = await repository.openPointInTimeForType(type);
        expect(response).toEqual({ id });
      });
    });
  });

  describe('#closePointInTime', () => {
    const generateResults = () => ({ succeeded: true, num_freed: 3 });
    const successResponse = async (id: string) => {
      client.closePointInTime.mockResponseOnce(generateResults());
      const result = await repository.closePointInTime(id);
      expect(client.closePointInTime).toHaveBeenCalledTimes(1);
      return result;
    };

    describe('client calls', () => {
      it(`should use the ES PIT API`, async () => {
        await successResponse('abc123');
        expect(client.closePointInTime).toHaveBeenCalledTimes(1);
      });

      it(`accepts id`, async () => {
        await successResponse('abc123');
        expect(client.closePointInTime).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({
              id: 'abc123',
            }),
          }),
          expect.anything()
        );
      });
    });

    describe('returns', () => {
      it(`returns response body from ES`, async () => {
        const results = generateResults();
        client.closePointInTime.mockResponseOnce(results);
        const response = await repository.closePointInTime('abc123');
        expect(response).toEqual(results);
      });
    });
  });

  describe('#createPointInTimeFinder', () => {
    it('returns a new PointInTimeFinder instance', async () => {
      const result = await repository.createPointInTimeFinder({ type: 'PIT' });
      expect(result).toBeInstanceOf(PointInTimeFinder);
    });

    it('calls PointInTimeFinder with the provided options and dependencies', async () => {
      const options: SavedObjectsCreatePointInTimeFinderOptions = {
        type: 'my-type',
      };
      const dependencies: SavedObjectsCreatePointInTimeFinderDependencies = {
        client: {
          find: jest.fn(),
          openPointInTimeForType: jest.fn(),
          closePointInTime: jest.fn(),
        },
      };

      await repository.createPointInTimeFinder(options, dependencies);
      expect(pointInTimeFinderMock).toHaveBeenCalledWith(
        options,
        expect.objectContaining({
          ...dependencies,
          logger,
        })
      );
    });
  });

  describe('#collectMultiNamespaceReferences', () => {
    afterEach(() => {
      mockCollectMultiNamespaceReferences.mockReset();
    });

    it('passes arguments to the collectMultiNamespaceReferences module and returns the result', async () => {
      const objects: SavedObjectsCollectMultiNamespaceReferencesObject[] = [
        { type: 'foo', id: 'bar' },
      ];
      const expectedResult: SavedObjectsCollectMultiNamespaceReferencesResponse = {
        objects: [{ type: 'foo', id: 'bar', spaces: ['ns-1'], inboundReferences: [] }],
      };
      mockCollectMultiNamespaceReferences.mockResolvedValue(expectedResult);

      await expect(repository.collectMultiNamespaceReferences(objects)).resolves.toEqual(
        expectedResult
      );
      expect(mockCollectMultiNamespaceReferences).toHaveBeenCalledTimes(1);
      expect(mockCollectMultiNamespaceReferences).toHaveBeenCalledWith(
        expect.objectContaining({ objects })
      );
    });

    it('returns an error from the collectMultiNamespaceReferences module', async () => {
      const expectedResult = new Error('Oh no!');
      mockCollectMultiNamespaceReferences.mockRejectedValue(expectedResult);

      await expect(repository.collectMultiNamespaceReferences([])).rejects.toEqual(expectedResult);
    });
  });

  describe('#updateObjectsSpaces', () => {
    afterEach(() => {
      mockUpdateObjectsSpaces.mockReset();
    });

    it('passes arguments to the updateObjectsSpaces module and returns the result', async () => {
      const objects: SavedObjectsUpdateObjectsSpacesObject[] = [{ type: 'type', id: 'id' }];
      const spacesToAdd = ['to-add', 'also-to-add'];
      const spacesToRemove = ['to-remove'];
      const options: SavedObjectsUpdateObjectsSpacesOptions = { namespace: 'ns-1' };
      const expectedResult: SavedObjectsUpdateObjectsSpacesResponse = {
        objects: [
          {
            type: 'type',
            id: 'id',
            spaces: ['foo', 'bar'],
          },
        ],
      };
      mockUpdateObjectsSpaces.mockResolvedValue(expectedResult);

      await expect(
        repository.updateObjectsSpaces(objects, spacesToAdd, spacesToRemove, options)
      ).resolves.toEqual(expectedResult);
      expect(mockUpdateObjectsSpaces).toHaveBeenCalledTimes(1);
      expect(mockUpdateObjectsSpaces).toHaveBeenCalledWith(
        expect.objectContaining({ objects, spacesToAdd, spacesToRemove, options })
      );
    });

    it('returns an error from the updateObjectsSpaces module', async () => {
      const expectedResult = new Error('Oh no!');
      mockUpdateObjectsSpaces.mockRejectedValue(expectedResult);

      await expect(repository.updateObjectsSpaces([], [], [])).rejects.toEqual(expectedResult);
    });
  });

  describe('#getCurrentNamespace', () => {
    it('returns `undefined` for `undefined` namespace argument', async () => {
      expect(repository.getCurrentNamespace()).toBeUndefined();
    });

    it('throws if `*` namespace argument is provided', async () => {
      expect(() => repository.getCurrentNamespace('*')).toThrowErrorMatchingInlineSnapshot(
        `"\\"options.namespace\\" cannot be \\"*\\": Bad Request"`
      );
    });

    it('properly handles `default` namespace', async () => {
      expect(repository.getCurrentNamespace('default')).toBeUndefined();
    });

    it('properly handles non-`default` namespace', async () => {
      expect(repository.getCurrentNamespace('space-a')).toBe('space-a');
    });
  });
});
