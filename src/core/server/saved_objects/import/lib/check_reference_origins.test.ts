/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockCreateOriginQuery } from './check_reference_origins.test.mock';

import type { SavedObjectsFindResult } from '../../service';
import type { SavedObjectsClientContract } from '../../types';
import { checkReferenceOrigins, CheckReferenceOriginsParams } from './check_reference_origins';
import { savedObjectsClientMock } from '../../../mocks';
import { typeRegistryMock } from '../../saved_objects_type_registry.mock';
import { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import type { ImportStateMap } from './types';

const MULTI_NS_TYPE = 'multi';
const OTHER_TYPE = 'other';

describe('checkReferenceOrigins', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let typeRegistry: jest.Mocked<ISavedObjectTypeRegistry>;
  let find: typeof savedObjectsClient['find'];

  const getResultMock = (...objectIds: string[]) => ({
    page: 1,
    per_page: 1,
    total: objectIds.length,
    saved_objects: objectIds.map((id) => ({ id, score: 0 } as unknown as SavedObjectsFindResult)),
  });

  const setupParams = (partial: {
    namespace?: string;
    importStateMap: ImportStateMap;
  }): CheckReferenceOriginsParams => {
    savedObjectsClient = savedObjectsClientMock.create();
    find = savedObjectsClient.find;
    find.mockResolvedValue(getResultMock()); // mock zero hits response by default
    typeRegistry = typeRegistryMock.create();
    typeRegistry.isMultiNamespace.mockImplementation((type) => type === MULTI_NS_TYPE);
    return {
      ...partial,
      savedObjectsClient,
      typeRegistry,
    };
  };

  const mockFindResult = (...objectIds: string[]) => {
    // doesn't matter if the mocked result is a "realistic" object, it just needs an `id` field
    find.mockResolvedValueOnce(getResultMock(...objectIds));
  };

  describe('cluster calls', () => {
    beforeEach(() => {
      mockCreateOriginQuery.mockClear();
    });

    const expectFindArgs = (n: number, type: string, id: string) => {
      expect(mockCreateOriginQuery).toHaveBeenNthCalledWith(n, type, id);
      // exclude namespace from assertion -- a separate test covers that
      expect(find).toHaveBeenNthCalledWith(n, expect.objectContaining({ type }));
    };

    test('does not execute searches for non-multi-namespace objects', async () => {
      const params = setupParams({
        importStateMap: new Map([[`${OTHER_TYPE}:1`, { isOnlyReference: true }]]),
      });

      await checkReferenceOrigins(params);
      expect(find).not.toHaveBeenCalled();
    });

    test('does not execute searches for multi-namespace objects without the isOnlyReference attribute', async () => {
      const params = setupParams({
        importStateMap: new Map([[`${MULTI_NS_TYPE}:1`, {}]]),
      });

      await checkReferenceOrigins(params);
      expect(find).not.toHaveBeenCalled();
    });

    test('executes searches for multi-namespace objects with the isOnlyReference attribute', async () => {
      const params = setupParams({
        importStateMap: new Map([[`${MULTI_NS_TYPE}:1`, { isOnlyReference: true }]]),
      });

      await checkReferenceOrigins(params);
      expect(find).toHaveBeenCalledTimes(1);
      expectFindArgs(1, MULTI_NS_TYPE, '1');
    });

    test('executes mixed searches', async () => {
      const params = setupParams({
        importStateMap: new Map([
          [`${MULTI_NS_TYPE}:1`, {}],
          [`${MULTI_NS_TYPE}:2`, { isOnlyReference: true }],
          [`${OTHER_TYPE}:3`, { isOnlyReference: true }],
          [`${MULTI_NS_TYPE}:4`, { isOnlyReference: true }],
        ]),
      });

      await checkReferenceOrigins(params);
      expect(find).toHaveBeenCalledTimes(2);
      expectFindArgs(1, MULTI_NS_TYPE, '2');
      expectFindArgs(2, MULTI_NS_TYPE, '4');
    });

    test('searches within the current `namespace`', async () => {
      const namespace = 'some-namespace';
      const params = setupParams({
        namespace,
        importStateMap: new Map([[`${MULTI_NS_TYPE}:1`, { isOnlyReference: true }]]),
      });

      await checkReferenceOrigins(params);
      expect(find).toHaveBeenCalledTimes(1);
      expect(find).toHaveBeenCalledWith(expect.objectContaining({ namespaces: [namespace] }));
    });
  });

  describe('results', () => {
    test('does not return an entry if search resulted in 0 matches', async () => {
      const params = setupParams({
        importStateMap: new Map([[`${MULTI_NS_TYPE}:1`, { isOnlyReference: true }]]),
      });
      // mock find returns an empty search result by default

      const checkReferenceOriginsResult = await checkReferenceOrigins(params);

      const expectedResult = {
        importStateMap: new Map(),
      };
      expect(checkReferenceOriginsResult).toEqual(expectedResult);
    });

    test('does not return an entry if search resulted in 2+ matches', async () => {
      const params = setupParams({
        importStateMap: new Map([[`${MULTI_NS_TYPE}:1`, { isOnlyReference: true }]]),
      });
      mockFindResult('2', '3');

      const checkReferenceOriginsResult = await checkReferenceOrigins(params);

      const expectedResult = {
        importStateMap: new Map(),
      };
      expect(checkReferenceOriginsResult).toEqual(expectedResult);
    });

    test('does not return an entry if search resulted in 1 match with the same ID', async () => {
      const params = setupParams({
        importStateMap: new Map([[`${MULTI_NS_TYPE}:1`, { isOnlyReference: true }]]),
      });
      mockFindResult('1');

      const checkReferenceOriginsResult = await checkReferenceOrigins(params);

      const expectedResult = {
        importStateMap: new Map(),
      };
      expect(checkReferenceOriginsResult).toEqual(expectedResult);
    });

    test('returns an entry if search resulted in 1 match with a different ID', async () => {
      const params = setupParams({
        importStateMap: new Map([[`${MULTI_NS_TYPE}:1`, { isOnlyReference: true }]]),
      });
      mockFindResult('2');

      const checkReferenceOriginsResult = await checkReferenceOrigins(params);

      const expectedResult = {
        importStateMap: new Map([
          [`${MULTI_NS_TYPE}:1`, { isOnlyReference: true, destinationId: '2' }],
        ]),
      };
      expect(checkReferenceOriginsResult).toEqual(expectedResult);
    });
  });
});
