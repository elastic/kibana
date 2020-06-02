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
import { SavedObjectsClientContract, SavedObject } from '../types';
import { SavedObjectsErrorHelpers } from '..';
import { extractErrors } from './extract_errors';

type CreateSavedObjectsOptions = Parameters<typeof createSavedObjects>[1];

/**
 * Function to create a realistic-looking import object given a type, ID, and optional originId
 */
const createObject = (type: string, id: string, originId?: string): SavedObject => ({
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
const obj1 = createObject(MULTI_NS_TYPE, 'id-1', 'originId-a'); // -> success
const obj2 = createObject(MULTI_NS_TYPE, 'id-2', 'originId-b'); // -> conflict
const obj3 = createObject(MULTI_NS_TYPE, 'id-3', 'originId-c'); // -> conflict (with known importId)
const obj4 = createObject(MULTI_NS_TYPE, 'id-4', 'originId-d'); // -> conflict (with known importId)
const obj5 = createObject(MULTI_NS_TYPE, 'id-5', 'originId-e'); // -> unresolvable conflict
const obj6 = createObject(MULTI_NS_TYPE, 'id-6'); // -> success
const obj7 = createObject(MULTI_NS_TYPE, 'id-7'); // -> conflict
const obj8 = createObject(MULTI_NS_TYPE, 'id-8'); // -> conflict (with known importId)
const obj9 = createObject(MULTI_NS_TYPE, 'id-9'); // -> unresolvable conflict
const obj10 = createObject(OTHER_TYPE, 'id-10', 'originId-f'); // -> success
const obj11 = createObject(OTHER_TYPE, 'id-11', 'originId-g'); // -> conflict
const obj12 = createObject(OTHER_TYPE, 'id-12'); // -> success
const obj13 = createObject(OTHER_TYPE, 'id-13'); // -> conflict
// non-multi-namespace types shouldn't have origin IDs, but we include test cases to ensure it's handled gracefully
// non-multi-namespace types by definition cannot result in an unresolvable conflict, so we don't include test cases for those
const importId3 = 'id-foo';
const importId4 = 'id-bar';
const importId8 = 'id-baz';
const importIdMap = new Map([
  [`${obj3.type}:${obj3.id}`, { id: importId3 }],
  [`${obj4.type}:${obj4.id}`, { id: importId4 }],
  [`${obj8.type}:${obj8.id}`, { id: importId8 }],
]);

describe('#createSavedObjects', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let bulkCreate: typeof savedObjectsClient['bulkCreate'];

  /**
   * Creates an options object to be used as an argument for createSavedObjects
   * Includes mock savedObjectsClient
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
    return { savedObjectsClient, importIdMap, namespace, overwrite };
  };

  const getExpectedBulkCreateArgsObjects = (objects: SavedObject[], retry?: boolean) =>
    objects.map(({ type, id, attributes, references, originId }) => ({
      type,
      id: retry ? `new-id-for-${id}` : id, // if this was a retry, we regenerated the id -- this is mocked below
      attributes,
      references,
      // if the import object had an originId, and/or if we regenerated the id, expect an originId to be included in the create args
      ...((originId || retry) && { originId: originId || id }),
    }));

  const expectBulkCreateArgs = {
    objects: (n: number, objects: SavedObject[], retry?: boolean) => {
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
      { type, id, attributes, references, originId }: SavedObject,
      { namespace }: CreateSavedObjectsOptions
    ): SavedObject => ({
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
      return ({ type, id, error } as unknown) as SavedObject;
    },
    unresolvableConflict: (type: string, id: string) => {
      const conflictMock = getResultMock.conflict(type, id);
      conflictMock.error!.metadata = { isNotOverwritable: true };
      return conflictMock;
    },
  };

  /**
   * Remap the bulkCreate results to ensure that each returned object reflects the ID of the imported object.
   * This is needed because createSavedObjects may change the ID of the object to create, but this process is opaque to consumers of the
   * API; we have to remap IDs of results so consumers can act upon them, as there is no guarantee that results will be returned in the same
   * order as they were imported in.
   * For the purposes of this test suite, the objects ARE guaranteed to be in the same order, so we do a simple loop to remap the IDs.
   * In addition, extract the errors out of the created objects -- since we are testing with realistic objects/errors, we can use the real
   * `extractErrors` module to do so.
   */
  const getExpectedResults = (resultObjects: SavedObject[], objects: SavedObject[]) => {
    const remappedResults = resultObjects.map((result, i) => ({ ...result, id: objects[i].id }));
    return {
      createdObjects: remappedResults.filter((obj) => !obj.error),
      errors: extractErrors(remappedResults, objects),
    };
  };

  test('exits early if there are no objects to create', async () => {
    const options = setupOptions();

    const createSavedObjectsResult = await createSavedObjects([], options);
    expect(bulkCreate).not.toHaveBeenCalled();
    expect(createSavedObjectsResult).toEqual({ createdObjects: [], errors: [] });
  });

  describe('import without retries', () => {
    const objs = [obj1, obj2, obj3, obj4, obj6, obj7, obj8, obj10, obj11, obj12, obj13];

    const setupMockResults = (options: CreateSavedObjectsOptions) => {
      bulkCreate.mockResolvedValue({
        saved_objects: [
          getResultMock.success(obj1, options),
          getResultMock.conflict(obj2.type, obj2.id),
          getResultMock.conflict(obj3.type, importId3),
          getResultMock.conflict(obj4.type, importId4),
          // skip obj5, we aren't testing an unresolvable conflict here
          getResultMock.success(obj6, options),
          getResultMock.conflict(obj7.type, obj7.id),
          getResultMock.conflict(obj8.type, importId8),
          // skip obj9, we aren't testing an unresolvable conflict here
          getResultMock.success(obj10, options),
          getResultMock.conflict(obj11.type, obj11.id),
          getResultMock.success(obj12, options),
          getResultMock.conflict(obj13.type, obj13.id),
        ],
      });
    };

    const testBulkCreateObjects = async (namespace?: string) => {
      const options = setupOptions({ namespace });
      setupMockResults(options);

      await createSavedObjects(objs, options);
      expect(bulkCreate).toHaveBeenCalledTimes(1);
      // these three objects are transformed before being created, because they are included in the `importIdMap`
      const x3 = { ...obj3, id: importId3 }; // this import object already has an originId
      const x4 = { ...obj4, id: importId4 }; // this import object already has an originId
      const x8 = { ...obj8, id: importId8, originId: obj8.id }; // this import object doesn't have an originId, so it is set before create
      const argObjs = [obj1, obj2, x3, x4, obj6, obj7, x8, obj10, obj11, obj12, obj13];
      expectBulkCreateArgs.objects(1, argObjs);
    };
    const testBulkCreateOptions = async (namespace?: string) => {
      const overwrite = (Symbol() as unknown) as boolean;
      const options = setupOptions({ namespace, overwrite });
      setupMockResults(options);

      await createSavedObjects(objs, options);
      expect(bulkCreate).toHaveBeenCalledTimes(1);
      expectBulkCreateArgs.options(1, options);
    };
    const testReturnValue = async (namespace?: string) => {
      const options = setupOptions({ namespace });
      setupMockResults(options);

      const results = await createSavedObjects(objs, options);
      const resultSavedObjects = (await bulkCreate.mock.results[0].value).saved_objects;
      const [r1, r2, r3, r4, r6, r7, r8, r10, r11, r12, r13] = resultSavedObjects;
      // these three results are transformed before being returned, because the bulkCreate attempt used different IDs for them
      const [x3, x4, x8] = [r3, r4, r8].map((x: SavedObject) => ({ ...x, newId: x.id }));
      const transformedResults = [r1, r2, x3, x4, r6, r7, x8, r10, r11, r12, r13];
      const expectedResults = getExpectedResults(transformedResults, objs);
      expect(results).toEqual(expectedResults);
    };

    describe('with an undefined namespace', () => {
      test('calls bulkCreate once with input objects', async () => {
        await testBulkCreateObjects();
      });
      test('calls bulkCreate once with input options', async () => {
        await testBulkCreateOptions();
      });
      test('returns bulkCreate results that are remapped to IDs of imported objects', async () => {
        await testReturnValue();
      });
    });

    describe('with a defined namespace', () => {
      const namespace = 'some-namespace';
      test('calls bulkCreate once with input objects', async () => {
        await testBulkCreateObjects(namespace);
      });
      test('calls bulkCreate once with input options', async () => {
        await testBulkCreateOptions(namespace);
      });
      test('returns bulkCreate results that are remapped to IDs of imported objects', async () => {
        await testReturnValue(namespace);
      });
    });
  });

  describe('import with retries', () => {
    const objs = [obj1, obj2, obj3, obj4, obj5, obj6, obj7, obj8, obj9, obj10, obj11, obj12, obj13];

    const setupMockResults = (options: CreateSavedObjectsOptions) => {
      bulkCreate.mockResolvedValueOnce({
        saved_objects: [
          getResultMock.success(obj1, options),
          getResultMock.conflict(obj2.type, obj2.id),
          getResultMock.conflict(obj3.type, importId3),
          getResultMock.conflict(obj4.type, importId4),
          getResultMock.unresolvableConflict(obj5.type, obj5.id), // unresolvable conflict will cause a retry
          getResultMock.success(obj6, options),
          getResultMock.conflict(obj7.type, obj7.id),
          getResultMock.conflict(obj8.type, importId8),
          getResultMock.unresolvableConflict(obj9.type, obj9.id), // unresolvable conflict will cause a retry
          getResultMock.success(obj10, options),
          getResultMock.conflict(obj11.type, obj11.id),
          getResultMock.success(obj12, options),
          getResultMock.conflict(obj13.type, obj13.id),
        ],
      });
      mockUuidv4.mockReturnValueOnce(`new-id-for-${obj5.id}`);
      mockUuidv4.mockReturnValueOnce(`new-id-for-${obj9.id}`);
      bulkCreate.mockResolvedValue({
        saved_objects: [
          getResultMock.success({ ...obj5, id: `new-id-for-${obj5.id}` }, options), // retry is a success
          getResultMock.success({ ...obj9, id: `new-id-for-${obj9.id}` }, options), // retry is a success
        ],
      });
    };

    const testBulkCreateObjects = async (namespace?: string) => {
      const options = setupOptions({ namespace });
      setupMockResults(options);

      await createSavedObjects(objs, options);
      expect(bulkCreate).toHaveBeenCalledTimes(2);
      // these three objects are transformed before being created, because they are included in the `importIdMap`
      const x3 = { ...obj3, id: importId3 }; // this import object already has an originId
      const x4 = { ...obj4, id: importId4 }; // this import object already has an originId
      const x8 = { ...obj8, id: importId8, originId: obj8.id }; // this import object doesn't have an originId, so it is set before create
      const argObjs = [obj1, obj2, x3, x4, obj5, obj6, obj7, x8, obj9, obj10, obj11, obj12, obj13];
      expectBulkCreateArgs.objects(1, argObjs); // we expect to first try bulkCreate with all thirteen test cases
      expectBulkCreateArgs.objects(2, [obj5, obj9], true); // we only expect to retry bulkCreate with the unresolvable conflicts
    };
    const testBulkCreateOptions = async (namespace?: string) => {
      const overwrite = (Symbol() as unknown) as boolean;
      const options = setupOptions({ namespace, overwrite });
      setupMockResults(options);

      await createSavedObjects(objs, options);
      expect(bulkCreate).toHaveBeenCalledTimes(2);
      expectBulkCreateArgs.options(1, options);
      expectBulkCreateArgs.options(2, options);
    };
    const testReturnValue = async (namespace?: string) => {
      const options = setupOptions({ namespace });
      setupMockResults(options);

      const createSavedObjectsResult = await createSavedObjects(objs, options);
      const resultSavedObjects = (await bulkCreate.mock.results[0].value).saved_objects;
      const [r1, r2, r3, r4, , r6, r7, r8, , r10, r11, r12, r13] = resultSavedObjects;
      const [r5, r9] = (await bulkCreate.mock.results[1].value).saved_objects; // these two import objects were retried, so the retry results are returned
      // these five results are transformed before being returned, because the bulkCreate attempt used different IDs for them
      const [x3, x4, x5, x8, x9] = [r3, r4, r5, r8, r9].map((x: SavedObject) => ({
        ...x,
        newId: x.id,
      }));
      const transformedResults = [r1, r2, x3, x4, x5, r6, r7, x8, x9, r10, r11, r12, r13];
      const expectedResults = getExpectedResults(transformedResults, objs);
      expect(createSavedObjectsResult).toEqual(expectedResults);
    };

    describe('with an undefined namespace', () => {
      test('calls bulkCreate once with input objects, and a second time for unresolvable conflicts', async () => {
        await testBulkCreateObjects();
      });
      test('calls bulkCreate once with input options, and a second time with input options', async () => {
        await testBulkCreateOptions();
      });
      test('returns bulkCreate results that are merged and remapped to IDs of imported objects', async () => {
        await testReturnValue();
      });
    });

    describe('with a defined namespace', () => {
      const namespace = 'some-namespace';
      test('calls bulkCreate once with input objects, and a second time for unresolvable conflicts', async () => {
        await testBulkCreateObjects(namespace);
      });
      test('calls bulkCreate once with input options, and a second time with input options', async () => {
        await testBulkCreateOptions(namespace);
      });
      test('returns bulkCreate results that are merged and remapped to IDs of imported objects', async () => {
        await testReturnValue(namespace);
      });
    });
  });
});
