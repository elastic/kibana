/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createVisualizeAppState } from './create_visualize_app_state';
import { migrateAppState } from './migrate_app_state';
import { visualizeAppStateStub } from './stubs';

const mockStartStateSync = vi.fn();
const mockStopStateSync = vi.fn();

vi.mock('@kbn/kibana-utils-plugin/public', () => {
      const mocked = {
      createStateContainer: vi.fn(() => 'stateContainer'),
      syncState: vi.fn(() => ({
        start: mockStartStateSync,
        stop: mockStopStateSync,
      })),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./migrate_app_state', () => {
      const mocked = {
      migrateAppState: vi.fn(() => 'migratedAppState'),
    };
      return { ...mocked, default: mocked };
    });

const { createStateContainer, syncState } = (await vi.importMock('@kbn/kibana-utils-plugin/public'));

describe('createVisualizeAppState', () => {
  const kbnUrlStateStorage = {
    set: vi.fn(),
    get: vi.fn(() => ({ linked: false })),
  } as unknown as IKbnUrlStateStorage;

  const { stateContainer, stopStateSync } = createVisualizeAppState({
    stateDefaults: visualizeAppStateStub,
    kbnUrlStateStorage,
  });
  const transitions = createStateContainer.mock.calls[0][1];

  test('should initialize visualize app state', () => {
    expect(kbnUrlStateStorage.get).toHaveBeenCalledWith('_a');
    expect(migrateAppState).toHaveBeenCalledWith({
      ...visualizeAppStateStub,
      linked: false,
    });
    expect(kbnUrlStateStorage.set).toHaveBeenCalledWith('_a', 'migratedAppState', {
      replace: true,
    });
    expect(createStateContainer).toHaveBeenCalled();
    expect(syncState).toHaveBeenCalled();
    expect(mockStartStateSync).toHaveBeenCalled();
  });

  test('should return the stateContainer and stopStateSync', () => {
    expect(stateContainer).toBe('stateContainer');
    stopStateSync();
    expect(stopStateSync).toHaveBeenCalledTimes(1);
  });

  describe('stateContainer transitions', () => {
    test('set', () => {
      const newQuery = { query: '', language: '' };
      expect(transitions.set(visualizeAppStateStub)('query', newQuery)).toEqual({
        ...visualizeAppStateStub,
        query: newQuery,
      });
    });

    test('setVis', () => {
      const newVis = { data: 'data' };
      expect(transitions.setVis(visualizeAppStateStub)(newVis)).toEqual({
        ...visualizeAppStateStub,
        vis: {
          ...visualizeAppStateStub.vis,
          ...newVis,
        },
      });
    });

    test('unlinkSavedSearch', () => {
      const params = {
        query: { query: '', language: '' },
        parentFilters: [{ test: 'filter2' }],
      };
      expect(transitions.unlinkSavedSearch(visualizeAppStateStub)(params)).toEqual({
        ...visualizeAppStateStub,
        query: params.query,
        filters: [...visualizeAppStateStub.filters, { test: 'filter2' }],
        linked: false,
      });
    });

    test('updateVisState: should not include resctricted param types', () => {
      const newVisState = {
        a: 1,
        _b: 2,
        $c: 3,
        d: () => {},
      };
      expect(transitions.updateVisState(visualizeAppStateStub)(newVisState)).toEqual({
        ...visualizeAppStateStub,
        vis: { a: 1 },
      });
    });

    test('updateSavedQuery: add savedQuery', () => {
      const savedQueryId = '123test';
      expect(transitions.updateSavedQuery(visualizeAppStateStub)(savedQueryId)).toEqual({
        ...visualizeAppStateStub,
        savedQuery: savedQueryId,
      });
    });

    test('updateSavedQuery: remove savedQuery from state', () => {
      const savedQueryId = '123test';
      expect(
        transitions.updateSavedQuery({ ...visualizeAppStateStub, savedQuery: savedQueryId })()
      ).toEqual(visualizeAppStateStub);
    });
  });
});
