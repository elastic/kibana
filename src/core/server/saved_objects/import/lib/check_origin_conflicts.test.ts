/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockCreateOriginQuery } from './check_reference_origins.test.mock';

import {
  SavedObjectsClientContract,
  SavedObjectReference,
  SavedObject,
  SavedObjectsImportFailure,
  SavedObjectsImportRetry,
} from '../../types';
import { checkOriginConflicts } from './check_origin_conflicts';
import { savedObjectsClientMock } from '../../../mocks';
import { typeRegistryMock } from '../../saved_objects_type_registry.mock';
import { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import type { ImportStateMap } from './types';

jest.mock('uuid', () => ({
  v4: () => 'uuidv4',
}));

type SavedObjectType = SavedObject<{ title?: string }>;
type CheckOriginConflictsParams = Parameters<typeof checkOriginConflicts>[0];

/**
 * Function to create a realistic-looking import object given a type, ID, optional originId, and optional updated_at
 */
const createObject = (
  type: string,
  id: string,
  originId?: string,
  updatedAt?: string
): SavedObjectType => ({
  type,
  id,
  attributes: { title: `Title for ${type}:${id}` },
  references: Symbol() as unknown as SavedObjectReference[],
  ...(originId && { originId }),
  ...(updatedAt && { updated_at: updatedAt }),
});

const MULTI_NS_TYPE = 'multi';
const OTHER_TYPE = 'other';

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
    ignoreRegularConflicts?: boolean;
    importStateMap?: ImportStateMap;
    pendingOverwrites?: Set<string>;
    retries?: SavedObjectsImportRetry[];
  }): CheckOriginConflictsParams => {
    savedObjectsClient = savedObjectsClientMock.create();
    find = savedObjectsClient.find;
    find.mockResolvedValue(getResultMock()); // mock zero hits response by default
    typeRegistry = typeRegistryMock.create();
    typeRegistry.isMultiNamespace.mockImplementation((type) => type === MULTI_NS_TYPE);
    return {
      importStateMap: new Map(), // empty by default
      pendingOverwrites: new Set<string>(), // empty by default
      ...partial,
      savedObjectsClient,
      typeRegistry,
    };
  };

  const mockFindResult = (...objects: SavedObjectType[]) => {
    find.mockResolvedValueOnce(getResultMock(...objects));
  };

  describe('cluster calls', () => {
    beforeEach(() => {
      mockCreateOriginQuery.mockClear();
    });

    const multiNsObj = createObject(MULTI_NS_TYPE, 'id-1');
    const multiNsObjWithOriginId = createObject(MULTI_NS_TYPE, 'id-2', 'originId-foo');
    const otherObj = createObject(OTHER_TYPE, 'id-3');
    // non-multi-namespace types shouldn't have origin IDs, but we include a test case to ensure it's handled gracefully
    const otherObjWithOriginId = createObject(OTHER_TYPE, 'id-4', 'originId-bar');

    const expectFindArgs = (n: number, object: SavedObject) => {
      const idToCheck = object.originId || object.id;
      expect(mockCreateOriginQuery).toHaveBeenNthCalledWith(n, object.type, idToCheck);
      // exclude namespace from assertion -- a separate test covers that
      expect(find).toHaveBeenNthCalledWith(n, expect.objectContaining({ type: object.type }));
    };

    test('does not execute searches for non-multi-namespace objects', async () => {
      const objects = [otherObj, otherObjWithOriginId];
      const params = setupParams({ objects });

      await checkOriginConflicts(params);
      expect(find).not.toHaveBeenCalled();
    });

    test('does not execute searches for multi-namespace objects that already have pending overwrites (exact match conflicts)', async () => {
      const objects = [multiNsObj, multiNsObjWithOriginId];
      const pendingOverwrites = new Set([
        `${multiNsObj.type}:${multiNsObj.id}`,
        `${multiNsObjWithOriginId.type}:${multiNsObjWithOriginId.id}`,
      ]);
      const params = setupParams({ objects, pendingOverwrites });

      await checkOriginConflicts(params);
      expect(find).not.toHaveBeenCalled();
    });

    test('does not execute searches for multi-namespace objects that have a retry with a destinationId specified', async () => {
      const objects = [multiNsObj, multiNsObjWithOriginId];
      const params = setupParams({
        objects,
        retries: [
          { type: multiNsObj.type, id: multiNsObj.id, destinationId: 'doesnt-matter' },
          {
            type: multiNsObjWithOriginId.type,
            id: multiNsObjWithOriginId.id,
            destinationId: 'doesnt-matter',
          },
        ] as SavedObjectsImportRetry[],
      });

      await checkOriginConflicts(params);
      expect(find).not.toHaveBeenCalled();
    });

    test('executes searches for multi-namespace objects', async () => {
      const objects = [multiNsObj, otherObj, multiNsObjWithOriginId, otherObjWithOriginId];
      const params1 = setupParams({ objects });

      await checkOriginConflicts(params1);
      expect(find).toHaveBeenCalledTimes(2);
      expectFindArgs(1, multiNsObj);
      expectFindArgs(2, multiNsObjWithOriginId);
    });

    test('searches within the current `namespace`', async () => {
      const objects = [multiNsObj];
      const namespace = 'some-namespace';
      const params = setupParams({ objects, namespace });

      await checkOriginConflicts(params);
      expect(find).toHaveBeenCalledTimes(1);
      expect(find).toHaveBeenCalledWith(expect.objectContaining({ namespaces: [namespace] }));
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
    ): SavedObjectsImportFailure => ({
      type: object.type,
      id: object.id,
      meta: { title: object.attributes.title },
      error: {
        type: 'ambiguous_conflict',
        destinations: getAmbiguousConflicts(destinations),
      },
    });
    const createConflictError = (
      object: SavedObjectType,
      destinationId?: string
    ): SavedObjectsImportFailure => ({
      type: object.type,
      id: object.id,
      meta: { title: object.attributes.title },
      error: {
        type: 'conflict',
        ...(destinationId && { destinationId }),
      },
    });

    test('filters inexact matches of other objects that are being imported, but does not filter inexact matches of references that are not being imported', async () => {
      // obj1, obj2, and obj3 exist in this space, and obj1 has references to both obj2 and obj3
      // try to import obj1, obj2, and obj4; simulating a scenario where obj1 and obj2 were filtered out during `checkConflicts`, so we only call `checkOriginConflicts` with the remainder
      const obj1 = createObject(MULTI_NS_TYPE, 'id-1');
      const obj2 = createObject(MULTI_NS_TYPE, 'id-2', 'some-originId');
      const obj3 = createObject(MULTI_NS_TYPE, 'id-3', 'some-originId');
      const obj4 = createObject(MULTI_NS_TYPE, 'id-4', 'some-originId');
      const objects = [obj4];
      const params = setupParams({
        objects,
        importStateMap: new Map([
          [`${obj1.type}:${obj1.id}`, {}],
          [`${obj2.type}:${obj2.id}`, {}],
          [`${obj3.type}:${obj3.id}`, { isOnlyReference: true }], // this attribute signifies that there is a reference to this object, but it is not present in the collected objects from the import file
          [`${obj4.type}:${obj4.id}`, {}],
        ]),
      });
      mockFindResult(obj2, obj3); // find for obj4: the result is an inexact match with two destinations, one of which is exactly matched by obj2 -- accordingly, obj4 has an inexact match to obj3

      const checkOriginConflictsResult = await checkOriginConflicts(params);
      const expectedResult = {
        importStateMap: new Map(),
        errors: [createConflictError(obj4, obj3.id)],
        pendingOverwrites: new Set(),
      };
      expect(checkOriginConflictsResult).toEqual(expectedResult);
    });

    describe('retries', () => {
      // retries are only defined when called from resolveSavedObjectsImportErrors
      test('filters inexact matches of other retries ("retryDestinations" check)', async () => {
        // obj1 and obj2 exist in this space
        // try to import obj3 and obj4; simulating a scenario where they both share an origin, but obj3 is being retried with the
        // destinationId of obj1, and obj2 is being retried without a destinationId
        const obj1 = createObject(MULTI_NS_TYPE, 'id-1', 'some-originId');
        const obj2 = createObject(MULTI_NS_TYPE, 'id-2', 'some-originId');
        const obj3 = createObject(MULTI_NS_TYPE, 'id-3', 'some-originId');
        const obj4 = createObject(MULTI_NS_TYPE, 'id-4', 'some-originId');
        const objects = [obj3, obj4];
        const params = setupParams({
          objects,
          importStateMap: new Map([
            [`${obj3.type}:${obj3.id}`, {}],
            [`${obj4.type}:${obj4.id}`, {}],
          ]),
          pendingOverwrites: new Set([`${obj3.type}:${obj3.id}`]),
          retries: [
            { type: obj3.type, id: obj3.id, destinationId: obj1.id, overwrite: true }, // if obj1 already exists, this would have had to have overwrite=true to pass the earlier call to checkConflicts without an error
            { type: obj4.type, id: obj4.id },
          ] as SavedObjectsImportRetry[],
        });
        // find is skipped for obj1 because it has a retry with a destinationId
        mockFindResult(obj1, obj2); // find for obj4: the result is an inexact match with two destinations, but obj1 is matched by obj3 -- accordingly, obj4 has an inexact match to obj2

        const checkOriginConflictsResult = await checkOriginConflicts(params);
        const expectedResult = {
          importStateMap: new Map(),
          errors: [createConflictError(obj4, obj2.id)],
          pendingOverwrites: new Set(), // does not capture obj3 because that would have been captured in pendingOverwrites for the checkConflicts function
        };
        expect(checkOriginConflictsResult).toEqual(expectedResult);
      });

      test('does not return a conflict error when a retry has overwrite=true', async () => {
        // obj1 exists in this space
        // try to import 2; simulating a scenario where they both share an origin
        const obj1 = createObject(MULTI_NS_TYPE, 'id-1', 'some-originId');
        const obj2 = createObject(MULTI_NS_TYPE, 'id-2', 'some-originId');
        const objects = [obj2];
        const params = setupParams({
          objects,
          importStateMap: new Map([[`${obj2.type}:${obj2.id}`, {}]]),
          pendingOverwrites: new Set(), // obj2 wouldn't be included in pendingOverwrites from the earlier call to checkConflicts because obj2 doesn't exist
          retries: [{ type: obj2.type, id: obj2.id, overwrite: true }] as SavedObjectsImportRetry[],
        });
        mockFindResult(obj1); // find for obj2: the result is an inexact match with one destination -- accordingly, obj2 has an inexact match to obj1

        const checkOriginConflictsResult = await checkOriginConflicts(params);
        const expectedResult = {
          importStateMap: new Map([[`${obj2.type}:${obj2.id}`, { destinationId: obj1.id }]]),
          errors: [],
          pendingOverwrites: new Set([`${obj2.type}:${obj2.id}`]),
        };
        expect(checkOriginConflictsResult).toEqual(expectedResult);
      });
    });

    describe('object result without a `importStateMap` entry (no match or exact match)', () => {
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
          importStateMap: new Map(),
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
          importStateMap: new Map([
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
          importStateMap: new Map(),
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
          importStateMap: new Map([
            [`${obj1.type}:${obj1.id}`, {}],
            [`${obj2.type}:${obj2.id}`, {}],
            [`${obj3.type}:${obj3.id}`, {}],
          ]),
        });
        mockFindResult(obj1, obj2); // find for obj3: the result is an inexact match with two destinations that are exactly matched by obj1 and obj2 so they are ignored -- accordingly, obj3 has no match

        const checkOriginConflictsResult = await checkOriginConflicts(params);
        const expectedResult = {
          importStateMap: new Map(),
          errors: [],
          pendingOverwrites: new Set(),
        };
        expect(checkOriginConflictsResult).toEqual(expectedResult);
      });
    });

    describe('object result with a `importStateMap` entry (partial match with a single destination)', () => {
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
            importStateMap: new Map(),
            errors: [createConflictError(obj1, objA.id), createConflictError(obj2, objB.id)],
            pendingOverwrites: new Set(),
          };
          expect(checkOriginConflictsResult).toEqual(expectedResult);
        });

        test('returns object with a `importStateMap` entry when ignoreRegularConflicts=true', async () => {
          const params = setup(true);
          const checkOriginConflictsResult = await checkOriginConflicts(params);
          const expectedResult = {
            importStateMap: new Map([
              [`${obj1.type}:${obj1.id}`, { destinationId: objA.id }],
              [`${obj2.type}:${obj2.id}`, { destinationId: objB.id }],
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
            importStateMap: new Map([
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
            importStateMap: new Map(),
            errors: [createConflictError(obj2, objA.id), createConflictError(obj4, objB.id)],
            pendingOverwrites: new Set(),
          };
          expect(checkOriginConflictsResult).toEqual(expectedResult);
        });

        test('returns object with a `importStateMap` entry when ignoreRegularConflicts=true', async () => {
          const params = setup(true);
          const checkOriginConflictsResult = await checkOriginConflicts(params);
          const expectedResult = {
            importStateMap: new Map([
              [`${obj2.type}:${obj2.id}`, { destinationId: objA.id }],
              [`${obj4.type}:${obj4.id}`, { destinationId: objB.id }],
            ]),
            errors: [],
            pendingOverwrites: new Set([`${obj2.type}:${obj2.id}`, `${obj4.type}:${obj4.id}`]),
          };
          expect(checkOriginConflictsResult).toEqual(expectedResult);
        });
      });
    });

    describe('ambiguous conflicts', () => {
      test('returns object with a `importStateMap` entry when multiple inexact matches are detected that target the same single destination', async () => {
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
          importStateMap: new Map([
            [`${obj1.type}:${obj1.id}`, { destinationId: 'uuidv4', omitOriginId: true }],
            [`${obj2.type}:${obj2.id}`, { destinationId: 'uuidv4', omitOriginId: true }],
            [`${obj3.type}:${obj3.id}`, { destinationId: 'uuidv4', omitOriginId: true }],
            [`${obj4.type}:${obj4.id}`, { destinationId: 'uuidv4', omitOriginId: true }],
          ]),
          errors: [],
          pendingOverwrites: new Set(),
        };
        expect(checkOriginConflictsResult).toEqual(expectedResult);
      });

      test('returns ambiguous_conflict error when an inexact match is detected (2+ hits)', async () => {
        // objA, objB, objC, and objD exist in this space
        // try to import obj1 and obj2
        const obj1 = createObject(MULTI_NS_TYPE, 'id-1');
        const obj2 = createObject(MULTI_NS_TYPE, 'id-2', 'originId-foo');
        const objA = createObject(MULTI_NS_TYPE, 'id-A', obj1.id, '2017-09-21T18:59:16.270Z');
        const objB = createObject(MULTI_NS_TYPE, 'id-B', obj1.id, '2021-08-10T13:21:44.135Z');
        const objC = createObject(MULTI_NS_TYPE, 'id-C', obj2.originId);
        const objD = createObject(MULTI_NS_TYPE, 'id-D', obj2.originId);
        const objects = [obj1, obj2];
        const params = setupParams({ objects });
        mockFindResult(objA, objB); // find for obj1: the result is an inexact match with two destinations
        mockFindResult(objD, objC); // find for obj2: the result is an inexact match with two destinations

        const checkOriginConflictsResult = await checkOriginConflicts(params);
        const expectedResult = {
          importStateMap: new Map(),
          errors: [
            createAmbiguousConflictError(obj1, [objB, objA]), // Assert that these have been sorted by updatedAt in descending order
            createAmbiguousConflictError(obj2, [objC, objD]), // Assert that these have been sorted by ID in ascending order (since their updatedAt values are the same)
          ],
          pendingOverwrites: new Set(),
        };
        expect(checkOriginConflictsResult).toEqual(expectedResult);
      });

      test('returns object with a `importStateMap` entry when multiple inexact matches are detected that target the same multiple destinations', async () => {
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
          importStateMap: new Map([
            [`${obj1.type}:${obj1.id}`, { destinationId: 'uuidv4', omitOriginId: true }],
            [`${obj2.type}:${obj2.id}`, { destinationId: 'uuidv4', omitOriginId: true }],
            [`${obj3.type}:${obj3.id}`, { destinationId: 'uuidv4', omitOriginId: true }],
            [`${obj4.type}:${obj4.id}`, { destinationId: 'uuidv4', omitOriginId: true }],
          ]),
          errors: [],
          pendingOverwrites: new Set(),
        };
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

      const importStateMap = new Map(
        [...objects, obj3].map(({ type, id }) => [`${type}:${id}`, {}])
      );

      const setup = (ignoreRegularConflicts: boolean) => {
        const params = setupParams({ objects, importStateMap, ignoreRegularConflicts });
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
          importStateMap: new Map([
            [`${obj7.type}:${obj7.id}`, { destinationId: 'uuidv4', omitOriginId: true }],
            [`${obj8.type}:${obj8.id}`, { destinationId: 'uuidv4', omitOriginId: true }],
          ]),
          errors: [
            createConflictError(obj5, objA.id),
            createAmbiguousConflictError(obj6, [objB, objC]),
          ],
          pendingOverwrites: new Set(),
        };
        expect(checkOriginConflictsResult).toEqual(expectedResult);
      });

      test('does not return errors for regular conflicts when ignoreRegularConflicts=true', async () => {
        const params = setup(true);
        const checkOriginConflictsResult = await checkOriginConflicts(params);
        const expectedResult = {
          importStateMap: new Map([
            [`${obj5.type}:${obj5.id}`, { destinationId: objA.id }],
            [`${obj7.type}:${obj7.id}`, { destinationId: 'uuidv4', omitOriginId: true }],
            [`${obj8.type}:${obj8.id}`, { destinationId: 'uuidv4', omitOriginId: true }],
          ]),
          errors: [createAmbiguousConflictError(obj6, [objB, objC])],
          pendingOverwrites: new Set([`${obj5.type}:${obj5.id}`]),
        };
        expect(checkOriginConflictsResult).toEqual(expectedResult);
      });
    });
  });
});
