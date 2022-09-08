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
import { schema } from '@kbn/config-schema';
import {
  SavedObjectsType,
  SavedObject,
  SavedObjectReference,
  SavedObjectsBaseOptions,
  SavedObjectsFindOptions,
} from '../../types';

import {
  SavedObjectsRepository,
} from './repository';
import { loggerMock } from '@kbn/logging-mocks';
import {
  SavedObjectsRawDocSource,
  SavedObjectsSerializer,
} from '../../serialization';
import { encodeHitVersion } from '../../version';
import { SavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { DocumentMigrator } from '../../migrations/core/document_migrator';
import { kibanaMigratorMock } from '../../migrations/kibana_migrator.mock';
import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import {
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsCreateOptions,
  SavedObjectsUpdateOptions,
} from '../saved_objects_client';
import { SavedObjectsMappingProperties, SavedObjectsTypeMappingDefinition } from '../../mappings';

import { savedObjectsEncryptionExtensionMock } from './repository.extensions.mock';

// BEWARE: The SavedObjectClient depends on the implementation details of the SavedObjectsRepository
// so any breaking changes to this repository are considered breaking changes to the SavedObjectsClient.

interface TypeIdTuple {
  id: string;
  type: string;
}

describe('SavedObjectsRepository Encryption Extension', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let savedObjectsRepository: SavedObjectsRepository;
  let migrator: ReturnType<typeof kibanaMigratorMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let serializer: jest.Mocked<SavedObjectsSerializer>;
  let encryptionExtMock: ReturnType<typeof savedObjectsEncryptionExtensionMock.create>;

  const mockTimestamp = '2017-08-14T15:49:14.886Z';
  const mockTimestampFields = { updated_at: mockTimestamp };
  const mockVersionProps = { _seq_no: 1, _primary_term: 1 };
  const mockVersion = encodeHitVersion(mockVersionProps);

  const KIBANA_VERSION = '2.0.0';
  const CUSTOM_INDEX_TYPE = 'customIndex';
  /** This type has namespaceType: 'agnostic'. */
  const NAMESPACE_AGNOSTIC_TYPE = 'globalType';
  /**
   * This type has namespaceType: 'multiple'.
   *
   * That means that the object is serialized with a globally unique ID across namespaces. It also means that the object is shareable across
   * namespaces.
   **/
  const MULTI_NAMESPACE_TYPE = 'multiNamespaceType';
  /**
   * This type has namespaceType: 'multiple-isolated'.
   *
   * That means that the object is serialized with a globally unique ID across namespaces. It also means that the object is NOT shareable
   * across namespaces. This distinction only matters when using the `collectMultiNamespaceReferences` or `updateObjectsSpaces` APIs, or
   * when using the `initialNamespaces` argument with the `create` and `bulkCreate` APIs. Those allow you to define or change what
   * namespaces an object exists in.
   *
   * In a nutshell, this type is more restrictive than `MULTI_NAMESPACE_TYPE`, so we use `MULTI_NAMESPACE_ISOLATED_TYPE` for any test cases
   * where `MULTI_NAMESPACE_TYPE` would also satisfy the test case.
   **/
  const MULTI_NAMESPACE_ISOLATED_TYPE = 'multiNamespaceIsolatedType';
  /** This type has namespaceType: 'multiple', and it uses a custom index. */
  const MULTI_NAMESPACE_CUSTOM_INDEX_TYPE = 'multiNamespaceTypeCustomIndex';
  const HIDDEN_TYPE = 'hiddenType';
  const ENCRYPTED_TYPE = 'encryptedType';
  const MULTI_NAMESPACE_ENCRYPTED_TYPE = 'multiNamespaceEncryptedType';

  const mappings: SavedObjectsTypeMappingDefinition = {
    properties: {
      config: {
        properties: {
          otherField: {
            type: 'keyword',
          },
        },
      },
      'index-pattern': {
        properties: {
          someField: {
            type: 'keyword',
          },
        },
      },
      dashboard: {
        properties: {
          otherField: {
            type: 'keyword',
          },
        },
      },
      [CUSTOM_INDEX_TYPE]: {
        properties: {
          otherField: {
            type: 'keyword',
          },
        },
      },
      [NAMESPACE_AGNOSTIC_TYPE]: {
        properties: {
          yetAnotherField: {
            type: 'keyword',
          },
        },
      },
      [MULTI_NAMESPACE_TYPE]: {
        properties: {
          evenYetAnotherField: {
            type: 'keyword',
          },
        },
      },
      [MULTI_NAMESPACE_ISOLATED_TYPE]: {
        properties: {
          evenYetAnotherField: {
            type: 'keyword',
          },
        },
      },
      [MULTI_NAMESPACE_CUSTOM_INDEX_TYPE]: {
        properties: {
          evenYetAnotherField: {
            type: 'keyword',
          },
        },
      },
      [HIDDEN_TYPE]: {
        properties: {
          someField: {
            type: 'keyword',
          },
        },
      },
      [ENCRYPTED_TYPE]: {
        properties: {
          encryptedField: {
            type: 'keyword',
          },
        },
      },
      [MULTI_NAMESPACE_ENCRYPTED_TYPE]: {
        properties: {
          encryptedField: {
            type: 'keyword',
          },
        },
      },
    },
  };

  const createType = (type: string, parts: Partial<SavedObjectsType> = {}): SavedObjectsType => ({
    name: type,
    hidden: false,
    namespaceType: 'single',
    mappings: {
      properties: mappings.properties[type].properties! as SavedObjectsMappingProperties,
    },
    migrations: { '1.1.1': (doc) => doc },
    ...parts,
  });

  const registry = new SavedObjectTypeRegistry();
  registry.registerType(createType('config'));
  registry.registerType(createType('index-pattern'));
  registry.registerType(
    createType('dashboard', {
      schemas: {
        '8.0.0-testing': schema.object({
          title: schema.maybe(schema.string()),
          otherField: schema.maybe(schema.string()),
        }),
      },
    })
  );
  registry.registerType(createType(CUSTOM_INDEX_TYPE, { indexPattern: 'custom' }));
  registry.registerType(createType(NAMESPACE_AGNOSTIC_TYPE, { namespaceType: 'agnostic' }));
  registry.registerType(createType(MULTI_NAMESPACE_TYPE, { namespaceType: 'multiple' }));
  registry.registerType(
    createType(MULTI_NAMESPACE_ISOLATED_TYPE, { namespaceType: 'multiple-isolated' })
  );
  registry.registerType(
    createType(MULTI_NAMESPACE_CUSTOM_INDEX_TYPE, {
      namespaceType: 'multiple',
      indexPattern: 'custom',
    })
  );
  registry.registerType(
    createType(HIDDEN_TYPE, {
      hidden: true,
      namespaceType: 'agnostic',
    })
  );
  registry.registerType(
    createType(ENCRYPTED_TYPE, {
      namespaceType: 'single',
    })
  );
  registry.registerType(
    createType(MULTI_NAMESPACE_ENCRYPTED_TYPE, {
      namespaceType: 'multiple',
    })
  );

  const documentMigrator = new DocumentMigrator({
    typeRegistry: registry,
    kibanaVersion: KIBANA_VERSION,
    log: loggerMock.create(),
  });

  const getMockGetResponse = (
    {
      type,
      id,
      references,
      namespace: objectNamespace,
      originId,
    }: {
      type: string;
      id: string;
      namespace?: string;
      originId?: string;
      references?: SavedObjectReference[];
    },
    namespace?: string | string[]
  ) => {
    let namespaces;
    if (objectNamespace) {
      namespaces = [objectNamespace];
    } else if (namespace) {
      namespaces = Array.isArray(namespace) ? namespace : [namespace];
    } else {
      namespaces = ['default'];
    }
    const namespaceId = namespaces[0] === 'default' ? undefined : namespaces[0];

    return {
      // NOTE: Elasticsearch returns more fields (_index, _type) but the SavedObjectsRepository method ignores these
      found: true,
      _id: `${
        registry.isSingleNamespace(type) && namespaceId ? `${namespaceId}:` : ''
      }${type}:${id}`,
      ...mockVersionProps,
      _source: {
        ...(registry.isSingleNamespace(type) && { namespace: namespaceId }),
        ...(registry.isMultiNamespace(type) && { namespaces }),
        ...(originId && { originId }),
        type,
        [type]:
          type !== ENCRYPTED_TYPE && type !== MULTI_NAMESPACE_ENCRYPTED_TYPE
            ? { title: 'Testing' }
            : {
                title: 'Testing',
                attrOne: 'one',
                attrSecret: '*secret*',
                attrNotSoSecret: '*not-so-secret*',
                attrThree: 'three',
              },
        references,
        specialProperty: 'specialValue',
        ...mockTimestampFields,
      } as SavedObjectsRawDocSource,
    } as estypes.GetResponse<SavedObjectsRawDocSource>;
  };

  const getMockMgetResponse = (
    objects: Array<TypeIdTuple & { found?: boolean; initialNamespaces?: string[] }>,
    namespace?: string
  ) =>
    ({
      docs: objects.map((obj) =>
        obj.found === false ? obj : getMockGetResponse(obj, obj.initialNamespaces ?? namespace)
      ),
    } as estypes.MgetResponse<SavedObjectsRawDocSource>);

  expect.extend({
    toBeDocumentWithoutError(received, type, id) {
      if (received.type === type && received.id === id && !received.error) {
        return { message: () => `expected type and id not to match without error`, pass: true };
      } else {
        return { message: () => `expected type and id to match without error`, pass: false };
      }
    },
  });

  const createSpySerializer = () => {
    const spyInstance = {
      isRawSavedObject: jest.fn(),
      rawToSavedObject: jest.fn(),
      savedObjectToRaw: jest.fn(),
      generateRawId: jest.fn(),
      generateRawLegacyUrlAliasId: jest.fn(),
      trimIdPrefix: jest.fn(),
    };
    const realInstance = new SavedObjectsSerializer(registry);
    Object.keys(spyInstance).forEach((key) => {
      // @ts-expect-error no proper way to do this with typing support
      spyInstance[key].mockImplementation((...args) => realInstance[key](...args));
    });

    return spyInstance as unknown as jest.Mocked<SavedObjectsSerializer>;
  };

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
      extensions: { encryptionExtension: encryptionExtMock },
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
    serializer = createSpySerializer();

    // create a mock saved objects encryption extension
    encryptionExtMock = savedObjectsEncryptionExtensionMock.create();

    mockGetCurrentTime.mockReturnValue(mockTimestamp);
    mockGetSearchDsl.mockClear();

    savedObjectsRepository = instantiateRepository();
  });

  describe('#get', () => {
    it('does not attempt to decrypt or strip attributes if type is not encryptable', async () => {
      const namespace = 'foo-namespace';
      const options = { namespace };

      const response = getMockGetResponse({
        type: nonEncryptedSO.type,
        id: nonEncryptedSO.id,
        namespace,
      });

      client.get.mockResponseOnce(response);
      encryptionExtMock.isEncryptableType.mockReturnValue(false);
      const result = await savedObjectsRepository.get(
        nonEncryptedSO.type,
        nonEncryptedSO.id,
        options
      );
      expect(client.get).toHaveBeenCalledTimes(1);
      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledTimes(1);
      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledWith(nonEncryptedSO.type);
      expect(encryptionExtMock.decryptOrStripResponseAttributes).not.toBeCalled();
      expect(result).toEqual(
        expect.objectContaining({
          type: nonEncryptedSO.type,
          id: nonEncryptedSO.id,
          namespaces: [namespace],
        })
      );
    });

    it('decrypts and strips attributes if type is encryptable', async () => {
      const namespace = 'foo-namespace';
      const options = { namespace };

      const response = getMockGetResponse({
        type: encryptedSO.type,
        id: encryptedSO.id,
        namespace: options.namespace,
      });
      client.get.mockResponseOnce(response);
      encryptionExtMock.isEncryptableType.mockReturnValue(true);
      encryptionExtMock.decryptOrStripResponseAttributes.mockResolvedValue({
        ...encryptedSO,
        ...decryptedStrippedAttributes,
      });

      const result = await savedObjectsRepository.get(encryptedSO.type, encryptedSO.id, options);
      expect(client.get).toHaveBeenCalledTimes(1);
      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledTimes(1);
      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledWith(encryptedSO.type);
      expect(encryptionExtMock.decryptOrStripResponseAttributes).toHaveBeenCalledTimes(1);
      expect(encryptionExtMock.decryptOrStripResponseAttributes).toHaveBeenCalledWith(
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
      // savedObjectsRepository = instantiateRepository(); // #ToDo: pass in parameters to determine which extensions should be active in this suite

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

    const createSuccess = async <T>(
      type: string,
      attributes: T,
      options?: SavedObjectsCreateOptions
    ) => {
      return await savedObjectsRepository.create(type, attributes, options);
    };

    it('does not attempt to encrypt or decrypt if type is not encryptable', async () => {
      encryptionExtMock.isEncryptableType.mockReturnValue(false);
      const result = await createSuccess(nonEncryptedSO.type, nonEncryptedSO.attributes, {
        namespace,
      });
      expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
      expect(client.create).toHaveBeenCalled();
      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledTimes(3); // getValidId, optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledWith(nonEncryptedSO.type);
      expect(encryptionExtMock.encryptAttributes).not.toHaveBeenCalled();
      expect(encryptionExtMock.decryptOrStripResponseAttributes).not.toBeCalled();
      expect(result).toEqual(
        expect.objectContaining({
          type: nonEncryptedSO.type,
          id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          namespaces: [namespace],
        })
      );
    });

    it('encrypts attributes and strips them from response if type is encryptable', async () => {
      encryptionExtMock.isEncryptableType.mockReturnValue(true);
      encryptionExtMock.decryptOrStripResponseAttributes.mockResolvedValue({
        ...encryptedSO,
        ...decryptedStrippedAttributes,
      });

      const result = await createSuccess(encryptedSO.type, encryptedSO.attributes, {
        namespace,
      });
      expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
      expect(client.create).toHaveBeenCalled();
      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledTimes(3); // getValidId, optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledWith(encryptedSO.type);
      expect(encryptionExtMock.encryptAttributes).toHaveBeenCalledTimes(1);
      expect(encryptionExtMock.encryptAttributes).toHaveBeenCalledWith(
        {
          id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          namespace,
          type: ENCRYPTED_TYPE,
        },
        encryptedSO.attributes
      );
      expect(encryptionExtMock.decryptOrStripResponseAttributes).toHaveBeenCalledTimes(1);
      expect(encryptionExtMock.decryptOrStripResponseAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          ...encryptedSO,
          id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          attributes: undefined,
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
      encryptionExtMock.isEncryptableType.mockReturnValue(true);
      encryptionExtMock.decryptOrStripResponseAttributes.mockResolvedValue({
        ...encryptedSO,
        ...decryptedStrippedAttributes,
      });

      await expect(
        createSuccess(encryptedSO.type, encryptedSO.attributes, {
          id: 'this-should-throw-an-error',
        })
      ).rejects.toThrow(
        'Predefined IDs are not allowed for saved objects with encrypted attributes unless the ID is a UUID.: Bad Request'
      );
    });

    it(`allows a specified ID when overwriting an existing object`, async () => {
      encryptionExtMock.isEncryptableType.mockReturnValue(true);
      encryptionExtMock.decryptOrStripResponseAttributes.mockResolvedValue({
        ...encryptedSO,
        ...decryptedStrippedAttributes,
      });

      await expect(
        createSuccess(encryptedSO.type, encryptedSO.attributes, {
          id: encryptedSO.id,
          overwrite: true,
          version: mockVersion,
        })
      ).resolves.not.toThrowError();
    });

    describe('namespace', () => {
      const doTest = async (namespace: string, expectNamespaceInDescriptor: boolean) => {
        const options = { overwrite: true, namespace };
        encryptionExtMock.isEncryptableType.mockReturnValue(true);

        await createSuccess(
          expectNamespaceInDescriptor ? ENCRYPTED_TYPE : MULTI_NAMESPACE_ENCRYPTED_TYPE,
          encryptedSO.attributes,
          options
        );
        expect(mockPreflightCheckForCreate).not.toHaveBeenCalled();
        expect(client.index).toHaveBeenCalled(); // if overwrite is true, index will be called instead of create
        expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledTimes(3); // getValidId, optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
        expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledWith(
          expectNamespaceInDescriptor ? ENCRYPTED_TYPE : MULTI_NAMESPACE_ENCRYPTED_TYPE
        );
        expect(encryptionExtMock.encryptAttributes).toHaveBeenCalledTimes(1);
        expect(encryptionExtMock.encryptAttributes).toHaveBeenCalledWith(
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
    const originId = 'some-origin-id';

    const mockUpdateResponse = (
      type: string,
      id: string,
      options?: SavedObjectsUpdateOptions,
      includeOriginId?: boolean
    ) => {
      client.update.mockResponseOnce(
        {
          _id: `${type}:${id}`,
          ...mockVersionProps,
          result: 'updated',
          // don't need the rest of the source for test purposes, just the namespace and namespaces attributes
          get: {
            _source: {
              namespaces: [options?.namespace ?? 'default'],
              namespace: options?.namespace,

              // "includeOriginId" is not an option for the operation; however, if the existing saved object contains an originId attribute, the
              // operation will return it in the result. This flag is just used for test purposes to modify the mock cluster call response.
              ...(includeOriginId && { originId }),
            },
          },
        } as estypes.UpdateResponse,
        { statusCode: 200 }
      );
    };

    const updateSuccess = async <T>(
      type: string,
      id: string,
      attributes: T,
      options?: SavedObjectsUpdateOptions,
      internalOptions: {
        includeOriginId?: boolean;
        mockGetResponseValue?: estypes.GetResponse;
      } = {}
    ) => {
      const { mockGetResponseValue, includeOriginId } = internalOptions;
      if (registry.isMultiNamespace(type)) {
        const mockGetResponse =
          mockGetResponseValue ?? getMockGetResponse({ type, id }, options?.namespace);
        client.get.mockResponseOnce(mockGetResponse, { statusCode: 200 });
      }
      mockUpdateResponse(type, id, options, includeOriginId);
      const result = await savedObjectsRepository.update(type, id, attributes, options);
      expect(client.get).toHaveBeenCalledTimes(registry.isMultiNamespace(type) ? 1 : 0);
      return result;
    };

    beforeEach(() => {
      // savedObjectsRepository = instantiateRepository(); // #ToDo: pass in parameters to determine which extensions should be active in this suite

      mockPreflightCheckForCreate.mockReset();
      mockPreflightCheckForCreate.mockImplementation(({ objects }) => {
        return Promise.resolve(objects.map(({ type, id }) => ({ type, id }))); // respond with no errors by default
      });
    });

    it('does not attempt to encrypt or decrypt if type is not encryptable', async () => {
      encryptionExtMock.isEncryptableType.mockReturnValue(false);
      const result = await updateSuccess(nonEncryptedSO.type, nonEncryptedSO.id, attributes, {
        namespace,
      });
      expect(client.update).toHaveBeenCalledTimes(1);
      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledTimes(2); // (no upsert) optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledWith(nonEncryptedSO.type);
      expect(encryptionExtMock.encryptAttributes).not.toHaveBeenCalled();
      expect(encryptionExtMock.decryptOrStripResponseAttributes).not.toBeCalled();
      expect(result).toEqual(
        expect.objectContaining({
          type: nonEncryptedSO.type,
          id: nonEncryptedSO.id,
          namespaces: [namespace],
        })
      );
    });

    it('encrypts attributes and strips them from response if type is encryptable', async () => {
      encryptionExtMock.isEncryptableType.mockReturnValue(true);
      encryptionExtMock.decryptOrStripResponseAttributes.mockResolvedValue({
        ...encryptedSO,
        ...decryptedStrippedAttributes,
      });
      const result = await updateSuccess(encryptedSO.type, encryptedSO.id, encryptedSO.attributes, {
        namespace,
        references: encryptedSO.references,
      });
      expect(client.update).toHaveBeenCalledTimes(1);
      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledTimes(2); // (no upsert) optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledWith(encryptedSO.type);
      expect(encryptionExtMock.encryptAttributes).toHaveBeenCalledTimes(1);
      expect(encryptionExtMock.encryptAttributes).toHaveBeenCalledWith(
        {
          id: encryptedSO.id,
          namespace,
          type: ENCRYPTED_TYPE,
        },
        encryptedSO.attributes
      );
      expect(encryptionExtMock.decryptOrStripResponseAttributes).toHaveBeenCalledTimes(1);
      expect(encryptionExtMock.decryptOrStripResponseAttributes).toHaveBeenCalledWith(
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
    // beforeEach(() => {
    //   savedObjectsRepository = instantiateRepository(); // #ToDo: pass in parameters to determine which extensions should be active in this suite
    // });

    const bulkGet = async (
      objects: SavedObjectsBulkGetObject[],
      options?: SavedObjectsBaseOptions
    ) =>
      savedObjectsRepository.bulkGet(
        objects.map(({ type, id, namespaces }) => ({ type, id, namespaces })), // bulkGet only uses type, id, and optionally namespaces
        options
      );
    const bulkGetSuccess = async (objects: SavedObject[], options?: SavedObjectsBaseOptions) => {
      const response = getMockMgetResponse(objects, options?.namespace);
      client.mget.mockResponseOnce(response);
      const result = await bulkGet(objects, options);
      expect(client.mget).toHaveBeenCalledTimes(1);
      return { response, result };
    };

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
      encryptionExtMock.isEncryptableType.mockReturnValueOnce(false);
      encryptionExtMock.isEncryptableType.mockReturnValueOnce(true);
      const getId = (type: string, id: string) => `${namespace}:${type}:${id}`; // test that the raw document ID equals this (e.g., has a namespace prefix)
      await bulkGetSuccess([nonEncryptedSO, encryptedSO], { namespace });
      _expectClientCallArgs([nonEncryptedSO, encryptedSO], { getId });
      expect(encryptionExtMock.isEncryptableType).toBeCalledTimes(2);
      expect(encryptionExtMock.isEncryptableType).toBeCalledWith(nonEncryptedSO.type);
      expect(encryptionExtMock.isEncryptableType).toBeCalledWith(encryptedSO.type);
      expect(encryptionExtMock.decryptOrStripResponseAttributes).toBeCalledTimes(1);
      expect(encryptionExtMock.decryptOrStripResponseAttributes).toBeCalledWith(
        expect.objectContaining({ ...encryptedSO }),
        undefined
      );
    });
  });

  describe('#bulkCreate', () => {
    // beforeEach(() => {
    //   savedObjectsRepository = instantiateRepository(); // #ToDo: pass in parameters to determine which extensions should be active in this suite
    // });

    const getMockBulkCreateResponse = (
      objects: SavedObjectsBulkCreateObject[],
      namespace?: string
    ) => {
      return {
        errors: false,
        took: 1,
        items: objects.map(({ type, id, originId, attributes, references, migrationVersion }) => ({
          create: {
            // status: 1,
            // _index: '.kibana',
            _id: `${namespace ? `${namespace}:` : ''}${type}:${id}`,
            _source: {
              [type]: attributes,
              type,
              namespace,
              ...(originId && { originId }),
              references,
              ...mockTimestampFields,
              migrationVersion: migrationVersion || { [type]: '1.1.1' },
            },
            ...mockVersionProps,
          },
        })),
      } as unknown as estypes.BulkResponse;
    };

    const bulkCreateSuccess = async (
      objects: SavedObjectsBulkCreateObject[],
      options?: SavedObjectsCreateOptions
    ) => {
      const response = getMockBulkCreateResponse(objects, options?.namespace);
      client.bulk.mockResponse(response);
      const result = await savedObjectsRepository.bulkCreate(objects, options);
      return { response, result };
    };

    it(`only attempts to encrypt and decrypt attributes for types that are encryptable`, async () => {
      encryptionExtMock.isEncryptableType.mockReturnValueOnce(false); // getValidId
      encryptionExtMock.isEncryptableType.mockReturnValueOnce(true);
      encryptionExtMock.isEncryptableType.mockReturnValueOnce(false); // optionallyEncryptAttributes
      encryptionExtMock.isEncryptableType.mockReturnValueOnce(true);
      encryptionExtMock.isEncryptableType.mockReturnValueOnce(false); // optionallyDecryptAndRedactSingleResult
      encryptionExtMock.isEncryptableType.mockReturnValueOnce(true);
      await bulkCreateSuccess([
        nonEncryptedSO,
        { ...encryptedSO, id: undefined }, // Predefined IDs are not allowed for saved objects with encrypted attributes unless the ID is a UUID
      ]);
      expect(client.bulk).toHaveBeenCalledTimes(1);

      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledTimes(6); // x2 getValidId, optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledWith(nonEncryptedSO.type);
      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledWith(encryptedSO.type);
      expect(encryptionExtMock.encryptAttributes).toHaveBeenCalledTimes(1);
      expect(encryptionExtMock.encryptAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ type: encryptedSO.type }),
        encryptedSO.attributes
      );
      expect(encryptionExtMock.decryptOrStripResponseAttributes).toHaveBeenCalledTimes(1);
      expect(encryptionExtMock.decryptOrStripResponseAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ type: encryptedSO.type }),
        encryptedSO.attributes
      );
    });

    it(`fails if non-UUID ID is specified for encrypted type`, async () => {
      encryptionExtMock.isEncryptableType.mockReturnValue(true);
      const { result } = await bulkCreateSuccess([
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
      encryptionExtMock.isEncryptableType.mockReturnValue(false);
      const { result } = await bulkCreateSuccess([nonEncryptedSO]);
      expect(client.bulk).toHaveBeenCalledTimes(1);
      expect(result.saved_objects).not.toBeUndefined();
      expect(result.saved_objects.length).toBe(1);
      expect(result.saved_objects[0].error).toBeUndefined();
    });

    it(`allows a specified ID when overwriting an existing object`, async () => {
      encryptionExtMock.isEncryptableType.mockReturnValue(true);
      encryptionExtMock.decryptOrStripResponseAttributes.mockResolvedValue({
        ...encryptedSO,
        version: mockVersion,
        ...decryptedStrippedAttributes,
      });

      const { result } = await bulkCreateSuccess([{ ...encryptedSO, version: mockVersion }], {
        overwrite: true,
        // version: mockVersion, // this doesn't work in bulk...looks like it checks the object itself?
      });
      expect(client.bulk).toHaveBeenCalledTimes(1);
      expect(result.saved_objects).not.toBeUndefined();
      expect(result.saved_objects.length).toBe(1);
      expect(result.saved_objects[0].error).toBeUndefined();
    });
  });

  describe('#bulkUpdate', () => {
    // beforeEach(() => {
    //   savedObjectsRepository = instantiateRepository(); // #ToDo: pass in parameters to determine which extensions should be active in this suite
    // });

    const originId = 'some-origin-id';

    const getMockBulkUpdateResponse = (
      objects: TypeIdTuple[],
      options?: SavedObjectsBulkUpdateOptions,
      includeOriginId?: boolean
    ) =>
    ({
      items: objects.map(({ type, id }) => ({
        update: {
          _id: `${registry.isSingleNamespace(type) && options?.namespace ? `${options?.namespace}:` : ''
            }${type}:${id}`,
          ...mockVersionProps,
          get: {
            _source: {
              // "includeOriginId" is not an option for the operation; however, if the existing saved object contains an originId attribute, the
              // operation will return it in the result. This flag is just used for test purposes to modify the mock cluster call response.
              ...(includeOriginId && { originId }),
            },
          },
          result: 'updated',
        },
      })),
    } as estypes.BulkResponse);

    const bulkUpdateSuccess = async (
      objects: SavedObjectsBulkUpdateObject[],
      options?: SavedObjectsBulkUpdateOptions,
      includeOriginId?: boolean
    ) => {
      const multiNamespaceObjects = objects.filter(({ type }) => registry.isMultiNamespace(type));
      if (multiNamespaceObjects?.length) {
        const response = getMockMgetResponse(multiNamespaceObjects, options?.namespace);
        client.mget.mockResponseOnce(response);
      }
      const response = getMockBulkUpdateResponse(objects, options, includeOriginId);
      client.bulk.mockResponseOnce(response);
      const result = await savedObjectsRepository.bulkUpdate(objects, options);
      expect(client.mget).toHaveBeenCalledTimes(multiNamespaceObjects?.length ? 1 : 0);
      return result;
    };

    it(`only attempts to encrypt and decrypt attributes for types that are encryptable`, async () => {
      encryptionExtMock.isEncryptableType.mockReturnValueOnce(false); // optionallyEncryptAttributes
      encryptionExtMock.isEncryptableType.mockReturnValueOnce(true);
      encryptionExtMock.isEncryptableType.mockReturnValueOnce(false); // optionallyDecryptAndRedactSingleResult
      encryptionExtMock.isEncryptableType.mockReturnValueOnce(true);

      await bulkUpdateSuccess([nonEncryptedSO, encryptedSO]);
      expect(client.bulk).toHaveBeenCalledTimes(1);

      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledTimes(4); // 2x optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledWith(nonEncryptedSO.type);
      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledWith(encryptedSO.type);
      expect(encryptionExtMock.encryptAttributes).toHaveBeenCalledTimes(1);
      expect(encryptionExtMock.encryptAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ type: encryptedSO.type }),
        encryptedSO.attributes
      );
      expect(encryptionExtMock.decryptOrStripResponseAttributes).toHaveBeenCalledTimes(1);
      expect(encryptionExtMock.decryptOrStripResponseAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ type: encryptedSO.type }),
        encryptedSO.attributes
      );
    });

    it('does not use options `namespace` or object `namespace` to encrypt attributes if neither are specified', async () => {
      encryptionExtMock.isEncryptableType.mockReturnValue(true);

      await bulkUpdateSuccess([{ ...encryptedSO, namespace: undefined }], { namespace: undefined });
      expect(client.bulk).toHaveBeenCalledTimes(1);

      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledTimes(2); // 2x optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledWith(encryptedSO.type);
      expect(encryptionExtMock.encryptAttributes).toHaveBeenCalledTimes(1);
      expect(encryptionExtMock.encryptAttributes).toHaveBeenCalledWith(
        { id: encryptedSO.id, type: encryptedSO.type, namespace: undefined },
        encryptedSO.attributes
      );
    });

    it('with a single-namespace type...uses options `namespace` to encrypt attributes if it is specified and object `namespace` is not', async () => {
      encryptionExtMock.isEncryptableType.mockReturnValue(true);
      const usedNamespace = 'options-namespace';

      await bulkUpdateSuccess([{ ...encryptedSO, namespace: undefined }], { namespace: usedNamespace });
      expect(client.bulk).toHaveBeenCalledTimes(1);

      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledTimes(2); // 2x optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledWith(encryptedSO.type);
      expect(encryptionExtMock.encryptAttributes).toHaveBeenCalledTimes(1);
      expect(encryptionExtMock.encryptAttributes).toHaveBeenCalledWith(
        { id: encryptedSO.id, type: encryptedSO.type, namespace: usedNamespace },
        encryptedSO.attributes
      );
    });

    it('with a single-namespace type...uses object `namespace` to encrypt attributes if it is specified', async () => {
      encryptionExtMock.isEncryptableType.mockReturnValue(true);
      const usedNamespace = 'object-namespace';

      await bulkUpdateSuccess([{ ...encryptedSO, namespace: usedNamespace }], { namespace: undefined });
      expect(client.bulk).toHaveBeenCalledTimes(1);

      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledTimes(2); // 2x optionallyEncryptAttributes, optionallyDecryptAndRedactSingleResult
      expect(encryptionExtMock.isEncryptableType).toHaveBeenCalledWith(encryptedSO.type);
      expect(encryptionExtMock.encryptAttributes).toHaveBeenCalledTimes(1);
      expect(encryptionExtMock.encryptAttributes).toHaveBeenCalledWith(
        { id: encryptedSO.id, type: encryptedSO.type, namespace: usedNamespace },
        encryptedSO.attributes
      );
    });
  });

  describe('#find', () => {
    // beforeEach(() => {
    //   savedObjectsRepository = instantiateRepository(); // #ToDo: pass in parameters to determine which extensions should be active in this suite
    // });

    const generateSearchResults = (namespace?: string) => {
      return {
        took: 1,
        timed_out: false,
        _shards: {} as any,
        hits: {
          total: 2,
          hits: [
            {
              _index: '.kibana',
              _id: `${namespace ? `${namespace}:` : ''}${encryptedSO.type}:${encryptedSO.id}`,
              _score: 1,
              ...mockVersionProps,
              _source: {
                ...encryptedSO,
                originId: 'some-origin-id', // only one of the results has an originId, this is intentional to test both a positive and negative case
              },
            },
            {
              _index: '.kibana',
              _id: `${namespace ? `${namespace}:` : ''}index-pattern:logstash-*`,
              _score: 2,
              ...mockVersionProps,
              _source: {
                namespace,
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

    const findSuccess = async (options: SavedObjectsFindOptions, namespace?: string) => {
      client.search.mockResponseOnce(generateSearchResults(namespace));
      const result = await savedObjectsRepository.find(options);
      expect(mockGetSearchDsl).toHaveBeenCalledTimes(1);
      expect(client.search).toHaveBeenCalledTimes(1);
      return result;
    };

    it(`only attempts to decrypt and strip attributes for types that are encryptable`, async () => {
      encryptionExtMock.isEncryptableType.mockReturnValueOnce(true);
      await findSuccess({ type: [encryptedSO.type, 'index-pattern'] });
      expect(client.search).toHaveBeenCalledTimes(1);
      expect(encryptionExtMock.isEncryptableType).toBeCalledTimes(2);
      expect(encryptionExtMock.isEncryptableType).toBeCalledWith(encryptedSO.type);
      expect(encryptionExtMock.isEncryptableType).toBeCalledWith('index-pattern');
      expect(encryptionExtMock.decryptOrStripResponseAttributes).toBeCalledTimes(1);
      expect(encryptionExtMock.decryptOrStripResponseAttributes).toBeCalledWith(
        expect.objectContaining({ type: encryptedSO.type, id: encryptedSO.id }),
        undefined
      );
    });
  });
});
