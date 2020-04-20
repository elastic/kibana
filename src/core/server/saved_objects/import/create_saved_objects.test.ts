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

import { mockUuidv4 } from './__mocks__';
import { savedObjectsClientMock } from '../../mocks';
import { createSavedObjects } from './create_saved_objects';
import { SavedObjectReference } from 'kibana/public';
import { SavedObjectsClientContract } from '../types';
import { SavedObjectsErrorHelpers } from '..';

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

const MULTI_NS_TYPE = 'multi';
const OTHER_TYPE = 'other';
/**
 * Create a variety of different objects to exercise different import / result scenarios
 */
const TEST_IMPORT_OBJECTS = {
  obj1: createObject(MULTI_NS_TYPE, 'id-1', 'originId-1'), // -> success
  obj2: createObject(MULTI_NS_TYPE, 'id-2', 'originId-2'), // -> conflict
  obj3: createObject(MULTI_NS_TYPE, 'id-3', 'originId-3'), // -> unresolvable conflict
  obj4: createObject(MULTI_NS_TYPE, 'id-4'), // -> success
  obj5: createObject(MULTI_NS_TYPE, 'id-5'), // -> conflict
  obj6: createObject(MULTI_NS_TYPE, 'id-6'), // -> unresolvable conflict
  obj7: createObject(OTHER_TYPE, 'id-7', 'originId-7'), // -> success
  obj8: createObject(OTHER_TYPE, 'id-8', 'originId-8'), // -> conflict
  obj9: createObject(OTHER_TYPE, 'id-9'), // -> success
  obj10: createObject(OTHER_TYPE, 'id-10'), // -> conflict
  // non-multi-namespace types by definition cannot result in an unresolvable conflict, so we don't include test objects for those
};

describe('#createSavedObjects', () => {
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
    savedObjectsClient = savedObjectsClientMock.create();
    bulkCreate = savedObjectsClient.bulkCreate;
    return { savedObjectsClient, namespace, overwrite };
  };

  const getExpectedBulkCreateArgsObjects = (objects: SavedObjectType[], retry?: boolean) =>
    objects.map(({ type, id, attributes, references, originId }) => ({
      type,
      id: retry ? `new-id-for-${id}` : id, // if this was a retry, we regenerated the id -- this is mocked below
      attributes,
      references,
      // if the import object had an originId, and/or if we regenerated the id, expect an originId to be included in the create args
      ...((originId || retry) && { originId: originId || id }),
    }));

  const expectBulkCreateArgs = {
    objects: (n: number, objects: SavedObjectType[], retry?: boolean) => {
      const expectedObjects = getExpectedBulkCreateArgsObjects(objects, retry);
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
      id,
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
    const { obj1, obj2, obj4, obj5, obj7, obj8, obj9, obj10 } = TEST_IMPORT_OBJECTS;
    const objects = [obj1, obj2, obj4, obj5, obj7, obj8, obj9, obj10];

    const setupMockResults = (options: CreateSavedObjectsOptions) => {
      bulkCreate.mockResolvedValue({
        saved_objects: [
          getResultMock.success(obj1, options),
          getResultMock.conflict(obj2.type, obj2.id),
          // skip obj3, we aren't testing an unresolvable conflict here
          getResultMock.success(obj4, options),
          getResultMock.conflict(obj5.type, obj5.id),
          // skip obj6, we aren't testing an unresolvable conflict here
          getResultMock.success(obj7, options),
          getResultMock.conflict(obj8.type, obj8.id),
          getResultMock.success(obj9, options),
          getResultMock.conflict(obj10.type, obj10.id),
        ],
      });
    };

    const testInputObjects = async (namespace?: string) => {
      const options = setupOptions({ namespace });
      setupMockResults(options);
      await createSavedObjects(objects, options);

      expect(bulkCreate).toHaveBeenCalledTimes(1);
      expectBulkCreateArgs.objects(1, objects);
    };
    const testInputOptions = async (namespace?: string) => {
      const overwrite = (Symbol() as unknown) as boolean;
      const options = setupOptions({ namespace, overwrite });
      setupMockResults(options);
      await createSavedObjects(objects, options);

      expect(bulkCreate).toHaveBeenCalledTimes(1);
      expectBulkCreateArgs.options(1, options);
    };
    const testReturns = async (namespace?: string) => {
      const options = setupOptions({ namespace });
      setupMockResults(options);
      const results = await createSavedObjects(objects, options);

      const bulkCreateResults = (await bulkCreate.mock.results[0].value).saved_objects;
      const expectedResults = remapResults(bulkCreateResults, objects);
      expect(results).toEqual(expectedResults);
    };

    describe('with an undefined namespace', () => {
      test('calls bulkCreate once with input objects', async () => {
        await testInputObjects();
      });
      test('calls bulkCreate once with input options', async () => {
        await testInputOptions();
      });
      test('returns bulkCreate results that are remapped to IDs of imported objects', async () => {
        await testReturns();
      });
    });

    describe('with a defined namespace', () => {
      const namespace = 'some-namespace';
      test('calls bulkCreate once with input objects', async () => {
        await testInputObjects(namespace);
      });
      test('calls bulkCreate once with input options', async () => {
        await testInputOptions(namespace);
      });
      test('returns bulkCreate results that are remapped to IDs of imported objects', async () => {
        await testReturns(namespace);
      });
    });
  });

  describe('import with retries', () => {
    const { obj1, obj2, obj3, obj4, obj5, obj6, obj7, obj8, obj9, obj10 } = TEST_IMPORT_OBJECTS;
    const allObjects = Object.values(TEST_IMPORT_OBJECTS);

    const setupMockResults = (options: CreateSavedObjectsOptions) => {
      bulkCreate.mockResolvedValueOnce({
        saved_objects: [
          getResultMock.success(obj1, options),
          getResultMock.conflict(obj2.type, obj2.id),
          getResultMock.unresolvableConflict(obj3.type, obj3.id), // unresolvable conflict will cause a retry
          getResultMock.success(obj4, options),
          getResultMock.conflict(obj5.type, obj5.id),
          getResultMock.unresolvableConflict(obj6.type, obj6.id), // unresolvable conflict will cause a retry
          getResultMock.success(obj7, options),
          getResultMock.conflict(obj8.type, obj8.id),
          getResultMock.success(obj9, options),
          getResultMock.conflict(obj10.type, obj10.id),
        ],
      });
      mockUuidv4.mockReturnValueOnce(`new-id-for-${obj3.id}`);
      mockUuidv4.mockReturnValueOnce(`new-id-for-${obj6.id}`);
      bulkCreate.mockResolvedValue({
        saved_objects: [
          getResultMock.success({ ...obj3, id: `new-id-for-${obj3.id}` }, options), // retry is a success
          getResultMock.success({ ...obj6, id: `new-id-for-${obj6.id}` }, options), // retry is a success
        ],
      });
    };

    const testInputObjects = async (namespace?: string) => {
      const options = setupOptions({ namespace });
      setupMockResults(options);
      await createSavedObjects(allObjects, options);

      expect(bulkCreate).toHaveBeenCalledTimes(2);
      expectBulkCreateArgs.objects(1, allObjects); // we expect to first try bulkCreate with all ten test cases
      expectBulkCreateArgs.objects(2, [obj3, obj6], true); // we only expect to retry bulkCreate with the unresolvable conflicts
    };
    const testInputOptions = async (namespace?: string) => {
      const overwrite = (Symbol() as unknown) as boolean;
      const options = setupOptions({ namespace, overwrite });
      setupMockResults(options);
      await createSavedObjects(allObjects, options);

      expect(bulkCreate).toHaveBeenCalledTimes(2);
      expectBulkCreateArgs.options(1, options);
      expectBulkCreateArgs.options(2, options);
    };
    const testReturns = async (namespace?: string) => {
      const options = setupOptions({ namespace });
      setupMockResults(options);
      const results = await createSavedObjects(allObjects, options);

      const mockResults = bulkCreate.mock.results;
      const [r1, r2, , r4, r5, , r7, r8, r9, r10] = (await mockResults[0].value).saved_objects;
      const [r3, r6] = (await mockResults[1].value).saved_objects.map((x: SavedObjectType) => ({
        ...x,
        regeneratedId: x.id,
      }));
      const mergedResults = [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10];
      const expectedResults = remapResults(mergedResults, allObjects);
      expect(results).toEqual(expectedResults);
    };

    describe('with an undefined namespace', () => {
      test('calls bulkCreate once with input objects, and a second time for unresolvable conflicts', async () => {
        await testInputObjects();
      });
      test('calls bulkCreate once with input options, and a second time with input options', async () => {
        await testInputOptions();
      });
      test('returns bulkCreate results that are merged and remapped to IDs of imported objects', async () => {
        await testReturns();
      });
    });

    describe('with a defined namespace', () => {
      const namespace = 'some-namespace';
      test('calls bulkCreate once with input objects, and a second time for unresolvable conflicts', async () => {
        await testInputObjects(namespace);
      });
      test('calls bulkCreate once with input options, and a second time with input options', async () => {
        await testInputOptions(namespace);
      });
      test('returns bulkCreate results that are merged and remapped to IDs of imported objects', async () => {
        await testReturns(namespace);
      });
    });
  });
});
