/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  pointInTimeFinderMock,
  mockGetCurrentTime,
  mockPreflightCheckForCreate,
  mockUpdateObjectsSpaces,
  mockGetSearchDsl,
  mockCollectMultiNamespaceReferences,
  mockInternalBulkResolve,
  mockDeleteLegacyUrlAliases,
} from './repository.test.mock';

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { SavedObjectsRepository } from './repository';
import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import {
  SavedObjectsResolveResponse,
  SavedObjectsBulkUpdateObject,
} from '@kbn/core-saved-objects-api-server';
import { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import {
  ISavedObjectsSpacesExtension,
  ISavedObjectsSecurityExtension,
  ISavedObjectsEncryptionExtension,
  SavedObject,
  SavedObjectsErrorHelpers,
} from '@kbn/core-saved-objects-server';
import { kibanaMigratorMock } from '../mocks';
import {
  createRegistry,
  createDocumentMigrator,
  mappings,
  DEFAULT_SPACE,
  createSpySerializer,
  mockTimestamp,
  CUSTOM_INDEX_TYPE,
  getMockGetResponse,
  updateSuccess,
  deleteSuccess,
  removeReferencesToSuccess,
  MULTI_NAMESPACE_ISOLATED_TYPE,
  checkConflictsSuccess,
  MULTI_NAMESPACE_TYPE,
  bulkGetSuccess,
  bulkCreateSuccess,
  bulkUpdateSuccess,
  findSuccess,
  generateIndexPatternSearchResults,
  bulkDeleteSuccess,
  ENCRYPTED_TYPE,
  setupAuthorizeFunc,
  setupAuthorizeFind,
} from '../test_helpers/repository.test.common';
import { savedObjectsExtensionsMock } from '../mocks/saved_objects_extensions.mock';

const ERROR_NAMESPACE_SPECIFIED = 'Spaces currently determines the namespaces';

describe('SavedObjectsRepository Spaces Extension', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repository: SavedObjectsRepository;
  let migrator: ReturnType<typeof kibanaMigratorMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let serializer: jest.Mocked<SavedObjectsSerializer>;
  let mockSpacesExt: jest.Mocked<ISavedObjectsSpacesExtension>;
  let mockSecurityExt: jest.Mocked<ISavedObjectsSecurityExtension>;
  let mockEncryptionExt: jest.Mocked<ISavedObjectsEncryptionExtension>;

  const registry = createRegistry();
  const documentMigrator = createDocumentMigrator(registry);

  // const currentSpace = 'foo-namespace';
  const defaultOptions = { ignore: [404], meta: true }; // These are just the hard-coded options passed in via the repo

  const instantiateRepository = () => {
    const allTypes = registry.getAllTypes().map((type) => type.name);
    const allowedTypes = [...new Set(allTypes.filter((type) => !registry.isHidden(type)))];

    // @ts-expect-error must use the private constructor to use the mocked serializer
    return new SavedObjectsRepository({
      index: '.kibana-test',
      mappings,
      client,
      migrator,
      typeRegistry: registry,
      serializer,
      allowedTypes,
      logger,
      extensions: {
        spacesExtension: mockSpacesExt,
        securityExtension: mockSecurityExt,
        encryptionExtension: mockEncryptionExt,
      },
    });
  };

  const availableSpaces = [
    { id: 'default', name: '', disabledFeatures: [] },
    { id: 'ns-1', name: '', disabledFeatures: [] },
    { id: 'ns-2', name: '', disabledFeatures: [] },
    { id: 'ns-3', name: '', disabledFeatures: [] },
    { id: 'ns-4', name: '', disabledFeatures: [] },
  ];

  [
    { id: DEFAULT_SPACE, expectedNamespace: undefined },
    { id: 'ns-1', expectedNamespace: 'ns-1' },
  ].forEach((currentSpace) => {
    describe(`${currentSpace.id} space`, () => {
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

        // create a mock saved objects spaces extension
        mockSpacesExt = savedObjectsExtensionsMock.createSpacesExtension();

        mockGetCurrentTime.mockReturnValue(mockTimestamp);
        mockGetSearchDsl.mockClear();

        repository = instantiateRepository();

        mockSpacesExt.getCurrentNamespace.mockImplementation((namespace: string | undefined) => {
          if (namespace) {
            throw SavedObjectsErrorHelpers.createBadRequestError(ERROR_NAMESPACE_SPECIFIED);
          }
          return currentSpace.expectedNamespace;
        });

        mockSpacesExt.getSearchableNamespaces.mockImplementation(
          (namespaces: string[] | undefined): Promise<string[]> => {
            if (!namespaces) {
              return Promise.resolve(['current-space'] as string[]);
            } else if (!namespaces.length) {
              return Promise.resolve(namespaces);
            }

            if (namespaces?.includes('*')) {
              return Promise.resolve(availableSpaces.map((space) => space.id));
            } else {
              return Promise.resolve(
                namespaces?.filter((namespace) =>
                  availableSpaces.some((space) => space.id === namespace)
                )
              );
            }
          }
        );
      });

      describe('#get', () => {
        test(`throws error if options.namespace is specified`, async () => {
          // Just makes sure the error propagates from the extension through the repo call
          await expect(repository.get('foo', '', { namespace: 'bar' })).rejects.toThrowError(
            SavedObjectsErrorHelpers.createBadRequestError(ERROR_NAMESPACE_SPECIFIED)
          );
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith('bar');
        });

        test(`supplements id with the current namespace`, async () => {
          const type = CUSTOM_INDEX_TYPE;
          const id = 'some-id';

          const response = getMockGetResponse(registry, {
            type,
            id,
          });

          client.get.mockResponseOnce(response);
          await repository.get(type, id);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
          expect(client.get).toHaveBeenCalledTimes(1);
          expect(client.get).toHaveBeenCalledWith(
            expect.objectContaining({
              id: `${
                currentSpace.expectedNamespace ? `${currentSpace.expectedNamespace}:` : ''
              }${type}:${id}`,
            }),
            defaultOptions
          );
        });
      });

      describe('#update', () => {
        test(`throws error if options.namespace is specified`, async () => {
          // Just makes sure the error propagates from the extension through the repo call
          await expect(
            repository.update('foo', 'some-id', { attr: 'value' }, { namespace: 'bar' })
          ).rejects.toThrowError(
            SavedObjectsErrorHelpers.createBadRequestError(ERROR_NAMESPACE_SPECIFIED)
          );
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledWith('bar');
        });

        test(`supplements internal parameters with the current namespace`, async () => {
          const type = CUSTOM_INDEX_TYPE;
          const id = 'some-id';

          await updateSuccess(
            client,
            repository,
            registry,
            type,
            id,
            {},
            { upsert: true },
            { mockGetResponseAsNotFound: { found: false } as estypes.GetResponse },
            [currentSpace.expectedNamespace ?? 'default']
          );
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
          expect(client.create).toHaveBeenCalledTimes(1);
          expect(client.create).toHaveBeenCalledWith(
            expect.objectContaining({
              id: `${
                currentSpace.expectedNamespace ? `${currentSpace.expectedNamespace}:` : ''
              }${type}:${id}`,
              body: expect.objectContaining(
                currentSpace.expectedNamespace
                  ? {
                      namespace: currentSpace.expectedNamespace,
                    }
                  : {}
              ),
            }),
            expect.any(Object)
          );
        });
      });

      describe('#create', () => {
        test(`throws error if options.namespace is specified`, async () => {
          await expect(
            repository.create('foo', { attr: 'value' }, { namespace: 'bar' })
          ).rejects.toThrowError(
            SavedObjectsErrorHelpers.createBadRequestError(ERROR_NAMESPACE_SPECIFIED)
          );
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledWith('bar');
        });

        test(`supplements internal parameters with the current namespace`, async () => {
          const type = CUSTOM_INDEX_TYPE;
          const attributes = { attr: 'value' };

          await repository.create(type, { attr: 'value' });
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
          expect(client.create).toHaveBeenCalledTimes(1);
          const regex = new RegExp(
            `${
              currentSpace.expectedNamespace ? `${currentSpace.expectedNamespace}:` : ''
            }${type}:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}`
          );
          expect(client.create).toHaveBeenCalledWith(
            expect.objectContaining({
              id: expect.stringMatching(regex),
              body: expect.objectContaining(
                currentSpace.expectedNamespace
                  ? {
                      namespace: currentSpace.expectedNamespace,
                      type: CUSTOM_INDEX_TYPE,
                      customIndex: attributes,
                    }
                  : { type: CUSTOM_INDEX_TYPE, customIndex: attributes }
              ),
            }),
            { meta: true }
          );
        });
      });

      describe('#delete', () => {
        test(`throws error if options.namespace is specified`, async () => {
          await expect(
            repository.delete('foo', 'some-id', { namespace: 'bar' })
          ).rejects.toThrowError(
            SavedObjectsErrorHelpers.createBadRequestError(ERROR_NAMESPACE_SPECIFIED)
          );
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledWith('bar');
        });

        test(`supplements id with the current namespace`, async () => {
          const type = CUSTOM_INDEX_TYPE;
          const id = 'some-id';

          await deleteSuccess(client, repository, registry, type, id);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
          expect(client.delete).toHaveBeenCalledTimes(1);
          const regex = new RegExp(
            `${
              currentSpace.expectedNamespace ? `${currentSpace.expectedNamespace}:` : ''
            }${type}:${id}`
          );
          expect(client.delete).toHaveBeenCalledWith(
            expect.objectContaining({
              id: expect.stringMatching(regex),
            }),
            { ignore: [404], meta: true }
          );
        });
      });

      describe('#removeReferencesTo', () => {
        test(`throws error if options.namespace is specified`, async () => {
          await expect(
            repository.removeReferencesTo('foo', 'some-id', { namespace: 'bar' })
          ).rejects.toThrowError(
            SavedObjectsErrorHelpers.createBadRequestError(ERROR_NAMESPACE_SPECIFIED)
          );
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledWith('bar');
        });

        test(`supplements internal parameters with the current namespace`, async () => {
          const type = CUSTOM_INDEX_TYPE;
          const id = 'some-id';

          const query = { query: 1, aggregations: 2 };
          mockGetSearchDsl.mockReturnValue(query);

          await removeReferencesToSuccess(client, repository, type, id);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
          expect(client.updateByQuery).toHaveBeenCalledTimes(1);
          expect(mockGetSearchDsl).toHaveBeenCalledTimes(1);
          expect(mockGetSearchDsl).toHaveBeenCalledWith(
            mappings,
            registry,
            expect.objectContaining({
              namespaces: currentSpace.expectedNamespace
                ? [currentSpace.expectedNamespace]
                : undefined,
              hasReference: { type, id },
            })
          );
        });
      });

      describe('#checkConflicts', () => {
        test(`throws error if options.namespace is specified`, async () => {
          await expect(
            repository.checkConflicts(undefined, { namespace: 'bar' })
          ).rejects.toThrowError(
            SavedObjectsErrorHelpers.createBadRequestError(ERROR_NAMESPACE_SPECIFIED)
          );
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledWith('bar');
        });

        test(`supplements internal parameters with the current namespace`, async () => {
          const obj1 = { type: CUSTOM_INDEX_TYPE, id: 'one' };
          const obj2 = { type: MULTI_NAMESPACE_ISOLATED_TYPE, id: 'two' };

          await checkConflictsSuccess(client, repository, registry, [obj1, obj2]);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
          expect(client.mget).toHaveBeenCalledTimes(1);
          expect(client.mget).toHaveBeenCalledWith(
            expect.objectContaining({
              body: expect.objectContaining({
                docs: expect.arrayContaining([
                  expect.objectContaining({
                    _id: `${
                      currentSpace.expectedNamespace ? `${currentSpace.expectedNamespace}:` : ''
                    }${obj1.type}:${obj1.id}`,
                  }),
                  expect.objectContaining({
                    _id: `${obj2.type}:${obj2.id}`,
                  }),
                ]),
              }),
            }),
            { ignore: [404], meta: true }
          );
        });
      });

      describe('#updateObjectSpaces', () => {
        afterEach(() => {
          mockUpdateObjectsSpaces.mockReset();
        });

        test(`throws error if options.namespace is specified`, async () => {
          await expect(
            repository.updateObjectsSpaces([], [], [], { namespace: 'bar' })
          ).rejects.toThrowError(
            SavedObjectsErrorHelpers.createBadRequestError(ERROR_NAMESPACE_SPECIFIED)
          );
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledWith('bar');
        });

        test(`supplements internal parameters with the current namespace`, async () => {
          const obj1 = { type: CUSTOM_INDEX_TYPE, id: 'one' };
          const obj2 = { type: MULTI_NAMESPACE_ISOLATED_TYPE, id: 'two' };
          const spacesToAdd = ['space-x'];
          const spacesToRemove = ['space-y'];

          await repository.updateObjectsSpaces([obj1, obj2], spacesToAdd, spacesToRemove);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
          expect(mockUpdateObjectsSpaces).toHaveBeenCalledTimes(1);
          expect(mockUpdateObjectsSpaces).toHaveBeenCalledWith(
            expect.objectContaining({
              objects: [obj1, obj2],
              options: {
                namespace: currentSpace.expectedNamespace
                  ? currentSpace.expectedNamespace
                  : undefined,
              },
            })
          );
        });
      });

      describe('#collectMultiNamespaceReferences', () => {
        afterEach(() => {
          mockCollectMultiNamespaceReferences.mockReset();
        });

        test(`throws error if options.namespace is specified`, async () => {
          await expect(
            repository.collectMultiNamespaceReferences([], { namespace: 'bar' })
          ).rejects.toThrowError(
            SavedObjectsErrorHelpers.createBadRequestError(ERROR_NAMESPACE_SPECIFIED)
          );
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledWith('bar');
        });

        test(`supplements internal parameters with the current namespace`, async () => {
          const obj1 = { type: CUSTOM_INDEX_TYPE, id: 'one' };
          const obj2 = { type: MULTI_NAMESPACE_ISOLATED_TYPE, id: 'two' };

          await repository.collectMultiNamespaceReferences([obj1, obj2]);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
          expect(mockCollectMultiNamespaceReferences).toHaveBeenCalledTimes(1);
          expect(mockCollectMultiNamespaceReferences).toHaveBeenCalledWith(
            expect.objectContaining({
              objects: [obj1, obj2],
              options: {
                namespace: currentSpace.expectedNamespace
                  ? currentSpace.expectedNamespace
                  : undefined,
              },
            })
          );
        });
      });

      describe('#openPointInTimeForType', () => {
        test(`propagates options.namespaces: ['*']`, async () => {
          await repository.openPointInTimeForType(CUSTOM_INDEX_TYPE, { namespaces: ['*'] });
          expect(mockSpacesExt.getSearchableNamespaces).toBeCalledTimes(1);
          expect(mockSpacesExt.getSearchableNamespaces).toBeCalledWith(['*']);
        });

        test(`supplements options with the current namespace`, async () => {
          await repository.openPointInTimeForType(CUSTOM_INDEX_TYPE);
          expect(mockSpacesExt.getSearchableNamespaces).toBeCalledTimes(1);
          expect(mockSpacesExt.getSearchableNamespaces).toBeCalledWith(undefined); // will resolve current space
        });
      });

      describe('#resolve', () => {
        afterEach(() => {
          mockInternalBulkResolve.mockReset();
        });

        test(`throws error if options.namespace is specified`, async () => {
          await expect(
            repository.resolve('foo', 'some-id', { namespace: 'bar' })
          ).rejects.toThrowError(
            SavedObjectsErrorHelpers.createBadRequestError(ERROR_NAMESPACE_SPECIFIED)
          );
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledWith('bar');
        });

        test(`supplements internal parameters with the current namespace`, async () => {
          const type = CUSTOM_INDEX_TYPE;
          const id = 'some-id';

          const expectedResult: SavedObjectsResolveResponse = {
            saved_object: { type, id, attributes: {}, references: [] },
            outcome: 'exactMatch',
          };
          mockInternalBulkResolve.mockResolvedValue({ resolved_objects: [expectedResult] });
          await repository.resolve(type, id);
          expect(mockInternalBulkResolve).toHaveBeenCalledTimes(1);
          expect(mockInternalBulkResolve).toHaveBeenCalledWith(
            expect.objectContaining({
              objects: [{ type, id }],
              options: {
                namespace: currentSpace.expectedNamespace
                  ? currentSpace.expectedNamespace
                  : undefined,
              },
            }),
            expect.any(Object)
          );
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
          type: MULTI_NAMESPACE_TYPE,
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

        test(`throws error if options.namespace is specified`, async () => {
          await expect(
            bulkGetSuccess(client, repository, registry, [obj1, obj2], { namespace: 'foo-bar' })
          ).rejects.toThrowError(
            SavedObjectsErrorHelpers.createBadRequestError(ERROR_NAMESPACE_SPECIFIED)
          );
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledWith('foo-bar');
        });

        test(`supplements internal parameters with the current namespace`, async () => {
          await bulkGetSuccess(client, repository, registry, [obj1, obj2]);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
          expect(mockSpacesExt.getSearchableNamespaces).not.toHaveBeenCalled();
          expect(client.mget).toHaveBeenCalledTimes(1);
          expect(client.mget).toHaveBeenCalledWith(
            expect.objectContaining({
              body: expect.objectContaining({
                docs: expect.arrayContaining([
                  expect.objectContaining({
                    _id: `${
                      currentSpace.expectedNamespace ? `${currentSpace.expectedNamespace}:` : ''
                    }${obj1.type}:${obj1.id}`,
                  }),
                  expect.objectContaining({
                    _id: `${obj2.type}:${obj2.id}`,
                  }),
                ]),
              }),
            }),
            { ignore: [404], meta: true }
          );
        });

        test(`calls getSearchableNamespaces with '*' when object namespaces includes '*'`, async () => {
          await bulkGetSuccess(client, repository, registry, [
            obj1,
            { ...obj2, namespaces: ['*'] },
          ]);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
          expect(mockSpacesExt.getSearchableNamespaces).toHaveBeenCalledTimes(1);
          expect(mockSpacesExt.getSearchableNamespaces).toHaveBeenCalledWith(['*']);
        });
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
          type: MULTI_NAMESPACE_TYPE,
          id: 'logstash-*',
          attributes: { title: 'Test Two' },
          references: [{ name: 'ref_0', type: 'test', id: '2' }],
        };

        test(`throws error if options.namespace is specified`, async () => {
          await expect(
            bulkCreateSuccess(client, repository, [obj1, obj2], { namespace: 'foo-bar' })
          ).rejects.toThrowError(
            SavedObjectsErrorHelpers.createBadRequestError(ERROR_NAMESPACE_SPECIFIED)
          );
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledWith('foo-bar');
        });

        test(`supplements internal parameters with the current namespace`, async () => {
          await bulkCreateSuccess(client, repository, [obj1, obj2]);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
          expect(mockSpacesExt.getSearchableNamespaces).not.toHaveBeenCalled();
          expect(client.bulk).toHaveBeenCalledTimes(1);
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({
              body: expect.arrayContaining([
                expect.objectContaining({
                  create: expect.objectContaining({
                    _id: `${
                      currentSpace.expectedNamespace ? `${currentSpace.expectedNamespace}:` : ''
                    }${obj1.type}:${obj1.id}`,
                  }),
                }),
                expect.objectContaining({
                  create: expect.objectContaining({
                    _id: `${obj2.type}:${obj2.id}`,
                  }),
                }),
              ]),
            }),
            {}
          );
        });
      });

      describe('#bulkUpdate', () => {
        const obj1: SavedObjectsBulkUpdateObject = {
          type: 'config',
          id: '6.0.0-alpha1',
          attributes: { title: 'Test One' },
        };
        const obj2: SavedObjectsBulkUpdateObject = {
          type: MULTI_NAMESPACE_TYPE,
          id: 'logstash-*',
          attributes: { title: 'Test Two' },
        };

        test(`throws error if options.namespace is specified`, async () => {
          await expect(
            bulkUpdateSuccess(client, repository, registry, [obj1, obj2], { namespace: 'foo-bar' })
          ).rejects.toThrowError(
            SavedObjectsErrorHelpers.createBadRequestError(ERROR_NAMESPACE_SPECIFIED)
          );
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledWith('foo-bar');
        });

        test(`supplements internal parameters with the current namespace`, async () => {
          await bulkUpdateSuccess(
            client,
            repository,
            registry,
            [obj1, obj2],
            undefined,
            undefined,
            currentSpace.expectedNamespace
          );
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
          expect(mockSpacesExt.getSearchableNamespaces).not.toHaveBeenCalled();
          expect(client.bulk).toHaveBeenCalledTimes(1);
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({
              body: expect.arrayContaining([
                expect.objectContaining({
                  index: expect.objectContaining({
                    _id: `${
                      currentSpace.expectedNamespace ? `${currentSpace.expectedNamespace}:` : ''
                    }${obj1.type}:${obj1.id}`,
                  }),
                }),
                expect.objectContaining({
                  config: obj1.attributes,
                }),

                expect.objectContaining({
                  index: expect.objectContaining({
                    _id: `${obj2.type}:${obj2.id}`,
                  }),
                }),
                expect.objectContaining({
                  multiNamespaceType: obj2.attributes,
                }),
              ]),
            }),
            {}
          );
        });
      });

      describe('#bulkResolve', () => {
        afterEach(() => {
          mockInternalBulkResolve.mockReset();
        });

        test(`throws error if options.namespace is specified`, async () => {
          await expect(repository.bulkResolve([], { namespace: 'foo-bar' })).rejects.toThrowError(
            SavedObjectsErrorHelpers.createBadRequestError(ERROR_NAMESPACE_SPECIFIED)
          );
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledWith('foo-bar');
        });

        test(`supplements internal parameters with the current namespace`, async () => {
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
          await repository.bulkResolve(objects);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
          expect(mockSpacesExt.getSearchableNamespaces).not.toHaveBeenCalled();
          expect(mockInternalBulkResolve).toHaveBeenCalledTimes(1);
          expect(mockInternalBulkResolve).toHaveBeenCalledWith(
            expect.objectContaining({
              options: {
                namespace: currentSpace.expectedNamespace
                  ? `${currentSpace.expectedNamespace}`
                  : undefined,
              },
            }),
            expect.any(Object)
          );
        });
      });

      describe('#find', () => {
        test(`supplements internal parameters with options.type and options.namespaces`, async () => {
          const type = 'index-pattern';
          const spaceOverride = 'ns-4';
          await findSuccess(client, repository, { type, namespaces: [spaceOverride] });
          expect(mockSpacesExt.getSearchableNamespaces).toBeCalledTimes(1);
          expect(mockSpacesExt.getSearchableNamespaces).toBeCalledWith([spaceOverride]);
          expect(mockGetSearchDsl).toHaveBeenCalledWith(
            mappings,
            registry,
            expect.objectContaining({
              namespaces: [spaceOverride],
              type: [type],
            })
          );
        });

        test(`propagates options.namespaces: ['*']`, async () => {
          const type = 'index-pattern';
          await findSuccess(client, repository, { type, namespaces: ['*'] });
          expect(mockSpacesExt.getSearchableNamespaces).toBeCalledTimes(1);
          expect(mockSpacesExt.getSearchableNamespaces).toBeCalledWith(['*']);
        });

        test(`supplements options with the current namespace`, async () => {
          const type = 'index-pattern';
          await findSuccess(client, repository, { type });
          expect(mockSpacesExt.getSearchableNamespaces).toBeCalledTimes(1);
          expect(mockSpacesExt.getSearchableNamespaces).toBeCalledWith(undefined); // will resolve current space
        });
      });

      describe('#bulkDelete', () => {
        beforeEach(() => {
          mockDeleteLegacyUrlAliases.mockClear();
          mockDeleteLegacyUrlAliases.mockResolvedValue();
        });

        const obj1: SavedObjectsBulkUpdateObject = {
          type: 'config',
          id: '6.0.0-alpha1',
          attributes: { title: 'Test One' },
        };
        const obj2: SavedObjectsBulkUpdateObject = {
          type: MULTI_NAMESPACE_TYPE,
          id: 'logstash-*',
          attributes: { title: 'Test Two' },
        };
        const testObjs = [obj1, obj2];
        const options = {
          force: true,
        };
        const internalOptions = {
          mockMGetResponseObjects: [
            {
              ...obj1,
              initialNamespaces: undefined,
            },
            {
              ...obj2,
              initialNamespaces: [currentSpace.id, 'NS-1', 'NS-2'],
            },
          ],
        };

        test(`throws error if options.namespace is specified`, async () => {
          await expect(
            bulkDeleteSuccess(client, repository, registry, testObjs, { namespace: 'foo-bar' })
          ).rejects.toThrowError(
            SavedObjectsErrorHelpers.createBadRequestError(ERROR_NAMESPACE_SPECIFIED)
          );
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledWith('foo-bar');
        });

        test(`supplements internal parameters with the current namespace`, async () => {
          await bulkDeleteSuccess(client, repository, registry, testObjs, options, internalOptions);
          expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
          expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
          expect(mockSpacesExt.getSearchableNamespaces).not.toHaveBeenCalled();
          expect(client.bulk).toHaveBeenCalledTimes(1);
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({
              body: expect.arrayContaining([
                expect.objectContaining({
                  delete: expect.objectContaining({
                    _id: `${
                      currentSpace.expectedNamespace ? `${currentSpace.expectedNamespace}:` : ''
                    }${obj1.type}:${obj1.id}`,
                  }),
                }),
                expect.objectContaining({
                  delete: expect.objectContaining({
                    _id: `${obj2.type}:${obj2.id}`,
                  }),
                }),
              ]),
            }),
            {}
          );
        });
      });

      test('#getCurrentNamespace', () => {
        mockSpacesExt.getCurrentNamespace.mockReturnValue('ns-from-ext');

        expect(repository.getCurrentNamespace('ns-from-arg')).toBe('ns-from-ext');
        expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
        expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith('ns-from-arg');
      });
    });
  });

  describe(`with security extension`, () => {
    // Note: resolve, bulkResolve, and collectMultiNamespaceReferences are not tested here because they
    // receive parameter arguments from internal methods (internalBulkResolve and the internal
    // implementation of collectMultiNamespaceReferences). Arguments to these methods are tested above.
    const currentSpace = 'current_space';

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
      // create a mock extensions
      mockSpacesExt = savedObjectsExtensionsMock.createSpacesExtension();
      mockSecurityExt = savedObjectsExtensionsMock.createSecurityExtension();
      mockGetCurrentTime.mockReturnValue(mockTimestamp);
      mockGetSearchDsl.mockClear();
      repository = instantiateRepository();
      mockSpacesExt.getSearchableNamespaces.mockImplementation(
        (namespaces: string[] | undefined): Promise<string[]> => {
          if (!namespaces) {
            return Promise.resolve([currentSpace] as string[]);
          } else if (!namespaces.length) {
            return Promise.resolve(namespaces);
          }
          if (namespaces?.includes('*')) {
            return Promise.resolve(availableSpaces.map((space) => space.id));
          } else {
            return Promise.resolve(
              namespaces?.filter((namespace) =>
                availableSpaces.some((space) => space.id === namespace)
              )
            );
          }
        }
      );
      mockSpacesExt.getCurrentNamespace.mockImplementation((namespace: string | undefined) => {
        if (namespace) {
          throw SavedObjectsErrorHelpers.createBadRequestError(ERROR_NAMESPACE_SPECIFIED);
        }
        return currentSpace;
      });
    });

    describe(`#find`, () => {
      test(`returns empty result if user is unauthorized`, async () => {
        setupAuthorizeFind(mockSecurityExt, 'unauthorized');
        const type = 'index-pattern';
        const spaceOverride = 'ns-4';
        const generatedResults = generateIndexPatternSearchResults(spaceOverride);
        client.search.mockResponseOnce(generatedResults);
        const result = await repository.find({ type, namespaces: [spaceOverride] });
        expect(result).toEqual(expect.objectContaining({ total: 0 }));
      });

      test(`calls authorizeFind with the current namespace`, async () => {
        const type = 'index-pattern';
        await findSuccess(client, repository, { type });
        expect(mockSpacesExt.getSearchableNamespaces).toBeCalledTimes(1);
        expect(mockSpacesExt.getSearchableNamespaces).toBeCalledWith(undefined);
        expect(mockSecurityExt.authorizeFind).toHaveBeenCalledTimes(1);
        expect(mockSecurityExt.authorizeFind).toHaveBeenCalledWith(
          expect.objectContaining({ namespaces: new Set([currentSpace]) })
        );
      });
    });

    describe(`#create`, () => {
      test(`calls authorizeCreate with the current namespace`, async () => {
        const type = CUSTOM_INDEX_TYPE;
        setupAuthorizeFunc(mockSecurityExt.authorizeCreate as jest.Mock, 'fully_authorized');
        await repository.create(type, { attr: 'value' });
        expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
        expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
        expect(mockSecurityExt.authorizeCreate).toHaveBeenCalledTimes(1);
        expect(mockSecurityExt.authorizeCreate).toHaveBeenCalledWith(
          expect.objectContaining({ namespace: currentSpace })
        );
      });
    });

    describe(`#bulkCreate`, () => {
      const obj1 = {
        type: 'config',
        id: '6.0.0-alpha1',
        attributes: { title: 'Test One' },
        references: [{ name: 'ref_0', type: 'test', id: '1' }],
      };
      const obj2 = {
        type: MULTI_NAMESPACE_TYPE,
        id: 'logstash-*',
        attributes: { title: 'Test Two' },
        references: [{ name: 'ref_0', type: 'test', id: '2' }],
      };

      beforeEach(() => {
        mockPreflightCheckForCreate.mockReset();
        mockPreflightCheckForCreate.mockImplementation(({ objects }) => {
          return Promise.resolve(objects.map(({ type, id }) => ({ type, id }))); // respond with no errors by default
        });
      });

      test(`calls authorizeBulkCreate with the current namespace`, async () => {
        setupAuthorizeFunc(mockSecurityExt.authorizeBulkCreate, 'fully_authorized');
        await bulkCreateSuccess(client, repository, [obj1, obj2]);
        expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
        expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
        expect(mockSecurityExt.authorizeBulkCreate).toHaveBeenCalledTimes(1);
        expect(mockSecurityExt.authorizeBulkCreate).toHaveBeenCalledWith(
          expect.objectContaining({ namespace: currentSpace })
        );
      });
    });

    describe(`#get`, () => {
      test(`calls authorizeGet with the current namespace`, async () => {
        setupAuthorizeFunc(mockSecurityExt.authorizeGet, 'fully_authorized');
        const type = CUSTOM_INDEX_TYPE;
        const id = 'some-id';

        const response = getMockGetResponse(registry, {
          type,
          id,
        });

        client.get.mockResponseOnce(response);
        await repository.get(type, id);
        expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
        expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
        expect(mockSecurityExt.authorizeGet).toHaveBeenCalledTimes(1);
        expect(mockSecurityExt.authorizeGet).toHaveBeenCalledWith(
          expect.objectContaining({ namespace: currentSpace })
        );
      });
    });

    describe(`#bulkGet`, () => {
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
        type: MULTI_NAMESPACE_TYPE,
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

      test(`calls authorizeBulkGet with the current namespace`, async () => {
        setupAuthorizeFunc(mockSecurityExt.authorizeBulkGet, 'fully_authorized');
        await bulkGetSuccess(client, repository, registry, [obj1, obj2]);
        expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
        expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
        expect(mockSecurityExt.authorizeBulkGet).toHaveBeenCalledTimes(1);
        expect(mockSecurityExt.authorizeBulkGet).toHaveBeenCalledWith(
          expect.objectContaining({ namespace: currentSpace })
        );
      });
    });

    describe(`#update`, () => {
      test(`calls authorizeUpdate with the current namespace`, async () => {
        const type = CUSTOM_INDEX_TYPE;
        const id = 'some-id';

        await updateSuccess(
          client,
          repository,
          registry,
          type,
          id,
          {},
          { upsert: true },
          { mockGetResponseAsNotFound: { found: false } as estypes.GetResponse },
          [currentSpace]
        );
        expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
        expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
        expect(mockSecurityExt.authorizeUpdate).toHaveBeenCalledTimes(1);
        expect(mockSecurityExt.authorizeUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ namespace: currentSpace })
        );
      });
    });

    describe(`#bulkUpdate`, () => {
      const obj1: SavedObjectsBulkUpdateObject = {
        type: 'config',
        id: '6.0.0-alpha1',
        attributes: { title: 'Test One' },
      };
      const obj2: SavedObjectsBulkUpdateObject = {
        type: MULTI_NAMESPACE_TYPE,
        id: 'logstash-*',
        attributes: { title: 'Test Two' },
      };

      test(`calls authorizeBulkUpdate with the current namespace`, async () => {
        setupAuthorizeFunc(mockSecurityExt.authorizeBulkUpdate, 'fully_authorized');
        await bulkUpdateSuccess(
          client,
          repository,
          registry,
          [obj1, obj2],
          undefined,
          undefined,
          currentSpace
        );
        expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
        expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
        expect(mockSecurityExt.authorizeBulkUpdate).toHaveBeenCalledTimes(1);
        expect(mockSecurityExt.authorizeBulkUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ namespace: currentSpace })
        );
      });
    });

    describe(`#delete`, () => {
      test(`calls authorizeDelete with the current namespace`, async () => {
        const type = CUSTOM_INDEX_TYPE;
        const id = 'some-id';
        setupAuthorizeFunc(mockSecurityExt.authorizeBulkDelete, 'fully_authorized');
        await deleteSuccess(client, repository, registry, type, id);
        expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
        expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
        expect(mockSecurityExt.authorizeDelete).toHaveBeenCalledTimes(1);
        expect(mockSecurityExt.authorizeDelete).toHaveBeenCalledWith(
          expect.objectContaining({ namespace: currentSpace })
        );
      });
    });

    describe(`#bulkDelete`, () => {
      const obj1: SavedObjectsBulkUpdateObject = {
        type: 'config',
        id: '6.0.0-alpha1',
        attributes: { title: 'Test One' },
      };
      const obj2: SavedObjectsBulkUpdateObject = {
        type: MULTI_NAMESPACE_TYPE,
        id: 'logstash-*',
        attributes: { title: 'Test Two' },
      };

      const testObjs = [obj1, obj2];
      const options = {
        force: true,
      };

      const internalOptions = {
        mockMGetResponseObjects: [
          {
            ...obj1,
            initialNamespaces: undefined,
          },
          {
            ...obj2,
            initialNamespaces: [currentSpace, 'NS-1', 'NS-2'],
          },
        ],
      };

      beforeEach(() => {
        mockDeleteLegacyUrlAliases.mockClear();
        mockDeleteLegacyUrlAliases.mockResolvedValue();
      });

      test(`calls authorizeBulkDelete with the current namespace`, async () => {
        setupAuthorizeFunc(mockSecurityExt.authorizeBulkDelete, 'fully_authorized');
        await bulkDeleteSuccess(client, repository, registry, testObjs, options, internalOptions);
        expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
        expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
        expect(mockSecurityExt.authorizeBulkDelete).toHaveBeenCalledTimes(1);
        expect(mockSecurityExt.authorizeBulkDelete).toHaveBeenCalledWith(
          expect.objectContaining({ namespace: currentSpace })
        );
      });
    });

    describe(`#checkConflicts`, () => {
      test(`calls authorizeCheckConflicts with the current namespace`, async () => {
        const obj1 = { type: CUSTOM_INDEX_TYPE, id: 'one' };
        const obj2 = { type: MULTI_NAMESPACE_ISOLATED_TYPE, id: 'two' };

        await checkConflictsSuccess(client, repository, registry, [obj1, obj2]);
        expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
        expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
        expect(mockSecurityExt.authorizeCheckConflicts).toHaveBeenCalledTimes(1);
        expect(mockSecurityExt.authorizeCheckConflicts).toHaveBeenCalledWith(
          expect.objectContaining({ namespace: currentSpace })
        );
      });
    });

    describe(`#removeReferencesTo`, () => {
      test(`calls authorizeRemoveReferences with the current namespace`, async () => {
        const type = CUSTOM_INDEX_TYPE;
        const id = 'some-id';

        const query = { query: 1, aggregations: 2 };
        mockGetSearchDsl.mockReturnValue(query);

        await removeReferencesToSuccess(client, repository, type, id);
        expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
        expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
        expect(mockSecurityExt.authorizeRemoveReferences).toHaveBeenCalledTimes(1);
        expect(mockSecurityExt.authorizeRemoveReferences).toHaveBeenCalledWith(
          expect.objectContaining({ namespace: currentSpace })
        );
      });
    });

    describe(`#openPointInTimeForType`, () => {
      test(`calls authorizeOpenPointInTime with the current namespace`, async () => {
        setupAuthorizeFunc(mockSecurityExt.authorizeOpenPointInTime, 'fully_authorized');
        await repository.openPointInTimeForType(CUSTOM_INDEX_TYPE);
        expect(mockSpacesExt.getSearchableNamespaces).toBeCalledTimes(1);
        expect(mockSpacesExt.getSearchableNamespaces).toBeCalledWith(undefined); // will resolve current space
        expect(mockSecurityExt.authorizeOpenPointInTime).toHaveBeenCalledTimes(1);
        expect(mockSecurityExt.authorizeOpenPointInTime).toHaveBeenCalledWith(
          expect.objectContaining({ namespaces: new Set([currentSpace]) })
        );
      });
    });
  });

  describe(`with encryption extension`, () => {
    const currentSpace = 'current_space';
    const encryptedSO = {
      id: 'encrypted-id',
      type: ENCRYPTED_TYPE,
      namespaces: ['foo-namespace'],
      attributes: {
        attrNotSoSecret: '*not-so-secret*',
        attrOne: 'one',
        attrSecret: '*secret*',
        attrThree: 'three',
        title: 'Testing',
      },
      references: [],
    };
    const decryptedStrippedAttributes = {
      attributes: { attrOne: 'one', attrNotSoSecret: 'not-so-secret', attrThree: 'three' },
    };

    beforeEach(() => {
      pointInTimeFinderMock.mockClear();
      client = elasticsearchClientMock.createElasticsearchClient();
      migrator = kibanaMigratorMock.create();
      documentMigrator.prepareMigrations();
      migrator.migrateDocument = jest.fn().mockImplementation(documentMigrator.migrate);
      migrator.runMigrations = jest.fn().mockResolvedValue([{ status: 'skipped' }]);
      logger = loggerMock.create();
      serializer = createSpySerializer(registry);
      mockSpacesExt = savedObjectsExtensionsMock.createSpacesExtension();
      mockEncryptionExt = savedObjectsExtensionsMock.createEncryptionExtension();
      mockEncryptionExt.encryptAttributes.mockImplementation((desc, attributes) =>
        Promise.resolve(attributes)
      );
      mockGetCurrentTime.mockReturnValue(mockTimestamp);
      mockGetSearchDsl.mockClear();
      repository = instantiateRepository();
      mockSpacesExt.getCurrentNamespace.mockImplementation((namespace: string | undefined) => {
        if (namespace) {
          throw SavedObjectsErrorHelpers.createBadRequestError(ERROR_NAMESPACE_SPECIFIED);
        }
        return currentSpace;
      });
    });

    describe(`#create`, () => {
      test(`calls encryptAttributes with the current namespace`, async () => {
        mockEncryptionExt.isEncryptableType.mockReturnValue(true);
        await repository.create(encryptedSO.type, encryptedSO.attributes);
        expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
        expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
        expect(client.create).toHaveBeenCalledTimes(1);
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledTimes(3); // (no upsert) optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenNthCalledWith(1, encryptedSO.type);
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenNthCalledWith(2, encryptedSO.type);
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenNthCalledWith(3, encryptedSO.type);
        expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledTimes(1);
        expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledWith(
          {
            id: expect.objectContaining(/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
            namespace: currentSpace,
            type: ENCRYPTED_TYPE,
          },
          encryptedSO.attributes
        );
      });
    });

    describe(`#bulkCreate`, () => {
      const obj1 = {
        type: 'config',
        id: '6.0.0-alpha1',
        attributes: { title: 'Test One' },
        references: [{ name: 'ref_0', type: 'test', id: '1' }],
      };

      test(`calls encryptAttributes with the current namespace`, async () => {
        mockEncryptionExt.isEncryptableType.mockReturnValueOnce(false);
        mockEncryptionExt.isEncryptableType.mockReturnValueOnce(true);
        mockEncryptionExt.isEncryptableType.mockReturnValueOnce(false);
        mockEncryptionExt.isEncryptableType.mockReturnValueOnce(true);
        mockEncryptionExt.isEncryptableType.mockReturnValueOnce(false);
        mockEncryptionExt.isEncryptableType.mockReturnValueOnce(true);
        await bulkCreateSuccess(client, repository, [
          obj1,
          { ...encryptedSO, id: undefined }, // Predefined IDs are not allowed for saved objects with encrypted attributes unless the ID is a UUID
        ]);
        expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
        expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
        expect(mockSpacesExt.getSearchableNamespaces).not.toHaveBeenCalled();
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledTimes(6);
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenNthCalledWith(1, obj1.type);
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenNthCalledWith(2, encryptedSO.type);
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenNthCalledWith(3, obj1.type);
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenNthCalledWith(4, encryptedSO.type);
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenNthCalledWith(5, obj1.type);
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenNthCalledWith(6, encryptedSO.type);

        expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledTimes(1);
        expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledWith(
          {
            id: expect.objectContaining(/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
            namespace: currentSpace,
            type: ENCRYPTED_TYPE,
          },
          encryptedSO.attributes
        );
      });
    });

    describe(`#update`, () => {
      it('calls encryptAttributes with the current namespace', async () => {
        mockEncryptionExt.isEncryptableType.mockReturnValue(true);
        mockEncryptionExt.decryptOrStripResponseAttributes.mockResolvedValue({
          ...encryptedSO,
          ...decryptedStrippedAttributes,
        });
        await updateSuccess(
          client,
          repository,
          registry,
          encryptedSO.type,
          encryptedSO.id,
          encryptedSO.attributes,
          {
            // no namespace provided
            references: encryptedSO.references,
          },
          {}
        );
        expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
        expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
        expect(client.index).toHaveBeenCalledTimes(1);
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledTimes(2); // (no upsert) optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledWith(encryptedSO.type);
        expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledTimes(1);
        expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledWith(
          {
            id: encryptedSO.id,
            namespace: currentSpace,
            type: ENCRYPTED_TYPE,
          },
          encryptedSO.attributes
        );
      });
    });

    describe(`#bulkUpdate`, () => {
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

      it(`calls encryptAttributes with the current namespace`, async () => {
        mockEncryptionExt.isEncryptableType.mockReturnValueOnce(false);
        mockEncryptionExt.isEncryptableType.mockReturnValueOnce(true);
        mockEncryptionExt.isEncryptableType.mockReturnValueOnce(false);
        mockEncryptionExt.isEncryptableType.mockReturnValueOnce(false);
        mockEncryptionExt.isEncryptableType.mockReturnValueOnce(true);
        mockEncryptionExt.isEncryptableType.mockReturnValueOnce(false);
        await bulkUpdateSuccess(
          client,
          repository,
          registry,
          [obj1, encryptedSO, obj2],
          undefined, // No options/namespace specified
          undefined,
          undefined
        );
        expect(mockSpacesExt.getCurrentNamespace).toBeCalledTimes(1);
        expect(mockSpacesExt.getCurrentNamespace).toHaveBeenCalledWith(undefined);
        expect(mockSpacesExt.getSearchableNamespaces).not.toHaveBeenCalled();
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledTimes(6); // (no upsert) optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenNthCalledWith(1, obj1.type);
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenNthCalledWith(2, encryptedSO.type);
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenNthCalledWith(3, obj2.type);
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenNthCalledWith(4, obj1.type);
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenNthCalledWith(5, encryptedSO.type);
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenNthCalledWith(6, obj2.type);
        expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledTimes(1);
        expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledWith(
          {
            id: encryptedSO.id,
            namespace: currentSpace,
            type: ENCRYPTED_TYPE,
          },
          encryptedSO.attributes
        );
      });
    });
  });
});
