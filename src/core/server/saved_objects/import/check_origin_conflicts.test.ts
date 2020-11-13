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
import {
  SavedObjectsClientContract,
  SavedObjectReference,
  SavedObject,
  SavedObjectsImportRetry,
  SavedObjectsImportError,
} from '../types';
import { checkOriginConflicts, getImportIdMapForRetries } from './check_origin_conflicts';
import { savedObjectsClientMock } from '../../mocks';
import { typeRegistryMock } from '../saved_objects_type_registry.mock';
import { ISavedObjectTypeRegistry } from '..';

type SavedObjectType = SavedObject<{ title?: string }>;
type CheckOriginConflictsParams = Parameters<typeof checkOriginConflicts>[0];

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

beforeEach(() => {
  mockUuidv4.mockClear();
});

describe('#checkOriginConflicts', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let typeRegistry: jest.Mocked<ISavedObjectTypeRegistry>;
  let find: typeof savedObjectsClient['find'];

  const getResultMock = (...objects: SavedObjectType[]) => ({
    page: 1,
    per_page: 10,
    total: objects.length,
    saved_objects: objects.map((object) => ({ ...object, score: 0 })),
  });

  const setupParams = (partial: {
    objects: SavedObjectType[];
    namespace?: string;
    importIdMap?: Map<string, unknown>;
    ignoreRegularConflicts?: boolean;
  }): CheckOriginConflictsParams => {
    savedObjectsClient = savedObjectsClientMock.create();
    find = savedObjectsClient.find;
    find.mockResolvedValue(getResultMock()); // mock zero hits response by default
    typeRegistry = typeRegistryMock.create();
    typeRegistry.isMultiNamespace.mockImplementation((type) => type === MULTI_NS_TYPE);
    return {
      importIdMap: new Map<string, unknown>(), // empty by default
      ...partial,
      savedObjectsClient,
      typeRegistry,
    };
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
      const expectedArgs = expect.objectContaining({ type, search });
      // exclude rootSearchFields, page, perPage, and fields attributes from assertion -- these are constant
      // exclude namespace from assertion -- a separate test covers that
      expect(find).toHaveBeenNthCalledWith(n, expectedArgs);
    };

    test('does not execute searches for non-multi-namespace objects', async () => {
      const objects = [otherObj, otherObjWithOriginId];
      const params = setupParams({ objects });

      await checkOriginConflicts(params);
      expect(find).not.toHaveBeenCalled();
    });

    test('executes searches for multi-namespace objects', async () => {
      const objects = [multiNsObj, otherObj, multiNsObjWithOriginId, otherObjWithOriginId];
      const params1 = setupParams({ objects });

      await checkOriginConflicts(params1);
      expect(find).toHaveBeenCalledTimes(2);
      expectFindArgs(1, multiNsObj, '');
      expectFindArgs(2, multiNsObjWithOriginId, '');

      find.mockClear();
      const params2 = setupParams({ objects, namespace: 'some-namespace' });
      await checkOriginConflicts(params2);
      expect(find).toHaveBeenCalledTimes(2);
      expectFindArgs(1, multiNsObj, 'some-namespace:');
      expectFindArgs(2, multiNsObjWithOriginId, 'some-namespace:');
    });

    test('searches within the current `namespace`', async () => {
      const objects = [multiNsObj];
      const namespace = 'some-namespace';
      const params = setupParams({ objects, namespace });

      await checkOriginConflicts(params);
      expect(find).toHaveBeenCalledTimes(1);
      expect(find).toHaveBeenCalledWith(expect.objectContaining({ namespaces: [namespace] }));
    });

    test('search query escapes quote and backslash characters in `id` and/or `originId`', async () => {
      const weirdId = `some"weird\\id`;
      const objects = [
        createObject(MULTI_NS_TYPE, weirdId),
        createObject(MULTI_NS_TYPE, 'some-id', weirdId),
      ];
      const params = setupParams({ objects });

      await checkOriginConflicts(params);
      const escapedId = `some\\"weird\\\\id`;
      const expectedQuery = `"${MULTI_NS_TYPE}:${escapedId}" | "${escapedId}"`;
      expect(find).toHaveBeenCalledTimes(2);
      expect(find).toHaveBeenNthCalledWith(1, expect.objectContaining({ search: expectedQuery }));
      expect(find).toHaveBeenNthCalledWith(2, expect.objectContaining({ search: expectedQuery }));
    });
  });

  describe('results', () => {
    const getAmbiguousConflicts = (objects: SavedObjectType[]) =>
      objects.map(({ id, attributes, updated_at: updatedAt }) => ({
        id,
        title: attributes?.title,
        updatedAt,
      }));
    const createAmbiguousConflictError = (
      object: SavedObjectType,
      destinations: SavedObjectType[]
    ): SavedObjectsImportError => ({
      type: object.type,
      id: object.id,
      title: object.attributes.title,
      meta: { title: object.attributes.title },
      error: {
        type: 'ambiguous_conflict',
        destinations: getAmbiguousConflicts(destinations),
      },
    });
    const createConflictError = (
      object: SavedObjectType,
      destinationId?: string
    ): SavedObjectsImportError => ({
      type: object.type,
      id: object.id,
      title: object.attributes?.title,
      meta: { title: object.attributes.title },
      error: {
        type: 'conflict',
        ...(destinationId && { destinationId }),
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
        const objects = [obj1, obj2, obj3, obj4];
        const params = setupParams({ objects });

        // don't need to mock find results for obj3 and obj4, "no match" is the default find result in this test suite
        const checkOriginConflictsResult = await checkOriginConflicts(params);

        const expectedResult = {
          importIdMap: new Map(),
          errors: [],
          pendingOverwrites: new Set(),
        };
        expect(checkOriginConflictsResult).toEqual(expectedResult);
      });

      test('returns object when an inexact match is detected (1 hit) with a destination that is exactly matched by another object', async () => {
        // obj1 and obj3 exist in this space
        // try to import obj1, obj2, obj3, and obj4; simulating a scenario where obj1 and obj3 were filtered out during `checkConflicts`, so we only call `checkOriginConflicts` with the remainder
        const obj1 = createObject(MULTI_NS_TYPE, 'id-1');
        const obj2 = createObject(MULTI_NS_TYPE, 'id-2', obj1.id);
        const obj3 = createObject(MULTI_NS_TYPE, 'id-3', 'originId-foo');
        const obj4 = createObject(MULTI_NS_TYPE, 'id-4', obj3.originId);
        const objects = [obj2, obj4];
        const params = setupParams({
          objects,
          importIdMap: new Map([
            [`${obj1.type}:${obj1.id}`, {}],
            [`${obj2.type}:${obj2.id}`, {}],
            [`${obj3.type}:${obj3.id}`, {}],
            [`${obj4.type}:${obj4.id}`, {}],
          ]),
        });
        mockFindResult(obj1); // find for obj2: the result is an inexact match with one destination that is exactly matched by obj1 so it is ignored -- accordingly, obj2 has no match
        mockFindResult(obj3); // find for obj4: the result is an inexact match with one destination that is exactly matched by obj3 so it is ignored -- accordingly, obj4 has no match

        const checkOriginConflictsResult = await checkOriginConflicts(params);
        const expectedResult = {
          importIdMap: new Map(),
          errors: [],
          pendingOverwrites: new Set(),
        };
        expect(checkOriginConflictsResult).toEqual(expectedResult);
      });

      test('returns object when an inexact match is detected (2+ hits) with destinations that are all exactly matched by another object', async () => {
        // obj1 and obj2 exist in this space
        // try to import obj1, obj2, and obj3; simulating a scenario where obj1 and obj2 were filtered out during `checkConflicts`, so we only call `checkOriginConflicts` with the remainder
        const obj1 = createObject(MULTI_NS_TYPE, 'id-1');
        const obj2 = createObject(MULTI_NS_TYPE, 'id-2', obj1.id);
        const obj3 = createObject(MULTI_NS_TYPE, 'id-3', obj1.id);
        const objects = [obj3];
        const params = setupParams({
          objects,
          importIdMap: new Map([
            [`${obj1.type}:${obj1.id}`, {}],
            [`${obj2.type}:${obj2.id}`, {}],
            [`${obj3.type}:${obj3.id}`, {}],
          ]),
        });
        mockFindResult(obj1, obj2); // find for obj3: the result is an inexact match with two destinations that are exactly matched by obj1 and obj2 so they are ignored -- accordingly, obj3 has no match

        const checkOriginConflictsResult = await checkOriginConflicts(params);
        const expectedResult = {
          importIdMap: new Map(),
          errors: [],
          pendingOverwrites: new Set(),
        };
        expect(checkOriginConflictsResult).toEqual(expectedResult);
      });
    });

    describe('object result with a `importIdMap` entry (partial match with a single destination)', () => {
      describe('when an inexact match is detected (1 hit)', () => {
        // objA and objB exist in this space
        // try to import obj1 and obj2
        const obj1 = createObject(MULTI_NS_TYPE, 'id-1');
        const objA = createObject(MULTI_NS_TYPE, 'id-A', obj1.id);
        const obj2 = createObject(MULTI_NS_TYPE, 'id-2', 'originId-foo');
        const objB = createObject(MULTI_NS_TYPE, 'id-B', obj2.originId);
        const objects = [obj1, obj2];

        const setup = (ignoreRegularConflicts: boolean) => {
          const params = setupParams({ objects, ignoreRegularConflicts });
          mockFindResult(objA); // find for obj1: the result is an inexact match with one destination
          mockFindResult(objB); // find for obj2: the result is an inexact match with one destination
          return params;
        };

        test('returns conflict error when ignoreRegularConflicts=false', async () => {
          const params = setup(false);
          const checkOriginConflictsResult = await checkOriginConflicts(params);
          const expectedResult = {
            importIdMap: new Map(),
            errors: [createConflictError(obj1, objA.id), createConflictError(obj2, objB.id)],
            pendingOverwrites: new Set(),
          };
          expect(checkOriginConflictsResult).toEqual(expectedResult);
        });

        test('returns object with a `importIdMap` entry when ignoreRegularConflicts=true', async () => {
          const params = setup(true);
          const checkOriginConflictsResult = await checkOriginConflicts(params);
          const expectedResult = {
            importIdMap: new Map([
              [`${obj1.type}:${obj1.id}`, { id: objA.id }],
              [`${obj2.type}:${obj2.id}`, { id: objB.id }],
            ]),
            errors: [],
            pendingOverwrites: new Set([`${obj1.type}:${obj1.id}`, `${obj2.type}:${obj2.id}`]),
          };
          expect(checkOriginConflictsResult).toEqual(expectedResult);
        });
      });

      describe('when an inexact match is detected (2+ hits), with n-1 destinations that are exactly matched by another object', () => {
        // obj1, obj3, objA, and objB exist in this space
        // try to import obj1, obj2, obj3, and obj4; simulating a scenario where obj1 and obj3 were filtered out during `checkConflicts`, so we only call `checkOriginConflicts` with the remainder
        const obj1 = createObject(MULTI_NS_TYPE, 'id-1');
        const obj2 = createObject(MULTI_NS_TYPE, 'id-2', obj1.id);
        const objA = createObject(MULTI_NS_TYPE, 'id-A', obj1.id);
        const obj3 = createObject(MULTI_NS_TYPE, 'id-3', 'originId-foo');
        const obj4 = createObject(MULTI_NS_TYPE, 'id-4', obj3.originId);
        const objB = createObject(MULTI_NS_TYPE, 'id-B', obj3.originId);
        const objects = [obj2, obj4];

        const setup = (ignoreRegularConflicts: boolean) => {
          const params = setupParams({
            objects,
            ignoreRegularConflicts,
            importIdMap: new Map([
              [`${obj1.type}:${obj1.id}`, {}],
              [`${obj2.type}:${obj2.id}`, {}],
              [`${obj3.type}:${obj3.id}`, {}],
              [`${obj4.type}:${obj4.id}`, {}],
            ]),
          });
          mockFindResult(obj1, objA); // find for obj2: the result is an inexact match with two destinations, but the first destination is exactly matched by obj1 so it is ignored -- accordingly, obj2 has an inexact match with one destination (objA)
          mockFindResult(objB, obj3); // find for obj4: the result is an inexact match with two destinations, but the second destination is exactly matched by obj3 so it is ignored -- accordingly, obj4 has an inexact match with one destination (objB)
          return params;
        };

        test('returns conflict error when ignoreRegularConflicts=false', async () => {
          const params = setup(false);
          const checkOriginConflictsResult = await checkOriginConflicts(params);
          const expectedResult = {
            importIdMap: new Map(),
            errors: [createConflictError(obj2, objA.id), createConflictError(obj4, objB.id)],
            pendingOverwrites: new Set(),
          };
          expect(checkOriginConflictsResult).toEqual(expectedResult);
        });

        test('returns object with a `importIdMap` entry when ignoreRegularConflicts=true', async () => {
          const params = setup(true);
          const checkOriginConflictsResult = await checkOriginConflicts(params);
          const expectedResult = {
            importIdMap: new Map([
              [`${obj2.type}:${obj2.id}`, { id: objA.id }],
              [`${obj4.type}:${obj4.id}`, { id: objB.id }],
            ]),
            errors: [],
            pendingOverwrites: new Set([`${obj2.type}:${obj2.id}`, `${obj4.type}:${obj4.id}`]),
          };
          expect(checkOriginConflictsResult).toEqual(expectedResult);
        });
      });
    });

    describe('ambiguous conflicts', () => {
      test('returns object with a `importIdMap` entry when multiple inexact matches are detected that target the same single destination', async () => {
        // objA and objB exist in this space
        // try to import obj1, obj2, obj3, and obj4
        const obj1 = createObject(MULTI_NS_TYPE, 'id-1');
        const obj2 = createObject(MULTI_NS_TYPE, 'id-2', obj1.id);
        const objA = createObject(MULTI_NS_TYPE, 'id-A', obj1.id);
        const obj3 = createObject(MULTI_NS_TYPE, 'id-3', 'originId-foo');
        const obj4 = createObject(MULTI_NS_TYPE, 'id-4', obj3.originId);
        const objB = createObject(MULTI_NS_TYPE, 'id-B', obj3.originId);
        const objects = [obj1, obj2, obj3, obj4];
        const params = setupParams({ objects });
        mockFindResult(objA); // find for obj1: the result is an inexact match with one destination
        mockFindResult(objA); // find for obj2: the result is an inexact match with one destination
        mockFindResult(objB); // find for obj3: the result is an inexact match with one destination
        mockFindResult(objB); // find for obj4: the result is an inexact match with one destination

        const checkOriginConflictsResult = await checkOriginConflicts(params);
        const expectedResult = {
          importIdMap: new Map([
            [`${obj1.type}:${obj1.id}`, { id: 'uuidv4', omitOriginId: true }],
            [`${obj2.type}:${obj2.id}`, { id: 'uuidv4', omitOriginId: true }],
            [`${obj3.type}:${obj3.id}`, { id: 'uuidv4', omitOriginId: true }],
            [`${obj4.type}:${obj4.id}`, { id: 'uuidv4', omitOriginId: true }],
          ]),
          errors: [],
          pendingOverwrites: new Set(),
        };
        expect(mockUuidv4).toHaveBeenCalledTimes(4);
        expect(checkOriginConflictsResult).toEqual(expectedResult);
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
        const objects = [obj1, obj2];
        const params = setupParams({ objects });
        mockFindResult(objA, objB); // find for obj1: the result is an inexact match with two destinations
        mockFindResult(objC, objD); // find for obj2: the result is an inexact match with two destinations

        const checkOriginConflictsResult = await checkOriginConflicts(params);
        const expectedResult = {
          importIdMap: new Map(),
          errors: [
            createAmbiguousConflictError(obj1, [objA, objB]),
            createAmbiguousConflictError(obj2, [objC, objD]),
          ],
          pendingOverwrites: new Set(),
        };
        expect(mockUuidv4).not.toHaveBeenCalled();
        expect(checkOriginConflictsResult).toEqual(expectedResult);
      });

      test('returns object with a `importIdMap` entry when multiple inexact matches are detected that target the same multiple destinations', async () => {
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
        const objects = [obj1, obj2, obj3, obj4];
        const params = setupParams({ objects });
        mockFindResult(objA, objB); // find for obj1: the result is an inexact match with two destinations
        mockFindResult(objA, objB); // find for obj2: the result is an inexact match with two destinations
        mockFindResult(objC, objD); // find for obj3: the result is an inexact match with two destinations
        mockFindResult(objC, objD); // find for obj4: the result is an inexact match with two destinations

        const checkOriginConflictsResult = await checkOriginConflicts(params);
        const expectedResult = {
          importIdMap: new Map([
            [`${obj1.type}:${obj1.id}`, { id: 'uuidv4', omitOriginId: true }],
            [`${obj2.type}:${obj2.id}`, { id: 'uuidv4', omitOriginId: true }],
            [`${obj3.type}:${obj3.id}`, { id: 'uuidv4', omitOriginId: true }],
            [`${obj4.type}:${obj4.id}`, { id: 'uuidv4', omitOriginId: true }],
          ]),
          errors: [],
          pendingOverwrites: new Set(),
        };
        expect(mockUuidv4).toHaveBeenCalledTimes(4);
        expect(checkOriginConflictsResult).toEqual(expectedResult);
      });
    });

    describe('mixed results', () => {
      // obj3, objA, objB, objC, objD, and objE exist in this space
      // try to import obj1, obj2, obj3, obj4, obj5, obj6, and obj7; simulating a scenario where obj3 was filtered out during `checkConflicts`, so we only call `checkOriginConflicts` with the remainder
      // note: this test is non-exhaustive for different permutations of import objects and results, but prior tests exercise these more thoroughly
      const obj1 = createObject(OTHER_TYPE, 'id-1');
      const obj2 = createObject(MULTI_NS_TYPE, 'id-2');
      const obj3 = createObject(MULTI_NS_TYPE, 'id-3');
      const obj4 = createObject(MULTI_NS_TYPE, 'id-4', obj3.id);
      const obj5 = createObject(MULTI_NS_TYPE, 'id-5');
      const obj6 = createObject(MULTI_NS_TYPE, 'id-6');
      const obj7 = createObject(MULTI_NS_TYPE, 'id-7');
      const obj8 = createObject(MULTI_NS_TYPE, 'id-8', obj7.id);
      const objA = createObject(MULTI_NS_TYPE, 'id-A', obj5.id);
      const objB = createObject(MULTI_NS_TYPE, 'id-B', obj6.id);
      const objC = createObject(MULTI_NS_TYPE, 'id-C', obj6.id);
      const objD = createObject(MULTI_NS_TYPE, 'id-D', obj7.id);
      const objE = createObject(MULTI_NS_TYPE, 'id-E', obj7.id);
      const objects = [obj1, obj2, obj4, obj5, obj6, obj7, obj8];

      const importIdMap = new Map([...objects, obj3].map(({ type, id }) => [`${type}:${id}`, {}]));

      const setup = (ignoreRegularConflicts: boolean) => {
        const params = setupParams({ objects, importIdMap, ignoreRegularConflicts });
        // obj1 is a non-multi-namespace type, so it is skipped while searching
        mockFindResult(); // find for obj2: the result is no match
        mockFindResult(obj3); // find for obj4: the result is an inexact match with one destination that is exactly matched by obj3 so it is ignored -- accordingly, obj4 has no match
        mockFindResult(objA); // find for obj5: the result is an inexact match with one destination
        mockFindResult(objB, objC); // find for obj6: the result is an inexact match with two destinations
        mockFindResult(objD, objE); // find for obj7: the result is an inexact match with two destinations
        mockFindResult(objD, objE); // find for obj8: the result is an inexact match with two destinations
        return params;
      };

      test('returns errors for regular conflicts when ignoreRegularConflicts=false', async () => {
        const params = setup(false);
        const checkOriginConflictsResult = await checkOriginConflicts(params);
        const expectedResult = {
          importIdMap: new Map([
            [`${obj7.type}:${obj7.id}`, { id: 'uuidv4', omitOriginId: true }],
            [`${obj8.type}:${obj8.id}`, { id: 'uuidv4', omitOriginId: true }],
          ]),
          errors: [
            createConflictError(obj5, objA.id),
            createAmbiguousConflictError(obj6, [objB, objC]),
          ],
          pendingOverwrites: new Set(),
        };
        expect(mockUuidv4).toHaveBeenCalledTimes(2);
        expect(checkOriginConflictsResult).toEqual(expectedResult);
      });

      test('does not return errors for regular conflicts when ignoreRegularConflicts=true', async () => {
        const params = setup(true);
        const checkOriginConflictsResult = await checkOriginConflicts(params);
        const expectedResult = {
          importIdMap: new Map([
            [`${obj5.type}:${obj5.id}`, { id: objA.id }],
            [`${obj7.type}:${obj7.id}`, { id: 'uuidv4', omitOriginId: true }],
            [`${obj8.type}:${obj8.id}`, { id: 'uuidv4', omitOriginId: true }],
          ]),
          errors: [createAmbiguousConflictError(obj6, [objB, objC])],
          pendingOverwrites: new Set([`${obj5.type}:${obj5.id}`]),
        };
        expect(mockUuidv4).toHaveBeenCalledTimes(2);
        expect(checkOriginConflictsResult).toEqual(expectedResult);
      });
    });
  });
});

describe('#getImportIdMapForRetries', () => {
  const createRetry = (
    { type, id }: { type: string; id: string },
    params: { destinationId?: string; createNewCopy?: boolean } = {}
  ): SavedObjectsImportRetry => {
    const { destinationId, createNewCopy } = params;
    return { type, id, overwrite: false, destinationId, replaceReferences: [], createNewCopy };
  };

  test('throws an error if retry is not found for an object', async () => {
    const obj1 = createObject(MULTI_NS_TYPE, 'id-1');
    const obj2 = createObject(MULTI_NS_TYPE, 'id-2');
    const objects = [obj1, obj2];
    const retries = [createRetry(obj1)];
    const params = { objects, retries, createNewCopies: false };

    expect(() => getImportIdMapForRetries(params)).toThrowErrorMatchingInlineSnapshot(
      `"Retry was expected for \\"multi:id-2\\" but not found"`
    );
  });

  test('returns expected results', async () => {
    const obj1 = createObject('type-1', 'id-1');
    const obj2 = createObject('type-2', 'id-2');
    const obj3 = createObject('type-3', 'id-3');
    const obj4 = createObject('type-4', 'id-4');
    const objects = [obj1, obj2, obj3, obj4];
    const retries = [
      createRetry(obj1), // retries that do not have `destinationId` specified are ignored
      createRetry(obj2, { destinationId: obj2.id }), // retries that have `id` that matches `destinationId` are ignored
      createRetry(obj3, { destinationId: 'id-X' }), // this retry will get added to the `importIdMap`!
      createRetry(obj4, { destinationId: 'id-Y', createNewCopy: true }), // this retry will get added to the `importIdMap`!
    ];
    const params = { objects, retries, createNewCopies: false };

    const checkOriginConflictsResult = await getImportIdMapForRetries(params);
    expect(checkOriginConflictsResult).toEqual(
      new Map([
        [`${obj3.type}:${obj3.id}`, { id: 'id-X', omitOriginId: false }],
        [`${obj4.type}:${obj4.id}`, { id: 'id-Y', omitOriginId: true }],
      ])
    );
  });

  test('omits origin ID in `importIdMap` entries when createNewCopies=true', async () => {
    const obj = createObject('type-1', 'id-1');
    const objects = [obj];
    const retries = [createRetry(obj, { destinationId: 'id-X' })];
    const params = { objects, retries, createNewCopies: true };

    const checkOriginConflictsResult = await getImportIdMapForRetries(params);
    expect(checkOriginConflictsResult).toEqual(
      new Map([[`${obj.type}:${obj.id}`, { id: 'id-X', omitOriginId: true }]])
    );
  });
});
