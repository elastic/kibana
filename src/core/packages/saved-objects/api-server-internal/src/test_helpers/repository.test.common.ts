/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as estypes from '@elastic/elasticsearch/lib/api/types';
import { schema } from '@kbn/config-schema';
import { loggerMock } from '@kbn/logging-mocks';
import type { Payload } from 'elastic-apm-node';
import {
  type AuthorizationTypeEntry,
  type AuthorizeAndRedactMultiNamespaceReferencesParams,
  type CheckAuthorizationResult,
  type ISavedObjectsSecurityExtension,
  type SavedObjectsMappingProperties,
  type SavedObjectsRawDocSource,
  type SavedObjectsType,
  type SavedObjectsTypeMappingDefinition,
  type SavedObject,
  type SavedObjectReference,
  type AuthorizeFindParams,
  MAIN_SAVED_OBJECT_INDEX,
} from '@kbn/core-saved-objects-server';
import type {
  SavedObjectsBaseOptions,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkDeleteObject,
  SavedObjectsBulkDeleteOptions,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsCreateOptions,
  SavedObjectsDeleteOptions,
  SavedObjectsFindOptions,
  SavedObjectsUpdateOptions,
} from '@kbn/core-saved-objects-api-server';
import {
  encodeHitVersion,
  SavedObjectsSerializer,
  SavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-base-server-internal';
import {
  elasticsearchClientMock,
  type ElasticsearchClientMock,
} from '@kbn/core-elasticsearch-client-server-mocks';
import { DocumentMigrator } from '@kbn/core-saved-objects-migration-server-internal';
import {
  type AuthorizeAndRedactInternalBulkResolveParams,
  type GetFindRedactTypeMapParams,
  type AuthorizationTypeMap,
  SavedObjectsErrorHelpers,
} from '@kbn/core-saved-objects-server';
import { mockGetSearchDsl } from '../lib/repository.test.mock';
import { SavedObjectsRepository } from '../lib/repository';

export const DEFAULT_SPACE = 'default';

export interface ExpectedErrorResult {
  type: string;
  id: string;
  error: Record<string, any>;
}

export type ErrorPayload = Error & Payload;

export const createBadRequestErrorPayload = (reason?: string) =>
  SavedObjectsErrorHelpers.createBadRequestError(reason).output.payload as unknown as ErrorPayload;
export const createConflictErrorPayload = (type: string, id: string, reason?: string) =>
  SavedObjectsErrorHelpers.createConflictError(type, id, reason).output
    .payload as unknown as ErrorPayload;
export const createGenericNotFoundErrorPayload = (
  type: string | null = null,
  id: string | null = null
) =>
  SavedObjectsErrorHelpers.createGenericNotFoundError(type, id).output
    .payload as unknown as ErrorPayload;
export const createUnsupportedTypeErrorPayload = (type: string) =>
  SavedObjectsErrorHelpers.createUnsupportedTypeError(type).output
    .payload as unknown as ErrorPayload;

export const expectError = ({ type, id }: { type: string; id: string }) => ({
  type,
  id,
  error: expect.any(Object),
});

export const expectErrorResult = (
  { type, id }: TypeIdTuple,
  error: Record<string, any>,
  overrides: Record<string, unknown> = {}
): ExpectedErrorResult => ({
  type,
  id,
  error: { ...error, ...overrides },
});
export const expectErrorNotFound = (obj: TypeIdTuple, overrides?: Record<string, unknown>) =>
  expectErrorResult(obj, createGenericNotFoundErrorPayload(obj.type, obj.id), overrides);
export const expectErrorConflict = (obj: TypeIdTuple, overrides?: Record<string, unknown>) =>
  expectErrorResult(obj, createConflictErrorPayload(obj.type, obj.id), overrides);
export const expectErrorInvalidType = (obj: TypeIdTuple, overrides?: Record<string, unknown>) =>
  expectErrorResult(obj, createUnsupportedTypeErrorPayload(obj.type), overrides);

export const KIBANA_VERSION = '8.8.0';
export const ALLOWED_CONVERT_VERSION = '8.0.0';
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
export const mockTimestampFieldsWithCreated = {
  updated_at: mockTimestamp,
  created_at: mockTimestamp,
};
export const REMOVE_REFS_COUNT = 42;

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

export const authRecord: Record<string, AuthorizationTypeEntry> = {
  find: { authorizedSpaces: ['bar'] },
};
export const authMap = Object.freeze(new Map([['foo', authRecord]]));

export const checkAuthError = SavedObjectsErrorHelpers.createBadRequestError(
  'Failed to check authorization'
);

export const enforceError = SavedObjectsErrorHelpers.decorateForbiddenError(
  new Error('Unauthorized'),
  'User lacks privileges'
);

// Note: Only using 'any' here because we don't care about/use the method parameters of the mock
// The only alternative I can see is to use a union of all the parameter interfaces which would
// be lengthy.
export const setupAuthorizeFunc = (
  jestMock: jest.MockInstance<Promise<CheckAuthorizationResult<string>>, any>,
  status: 'fully_authorized' | 'partially_authorized' | 'unauthorized'
) => {
  jestMock.mockImplementation((): Promise<CheckAuthorizationResult<string>> => {
    if (status === 'unauthorized') throw enforceError;
    return Promise.resolve({ status, typeMap: authMap });
  });
};

export const setupAuthorizeFind = (
  mockSecurityExt: jest.Mocked<ISavedObjectsSecurityExtension>,
  status: 'fully_authorized' | 'partially_authorized' | 'unauthorized'
) => {
  mockSecurityExt.authorizeFind.mockImplementation(
    (params: AuthorizeFindParams): Promise<CheckAuthorizationResult<string>> => {
      return Promise.resolve({ status, typeMap: authMap });
    }
  );
};

export const setupGetFindRedactTypeMap = (
  mockSecurityExt: jest.Mocked<ISavedObjectsSecurityExtension>
) => {
  mockSecurityExt.getFindRedactTypeMap.mockImplementation(
    (params: GetFindRedactTypeMapParams): Promise<AuthorizationTypeMap<string>> => {
      return Promise.resolve(authMap);
    }
  );
};

export const setupAuthorizeAndRedactInternalBulkResolveFailure = (
  mockSecurityExt: jest.Mocked<ISavedObjectsSecurityExtension>
) => {
  mockSecurityExt.authorizeAndRedactInternalBulkResolve.mockImplementation(
    (params: AuthorizeAndRedactInternalBulkResolveParams<unknown>) => {
      throw enforceError;
    }
  );
};

export const setupAuthorizeAndRedactInternalBulkResolveSuccess = (
  mockSecurityExt: jest.Mocked<ISavedObjectsSecurityExtension>
) => {
  mockSecurityExt.authorizeAndRedactInternalBulkResolve.mockImplementation(
    (params: AuthorizeAndRedactInternalBulkResolveParams<unknown>) => {
      return Promise.resolve(params.objects);
    }
  );
};

export const setupAuthorizeAndRedactMultiNamespaceReferenencesFailure = (
  mockSecurityExt: jest.Mocked<ISavedObjectsSecurityExtension>
) => {
  mockSecurityExt.authorizeAndRedactMultiNamespaceReferences.mockImplementation(
    (params: AuthorizeAndRedactMultiNamespaceReferencesParams) => {
      throw enforceError;
    }
  );
};

export const setupAuthorizeAndRedactMultiNamespaceReferenencesSuccess = (
  mockSecurityExt: jest.Mocked<ISavedObjectsSecurityExtension>
) => {
  mockSecurityExt.authorizeAndRedactMultiNamespaceReferences.mockImplementation(
    (params: AuthorizeAndRedactMultiNamespaceReferencesParams) => {
      return Promise.resolve(params.objects.map(({ name, ...rest }) => ({ ...rest })));
    }
  );
};

export const setupRedactPassthrough = (
  mockSecurityExt: jest.Mocked<ISavedObjectsSecurityExtension>
) => {
  mockSecurityExt.redactNamespaces.mockImplementation(({ savedObject: object }) => {
    return object;
  });
};

export const createType = (
  type: string,
  parts: Partial<SavedObjectsType> = {}
): SavedObjectsType => ({
  name: type,
  hidden: false,
  namespaceType: 'single',
  mappings: {
    properties: (mappings.properties[type]
      ? mappings.properties[type].properties!
      : {}) as SavedObjectsMappingProperties,
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
  const serializer = new SavedObjectsSerializer(registry);

  for (const method of [
    'isRawSavedObject',
    'rawToSavedObject',
    'savedObjectToRaw',
    'generateRawId',
    'generateRawLegacyUrlAliasId',
    'trimIdPrefix',
  ] as Array<keyof SavedObjectsSerializer>) {
    jest.spyOn(serializer, method);
  }

  return serializer as jest.Mocked<SavedObjectsSerializer>;
};

export const createDocumentMigrator = (registry: SavedObjectTypeRegistry) => {
  return new DocumentMigrator({
    typeRegistry: registry,
    kibanaVersion: KIBANA_VERSION,
    convertVersion: ALLOWED_CONVERT_VERSION,
    log: loggerMock.create(),
  });
};

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

  const result = {
    // NOTE: Elasticsearch returns more fields (_index, _type) but the SavedObjectsRepository method ignores these
    found: true,
    _id: `${registry.isSingleNamespace(type) && namespaceId ? `${namespaceId}:` : ''}${type}:${id}`,
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
  return result;
};

export const getMockMgetResponse = (
  registry: SavedObjectTypeRegistry,
  objects: Array<
    TypeIdTuple & { found?: boolean; initialNamespaces?: string[]; originId?: string }
  >,
  namespace?: string
) =>
  ({
    docs: objects.map((obj) =>
      obj.found === false
        ? obj
        : getMockGetResponse(registry, obj, obj.initialNamespaces ?? namespace)
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

export const updateSuccess = async <T extends Partial<unknown>>(
  client: ElasticsearchClientMock,
  repository: SavedObjectsRepository,
  registry: SavedObjectTypeRegistry,
  type: string,
  id: string,
  attributes: T,
  options?: SavedObjectsUpdateOptions,
  internalOptions: {
    originId?: string;
    mockGetResponseAsNotFound?: estypes.GetResponse;
  } = {},
  objNamespaces?: string[]
) => {
  const { mockGetResponseAsNotFound, originId } = internalOptions;
  const mockGetResponse =
    mockGetResponseAsNotFound ??
    getMockGetResponse(registry, { type, id, originId }, objNamespaces ?? options?.namespace);
  client.get.mockResponseOnce(mockGetResponse, { statusCode: 200 });
  if (!mockGetResponseAsNotFound) {
    // index doc from existing doc
    client.index.mockResponseImplementation((params) => {
      return {
        body: {
          _id: params.id,
          ...mockVersionProps,
        } as estypes.CreateResponse,
      };
    });
  }
  if (mockGetResponseAsNotFound) {
    // upsert case: create the doc. (be careful here, we're also sending mockGetResponseValue as { found: false })
    client.create.mockResponseImplementation((params) => {
      return {
        body: {
          _id: params.id,
          ...mockVersionProps,
        } as estypes.CreateResponse,
      };
    });
  }

  const result = await repository.update(type, id, attributes, options);
  expect(client.get).toHaveBeenCalled(); // not asserting on the number of calls here, we end up testing the test mocks and not the actual implementation
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
  const mockResponse = getMockMgetResponse(registry, objects, options?.namespace);
  client.mget.mockResponseOnce(mockResponse);
  const result = await bulkGet(repository, objects, options);
  expect(client.mget).toHaveBeenCalledTimes(1);
  return { result, mockResponse };
};

export const expectBulkGetResult = (
  { type, id }: TypeIdTuple,
  doc: estypes.GetGetResult<SavedObjectsRawDocSource>
) => ({
  type,
  id,
  namespaces: doc._source!.namespaces ?? [doc._source!.namespace] ?? ['default'],
  ...(doc._source!.originId && { originId: doc._source!.originId }),
  ...(doc._source!.updated_at && { updated_at: doc._source!.updated_at }),
  version: encodeHitVersion(doc),
  attributes: doc._source![type],
  references: doc._source!.references || [],
  migrationVersion: doc._source!.migrationVersion,
  managed: expect.any(Boolean),
  coreMigrationVersion: expect.any(String),
  typeMigrationVersion: expect.any(String),
});

export const getMockBulkCreateResponse = (
  objects: SavedObjectsBulkCreateObject[],
  namespace?: string,
  managed?: boolean
) => {
  return {
    errors: false,
    took: 1,
    items: objects.map(
      ({
        type,
        id,
        originId,
        attributes,
        references,
        migrationVersion,
        typeMigrationVersion,
        managed: docManaged,
      }) => ({
        create: {
          _id: `${namespace ? `${namespace}:` : ''}${type}:${id}`,
          _source: {
            [type]: attributes,
            type,
            namespace,
            ...(originId && { originId }),
            references,
            ...mockTimestampFieldsWithCreated,
            typeMigrationVersion: typeMigrationVersion || migrationVersion?.[type] || '1.1.1',
            managed: managed ?? docManaged ?? false,
          },
          ...mockVersionProps,
        },
      })
    ),
  } as unknown as estypes.BulkResponse;
};

export const bulkCreateSuccess = async (
  client: ElasticsearchClientMock,
  repository: SavedObjectsRepository,
  objects: SavedObjectsBulkCreateObject[],
  options?: SavedObjectsCreateOptions
) => {
  const mockResponse = getMockBulkCreateResponse(objects, options?.namespace, options?.managed);
  client.bulk.mockResponse(mockResponse);
  const result = await repository.bulkCreate(objects, options);
  return result;
};

export const expectCreateResult = (obj: {
  type: string;
  namespace?: string;
  namespaces?: string[];
  managed?: boolean;
}) => ({
  ...obj,
  coreMigrationVersion: expect.any(String),
  typeMigrationVersion: '1.1.1',
  managed: obj.managed ?? false,
  version: mockVersion,
  namespaces: obj.namespaces ?? [obj.namespace ?? 'default'],
  ...mockTimestampFieldsWithCreated,
});

export const getMockBulkUpdateResponse = (
  registry: SavedObjectTypeRegistry,
  objects: TypeIdTuple[],
  options?: SavedObjectsBulkUpdateOptions,
  originId?: string
) => {
  return {
    items: objects.map(({ type, id }) => ({
      index: {
        _id: `${
          registry.isSingleNamespace(type) && options?.namespace ? `${options?.namespace}:` : ''
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
  } as estypes.BulkResponse;
};

export const bulkUpdateSuccess = async (
  client: ElasticsearchClientMock,
  repository: SavedObjectsRepository,
  registry: SavedObjectTypeRegistry,
  objects: SavedObjectsBulkUpdateObject[],
  options?: SavedObjectsBulkUpdateOptions,
  originId?: string,
  multiNamespaceSpace?: string // the space for multi namespace objects returned by mock mget (this is only needed for space ext testing)
) => {
  let mockedMgetResponse;
  const validObjects = objects.filter(({ type }) => registry.getType(type) !== undefined);
  const multiNamespaceObjects = validObjects.filter(({ type }) => registry.isMultiNamespace(type));

  if (validObjects?.length) {
    if (multiNamespaceObjects.length > 0) {
      mockedMgetResponse = getMockMgetResponse(
        registry,
        validObjects,
        multiNamespaceSpace ?? options?.namespace
      );
    } else {
      mockedMgetResponse = getMockMgetResponse(registry, validObjects);
    }
    client.mget.mockResponseOnce(mockedMgetResponse);
  }
  const response = getMockBulkUpdateResponse(registry, objects, options, originId);
  client.bulk.mockResponseOnce(response);
  const result = await repository.bulkUpdate(objects, options);
  expect(client.mget).toHaveBeenCalledTimes(validObjects?.length ? 1 : 0);
  return result;
};

export const expectUpdateResult = ({
  type,
  id,
  attributes,
  references,
}: SavedObjectsBulkUpdateObject) => ({
  type,
  id,
  attributes,
  references,
  version: mockVersion,
  namespaces: ['default'],
  ...mockTimestampFields,
});

export type IGenerateSearchResultsFunction = (
  namespace?: string
) => estypes.SearchResponse<SavedObjectsRawDocSource>;

export const generateIndexPatternSearchResults = (namespace?: string) => {
  return {
    took: 1,
    timed_out: false,
    _shards: {} as any,
    hits: {
      total: 4,
      hits: [
        {
          _index: MAIN_SAVED_OBJECT_INDEX,
          _id: `${namespace ? `${namespace}:` : ''}index-pattern:logstash-*`,
          _score: 1,
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
        {
          _index: MAIN_SAVED_OBJECT_INDEX,
          _id: `${namespace ? `${namespace}:` : ''}config:6.0.0-alpha1`,
          _score: 2,
          ...mockVersionProps,
          _source: {
            namespace,
            type: 'config',
            ...mockTimestampFields,
            config: {
              buildNum: 8467,
              defaultIndex: 'logstash-*',
            },
          },
        },
        {
          _index: MAIN_SAVED_OBJECT_INDEX,
          _id: `${namespace ? `${namespace}:` : ''}index-pattern:stocks-*`,
          _score: 3,
          ...mockVersionProps,
          _source: {
            namespace,
            type: 'index-pattern',
            ...mockTimestampFields,
            'index-pattern': {
              title: 'stocks-*',
              timeFieldName: '@timestamp',
              notExpandable: true,
            },
          },
        },
        {
          _index: MAIN_SAVED_OBJECT_INDEX,
          _id: `${NAMESPACE_AGNOSTIC_TYPE}:something`,
          _score: 4,
          ...mockVersionProps,
          _source: {
            type: NAMESPACE_AGNOSTIC_TYPE,
            ...mockTimestampFields,
            [NAMESPACE_AGNOSTIC_TYPE]: {
              name: 'bar',
            },
          },
        },
      ],
    },
  } as estypes.SearchResponse<SavedObjectsRawDocSource>;
};

export const findSuccess = async (
  client: ElasticsearchClientMock,
  repository: SavedObjectsRepository,
  options: SavedObjectsFindOptions,
  namespace?: string,
  generateSearchResultsFunc: IGenerateSearchResultsFunction = generateIndexPatternSearchResults
) => {
  const generatedResults = generateSearchResultsFunc(namespace);
  client.search.mockResponseOnce(generatedResults);
  const result = await repository.find(options);
  expect(mockGetSearchDsl).toHaveBeenCalledTimes(1);
  expect(client.search).toHaveBeenCalledTimes(1);
  return { result, generatedResults };
};

export const deleteSuccess = async (
  client: ElasticsearchClientMock,
  repository: SavedObjectsRepository,
  registry: SavedObjectTypeRegistry,
  type: string,
  id: string,
  options?: SavedObjectsDeleteOptions,
  internalOptions: { mockGetResponseValue?: estypes.GetResponse } = {}
) => {
  const { mockGetResponseValue } = internalOptions;
  if (registry.isMultiNamespace(type)) {
    const mockGetResponse =
      mockGetResponseValue ?? getMockGetResponse(registry, { type, id }, options?.namespace);
    client.get.mockResponseOnce(mockGetResponse);
  }
  client.delete.mockResponseOnce({
    result: 'deleted',
  } as estypes.DeleteResponse);
  const result = await repository.delete(type, id, options);
  expect(client.get).toHaveBeenCalledTimes(registry.isMultiNamespace(type) ? 1 : 0);
  return result;
};

export const removeReferencesToSuccess = async (
  client: ElasticsearchClientMock,
  repository: SavedObjectsRepository,
  type: string,
  id: string,
  options = {},
  updatedCount = REMOVE_REFS_COUNT
) => {
  client.updateByQuery.mockResponseOnce({
    updated: updatedCount,
  });
  return await repository.removeReferencesTo(type, id, options);
};

export const checkConflicts = async (
  repository: SavedObjectsRepository,
  objects: TypeIdTuple[],
  options?: SavedObjectsBaseOptions
) =>
  repository.checkConflicts(
    objects.map(({ type, id }) => ({ type, id })), // checkConflicts only uses type and id
    options
  );

export const checkConflictsSuccess = async (
  client: ElasticsearchClientMock,
  repository: SavedObjectsRepository,
  registry: SavedObjectTypeRegistry,
  objects: TypeIdTuple[],
  options?: SavedObjectsBaseOptions
) => {
  const response = getMockMgetResponse(registry, objects, options?.namespace);
  client.mget.mockResolvedValue(
    elasticsearchClientMock.createSuccessTransportRequestPromise(response)
  );
  const result = await checkConflicts(repository, objects, options);
  expect(client.mget).toHaveBeenCalledTimes(1);
  return result;
};

export const getSuccess = async (
  client: ElasticsearchClientMock,
  repository: SavedObjectsRepository,
  registry: SavedObjectTypeRegistry,
  type: string,
  id: string,
  options?: SavedObjectsBaseOptions,
  originId?: string,
  objNamespaces?: string[]
) => {
  const response = getMockGetResponse(
    registry,
    {
      type,
      id,
      // "includeOriginId" is not an option for the operation; however, if the existing saved object contains an originId attribute, the
      // operation will return it in the result. This flag is just used for test purposes to modify the mock cluster call response.
      originId,
    },
    objNamespaces ?? options?.namespace
  );
  client.get.mockResponseOnce(response);
  const result = await repository.get(type, id, options);
  expect(client.get).toHaveBeenCalledTimes(1);
  return result;
};

export const getMockEsBulkDeleteResponse = (
  registry: SavedObjectTypeRegistry,
  objects: TypeIdTuple[],
  options?: SavedObjectsBulkDeleteOptions
) =>
  ({
    items: objects.map(({ type, id }) => ({
      // es response returns more fields than what we're interested in.
      delete: {
        _id: `${
          registry.isSingleNamespace(type) && options?.namespace ? `${options?.namespace}:` : ''
        }${type}:${id}`,
        ...mockVersionProps,
        result: 'deleted',
      },
    })),
  } as estypes.BulkResponse);

export const bulkDeleteSuccess = async (
  client: ElasticsearchClientMock,
  repository: SavedObjectsRepository,
  registry: SavedObjectTypeRegistry,
  objects: SavedObjectsBulkDeleteObject[] = [],
  options?: SavedObjectsBulkDeleteOptions,
  internalOptions: {
    mockMGetResponseObjects?: Array<{
      initialNamespaces: string[] | undefined;
      type: string;
      id: string;
    }>;
  } = {}
) => {
  const multiNamespaceObjects = objects.filter(({ type }) => {
    return registry.isMultiNamespace(type);
  });

  const { mockMGetResponseObjects } = internalOptions;
  if (multiNamespaceObjects.length > 0) {
    const mockedMGetResponse = mockMGetResponseObjects
      ? getMockMgetResponse(registry, mockMGetResponseObjects, options?.namespace)
      : getMockMgetResponse(registry, multiNamespaceObjects, options?.namespace);
    client.mget.mockResponseOnce(mockedMGetResponse);
  }
  const mockedEsBulkDeleteResponse = getMockEsBulkDeleteResponse(registry, objects, options);

  client.bulk.mockResponseOnce(mockedEsBulkDeleteResponse);
  const result = await repository.bulkDelete(objects, options);

  expect(client.mget).toHaveBeenCalledTimes(multiNamespaceObjects?.length ? 1 : 0);
  return result;
};

export const createBulkDeleteSuccessStatus = ({ type, id }: { type: string; id: string }) => ({
  type,
  id,
  success: true,
});
