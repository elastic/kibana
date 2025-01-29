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
  mockGetCurrentTime,
  mockGetSearchDsl,
  mockDeleteLegacyUrlAliases,
  mockPreflightCheckForCreate,
} from './repository.test.mock';

import { SavedObjectsRepository } from './repository';
import { loggerMock } from '@kbn/logging-mocks';
import { estypes } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { SavedObjectsBulkUpdateObject } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import {
  ISavedObjectsSecurityExtension,
  SavedObjectsRawDocSource,
  AuthorizationTypeEntry,
  SavedObject,
} from '@kbn/core-saved-objects-server';
import { kibanaMigratorMock } from '../mocks';
import {
  createRegistry,
  createDocumentMigrator,
  mappings,
  createSpySerializer,
  mockTimestamp,
  checkAuthError,
  getSuccess,
  enforceError,
  setupRedactPassthrough,
  MULTI_NAMESPACE_CUSTOM_INDEX_TYPE,
  authMap,
  updateSuccess,
  deleteSuccess,
  removeReferencesToSuccess,
  checkConflictsSuccess,
  findSuccess,
  mockTimestampFields,
  mockVersion,
  NAMESPACE_AGNOSTIC_TYPE,
  bulkGetSuccess,
  expectBulkGetResult,
  bulkCreateSuccess,
  expectCreateResult,
  MULTI_NAMESPACE_TYPE,
  bulkUpdateSuccess,
  expectUpdateResult,
  bulkDeleteSuccess,
  createBulkDeleteSuccessStatus,
  REMOVE_REFS_COUNT,
  setupGetFindRedactTypeMap,
  generateIndexPatternSearchResults,
  setupAuthorizeFunc,
  setupAuthorizeFind,
} from '../test_helpers/repository.test.common';
import { savedObjectsExtensionsMock } from '../mocks/saved_objects_extensions.mock';
import { arrayMapsAreEqual } from '@kbn/core-saved-objects-utils-server';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';
import { OpenPointInTimeResponse } from '@elastic/elasticsearch/lib/api/types';

describe('SavedObjectsRepository Security Extension', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repository: SavedObjectsRepository;
  let migrator: ReturnType<typeof kibanaMigratorMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let serializer: jest.Mocked<SavedObjectsSerializer>;
  let mockSecurityExt: jest.Mocked<ISavedObjectsSecurityExtension>;

  const registry = createRegistry();
  const documentMigrator = createDocumentMigrator(registry);

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
      extensions: { securityExtension: mockSecurityExt },
    });
  };

  const type = 'index-pattern';
  const id = 'logstash-*';
  const namespace = 'foo-namespace';
  const attributes = { attr1: 'one', attr2: 'two', attr3: 'three' };
  const multiNamespaceObjNamespaces = ['ns-1', 'ns-2', namespace];

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

    // create a mock saved objects encryption extension
    mockSecurityExt = savedObjectsExtensionsMock.createSecurityExtension();
    mockGetCurrentTime.mockReturnValue(mockTimestamp);
    repository = instantiateRepository();
    setupGetFindRedactTypeMap(mockSecurityExt);
  });

  afterEach(() => {
    mockSecurityExt.redactNamespaces.mockClear();
    mockGetSearchDsl.mockClear();
  });

  describe('#get', () => {
    test(`propagates decorated error when authorizeGet rejects promise`, async () => {
      mockSecurityExt.authorizeGet.mockRejectedValueOnce(checkAuthError);
      await expect(
        getSuccess(client, repository, registry, type, id, { namespace })
      ).rejects.toThrow(checkAuthError);
      expect(mockSecurityExt.authorizeGet).toHaveBeenCalledTimes(1);
    });

    test(`propagates decorated error when unauthorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeGet, 'unauthorized');

      await expect(
        getSuccess(client, repository, registry, type, id, { namespace })
      ).rejects.toThrow(enforceError);

      expect(mockSecurityExt.authorizeGet).toHaveBeenCalledTimes(1);
    });

    test(`returns result when partially authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeGet, 'partially_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const result = await getSuccess(client, repository, registry, type, id, { namespace });

      expect(mockSecurityExt.authorizeGet).toHaveBeenCalledTimes(1);
      expect(client.get).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expect.objectContaining({ type, id, namespaces: [namespace] }));
    });

    test(`returns result when fully authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeGet, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const result = await getSuccess(client, repository, registry, type, id, { namespace });

      expect(mockSecurityExt.authorizeGet).toHaveBeenCalledTimes(1);
      expect(client.get).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expect.objectContaining({ type, id, namespaces: [namespace] }));
    });

    test(`calls authorizeGet with correct parameters`, async () => {
      await getSuccess(
        client,
        repository,
        registry,
        MULTI_NAMESPACE_CUSTOM_INDEX_TYPE,
        id,
        {
          namespace,
        },
        undefined,
        multiNamespaceObjNamespaces // all of the object's namespaces from preflight check are added to the auth check call
      );

      expect(mockSecurityExt.authorizeGet).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.authorizeGet).toHaveBeenCalledWith({
        namespace,
        object: {
          existingNamespaces: multiNamespaceObjNamespaces,
          id,
          type: MULTI_NAMESPACE_CUSTOM_INDEX_TYPE,
          name: 'Testing',
        },
        objectNotFound: false,
      });
    });

    test(`calls redactNamespaces with authorization map`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeGet, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      await getSuccess(client, repository, registry, type, id, { namespace });

      expect(mockSecurityExt.authorizeGet).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.redactNamespaces).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.redactNamespaces).toHaveBeenCalledWith(
        expect.objectContaining({
          typeMap: authMap,
          savedObject: expect.objectContaining({ type, id, namespaces: [namespace] }),
        })
      );
    });
  });

  describe('#update', () => {
    test(`propagates decorated error when authorizeUpdate rejects promise`, async () => {
      mockSecurityExt.authorizeUpdate.mockRejectedValueOnce(checkAuthError);
      await expect(
        updateSuccess(client, repository, registry, type, id, attributes, { namespace })
      ).rejects.toThrow(checkAuthError);
      expect(mockSecurityExt.authorizeUpdate).toHaveBeenCalledTimes(1);
    });

    test(`propagates decorated error when unauthorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeUpdate, 'unauthorized');
      await expect(
        updateSuccess(client, repository, registry, type, id, attributes, { namespace })
      ).rejects.toThrow(enforceError);

      expect(mockSecurityExt.authorizeUpdate).toHaveBeenCalledTimes(1);
    });

    test(`returns result when partially authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeUpdate, 'partially_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const result = await updateSuccess(client, repository, registry, type, id, attributes, {
        namespace,
      });

      expect(mockSecurityExt.authorizeUpdate).toHaveBeenCalledTimes(1);
      expect(client.index).toHaveBeenCalledTimes(1);
      expect(result).toEqual(
        expect.objectContaining({ id, type, attributes, namespaces: [namespace] })
      );
    });

    test(`returns result when fully authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeUpdate, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const result = await updateSuccess(client, repository, registry, type, id, attributes, {
        namespace,
      });

      expect(mockSecurityExt.authorizeUpdate).toHaveBeenCalledTimes(1);
      expect(client.index).toHaveBeenCalledTimes(1);
      expect(result).toEqual(
        expect.objectContaining({ id, type, attributes, namespaces: [namespace] })
      );
    });

    test(`calls authorizeUpdate with correct parameters`, async () => {
      await updateSuccess(
        client,
        repository,
        registry,
        MULTI_NAMESPACE_CUSTOM_INDEX_TYPE,
        id,
        attributes,
        {
          namespace,
        },
        {},
        multiNamespaceObjNamespaces // all of the object's namespaces from preflight check are added to the auth check call
      );

      expect(mockSecurityExt.authorizeUpdate).toHaveBeenCalledTimes(1);
      const expectedNamespace = namespace;
      const expectedObject = {
        type: 'multiNamespaceTypeCustomIndex',
        id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
        existingNamespaces: multiNamespaceObjNamespaces,
      };

      const { namespace: actualNamespace, object: actualObject } =
        mockSecurityExt.authorizeUpdate.mock.calls[0][0];

      expect(actualNamespace).toEqual(expectedNamespace);
      expect(actualObject).toEqual(expectedObject);
    });

    test(`calls redactNamespaces with authorization map`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeUpdate, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      await updateSuccess(client, repository, registry, type, id, attributes, { namespace });

      expect(mockSecurityExt.authorizeUpdate).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.redactNamespaces).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.redactNamespaces).toHaveBeenCalledWith(
        expect.objectContaining({
          typeMap: authMap,
          savedObject: expect.objectContaining({ type, id, namespaces: [namespace] }),
        })
      );
    });

    test(`adds updated_by to the saved object when the current user is available`, async () => {
      const profileUid = 'profileUid';
      mockSecurityExt.getCurrentUser.mockImplementationOnce(() =>
        mockAuthenticatedUser({ profile_uid: profileUid })
      );

      const result = await updateSuccess(client, repository, registry, type, id, attributes, {
        namespace,
      });

      expect(result).not.toHaveProperty('created_by');
      expect(result.updated_by).toBe(profileUid);
    });
  });

  describe('#create', () => {
    test(`propagates decorated error when authorizeCreate rejects promise`, async () => {
      mockSecurityExt.authorizeCreate.mockRejectedValueOnce(checkAuthError);
      await expect(repository.create(type, attributes, { namespace })).rejects.toThrow(
        checkAuthError
      );
      expect(mockSecurityExt.authorizeCreate).toHaveBeenCalledTimes(1);
    });

    test(`propagates decorated error when unauthorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeCreate, 'unauthorized');
      await expect(repository.create(type, attributes, { namespace })).rejects.toThrow(
        enforceError
      );

      expect(mockSecurityExt.authorizeCreate).toHaveBeenCalledTimes(1);
    });

    test(`returns result when partially authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeCreate, 'partially_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const result = await repository.create(type, attributes, {
        namespace,
      });

      expect(mockSecurityExt.authorizeCreate).toHaveBeenCalledTimes(1);
      expect(client.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(
        expect.objectContaining({
          id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          type,
          attributes,
          namespaces: [namespace],
        })
      );
    });

    test(`returns result when fully authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeCreate as jest.Mock, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const result = await repository.create(type, attributes, {
        namespace,
      });

      expect(mockSecurityExt.authorizeCreate).toHaveBeenCalledTimes(1);
      expect(client.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(
        expect.objectContaining({
          id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          type,
          attributes,
          namespaces: [namespace],
        })
      );
    });

    test(`calls authorizeCreate with correct parameters`, async () => {
      await repository.create(MULTI_NAMESPACE_CUSTOM_INDEX_TYPE, attributes, {
        namespace,
      });

      expect(mockSecurityExt.authorizeCreate).toHaveBeenCalledTimes(1);
      const expectedNamespace = namespace;
      const expectedObject = {
        type: 'multiNamespaceTypeCustomIndex',
        id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
        initialNamespaces: undefined,
        existingNamespaces: [],
      };
      const { namespace: actualNamespace, object: actualObject } =
        mockSecurityExt.authorizeCreate.mock.calls[0][0];

      expect(actualNamespace).toEqual(expectedNamespace);
      expect(actualObject).toEqual(expectedObject);
    });

    test(`calls authorizeCreate with initial namespaces`, async () => {
      await repository.create(MULTI_NAMESPACE_CUSTOM_INDEX_TYPE, attributes, {
        namespace,
        initialNamespaces: multiNamespaceObjNamespaces,
      });

      expect(mockSecurityExt.authorizeCreate).toHaveBeenCalledTimes(1);
      const expectedNamespace = namespace;
      const expectedObject = {
        type: 'multiNamespaceTypeCustomIndex',
        id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
        initialNamespaces: multiNamespaceObjNamespaces,
        existingNamespaces: [],
      };

      const { namespace: actualNamespace, object: actualObject } =
        mockSecurityExt.authorizeCreate.mock.calls[0][0];

      expect(actualNamespace).toEqual(expectedNamespace);
      expect(actualObject).toEqual(expectedObject);
    });

    test(`calls redactNamespaces with authorization map`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeCreate as jest.Mock, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      await repository.create(type, attributes, { namespace });

      expect(mockSecurityExt.authorizeCreate).toHaveBeenCalledTimes(1);

      expect(mockSecurityExt.redactNamespaces).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.redactNamespaces).toHaveBeenCalledWith(
        expect.objectContaining({
          typeMap: authMap,
          savedObject: expect.objectContaining({
            type,
            id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
            namespaces: [namespace],
          }),
        })
      );
    });

    test(`adds created_by, updated_by to the saved object when the current user is available`, async () => {
      const profileUid = 'profileUid';
      mockSecurityExt.getCurrentUser.mockImplementationOnce(() =>
        mockAuthenticatedUser({ profile_uid: profileUid })
      );
      const response = await repository.create(MULTI_NAMESPACE_CUSTOM_INDEX_TYPE, attributes, {
        namespace,
      });
      expect(response.created_by).toBe(profileUid);
      expect(response.updated_by).toBe(profileUid);
    });

    test(`keeps created_by, updated_by empty if the current user is not available`, async () => {
      mockSecurityExt.getCurrentUser.mockImplementationOnce(() => null);
      const response = await repository.create(MULTI_NAMESPACE_CUSTOM_INDEX_TYPE, attributes, {
        namespace,
      });
      expect(response).not.toHaveProperty('created_by');
      expect(response).not.toHaveProperty('updated_by');
    });
  });

  describe('#delete', () => {
    beforeAll(() => {
      mockDeleteLegacyUrlAliases.mockResolvedValue();
    });

    afterAll(() => {
      mockDeleteLegacyUrlAliases.mockClear();
    });

    test(`propagates decorated error when authorizeDelete rejects promise`, async () => {
      mockSecurityExt.authorizeDelete.mockRejectedValueOnce(checkAuthError);
      await expect(
        deleteSuccess(client, repository, registry, type, id, { namespace })
      ).rejects.toThrow(checkAuthError);
      expect(mockSecurityExt.authorizeDelete).toHaveBeenCalledTimes(1);
    });

    test(`propagates decorated error when unauthorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeDelete, 'unauthorized');

      await expect(
        deleteSuccess(client, repository, registry, type, id, { namespace })
      ).rejects.toThrow(enforceError);

      expect(mockSecurityExt.authorizeDelete).toHaveBeenCalledTimes(1);
    });

    test(`returns empty object result when partially authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeDelete, 'partially_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const result = await deleteSuccess(client, repository, registry, type, id, {
        namespace,
      });

      expect(mockSecurityExt.authorizeDelete).toHaveBeenCalledTimes(1);
      expect(client.delete).toHaveBeenCalledTimes(1);
      expect(result).toEqual({});
    });

    test(`returns empty object result when fully authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeDelete, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const result = await deleteSuccess(client, repository, registry, type, id, {
        namespace,
      });

      expect(mockSecurityExt.authorizeDelete).toHaveBeenCalledTimes(1);
      expect(client.delete).toHaveBeenCalledTimes(1);
      expect(result).toEqual({});
    });

    test(`calls authorizeDelete with correct parameters`, async () => {
      await deleteSuccess(client, repository, registry, type, id, {
        namespace,
        force: true,
      });

      expect(mockSecurityExt.authorizeDelete).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.authorizeDelete).toHaveBeenCalledWith({
        namespace,
        object: { type, id },
      });
    });
  });

  describe('#removeReferencesTo', () => {
    test(`propagates decorated error when authorizeRemoveReferences rejects promise`, async () => {
      mockSecurityExt.authorizeRemoveReferences.mockRejectedValueOnce(checkAuthError);
      await expect(
        removeReferencesToSuccess(client, repository, type, id, { namespace })
      ).rejects.toThrow(checkAuthError);
      expect(mockSecurityExt.authorizeRemoveReferences).toHaveBeenCalledTimes(1);
    });

    test(`propagates decorated error when unauthorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeRemoveReferences, 'unauthorized');

      await expect(
        removeReferencesToSuccess(client, repository, type, id, { namespace })
      ).rejects.toThrow(enforceError);

      expect(mockSecurityExt.authorizeRemoveReferences).toHaveBeenCalledTimes(1);
    });

    test(`returns result when partially authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeRemoveReferences, 'partially_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const result = await removeReferencesToSuccess(client, repository, type, id, { namespace });

      expect(mockSecurityExt.authorizeRemoveReferences).toHaveBeenCalledTimes(1);
      expect(client.updateByQuery).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expect.objectContaining({ updated: REMOVE_REFS_COUNT }));
    });

    test(`returns result when fully authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeRemoveReferences, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const result = await removeReferencesToSuccess(client, repository, type, id, { namespace });

      expect(mockSecurityExt.authorizeRemoveReferences).toHaveBeenCalledTimes(1);
      expect(client.updateByQuery).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expect.objectContaining({ updated: REMOVE_REFS_COUNT }));
    });

    test(`calls authorizeRemoveReferences with correct parameters`, async () => {
      await removeReferencesToSuccess(client, repository, type, id, { namespace });

      expect(mockSecurityExt.authorizeRemoveReferences).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.authorizeRemoveReferences).toHaveBeenCalledWith({
        namespace,
        object: {
          id,
          type,
        },
      });
    });
  });

  describe('#checkConflicts', () => {
    const obj1 = { type, id: 'one' };
    const obj2 = { type, id: 'two' };

    const expectedResult = {
      errors: [
        {
          error: {
            error: 'Conflict',
            message: `Saved object [${obj1.type}/${obj1.id}] conflict`,
            statusCode: 409,
          },
          id: obj1.id,
          type: obj1.type,
        },
        {
          error: {
            error: 'Conflict',
            message: `Saved object [${obj2.type}/${obj2.id}] conflict`,
            statusCode: 409,
          },
          id: obj2.id,
          type: obj2.type,
        },
      ],
    };

    test(`propagates decorated error when authorizeCheckConflicts rejects promise`, async () => {
      mockSecurityExt.authorizeCheckConflicts.mockRejectedValueOnce(checkAuthError);
      await expect(
        checkConflictsSuccess(client, repository, registry, [obj1, obj2], { namespace })
      ).rejects.toThrow(checkAuthError);
      expect(mockSecurityExt.authorizeCheckConflicts).toHaveBeenCalledTimes(1);
    });

    test(`propagates decorated error when unauthorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeCheckConflicts, 'unauthorized');

      await expect(
        checkConflictsSuccess(client, repository, registry, [obj1, obj2], { namespace })
      ).rejects.toThrow(enforceError);

      expect(mockSecurityExt.authorizeCheckConflicts).toHaveBeenCalledTimes(1);
    });

    test(`returns result when partially authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeCheckConflicts, 'partially_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const result = await checkConflictsSuccess(client, repository, registry, [obj1, obj2], {
        namespace,
      });

      expect(mockSecurityExt.authorizeCheckConflicts).toHaveBeenCalledTimes(1);
      expect(client.mget).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    test(`returns result when fully authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeCheckConflicts, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const result = await checkConflictsSuccess(client, repository, registry, [obj1, obj2], {
        namespace,
      });

      expect(mockSecurityExt.authorizeCheckConflicts).toHaveBeenCalledTimes(1);
      expect(client.mget).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    test(`calls authorizeCheckConflicts with correct parameters`, async () => {
      await checkConflictsSuccess(client, repository, registry, [obj1, obj2], { namespace });

      expect(mockSecurityExt.authorizeCheckConflicts).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.authorizeCheckConflicts).toHaveBeenCalledWith({
        namespace,
        objects: [obj1, obj2],
      });
    });
  });

  describe('#openPointInTimeForType', () => {
    test(`propagates decorated error when authorizeOpenPointInTime rejects promise`, async () => {
      mockSecurityExt.authorizeOpenPointInTime.mockRejectedValueOnce(checkAuthError);
      await expect(repository.openPointInTimeForType(type)).rejects.toThrow(checkAuthError);
      expect(mockSecurityExt.authorizeOpenPointInTime).toHaveBeenCalledTimes(1);
    });

    test(`returns result when partially authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeOpenPointInTime, 'partially_authorized');

      client.openPointInTime.mockResponseOnce({ id } as OpenPointInTimeResponse);
      const result = await repository.openPointInTimeForType(type);

      expect(mockSecurityExt.authorizeOpenPointInTime).toHaveBeenCalledTimes(1);
      expect(client.openPointInTime).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expect.objectContaining({ id }));
    });

    test(`returns result when fully authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeOpenPointInTime, 'fully_authorized');

      client.openPointInTime.mockResponseOnce({ id } as OpenPointInTimeResponse);
      const result = await repository.openPointInTimeForType(type);

      expect(mockSecurityExt.authorizeOpenPointInTime).toHaveBeenCalledTimes(1);
      expect(client.openPointInTime).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expect.objectContaining({ id }));
    });

    test(`throws an error when unauthorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeOpenPointInTime, 'unauthorized');
      await expect(repository.openPointInTimeForType(type)).rejects.toThrowError();
    });

    test(`calls authorizeOpenPointInTime with correct parameters`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeOpenPointInTime, 'fully_authorized');
      client.openPointInTime.mockResponseOnce({ id } as OpenPointInTimeResponse);
      const namespaces = [namespace, 'x', 'y', 'z'];
      await repository.openPointInTimeForType(type, { namespaces });
      expect(mockSecurityExt.authorizeOpenPointInTime).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.authorizeOpenPointInTime).toHaveBeenCalledWith({
        namespaces: new Set(namespaces),
        types: new Set([type]),
      });
    });
  });

  describe('#closePointInTime', () => {
    test(`returns result of es client`, async () => {
      const expectedResult = { succeeded: true, num_freed: 3 };
      client.closePointInTime.mockResponseOnce(expectedResult);
      const result = await repository.closePointInTime(id);
      expect(client.closePointInTime).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    test(`calls auditClosePointInTime`, async () => {
      await repository.closePointInTime(id);
      expect(mockSecurityExt.auditClosePointInTime).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.auditClosePointInTime).toHaveBeenCalledWith();
    });
  });

  describe('#find', () => {
    test(`propagates decorated error when authorizeFind rejects promise`, async () => {
      mockSecurityExt.authorizeFind.mockRejectedValueOnce(checkAuthError);
      await expect(findSuccess(client, repository, { type })).rejects.toThrow(checkAuthError);
      expect(mockSecurityExt.authorizeFind).toHaveBeenCalledTimes(1);
    });

    test(`propagates decorated error when getFindRedactTypeMap rejects promise`, async () => {
      mockSecurityExt.getFindRedactTypeMap.mockRejectedValueOnce(checkAuthError);
      await expect(findSuccess(client, repository, { type })).rejects.toThrow(checkAuthError);
      expect(mockSecurityExt.getFindRedactTypeMap).toHaveBeenCalledTimes(1);
    });

    test(`returns empty result when preauthorization is unauthorized`, async () => {
      setupAuthorizeFind(mockSecurityExt, 'unauthorized');

      const result = await repository.find({ type });

      expect(mockSecurityExt.authorizeFind).toHaveBeenCalledTimes(1);
      expect(result).toEqual(
        expect.objectContaining({
          saved_objects: [],
          total: 0,
        })
      );
    });

    test(`returns result when getFindRedactTypeMap is unauthorized`, async () => {
      setupAuthorizeFind(mockSecurityExt, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const generatedResults = generateIndexPatternSearchResults(namespace);
      client.search.mockResponseOnce(generatedResults);
      const result = await repository.find({ type });

      expect(mockSecurityExt.authorizeFind).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.getFindRedactTypeMap).toHaveBeenCalledTimes(1);
      expect(result.total).toBe(4);
      expect(result.saved_objects).toHaveLength(4);
      generatedResults.hits.hits.forEach((doc, i) => {
        expect(result.saved_objects[i]).toEqual({
          id: doc._id!.replace(/(foo-namespace\:)?(index-pattern|config|globalType)\:/, ''),
          type: doc._source!.type,
          originId: doc._source!.originId,
          ...mockTimestampFields,
          version: mockVersion,
          score: doc._score,
          attributes: doc._source![doc._source!.type],
          references: [],
          namespaces: doc._source!.type === NAMESPACE_AGNOSTIC_TYPE ? undefined : [namespace],
          coreMigrationVersion: expect.any(String),
          typeMigrationVersion: expect.any(String),
          managed: expect.any(Boolean),
        });
      });
    });

    test(`calls es search with only authorized spaces when partially authorized`, async () => {
      // Setup partial authorization with the specific type and space of the current test definition
      const authRecord: Record<string, AuthorizationTypeEntry> = {
        find: { authorizedSpaces: [namespace] },
      };
      mockSecurityExt.authorizeFind.mockResolvedValue({
        status: 'partially_authorized',
        typeMap: Object.freeze(new Map([[type, authRecord]])),
      });

      await findSuccess(client, repository, { type, namespaces: [namespace, 'ns-1'] });
      expect(mockGetSearchDsl.mock.calls[0].length).toBe(3); // Find success verifies this is called once, this should always pass
      const {
        typeToNamespacesMap: actualMap,
      }: { typeToNamespacesMap: Map<string, string[] | undefined> } =
        mockGetSearchDsl.mock.calls[0][2];

      expect(actualMap).toBeDefined();
      const expectedMap = new Map<string, string[] | undefined>();
      expectedMap.set(type, [namespace]);
      expect(arrayMapsAreEqual(actualMap, expectedMap)).toBeTruthy();
    });

    test(`returns result of es find when fully authorized`, async () => {
      setupAuthorizeFind(mockSecurityExt, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const { result, generatedResults } = await findSuccess(
        client,
        repository,
        { type },
        namespace
      );
      const count = generatedResults.hits.hits.length;

      expect(result.total).toBe(count);
      expect(result.saved_objects).toHaveLength(count);

      generatedResults.hits.hits.forEach((doc, i) => {
        expect(result.saved_objects[i]).toEqual({
          id: doc._id!.replace(/(foo-namespace\:)?(index-pattern|config|globalType)\:/, ''),
          type: doc._source!.type,
          originId: doc._source!.originId,
          ...mockTimestampFields,
          version: mockVersion,
          score: doc._score,
          attributes: doc._source![doc._source!.type],
          references: [],
          namespaces: doc._source!.type === NAMESPACE_AGNOSTIC_TYPE ? undefined : [namespace],
          coreMigrationVersion: expect.any(String),
          typeMigrationVersion: expect.any(String),
          managed: expect.any(Boolean),
        });
      });
    });

    test(`uses the authorization map when partially authorized`, async () => {
      setupAuthorizeFind(mockSecurityExt, 'partially_authorized');
      setupRedactPassthrough(mockSecurityExt);

      await findSuccess(
        client,
        repository,
        { type: [type, NAMESPACE_AGNOSTIC_TYPE], namespaces: [namespace, 'ns-1'] }, // include multiple types and spaces
        namespace
      );

      expect(mockGetSearchDsl.mock.calls[0].length).toBe(3); // Find success verifies this is called once, this should always pass
      const {
        typeToNamespacesMap: actualMap,
      }: { typeToNamespacesMap: Map<string, string[] | undefined> } =
        mockGetSearchDsl.mock.calls[0][2];

      expect(actualMap).not.toBeUndefined();
      const expectedMap = new Map<string, string[] | undefined>();
      expectedMap.set('foo', ['bar']); // this is what is hard-coded in authMap

      expect(arrayMapsAreEqual(actualMap, expectedMap)).toBeTruthy();
    });

    test(`returns result of es find when partially authorized`, async () => {
      setupAuthorizeFind(mockSecurityExt, 'partially_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const { result, generatedResults } = await findSuccess(
        client,
        repository,
        { type },
        namespace
      );
      const count = generatedResults.hits.hits.length;

      expect(result.total).toBe(count);
      expect(result.saved_objects).toHaveLength(count);

      generatedResults.hits.hits.forEach((doc, i) => {
        expect(result.saved_objects[i]).toEqual({
          id: doc._id!.replace(/(foo-namespace\:)?(index-pattern|config|globalType)\:/, ''),
          type: doc._source!.type,
          originId: doc._source!.originId,
          ...mockTimestampFields,
          version: mockVersion,
          score: doc._score,
          attributes: doc._source![doc._source!.type],
          references: [],
          namespaces: doc._source!.type === NAMESPACE_AGNOSTIC_TYPE ? undefined : [namespace],
          coreMigrationVersion: expect.any(String),
          typeMigrationVersion: expect.any(String),
          managed: expect.any(Boolean),
        });
      });
    });

    test(`calls authorizeFind with correct parameters`, async () => {
      setupAuthorizeFind(mockSecurityExt, 'partially_authorized');
      setupRedactPassthrough(mockSecurityExt);
      await findSuccess(client, repository, { type, namespaces: [namespace] }, 'ns-2');

      expect(mockSecurityExt.authorizeFind).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.authorizeFind).toHaveBeenCalledWith({
        namespaces: new Set([namespace]),
        types: new Set(['index-pattern']),
      });
    });

    test(`calls GetFindRedactTypeMap with correct parameters`, async () => {
      setupAuthorizeFind(mockSecurityExt, 'partially_authorized');
      setupRedactPassthrough(mockSecurityExt);
      const { generatedResults } = await findSuccess(
        client,
        repository,
        { type, namespaces: [namespace] },
        'ns-2'
      );

      expect(mockSecurityExt.authorizeFind).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.getFindRedactTypeMap).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.getFindRedactTypeMap).toHaveBeenCalledWith({
        previouslyCheckedNamespaces: new Set([namespace]),
        objects: generatedResults.hits.hits.map((obj) => {
          return {
            type: obj._source?.type,
            id: obj._id!.slice(obj._id!.lastIndexOf(':') + 1), // find removes the space/type from the ID in the original raw doc
            existingNamespaces:
              obj._source?.namespaces ?? obj._source?.namespace ? [obj._source?.namespace] : [],
          };
        }),
      });
    });

    test(`calls redactNamespaces with authorization map`, async () => {
      setupAuthorizeFind(mockSecurityExt, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const { generatedResults } = await findSuccess(client, repository, {
        type,
        namespaces: [namespace],
      });

      expect(mockSecurityExt.redactNamespaces).toHaveBeenCalledTimes(
        generatedResults.hits.hits.length
      );
      expect(mockSecurityExt.redactNamespaces).toBeCalledWith(
        expect.objectContaining({
          typeMap: authMap,
        })
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
      namespaces: [namespace],
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
      namespaces: [namespace],
    };

    const expectedAuthObjects = [
      {
        error: true,
        existingNamespaces: ['default'],
        objectNamespaces: ['ns-1', 'ns-2', namespace],
        id: '6.0.0-alpha1',
        type: 'multiNamespaceTypeCustomIndex',
        name: undefined,
      },
      {
        error: false,
        existingNamespaces: [],
        objectNamespaces: ['ns-3'],
        id: 'logstash-*',
        type: 'index-pattern',
        name: 'Testing',
      },
    ];

    test(`propagates decorated error when authorizeBulkGet rejects promise`, async () => {
      mockSecurityExt.authorizeBulkGet.mockRejectedValueOnce(checkAuthError);
      await expect(
        bulkGetSuccess(client, repository, registry, [obj1, obj2], { namespace })
      ).rejects.toThrow(checkAuthError);
      expect(mockSecurityExt.authorizeBulkGet).toHaveBeenCalledTimes(1);
    });

    test(`propagates decorated error when unauthorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeBulkGet, 'unauthorized');

      await expect(
        bulkGetSuccess(client, repository, registry, [obj1, obj2], { namespace })
      ).rejects.toThrow(enforceError);

      expect(mockSecurityExt.authorizeBulkGet).toHaveBeenCalledTimes(1);
    });

    test(`returns result when partially authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeBulkGet, 'partially_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const { result, mockResponse } = await bulkGetSuccess(
        client,
        repository,
        registry,
        [obj1, obj2],
        { namespace }
      );

      expect(mockSecurityExt.authorizeBulkGet).toHaveBeenCalledTimes(1);
      expect(client.mget).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        saved_objects: [
          expectBulkGetResult(
            obj1,
            mockResponse.docs[0] as estypes.GetGetResult<SavedObjectsRawDocSource>
          ),
          expectBulkGetResult(
            obj2,
            mockResponse.docs[1] as estypes.GetGetResult<SavedObjectsRawDocSource>
          ),
        ],
      });
    });

    test(`returns result when fully authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeBulkGet, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const { result, mockResponse } = await bulkGetSuccess(
        client,
        repository,
        registry,
        [obj1, obj2],
        { namespace }
      );

      expect(mockSecurityExt.authorizeBulkGet).toHaveBeenCalledTimes(1);
      expect(client.mget).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        saved_objects: [
          expectBulkGetResult(
            obj1,
            mockResponse.docs[0] as estypes.GetGetResult<SavedObjectsRawDocSource>
          ),
          expectBulkGetResult(
            obj2,
            mockResponse.docs[1] as estypes.GetGetResult<SavedObjectsRawDocSource>
          ),
        ],
      });
    });

    test(`calls authorizeBulkGet with correct parameters in default space`, async () => {
      const objA = {
        ...obj1,
        type: MULTI_NAMESPACE_CUSTOM_INDEX_TYPE, // replace the type to a mult-namespace type for this test to be thorough
        namespaces: multiNamespaceObjNamespaces, // include multiple spaces
      };
      const objB = { ...obj2, namespaces: ['ns-3'] }; // use a different namespace than the options namespace;

      await bulkGetSuccess(client, repository, registry, [objA, objB]);

      expect(mockSecurityExt.authorizeBulkGet).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.authorizeBulkGet).toHaveBeenCalledWith({
        namespace: undefined,
        objects: expectedAuthObjects,
      });
    });

    test(`calls authorize with correct parameters in non-default space`, async () => {
      const objA = {
        ...obj1,
        type: MULTI_NAMESPACE_CUSTOM_INDEX_TYPE, // replace the type to a mult-namespace type for this test to be thorough
        namespaces: multiNamespaceObjNamespaces, // include multiple spaces
      };
      const objB = { ...obj2, namespaces: ['ns-3'] }; // use a different namespace than the options namespace;
      const optionsNamespace = 'ns-4';

      await bulkGetSuccess(client, repository, registry, [objA, objB], {
        namespace: optionsNamespace,
      });

      expect(mockSecurityExt.authorizeBulkGet).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.authorizeBulkGet).toHaveBeenCalledWith({
        namespace: optionsNamespace,
        objects: [
          {
            error: true,
            existingNamespaces: [optionsNamespace],
            objectNamespaces: objA.namespaces,
            id: objA.id,
            type: objA.type,
            name: undefined,
          },
          {
            error: false,
            existingNamespaces: [],
            objectNamespaces: objB.namespaces,
            id: objB.id,
            type: objB.type,
            name: 'Testing',
          },
        ],
      });
    });

    test(`calls redactNamespaces with authorization map`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeBulkGet, 'partially_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const objects = [obj1, obj2];

      await bulkGetSuccess(client, repository, registry, objects, { namespace });

      expect(mockSecurityExt.authorizeBulkGet).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.redactNamespaces).toHaveBeenCalledTimes(2);

      objects.forEach((obj, i) => {
        const { savedObject, typeMap } = mockSecurityExt.redactNamespaces.mock.calls[i][0];
        expect(savedObject).toEqual(
          expect.objectContaining({
            type: obj.type,
            id: obj.id,
            namespaces: [namespace],
          })
        );
        expect(typeMap).toBe(authMap);
      });
    });
  });

  describe('#bulkCreate', () => {
    beforeEach(() => {
      mockPreflightCheckForCreate.mockReset();
      mockPreflightCheckForCreate.mockImplementation(({ objects }) => {
        // eslint-disable-next-line @typescript-eslint/no-shadow
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

    test(`propagates decorated error when authorizeCreate rejects promise`, async () => {
      mockSecurityExt.authorizeBulkCreate.mockRejectedValueOnce(checkAuthError);
      await expect(bulkCreateSuccess(client, repository, [obj1, obj2])).rejects.toThrow(
        checkAuthError
      );
      expect(mockSecurityExt.authorizeBulkCreate).toHaveBeenCalledTimes(1);
    });

    test(`propagates decorated error when unauthorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeBulkCreate as jest.Mock, 'unauthorized');

      await expect(
        bulkCreateSuccess(client, repository, [obj1, obj2], { namespace })
      ).rejects.toThrow(enforceError);

      expect(mockSecurityExt.authorizeBulkCreate).toHaveBeenCalledTimes(1);
    });

    test(`returns result when partially authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeBulkCreate as jest.Mock, 'partially_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const objects = [obj1, obj2];
      const result = await bulkCreateSuccess(client, repository, objects);

      expect(mockSecurityExt.authorizeBulkCreate).toHaveBeenCalledTimes(1);
      expect(client.bulk).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        saved_objects: objects.map((obj) => expectCreateResult(obj)),
      });
    });

    test(`returns result when fully authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeBulkCreate as jest.Mock, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const objects = [obj1, obj2];
      const result = await bulkCreateSuccess(client, repository, objects);

      expect(mockSecurityExt.authorizeBulkCreate).toHaveBeenCalledTimes(1);
      expect(client.bulk).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        saved_objects: objects.map((obj) => expectCreateResult(obj)),
      });
    });

    test(`calls authorizeCreate with correct parameters`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeBulkCreate as jest.Mock, 'fully_authorized');

      await bulkCreateSuccess(client, repository, [obj1, obj2], {
        namespace,
      });

      expect(mockSecurityExt.authorizeBulkCreate).toHaveBeenCalledTimes(1);
      const expectedNamespace = namespace;
      const expectedObjects = [
        {
          type: obj1.type,
          id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          initialNamespaces: undefined,
          existingNamespaces: [],
          name: obj1.attributes.title,
        },
        {
          type: obj2.type,
          id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          initialNamespaces: undefined,
          existingNamespaces: [],
          name: obj2.attributes.title,
        },
      ];

      const { namespace: actualNamespace, objects: actualObjects } =
        mockSecurityExt.authorizeBulkCreate.mock.calls[0][0];

      expect(expectedNamespace).toEqual(actualNamespace);
      expect(expectedObjects).toEqual(actualObjects);
    });

    test(`calls authorizeCreate with initial spaces for one type`, async () => {
      const objA = {
        ...obj1,
        type: MULTI_NAMESPACE_TYPE,
        initialNamespaces: ['ns-1', 'ns-2'],
      };
      const objB = {
        ...obj2,
        type: MULTI_NAMESPACE_TYPE,
        initialNamespaces: ['ns-3', 'ns-4'],
      };
      const optionsNamespace = 'ns-5';

      setupAuthorizeFunc(mockSecurityExt.authorizeBulkCreate as jest.Mock, 'fully_authorized');

      await bulkCreateSuccess(client, repository, [objA, objB], {
        namespace: optionsNamespace,
      });

      expect(mockSecurityExt.authorizeBulkCreate).toHaveBeenCalledTimes(1);
      const expectedNamespace = optionsNamespace;
      const expectedObjects = [
        {
          type: objA.type,
          id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          initialNamespaces: objA.initialNamespaces,
          existingNamespaces: [],
          name: objA.attributes.title,
        },
        {
          type: objB.type,
          id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          initialNamespaces: objB.initialNamespaces,
          existingNamespaces: [],
          name: objB.attributes.title,
        },
      ];

      const { namespace: actualNamespace, objects: actualObjects } =
        mockSecurityExt.authorizeBulkCreate.mock.calls[0][0];

      expect(expectedNamespace).toEqual(actualNamespace);
      expect(expectedObjects).toEqual(actualObjects);
    });

    test(`calls authorizeCreate with initial spaces for multiple types`, async () => {
      const objA = {
        ...obj1,
        type: MULTI_NAMESPACE_TYPE,
        initialNamespaces: ['ns-1', 'ns-2'],
      };
      const objB = {
        ...obj2,
        type: MULTI_NAMESPACE_CUSTOM_INDEX_TYPE,
        initialNamespaces: ['ns-3', 'ns-4'],
      };
      const optionsNamespace = 'ns-5';

      setupAuthorizeFunc(mockSecurityExt.authorizeBulkCreate as jest.Mock, 'fully_authorized');

      await bulkCreateSuccess(client, repository, [objA, objB], {
        namespace: optionsNamespace,
      });

      expect(mockSecurityExt.authorizeBulkCreate).toHaveBeenCalledTimes(1);

      const expectedNamespace = optionsNamespace;
      const expectedObjects = [
        {
          type: objA.type,
          id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          initialNamespaces: objA.initialNamespaces,
          existingNamespaces: [],
          name: objA.attributes.title,
        },
        {
          type: objB.type,
          id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          initialNamespaces: objB.initialNamespaces,
          existingNamespaces: [],
          name: objB.attributes.title,
        },
      ];

      const { namespace: actualNamespace, objects: actualObjects } =
        mockSecurityExt.authorizeBulkCreate.mock.calls[0][0];

      expect(expectedNamespace).toEqual(actualNamespace);
      expect(expectedObjects).toEqual(actualObjects);
    });

    test(`calls redactNamespaces with authorization map`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeBulkCreate as jest.Mock, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const objects = [obj1, obj2];
      await bulkCreateSuccess(client, repository, [obj1, obj2], { namespace });

      expect(mockSecurityExt.authorizeBulkCreate).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.redactNamespaces).toHaveBeenCalledTimes(2);

      objects.forEach((obj, i) => {
        const { savedObject, typeMap } = mockSecurityExt.redactNamespaces.mock.calls[i][0];
        expect(savedObject).toEqual(
          expect.objectContaining({
            type: obj.type,
            id: obj.id,
            namespaces: [namespace],
          })
        );
        expect(typeMap).toBe(authMap);
      });
    });

    test(`adds created_by, updated_by to the saved object when the current user is available`, async () => {
      const profileUid = 'profileUid';
      mockSecurityExt.getCurrentUser.mockImplementationOnce(() =>
        mockAuthenticatedUser({ profile_uid: profileUid })
      );
      const response = await bulkCreateSuccess(client, repository, [obj1, obj2], { namespace });
      expect(response.saved_objects[0].created_by).toBe(profileUid);
      expect(response.saved_objects[1].created_by).toBe(profileUid);

      expect(response.saved_objects[0].updated_by).toBe(profileUid);
      expect(response.saved_objects[1].updated_by).toBe(profileUid);
    });

    test(`keeps created_by, updated_by empty if the current user is not available`, async () => {
      mockSecurityExt.getCurrentUser.mockImplementationOnce(() => null);
      const response = await bulkCreateSuccess(client, repository, [obj1, obj2], { namespace });
      expect(response.saved_objects[0]).not.toHaveProperty('created_by');
      expect(response.saved_objects[1]).not.toHaveProperty('created_by');

      expect(response.saved_objects[0]).not.toHaveProperty('updated_by');
      expect(response.saved_objects[1]).not.toHaveProperty('updated_by');
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

    test(`propagates decorated error when authorizeUpdate rejects promise`, async () => {
      mockSecurityExt.authorizeBulkUpdate.mockRejectedValueOnce(checkAuthError);
      await expect(bulkUpdateSuccess(client, repository, registry, [obj1, obj2])).rejects.toThrow(
        checkAuthError
      );
      expect(mockSecurityExt.authorizeBulkUpdate).toHaveBeenCalledTimes(1);
    });

    test(`propagates decorated error when unauthorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeBulkUpdate, 'unauthorized');

      await expect(bulkUpdateSuccess(client, repository, registry, [obj1, obj2])).rejects.toThrow(
        enforceError
      );

      expect(mockSecurityExt.authorizeBulkUpdate).toHaveBeenCalledTimes(1);
    });

    test(`returns result when partially authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeUpdate, 'partially_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const objects = [obj1, obj2];
      const result = await bulkUpdateSuccess(client, repository, registry, objects);

      expect(mockSecurityExt.authorizeBulkUpdate).toHaveBeenCalledTimes(1);
      expect(client.bulk).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        saved_objects: objects.map((obj) => expectUpdateResult(obj)),
      });
    });

    test(`returns result when fully authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeUpdate, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const objects = [obj1, obj2];
      const result = await bulkUpdateSuccess(client, repository, registry, objects);

      expect(mockSecurityExt.authorizeBulkUpdate).toHaveBeenCalledTimes(1);
      expect(client.bulk).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        saved_objects: objects.map((obj) => expectUpdateResult(obj)),
      });
    });

    test(`calls authorizeBulkUpdate with correct parameters`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeUpdate, 'fully_authorized');

      await bulkUpdateSuccess(client, repository, registry, [obj1, obj2], {
        namespace,
      });

      expect(mockSecurityExt.authorizeBulkUpdate).toHaveBeenCalledTimes(1);
      const expectedNamespace = namespace;
      const expectedObjects = [
        {
          type: obj1.type,
          id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          existingNamespaces: [],
          name: (obj1.attributes as { title: string }).title,
        },
        {
          type: obj2.type,
          id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          existingNamespaces: [],
          name: (obj2.attributes as { title: string }).title,
        },
      ];

      const { namespace: actualNamespace, objects: actualObjects } =
        mockSecurityExt.authorizeBulkUpdate.mock.calls[0][0];

      expect(actualNamespace).toEqual(expectedNamespace);
      expect(actualObjects).toEqual(expectedObjects);
    });

    test(`calls authorizeBulkUpdate with object spaces`, async () => {
      const objA = {
        ...obj1,
        namespace: 'ns-1', // object namespace
      };
      const objB = {
        ...obj2,
        namespace: 'ns-2', // object namespace
      };

      setupAuthorizeFunc(mockSecurityExt.authorizeUpdate, 'fully_authorized');

      await bulkUpdateSuccess(client, repository, registry, [objA, objB], {
        namespace,
      });

      expect(mockSecurityExt.authorizeBulkUpdate).toHaveBeenCalledTimes(1);
      const expectedNamespace = namespace;
      const expectedObjects = [
        {
          type: obj1.type,
          id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          objectNamespace: 'ns-1',
          existingNamespaces: [],
          name: (obj1.attributes as { title: string }).title,
        },
        {
          type: obj2.type,
          id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          objectNamespace: 'ns-2',
          existingNamespaces: [],
          name: (obj2.attributes as { title: string }).title,
        },
      ];

      const { namespace: actualNamespace, objects: actualObjects } =
        mockSecurityExt.authorizeBulkUpdate.mock.calls[0][0];

      expect(actualNamespace).toEqual(expectedNamespace);
      expect(actualObjects).toEqual(expectedObjects);
    });

    test(`calls redactNamespaces with authorization map`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeBulkUpdate, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const objects = [obj1, obj2];
      await bulkUpdateSuccess(client, repository, registry, objects, { namespace });

      expect(mockSecurityExt.authorizeBulkUpdate).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.redactNamespaces).toHaveBeenCalledTimes(2);

      objects.forEach((obj, i) => {
        const { savedObject, typeMap } = mockSecurityExt.redactNamespaces.mock.calls[i][0];
        expect(savedObject).toEqual(
          expect.objectContaining({
            type: obj.type,
            id: obj.id,
            namespaces: [namespace],
          })
        );
        expect(typeMap).toBe(authMap);
      });
    });

    test(`adds updated_by to the saved object when the current user is available`, async () => {
      const profileUid = 'profileUid';
      mockSecurityExt.getCurrentUser.mockImplementationOnce(() =>
        mockAuthenticatedUser({ profile_uid: profileUid })
      );

      const objects = [obj1, obj2];
      const result = await bulkUpdateSuccess(client, repository, registry, objects, { namespace });

      expect(result.saved_objects[0].updated_by).toBe(profileUid);
      expect(result.saved_objects[1].updated_by).toBe(profileUid);
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
      namespace,
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
          initialNamespaces: [namespace, 'NS-1', 'NS-2'],
        },
      ],
    };

    test(`propagates decorated error when authorizeBulkDelete rejects promise`, async () => {
      mockSecurityExt.authorizeBulkDelete.mockRejectedValueOnce(checkAuthError);
      await expect(
        bulkDeleteSuccess(client, repository, registry, testObjs, options)
      ).rejects.toThrow(checkAuthError);
      expect(mockSecurityExt.authorizeBulkDelete).toHaveBeenCalledTimes(1);
    });

    test(`propagates decorated error when unauthorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeBulkDelete, 'unauthorized');

      await expect(
        bulkDeleteSuccess(client, repository, registry, testObjs, options)
      ).rejects.toThrow(enforceError);

      expect(mockSecurityExt.authorizeBulkDelete).toHaveBeenCalledTimes(1);
    });

    test(`returns result when partially authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeBulkDelete, 'partially_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const result = await bulkDeleteSuccess(
        client,
        repository,
        registry,
        testObjs,
        options,
        internalOptions
      );

      expect(mockSecurityExt.authorizeBulkDelete).toHaveBeenCalledTimes(1);
      expect(client.bulk).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        statuses: testObjs.map((obj) => createBulkDeleteSuccessStatus(obj)),
      });
    });

    test(`returns result when fully authorized`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeBulkDelete, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const result = await bulkDeleteSuccess(
        client,
        repository,
        registry,
        testObjs,
        options,
        internalOptions
      );

      expect(mockSecurityExt.authorizeBulkDelete).toHaveBeenCalledTimes(1);
      expect(client.bulk).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        statuses: testObjs.map((obj) => createBulkDeleteSuccessStatus(obj)),
      });
    });

    test(`calls authorizeBulkDelete with correct actions, types, spaces, and enforce map`, async () => {
      setupAuthorizeFunc(mockSecurityExt.authorizeBulkDelete, 'fully_authorized');
      await bulkDeleteSuccess(client, repository, registry, testObjs, options, internalOptions);

      expect(mockSecurityExt.authorizeBulkDelete).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.authorizeBulkDelete).toHaveBeenCalledWith({
        namespace,
        objects: [
          { type: obj1.type, id: obj1.id, existingNamespaces: [], name: 'Testing' },
          {
            type: obj2.type,
            id: obj2.id,
            existingNamespaces: ['foo-namespace', 'NS-1', 'NS-2'],
            name: 'Testing',
          },
        ],
      });
    });
  });
});
