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
  mockPreflightCheckForCreate,
  mockGetSearchDsl,
} from '../repository.test.mock';

import type { Payload } from '@hapi/boom';

import type { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import {
  type SavedObjectsRawDoc,
  type SavedObjectUnsanitizedDoc,
  type SavedObjectReference,
} from '@kbn/core-saved-objects-server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import { SavedObjectsRepository } from '../repository';
import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import { kibanaMigratorMock } from '../../mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

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
  createRegistry,
  createDocumentMigrator,
  createSpySerializer,
  bulkCreateSuccess,
  getMockBulkCreateResponse,
  expectErrorResult,
  expectErrorInvalidType,
  expectErrorConflict,
  expectError,
  createBadRequestErrorPayload,
  expectCreateResult,
  mockTimestampFieldsWithCreated,
} from '../../test_helpers/repository.test.common';
import type { ISavedObjectsSecurityExtension } from '@kbn/core-saved-objects-server';
import { savedObjectsExtensionsMock } from '../../mocks/saved_objects_extensions.mock';

// so any breaking changes to this repository are considered breaking changes to the SavedObjectsClient.

interface ExpectedErrorResult {
  type: string;
  id: string;
  error: Record<string, any>;
}

describe('#bulkCreate', () => {
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

  // Setup migration mock for creating an object
  const mockMigrationVersion = { foo: '2.3.4' };
  const mockMigrateDocument = (doc: SavedObjectUnsanitizedDoc<any>) => ({
    ...doc,
    attributes: {
      ...doc.attributes,
      ...(doc.attributes?.title && { title: `${doc.attributes.title}!!` }),
    },
    migrationVersion: mockMigrationVersion,
    managed: doc.managed ?? false,
    references: [{ name: 'search_0', type: 'search', id: '123' }],
  });

  describe('performBulkCreate', () => {
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
      managed: false,
    };
    const obj2 = {
      type: 'index-pattern',
      id: 'logstash-*',
      attributes: { title: 'Test Two' },
      references: [{ name: 'ref_0', type: 'test', id: '2' }],
      managed: false,
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
      const operations = [];
      for (const { type, id, if_primary_term: ifPrimaryTerm, if_seq_no: ifSeqNo } of objects) {
        operations.push({
          [method]: {
            _index,
            _id: getId(type, id),
            ...(ifPrimaryTerm && ifSeqNo
              ? { if_primary_term: expect.any(Number), if_seq_no: expect.any(Number) }
              : {}),
          },
        });
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
          managed: obj1.managed,
          if_seq_no: mockVersionProps._seq_no,
          if_primary_term: mockVersionProps._primary_term,
        };

        expectClientCallArgsAction([obj1WithSeq, obj2], { method: 'index' });
      });

      it(`should use the ES create method if ID is defined and overwrite=false`, async () => {
        await bulkCreateSuccess(client, repository, [obj1, obj2]);
        expectClientCallArgsAction([obj1, obj2], { method: 'create' });
      });

      it(`should use the ES index method if ID is defined, overwrite=true and managed=true in a document`, async () => {
        await bulkCreateSuccess(client, repository, [obj1, obj2], {
          overwrite: true,
          managed: true,
        });
        expectClientCallArgsAction([obj1, obj2], { method: 'index' });
      });

      it(`should use the ES create method if ID is defined, overwrite=false and managed=true in a document`, async () => {
        await bulkCreateSuccess(client, repository, [obj1, obj2], { managed: true });
        expectClientCallArgsAction([obj1, obj2], { method: 'create' });
      });

      it(`formats the ES request`, async () => {
        await bulkCreateSuccess(client, repository, [obj1, obj2]);
        const operations = [...expectObjArgs(obj1), ...expectObjArgs(obj2)];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ operations }),
          expect.anything()
        );
      });
      // this test only ensures that the client accepts the managed field in a document
      it(`formats the ES request with managed=true in a document`, async () => {
        const obj1WithManagedTrue = { ...obj1, managed: true };
        const obj2WithManagedTrue = { ...obj2, managed: true };
        await bulkCreateSuccess(client, repository, [obj1WithManagedTrue, obj2WithManagedTrue]);
        const operations = [
          ...expectObjArgs(obj1WithManagedTrue),
          ...expectObjArgs(obj2WithManagedTrue),
        ];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ operations }),
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
          const operations = [expect.any(Object), expected, expect.any(Object), expected];
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({ operations }),
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
            const operations = [expect.any(Object), expected, expect.any(Object), expected];
            expect(client.bulk).toHaveBeenCalledWith(
              expect.objectContaining({ operations }),
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
            const operations = [expect.any(Object), expected, expect.any(Object), expected];
            expect(client.bulk).toHaveBeenCalledWith(
              expect.objectContaining({ operations }),
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
            const operations = [expect.any(Object), expected, expect.any(Object), expected];
            expect(client.bulk).toHaveBeenCalledWith(
              expect.objectContaining({ operations }),
              expect.anything()
            );
          });
        });
      });

      it(`adds namespace to request body for any types that are single-namespace`, async () => {
        await bulkCreateSuccess(client, repository, [obj1, obj2], { namespace });
        const expected = expect.objectContaining({ namespace });
        const operations = [expect.any(Object), expected, expect.any(Object), expected];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ operations }),
          expect.anything()
        );
      });

      // this only ensures we don't override any other options
      it(`adds managed=false to request body if declared for any types that are single-namespace`, async () => {
        await bulkCreateSuccess(client, repository, [obj1, obj2], { namespace, managed: false });
        const expected = expect.objectContaining({ namespace, managed: false });
        const operations = [expect.any(Object), expected, expect.any(Object), expected];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ operations }),
          expect.anything()
        );
      });
      // this only ensures we don't override any other options
      it(`adds managed=true to request body if declared for any types that are single-namespace`, async () => {
        await bulkCreateSuccess(client, repository, [obj1, obj2], { namespace, managed: true });
        const expected = expect.objectContaining({ namespace, managed: true });
        const operations = [expect.any(Object), expected, expect.any(Object), expected];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ operations }),
          expect.anything()
        );
      });

      it(`normalizes options.namespace from 'default' to undefined`, async () => {
        await bulkCreateSuccess(client, repository, [obj1, obj2], { namespace: 'default' });
        const expected = expect.not.objectContaining({ namespace: 'default' });
        const operations = [expect.any(Object), expected, expect.any(Object), expected];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ operations }),
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
        const operations = [expect.any(Object), expected, expect.any(Object), expected];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ operations }),
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
          const operations = [expect.any(Object), expected1, expect.any(Object), expected2];
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({ operations }),
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
          const operations = [
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
            expect.objectContaining({ operations }),
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
          const operations = [
            { index: expect.objectContaining({ _id: `dashboard:${obj1.id}` }) },
            expect.not.objectContaining({ namespace: 'default' }),
          ];
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({ operations }),
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
          const operations = [expect.any(Object), expected, expect.any(Object), expected];
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({ operations }),
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
        const operations = [...expectObjArgs(obj1), ...objCall, ...expectObjArgs(obj2)];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ operations }),
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
          expect.objectContaining({ operations: [...expectObjArgs(o1), ...expectObjArgs(o5)] }),
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
        expect(serializer.rawToSavedObject).toHaveBeenNthCalledWith(
          1,
          {
            ...response.items[0].create,
            _source: {
              ...response.items[0].create._source,
              namespaces: response.items[0].create._source.namespaces,
              coreMigrationVersion: expect.any(String),
              typeMigrationVersion: '1.1.1',
            },
            _id: expect.stringMatching(
              /^myspace:config:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/
            ),
          },
          expect.any(Object)
        );
        expect(serializer.rawToSavedObject).toHaveBeenNthCalledWith(
          2,
          {
            ...response.items[1].create,
            _source: {
              ...response.items[1].create._source,
              namespaces: response.items[1].create._source.namespaces,
              coreMigrationVersion: expect.any(String),
              typeMigrationVersion: '1.1.1',
            },
          },
          expect.any(Object)
        );

        // Assert that ID's are deserialized to remove the type and namespace
        expect(result.saved_objects[0].id).toEqual(
          expect.stringMatching(/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/)
        );
        expect(result.saved_objects[1].id).toEqual(obj2.id);

        // Assert that managed is not changed
        expect(result.saved_objects[0].managed).toBeFalsy();
        expect(result.saved_objects[1].managed).toEqual(obj2.managed);
      });

      it(`sets managed=false if not already set`, async () => {
        const obj1WithoutManaged = {
          type: 'config',
          id: '6.0.0-alpha1',
          attributes: { title: 'Test One' },
          references: [{ name: 'ref_0', type: 'test', id: '1' }],
        };
        const obj2WithoutManaged = {
          type: 'index-pattern',
          id: 'logstash-*',
          attributes: { title: 'Test Two' },
          references: [{ name: 'ref_0', type: 'test', id: '2' }],
        };
        const result = await bulkCreateSuccess(client, repository, [
          obj1WithoutManaged,
          obj2WithoutManaged,
        ]);
        expect(result).toEqual({
          saved_objects: [obj1, obj2].map((x) => expectCreateResult(x)),
        });
      });

      it(`sets managed=false only on documents without managed already set`, async () => {
        const objWithoutManaged = {
          type: 'config',
          id: '6.0.0-alpha1',
          attributes: { title: 'Test One' },
          references: [{ name: 'ref_0', type: 'test', id: '1' }],
        };
        const result = await bulkCreateSuccess(client, repository, [objWithoutManaged, obj2]);
        expect(result).toEqual({
          saved_objects: [obj1, obj2].map((x) => expectCreateResult(x)),
        });
      });

      it(`sets managed=true if provided as an override`, async () => {
        const obj1WithoutManaged = {
          type: 'config',
          id: '6.0.0-alpha1',
          attributes: { title: 'Test One' },
          references: [{ name: 'ref_0', type: 'test', id: '1' }],
        };
        const obj2WithoutManaged = {
          type: 'index-pattern',
          id: 'logstash-*',
          attributes: { title: 'Test Two' },
          references: [{ name: 'ref_0', type: 'test', id: '2' }],
        };
        const result = await bulkCreateSuccess(
          client,
          repository,
          [obj1WithoutManaged, obj2WithoutManaged],
          { managed: true }
        );
        expect(result).toEqual({
          saved_objects: [
            { ...obj1WithoutManaged, managed: true },
            { ...obj2WithoutManaged, managed: true },
          ].map((x) => expectCreateResult(x)),
        });
      });

      it(`sets managed=false if provided as an override`, async () => {
        const obj1WithoutManaged = {
          type: 'config',
          id: '6.0.0-alpha1',
          attributes: { title: 'Test One' },
          references: [{ name: 'ref_0', type: 'test', id: '1' }],
        };
        const obj2WithoutManaged = {
          type: 'index-pattern',
          id: 'logstash-*',
          attributes: { title: 'Test Two' },
          references: [{ name: 'ref_0', type: 'test', id: '2' }],
        };
        const result = await bulkCreateSuccess(
          client,
          repository,
          [obj1WithoutManaged, obj2WithoutManaged],
          { managed: false }
        );
        expect(result).toEqual({
          saved_objects: [obj1, obj2].map((x) => expectCreateResult(x)),
        });
      });
    });

    describe('security', () => {
      it('correctly passes params to securityExtension.authorizeBulkCreate', async () => {
        const obj1WithoutManaged = {
          type: 'config',
          id: '6.0.0-alpha1',
          attributes: { title: 'Test One' },
          references: [{ name: 'ref_0', type: 'test', id: '1' }],
        };
        const obj2WithoutManaged = {
          type: 'index-pattern',
          id: 'logstash-*',
          attributes: { title: 'Test Two' },
          references: [{ name: 'ref_0', type: 'test', id: '2' }],
        };
        await bulkCreateSuccess(client, repository, [obj1WithoutManaged, obj2WithoutManaged]);

        expect(securityExtension.authorizeBulkCreate).toHaveBeenCalledWith(
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
