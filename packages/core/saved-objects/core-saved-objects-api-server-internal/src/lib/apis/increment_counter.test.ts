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
} from '../repository.test.mock';

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type {
  SavedObjectsIncrementCounterField,
  SavedObjectsIncrementCounterOptions,
} from '@kbn/core-saved-objects-api-server';
import {
  type SavedObjectUnsanitizedDoc,
  MAIN_SAVED_OBJECT_INDEX,
} from '@kbn/core-saved-objects-server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import { SavedObjectsRepository } from '../repository';
import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import { kibanaMigratorMock } from '../../mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

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
  createUnsupportedTypeErrorPayload,
  createConflictErrorPayload,
} from '../../test_helpers/repository.test.common';

describe('#incrementCounter', () => {
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

  describe('performIncrementCounter', () => {
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
            _index: MAIN_SAVED_OBJECT_INDEX,
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
              _index: MAIN_SAVED_OBJECT_INDEX,
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
});
