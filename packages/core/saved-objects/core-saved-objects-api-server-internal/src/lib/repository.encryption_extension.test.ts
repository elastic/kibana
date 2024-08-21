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
  mockGetSearchDsl,
} from './repository.test.mock';

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { SavedObjectsRepository } from './repository';
import { loggerMock } from '@kbn/logging-mocks';

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { kibanaMigratorMock } from '../mocks';
import { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import {
  MAIN_SAVED_OBJECT_INDEX,
  type ISavedObjectsEncryptionExtension,
  type SavedObjectsRawDocSource,
} from '@kbn/core-saved-objects-server';
import {
  bulkCreateSuccess,
  bulkGetSuccess,
  bulkUpdateSuccess,
  createDocumentMigrator,
  createRegistry,
  createSpySerializer,
  ENCRYPTED_TYPE,
  findSuccess,
  getMockGetResponse,
  mappings,
  mockTimestamp,
  mockTimestampFields,
  mockVersion,
  mockVersionProps,
  MULTI_NAMESPACE_ENCRYPTED_TYPE,
  updateSuccess,
  type TypeIdTuple,
} from '../test_helpers/repository.test.common';
import { savedObjectsExtensionsMock } from '../mocks/saved_objects_extensions.mock';

describe('SavedObjectsRepository Encryption Extension', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repository: SavedObjectsRepository;
  let migrator: ReturnType<typeof kibanaMigratorMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let serializer: jest.Mocked<SavedObjectsSerializer>;
  let mockEncryptionExt: jest.Mocked<ISavedObjectsEncryptionExtension>;

  const registry = createRegistry();
  const documentMigrator = createDocumentMigrator(registry);

  const namespace = 'foo-namespace';

  const encryptedSO = {
    id: 'encrypted-id',
    type: ENCRYPTED_TYPE,
    namespaces: [namespace],
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
  const nonEncryptedSO = {
    id: 'non-encrypted-id',
    type: 'index-pattern',
    namespaces: [namespace],
    attributes: { title: 'Logstash' },
    references: [],
  };

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
      extensions: { encryptionExtension: mockEncryptionExt },
    });
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

    // create a mock saved objects encryption extension
    mockEncryptionExt = savedObjectsExtensionsMock.createEncryptionExtension();
    mockEncryptionExt.encryptAttributes.mockImplementation((desc, attrs) => Promise.resolve(attrs));

    mockGetCurrentTime.mockReturnValue(mockTimestamp);
    mockGetSearchDsl.mockClear();

    repository = instantiateRepository();
  });

  describe('#get', () => {
    it('does not attempt to decrypt or strip attributes if type is not encryptable', async () => {
      const options = { namespace };

      const response = getMockGetResponse(registry, {
        type: nonEncryptedSO.type,
        id: nonEncryptedSO.id,
        namespace,
      });

      client.get.mockResponseOnce(response);
      mockEncryptionExt.isEncryptableType.mockReturnValue(false);
      const result = await repository.get(nonEncryptedSO.type, nonEncryptedSO.id, options);
      expect(client.get).toHaveBeenCalledTimes(1);
      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledTimes(1);
      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledWith(nonEncryptedSO.type);
      expect(mockEncryptionExt.decryptOrStripResponseAttributes).not.toBeCalled();
      expect(result).toEqual(
        expect.objectContaining({
          type: nonEncryptedSO.type,
          id: nonEncryptedSO.id,
          namespaces: [namespace],
        })
      );
    });

    it('decrypts and strips attributes if type is encryptable', async () => {
      const options = { namespace };

      const response = getMockGetResponse(registry, {
        type: encryptedSO.type,
        id: encryptedSO.id,
        namespace: options.namespace,
      });
      client.get.mockResponseOnce(response);
      mockEncryptionExt.isEncryptableType.mockReturnValue(true);
      mockEncryptionExt.decryptOrStripResponseAttributes.mockResolvedValue({
        ...encryptedSO,
        ...decryptedStrippedAttributes,
      });

      const result = await repository.get(encryptedSO.type, encryptedSO.id, options);
      expect(client.get).toHaveBeenCalledTimes(1);
      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledTimes(1);
      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledWith(encryptedSO.type);
      expect(mockEncryptionExt.decryptOrStripResponseAttributes).toHaveBeenCalledTimes(1);
      expect(mockEncryptionExt.decryptOrStripResponseAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          ...encryptedSO,
        }),
        undefined
      );
      expect(result).toEqual(
        expect.objectContaining({
          ...decryptedStrippedAttributes,
        })
      );
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

    it('does not attempt to encrypt or decrypt if type is not encryptable', async () => {
      mockEncryptionExt.isEncryptableType.mockReturnValue(false);
      const result = await repository.create(nonEncryptedSO.type, nonEncryptedSO.attributes, {
        namespace,
      });
      expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
      expect(client.create).toHaveBeenCalled();
      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledTimes(3); // getValidId, optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledWith(nonEncryptedSO.type);
      expect(mockEncryptionExt.encryptAttributes).not.toHaveBeenCalled();
      expect(mockEncryptionExt.decryptOrStripResponseAttributes).not.toBeCalled();
      expect(result).toEqual(
        expect.objectContaining({
          type: nonEncryptedSO.type,
          id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          namespaces: [namespace],
        })
      );
    });

    it('encrypts attributes and strips them from response if type is encryptable', async () => {
      mockEncryptionExt.isEncryptableType.mockReturnValue(true);
      mockEncryptionExt.decryptOrStripResponseAttributes.mockResolvedValue({
        ...encryptedSO,
        ...decryptedStrippedAttributes,
      });

      const result = await repository.create(encryptedSO.type, encryptedSO.attributes, {
        namespace,
      });
      expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
      expect(client.create).toHaveBeenCalled();
      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledTimes(3); // getValidId, optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledWith(encryptedSO.type);
      expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledTimes(1);
      expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledWith(
        {
          id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          namespace,
          type: ENCRYPTED_TYPE,
        },
        encryptedSO.attributes
      );
      expect(mockEncryptionExt.decryptOrStripResponseAttributes).toHaveBeenCalledTimes(1);
      expect(mockEncryptionExt.decryptOrStripResponseAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          ...encryptedSO,
          id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
        }),
        encryptedSO.attributes // original attributes
      );
      expect(result).toEqual(
        expect.objectContaining({
          ...decryptedStrippedAttributes,
        })
      );
    });

    it(`fails if non-UUID ID is specified for encrypted type`, async () => {
      mockEncryptionExt.isEncryptableType.mockReturnValue(true);
      mockEncryptionExt.decryptOrStripResponseAttributes.mockResolvedValue({
        ...encryptedSO,
        ...decryptedStrippedAttributes,
      });

      await expect(
        repository.create(encryptedSO.type, encryptedSO.attributes, {
          id: 'this-should-throw-an-error',
        })
      ).rejects.toThrow(
        'Predefined IDs are not allowed for saved objects with encrypted attributes unless the ID is a UUID.: Bad Request'
      );
    });

    it(`allows a specified ID when overwriting an existing object`, async () => {
      mockEncryptionExt.isEncryptableType.mockReturnValue(true);
      mockEncryptionExt.decryptOrStripResponseAttributes.mockResolvedValue({
        ...encryptedSO,
        ...decryptedStrippedAttributes,
      });

      await expect(
        repository.create(encryptedSO.type, encryptedSO.attributes, {
          id: encryptedSO.id,
          overwrite: true,
          version: mockVersion,
        })
      ).resolves.not.toThrowError();
    });

    describe('namespace', () => {
      const doTest = async (optNamespace: string, expectNamespaceInDescriptor: boolean) => {
        const options = { overwrite: true, namespace: optNamespace };
        mockEncryptionExt.isEncryptableType.mockReturnValue(true);

        await repository.create(
          expectNamespaceInDescriptor ? ENCRYPTED_TYPE : MULTI_NAMESPACE_ENCRYPTED_TYPE,
          encryptedSO.attributes,
          options
        );
        expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
        expect(client.index).toHaveBeenCalled(); // if overwrite is true, index will be called instead of create
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledTimes(3); // getValidId, optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
        expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledWith(
          expectNamespaceInDescriptor ? ENCRYPTED_TYPE : MULTI_NAMESPACE_ENCRYPTED_TYPE
        );
        expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledTimes(1);
        expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledWith(
          {
            id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
            namespace: expectNamespaceInDescriptor ? namespace : undefined,
            type: expectNamespaceInDescriptor ? ENCRYPTED_TYPE : MULTI_NAMESPACE_ENCRYPTED_TYPE,
          },
          encryptedSO.attributes
        );
      };

      it('uses `namespace` to encrypt attributes if it is specified when type is single-namespace', async () => {
        await doTest(namespace, true);
      });

      it('does not use `namespace` to encrypt attributes if it is specified when type is not single-namespace', async () => {
        await doTest(namespace, false);
      });
    });
  });

  describe('#update', () => {
    const attributes = { title: 'Testing' };

    beforeEach(() => {
      mockPreflightCheckForCreate.mockReset();
      mockPreflightCheckForCreate.mockImplementation(({ objects }) => {
        return Promise.resolve(objects.map(({ type, id }) => ({ type, id }))); // respond with no errors by default
      });
    });

    it('does not attempt to encrypt or decrypt if type is not encryptable', async () => {
      mockEncryptionExt.isEncryptableType.mockReturnValue(false);
      const result = await updateSuccess(
        client,
        repository,
        registry,
        nonEncryptedSO.type,
        nonEncryptedSO.id,
        attributes,
        {
          namespace,
        }
      );
      expect(client.index).toHaveBeenCalledTimes(1);
      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledTimes(2); // (no upsert) optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledWith(nonEncryptedSO.type);
      expect(mockEncryptionExt.encryptAttributes).not.toHaveBeenCalled();
      expect(mockEncryptionExt.decryptOrStripResponseAttributes).not.toBeCalled();
      expect(result).toEqual(
        expect.objectContaining({
          type: nonEncryptedSO.type,
          id: nonEncryptedSO.id,
          namespaces: [namespace],
        })
      );
    });

    it('encrypts attributes and strips them from response if type is encryptable', async () => {
      mockEncryptionExt.isEncryptableType.mockReturnValue(true);
      mockEncryptionExt.decryptOrStripResponseAttributes.mockResolvedValue({
        ...encryptedSO,
        ...decryptedStrippedAttributes,
      });
      const result = await updateSuccess(
        client,
        repository,
        registry,
        encryptedSO.type,
        encryptedSO.id,
        encryptedSO.attributes,
        {
          namespace,
          references: encryptedSO.references,
        }
      );
      expect(client.index).toHaveBeenCalledTimes(1);
      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledTimes(2); // (no upsert) optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledWith(encryptedSO.type);
      expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledTimes(1);
      expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledWith(
        {
          id: encryptedSO.id,
          namespace,
          type: ENCRYPTED_TYPE,
        },
        encryptedSO.attributes
      );
      expect(mockEncryptionExt.decryptOrStripResponseAttributes).toHaveBeenCalledTimes(1);
      expect(mockEncryptionExt.decryptOrStripResponseAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          ...encryptedSO,
        }),
        encryptedSO.attributes // original attributes
      );
      expect(result).toEqual(
        expect.objectContaining({
          ...decryptedStrippedAttributes,
        })
      );
    });
  });

  describe('#bulkGet', () => {
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

    it(`only attempts to decrypt and strip attributes for types that are encryptable`, async () => {
      mockEncryptionExt.isEncryptableType.mockReturnValueOnce(false);
      mockEncryptionExt.isEncryptableType.mockReturnValueOnce(true);
      const getId = (type: string, id: string) => `${namespace}:${type}:${id}`; // test that the raw document ID equals this (e.g., has a namespace prefix)
      await bulkGetSuccess(client, repository, registry, [nonEncryptedSO, encryptedSO], {
        namespace,
      });
      _expectClientCallArgs([nonEncryptedSO, encryptedSO], { getId });
      expect(mockEncryptionExt.isEncryptableType).toBeCalledTimes(2);
      expect(mockEncryptionExt.isEncryptableType).toBeCalledWith(nonEncryptedSO.type);
      expect(mockEncryptionExt.isEncryptableType).toBeCalledWith(encryptedSO.type);
      expect(mockEncryptionExt.decryptOrStripResponseAttributes).toBeCalledTimes(1);
      expect(mockEncryptionExt.decryptOrStripResponseAttributes).toBeCalledWith(
        expect.objectContaining({ ...encryptedSO }),
        undefined
      );
    });
  });

  describe('#bulkCreate', () => {
    it(`only attempts to encrypt and decrypt attributes for types that are encryptable`, async () => {
      mockEncryptionExt.isEncryptableType.mockReturnValueOnce(false); // getValidId
      mockEncryptionExt.isEncryptableType.mockReturnValueOnce(true);
      mockEncryptionExt.isEncryptableType.mockReturnValueOnce(false); // optionallyEncryptAttributes
      mockEncryptionExt.isEncryptableType.mockReturnValueOnce(true);
      mockEncryptionExt.isEncryptableType.mockReturnValueOnce(false); // optionallyDecryptAndRedactSingleResult
      mockEncryptionExt.isEncryptableType.mockReturnValueOnce(true);
      await bulkCreateSuccess(client, repository, [
        nonEncryptedSO,
        { ...encryptedSO, id: undefined }, // Predefined IDs are not allowed for saved objects with encrypted attributes unless the ID is a UUID
      ]);
      expect(client.bulk).toHaveBeenCalledTimes(1);

      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledTimes(6); // x2 getValidId, optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledWith(nonEncryptedSO.type);
      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledWith(encryptedSO.type);
      expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledTimes(1);
      expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ type: encryptedSO.type }),
        encryptedSO.attributes
      );
      expect(mockEncryptionExt.decryptOrStripResponseAttributes).toHaveBeenCalledTimes(1);
      expect(mockEncryptionExt.decryptOrStripResponseAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ type: encryptedSO.type }),
        encryptedSO.attributes
      );
    });

    it(`fails if non-UUID ID is specified for encrypted type`, async () => {
      mockEncryptionExt.isEncryptableType.mockReturnValue(true);
      const result = await bulkCreateSuccess(client, repository, [
        encryptedSO, // Predefined IDs are not allowed for saved objects with encrypted attributes unless the ID is a UUID
      ]);
      expect(client.bulk).not.toHaveBeenCalled();
      expect(result.saved_objects).not.toBeUndefined();
      expect(result.saved_objects.length).toBe(1);
      expect(result.saved_objects[0].error).not.toBeUndefined();
      expect(result.saved_objects[0].error).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        message:
          'Predefined IDs are not allowed for saved objects with encrypted attributes unless the ID is a UUID.: Bad Request',
      });
    });

    it(`does not fail if ID is specified for not encrypted type`, async () => {
      mockEncryptionExt.isEncryptableType.mockReturnValue(false);
      const result = await bulkCreateSuccess(client, repository, [nonEncryptedSO]);
      expect(client.bulk).toHaveBeenCalledTimes(1);
      expect(result.saved_objects).not.toBeUndefined();
      expect(result.saved_objects.length).toBe(1);
      expect(result.saved_objects[0].error).toBeUndefined();
    });

    it(`allows a specified ID when overwriting an existing object`, async () => {
      mockEncryptionExt.isEncryptableType.mockReturnValue(true);
      mockEncryptionExt.decryptOrStripResponseAttributes.mockResolvedValue({
        ...encryptedSO,
        version: mockVersion,
        ...decryptedStrippedAttributes,
      });

      const result = await bulkCreateSuccess(
        client,
        repository,
        [{ ...encryptedSO, version: mockVersion }],
        {
          overwrite: true,
          // version: mockVersion, // this doesn't work in bulk...looks like it checks the object itself?
        }
      );
      expect(client.bulk).toHaveBeenCalledTimes(1);
      expect(result.saved_objects).not.toBeUndefined();
      expect(result.saved_objects.length).toBe(1);
      expect(result.saved_objects[0].error).toBeUndefined();
    });
  });

  describe('#bulkUpdate', () => {
    it(`only attempts to encrypt and decrypt attributes for types that are encryptable`, async () => {
      mockEncryptionExt.isEncryptableType.mockReturnValueOnce(false); // optionallyEncryptAttributes
      mockEncryptionExt.isEncryptableType.mockReturnValueOnce(true);
      mockEncryptionExt.isEncryptableType.mockReturnValueOnce(false); // optionallyDecryptAndRedactSingleResult
      mockEncryptionExt.isEncryptableType.mockReturnValueOnce(true);

      await bulkUpdateSuccess(client, repository, registry, [nonEncryptedSO, encryptedSO]);
      expect(client.bulk).toHaveBeenCalledTimes(1);

      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledTimes(4); // 2x optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledWith(nonEncryptedSO.type);
      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledWith(encryptedSO.type);
      expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledTimes(1);
      expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ type: encryptedSO.type }),
        encryptedSO.attributes
      );
      expect(mockEncryptionExt.decryptOrStripResponseAttributes).toHaveBeenCalledTimes(1);
      expect(mockEncryptionExt.decryptOrStripResponseAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ type: encryptedSO.type }),
        encryptedSO.attributes
      );
    });

    it('does not use options `namespace` or object `namespace` to encrypt attributes if neither are specified', async () => {
      mockEncryptionExt.isEncryptableType.mockReturnValue(true);

      await bulkUpdateSuccess(
        client,
        repository,
        registry,
        [{ ...encryptedSO, namespace: undefined }],
        { namespace: undefined }
      );
      expect(client.bulk).toHaveBeenCalledTimes(1);

      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledTimes(2); // 2x optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledWith(encryptedSO.type);
      expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledTimes(1);
      expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledWith(
        { id: encryptedSO.id, type: encryptedSO.type, namespace: undefined },
        encryptedSO.attributes
      );
    });

    it('with a single-namespace type...uses options `namespace` to encrypt attributes if it is specified and object `namespace` is not', async () => {
      mockEncryptionExt.isEncryptableType.mockReturnValue(true);
      const usedNamespace = 'options-namespace';

      await bulkUpdateSuccess(
        client,
        repository,
        registry,
        [{ ...encryptedSO, namespace: undefined }],
        { namespace: usedNamespace }
      );
      expect(client.bulk).toHaveBeenCalledTimes(1);

      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledTimes(2); // 2x optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledWith(encryptedSO.type);
      expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledTimes(1);
      expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledWith(
        { id: encryptedSO.id, type: encryptedSO.type, namespace: usedNamespace },
        encryptedSO.attributes
      );
    });

    it('with a single-namespace type...uses object `namespace` to encrypt attributes if it is specified', async () => {
      mockEncryptionExt.isEncryptableType.mockReturnValue(true);
      const usedNamespace = 'object-namespace';

      await bulkUpdateSuccess(
        client,
        repository,
        registry,
        [{ ...encryptedSO, namespace: usedNamespace }],
        { namespace: undefined }
      );
      expect(client.bulk).toHaveBeenCalledTimes(1);

      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledTimes(2); // 2x optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
      expect(mockEncryptionExt.isEncryptableType).toHaveBeenCalledWith(encryptedSO.type);
      expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledTimes(1);
      expect(mockEncryptionExt.encryptAttributes).toHaveBeenCalledWith(
        { id: encryptedSO.id, type: encryptedSO.type, namespace: usedNamespace },
        encryptedSO.attributes
      );
    });
  });

  describe('#find', () => {
    const generateSearchResults = (space?: string) => {
      return {
        took: 1,
        timed_out: false,
        _shards: {} as any,
        hits: {
          total: 2,
          hits: [
            {
              _index: MAIN_SAVED_OBJECT_INDEX,
              _id: `${space ? `${space}:` : ''}${encryptedSO.type}:${encryptedSO.id}`,
              _score: 1,
              ...mockVersionProps,
              _source: {
                ...encryptedSO,
                originId: 'some-origin-id', // only one of the results has an originId, this is intentional to test both a positive and negative case
              },
            },
            {
              _index: MAIN_SAVED_OBJECT_INDEX,
              _id: `${space ? `${space}:` : ''}index-pattern:logstash-*`,
              _score: 2,
              ...mockVersionProps,
              _source: {
                namespace: space,
                originId: 'some-origin-id', // only one of the results has an originId, this is intentional to test both a positive and negative case
                type: 'index-pattern',
                ...mockTimestampFields,
                'index-pattern': {
                  title: 'logstash-*',
                  timeFieldName: '@timestamp',
                  notExpandable: true,
                },
              },
            },
          ],
        },
      } as estypes.SearchResponse<SavedObjectsRawDocSource>;
    };

    it(`only attempts to decrypt and strip attributes for types that are encryptable`, async () => {
      mockEncryptionExt.isEncryptableType.mockReturnValueOnce(true);
      await findSuccess(
        client,
        repository,
        { type: [encryptedSO.type, 'index-pattern'] },
        undefined,
        generateSearchResults
      );
      expect(client.search).toHaveBeenCalledTimes(1);
      expect(mockEncryptionExt.isEncryptableType).toBeCalledTimes(2);
      expect(mockEncryptionExt.isEncryptableType).toBeCalledWith(encryptedSO.type);
      expect(mockEncryptionExt.isEncryptableType).toBeCalledWith('index-pattern');
      expect(mockEncryptionExt.decryptOrStripResponseAttributes).toBeCalledTimes(1);
      expect(mockEncryptionExt.decryptOrStripResponseAttributes).toBeCalledWith(
        expect.objectContaining({ type: encryptedSO.type, id: encryptedSO.id }),
        undefined
      );
    });
  });
});
