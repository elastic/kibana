/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @typescript-eslint/no-shadow */

// import {
//   pointInTimeFinderMock,
//   mockGetCurrentTime,
//   mockPreflightCheckForCreate,
//   mockGetSearchDsl,
// } from './repository.test.mock';

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
import { ElasticsearchClientMock } from '../../../elasticsearch/client/mocks';
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
import { ElasticsearchClient } from '@kbn/core/server/elasticsearch';

export const KIBANA_VERSION = '2.0.0';
export const CUSTOM_INDEX_TYPE = 'customIndex';
/** This type has namespaceType: 'agnostic'. */
export const NAMESPACE_AGNOSTIC_TYPE = 'globalType';
/**
 * This type has namespaceType: 'multiple'.
 *
 * That means that the object is serialized with a globally unique ID across namespaces. It also means that the object is shareable across
 * namespaces.
 **/
export const MULTI_NAMESPACE_TYPE = 'multiNamespaceType';
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
export const MULTI_NAMESPACE_ISOLATED_TYPE = 'multiNamespaceIsolatedType';
/** This type has namespaceType: 'multiple', and it uses a custom index. */
export const MULTI_NAMESPACE_CUSTOM_INDEX_TYPE = 'multiNamespaceTypeCustomIndex';
export const HIDDEN_TYPE = 'hiddenType';
export const ENCRYPTED_TYPE = 'encryptedType';
export const MULTI_NAMESPACE_ENCRYPTED_TYPE = 'multiNamespaceEncryptedType';
export const mockVersionProps = { _seq_no: 1, _primary_term: 1 };
export const mockVersion = encodeHitVersion(mockVersionProps);
export const mockTimestamp = '2017-08-14T15:49:14.886Z';
export const mockTimestampFields = { updated_at: mockTimestamp };

export interface TypeIdTuple {
  id: string;
  type: string;
}

export const mappings: SavedObjectsTypeMappingDefinition = {
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

export const createType = (type: string, parts: Partial<SavedObjectsType> = {}): SavedObjectsType => ({
  name: type,
  hidden: false,
  namespaceType: 'single',
  mappings: {
    properties: mappings.properties[type].properties! as SavedObjectsMappingProperties,
  },
  migrations: { '1.1.1': (doc) => doc },
  ...parts,
});

export const createRegistry = () => {
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
  return registry;
};

export const createSpySerializer = (registry: SavedObjectTypeRegistry) => {
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

export const createDocumentMigrator = (registry: SavedObjectTypeRegistry) => {
  return new DocumentMigrator({
    typeRegistry: registry,
    kibanaVersion: KIBANA_VERSION,
    log: loggerMock.create(),
  });
}

export const getMockGetResponse = (
  registry: SavedObjectTypeRegistry,
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

export const getMockMgetResponse = (
  registry: SavedObjectTypeRegistry,
  objects: Array<TypeIdTuple & { found?: boolean; initialNamespaces?: string[] }>,
  namespace?: string
) =>
  ({
    docs: objects.map((obj) =>
      obj.found === false ? obj : getMockGetResponse(registry, obj, obj.initialNamespaces ?? namespace)
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

export const mockUpdateResponse = (
  client: ElasticsearchClientMock,
  type: string,
  id: string,
  options?: SavedObjectsUpdateOptions,
  originId?: string,
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

          // If the existing saved object contains an originId attribute, the operation will return it in the result.
          // The originId parameter is just used for test purposes to modify the mock cluster call response.
          ...(!!originId && { originId }),
        },
      },
    } as estypes.UpdateResponse,
    { statusCode: 200 }
  );
};

export const updateSuccess = async <T>(
  client: ElasticsearchClientMock,
  repository: SavedObjectsRepository,
  registry: SavedObjectTypeRegistry,
  type: string,
  id: string,
  attributes: T,
  options?: SavedObjectsUpdateOptions,
  internalOptions: {
    originId?: string;
    mockGetResponseValue?: estypes.GetResponse;
  } = {}
) => {
  const { mockGetResponseValue, originId, } = internalOptions;
  if (registry.isMultiNamespace(type)) {
    const mockGetResponse =
      mockGetResponseValue ?? getMockGetResponse(registry, { type, id }, options?.namespace);
    client.get.mockResponseOnce(mockGetResponse, { statusCode: 200 });
  }
  mockUpdateResponse(client, type, id, options, originId);
  const result = await repository.update(type, id, attributes, options);
  expect(client.get).toHaveBeenCalledTimes(registry.isMultiNamespace(type) ? 1 : 0);
  return result;
};

export const bulkGet = async (
  repository: SavedObjectsRepository,
  objects: SavedObjectsBulkGetObject[],
  options?: SavedObjectsBaseOptions
) =>
  repository.bulkGet(
    objects.map(({ type, id, namespaces }) => ({ type, id, namespaces })), // bulkGet only uses type, id, and optionally namespaces
    options
  );

export const bulkGetSuccess = async (
  client: ElasticsearchClientMock,
  repository: SavedObjectsRepository,
  registry: SavedObjectTypeRegistry,
  objects: SavedObject[],
  options?: SavedObjectsBaseOptions
) => {
  const response = getMockMgetResponse(registry, objects, options?.namespace);
  client.mget.mockResponseOnce(response);
  const result = await bulkGet(repository, objects, options);
  expect(client.mget).toHaveBeenCalledTimes(1);
  return result;
};

export const getMockBulkCreateResponse = (
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

export const bulkCreateSuccess = async (
  client: ElasticsearchClientMock,
  repository: SavedObjectsRepository,
  objects: SavedObjectsBulkCreateObject[],
  options?: SavedObjectsCreateOptions
) => {
  const response = getMockBulkCreateResponse(objects, options?.namespace);
  client.bulk.mockResponse(response);
  const result = await repository.bulkCreate(objects, options);
  return result;
};

export const getMockBulkUpdateResponse = (
  registry: SavedObjectTypeRegistry,
  objects: TypeIdTuple[],
  options?: SavedObjectsBulkUpdateOptions,
  originId?: string
) =>
({
  items: objects.map(({ type, id }) => ({
    update: {
      _id: `${registry.isSingleNamespace(type) && options?.namespace ? `${options?.namespace}:` : ''
        }${type}:${id}`,
      ...mockVersionProps,
      get: {
        _source: {
          // If the existing saved object contains an originId attribute, the operation will return it in the result.
          // The originId parameter is just used for test purposes to modify the mock cluster call response.
          ...(!!originId && { originId }),
        },
      },
      result: 'updated',
    },
  })),
} as estypes.BulkResponse);

export const bulkUpdateSuccess = async (
  client: ElasticsearchClientMock,
  repository: SavedObjectsRepository,
  registry: SavedObjectTypeRegistry,
  objects: SavedObjectsBulkUpdateObject[],
  options?: SavedObjectsBulkUpdateOptions,
  originId?: string,
) => {
  const multiNamespaceObjects = objects.filter(({ type }) => registry.isMultiNamespace(type));
  if (multiNamespaceObjects?.length) {
    const response = getMockMgetResponse(registry, multiNamespaceObjects, options?.namespace);
    client.mget.mockResponseOnce(response);
  }
  const response = getMockBulkUpdateResponse(registry, objects, options, originId);
  client.bulk.mockResponseOnce(response);
  const result = await repository.bulkUpdate(objects, options);
  expect(client.mget).toHaveBeenCalledTimes(multiNamespaceObjects?.length ? 1 : 0);
  return result;
};
