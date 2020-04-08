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

import { typeRegistryMock } from '../saved_objects_type_registry.mock';
import { savedObjectsClientMock } from '../../mocks';
import { createSavedObjects } from './create_saved_objects';
import { SavedObjectReference } from 'kibana/public';
import { ISavedObjectTypeRegistry } from '../saved_objects_type_registry';
import { SavedObjectsClientContract } from '../types';
import { SavedObjectsErrorHelpers } from '..';

// mock the implementation for createSavedObjects
jest.mock('uuid/v5', () => jest.fn().mockImplementation((name: string) => `uuidv5(${name})`));
// provide a mock function to use within test to create assertions
const generateLinkedIdMock = (id: string, namespace?: string) =>
  `uuidv5(${namespace ?? 'default'}:${id})`;

const MULTI_NS_TYPE = 'multi'; // this is used by the typeRegistry mock below
const OTHER_TYPE = 'other'; // we don't *need* to specify an "other" type, but we do so for consistency
type SavedObjectType = Parameters<typeof createSavedObjects>[0][number];
type CreateSavedObjectsOptions = Parameters<typeof createSavedObjects>[1];

/**
 * Function to create a realistic-looking import object given a type, ID, and optional originId
 */
const createObject = (type: string, id: string, originId?: string): SavedObjectType => ({
  type,
  id,
  attributes: {},
  references: (Symbol() as unknown) as SavedObjectReference[],
  ...(originId && { originId }),
});

/**
 * Create a variety of different objects to exercise different import / result scenarios
 */
const TEST_IMPORT_OBJECTS = {
  obj1: createObject(MULTI_NS_TYPE, 'id-1', 'originId-1'), // originId will be used in place of import object ID for multi-namespace types
  obj2: createObject(OTHER_TYPE, 'id-2', 'originId-2'), // originId has no bearing on other types
  obj3: createObject(MULTI_NS_TYPE, 'id-3', 'originId-3'), // originId will be used in place of import object ID for multi-namespace types
  obj4: createObject(OTHER_TYPE, 'id-4', 'originId-4'), // originId has no bearing on other types
  obj5: createObject(MULTI_NS_TYPE, 'id-5'), // originId intentionally left out
  obj6: createObject(OTHER_TYPE, 'id-6'), // originId intentionally left out
  obj7: createObject(MULTI_NS_TYPE, 'id-7', 'originId-7'), // originId will be used in place of import object ID for multi-namespace types
  obj8: createObject(OTHER_TYPE, 'id-8', 'originId-8'), // originId has no bearing on other types
};

describe('#createSavedObjects', () => {
  let typeRegistry: jest.Mocked<ISavedObjectTypeRegistry>;
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let bulkCreate: typeof savedObjectsClient['bulkCreate'];

  /**
   * Creates an options object to be used as an argument for createSavedObjects
   * Includes mock typeRegistry and savedObjectsClient
   */
  const setupOptions = (
    options: {
      namespace?: string;
      overwrite?: boolean;
    } = {}
  ): CreateSavedObjectsOptions => {
    const { namespace, overwrite } = options;
    typeRegistry = typeRegistryMock.create();
    typeRegistry.isMultiNamespace.mockImplementation(type => type === MULTI_NS_TYPE);
    savedObjectsClient = savedObjectsClientMock.create();
    bulkCreate = savedObjectsClient.bulkCreate;
    return { savedObjectsClient, typeRegistry, namespace, overwrite };
  };

  const getExpectedBulkCreateArgsObjects = (
    objects: SavedObjectType[],
    { namespace }: CreateSavedObjectsOptions,
    retry?: boolean
  ) =>
    objects.map(({ type, id, attributes, references, originId }) => ({
      type,
      id: retry
        ? `uuidv5(${namespace ?? 'default'}:${originId || id})` // this was a retry, the object should have used a linked ID (uuidv5) in the bulkCreate args
        : type === MULTI_NS_TYPE
        ? originId || id // this was not a retry, it is a multi-namespace type, expect the originId as the id in the bulkCreate args (or just the id if originId is undefined)
        : id, // this was not a retry and it is another type, expect the id in the bulkCreate args
      attributes,
      references,
      ...(originId && { originId }), // if the import object had an originId, expect it to be included in the bulkCreate args
    }));

  const expectBulkCreateArgs = {
    objects: (
      n: number,
      objects: SavedObjectType[],
      options: CreateSavedObjectsOptions,
      retry?: boolean
    ) => {
      const expectedObjects = getExpectedBulkCreateArgsObjects(objects, options, retry);
      const expectedOptions = expect.any(Object);
      expect(bulkCreate).toHaveBeenNthCalledWith(n, expectedObjects, expectedOptions);
    },
    options: (n: number, options: CreateSavedObjectsOptions) => {
      const expectedObjects = expect.any(Array);
      const expectedOptions = { namespace: options.namespace, overwrite: options.overwrite };
      expect(bulkCreate).toHaveBeenNthCalledWith(n, expectedObjects, expectedOptions);
    },
  };

  const getResultMock = {
    success: (
      { type, id, attributes, references, originId }: SavedObjectType,
      { namespace }: CreateSavedObjectsOptions
    ): SavedObjectType => ({
      type,
      id: type === MULTI_NS_TYPE ? originId || id : id,
      attributes,
      references,
      ...(originId && { originId }),
      version: 'some-version',
      updated_at: 'some-date',
      namespaces: [namespace ?? 'default'],
    }),
    conflict: (type: string, id: string) => {
      const error = SavedObjectsErrorHelpers.createConflictError(type, id).output.payload;
      return ({ type, id, error } as unknown) as SavedObjectType;
    },
    unresolvableConflict: (type: string, id: string) => {
      const conflictMock = getResultMock.conflict(type, id);
      conflictMock.error!.metadata = { isNotOverwriteable: true };
      return conflictMock;
    },
  };

  /**
   * Remap the bulkCreate results to ensure that each returned object reflects the ID of the imported object.
   * This is needed because createSavedObjects may change the ID of the object to create, but this process is opaque to consumers of the
   * API; we have to remap IDs of results so consumers can act upon them, as there is no guarantee that results will be returned in the same
   * order as they were imported in.
   * For the purposes of this test suite, the objects ARE guaranteed to be in the same order, so we do a simple loop to remap the IDs.
   */
  const remapResults = (resultObjects: SavedObjectType[], objects: SavedObjectType[]) =>
    resultObjects.map((result, i) => ({ ...result, id: objects[i].id }));

  describe('import without retries', () => {
    const { obj1, obj2, obj3, obj4, obj5, obj6, obj7, obj8 } = TEST_IMPORT_OBJECTS;
    const objects = Object.values(TEST_IMPORT_OBJECTS);

    const setupMockResults = (options: CreateSavedObjectsOptions) => {
      bulkCreate.mockResolvedValue({
        saved_objects: [
          getResultMock.success(obj1, options),
          getResultMock.success(obj2, options),
          getResultMock.conflict(obj3.type, obj3.originId!),
          getResultMock.conflict(obj4.type, obj4.id),
          getResultMock.unresolvableConflict(obj5.type, obj5.id),
          getResultMock.unresolvableConflict(obj6.type, obj6.id),
          getResultMock.success(obj7, options),
          getResultMock.success(obj8, options),
        ],
      });
    };

    test('calls bulkCreate once with input objects', async () => {
      const options = setupOptions();
      setupMockResults(options);
      await createSavedObjects(objects, options);

      expect(bulkCreate).toHaveBeenCalledTimes(1);
      expectBulkCreateArgs.objects(1, objects, options);
    });

    test('calls bulkCreate once with input options', async () => {
      const namespace = 'some-namespace';
      const overwrite = (Symbol() as unknown) as boolean;
      const options = setupOptions({ namespace, overwrite });
      setupMockResults(options);
      await createSavedObjects(objects, options);

      expect(bulkCreate).toHaveBeenCalledTimes(1);
      expectBulkCreateArgs.options(1, options);
    });

    test('returns bulkCreate results that are remapped to IDs of imported objects', async () => {
      const options = setupOptions();
      setupMockResults(options);
      const results = await createSavedObjects(objects, options);

      const bulkCreateResults = (await bulkCreate.mock.results[0].value).saved_objects;
      const expectedResults = remapResults(bulkCreateResults, objects);
      expect(results).toEqual(expectedResults);
    });
  });

  describe('import with retries', () => {
    const { obj1, obj2, obj3, obj4, obj5, obj6, obj7, obj8 } = TEST_IMPORT_OBJECTS;
    const allObjects = Object.values(TEST_IMPORT_OBJECTS);

    const setupMockResults = (options: CreateSavedObjectsOptions) => {
      bulkCreate.mockResolvedValueOnce({
        saved_objects: [
          getResultMock.success(obj1, options), // success result for multi-namespace type won't cause a retry
          getResultMock.success(obj2, options), // success result for other type won't cause a retry
          getResultMock.conflict(obj3.type, obj3.originId!), // conflict for multi-namespace type won't cause a retry
          getResultMock.conflict(obj4.type, obj4.id), // conflict for othertype won't cause a retry
          getResultMock.unresolvableConflict(obj5.type, obj5.id), // unresolvable conflict for multi-namespace type without an originId won't cause a retry
          getResultMock.unresolvableConflict(obj6.type, obj6.id), // unresolvable conflict for other type without an originId won't cause a retry
          getResultMock.unresolvableConflict(obj7.type, obj7.originId!), // unresolvable conflict for multi-namespace type with an originId WILL cause a retry!
          getResultMock.unresolvableConflict(obj8.type, obj8.id), // unresolvable conflict for other type with an originId won't cause a retry
        ],
      });
      const linkedId = generateLinkedIdMock(obj7.originId!, options.namespace);
      bulkCreate.mockResolvedValue({
        saved_objects: [
          getResultMock.success({ ...obj7, id: linkedId }, options), // retry is a success
        ],
      });
    };

    test('calls bulkCreate once with input objects, and a second time for unresolvable conflicts that have a multi-namespace type', async () => {
      const options = setupOptions();
      setupMockResults(options);
      await createSavedObjects(allObjects, options);

      expect(bulkCreate).toHaveBeenCalledTimes(2);
      expectBulkCreateArgs.objects(1, allObjects, options); // we expect to first try bulkCreate with all eight test cases
      expectBulkCreateArgs.objects(2, [obj7], options, true); // we only expect to retry bulkCreate with the positive test case
    });

    test('calls bulkCreate once with input options, and a second time with input options', async () => {
      const namespace = 'some-namespace';
      const overwrite = (Symbol() as unknown) as boolean;
      const options = setupOptions({ namespace, overwrite });
      setupMockResults(options);
      await createSavedObjects(allObjects, options);

      expect(bulkCreate).toHaveBeenCalledTimes(2);
      expectBulkCreateArgs.options(1, options);
      expectBulkCreateArgs.options(2, options);
    });

    test('returns bulkCreate results that are merged and remapped to IDs of imported objects', async () => {
      const options = setupOptions();
      setupMockResults(options);
      const results = await createSavedObjects(allObjects, options);

      const [r1, r2, r3, r4, r5, r6, , r8] = (await bulkCreate.mock.results[0].value).saved_objects;
      const [r7] = (await bulkCreate.mock.results[1].value).saved_objects;
      const mergedResults = [r1, r2, r3, r4, r5, r6, r7, r8];
      const expectedResults = remapResults(mergedResults, allObjects);
      expect(results).toEqual(expectedResults);
    });
  });
});
