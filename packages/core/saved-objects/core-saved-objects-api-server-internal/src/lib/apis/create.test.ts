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
  mockGetCurrentTime,
  mockPreflightCheckForCreate,
  mockGetSearchDsl,
} from '../repository.test.mock';

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { SavedObjectsCreateOptions } from '@kbn/core-saved-objects-api-server';
import {
  type SavedObjectsRawDoc,
  type SavedObjectsRawDocSource,
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
  mockTimestamp,
  mappings,
  mockVersion,
  createRegistry,
  createDocumentMigrator,
  createSpySerializer,
  createBadRequestErrorPayload,
  createUnsupportedTypeErrorPayload,
  createConflictErrorPayload,
  mockTimestampFieldsWithCreated,
} from '../../test_helpers/repository.test.common';

describe('#create', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repository: SavedObjectsRepository;
  let migrator: ReturnType<typeof kibanaMigratorMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let serializer: jest.Mocked<SavedObjectsSerializer>;

  const registry = createRegistry();
  const documentMigrator = createDocumentMigrator(registry);

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

  describe('performCreate', () => {
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
      it(`should use the ES index action if ID is not defined`, async () => {
        await createSuccess(type, attributes, { overwrite: true });
        expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
        expect(client.index).toHaveBeenCalled();
      });

      it(`should use the ES index action if ID is not defined and a doc has managed=true`, async () => {
        await createSuccess(type, attributes, { overwrite: true, managed: true });
        expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
        expect(client.index).toHaveBeenCalled();
      });

      it(`should use the ES index action if ID is not defined and a doc has managed=false`, async () => {
        await createSuccess(type, attributes, { overwrite: true, managed: false });
        expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
        expect(client.index).toHaveBeenCalled();
      });

      it(`should use the ES create action if ID is not defined and overwrite=false`, async () => {
        await createSuccess(type, attributes);
        expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
        expect(client.create).toHaveBeenCalled();
      });

      it(`should use the ES create action if ID is not defined, overwrite=false and a doc has managed=true`, async () => {
        await createSuccess(type, attributes, { managed: true });
        expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
        expect(client.create).toHaveBeenCalled();
      });

      it(`should use the ES create action if ID is not defined, overwrite=false and a doc has managed=false`, async () => {
        await createSuccess(type, attributes, { managed: false });
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
        const managed = false;
        await createSuccess(type, attributes, {
          id,
          references,
          migrationVersion,
          coreMigrationVersion,
          managed,
        });
        const doc = {
          type,
          id,
          attributes,
          references,
          managed,
          migrationVersion,
          coreMigrationVersion,
          ...mockTimestampFieldsWithCreated,
        };
        expectMigrationArgs(doc);

        const migratedDoc = migrator.migrateDocument(doc);
        expect(serializer.savedObjectToRaw).toHaveBeenLastCalledWith(migratedDoc);
      });

      it(`migrates a document, adds managed=false and serializes the migrated doc`, async () => {
        const migrationVersion = mockMigrationVersion;
        const coreMigrationVersion = '8.0.0';
        await createSuccess(type, attributes, {
          id,
          references,
          migrationVersion,
          coreMigrationVersion,
          managed: undefined,
        });
        const doc = {
          type,
          id,
          attributes,
          references,
          managed: undefined,
          migrationVersion,
          coreMigrationVersion,
          ...mockTimestampFieldsWithCreated,
        };
        expectMigrationArgs({ ...doc, managed: false });

        const migratedDoc = migrator.migrateDocument(doc);
        expect(migratedDoc.managed).toBe(false);
        expect(serializer.savedObjectToRaw).toHaveBeenLastCalledWith(migratedDoc);
      });

      it(`migrates a document, does not change managed=true to managed=false and serializes the migrated doc`, async () => {
        const migrationVersion = mockMigrationVersion;
        const coreMigrationVersion = '8.0.0';
        await createSuccess(type, attributes, {
          id,
          references,
          migrationVersion,
          coreMigrationVersion,
          managed: true,
        });
        const doc = {
          type,
          id,
          attributes,
          references,
          managed: true,
          migrationVersion,
          coreMigrationVersion,
          ...mockTimestampFieldsWithCreated,
        };
        expectMigrationArgs(doc);

        const migratedDoc = migrator.migrateDocument(doc);
        expect(migratedDoc.managed).toBe(true);
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
          coreMigrationVersion: expect.any(String),
          typeMigrationVersion: '1.1.1',
          managed: false,
        });
      });
      it(`allows setting 'managed' to true`, async () => {
        const result = await createSuccess(MULTI_NAMESPACE_TYPE, attributes, {
          id,
          namespace,
          references,
          managed: true,
        });
        expect(result).toEqual({
          type: MULTI_NAMESPACE_TYPE,
          id,
          ...mockTimestampFieldsWithCreated,
          version: mockVersion,
          attributes,
          references,
          namespaces: [namespace ?? 'default'],
          coreMigrationVersion: expect.any(String),
          typeMigrationVersion: '1.1.1',
          managed: true,
        });
      });
    });
  });
});
