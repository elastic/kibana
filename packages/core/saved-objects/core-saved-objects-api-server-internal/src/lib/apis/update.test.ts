/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @typescript-eslint/no-shadow */

import { mockGetCurrentTime, mockPreflightCheckForCreate } from '../repository.test.mock';

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  type SavedObjectUnsanitizedDoc,
  type SavedObjectReference,
  SavedObjectsRawDocSource,
  SavedObjectsErrorHelpers,
} from '@kbn/core-saved-objects-server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import { SavedObjectsRepository } from '../repository';
import { loggerMock } from '@kbn/logging-mocks';
import {
  SavedObjectsSerializer,
  encodeHitVersion,
} from '@kbn/core-saved-objects-base-server-internal';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { kibanaMigratorMock } from '../../mocks';
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
  createBadRequestErrorPayload,
  createConflictErrorPayload,
  createGenericNotFoundErrorPayload,
  updateSuccess,
  mockTimestampFieldsWithCreated,
} from '../../test_helpers/repository.test.common';

describe('#update', () => {
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
  });

  describe('performUpdate', () => {
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
    const mockMigrationVersion = { foo: '2.3.4' };
    const mockMigrateDocumentForUpdate = (doc: SavedObjectUnsanitizedDoc<any>) => {
      const response = {
        ...doc,
        attributes: {
          ...doc.attributes,
          ...(doc.attributes?.title && { title: `${doc.attributes.title}!!` }),
        },
        migrationVersion: mockMigrationVersion,
        managed: doc.managed ?? false,
        references: doc.references || [
          {
            name: 'ref_0',
            type: 'test',
            id: '1',
          },
        ],
      };
      return response;
    };

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

    describe('client calls', () => {
      it(`should use the ES get action then index action when type is not multi-namespace for existing objects`, async () => {
        const type = 'index-pattern';
        const id = 'logstash-*';
        migrator.migrateDocument.mockImplementationOnce((doc) => ({ ...doc }));
        await updateSuccess(client, repository, registry, type, id, attributes, { namespace });
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
        expect(client.index).toHaveBeenCalledTimes(1);
      });

      it(`should use the ES get action then index action when type is multi-namespace for existing objects`, async () => {
        migrator.migrateDocument.mockImplementationOnce((doc) => ({ ...doc }));
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
        expect(client.index).toHaveBeenCalledTimes(1);
      });

      it(`should use the ES get action then index action when type is namespace agnostic for existing objects`, async () => {
        migrator.migrateDocument.mockImplementationOnce((doc) => ({ ...doc }));
        await updateSuccess(client, repository, registry, NAMESPACE_AGNOSTIC_TYPE, id, attributes);
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
        expect(client.index).toHaveBeenCalledTimes(1);
      });

      it(`should use the ES index action with the merged attributes when mergeAttributes is not false`, async () => {
        migrator.migrateDocument.mockImplementationOnce((doc) => ({ ...doc }));

        await updateSuccess(client, repository, registry, NAMESPACE_AGNOSTIC_TYPE, id, {
          foo: 'bar',
        });

        expect(client.index).toHaveBeenCalledTimes(1);
        expect(client.index).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({
              globalType: {
                foo: 'bar',
                title: 'Testing',
              },
            }),
          }),
          expect.any(Object)
        );
      });

      it(`should use the ES index action only with the provided attributes when mergeAttributes is false`, async () => {
        migrator.migrateDocument.mockImplementationOnce((doc) => ({ ...doc }));

        await updateSuccess(
          client,
          repository,
          registry,
          NAMESPACE_AGNOSTIC_TYPE,
          id,
          {
            foo: 'bar',
          },
          { mergeAttributes: false }
        );

        expect(client.index).toHaveBeenCalledTimes(1);
        expect(client.index).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({
              globalType: {
                foo: 'bar',
              },
            }),
          }),
          expect.any(Object)
        );
      });

      it(`should check for alias conflicts if a new multi-namespace object before create action would be created then create action to create the object`, async () => {
        migrator.migrateDocument.mockImplementationOnce((doc) => ({ ...doc }));
        await updateSuccess(
          client,
          repository,
          registry,
          MULTI_NAMESPACE_ISOLATED_TYPE,
          id,
          attributes,
          { upsert: true },
          { mockGetResponseAsNotFound: { found: false } as estypes.GetResponse }
        );
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(mockPreflightCheckForCreate).toHaveBeenCalledTimes(1);
        expect(client.create).toHaveBeenCalledTimes(1);
      });

      it(`defaults to empty array with no input references`, async () => {
        migrator.migrateDocument.mockImplementationOnce((doc) => ({ ...doc }));
        await updateSuccess(client, repository, registry, type, id, attributes);
        expect(
          (client.index.mock.calls[0][0] as estypes.CreateRequest<SavedObjectsRawDocSource>).body!
            .references
        ).toEqual([]); // we're indexing a full new doc, serializer adds default if not defined
      });

      it(`accepts custom references array 1`, async () => {
        const test = async (references: SavedObjectReference[]) => {
          migrator.migrateDocument.mockImplementationOnce((doc) => ({ ...doc }));
          await updateSuccess(client, repository, registry, type, id, attributes, {
            references,
          });
          expect(
            (client.index.mock.calls[0][0] as estypes.CreateRequest<SavedObjectsRawDocSource>).body!
              .references
          ).toEqual(references);
          client.index.mockClear();
        };
        await test(references);
      });

      it(`accepts custom references array 2`, async () => {
        const test = async (references: SavedObjectReference[]) => {
          migrator.migrateDocument.mockImplementationOnce((doc) => ({ ...doc }));
          await updateSuccess(client, repository, registry, type, id, attributes, {
            references,
          });
          expect(
            (client.index.mock.calls[0][0] as estypes.CreateRequest<SavedObjectsRawDocSource>).body!
              .references
          ).toEqual(references);
          client.index.mockClear();
        };
        await test([{ type: 'foo', id: '42', name: 'some ref' }]);
      });

      it(`accepts custom references array 3`, async () => {
        const test = async (references: SavedObjectReference[]) => {
          migrator.migrateDocument.mockImplementationOnce((doc) => ({ ...doc }));
          await updateSuccess(client, repository, registry, type, id, attributes, {
            references,
          });
          expect(
            (client.index.mock.calls[0][0] as estypes.CreateRequest<SavedObjectsRawDocSource>).body!
              .references
          ).toEqual(references);
          client.index.mockClear();
        };
        await test([]);
      });

      it(`uses the 'upsertAttributes' option when specified for a single-namespace type that does not exist`, async () => {
        migrator.migrateDocument.mockImplementationOnce((doc) => ({ ...doc }));
        await updateSuccess(
          client,
          repository,
          registry,
          type,
          id,
          attributes,
          {
            upsert: {
              title: 'foo',
              description: 'bar',
            },
          },
          { mockGetResponseAsNotFound: { found: false } as estypes.GetResponse }
        );

        const expected = {
          'index-pattern': { description: 'bar', title: 'foo' },
          type: 'index-pattern',
          ...mockTimestampFieldsWithCreated,
        };
        expect(
          (client.create.mock.calls[0][0] as estypes.CreateRequest<SavedObjectsRawDocSource>).body!
        ).toEqual(expected);
      });

      it(`uses the 'upsertAttributes' option when specified for a multi-namespace type that does not exist`, async () => {
        const options = { upsert: { title: 'foo', description: 'bar' } };
        migrator.migrateDocument.mockImplementationOnce((doc) => ({ ...doc }));
        await updateSuccess(
          client,
          repository,
          registry,
          MULTI_NAMESPACE_ISOLATED_TYPE,
          id,
          attributes,
          {
            upsert: {
              title: 'foo',
              description: 'bar',
            },
          },
          {
            mockGetResponseAsNotFound: { found: false } as estypes.GetResponse,
          }
        );
        await repository.update(MULTI_NAMESPACE_ISOLATED_TYPE, id, attributes, options);
        expect(client.get).toHaveBeenCalledTimes(2);
        const expectedType = {
          multiNamespaceIsolatedType: { description: 'bar', title: 'foo' },
          namespaces: ['default'],
          type: 'multiNamespaceIsolatedType',
          ...mockTimestampFieldsWithCreated,
        };
        expect(
          (client.create.mock.calls[0][0] as estypes.CreateRequest<SavedObjectsRawDocSource>).body!
        ).toEqual(expectedType);
      });

      it(`ignores the 'upsertAttributes' option when specified for a multi-namespace type that already exists`, async () => {
        // attributes don't change
        const options = { upsert: { title: 'foo', description: 'bar' } };
        migrator.migrateDocument.mockImplementation((doc) => ({ ...doc }));
        await updateSuccess(
          client,
          repository,
          registry,
          MULTI_NAMESPACE_ISOLATED_TYPE,
          id,
          attributes,
          options
        );
        await repository.update(MULTI_NAMESPACE_ISOLATED_TYPE, id, attributes, options);
        expect(mockPreflightCheckForCreate).toHaveBeenCalledTimes(1);
        expect(client.index).toHaveBeenCalledTimes(1);
        expect(client.index).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${MULTI_NAMESPACE_ISOLATED_TYPE}:${id}`,
            index: '.kibana-test_8.0.0-testing',
            refresh: 'wait_for',
            require_alias: true,
            body: expect.objectContaining({
              multiNamespaceIsolatedType: { title: 'Testing' },
              namespaces: ['default'],
              references: [],
              type: 'multiNamespaceIsolatedType',
              ...mockTimestampFields,
            }),
          }),
          expect.anything()
        );
      });

      it(`doesn't accept custom references if not an array`, async () => {
        const test = async (references: unknown) => {
          migrator.migrateDocument.mockImplementation(mockMigrateDocumentForUpdate);
          await updateSuccess(client, repository, registry, type, id, attributes, {
            // @ts-expect-error references is unknown
            references,
          });
          expect(
            (client.index.mock.calls[0][0] as estypes.CreateRequest<SavedObjectsRawDocSource>).body!
              .references
          ).toEqual([]);
          client.index.mockClear();
          client.create.mockClear();
        };
        await test('string');
        await test(123);
        await test(true);
        await test(null);
      });

      it(`defaults to a refresh setting of wait_for`, async () => {
        migrator.migrateDocument.mockImplementation(mockMigrateDocumentForUpdate);
        await updateSuccess(client, repository, registry, type, id, { foo: 'bar' });
        expect(client.index).toHaveBeenCalledWith(
          expect.objectContaining({
            refresh: 'wait_for',
          }),
          expect.anything()
        );
      });

      it(`defaults to the version of the existing document when type is multi-namespace`, async () => {
        migrator.migrateDocument.mockImplementation(mockMigrateDocumentForUpdate);
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
        expect(client.index).toHaveBeenCalledWith(
          expect.objectContaining(versionProperties),
          expect.anything()
        );
      });

      it(`accepts version`, async () => {
        migrator.migrateDocument.mockImplementation(mockMigrateDocumentForUpdate);
        await updateSuccess(client, repository, registry, type, id, attributes, {
          version: encodeHitVersion({ _seq_no: 100, _primary_term: 200 }),
        });
        expect(client.index).toHaveBeenCalledWith(
          expect.objectContaining({ if_seq_no: 100, if_primary_term: 200 }),
          expect.anything()
        );
      });

      it('retries the operation in case of conflict error', async () => {
        client.get.mockResponse(getMockGetResponse(registry, { type, id }));

        client.index
          .mockImplementationOnce(() => {
            throw SavedObjectsErrorHelpers.createConflictError(type, id, 'conflict');
          })
          .mockImplementationOnce(() => {
            throw SavedObjectsErrorHelpers.createConflictError(type, id, 'conflict');
          })
          .mockResponseImplementation((params) => {
            return {
              body: {
                _id: params.id,
                _seq_no: 1,
                _primary_term: 1,
              },
            } as any;
          });

        await repository.update(type, id, attributes, { retryOnConflict: 3 });

        expect(client.get).toHaveBeenCalledTimes(3);
        expect(client.index).toHaveBeenCalledTimes(3);
      });

      it('retries the operation a maximum of `retryOnConflict` times', async () => {
        client.get.mockResponse(getMockGetResponse(registry, { type, id }));

        client.index.mockImplementation(() => {
          throw SavedObjectsErrorHelpers.createConflictError(type, id, 'conflict');
        });

        await expect(
          repository.update(type, id, attributes, { retryOnConflict: 3 })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Saved object [index-pattern/logstash-*] conflict"`
        );

        expect(client.get).toHaveBeenCalledTimes(4);
        expect(client.index).toHaveBeenCalledTimes(4);
      });

      it('default to a `retry_on_conflict` setting of `0` when `version` is provided', async () => {
        client.get.mockResponse(getMockGetResponse(registry, { type, id }));

        client.index.mockImplementation(() => {
          throw SavedObjectsErrorHelpers.createConflictError(type, id, 'conflict');
        });

        await expect(
          repository.update(type, id, attributes, {
            version: encodeHitVersion({ _seq_no: 100, _primary_term: 200 }),
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Saved object [index-pattern/logstash-*] conflict"`
        );

        expect(client.get).toHaveBeenCalledTimes(1);
        expect(client.index).toHaveBeenCalledTimes(1);
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        await updateSuccess(client, repository, registry, type, id, attributes, { namespace });
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
        expect(client.index).toHaveBeenCalledWith(
          expect.objectContaining({ id: expect.stringMatching(`${namespace}:${type}:${id}`) }), // namespace expected: globalType
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        await updateSuccess(client, repository, registry, type, id, attributes, { references });
        expect(client.index).toHaveBeenCalledWith(
          expect.objectContaining({ id: expect.stringMatching(`${type}:${id}`) }),
          expect.anything()
        );
      });

      it(`normalizes options.namespace from 'default' to undefined`, async () => {
        await updateSuccess(client, repository, registry, type, id, attributes, {
          references,
          namespace: 'default',
        });
        expect(client.index).toHaveBeenCalledWith(
          expect.objectContaining({ id: expect.stringMatching(`${type}:${id}`) }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when using agnostic-namespace type`, async () => {
        await updateSuccess(client, repository, registry, NAMESPACE_AGNOSTIC_TYPE, id, attributes, {
          namespace,
        });

        expect(client.index).toHaveBeenCalledWith(
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
        expect(client.index).toHaveBeenCalledWith(
          expect.objectContaining({
            id: expect.stringMatching(`${MULTI_NAMESPACE_ISOLATED_TYPE}:${id}`),
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
        expect(client.index).not.toHaveBeenCalled();
      });

      it(`throws when type is hidden`, async () => {
        await expectNotFoundError(HIDDEN_TYPE, id);
        expect(client.index).not.toHaveBeenCalled();
      });

      it(`throws when id is empty`, async () => {
        await expect(repository.update(type, '', attributes)).rejects.toThrowError(
          createBadRequestErrorPayload('id cannot be empty')
        );
        expect(client.index).not.toHaveBeenCalled();
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
        expect(client.index).not.toHaveBeenCalled();
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
          { mockGetResponseAsNotFound: { found: false } as estypes.GetResponse }
        );
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(mockPreflightCheckForCreate).toHaveBeenCalledTimes(1);
        expect(client.create).toHaveBeenCalledTimes(1);
      });

      it(`does not throw when the document does not exist`, async () => {
        expect(client.create).not.toHaveBeenCalled();
        await expectNotFoundError(type, id);
      });
    });

    describe('migration', () => {
      it('migrates the fetched document from get', async () => {
        const type = 'index-pattern';
        const id = 'logstash-*';
        migrator.migrateDocument.mockImplementationOnce((doc) => ({ ...doc }));
        await updateSuccess(client, repository, registry, type, id, attributes);
        expect(migrator.migrateDocument).toHaveBeenCalledTimes(2);
        expectMigrationArgs({
          id,
          type,
        });
      });

      it('migrates the input arguments when upsert is used', async () => {
        const options = {
          upsert: {
            title: 'foo',
            description: 'bar',
          },
        };
        const internalOptions = {
          mockGetResponseAsNotFound: { found: false } as estypes.GetResponse,
        };
        await updateSuccess(
          client,
          repository,
          registry,
          type,
          id,
          attributes,
          options,
          internalOptions
        );
        expect(migrator.migrateDocument).toHaveBeenCalledTimes(1);
        expectMigrationArgs({
          id,
          type,
        });
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
