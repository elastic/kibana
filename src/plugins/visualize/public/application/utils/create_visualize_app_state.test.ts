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

import { IKbnUrlStateStorage } from 'src/plugins/kibana_utils/public';
import { createVisualizeAppState } from './create_visualize_app_state';
import { migrateAppState } from './migrate_app_state';
import { visualizeAppStateStub } from './stubs';

const mockStartStateSync = jest.fn();
const mockStopStateSync = jest.fn();

jest.mock('../../../../kibana_utils/public', () => ({
  createStateContainer: jest.fn(() => 'stateContainer'),
  syncState: jest.fn(() => ({
    start: mockStartStateSync,
    stop: mockStopStateSync,
  })),
}));
jest.mock('./migrate_app_state', () => ({
  migrateAppState: jest.fn(() => 'migratedAppState'),
}));

const { createStateContainer, syncState } = jest.requireMock('../../../../kibana_utils/public');

describe('createVisualizeAppState', () => {
  const kbnUrlStateStorage = ({
    set: jest.fn(),
    get: jest.fn(() => ({ linked: false })),
  } as unknown) as IKbnUrlStateStorage;

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
