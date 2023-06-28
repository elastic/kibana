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
  mockGetCurrentTime,
  mockPreflightCheckForCreate,
  mockGetSearchDsl,
} from './repository.test.mock';

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  type SavedObjectUnsanitizedDoc,
  type SavedObjectReference,
} from '@kbn/core-saved-objects-server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import { SavedObjectsRepository } from './repository';
import { loggerMock } from '@kbn/logging-mocks';
import {
  SavedObjectsSerializer,
  encodeHitVersion,
} from '@kbn/core-saved-objects-base-server-internal';
import { kibanaMigratorMock } from '../mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { errors as EsErrors } from '@elastic/elasticsearch';

import {
  NAMESPACE_AGNOSTIC_TYPE,
  MULTI_NAMESPACE_ISOLATED_TYPE,
  HIDDEN_TYPE,
  mockVersionProps,
  mockTimestampFields,
  mockTimestamp,
  mappings,
  mockVersion,
  createRegistry,
  createDocumentMigrator,
  getMockGetResponse,
  createSpySerializer,
  updateSuccess,
  mockUpdateResponse,
  createBadRequestErrorPayload,
  createConflictErrorPayload,
  createGenericNotFoundErrorPayload,
  getSuccess,
  mockTimestampFieldsWithCreated,
  updateBWCSuccess,
} from '../test_helpers/repository.test.common';

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
  // ADDED BY PIERRE IN https://github.com/elastic/kibana/pull/158251
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
  // ZDT IMPLEMENTATIONS
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
      it(`should use the ES get action then update action when type is not multi-namespace`, async () => {
        await updateSuccess(client, repository, registry, type, id, attributes);
        expect(client.get).toHaveBeenCalledTimes(1);
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

      it(`should use the ES get action then update action when type is namespace agnostic`, async () => {
        await updateSuccess(client, repository, registry, NAMESPACE_AGNOSTIC_TYPE, id, attributes);
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
        /**
        Expected: ObjectContaining {"
          body": ObjectContaining {
            "upsert": ObjectContaining {
              "index-pattern": {
                "description": "bar", "title": "foo"
                },
                "type": "index-pattern"
              }
            },
             "id": "index-pattern:logstash-*"
            },
            Anything
    Received: {"_source_includes": ["namespace", "namespaces", "originId"], "body": {"doc": {"index-pattern": {"title": "Testing"}, "updated_at": "2017-08-14T15:49:14.886Z"}}, "id": "index-pattern:logstash-*", "index": ".kibana-test_8.0.0-testing", "refresh": "wait_for", "require_alias": true, "retry_on_conflict": 3}
         */
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

      it(`doesn't prepend namespace to the id when using agnostic-namespace type`, async () => {
        await updateSuccess(client, repository, registry, NAMESPACE_AGNOSTIC_TYPE, id, attributes, {
          namespace,
        });

        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: expect.stringMatching(`${NAMESPACE_AGNOSTIC_TYPE}:${id}`),
          }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when using multi-namespace type`, async () => {
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
        await expect(
          repository.update(type, id, {}, { migrationVersionCompatibility: 'raw' })
        ).rejects.toThrowError(createGenericNotFoundErrorPayload(type, id));
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

    // See bulkCreate tests for setting up and testing migrateDocument (used under the hood by migrateStorageDocument)
    describe.only('migration', () => {
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

      // use the repository get method to see what tests were added for `migrateStorageDocument`
      // use the repository create method to see what tests were added for `migrateInputDocument`
      it.only('migrates the fetched document', async () => {
        const migrationVersion = mockMigrationVersion;
        const coreMigrationVersion = '8.0.0';
        const managed = false;
        /** @TINA TODO:
         * `updateSuccess` needs to change to accept a mocked response from a get call to fetch the document.
         * we then need to pass that response to repository.update and spy on the migrator.
         * assert the migrator is called for `migrateStorageDocument` AND for migrating the doc inputs
         * expect(migrator.migrateDocument).toHaveBeenCalledTimes(2); if a doc exists, 1 if it doesn't
         */
        // migrator.migrateDocument.mockReturnValueOnce(
        //   'migrated' as unknown as ReturnType<typeof migrator.migrateDocument>
        // );

        const attribs = {
          title: 'foo',
          description: 'bar',
        };
        const optns = {
          namespace,
          references,
          version: mockVersion,
        };
        const internalOpts = {
          references,
          mockGetResponseValue: getMockGetResponse(registry, { type, id }, namespace),
        };
        await updateBWCSuccess(
          client,
          repository,
          registry,
          type,
          id,
          attribs,
          optns,
          internalOpts
        );
        expect(migrator.migrateDocument).toHaveBeenCalledTimes(1);
        expectMigrationArgs({
          id,
          type,
        });
      });

      it('migrates the input arguments', async () => {
        // TODO: come back and update after changing the client calls
        // const migrationVersion = mockMigrationVersion;
        // const coreMigrationVersion = '8.0.0';
        // const managed = false;
        await updateSuccess(client, repository, registry, type, id, attributes, {
          upsert: {
            title: 'foo',
            description: 'bar',
          },
          // I need these too:
          //   migrationVersion,
          //   coreMigrationVersion,
          //   managed,
        });

        const doc = {
          type,
          id,
          attributes: { title: 'foo', description: 'bar' },
          // references,
          // managed,
          // migrationVersion,
          // coreMigrationVersion,
          updated_at: mockTimestampFieldsWithCreated.updated_at,
        };
        expectMigrationArgs(doc);

        const migratedDoc = migrator.migrateDocument(doc);
        expect(serializer.savedObjectToRaw).toHaveBeenLastCalledWith(migratedDoc);
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
});
