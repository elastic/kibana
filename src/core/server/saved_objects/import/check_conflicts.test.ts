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

import {
  SavedObjectsClientContract,
  SavedObjectReference,
  SavedObject,
  SavedObjectsImportRetry,
  SavedObjectsImportError,
} from '../types';
import { checkConflicts, getImportIdMapForRetries } from './check_conflicts';
import { savedObjectsClientMock } from '../../mocks';
import { typeRegistryMock } from '../saved_objects_type_registry.mock';
import { ISavedObjectTypeRegistry } from '..';

type SavedObjectType = SavedObject<{ title?: string }>;
type CheckConflictsOptions = Parameters<typeof checkConflicts>[1];
type GetImportIdMapForRetriesOptions = Parameters<typeof getImportIdMapForRetries>[1];

/**
 * Function to create a realistic-looking import object given a type, ID, and optional originId
 */
const createObject = (type: string, id: string, originId?: string): SavedObjectType => ({
  type,
  id,
  attributes: { title: `Title for ${type}:${id}` },
  references: (Symbol() as unknown) as SavedObjectReference[],
  ...(originId && { originId }),
});

const MULTI_NS_TYPE = 'multi';
const OTHER_TYPE = 'other';

describe('#checkConflicts', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let typeRegistry: jest.Mocked<ISavedObjectTypeRegistry>;
  let find: typeof savedObjectsClient['find'];

  const getResultMock = (...objects: SavedObjectType[]) => ({
    page: 1,
    per_page: 10,
    total: objects.length,
    saved_objects: objects,
  });

  const setupOptions = (namespace?: string): CheckConflictsOptions => {
    savedObjectsClient = savedObjectsClientMock.create();
    find = savedObjectsClient.find;
    find.mockResolvedValue(getResultMock()); // mock zero hits response by default
    typeRegistry = typeRegistryMock.create();
    typeRegistry.isMultiNamespace.mockImplementation((type) => type === MULTI_NS_TYPE);
    return { savedObjectsClient, typeRegistry, namespace };
  };

  const mockFindResult = (...objects: SavedObjectType[]) => {
    find.mockResolvedValueOnce(getResultMock(...objects));
  };

  describe('cluster calls', () => {
    const multiNsObj = createObject(MULTI_NS_TYPE, 'id-1');
    const multiNsObjWithOriginId = createObject(MULTI_NS_TYPE, 'id-2', 'originId-foo');
    const otherObj = createObject(OTHER_TYPE, 'id-3');
    // non-multi-namespace types shouldn't have origin IDs, but we include a test case to ensure it's handled gracefully
    const otherObjWithOriginId = createObject(OTHER_TYPE, 'id-4', 'originId-bar');

    const expectFindArgs = (n: number, object: SavedObject, rawIdPrefix: string) => {
      const { type, id, originId } = object;
      const search = `"${rawIdPrefix}${type}:${originId || id}" | "${originId || id}"`; // this template works for our basic test cases
      const expectedOptions = expect.objectContaining({ type, search });
      // exclude rawSearchFields, page, perPage, and fields attributes from assertion -- these are constant
      // exclude namespace from assertion -- a separate test covers that
      expect(find).toHaveBeenNthCalledWith(n, expectedOptions);
    };

    test('does not execute searches for non-multi-namespace objects', async () => {
      const objects = [otherObj, otherObjWithOriginId];
      const options = setupOptions();

      await checkConflicts(objects, options);
      expect(find).not.toHaveBeenCalled();
    });

    test('executes searches for multi-namespace objects', async () => {
      const objects = [multiNsObj, otherObj, multiNsObjWithOriginId, otherObjWithOriginId];
      const options1 = setupOptions();

      await checkConflicts(objects, options1);
      expect(find).toHaveBeenCalledTimes(2);
      expectFindArgs(1, multiNsObj, '');
      expectFindArgs(2, multiNsObjWithOriginId, '');

      find.mockClear();
      const options2 = setupOptions('some-namespace');
      await checkConflicts(objects, options2);
      expect(find).toHaveBeenCalledTimes(2);
      expectFindArgs(1, multiNsObj, 'some-namespace:');
      expectFindArgs(2, multiNsObjWithOriginId, 'some-namespace:');
    });

    test('searches within the current `namespace`', async () => {
      const objects = [multiNsObj];
      const namespace = 'some-namespace';
      const options = setupOptions(namespace);

      await checkConflicts(objects, options);
      expect(find).toHaveBeenCalledTimes(1);
      expect(find).toHaveBeenCalledWith(expect.objectContaining({ namespace }));
    });

    test('search query escapes quote and backslash characters in `id` and/or `originId`', async () => {
      const weirdId = `some"weird\\id`;
      const objects = [
        createObject(MULTI_NS_TYPE, weirdId),
        createObject(MULTI_NS_TYPE, 'some-id', weirdId),
      ];
      const options = setupOptions();

      await checkConflicts(objects, options);
      const escapedId = `some\\"weird\\\\id`;
      const expectedQuery = `"${MULTI_NS_TYPE}:${escapedId}" | "${escapedId}"`;
      expect(find).toHaveBeenCalledTimes(2);
      expect(find).toHaveBeenNthCalledWith(1, expect.objectContaining({ search: expectedQuery }));
      expect(find).toHaveBeenNthCalledWith(2, expect.objectContaining({ search: expectedQuery }));
    });
  });

  describe('results', () => {
    const getAmbiguousConflicts = (objects: SavedObjectType[]) =>
      objects
        .map(({ id, attributes, updated_at: updatedAt }) => ({
          id,
          title: attributes?.title,
          updatedAt,
        }))
        .sort((a: { id: string }, b: { id: string }) => (a.id > b.id ? 1 : b.id > a.id ? -1 : 0));
    const createAmbiguousConflictError = (
      object: SavedObjectType,
      sources: SavedObjectType[],
      destinations: SavedObjectType[]
    ): SavedObjectsImportError => ({
      type: object.type,
      id: object.id,
      title: object.attributes?.title,
      error: {
        type: 'ambiguous_conflict',
        sources: getAmbiguousConflicts(sources),
        destinations: getAmbiguousConflicts(destinations),
      },
    });

    describe('object result without a `importIdMap` entry (no match or exact match)', () => {
      test('returns object when no match is detected (0 hits)', async () => {
        // no objects exist in this space
        // try to import obj1, obj2, obj3, and obj4
        const obj1 = createObject(OTHER_TYPE, 'id-1'); // non-multi-namespace types are skipped when searching, so they will never have a match anyway
        const obj2 = createObject(OTHER_TYPE, 'id-2', 'originId-foo'); // non-multi-namespace types are skipped when searching, so they will never have a match anyway
        const obj3 = createObject(MULTI_NS_TYPE, 'id-3');
        const obj4 = createObject(MULTI_NS_TYPE, 'id-4', 'originId-bar');
        const options = setupOptions();

        // don't need to mock find results for obj3 and obj4, "no match" is the default find result in this test suite
        const checkConflictsResult = await checkConflicts([obj1, obj2, obj3, obj4], options);

        const expectedResult = {
          filteredObjects: [obj1, obj2, obj3, obj4],
          importIdMap: new Map(),
          errors: [],
        };
        expect(checkConflictsResult).toEqual(expectedResult);
      });

      test('returns object when an exact match is detected (1 hit)', async () => {
        // obj1 and obj2 exist in this space
        // try to import obj2 and obj2
        const obj1 = createObject(MULTI_NS_TYPE, 'id-1');
        const obj2 = createObject(MULTI_NS_TYPE, 'id-2', 'originId-foo');
        const options = setupOptions();
        mockFindResult(obj1); // find for obj1: the result is an exact match
        mockFindResult(obj2); // find for obj2: the result is an exact match

        const checkConflictsResult = await checkConflicts([obj1, obj2], options);
        const expectedResult = {
          filteredObjects: [obj1, obj2],
          importIdMap: new Map(),
          errors: [],
        };
        expect(checkConflictsResult).toEqual(expectedResult);
      });

      test('returns object when an exact match is detected (2+ hits)', async () => {
        // obj1, obj2, objA, and objB exist in this space
        // try to import obj1 and obj2
        const obj1 = createObject(MULTI_NS_TYPE, 'id-1');
        const objA = createObject(MULTI_NS_TYPE, 'id-3', obj1.id);
        const obj2 = createObject(MULTI_NS_TYPE, 'id-2', 'originId-foo');
        const objB = createObject(MULTI_NS_TYPE, 'id-4', obj2.originId);
        const options = setupOptions();
        mockFindResult(obj1, objA); // find for obj1: the first result is an exact match, so the second result is ignored
        mockFindResult(objB, obj2); // find for obj2: the second result is an exact match, so the first result is ignored

        const checkConflictsResult = await checkConflicts([obj1, obj2], options);
        const expectedResult = {
          filteredObjects: [obj1, obj2],
          importIdMap: new Map(),
          errors: [],
        };
        expect(checkConflictsResult).toEqual(expectedResult);
      });

      test('returns object when an inexact match is detected (1 hit) with a destination that is exactly matched by another object', async () => {
        // obj1 and obj3 exist in this space
        // try to import obj1, obj2, obj3, and obj4
        // note: this test is only concerned with obj2 and obj4, but obj1 and obj3 must be included to exercise this code path
        const obj1 = createObject(MULTI_NS_TYPE, 'id-1');
        const obj2 = createObject(MULTI_NS_TYPE, 'id-2', obj1.id);
        const obj3 = createObject(MULTI_NS_TYPE, 'id-3', 'originId-foo');
        const obj4 = createObject(MULTI_NS_TYPE, 'id-4', obj3.originId);
        const options = setupOptions();
        mockFindResult(obj1); // find for obj1: the result is an exact match
        mockFindResult(obj1); // find for obj2: the result is an inexact match with one destination that is exactly matched by obj1 so it is ignored -- accordingly, obj2 has no match
        mockFindResult(obj3); // find for obj3: the result is an exact match
        mockFindResult(obj3); // find for obj4: the result is an inexact match with one destination that is exactly matched by obj3 so it is ignored -- accordingly, obj4 has no match

        const checkConflictsResult = await checkConflicts([obj1, obj2, obj3, obj4], options);
        const expectedResult = {
          filteredObjects: [obj1, obj2, obj3, obj4],
          importIdMap: new Map(),
          errors: [],
        };
        expect(checkConflictsResult).toEqual(expectedResult);
      });

      test('returns object when an inexact match is detected (2+ hits) with destinations that are all exactly matched by another object', async () => {
        // obj1 and obj2 exist in this space
        // try to import obj1, obj2, and obj3
        const obj1 = createObject(MULTI_NS_TYPE, 'id-1');
        const obj2 = createObject(MULTI_NS_TYPE, 'id-2', obj1.id);
        const obj3 = createObject(MULTI_NS_TYPE, 'id-3', obj1.id);
        const options = setupOptions();
        mockFindResult(obj1, obj2); // find for obj1: the first result is an exact match, so the second result is ignored
        mockFindResult(obj1, obj2); // find for obj2: the second result is an exact match, so the first result is ignored
        mockFindResult(obj1, obj2); // find for obj3: the result is an inexact match with two destinations that are exactly matched by obj1 and obj2 so they are ignored -- accordingly, obj3 has no match

        const checkConflictsResult = await checkConflicts([obj1, obj2, obj3], options);
        const expectedResult = {
          filteredObjects: [obj1, obj2, obj3],
          importIdMap: new Map(),
          errors: [],
        };
        expect(checkConflictsResult).toEqual(expectedResult);
      });
    });

    describe('object result with a `importIdMap` entry (partial match with a single destination)', () => {
      test('returns object with a `importIdMap` entry when an inexact match is detected (1 hit)', async () => {
        // objA and objB exist in this space
        // try to import obj1 and obj2
        const obj1 = createObject(MULTI_NS_TYPE, 'id-1');
        const objA = createObject(MULTI_NS_TYPE, 'id-A', obj1.id);
        const obj2 = createObject(MULTI_NS_TYPE, 'id-2', 'originId-foo');
        const objB = createObject(MULTI_NS_TYPE, 'id-B', obj2.originId);
        const options = setupOptions();
        mockFindResult(objA); // find for obj1: the result is an inexact match with one destination
        mockFindResult(objB); // find for obj2: the result is an inexact match with one destination

        const checkConflictsResult = await checkConflicts([obj1, obj2], options);
        const expectedResult = {
          filteredObjects: [obj1, obj2],
          importIdMap: new Map([
            [`${obj1.type}:${obj1.id}`, { id: objA.id }],
            [`${obj2.type}:${obj2.id}`, { id: objB.id }],
          ]),
          errors: [],
        };
        expect(checkConflictsResult).toEqual(expectedResult);
      });

      test('returns object with a `importIdMap` entry when an inexact match is detected (2+ hits), with n-1 destinations that are exactly matched by another object', async () => {
        // obj1, obj3, objA, and objB exist in this space
        // try to import obj1, obj2, obj3, and obj4
        // note: this test is only concerned with obj2 and obj4, but obj1 and obj3 must be included to exercise this code path
        const obj1 = createObject(MULTI_NS_TYPE, 'id-1');
        const obj2 = createObject(MULTI_NS_TYPE, 'id-2', obj1.id);
        const objA = createObject(MULTI_NS_TYPE, 'id-A', obj1.id);
        const obj3 = createObject(MULTI_NS_TYPE, 'id-3', 'originId-foo');
        const obj4 = createObject(MULTI_NS_TYPE, 'id-4', obj3.originId);
        const objB = createObject(MULTI_NS_TYPE, 'id-B', obj3.originId);
        const options = setupOptions();
        mockFindResult(obj1, objA); // find for obj1: the first result is an exact match, so the second result is ignored
        mockFindResult(obj1, objA); // find for obj2: the result is an inexact match with two destinations, but the first destination is exactly matched by obj1 so it is ignored -- accordingly, obj2 has an inexact match with one destination (objA)
        mockFindResult(objB, obj3); // find for obj3: the second result is an exact match, so the first result is ignored
        mockFindResult(objB, obj3); // find for obj4: the result is an inexact match with two destinations, but the second destination is exactly matched by obj3 so it is ignored -- accordingly, obj4 has an inexact match with one destination (objB)

        const checkConflictsResult = await checkConflicts([obj1, obj2, obj3, obj4], options);
        const expectedResult = {
          filteredObjects: [obj1, obj2, obj3, obj4],
          importIdMap: new Map([
            [`${obj2.type}:${obj2.id}`, { id: objA.id }],
            [`${obj4.type}:${obj4.id}`, { id: objB.id }],
          ]),
          errors: [],
        };
        expect(checkConflictsResult).toEqual(expectedResult);
      });
    });

    describe('error result (ambiguous conflict)', () => {
      test('returns ambiguous_conflict error when multiple inexact matches are detected that target the same single destination', async () => {
        // objA and objB exist in this space
        // try to import obj1, obj2, obj3, and obj4
        const obj1 = createObject(MULTI_NS_TYPE, 'id-1');
        const obj2 = createObject(MULTI_NS_TYPE, 'id-2', obj1.id);
        const objA = createObject(MULTI_NS_TYPE, 'id-A', obj1.id);
        const obj3 = createObject(MULTI_NS_TYPE, 'id-3', 'originId-foo');
        const obj4 = createObject(MULTI_NS_TYPE, 'id-4', obj3.originId);
        const objB = createObject(MULTI_NS_TYPE, 'id-B', obj3.originId);
        const options = setupOptions();
        mockFindResult(objA); // find for obj1: the result is an inexact match with one destination
        mockFindResult(objA); // find for obj2: the result is an inexact match with one destination
        mockFindResult(objB); // find for obj3: the result is an inexact match with one destination
        mockFindResult(objB); // find for obj4: the result is an inexact match with one destination

        const checkConflictsResult = await checkConflicts([obj1, obj2, obj3, obj4], options);
        const expectedResult = {
          filteredObjects: [],
          importIdMap: new Map(),
          errors: [
            createAmbiguousConflictError(obj1, [obj1, obj2], [objA]),
            createAmbiguousConflictError(obj2, [obj1, obj2], [objA]),
            createAmbiguousConflictError(obj3, [obj3, obj4], [objB]),
            createAmbiguousConflictError(obj4, [obj3, obj4], [objB]),
          ],
        };
        expect(checkConflictsResult).toEqual(expectedResult);
      });

      test('returns ambiguous_conflict error when an inexact match is detected (2+ hits)', async () => {
        // objA, objB, objC, and objD exist in this space
        // try to import obj1 and obj2
        const obj1 = createObject(MULTI_NS_TYPE, 'id-1');
        const obj2 = createObject(MULTI_NS_TYPE, 'id-2', 'originId-foo');
        const objA = createObject(MULTI_NS_TYPE, 'id-A', obj1.id);
        const objB = createObject(MULTI_NS_TYPE, 'id-B', obj1.id);
        const objC = createObject(MULTI_NS_TYPE, 'id-C', obj2.originId);
        const objD = createObject(MULTI_NS_TYPE, 'id-D', obj2.originId);
        const options = setupOptions();
        mockFindResult(objA, objB); // find for obj1: the result is an inexact match with two destinations
        mockFindResult(objC, objD); // find for obj2: the result is an inexact match with two destinations

        const checkConflictsResult = await checkConflicts([obj1, obj2], options);
        const expectedResult = {
          filteredObjects: [],
          importIdMap: new Map(),
          errors: [
            createAmbiguousConflictError(obj1, [obj1], [objA, objB]),
            createAmbiguousConflictError(obj2, [obj2], [objC, objD]),
          ],
        };
        expect(checkConflictsResult).toEqual(expectedResult);
      });

      test('returns ambiguous_conflict error when multiple inexact matches are detected that target the same multiple destinations', async () => {
        // objA, objB, objC, and objD exist in this space
        // try to import obj1, obj2, obj3, and obj4
        const obj1 = createObject(MULTI_NS_TYPE, 'id-1');
        const obj2 = createObject(MULTI_NS_TYPE, 'id-2', obj1.id);
        const obj3 = createObject(MULTI_NS_TYPE, 'id-3', 'originId-foo');
        const obj4 = createObject(MULTI_NS_TYPE, 'id-4', obj3.originId);
        const objA = createObject(MULTI_NS_TYPE, 'id-A', obj1.id);
        const objB = createObject(MULTI_NS_TYPE, 'id-B', obj1.id);
        const objC = createObject(MULTI_NS_TYPE, 'id-C', obj3.originId);
        const objD = createObject(MULTI_NS_TYPE, 'id-D', obj3.originId);
        const options = setupOptions();
        mockFindResult(objA, objB); // find for obj1: the result is an inexact match with two destinations
        mockFindResult(objA, objB); // find for obj2: the result is an inexact match with two destinations
        mockFindResult(objC, objD); // find for obj3: the result is an inexact match with two destinations
        mockFindResult(objC, objD); // find for obj4: the result is an inexact match with two destinations

        const checkConflictsResult = await checkConflicts([obj1, obj2, obj3, obj4], options);
        const expectedResult = {
          filteredObjects: [],
          importIdMap: new Map(),
          errors: [
            createAmbiguousConflictError(obj1, [obj1, obj2], [objA, objB]),
            createAmbiguousConflictError(obj2, [obj1, obj2], [objA, objB]),
            createAmbiguousConflictError(obj3, [obj3, obj4], [objC, objD]),
            createAmbiguousConflictError(obj4, [obj3, obj4], [objC, objD]),
          ],
        };
        expect(checkConflictsResult).toEqual(expectedResult);
      });
    });

    test('returns mixed results', async () => {
      // obj3, objA, obB, and objC exist in this space
      // try to import obj1, obj2, obj3, obj4, obj5, obj6, and obj7
      // note: this test is non-exhaustive for different permutations of import objects and results, but prior tests exercise these more thoroughly
      const obj1 = createObject(OTHER_TYPE, 'id-1');
      const obj2 = createObject(MULTI_NS_TYPE, 'id-2');
      const obj3 = createObject(MULTI_NS_TYPE, 'id-3');
      const obj4 = createObject(MULTI_NS_TYPE, 'id-4', obj3.id);
      const obj5 = createObject(MULTI_NS_TYPE, 'id-5');
      const obj6 = createObject(MULTI_NS_TYPE, 'id-6');
      const obj7 = createObject(MULTI_NS_TYPE, 'id-7', obj6.id);
      const objA = createObject(MULTI_NS_TYPE, 'id-A', obj5.id);
      const objB = createObject(MULTI_NS_TYPE, 'id-B', obj6.id);
      const objC = createObject(MULTI_NS_TYPE, 'id-C', obj6.id);
      const options = setupOptions();
      // obj1 is a non-multi-namespace type, so it is skipped while searching
      mockFindResult(); // find for obj2: the result is no match
      mockFindResult(obj3); // find for obj3: the result is an exact match
      mockFindResult(obj3); // find for obj4: the result is an inexact match with one destination that is exactly matched by obj3 so it is ignored -- accordingly, obj4 has no match
      mockFindResult(objA); // find for obj5: the result is an inexact match with one destination
      mockFindResult(objB, objC); // find for obj6: the result is an inexact match with two destinations
      mockFindResult(objB, objC); // find for obj7: the result is an inexact match with two destinations

      const objects = [obj1, obj2, obj3, obj4, obj5, obj6, obj7];
      const checkConflictsResult = await checkConflicts(objects, options);
      const expectedResult = {
        filteredObjects: [obj1, obj2, obj3, obj4, obj5],
        importIdMap: new Map([[`${obj5.type}:${obj5.id}`, { id: objA.id }]]),
        errors: [
          createAmbiguousConflictError(obj6, [obj6, obj7], [objB, objC]),
          createAmbiguousConflictError(obj7, [obj6, obj7], [objB, objC]),
        ],
      };
      expect(checkConflictsResult).toEqual(expectedResult);
    });
  });
});

describe('#getImportIdMapForRetries', () => {
  let typeRegistry: jest.Mocked<ISavedObjectTypeRegistry>;

  const setupOptions = (retries: SavedObjectsImportRetry[]): GetImportIdMapForRetriesOptions => {
    typeRegistry = typeRegistryMock.create();
    typeRegistry.isMultiNamespace.mockImplementation((type) => type === MULTI_NS_TYPE);
    return { typeRegistry, retries };
  };

  const createOverwriteRetry = (
    { type, id }: { type: string; id: string },
    idToOverwrite?: string
  ): SavedObjectsImportRetry => {
    return { type, id, overwrite: true, idToOverwrite, replaceReferences: [] };
  };

  test('throws an error if retry is not found for an object', async () => {
    const obj1 = createObject(MULTI_NS_TYPE, 'id-1');
    const obj2 = createObject(MULTI_NS_TYPE, 'id-2');
    const retries = [createOverwriteRetry(obj1)];
    const options = setupOptions(retries);

    expect(() =>
      getImportIdMapForRetries([obj1, obj2], options)
    ).toThrowErrorMatchingInlineSnapshot(`"Retry was expected for \\"multi:id-2\\" but not found"`);
  });

  test('returns expected results', async () => {
    const obj1 = createObject(OTHER_TYPE, 'id-1');
    const obj2 = createObject(OTHER_TYPE, 'id-2');
    const obj3 = createObject(OTHER_TYPE, 'id-3');
    const obj4 = createObject(MULTI_NS_TYPE, 'id-4');
    const obj5 = createObject(MULTI_NS_TYPE, 'id-5');
    const obj6 = createObject(MULTI_NS_TYPE, 'id-6');
    const objects = [obj1, obj2, obj3, obj4, obj5, obj6];
    const retries = [
      // all three overwrite retries for non-multi-namespace types are ignored;
      // retries for non-multi-namespace these should not have `idToOverwrite` specified, but we test it here for posterity
      createOverwriteRetry(obj1),
      createOverwriteRetry(obj2, obj2.id),
      createOverwriteRetry(obj3, 'id-X'),
      createOverwriteRetry(obj4), // retries that do not have `idToOverwrite` specified are ignored
      createOverwriteRetry(obj5, obj5.id), // retries that have `id` that matches `idToOverwrite` are ignored
      createOverwriteRetry(obj6, 'id-Y'), // this retry will get added to the `importIdMap`!
    ];
    const options = setupOptions(retries);

    const checkConflictsResult = await getImportIdMapForRetries(objects, options);
    expect(checkConflictsResult).toEqual(new Map([[`${obj6.type}:${obj6.id}`, { id: 'id-Y' }]]));
  });
});
