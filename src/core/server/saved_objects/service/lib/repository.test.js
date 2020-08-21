/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SavedObjectsRepository } from './repository';
import * as getSearchDslNS from './search_dsl/search_dsl';
import { SavedObjectsErrorHelpers } from './errors';
import { SavedObjectsSerializer } from '../../serialization';
import { encodeHitVersion } from '../../version';
import { SavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { DocumentMigrator } from '../../migrations/core/document_migrator';
import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';

jest.mock('./search_dsl/search_dsl', () => ({ getSearchDsl: jest.fn() }));

// BEWARE: The SavedObjectClient depends on the implementation details of the SavedObjectsRepository
// so any breaking changes to this repository are considered breaking changes to the SavedObjectsClient.

const createBadRequestError = (...args) =>
  SavedObjectsErrorHelpers.createBadRequestError(...args).output.payload;
const createConflictError = (...args) =>
  SavedObjectsErrorHelpers.createConflictError(...args).output.payload;
const createGenericNotFoundError = (...args) =>
  SavedObjectsErrorHelpers.createGenericNotFoundError(...args).output.payload;
const createUnsupportedTypeError = (...args) =>
  SavedObjectsErrorHelpers.createUnsupportedTypeError(...args).output.payload;

describe('SavedObjectsRepository', () => {
  let client;
  let savedObjectsRepository;
  let migrator;

  let serializer;
  const mockTimestamp = '2017-08-14T15:49:14.886Z';
  const mockTimestampFields = { updated_at: mockTimestamp };
  const mockVersionProps = { _seq_no: 1, _primary_term: 1 };
  const mockVersion = encodeHitVersion(mockVersionProps);

  const CUSTOM_INDEX_TYPE = 'customIndex';
  const NAMESPACE_AGNOSTIC_TYPE = 'globalType';
  const MULTI_NAMESPACE_TYPE = 'shareableType';
  const MULTI_NAMESPACE_CUSTOM_INDEX_TYPE = 'shareableTypeCustomIndex';
  const HIDDEN_TYPE = 'hiddenType';

  const mappings = {
    properties: {
      config: {
        properties: {
          type: 'keyword',
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
          type: 'keyword',
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
    },
  };

  const createType = (type) => ({
    name: type,
    mappings: { properties: mappings.properties[type].properties },
    migrations: { '1.1.1': (doc) => doc },
  });

  const registry = new SavedObjectTypeRegistry();
  registry.registerType(createType('config'));
  registry.registerType(createType('index-pattern'));
  registry.registerType(createType('dashboard'));
  registry.registerType({
    ...createType(CUSTOM_INDEX_TYPE),
    indexPattern: 'custom',
  });
  registry.registerType({
    ...createType(NAMESPACE_AGNOSTIC_TYPE),
    namespaceType: 'agnostic',
  });
  registry.registerType({
    ...createType(MULTI_NAMESPACE_TYPE),
    namespaceType: 'multiple',
  });
  registry.registerType({
    ...createType(MULTI_NAMESPACE_CUSTOM_INDEX_TYPE),
    namespaceType: 'multiple',
    indexPattern: 'custom',
  });
  registry.registerType({
    ...createType(HIDDEN_TYPE),
    hidden: true,
    namespaceType: 'agnostic',
  });

  const documentMigrator = new DocumentMigrator({
    typeRegistry: registry,
    kibanaVersion: '2.0.0',
    log: {},
    validateDoc: jest.fn(),
  });

  const getMockGetResponse = ({ type, id, references, namespace, originId }) => ({
    // NOTE: Elasticsearch returns more fields (_index, _type) but the SavedObjectsRepository method ignores these
    found: true,
    _id: `${registry.isSingleNamespace(type) && namespace ? `${namespace}:` : ''}${type}:${id}`,
    ...mockVersionProps,
    _source: {
      ...(registry.isSingleNamespace(type) && { namespace }),
      ...(registry.isMultiNamespace(type) && { namespaces: [namespace ?? 'default'] }),
      ...(originId && { originId }),
      type,
      [type]: { title: 'Testing' },
      references,
      specialProperty: 'specialValue',
      ...mockTimestampFields,
    },
  });

  const getMockMgetResponse = (objects, namespace) => ({
    docs: objects.map((obj) =>
      obj.found === false ? obj : getMockGetResponse({ ...obj, namespace })
    ),
  });

  expect.extend({
    toBeDocumentWithoutError(received, type, id) {
      if (received.type === type && received.id === id && !received.error) {
        return { message: () => `expected type and id not to match without error`, pass: true };
      } else {
        return { message: () => `expected type and id to match without error`, pass: false };
      }
    },
  });
  const expectSuccess = ({ type, id }) => expect.toBeDocumentWithoutError(type, id);
  const expectError = ({ type, id }) => ({ type, id, error: expect.any(Object) });
  const expectErrorResult = ({ type, id }, error, overrides = {}) => ({
    type,
    id,
    error: { ...error, ...overrides },
  });
  const expectErrorNotFound = (obj, overrides) =>
    expectErrorResult(obj, createGenericNotFoundError(obj.type, obj.id), overrides);
  const expectErrorConflict = (obj, overrides) =>
    expectErrorResult(obj, createConflictError(obj.type, obj.id), overrides);
  const expectErrorInvalidType = (obj, overrides) =>
    expectErrorResult(obj, createUnsupportedTypeError(obj.type, obj.id), overrides);

  const expectMigrationArgs = (args, contains = true, n = 1) => {
    const obj = contains ? expect.objectContaining(args) : expect.not.objectContaining(args);
    expect(migrator.migrateDocument).toHaveBeenNthCalledWith(n, obj);
  };

  beforeEach(() => {
    client = elasticsearchClientMock.createElasticsearchClient();
    migrator = {
      migrateDocument: jest.fn().mockImplementation(documentMigrator.migrate),
      runMigrations: async () => ({ status: 'skipped' }),
    };

    // create a mock serializer "shim" so we can track function calls, but use the real serializer's implementation
    serializer = {
      isRawSavedObject: jest.fn(),
      rawToSavedObject: jest.fn(),
      savedObjectToRaw: jest.fn(),
      generateRawId: jest.fn(),
      trimIdPrefix: jest.fn(),
    };
    const _serializer = new SavedObjectsSerializer(registry);
    Object.keys(serializer).forEach((key) => {
      serializer[key].mockImplementation((...args) => _serializer[key](...args));
    });

    const allTypes = registry.getAllTypes().map((type) => type.name);
    const allowedTypes = [...new Set(allTypes.filter((type) => !registry.isHidden(type)))];

    savedObjectsRepository = new SavedObjectsRepository({
      index: '.kibana-test',
      mappings,
      client,
      migrator,
      typeRegistry: registry,
      serializer,
      allowedTypes,
    });

    savedObjectsRepository._getCurrentTime = jest.fn(() => mockTimestamp);
    getSearchDslNS.getSearchDsl.mockClear();
  });

  const mockMigrationVersion = { foo: '2.3.4' };
  const mockMigrateDocument = (doc) => ({
    ...doc,
    attributes: {
      ...doc.attributes,
      ...(doc.attributes?.title && { title: `${doc.attributes.title}!!` }),
    },
    migrationVersion: mockMigrationVersion,
    references: [{ name: 'search_0', type: 'search', id: '123' }],
  });

  describe('#addToNamespaces', () => {
    const id = 'some-id';
    const type = MULTI_NAMESPACE_TYPE;
    const currentNs1 = 'default';
    const currentNs2 = 'foo-namespace';
    const newNs1 = 'bar-namespace';
    const newNs2 = 'baz-namespace';

    const mockGetResponse = (type, id) => {
      // mock a document that exists in two namespaces
      const mockResponse = getMockGetResponse({ type, id });
      mockResponse._source.namespaces = [currentNs1, currentNs2];
      client.get.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(mockResponse)
      );
    };

    const addToNamespacesSuccess = async (type, id, namespaces, options) => {
      mockGetResponse(type, id);
      client.update.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          _id: `${type}:${id}`,
          ...mockVersionProps,
          result: 'updated',
        })
      );
      const result = await savedObjectsRepository.addToNamespaces(type, id, namespaces, options);
      expect(client.get).toHaveBeenCalledTimes(1);
      expect(client.update).toHaveBeenCalledTimes(1);
      return result;
    };

    describe('client calls', () => {
      it(`should use ES get action then update action`, async () => {
        await addToNamespacesSuccess(type, id, [newNs1, newNs2]);
      });

      it(`defaults to the version of the existing document`, async () => {
        await addToNamespacesSuccess(type, id, [newNs1, newNs2]);
        const versionProperties = {
          if_seq_no: mockVersionProps._seq_no,
          if_primary_term: mockVersionProps._primary_term,
        };
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining(versionProperties),
          expect.anything()
        );
      });

      it(`accepts version`, async () => {
        await addToNamespacesSuccess(type, id, [newNs1, newNs2], {
          version: encodeHitVersion({ _seq_no: 100, _primary_term: 200 }),
        });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({ if_seq_no: 100, if_primary_term: 200 }),
          expect.anything()
        );
      });

      it(`defaults to a refresh setting of wait_for`, async () => {
        await addToNamespacesSuccess(type, id, [newNs1, newNs2]);
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({ refresh: 'wait_for' }),
          expect.anything()
        );
      });
    });

    describe('errors', () => {
      const expectNotFoundError = async (type, id, namespaces, options) => {
        await expect(
          savedObjectsRepository.addToNamespaces(type, id, namespaces, options)
        ).rejects.toThrowError(createGenericNotFoundError(type, id));
      };
      const expectBadRequestError = async (type, id, namespaces, message) => {
        await expect(
          savedObjectsRepository.addToNamespaces(type, id, namespaces)
        ).rejects.toThrowError(createBadRequestError(message));
      };

      it(`throws when type is invalid`, async () => {
        await expectNotFoundError('unknownType', id, [newNs1, newNs2]);
        expect(client.update).not.toHaveBeenCalled();
      });

      it(`throws when type is hidden`, async () => {
        await expectNotFoundError(HIDDEN_TYPE, id, [newNs1, newNs2]);
        expect(client.update).not.toHaveBeenCalled();
      });

      it(`throws when type is not multi-namespace`, async () => {
        const test = async (type) => {
          const message = `${type} doesn't support multiple namespaces`;
          await expectBadRequestError(type, id, [newNs1, newNs2], message);
          expect(client.update).not.toHaveBeenCalled();
        };
        await test('index-pattern');
        await test(NAMESPACE_AGNOSTIC_TYPE);
      });

      it(`throws when namespaces is an empty array`, async () => {
        const test = async (namespaces) => {
          const message = 'namespaces must be a non-empty array of strings';
          await expectBadRequestError(type, id, namespaces, message);
          expect(client.update).not.toHaveBeenCalled();
        };
        await test([]);
      });

      it(`throws when ES is unable to find the document during get`, async () => {
        client.get.mockResolvedValue(
          elasticsearchClientMock.createSuccessTransportRequestPromise({ found: false })
        );
        await expectNotFoundError(type, id, [newNs1, newNs2]);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the index during get`, async () => {
        client.get.mockResolvedValue(
          elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
        );
        await expectNotFoundError(type, id, [newNs1, newNs2]);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when the document exists, but not in this namespace`, async () => {
        mockGetResponse(type, id);
        await expectNotFoundError(type, id, [newNs1, newNs2], {
          namespace: 'some-other-namespace',
        });
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the document during update`, async () => {
        mockGetResponse(type, id);
        client.update.mockResolvedValue(
          elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
        );
        await expectNotFoundError(type, id, [newNs1, newNs2]);
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(client.update).toHaveBeenCalledTimes(1);
      });
    });

    describe('returns', () => {
      it(`returns all existing and new namespaces on success`, async () => {
        const result = await addToNamespacesSuccess(type, id, [newNs1, newNs2]);
        expect(result).toEqual({ namespaces: [currentNs1, currentNs2, newNs1, newNs2] });
      });

      it(`succeeds when adding existing namespaces`, async () => {
        const result = await addToNamespacesSuccess(type, id, [currentNs1]);
        expect(result).toEqual({ namespaces: [currentNs1, currentNs2] });
      });
    });
  });

  describe('#bulkCreate', () => {
    const obj1 = {
      type: 'config',
      id: '6.0.0-alpha1',
      attributes: { title: 'Test One' },
      references: [{ name: 'ref_0', type: 'test', id: '1' }],
      originId: 'some-origin-id', // only one of the object args has an originId, this is intentional to test both a positive and negative case
    };
    const obj2 = {
      type: 'index-pattern',
      id: 'logstash-*',
      attributes: { title: 'Test Two' },
      references: [{ name: 'ref_0', type: 'test', id: '2' }],
    };
    const namespace = 'foo-namespace';

    const getMockBulkCreateResponse = (objects, namespace) => {
      return {
        items: objects.map(({ type, id, originId, attributes, references, migrationVersion }) => ({
          create: {
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
      };
    };

    const bulkCreateSuccess = async (objects, options) => {
      const multiNamespaceObjects = objects.filter(
        ({ type, id }) => registry.isMultiNamespace(type) && id
      );
      if (multiNamespaceObjects?.length) {
        const response = getMockMgetResponse(multiNamespaceObjects, options?.namespace);
        client.mget.mockResolvedValue(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
      }
      const response = getMockBulkCreateResponse(objects, options?.namespace);
      client.bulk.mockResolvedValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise(response)
      );
      const result = await savedObjectsRepository.bulkCreate(objects, options);
      expect(client.mget).toHaveBeenCalledTimes(multiNamespaceObjects?.length ? 1 : 0);
      return result;
    };

    // bulk create calls have two objects for each source -- the action, and the source
    const expectClientCallArgsAction = (
      objects,
      { method, _index = expect.any(String), getId = () => expect.any(String) }
    ) => {
      const body = [];
      for (const { type, id, if_primary_term: ifPrimaryTerm, if_seq_no: ifSeqNo } of objects) {
        body.push({
          [method]: {
            _index,
            _id: getId(type, id),
            ...(ifPrimaryTerm && ifSeqNo
              ? { if_primary_term: expect.any(Number), if_seq_no: expect.any(Number) }
              : {}),
          },
        });
        body.push(expect.any(Object));
      }
      expect(client.bulk).toHaveBeenCalledWith(
        expect.objectContaining({ body }),
        expect.anything()
      );
    };

    const expectObjArgs = ({ type, attributes, references }, overrides) => [
      expect.any(Object),
      expect.objectContaining({
        [type]: attributes,
        references,
        type,
        ...overrides,
        ...mockTimestampFields,
      }),
    ];

    const expectSuccessResult = (obj) => ({
      ...obj,
      migrationVersion: { [obj.type]: '1.1.1' },
      version: mockVersion,
      namespaces: obj.namespaces ?? [obj.namespace ?? 'default'],
      ...mockTimestampFields,
    });

    describe('client calls', () => {
      it(`should use the ES bulk action by default`, async () => {
        await bulkCreateSuccess([obj1, obj2]);
        expect(client.bulk).toHaveBeenCalledTimes(1);
      });

      it(`should use the ES mget action before bulk action for any types that are multi-namespace, when id is defined`, async () => {
        const objects = [obj1, { ...obj2, type: MULTI_NAMESPACE_TYPE }];
        await bulkCreateSuccess(objects);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expect(client.mget).toHaveBeenCalledTimes(1);
        const docs = [expect.objectContaining({ _id: `${MULTI_NAMESPACE_TYPE}:${obj2.id}` })];
        expect(client.mget.mock.calls[0][0].body).toEqual({ docs });
      });

      it(`should use the ES create method if ID is undefined and overwrite=true`, async () => {
        const objects = [obj1, obj2].map((obj) => ({ ...obj, id: undefined }));
        await bulkCreateSuccess(objects, { overwrite: true });
        expectClientCallArgsAction(objects, { method: 'create' });
      });

      it(`should use the ES create method if ID is undefined and overwrite=false`, async () => {
        const objects = [obj1, obj2].map((obj) => ({ ...obj, id: undefined }));
        await bulkCreateSuccess(objects);
        expectClientCallArgsAction(objects, { method: 'create' });
      });

      it(`should use the ES index method if ID is defined and overwrite=true`, async () => {
        await bulkCreateSuccess([obj1, obj2], { overwrite: true });
        expectClientCallArgsAction([obj1, obj2], { method: 'index' });
      });

      it(`should use the ES index method with version if ID and version are defined and overwrite=true`, async () => {
        await bulkCreateSuccess(
          [
            {
              ...obj1,
              version: mockVersion,
            },
            obj2,
          ],
          { overwrite: true }
        );

        const obj1WithSeq = {
          ...obj1,
          if_seq_no: mockVersionProps._seq_no,
          if_primary_term: mockVersionProps._primary_term,
        };

        expectClientCallArgsAction([obj1WithSeq, obj2], { method: 'index' });
      });

      it(`should use the ES create method if ID is defined and overwrite=false`, async () => {
        await bulkCreateSuccess([obj1, obj2]);
        expectClientCallArgsAction([obj1, obj2], { method: 'create' });
      });

      it(`formats the ES request`, async () => {
        await bulkCreateSuccess([obj1, obj2]);
        const body = [...expectObjArgs(obj1), ...expectObjArgs(obj2)];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body }),
          expect.anything()
        );
      });

      it(`adds namespace to request body for any types that are single-namespace`, async () => {
        await bulkCreateSuccess([obj1, obj2], { namespace });
        const expected = expect.objectContaining({ namespace });
        const body = [expect.any(Object), expected, expect.any(Object), expected];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body }),
          expect.anything()
        );
      });

      it(`doesn't add namespace to request body for any types that are not single-namespace`, async () => {
        const objects = [
          { ...obj1, type: NAMESPACE_AGNOSTIC_TYPE },
          { ...obj2, type: MULTI_NAMESPACE_TYPE },
        ];
        await bulkCreateSuccess(objects, { namespace });
        const expected = expect.not.objectContaining({ namespace: expect.anything() });
        const body = [expect.any(Object), expected, expect.any(Object), expected];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body }),
          expect.anything()
        );
      });

      it(`adds namespaces to request body for any types that are multi-namespace`, async () => {
        const test = async (namespace) => {
          const objects = [obj1, obj2].map((x) => ({ ...x, type: MULTI_NAMESPACE_TYPE }));
          const namespaces = [namespace ?? 'default'];
          await bulkCreateSuccess(objects, { namespace, overwrite: true });
          const expected = expect.objectContaining({ namespaces });
          const body = [expect.any(Object), expected, expect.any(Object), expected];
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({ body }),
            expect.anything()
          );
          client.bulk.mockClear();
          client.mget.mockClear();
        };
        await test(undefined);
        await test(namespace);
      });

      it(`doesn't add namespaces to request body for any types that are not multi-namespace`, async () => {
        const test = async (namespace) => {
          const objects = [obj1, { ...obj2, type: NAMESPACE_AGNOSTIC_TYPE }];
          await bulkCreateSuccess(objects, { namespace, overwrite: true });
          const expected = expect.not.objectContaining({ namespaces: expect.anything() });
          const body = [expect.any(Object), expected, expect.any(Object), expected];
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({ body }),
            expect.anything()
          );
          client.bulk.mockClear();
        };
        await test(undefined);
        await test(namespace);
      });

      it(`defaults to a refresh setting of wait_for`, async () => {
        await bulkCreateSuccess([obj1, obj2]);
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ refresh: 'wait_for' }),
          expect.anything()
        );
      });

      it(`should use default index`, async () => {
        await bulkCreateSuccess([obj1, obj2]);
        expectClientCallArgsAction([obj1, obj2], { method: 'create', _index: '.kibana-test' });
      });

      it(`should use custom index`, async () => {
        await bulkCreateSuccess([obj1, obj2].map((x) => ({ ...x, type: CUSTOM_INDEX_TYPE })));
        expectClientCallArgsAction([obj1, obj2], { method: 'create', _index: 'custom' });
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        const getId = (type, id) => `${namespace}:${type}:${id}`;
        await bulkCreateSuccess([obj1, obj2], { namespace });
        expectClientCallArgsAction([obj1, obj2], { method: 'create', getId });
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        const getId = (type, id) => `${type}:${id}`;
        await bulkCreateSuccess([obj1, obj2]);
        expectClientCallArgsAction([obj1, obj2], { method: 'create', getId });
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        const getId = (type, id) => `${type}:${id}`;
        const objects = [
          { ...obj1, type: NAMESPACE_AGNOSTIC_TYPE },
          { ...obj2, type: MULTI_NAMESPACE_TYPE },
        ];
        await bulkCreateSuccess(objects, { namespace });
        expectClientCallArgsAction(objects, { method: 'create', getId });
      });
    });

    describe('errors', () => {
      const obj3 = {
        type: 'dashboard',
        id: 'three',
        attributes: { title: 'Test Three' },
        references: [{ name: 'ref_0', type: 'test', id: '2' }],
      };

      const bulkCreateError = async (obj, esError, expectedError) => {
        let response;
        if (esError) {
          response = getMockBulkCreateResponse([obj1, obj, obj2]);
          response.items[1].create = { error: esError };
        } else {
          response = getMockBulkCreateResponse([obj1, obj2]);
        }
        client.bulk.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );

        const objects = [obj1, obj, obj2];
        const result = await savedObjectsRepository.bulkCreate(objects);
        expect(client.bulk).toHaveBeenCalled();
        const objCall = esError ? expectObjArgs(obj) : [];
        const body = [...expectObjArgs(obj1), ...objCall, ...expectObjArgs(obj2)];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body }),
          expect.anything()
        );
        expect(result).toEqual({
          saved_objects: [expectSuccess(obj1), expectedError, expectSuccess(obj2)],
        });
      };

      it(`returns error when type is invalid`, async () => {
        const obj = { ...obj3, type: 'unknownType' };
        await bulkCreateError(obj, undefined, expectErrorInvalidType(obj));
      });

      it(`returns error when type is hidden`, async () => {
        const obj = { ...obj3, type: HIDDEN_TYPE };
        await bulkCreateError(obj, undefined, expectErrorInvalidType(obj));
      });

      it(`returns error when there is a conflict with an existing multi-namespace saved object (get)`, async () => {
        const obj = { ...obj3, type: MULTI_NAMESPACE_TYPE };
        const response1 = {
          status: 200,
          docs: [
            {
              found: true,
              _source: {
                type: obj.type,
                namespaces: ['bar-namespace'],
              },
            },
          ],
        };
        client.mget.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response1)
        );
        const response2 = getMockBulkCreateResponse([obj1, obj2]);
        client.bulk.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response2)
        );

        const options = { overwrite: true };
        const result = await savedObjectsRepository.bulkCreate([obj1, obj, obj2], options);
        expect(client.bulk).toHaveBeenCalled();
        expect(client.mget).toHaveBeenCalled();

        const body1 = { docs: [expect.objectContaining({ _id: `${obj.type}:${obj.id}` })] };
        expect(client.mget).toHaveBeenCalledWith(
          expect.objectContaining({ body: body1 }),
          expect.anything()
        );
        const body2 = [...expectObjArgs(obj1), ...expectObjArgs(obj2)];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body: body2 }),
          expect.anything()
        );
        const expectedError = expectErrorConflict(obj, { metadata: { isNotOverwritable: true } });
        expect(result).toEqual({
          saved_objects: [expectSuccess(obj1), expectedError, expectSuccess(obj2)],
        });
      });

      it(`returns error when there is a version conflict (bulk)`, async () => {
        const esError = { type: 'version_conflict_engine_exception' };
        await bulkCreateError(obj3, esError, expectErrorConflict(obj3));
      });

      it(`returns error when document is missing`, async () => {
        const esError = { type: 'document_missing_exception' };
        await bulkCreateError(obj3, esError, expectErrorNotFound(obj3));
      });

      it(`returns error reason for other errors`, async () => {
        const esError = { reason: 'some_other_error' };
        await bulkCreateError(obj3, esError, expectErrorResult(obj3, { message: esError.reason }));
      });

      it(`returns error string for other errors if no reason is defined`, async () => {
        const esError = { foo: 'some_other_error' };
        const expectedError = expectErrorResult(obj3, { message: JSON.stringify(esError) });
        await bulkCreateError(obj3, esError, expectedError);
      });
    });

    describe('migration', () => {
      it(`migrates the docs and serializes the migrated docs`, async () => {
        migrator.migrateDocument.mockImplementation(mockMigrateDocument);
        await bulkCreateSuccess([obj1, obj2]);
        const docs = [obj1, obj2].map((x) => ({ ...x, ...mockTimestampFields }));
        expectMigrationArgs(docs[0], true, 1);
        expectMigrationArgs(docs[1], true, 2);

        const migratedDocs = docs.map((x) => migrator.migrateDocument(x));
        expect(serializer.savedObjectToRaw).toHaveBeenNthCalledWith(1, migratedDocs[0]);
        expect(serializer.savedObjectToRaw).toHaveBeenNthCalledWith(2, migratedDocs[1]);
      });

      it(`adds namespace to body when providing namespace for single-namespace type`, async () => {
        await bulkCreateSuccess([obj1, obj2], { namespace });
        expectMigrationArgs({ namespace }, true, 1);
        expectMigrationArgs({ namespace }, true, 2);
      });

      it(`doesn't add namespace to body when providing no namespace for single-namespace type`, async () => {
        await bulkCreateSuccess([obj1, obj2]);
        expectMigrationArgs({ namespace: expect.anything() }, false, 1);
        expectMigrationArgs({ namespace: expect.anything() }, false, 2);
      });

      it(`doesn't add namespace to body when not using single-namespace type`, async () => {
        const objects = [
          { ...obj1, type: NAMESPACE_AGNOSTIC_TYPE },
          { ...obj2, type: MULTI_NAMESPACE_TYPE },
        ];
        await bulkCreateSuccess(objects, { namespace });
        expectMigrationArgs({ namespace: expect.anything() }, false, 1);
        expectMigrationArgs({ namespace: expect.anything() }, false, 2);
      });

      it(`adds namespaces to body when providing namespace for multi-namespace type`, async () => {
        const objects = [obj1, obj2].map((obj) => ({ ...obj, type: MULTI_NAMESPACE_TYPE }));
        await bulkCreateSuccess(objects, { namespace });
        expectMigrationArgs({ namespaces: [namespace] }, true, 1);
        expectMigrationArgs({ namespaces: [namespace] }, true, 2);
      });

      it(`adds default namespaces to body when providing no namespace for multi-namespace type`, async () => {
        const objects = [obj1, obj2].map((obj) => ({ ...obj, type: MULTI_NAMESPACE_TYPE }));
        await bulkCreateSuccess(objects);
        expectMigrationArgs({ namespaces: ['default'] }, true, 1);
        expectMigrationArgs({ namespaces: ['default'] }, true, 2);
      });

      it(`doesn't add namespaces to body when not using multi-namespace type`, async () => {
        const objects = [obj1, { ...obj2, type: NAMESPACE_AGNOSTIC_TYPE }];
        await bulkCreateSuccess(objects);
        expectMigrationArgs({ namespaces: expect.anything() }, false, 1);
        expectMigrationArgs({ namespaces: expect.anything() }, false, 2);
      });
    });

    describe('returns', () => {
      it(`formats the ES response`, async () => {
        const result = await bulkCreateSuccess([obj1, obj2]);
        expect(result).toEqual({
          saved_objects: [obj1, obj2].map((x) => expectSuccessResult(x)),
        });
      });

      it.todo(`should return objects in the same order regardless of type`);

      it(`handles a mix of successful creates and errors`, async () => {
        const obj = {
          type: 'unknownType',
          id: 'three',
        };
        const objects = [obj1, obj, obj2];
        const response = getMockBulkCreateResponse([obj1, obj2]);
        client.bulk.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        const result = await savedObjectsRepository.bulkCreate(objects);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
          saved_objects: [expectSuccessResult(obj1), expectError(obj), expectSuccessResult(obj2)],
        });
      });

      it(`a deserialized saved object`, async () => {
        // Test for fix to https://github.com/elastic/kibana/issues/65088 where
        // we returned raw ID's when an object without an id was created.
        const namespace = 'myspace';
        const response = getMockBulkCreateResponse([obj1, obj2], namespace);
        client.bulk.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );

        // Bulk create one object with id unspecified, and one with id specified
        const result = await savedObjectsRepository.bulkCreate([{ ...obj1, id: undefined }, obj2], {
          namespace,
        });

        // Assert that both raw docs from the ES response are deserialized
        expect(serializer.rawToSavedObject).toHaveBeenNthCalledWith(1, {
          ...response.items[0].create,
          _source: {
            ...response.items[0].create._source,
            namespaces: response.items[0].create._source.namespaces,
          },
          _id: expect.stringMatching(/^myspace:config:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/),
        });
        expect(serializer.rawToSavedObject).toHaveBeenNthCalledWith(2, {
          ...response.items[1].create,
          _source: {
            ...response.items[1].create._source,
            namespaces: response.items[1].create._source.namespaces,
          },
        });

        // Assert that ID's are deserialized to remove the type and namespace
        expect(result.saved_objects[0].id).toEqual(
          expect.stringMatching(/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/)
        );
        expect(result.saved_objects[1].id).toEqual(obj2.id);
      });
    });
  });

  describe('#bulkGet', () => {
    const obj1 = {
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
    const obj2 = {
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
    };
    const namespace = 'foo-namespace';

    const bulkGet = async (objects, options) =>
      savedObjectsRepository.bulkGet(
        objects.map(({ type, id }) => ({ type, id })), // bulkGet only uses type and id
        options
      );
    const bulkGetSuccess = async (objects, options) => {
      const response = getMockMgetResponse(objects, options?.namespace);
      client.mget.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(response)
      );
      const result = await bulkGet(objects, options);
      expect(client.mget).toHaveBeenCalledTimes(1);
      return result;
    };

    const _expectClientCallArgs = (
      objects,
      { _index = expect.any(String), getId = () => expect.any(String) }
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

    describe('client calls', () => {
      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        const getId = (type, id) => `${namespace}:${type}:${id}`;
        await bulkGetSuccess([obj1, obj2], { namespace });
        _expectClientCallArgs([obj1, obj2], { getId });
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        const getId = (type, id) => `${type}:${id}`;
        await bulkGetSuccess([obj1, obj2]);
        _expectClientCallArgs([obj1, obj2], { getId });
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        const getId = (type, id) => `${type}:${id}`;
        let objects = [obj1, obj2].map((obj) => ({ ...obj, type: NAMESPACE_AGNOSTIC_TYPE }));
        await bulkGetSuccess(objects, { namespace });
        _expectClientCallArgs(objects, { getId });

        client.mget.mockClear();
        objects = [obj1, obj2].map((obj) => ({ ...obj, type: MULTI_NAMESPACE_TYPE }));
        await bulkGetSuccess(objects, { namespace });
        _expectClientCallArgs(objects, { getId });
      });
    });

    describe('errors', () => {
      const bulkGetErrorInvalidType = async ([obj1, obj, obj2]) => {
        const response = getMockMgetResponse([obj1, obj2]);
        client.mget.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        const result = await bulkGet([obj1, obj, obj2]);
        expect(client.mget).toHaveBeenCalled();
        expect(result).toEqual({
          saved_objects: [expectSuccess(obj1), expectErrorInvalidType(obj), expectSuccess(obj2)],
        });
      };

      const bulkGetErrorNotFound = async ([obj1, obj, obj2], options, response) => {
        client.mget.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        const result = await bulkGet([obj1, obj, obj2], options);
        expect(client.mget).toHaveBeenCalled();
        expect(result).toEqual({
          saved_objects: [expectSuccess(obj1), expectErrorNotFound(obj), expectSuccess(obj2)],
        });
      };

      it(`returns error when type is invalid`, async () => {
        const obj = { type: 'unknownType', id: 'three' };
        await bulkGetErrorInvalidType([obj1, obj, obj2]);
      });

      it(`returns error when type is hidden`, async () => {
        const obj = { type: HIDDEN_TYPE, id: 'three' };
        await bulkGetErrorInvalidType([obj1, obj, obj2]);
      });

      it(`returns error when document is not found`, async () => {
        const obj = { type: 'dashboard', id: 'three', found: false };
        const response = getMockMgetResponse([obj1, obj, obj2]);
        await bulkGetErrorNotFound([obj1, obj, obj2], undefined, response);
      });

      it(`handles missing ids gracefully`, async () => {
        const obj = { type: 'dashboard', id: undefined, found: false };
        const response = getMockMgetResponse([obj1, obj, obj2]);
        await bulkGetErrorNotFound([obj1, obj, obj2], undefined, response);
      });

      it(`returns error when type is multi-namespace and the document exists, but not in this namespace`, async () => {
        const obj = { type: MULTI_NAMESPACE_TYPE, id: 'three' };
        const response = getMockMgetResponse([obj1, obj, obj2]);
        response.docs[1].namespaces = ['bar-namespace'];
        await bulkGetErrorNotFound([obj1, obj, obj2], { namespace }, response);
      });
    });

    describe('returns', () => {
      const expectSuccessResult = ({ type, id }, doc) => ({
        type,
        id,
        namespaces: doc._source.namespaces ?? ['default'],
        ...(doc._source.originId && { originId: doc._source.originId }),
        ...(doc._source.updated_at && { updated_at: doc._source.updated_at }),
        version: encodeHitVersion(doc),
        attributes: doc._source[type],
        references: doc._source.references || [],
        migrationVersion: doc._source.migrationVersion,
      });

      it(`returns early for empty objects argument`, async () => {
        const result = await bulkGet([]);
        expect(result).toEqual({ saved_objects: [] });
        expect(client.mget).not.toHaveBeenCalled();
      });

      it(`formats the ES response`, async () => {
        const response = getMockMgetResponse([obj1, obj2]);
        client.mget.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        const result = await bulkGet([obj1, obj2]);
        expect(client.mget).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
          saved_objects: [
            expectSuccessResult(obj1, response.docs[0]),
            expectSuccessResult(obj2, response.docs[1]),
          ],
        });
      });

      it(`handles a mix of successful gets and errors`, async () => {
        const response = getMockMgetResponse([obj1, obj2]);
        client.mget.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        const obj = { type: 'unknownType', id: 'three' };
        const result = await bulkGet([obj1, obj, obj2]);
        expect(client.mget).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
          saved_objects: [
            expectSuccessResult(obj1, response.docs[0]),
            expectError(obj),
            expectSuccessResult(obj2, response.docs[1]),
          ],
        });
      });

      it(`includes namespaces property for single-namespace and multi-namespace documents`, async () => {
        const obj = { type: MULTI_NAMESPACE_TYPE, id: 'three' };
        const result = await bulkGetSuccess([obj1, obj]);
        expect(result).toEqual({
          saved_objects: [
            expect.objectContaining({ namespaces: ['default'] }),
            expect.objectContaining({ namespaces: expect.any(Array) }),
          ],
        });
      });
    });
  });

  describe('#bulkUpdate', () => {
    const obj1 = {
      type: 'config',
      id: '6.0.0-alpha1',
      attributes: { title: 'Test One' },
    };
    const obj2 = {
      type: 'index-pattern',
      id: 'logstash-*',
      attributes: { title: 'Test Two' },
    };
    const references = [{ name: 'ref_0', type: 'test', id: '1' }];
    const originId = 'some-origin-id';
    const namespace = 'foo-namespace';

    const getMockBulkUpdateResponse = (objects, options, includeOriginId) => ({
      items: objects.map(({ type, id }) => ({
        update: {
          _id: `${
            registry.isSingleNamespace(type) && options?.namespace ? `${options?.namespace}:` : ''
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
    });

    const bulkUpdateSuccess = async (objects, options, includeOriginId) => {
      const multiNamespaceObjects = objects.filter(({ type }) => registry.isMultiNamespace(type));
      if (multiNamespaceObjects?.length) {
        const response = getMockMgetResponse(multiNamespaceObjects, options?.namespace);
        client.mget.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
      }
      const response = getMockBulkUpdateResponse(objects, options?.namespace, includeOriginId);
      client.bulk.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(response)
      );
      const result = await savedObjectsRepository.bulkUpdate(objects, options);
      expect(client.mget).toHaveBeenCalledTimes(multiNamespaceObjects?.length ? 1 : 0);
      return result;
    };

    // bulk create calls have two objects for each source -- the action, and the source
    const expectClientCallArgsAction = (
      objects,
      { method, _index = expect.any(String), getId = () => expect.any(String), overrides }
    ) => {
      const body = [];
      for (const { type, id } of objects) {
        body.push({
          [method]: {
            _index,
            _id: getId(type, id),
            ...overrides,
          },
        });
        body.push(expect.any(Object));
      }
      expect(client.bulk).toHaveBeenCalledWith(
        expect.objectContaining({ body }),
        expect.anything()
      );
    };

    const expectObjArgs = ({ type, attributes }) => [
      expect.any(Object),
      {
        doc: expect.objectContaining({
          [type]: attributes,
          ...mockTimestampFields,
        }),
      },
    ];

    describe('client calls', () => {
      it(`should use the ES bulk action by default`, async () => {
        await bulkUpdateSuccess([obj1, obj2]);
        expect(client.bulk).toHaveBeenCalled();
      });

      it(`should use the ES mget action before bulk action for any types that are multi-namespace`, async () => {
        const objects = [obj1, { ...obj2, type: MULTI_NAMESPACE_TYPE }];
        await bulkUpdateSuccess(objects);
        expect(client.bulk).toHaveBeenCalled();
        expect(client.mget).toHaveBeenCalled();

        const docs = [expect.objectContaining({ _id: `${MULTI_NAMESPACE_TYPE}:${obj2.id}` })];
        expect(client.mget).toHaveBeenCalledWith(
          expect.objectContaining({ body: { docs } }),
          expect.anything()
        );
      });

      it(`formats the ES request`, async () => {
        await bulkUpdateSuccess([obj1, obj2]);
        const body = [...expectObjArgs(obj1), ...expectObjArgs(obj2)];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body }),
          expect.anything()
        );
      });

      it(`formats the ES request for any types that are multi-namespace`, async () => {
        const _obj2 = { ...obj2, type: MULTI_NAMESPACE_TYPE };
        await bulkUpdateSuccess([obj1, _obj2]);
        const body = [...expectObjArgs(obj1), ...expectObjArgs(_obj2)];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body }),
          expect.anything()
        );
      });

      it(`doesnt call Elasticsearch if there are no valid objects to update`, async () => {
        const objects = [obj1, obj2].map((x) => ({ ...x, type: 'unknownType' }));
        await savedObjectsRepository.bulkUpdate(objects);
        expect(client.bulk).toHaveBeenCalledTimes(0);
      });

      it(`defaults to no references`, async () => {
        await bulkUpdateSuccess([obj1, obj2]);
        const expected = { doc: expect.not.objectContaining({ references: expect.anything() }) };
        const body = [expect.any(Object), expected, expect.any(Object), expected];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body }),
          expect.anything()
        );
      });

      it(`accepts custom references array`, async () => {
        const test = async (references) => {
          const objects = [obj1, obj2].map((obj) => ({ ...obj, references }));
          await bulkUpdateSuccess(objects);
          const expected = { doc: expect.objectContaining({ references }) };
          const body = [expect.any(Object), expected, expect.any(Object), expected];
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({ body }),
            expect.anything()
          );
          client.bulk.mockClear();
        };
        await test(references);
        await test(['string']);
        await test([]);
      });

      it(`doesn't accept custom references if not an array`, async () => {
        const test = async (references) => {
          const objects = [obj1, obj2].map((obj) => ({ ...obj, references }));
          await bulkUpdateSuccess(objects);
          const expected = { doc: expect.not.objectContaining({ references: expect.anything() }) };
          const body = [expect.any(Object), expected, expect.any(Object), expected];
          expect(client.bulk).toHaveBeenCalledWith(
            expect.objectContaining({ body }),
            expect.anything()
          );
          client.bulk.mockClear();
        };
        await test('string');
        await test(123);
        await test(true);
        await test(null);
      });

      it(`defaults to a refresh setting of wait_for`, async () => {
        await bulkUpdateSuccess([obj1, obj2]);
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ refresh: 'wait_for' }),
          expect.anything()
        );
      });

      it(`defaults to the version of the existing document for multi-namespace types`, async () => {
        // only multi-namespace documents are obtained using a pre-flight mget request
        const objects = [
          { ...obj1, type: MULTI_NAMESPACE_TYPE },
          { ...obj2, type: MULTI_NAMESPACE_TYPE },
        ];
        await bulkUpdateSuccess(objects);
        const overrides = {
          if_seq_no: mockVersionProps._seq_no,
          if_primary_term: mockVersionProps._primary_term,
        };
        expectClientCallArgsAction(objects, { method: 'update', overrides });
      });

      it(`defaults to no version for types that are not multi-namespace`, async () => {
        const objects = [obj1, { ...obj2, type: NAMESPACE_AGNOSTIC_TYPE }];
        await bulkUpdateSuccess(objects);
        expectClientCallArgsAction(objects, { method: 'update' });
      });

      it(`accepts version`, async () => {
        const version = encodeHitVersion({ _seq_no: 100, _primary_term: 200 });
        // test with both non-multi-namespace and multi-namespace types
        const objects = [
          { ...obj1, version },
          { ...obj2, type: MULTI_NAMESPACE_TYPE, version },
        ];
        await bulkUpdateSuccess(objects);
        const overrides = { if_seq_no: 100, if_primary_term: 200 };
        expectClientCallArgsAction(objects, { method: 'update', overrides }, 2);
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        const getId = (type, id) => `${namespace}:${type}:${id}`;
        await bulkUpdateSuccess([obj1, obj2], { namespace });
        expectClientCallArgsAction([obj1, obj2], { method: 'update', getId });
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        const getId = (type, id) => `${type}:${id}`;
        await bulkUpdateSuccess([obj1, obj2]);
        expectClientCallArgsAction([obj1, obj2], { method: 'update', getId });
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        const getId = (type, id) => `${type}:${id}`;
        const objects1 = [{ ...obj1, type: NAMESPACE_AGNOSTIC_TYPE }];
        await bulkUpdateSuccess(objects1, { namespace });
        expectClientCallArgsAction(objects1, { method: 'update', getId });
        client.bulk.mockClear();
        const overrides = {
          // bulkUpdate uses a preflight `get` request for multi-namespace saved objects, and specifies that version on `update`
          // we aren't testing for this here, but we need to include Jest assertions so this test doesn't fail
          if_primary_term: expect.any(Number),
          if_seq_no: expect.any(Number),
        };
        const objects2 = [{ ...obj2, type: MULTI_NAMESPACE_TYPE }];
        await bulkUpdateSuccess(objects2, { namespace });
        expectClientCallArgsAction(objects2, { method: 'update', getId, overrides }, 2);
      });
    });

    describe('errors', () => {
      const obj = {
        type: 'dashboard',
        id: 'three',
      };

      const bulkUpdateError = async (obj, esError, expectedError) => {
        const objects = [obj1, obj, obj2];
        const mockResponse = getMockBulkUpdateResponse(objects);
        if (esError) {
          mockResponse.items[1].update = { error: esError };
        }
        client.bulk.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(mockResponse)
        );

        const result = await savedObjectsRepository.bulkUpdate(objects);
        expect(client.bulk).toHaveBeenCalled();
        const objCall = esError ? expectObjArgs(obj) : [];
        const body = [...expectObjArgs(obj1), ...objCall, ...expectObjArgs(obj2)];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body }),
          expect.anything()
        );
        expect(result).toEqual({
          saved_objects: [expectSuccess(obj1), expectedError, expectSuccess(obj2)],
        });
      };

      const bulkUpdateMultiError = async ([obj1, _obj, obj2], options, mgetResponse) => {
        client.mget.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(mgetResponse, {
            statusCode: mgetResponse.statusCode,
          })
        );

        const bulkResponse = getMockBulkUpdateResponse([obj1, obj2], namespace);
        client.bulk.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(bulkResponse)
        );

        const result = await savedObjectsRepository.bulkUpdate([obj1, _obj, obj2], options);
        expect(client.bulk).toHaveBeenCalled();
        expect(client.mget).toHaveBeenCalled();
        const body = [...expectObjArgs(obj1), ...expectObjArgs(obj2)];
        expect(client.bulk).toHaveBeenCalledWith(
          expect.objectContaining({ body }),
          expect.anything()
        );

        expect(result).toEqual({
          saved_objects: [expectSuccess(obj1), expectErrorNotFound(_obj), expectSuccess(obj2)],
        });
      };

      it(`returns error when type is invalid`, async () => {
        const _obj = { ...obj, type: 'unknownType' };
        await bulkUpdateError(_obj, undefined, expectErrorNotFound(_obj));
      });

      it(`returns error when type is hidden`, async () => {
        const _obj = { ...obj, type: HIDDEN_TYPE };
        await bulkUpdateError(_obj, undefined, expectErrorNotFound(_obj));
      });

      it(`returns error when ES is unable to find the document (mget)`, async () => {
        const _obj = { ...obj, type: MULTI_NAMESPACE_TYPE, found: false };
        const mgetResponse = getMockMgetResponse([_obj]);
        await bulkUpdateMultiError([obj1, _obj, obj2], undefined, mgetResponse);
      });

      it(`returns error when ES is unable to find the index (mget)`, async () => {
        const _obj = { ...obj, type: MULTI_NAMESPACE_TYPE };
        const mgetResponse = { statusCode: 404 };
        await bulkUpdateMultiError([obj1, _obj, obj2], { namespace }, mgetResponse);
      });

      it(`returns error when there is a conflict with an existing multi-namespace saved object (mget)`, async () => {
        const _obj = { ...obj, type: MULTI_NAMESPACE_TYPE };
        const mgetResponse = getMockMgetResponse([_obj], 'bar-namespace');
        await bulkUpdateMultiError([obj1, _obj, obj2], { namespace }, mgetResponse);
      });

      it(`returns error when there is a version conflict (bulk)`, async () => {
        const esError = { type: 'version_conflict_engine_exception' };
        await bulkUpdateError(obj, esError, expectErrorConflict(obj));
      });

      it(`returns error when document is missing (bulk)`, async () => {
        const esError = { type: 'document_missing_exception' };
        await bulkUpdateError(obj, esError, expectErrorNotFound(obj));
      });

      it(`returns error reason for other errors (bulk)`, async () => {
        const esError = { reason: 'some_other_error' };
        await bulkUpdateError(obj, esError, expectErrorResult(obj, { message: esError.reason }));
      });

      it(`returns error string for other errors if no reason is defined (bulk)`, async () => {
        const esError = { foo: 'some_other_error' };
        const expectedError = expectErrorResult(obj, { message: JSON.stringify(esError) });
        await bulkUpdateError(obj, esError, expectedError);
      });
    });

    describe('returns', () => {
      const expectSuccessResult = ({ type, id, attributes, references, namespaces, originId }) => ({
        type,
        id,
        originId,
        attributes,
        references,
        version: mockVersion,
        namespaces: namespaces ?? ['default'],
        ...mockTimestampFields,
      });

      it(`formats the ES response`, async () => {
        const response = await bulkUpdateSuccess([obj1, obj2]);
        expect(response).toEqual({
          saved_objects: [obj1, obj2].map(expectSuccessResult),
        });
      });

      it(`includes references`, async () => {
        const objects = [obj1, obj2].map((obj) => ({ ...obj, references }));
        const response = await bulkUpdateSuccess(objects);
        expect(response).toEqual({
          saved_objects: objects.map(expectSuccessResult),
        });
      });

      it(`handles a mix of successful updates and errors`, async () => {
        const obj = {
          type: 'unknownType',
          id: 'three',
        };
        const objects = [obj1, obj, obj2];
        const mockResponse = getMockBulkUpdateResponse(objects);
        client.bulk.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(mockResponse)
        );

        const result = await savedObjectsRepository.bulkUpdate(objects);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
          saved_objects: [expectSuccessResult(obj1), expectError(obj), expectSuccessResult(obj2)],
        });
      });

      it(`includes namespaces property for single-namespace and multi-namespace documents`, async () => {
        const obj = { type: MULTI_NAMESPACE_TYPE, id: 'three' };
        const result = await bulkUpdateSuccess([obj1, obj]);
        expect(result).toEqual({
          saved_objects: [
            expect.objectContaining({ namespaces: expect.any(Array) }),
            expect.objectContaining({ namespaces: expect.any(Array) }),
          ],
        });
      });

      it(`includes originId property if present in cluster call response`, async () => {
        const obj = { type: MULTI_NAMESPACE_TYPE, id: 'three' };
        const result = await bulkUpdateSuccess([obj1, obj], {}, true);
        expect(result).toEqual({
          saved_objects: [
            expect.objectContaining({ originId }),
            expect.objectContaining({ originId }),
          ],
        });
      });
    });
  });

  describe('#checkConflicts', () => {
    const obj1 = { type: 'dashboard', id: 'one' };
    const obj2 = { type: 'dashboard', id: 'two' };
    const obj3 = { type: MULTI_NAMESPACE_TYPE, id: 'three' };
    const obj4 = { type: MULTI_NAMESPACE_TYPE, id: 'four' };
    const obj5 = { type: MULTI_NAMESPACE_TYPE, id: 'five' };
    const obj6 = { type: NAMESPACE_AGNOSTIC_TYPE, id: 'six' };
    const obj7 = { type: NAMESPACE_AGNOSTIC_TYPE, id: 'seven' };
    const namespace = 'foo-namespace';

    const checkConflicts = async (objects, options) =>
      savedObjectsRepository.checkConflicts(
        objects.map(({ type, id }) => ({ type, id })), // checkConflicts only uses type and id
        options
      );
    const checkConflictsSuccess = async (objects, options) => {
      const response = getMockMgetResponse(objects, options?.namespace);
      client.mget.mockResolvedValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise(response)
      );
      const result = await checkConflicts(objects, options);
      expect(client.mget).toHaveBeenCalledTimes(1);
      return result;
    };

    const _expectClientCallArgs = (
      objects,
      { _index = expect.any(String), getId = () => expect.any(String) }
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

    describe('cluster calls', () => {
      it(`doesn't make a cluster call if the objects array is empty`, async () => {
        await checkConflicts([]);
        expect(client.mget).not.toHaveBeenCalled();
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        const getId = (type, id) => `${namespace}:${type}:${id}`;
        await checkConflictsSuccess([obj1, obj2], { namespace });
        _expectClientCallArgs([obj1, obj2], { getId });
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        const getId = (type, id) => `${type}:${id}`;
        await checkConflictsSuccess([obj1, obj2]);
        _expectClientCallArgs([obj1, obj2], { getId });
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        const getId = (type, id) => `${type}:${id}`;
        // obj3 is multi-namespace, and obj6 is namespace-agnostic
        await checkConflictsSuccess([obj3, obj6], { namespace });
        _expectClientCallArgs([obj3, obj6], { getId });
      });
    });

    describe('returns', () => {
      it(`expected results`, async () => {
        const unknownTypeObj = { type: 'unknownType', id: 'three' };
        const hiddenTypeObj = { type: HIDDEN_TYPE, id: 'three' };
        const objects = [unknownTypeObj, hiddenTypeObj, obj1, obj2, obj3, obj4, obj5, obj6, obj7];
        const response = {
          status: 200,
          docs: [
            getMockGetResponse(obj1),
            { found: false },
            getMockGetResponse(obj3),
            getMockGetResponse({ ...obj4, namespace: 'bar-namespace' }),
            { found: false },
            getMockGetResponse(obj6),
            { found: false },
          ],
        };
        client.mget.mockResolvedValue(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );

        const result = await checkConflicts(objects);
        expect(client.mget).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
          errors: [
            { ...unknownTypeObj, error: createUnsupportedTypeError(unknownTypeObj.type) },
            { ...hiddenTypeObj, error: createUnsupportedTypeError(hiddenTypeObj.type) },
            { ...obj1, error: createConflictError(obj1.type, obj1.id) },
            // obj2 was not found so it does not result in a conflict error
            { ...obj3, error: createConflictError(obj3.type, obj3.id) },
            {
              ...obj4,
              error: {
                ...createConflictError(obj4.type, obj4.id),
                metadata: { isNotOverwritable: true },
              },
            },
            // obj5 was not found so it does not result in a conflict error
            { ...obj6, error: createConflictError(obj6.type, obj6.id) },
            // obj7 was not found so it does not result in a conflict error
          ],
        });
      });
    });
  });

  describe('#create', () => {
    beforeEach(() => {
      client.create.mockImplementation((params) =>
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          _id: params.id,
          ...mockVersionProps,
        })
      );
    });

    const type = 'index-pattern';
    const attributes = { title: 'Logstash' };
    const id = 'logstash-*';
    const namespace = 'foo-namespace';
    const originId = 'some-origin-id';
    const references = [
      {
        name: 'ref_0',
        type: 'test',
        id: '123',
      },
    ];

    const createSuccess = async (type, attributes, options) => {
      const result = await savedObjectsRepository.create(type, attributes, options);
      expect(client.get).toHaveBeenCalledTimes(
        registry.isMultiNamespace(type) && options.overwrite ? 1 : 0
      );
      return result;
    };

    describe('client calls', () => {
      it(`should use the ES create action if ID is undefined and overwrite=true`, async () => {
        await createSuccess(type, attributes, { overwrite: true });
        expect(client.create).toHaveBeenCalled();
      });

      it(`should use the ES create action if ID is undefined and overwrite=false`, async () => {
        await createSuccess(type, attributes);
        expect(client.create).toHaveBeenCalled();
      });

      it(`should use the ES index action if ID is defined and overwrite=true`, async () => {
        await createSuccess(type, attributes, { id, overwrite: true });
        expect(client.index).toHaveBeenCalled();
      });

      it(`should use the ES index with version if ID and version are defined and overwrite=true`, async () => {
        await createSuccess(type, attributes, { id, overwrite: true, version: mockVersion });
        expect(client.index).toHaveBeenCalled();

        expect(client.index.mock.calls[0][0]).toMatchObject({
          if_seq_no: mockVersionProps._seq_no,
          if_primary_term: mockVersionProps._primary_term,
        });
      });

      it(`should use the ES create action if ID is defined and overwrite=false`, async () => {
        await createSuccess(type, attributes, { id });
        expect(client.create).toHaveBeenCalled();
      });

      it(`should use the ES get action then index action if type is multi-namespace, ID is defined, and overwrite=true`, async () => {
        await createSuccess(MULTI_NAMESPACE_TYPE, attributes, { id, overwrite: true });
        expect(client.get).toHaveBeenCalled();
        expect(client.index).toHaveBeenCalled();
      });

      it(`defaults to empty references array`, async () => {
        await createSuccess(type, attributes, { id });
        expect(client.create.mock.calls[0][0].body.references).toEqual([]);
      });

      it(`accepts custom references array`, async () => {
        const test = async (references) => {
          await createSuccess(type, attributes, { id, references });
          expect(client.create.mock.calls[0][0].body.references).toEqual(references);
          client.create.mockClear();
        };
        await test(references);
        await test(['string']);
        await test([]);
      });

      it(`doesn't accept custom references if not an array`, async () => {
        const test = async (references) => {
          await createSuccess(type, attributes, { id, references });
          expect(client.create.mock.calls[0][0].body.references).not.toBeDefined();
          client.create.mockClear();
        };
        await test('string');
        await test(123);
        await test(true);
        await test(null);
      });

      it(`defaults to no originId`, async () => {
        await createSuccess(type, attributes, { id });
        expect(client.create).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.not.objectContaining({ originId: expect.anything() }),
          }),
          expect.anything()
        );
      });

      it(`accepts custom originId`, async () => {
        await createSuccess(type, attributes, { id, originId });
        expect(client.create).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({ originId }),
          }),
          expect.anything()
        );
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
          expect.objectContaining({ index: '.kibana-test' }),
          expect.anything()
        );
      });

      it(`should use custom index`, async () => {
        await createSuccess(CUSTOM_INDEX_TYPE, attributes, { id });
        expect(client.create).toHaveBeenCalledWith(
          expect.objectContaining({ index: 'custom' }),
          expect.anything()
        );
      });

      it(`self-generates an id if none is provided`, async () => {
        await createSuccess(type, attributes);
        expect(client.create).toHaveBeenCalledWith(
          expect.objectContaining({
            id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
          }),
          expect.anything()
        );
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        await createSuccess(type, attributes, { id, namespace });
        expect(client.create).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${namespace}:${type}:${id}`,
          }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        await createSuccess(type, attributes, { id });
        expect(client.create).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${type}:${id}`,
          }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        await createSuccess(NAMESPACE_AGNOSTIC_TYPE, attributes, { id, namespace });
        expect(client.create).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${NAMESPACE_AGNOSTIC_TYPE}:${id}`,
          }),
          expect.anything()
        );
        client.create.mockClear();

        await createSuccess(MULTI_NAMESPACE_TYPE, attributes, { id, namespace });
        expect(client.create).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${MULTI_NAMESPACE_TYPE}:${id}`,
          }),
          expect.anything()
        );
      });
    });

    describe('errors', () => {
      it(`throws when type is invalid`, async () => {
        await expect(savedObjectsRepository.create('unknownType', attributes)).rejects.toThrowError(
          createUnsupportedTypeError('unknownType')
        );
        expect(client.create).not.toHaveBeenCalled();
      });

      it(`throws when type is hidden`, async () => {
        await expect(savedObjectsRepository.create(HIDDEN_TYPE, attributes)).rejects.toThrowError(
          createUnsupportedTypeError(HIDDEN_TYPE)
        );
        expect(client.create).not.toHaveBeenCalled();
      });

      it(`throws when there is a conflict with an existing multi-namespace saved object (get)`, async () => {
        const response = getMockGetResponse({
          type: MULTI_NAMESPACE_TYPE,
          id,
          namespace: 'bar-namespace',
        });
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        await expect(
          savedObjectsRepository.create(MULTI_NAMESPACE_TYPE, attributes, {
            id,
            overwrite: true,
            namespace,
          })
        ).rejects.toThrowError(createConflictError(MULTI_NAMESPACE_TYPE, id));
        expect(client.get).toHaveBeenCalled();
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
        await createSuccess(type, attributes, { id, references, migrationVersion });
        const doc = { type, id, attributes, references, migrationVersion, ...mockTimestampFields };
        expectMigrationArgs(doc);

        const migratedDoc = migrator.migrateDocument(doc);
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
        await createSuccess(MULTI_NAMESPACE_TYPE, attributes, { id });
        expectMigrationArgs({ namespace: expect.anything() }, false, 2);
      });

      it(`adds namespaces to body when providing namespace for multi-namespace type`, async () => {
        await createSuccess(MULTI_NAMESPACE_TYPE, attributes, { id, namespace });
        expectMigrationArgs({ namespaces: [namespace] });
      });

      it(`adds default namespaces to body when providing no namespace for multi-namespace type`, async () => {
        await createSuccess(MULTI_NAMESPACE_TYPE, attributes, { id });
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
        const result = await createSuccess(type, attributes, {
          id,
          namespace,
          references,
          originId,
        });
        expect(result).toEqual({
          type,
          id,
          originId,
          ...mockTimestampFields,
          version: mockVersion,
          attributes,
          references,
          namespaces: [namespace ?? 'default'],
          migrationVersion: { [type]: '1.1.1' },
        });
      });
    });
  });

  describe('#delete', () => {
    const type = 'index-pattern';
    const id = 'logstash-*';
    const namespace = 'foo-namespace';

    const deleteSuccess = async (type, id, options) => {
      if (registry.isMultiNamespace(type)) {
        const mockGetResponse = getMockGetResponse({ type, id, namespace: options?.namespace });
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(mockGetResponse)
        );
      }
      client.delete.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise({ result: 'deleted' })
      );
      const result = await savedObjectsRepository.delete(type, id, options);
      expect(client.get).toHaveBeenCalledTimes(registry.isMultiNamespace(type) ? 1 : 0);
      return result;
    };

    describe('client calls', () => {
      it(`should use the ES delete action when not using a multi-namespace type`, async () => {
        await deleteSuccess(type, id);
        expect(client.delete).toHaveBeenCalledTimes(1);
      });

      it(`should use ES get action then delete action when using a multi-namespace type with no namespaces remaining`, async () => {
        await deleteSuccess(MULTI_NAMESPACE_TYPE, id);
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(client.delete).toHaveBeenCalledTimes(1);
      });

      it(`should use ES get action then update action when using a multi-namespace type with one or more namespaces remaining`, async () => {
        const mockResponse = getMockGetResponse({ type: MULTI_NAMESPACE_TYPE, id });
        mockResponse._source.namespaces = ['default', 'some-other-nameespace'];
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(mockResponse)
        );
        client.update.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({ result: 'updated' })
        );

        await savedObjectsRepository.delete(MULTI_NAMESPACE_TYPE, id);
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(client.update).toHaveBeenCalledTimes(1);
      });

      it(`includes the version of the existing document when type is multi-namespace`, async () => {
        await deleteSuccess(MULTI_NAMESPACE_TYPE, id);
        const versionProperties = {
          if_seq_no: mockVersionProps._seq_no,
          if_primary_term: mockVersionProps._primary_term,
        };
        expect(client.delete).toHaveBeenCalledWith(
          expect.objectContaining(versionProperties),
          expect.anything()
        );
      });

      it(`defaults to a refresh setting of wait_for`, async () => {
        await deleteSuccess(type, id);
        expect(client.delete).toHaveBeenCalledWith(
          expect.objectContaining({ refresh: 'wait_for' }),
          expect.anything()
        );
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        await deleteSuccess(type, id, { namespace });
        expect(client.delete).toHaveBeenCalledWith(
          expect.objectContaining({ id: `${namespace}:${type}:${id}` }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        await deleteSuccess(type, id);
        expect(client.delete).toHaveBeenCalledWith(
          expect.objectContaining({ id: `${type}:${id}` }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        await deleteSuccess(NAMESPACE_AGNOSTIC_TYPE, id, { namespace });
        expect(client.delete).toHaveBeenCalledWith(
          expect.objectContaining({ id: `${NAMESPACE_AGNOSTIC_TYPE}:${id}` }),
          expect.anything()
        );

        client.delete.mockClear();
        await deleteSuccess(MULTI_NAMESPACE_TYPE, id, { namespace });
        expect(client.delete).toHaveBeenCalledWith(
          expect.objectContaining({ id: `${MULTI_NAMESPACE_TYPE}:${id}` }),
          expect.anything()
        );
      });
    });

    describe('errors', () => {
      const expectNotFoundError = async (type, id, options) => {
        await expect(savedObjectsRepository.delete(type, id, options)).rejects.toThrowError(
          createGenericNotFoundError(type, id)
        );
      };

      it(`throws when type is invalid`, async () => {
        await expectNotFoundError('unknownType', id);
        expect(client.delete).not.toHaveBeenCalled();
      });

      it(`throws when type is hidden`, async () => {
        await expectNotFoundError(HIDDEN_TYPE, id);
        expect(client.delete).not.toHaveBeenCalled();
      });

      it(`throws when ES is unable to find the document during get`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({ found: false })
        );
        await expectNotFoundError(MULTI_NAMESPACE_TYPE, id);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the index during get`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
        );
        await expectNotFoundError(MULTI_NAMESPACE_TYPE, id);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when the type is multi-namespace and the document exists, but not in this namespace`, async () => {
        const response = getMockGetResponse({ type: MULTI_NAMESPACE_TYPE, id, namespace });
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        await expectNotFoundError(MULTI_NAMESPACE_TYPE, id, { namespace: 'bar-namespace' });
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the document during update`, async () => {
        const mockResponse = getMockGetResponse({ type: MULTI_NAMESPACE_TYPE, id });
        mockResponse._source.namespaces = ['default', 'some-other-nameespace'];
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(mockResponse)
        );
        client.update.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
        );

        await expectNotFoundError(MULTI_NAMESPACE_TYPE, id);
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(client.update).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the document during delete`, async () => {
        client.delete.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({ result: 'not_found' })
        );
        await expectNotFoundError(type, id);
        expect(client.delete).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the index during delete`, async () => {
        client.delete.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            error: { type: 'index_not_found_exception' },
          })
        );
        await expectNotFoundError(type, id);
        expect(client.delete).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES returns an unexpected response`, async () => {
        client.delete.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            result: 'something unexpected',
          })
        );
        await expect(savedObjectsRepository.delete(type, id)).rejects.toThrowError(
          'Unexpected Elasticsearch DELETE response'
        );
        expect(client.delete).toHaveBeenCalledTimes(1);
      });
    });

    describe('returns', () => {
      it(`returns an empty object on success`, async () => {
        const result = await deleteSuccess(type, id);
        expect(result).toEqual({});
      });
    });
  });

  describe('#deleteByNamespace', () => {
    const namespace = 'foo-namespace';
    const mockUpdateResults = {
      took: 15,
      timed_out: false,
      total: 3,
      updated: 2,
      deleted: 1,
      batches: 1,
      version_conflicts: 0,
      noops: 0,
      retries: { bulk: 0, search: 0 },
      throttled_millis: 0,
      requests_per_second: -1.0,
      throttled_until_millis: 0,
      failures: [],
    };

    const deleteByNamespaceSuccess = async (namespace, options) => {
      client.updateByQuery.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(mockUpdateResults)
      );
      const result = await savedObjectsRepository.deleteByNamespace(namespace, options);
      expect(getSearchDslNS.getSearchDsl).toHaveBeenCalledTimes(1);
      expect(client.updateByQuery).toHaveBeenCalledTimes(1);
      return result;
    };

    describe('client calls', () => {
      it(`should use the ES updateByQuery action`, async () => {
        await deleteByNamespaceSuccess(namespace);
        expect(client.updateByQuery).toHaveBeenCalledTimes(1);
      });

      it(`should use all indices for types that are not namespace-agnostic`, async () => {
        await deleteByNamespaceSuccess(namespace);
        expect(client.updateByQuery).toHaveBeenCalledWith(
          expect.objectContaining({ index: ['.kibana-test', 'custom'] }),
          expect.anything()
        );
      });
    });

    describe('errors', () => {
      it(`throws when namespace is not a string`, async () => {
        const test = async (namespace) => {
          await expect(savedObjectsRepository.deleteByNamespace(namespace)).rejects.toThrowError(
            `namespace is required, and must be a string`
          );
          expect(client.updateByQuery).not.toHaveBeenCalled();
        };
        await test(undefined);
        await test(['namespace']);
        await test(123);
        await test(true);
      });
    });

    describe('returns', () => {
      it(`returns the query results on success`, async () => {
        const result = await deleteByNamespaceSuccess(namespace);
        expect(result).toEqual(mockUpdateResults);
      });
    });

    describe('search dsl', () => {
      it(`constructs a query using all multi-namespace types, and another using all single-namespace types`, async () => {
        await deleteByNamespaceSuccess(namespace);
        const allTypes = registry.getAllTypes().map((type) => type.name);
        expect(getSearchDslNS.getSearchDsl).toHaveBeenCalledWith(mappings, registry, {
          namespaces: [namespace],
          type: allTypes.filter((type) => !registry.isNamespaceAgnostic(type)),
        });
      });
    });
  });

  describe('#find', () => {
    const generateSearchResults = (namespace) => {
      return {
        hits: {
          total: 4,
          hits: [
            {
              _index: '.kibana',
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
              _index: '.kibana',
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
              _index: '.kibana',
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
              _index: '.kibana',
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
      };
    };

    const type = 'index-pattern';
    const namespace = 'foo-namespace';

    const findSuccess = async (options, namespace) => {
      client.search.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(
          generateSearchResults(namespace)
        )
      );
      const result = await savedObjectsRepository.find(options);
      expect(getSearchDslNS.getSearchDsl).toHaveBeenCalledTimes(1);
      expect(client.search).toHaveBeenCalledTimes(1);
      return result;
    };

    describe('client calls', () => {
      it(`should use the ES search action`, async () => {
        await findSuccess({ type });
        expect(client.search).toHaveBeenCalledTimes(1);
      });

      it(`merges output of getSearchDsl into es request body`, async () => {
        const query = { query: 1, aggregations: 2 };
        getSearchDslNS.getSearchDsl.mockReturnValue(query);
        await findSuccess({ type });

        expect(client.search).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({ ...query }),
          }),
          expect.anything()
        );
      });

      it(`accepts per_page/page`, async () => {
        await findSuccess({ type, perPage: 10, page: 6 });
        expect(client.search).toHaveBeenCalledWith(
          expect.objectContaining({
            size: 10,
            from: 50,
          }),
          expect.anything()
        );
      });

      it(`accepts preference`, async () => {
        await findSuccess({ type, preference: 'pref' });
        expect(client.search).toHaveBeenCalledWith(
          expect.objectContaining({
            preference: 'pref',
          }),
          expect.anything()
        );
      });

      it(`can filter by fields`, async () => {
        await findSuccess({ type, fields: ['title'] });
        expect(client.search).toHaveBeenCalledWith(
          expect.objectContaining({
            _source: [
              `${type}.title`,
              'namespace',
              'namespaces',
              'type',
              'references',
              'migrationVersion',
              'updated_at',
              'originId',
              'title',
            ],
          }),
          expect.anything()
        );
      });

      it(`should set rest_total_hits_as_int to true on a request`, async () => {
        await findSuccess({ type });
        expect(client.search).toHaveBeenCalledWith(
          expect.objectContaining({
            rest_total_hits_as_int: true,
          }),
          expect.anything()
        );
      });

      it(`should not make a client call when attempting to find only invalid or hidden types`, async () => {
        const test = async (types) => {
          await savedObjectsRepository.find({ type: types });
          expect(client.search).not.toHaveBeenCalled();
        };

        await test('unknownType');
        await test(HIDDEN_TYPE);
        await test(['unknownType', HIDDEN_TYPE]);
      });
    });

    describe('errors', () => {
      it(`throws when type is not defined`, async () => {
        await expect(savedObjectsRepository.find({})).rejects.toThrowError(
          'options.type must be a string or an array of strings'
        );
        expect(client.search).not.toHaveBeenCalled();
      });

      it(`throws when searchFields is defined but not an array`, async () => {
        await expect(
          savedObjectsRepository.find({ type, searchFields: 'string' })
        ).rejects.toThrowError('options.searchFields must be an array');
        expect(client.search).not.toHaveBeenCalled();
      });

      it(`throws when fields is defined but not an array`, async () => {
        await expect(savedObjectsRepository.find({ type, fields: 'string' })).rejects.toThrowError(
          'options.fields must be an array'
        );
        expect(client.search).not.toHaveBeenCalled();
      });

      it(`throws when KQL filter syntax is invalid`, async () => {
        const findOpts = {
          namespace,
          search: 'foo*',
          searchFields: ['foo'],
          type: ['dashboard'],
          sortField: 'name',
          sortOrder: 'desc',
          defaultSearchOperator: 'AND',
          hasReference: {
            type: 'foo',
            id: '1',
          },
          indexPattern: undefined,
          filter: 'dashboard.attributes.otherField:<',
        };

        await expect(savedObjectsRepository.find(findOpts)).rejects.toMatchInlineSnapshot(`
                          [Error: KQLSyntaxError: Expected "(", "{", value, whitespace but "<" found.
                          dashboard.attributes.otherField:<
                          --------------------------------^: Bad Request]
                      `);
        expect(getSearchDslNS.getSearchDsl).not.toHaveBeenCalled();
        expect(client.search).not.toHaveBeenCalled();
      });
    });

    describe('returns', () => {
      it(`formats the ES response when there is no namespace`, async () => {
        const noNamespaceSearchResults = generateSearchResults();
        client.search.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(noNamespaceSearchResults)
        );
        const count = noNamespaceSearchResults.hits.hits.length;

        const response = await savedObjectsRepository.find({ type });

        expect(response.total).toBe(count);
        expect(response.saved_objects).toHaveLength(count);

        noNamespaceSearchResults.hits.hits.forEach((doc, i) => {
          expect(response.saved_objects[i]).toEqual({
            id: doc._id.replace(/(index-pattern|config|globalType)\:/, ''),
            type: doc._source.type,
            originId: doc._source.originId,
            ...mockTimestampFields,
            version: mockVersion,
            score: doc._score,
            attributes: doc._source[doc._source.type],
            references: [],
            namespaces: doc._source.type === NAMESPACE_AGNOSTIC_TYPE ? undefined : ['default'],
          });
        });
      });

      it(`formats the ES response when there is a namespace`, async () => {
        const namespacedSearchResults = generateSearchResults(namespace);
        client.search.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(namespacedSearchResults)
        );
        const count = namespacedSearchResults.hits.hits.length;

        const response = await savedObjectsRepository.find({ type, namespaces: [namespace] });

        expect(response.total).toBe(count);
        expect(response.saved_objects).toHaveLength(count);

        namespacedSearchResults.hits.hits.forEach((doc, i) => {
          expect(response.saved_objects[i]).toEqual({
            id: doc._id.replace(/(foo-namespace\:)?(index-pattern|config|globalType)\:/, ''),
            type: doc._source.type,
            originId: doc._source.originId,
            ...mockTimestampFields,
            version: mockVersion,
            score: doc._score,
            attributes: doc._source[doc._source.type],
            references: [],
            namespaces: doc._source.type === NAMESPACE_AGNOSTIC_TYPE ? undefined : [namespace],
          });
        });
      });

      it(`should return empty results when attempting to find only invalid or hidden types`, async () => {
        const test = async (types) => {
          const result = await savedObjectsRepository.find({ type: types });
          expect(result).toEqual(expect.objectContaining({ saved_objects: [] }));
        };

        await test('unknownType');
        await test(HIDDEN_TYPE);
        await test(['unknownType', HIDDEN_TYPE]);
      });
    });

    describe('search dsl', () => {
      it(`passes mappings, registry, search, defaultSearchOperator, searchFields, type, sortField, sortOrder and hasReference to getSearchDsl`, async () => {
        const relevantOpts = {
          namespaces: [namespace],
          search: 'foo*',
          searchFields: ['foo'],
          type: [type],
          sortField: 'name',
          sortOrder: 'desc',
          defaultSearchOperator: 'AND',
          hasReference: {
            type: 'foo',
            id: '1',
          },
          kueryNode: undefined,
        };

        await findSuccess(relevantOpts, namespace);
        expect(getSearchDslNS.getSearchDsl).toHaveBeenCalledWith(mappings, registry, relevantOpts);
      });

      it(`accepts KQL filter and passes kueryNode to getSearchDsl`, async () => {
        const findOpts = {
          namespace,
          search: 'foo*',
          searchFields: ['foo'],
          type: ['dashboard'],
          sortField: 'name',
          sortOrder: 'desc',
          defaultSearchOperator: 'AND',
          hasReference: {
            type: 'foo',
            id: '1',
          },
          indexPattern: undefined,
          filter: 'dashboard.attributes.otherField: *',
        };

        await findSuccess(findOpts, namespace);
        const { kueryNode } = getSearchDslNS.getSearchDsl.mock.calls[0][2];
        expect(kueryNode).toMatchInlineSnapshot(`
          Object {
            "arguments": Array [
              Object {
                "type": "literal",
                "value": "dashboard.otherField",
              },
              Object {
                "type": "wildcard",
                "value": "@kuery-wildcard@",
              },
              Object {
                "type": "literal",
                "value": false,
              },
            ],
            "function": "is",
            "type": "function",
          }
        `);
      });

      it(`supports multiple types`, async () => {
        const types = ['config', 'index-pattern'];
        await findSuccess({ type: types });

        expect(getSearchDslNS.getSearchDsl).toHaveBeenCalledWith(
          mappings,
          registry,
          expect.objectContaining({
            type: types,
          })
        );
      });

      it(`filters out invalid types`, async () => {
        const types = ['config', 'unknownType', 'index-pattern'];
        await findSuccess({ type: types });

        expect(getSearchDslNS.getSearchDsl).toHaveBeenCalledWith(
          mappings,
          registry,
          expect.objectContaining({
            type: ['config', 'index-pattern'],
          })
        );
      });

      it(`filters out hidden types`, async () => {
        const types = ['config', HIDDEN_TYPE, 'index-pattern'];
        await findSuccess({ type: types });

        expect(getSearchDslNS.getSearchDsl).toHaveBeenCalledWith(
          mappings,
          registry,
          expect.objectContaining({
            type: ['config', 'index-pattern'],
          })
        );
      });
    });
  });

  describe('#get', () => {
    const type = 'index-pattern';
    const id = 'logstash-*';
    const namespace = 'foo-namespace';
    const originId = 'some-origin-id';

    const getSuccess = async (type, id, options, includeOriginId) => {
      const response = getMockGetResponse({
        type,
        id,
        namespace: options?.namespace,
        // "includeOriginId" is not an option for the operation; however, if the existing saved object contains an originId attribute, the
        // operation will return it in the result. This flag is just used for test purposes to modify the mock cluster call response.
        ...(includeOriginId && { originId }),
      });
      client.get.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(response)
      );
      const result = await savedObjectsRepository.get(type, id, options);
      expect(client.get).toHaveBeenCalledTimes(1);
      return result;
    };

    describe('client calls', () => {
      it(`should use the ES get action`, async () => {
        await getSuccess(type, id);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        await getSuccess(type, id, { namespace });
        expect(client.get).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${namespace}:${type}:${id}`,
          }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        await getSuccess(type, id);
        expect(client.get).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${type}:${id}`,
          }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        await getSuccess(NAMESPACE_AGNOSTIC_TYPE, id, { namespace });
        expect(client.get).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${NAMESPACE_AGNOSTIC_TYPE}:${id}`,
          }),
          expect.anything()
        );

        client.get.mockClear();
        await getSuccess(MULTI_NAMESPACE_TYPE, id, { namespace });
        expect(client.get).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${MULTI_NAMESPACE_TYPE}:${id}`,
          }),
          expect.anything()
        );
      });
    });

    describe('errors', () => {
      const expectNotFoundError = async (type, id, options) => {
        await expect(savedObjectsRepository.get(type, id, options)).rejects.toThrowError(
          createGenericNotFoundError(type, id)
        );
      };

      it(`throws when type is invalid`, async () => {
        await expectNotFoundError('unknownType', id);
        expect(client.get).not.toHaveBeenCalled();
      });

      it(`throws when type is hidden`, async () => {
        await expectNotFoundError(HIDDEN_TYPE, id);
        expect(client.get).not.toHaveBeenCalled();
      });

      it(`throws when ES is unable to find the document during get`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({ found: false })
        );
        await expectNotFoundError(type, id);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the index during get`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
        );
        await expectNotFoundError(type, id);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when type is multi-namespace and the document exists, but not in this namespace`, async () => {
        const response = getMockGetResponse({ type: MULTI_NAMESPACE_TYPE, id, namespace });
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        await expectNotFoundError(MULTI_NAMESPACE_TYPE, id, { namespace: 'bar-namespace' });
        expect(client.get).toHaveBeenCalledTimes(1);
      });
    });

    describe('returns', () => {
      it(`formats the ES response`, async () => {
        const result = await getSuccess(type, id);
        expect(result).toEqual({
          id,
          type,
          updated_at: mockTimestamp,
          version: mockVersion,
          attributes: {
            title: 'Testing',
          },
          references: [],
          namespaces: ['default'],
        });
      });

      it(`includes namespaces if type is multi-namespace`, async () => {
        const result = await getSuccess(MULTI_NAMESPACE_TYPE, id);
        expect(result).toMatchObject({
          namespaces: expect.any(Array),
        });
      });

      it(`include namespaces if type is not multi-namespace`, async () => {
        const result = await getSuccess(type, id);
        expect(result).toMatchObject({
          namespaces: ['default'],
        });
      });

      it(`includes originId property if present in cluster call response`, async () => {
        const result = await getSuccess(type, id, {}, true);
        expect(result).toMatchObject({ originId });
      });
    });
  });

  describe('#incrementCounter', () => {
    const type = 'config';
    const id = 'one';
    const field = 'buildNum';
    const namespace = 'foo-namespace';
    const originId = 'some-origin-id';

    const incrementCounterSuccess = async (type, id, field, options) => {
      const isMultiNamespace = registry.isMultiNamespace(type);
      if (isMultiNamespace) {
        const response = getMockGetResponse({ type, id, namespace: options?.namespace });
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
      }
      client.update.mockImplementation((params) =>
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          _id: params.id,
          ...mockVersionProps,
          _index: '.kibana',
          get: {
            found: true,
            _source: {
              type,
              ...mockTimestampFields,
              [type]: {
                [field]: 8468,
                defaultIndex: 'logstash-*',
              },
            },
          },
        })
      );

      const result = await savedObjectsRepository.incrementCounter(type, id, field, options);
      expect(client.get).toHaveBeenCalledTimes(isMultiNamespace ? 1 : 0);
      return result;
    };

    describe('client calls', () => {
      it(`should use the ES update action if type is not multi-namespace`, async () => {
        await incrementCounterSuccess(type, id, field, { namespace });
        expect(client.update).toHaveBeenCalledTimes(1);
      });

      it(`should use the ES get action then update action if type is multi-namespace, ID is defined, and overwrite=true`, async () => {
        await incrementCounterSuccess(MULTI_NAMESPACE_TYPE, id, field, { namespace });
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(client.update).toHaveBeenCalledTimes(1);
      });

      it(`defaults to a refresh setting of wait_for`, async () => {
        await incrementCounterSuccess(type, id, field, { namespace });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            refresh: 'wait_for',
          }),
          expect.anything()
        );
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        await incrementCounterSuccess(type, id, field, { namespace });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${namespace}:${type}:${id}`,
          }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        await incrementCounterSuccess(type, id, field);
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${type}:${id}`,
          }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        await incrementCounterSuccess(NAMESPACE_AGNOSTIC_TYPE, id, field, { namespace });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${NAMESPACE_AGNOSTIC_TYPE}:${id}`,
          }),
          expect.anything()
        );

        client.update.mockClear();
        await incrementCounterSuccess(MULTI_NAMESPACE_TYPE, id, field, { namespace });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${MULTI_NAMESPACE_TYPE}:${id}`,
          }),
          expect.anything()
        );
      });
    });

    describe('errors', () => {
      const expectUnsupportedTypeError = async (type, id, field) => {
        await expect(savedObjectsRepository.incrementCounter(type, id, field)).rejects.toThrowError(
          createUnsupportedTypeError(type)
        );
      };

      it(`throws when type is not a string`, async () => {
        const test = async (type) => {
          await expect(
            savedObjectsRepository.incrementCounter(type, id, field)
          ).rejects.toThrowError(`"type" argument must be a string`);
          expect(client.update).not.toHaveBeenCalled();
        };

        await test(null);
        await test(42);
        await test(false);
        await test({});
      });

      it(`throws when counterFieldName is not a string`, async () => {
        const test = async (field) => {
          await expect(
            savedObjectsRepository.incrementCounter(type, id, field)
          ).rejects.toThrowError(`"counterFieldName" argument must be a string`);
          expect(client.update).not.toHaveBeenCalled();
        };

        await test(null);
        await test(42);
        await test(false);
        await test({});
      });

      it(`throws when type is invalid`, async () => {
        await expectUnsupportedTypeError('unknownType', id, field);
        expect(client.update).not.toHaveBeenCalled();
      });

      it(`throws when type is hidden`, async () => {
        await expectUnsupportedTypeError(HIDDEN_TYPE, id, field);
        expect(client.update).not.toHaveBeenCalled();
      });

      it(`throws when there is a conflict with an existing multi-namespace saved object (get)`, async () => {
        const response = getMockGetResponse({
          type: MULTI_NAMESPACE_TYPE,
          id,
          namespace: 'bar-namespace',
        });
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        await expect(
          savedObjectsRepository.incrementCounter(MULTI_NAMESPACE_TYPE, id, field, { namespace })
        ).rejects.toThrowError(createConflictError(MULTI_NAMESPACE_TYPE, id));
        expect(client.get).toHaveBeenCalledTimes(1);
      });
    });

    describe('migration', () => {
      beforeEach(() => {
        migrator.migrateDocument.mockImplementation(mockMigrateDocument);
      });

      it(`migrates a document and serializes the migrated doc`, async () => {
        const migrationVersion = mockMigrationVersion;
        await incrementCounterSuccess(type, id, field, { migrationVersion });
        const attributes = { buildNum: 1 }; // this is added by the incrementCounter function
        const doc = { type, id, attributes, migrationVersion, ...mockTimestampFields };
        expectMigrationArgs(doc);

        const migratedDoc = migrator.migrateDocument(doc);
        expect(serializer.savedObjectToRaw).toHaveBeenLastCalledWith(migratedDoc);
      });
    });

    describe('returns', () => {
      it(`formats the ES response`, async () => {
        client.update.mockImplementation((params) =>
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            _id: params.id,
            ...mockVersionProps,
            _index: '.kibana',
            get: {
              found: true,
              _source: {
                type: 'config',
                ...mockTimestampFields,
                config: {
                  buildNum: 8468,
                  defaultIndex: 'logstash-*',
                },
                originId,
              },
            },
          })
        );

        const response = await savedObjectsRepository.incrementCounter(
          'config',
          '6.0.0-alpha1',
          'buildNum',
          {
            namespace: 'foo-namespace',
          }
        );

        expect(response).toEqual({
          type: 'config',
          id: '6.0.0-alpha1',
          ...mockTimestampFields,
          version: mockVersion,
          attributes: {
            buildNum: 8468,
            defaultIndex: 'logstash-*',
          },
          originId,
        });
      });
    });
  });

  describe('#deleteFromNamespaces', () => {
    const id = 'some-id';
    const type = MULTI_NAMESPACE_TYPE;
    const namespace1 = 'default';
    const namespace2 = 'foo-namespace';
    const namespace3 = 'bar-namespace';

    const mockGetResponse = (type, id, namespaces) => {
      // mock a document that exists in two namespaces
      const mockResponse = getMockGetResponse({ type, id });
      mockResponse._source.namespaces = namespaces;
      client.get.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(mockResponse)
      );
    };

    const deleteFromNamespacesSuccess = async (
      type,
      id,
      namespaces,
      currentNamespaces,
      options
    ) => {
      mockGetResponse(type, id, currentNamespaces);
      client.delete.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          _id: `${type}:${id}`,
          ...mockVersionProps,
          result: 'deleted',
        })
      );
      client.update.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          _id: `${type}:${id}`,
          ...mockVersionProps,
          result: 'updated',
        })
      );

      return await savedObjectsRepository.deleteFromNamespaces(type, id, namespaces, options);
    };

    describe('client calls', () => {
      describe('delete action', () => {
        const deleteFromNamespacesSuccessDelete = async (expectFn, options, _type = type) => {
          const test = async (namespaces) => {
            await deleteFromNamespacesSuccess(_type, id, namespaces, namespaces, options);
            expectFn();
            client.delete.mockClear();
            client.get.mockClear();
          };
          await test([namespace1]);
          await test([namespace1, namespace2]);
        };

        it(`should use ES get action then delete action if the object has no namespaces remaining`, async () => {
          const expectFn = () => {
            expect(client.delete).toHaveBeenCalledTimes(1);
            expect(client.get).toHaveBeenCalledTimes(1);
          };
          await deleteFromNamespacesSuccessDelete(expectFn);
        });

        it(`formats the ES requests`, async () => {
          const expectFn = () => {
            expect(client.delete).toHaveBeenCalledWith(
              expect.objectContaining({
                id: `${type}:${id}`,
              }),
              expect.anything()
            );

            const versionProperties = {
              if_seq_no: mockVersionProps._seq_no,
              if_primary_term: mockVersionProps._primary_term,
            };
            expect(client.delete).toHaveBeenCalledWith(
              expect.objectContaining({
                id: `${type}:${id}`,
                ...versionProperties,
              }),
              expect.anything()
            );
          };
          await deleteFromNamespacesSuccessDelete(expectFn);
        });

        it(`defaults to a refresh setting of wait_for`, async () => {
          await deleteFromNamespacesSuccessDelete(() =>
            expect(client.delete).toHaveBeenCalledWith(
              expect.objectContaining({
                refresh: 'wait_for',
              }),
              expect.anything()
            )
          );
        });

        it(`should use default index`, async () => {
          const expectFn = () =>
            expect(client.delete).toHaveBeenCalledWith(
              expect.objectContaining({ index: '.kibana-test' }),
              expect.anything()
            );
          await deleteFromNamespacesSuccessDelete(expectFn);
        });

        it(`should use custom index`, async () => {
          const expectFn = () =>
            expect(client.delete).toHaveBeenCalledWith(
              expect.objectContaining({ index: 'custom' }),
              expect.anything()
            );
          await deleteFromNamespacesSuccessDelete(expectFn, {}, MULTI_NAMESPACE_CUSTOM_INDEX_TYPE);
        });
      });

      describe('update action', () => {
        const deleteFromNamespacesSuccessUpdate = async (expectFn, options, _type = type) => {
          const test = async (remaining) => {
            const currentNamespaces = [namespace1].concat(remaining);
            await deleteFromNamespacesSuccess(_type, id, [namespace1], currentNamespaces, options);
            expectFn();
            client.get.mockClear();
            client.update.mockClear();
          };
          await test([namespace2]);
          await test([namespace2, namespace3]);
        };

        it(`should use ES get action then update action if the object has one or more namespaces remaining`, async () => {
          const expectFn = () => {
            expect(client.update).toHaveBeenCalledTimes(1);
            expect(client.get).toHaveBeenCalledTimes(1);
          };
          await deleteFromNamespacesSuccessUpdate(expectFn);
        });

        it(`formats the ES requests`, async () => {
          let ctr = 0;
          const expectFn = () => {
            expect(client.update).toHaveBeenCalledWith(
              expect.objectContaining({
                id: `${type}:${id}`,
              }),
              expect.anything()
            );
            const namespaces = ctr++ === 0 ? [namespace2] : [namespace2, namespace3];
            const versionProperties = {
              if_seq_no: mockVersionProps._seq_no,
              if_primary_term: mockVersionProps._primary_term,
            };
            expect(client.update).toHaveBeenCalledWith(
              expect.objectContaining({
                id: `${type}:${id}`,
                ...versionProperties,
                body: { doc: { ...mockTimestampFields, namespaces } },
              }),
              expect.anything()
            );
          };
          await deleteFromNamespacesSuccessUpdate(expectFn);
        });

        it(`defaults to a refresh setting of wait_for`, async () => {
          const expectFn = () =>
            expect(client.update).toHaveBeenCalledWith(
              expect.objectContaining({
                refresh: 'wait_for',
              }),
              expect.anything()
            );
          await deleteFromNamespacesSuccessUpdate(expectFn);
        });

        it(`should use default index`, async () => {
          const expectFn = () =>
            expect(client.update).toHaveBeenCalledWith(
              expect.objectContaining({ index: '.kibana-test' }),
              expect.anything()
            );
          await deleteFromNamespacesSuccessUpdate(expectFn);
        });

        it(`should use custom index`, async () => {
          const expectFn = () =>
            expect(client.update).toHaveBeenCalledWith(
              expect.objectContaining({ index: 'custom' }),
              expect.anything()
            );
          await deleteFromNamespacesSuccessUpdate(expectFn, {}, MULTI_NAMESPACE_CUSTOM_INDEX_TYPE);
        });
      });
    });

    describe('errors', () => {
      const expectNotFoundError = async (type, id, namespaces, options) => {
        await expect(
          savedObjectsRepository.deleteFromNamespaces(type, id, namespaces, options)
        ).rejects.toThrowError(createGenericNotFoundError(type, id));
      };
      const expectBadRequestError = async (type, id, namespaces, message) => {
        await expect(
          savedObjectsRepository.deleteFromNamespaces(type, id, namespaces)
        ).rejects.toThrowError(createBadRequestError(message));
      };

      it(`throws when type is invalid`, async () => {
        await expectNotFoundError('unknownType', id, [namespace1, namespace2]);
        expect(client.delete).not.toHaveBeenCalled();
        expect(client.update).not.toHaveBeenCalled();
      });

      it(`throws when type is hidden`, async () => {
        await expectNotFoundError(HIDDEN_TYPE, id, [namespace1, namespace2]);
        expect(client.delete).not.toHaveBeenCalled();
        expect(client.update).not.toHaveBeenCalled();
      });

      it(`throws when type is not namespace-agnostic`, async () => {
        const test = async (type) => {
          const message = `${type} doesn't support multiple namespaces`;
          await expectBadRequestError(type, id, [namespace1, namespace2], message);
          expect(client.delete).not.toHaveBeenCalled();
          expect(client.update).not.toHaveBeenCalled();
        };
        await test('index-pattern');
        await test(NAMESPACE_AGNOSTIC_TYPE);
      });

      it(`throws when namespaces is an empty array`, async () => {
        const test = async (namespaces) => {
          const message = 'namespaces must be a non-empty array of strings';
          await expectBadRequestError(type, id, namespaces, message);
          expect(client.delete).not.toHaveBeenCalled();
          expect(client.update).not.toHaveBeenCalled();
        };
        await test([]);
      });

      it(`throws when ES is unable to find the document during get`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({ found: false })
        );
        await expectNotFoundError(type, id, [namespace1, namespace2]);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the index during get`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
        );
        await expectNotFoundError(type, id, [namespace1, namespace2]);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when the document exists, but not in this namespace`, async () => {
        mockGetResponse(type, id, [namespace1]);
        await expectNotFoundError(type, id, [namespace1], { namespace: 'some-other-namespace' });
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the document during delete`, async () => {
        mockGetResponse(type, id, [namespace1]);
        client.delete.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({ result: 'not_found' })
        );
        await expectNotFoundError(type, id, [namespace1]);
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(client.delete).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the index during delete`, async () => {
        mockGetResponse(type, id, [namespace1]);
        client.delete.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            error: { type: 'index_not_found_exception' },
          })
        );
        await expectNotFoundError(type, id, [namespace1]);
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(client.delete).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES returns an unexpected response`, async () => {
        mockGetResponse(type, id, [namespace1]);
        client.delete.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            result: 'something unexpected',
          })
        );
        await expect(
          savedObjectsRepository.deleteFromNamespaces(type, id, [namespace1])
        ).rejects.toThrowError('Unexpected Elasticsearch DELETE response');
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(client.delete).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the document during update`, async () => {
        mockGetResponse(type, id, [namespace1, namespace2]);
        client.update.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
        );
        await expectNotFoundError(type, id, [namespace1]);
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(client.update).toHaveBeenCalledTimes(1);
      });
    });

    describe('returns', () => {
      it(`returns an empty namespaces array on success (delete)`, async () => {
        const test = async (namespaces) => {
          const result = await deleteFromNamespacesSuccess(type, id, namespaces, namespaces);
          expect(result).toEqual({ namespaces: [] });
          client.delete.mockClear();
        };
        await test([namespace1]);
        await test([namespace1, namespace2]);
      });

      it(`returns remaining namespaces on success (update)`, async () => {
        const test = async (remaining) => {
          const currentNamespaces = [namespace1].concat(remaining);
          const result = await deleteFromNamespacesSuccess(
            type,
            id,
            [namespace1],
            currentNamespaces
          );
          expect(result).toEqual({ namespaces: remaining });
          client.delete.mockClear();
        };
        await test([namespace2]);
        await test([namespace2, namespace3]);
      });

      it(`succeeds when the document doesn't exist in all of the targeted namespaces`, async () => {
        const namespaces = [namespace2];
        const currentNamespaces = [namespace1];
        const result = await deleteFromNamespacesSuccess(type, id, namespaces, currentNamespaces);
        expect(result).toEqual({ namespaces: currentNamespaces });
      });
    });
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

    const updateSuccess = async (type, id, attributes, options, includeOriginId) => {
      if (registry.isMultiNamespace(type)) {
        const mockGetResponse = getMockGetResponse({ type, id, namespace: options?.namespace });
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(mockGetResponse)
        );
      }
      client.update.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
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
        })
      );
      const result = await savedObjectsRepository.update(type, id, attributes, options);
      expect(client.get).toHaveBeenCalledTimes(registry.isMultiNamespace(type) ? 1 : 0);
      return result;
    };

    describe('client calls', () => {
      it(`should use the ES get action then update action when type is multi-namespace`, async () => {
        await updateSuccess(MULTI_NAMESPACE_TYPE, id, attributes);
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(client.update).toHaveBeenCalledTimes(1);
      });

      it(`should use the ES update action when type is not multi-namespace`, async () => {
        await updateSuccess(type, id, attributes);
        expect(client.update).toHaveBeenCalledTimes(1);
      });

      it(`defaults to no references array`, async () => {
        await updateSuccess(type, id, attributes);
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            body: { doc: expect.not.objectContaining({ references: expect.anything() }) },
          }),
          expect.anything()
        );
      });

      it(`accepts custom references array`, async () => {
        const test = async (references) => {
          await updateSuccess(type, id, attributes, { references });
          expect(client.update).toHaveBeenCalledWith(
            expect.objectContaining({
              body: { doc: expect.objectContaining({ references }) },
            }),
            expect.anything()
          );
          client.update.mockClear();
        };
        await test(references);
        await test(['string']);
        await test([]);
      });

      it(`doesn't accept custom references if not an array`, async () => {
        const test = async (references) => {
          await updateSuccess(type, id, attributes, { references });
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
        await updateSuccess(type, id, { foo: 'bar' });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            refresh: 'wait_for',
          }),
          expect.anything()
        );
      });

      it(`defaults to the version of the existing document when type is multi-namespace`, async () => {
        await updateSuccess(MULTI_NAMESPACE_TYPE, id, attributes, { references });
        const versionProperties = {
          if_seq_no: mockVersionProps._seq_no,
          if_primary_term: mockVersionProps._primary_term,
        };
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining(versionProperties),
          expect.anything()
        );
      });

      it(`accepts version`, async () => {
        await updateSuccess(type, id, attributes, {
          version: encodeHitVersion({ _seq_no: 100, _primary_term: 200 }),
        });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({ if_seq_no: 100, if_primary_term: 200 }),
          expect.anything()
        );
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        await updateSuccess(type, id, attributes, { namespace });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({ id: expect.stringMatching(`${namespace}:${type}:${id}`) }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        await updateSuccess(type, id, attributes, { references });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({ id: expect.stringMatching(`${type}:${id}`) }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        await updateSuccess(NAMESPACE_AGNOSTIC_TYPE, id, attributes, { namespace });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: expect.stringMatching(`${NAMESPACE_AGNOSTIC_TYPE}:${id}`),
          }),
          expect.anything()
        );

        client.update.mockClear();
        await updateSuccess(MULTI_NAMESPACE_TYPE, id, attributes, { namespace });
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({ id: expect.stringMatching(`${MULTI_NAMESPACE_TYPE}:${id}`) }),
          expect.anything()
        );
      });

      it(`includes _source_includes when type is multi-namespace`, async () => {
        await updateSuccess(MULTI_NAMESPACE_TYPE, id, attributes);
        expect(client.update).toHaveBeenCalledWith(
          expect.objectContaining({ _source_includes: ['namespace', 'namespaces', 'originId'] }),
          expect.anything()
        );
      });

      it(`includes _source_includes when type is not multi-namespace`, async () => {
        await updateSuccess(type, id, attributes);
        expect(client.update).toHaveBeenLastCalledWith(
          expect.objectContaining({
            _source_includes: ['namespace', 'namespaces', 'originId'],
          }),
          expect.anything()
        );
      });
    });

    describe('errors', () => {
      const expectNotFoundError = async (type, id) => {
        await expect(savedObjectsRepository.update(type, id)).rejects.toThrowError(
          createGenericNotFoundError(type, id)
        );
      };

      it(`throws when type is invalid`, async () => {
        await expectNotFoundError('unknownType', id);
        expect(client.update).not.toHaveBeenCalled();
      });

      it(`throws when type is hidden`, async () => {
        await expectNotFoundError(HIDDEN_TYPE, id);
        expect(client.update).not.toHaveBeenCalled();
      });

      it(`throws when ES is unable to find the document during get`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({ found: false })
        );
        await expectNotFoundError(MULTI_NAMESPACE_TYPE, id);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the index during get`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
        );
        await expectNotFoundError(MULTI_NAMESPACE_TYPE, id);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when type is multi-namespace and the document exists, but not in this namespace`, async () => {
        const response = getMockGetResponse({ type: MULTI_NAMESPACE_TYPE, id, namespace });
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        await expectNotFoundError(MULTI_NAMESPACE_TYPE, id, { namespace: 'bar-namespace' });
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the document during update`, async () => {
        client.update.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
        );
        await expectNotFoundError(type, id);
        expect(client.update).toHaveBeenCalledTimes(1);
      });
    });

    describe('returns', () => {
      it(`returns _seq_no and _primary_term encoded as version`, async () => {
        const result = await updateSuccess(type, id, attributes, {
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
        const result = await updateSuccess(MULTI_NAMESPACE_TYPE, id, attributes);
        expect(result).toMatchObject({
          namespaces: expect.any(Array),
        });
      });

      it(`includes namespaces if type is not multi-namespace`, async () => {
        const result = await updateSuccess(type, id, attributes);
        expect(result).toMatchObject({
          namespaces: ['default'],
        });
      });

      it(`includes originId property if present in cluster call response`, async () => {
        const result = await updateSuccess(type, id, attributes, {}, true);
        expect(result).toMatchObject({ originId });
      });
    });
  });
});
