/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { internalStateActions, selectTab } from '..';
import { DataSourceType } from '../../../../../../common/data_sources';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { fromTabStateToSavedObjectTab } from '../tab_mapping_utils';
import { getTabStateMock } from '../__mocks__/internal_state.mocks';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';

const setup = async () => {
  const services = createDiscoverServicesMock();
  const { internalState, initializeTabs, initializeSingleTab } = getDiscoverInternalStateMock({
    services,
    persistedDataViews: [dataViewMockWithTimeField],
  });

  // Create a persisted tab with ES|QL query
  const persistedTab = fromTabStateToSavedObjectTab({
    tab: getTabStateMock({
      id: 'test-tab',
      initialInternalState: {
        serializedSearchSource: {
          index: dataViewMockWithTimeField.id,
          query: { esql: 'FROM test-index' },
        },
      },
      appState: {
        query: { esql: 'FROM test-index' },
        columns: ['field1', 'field2'],
        dataSource: {
          type: DataSourceType.Esql,
        },
        sort: [['@timestamp', 'desc']],
        interval: 'auto',
        hideChart: false,
      },
    }),
    timeRestore: false,
    services,
  });

  const persistedDiscoverSession = createDiscoverSessionMock({
    id: 'test-session',
    tabs: [persistedTab],
  });

  await initializeTabs({ persistedDiscoverSession });
  await initializeSingleTab({ tabId: persistedTab.id });

  return {
    internalState,
    tabId: persistedTab.id,
  };
};

describe('tab_state actions', () => {
  describe('transitionFromESQLToDataView', () => {
    it('should transition from ES|QL mode to Data View mode', async () => {
      const { internalState, tabId } = await setup();
      const dataViewId = 'test-data-view-id';
      let state = internalState.getState();
      let tab = selectTab(state, tabId);

      expect(tab.appState.query).toStrictEqual({ esql: 'FROM test-index' });
      expect(tab.appState.columns).toHaveLength(2);
      expect(tab.appState.dataSource).toStrictEqual({
        type: DataSourceType.Esql,
      });

      // Transition to data view mode
      internalState.dispatch(
        internalStateActions.transitionFromESQLToDataView({
          tabId,
          dataViewId,
        })
      );

      // Get the updated tab state
      state = internalState.getState();
      tab = selectTab(state, tabId);

      // Verify the state was updated correctly
      expect(tab.appState.query).toStrictEqual({
        language: 'kuery',
        query: '',
      });
      expect(tab.appState.columns).toEqual([]);
      expect(tab.appState.dataSource).toStrictEqual({
        type: DataSourceType.DataView,
        dataViewId,
      });
    });
  });

  describe('transitionFromDataViewToESQL', () => {
    it('should transition from Data View mode to ES|QL mode', async () => {
      const { internalState, tabId } = await setup();
      const dataView = dataViewMockWithTimeField;

      const query = { query: "foo: 'bar'", language: 'kuery' };
      const filters = [{ meta: { index: 'the-data-view-id' }, query: { match_all: {} } }];
      internalState.dispatch(
        internalStateActions.setGlobalState({
          tabId,
          globalState: { filters },
        })
      );
      internalState.dispatch(
        internalStateActions.setAppState({
          tabId,
          appState: {
            query,
            dataSource: {
              type: DataSourceType.DataView,
              dataViewId: 'the-data-view-id',
            },
            sort: [
              ['@timestamp', 'asc'],
              ['bytes', 'desc'],
            ],
          },
        })
      );

      let state = internalState.getState();
      let tab = selectTab(state, tabId);

      expect(tab.appState.query).toStrictEqual(query);
      expect(tab.appState.sort).toEqual([
        ['@timestamp', 'asc'],
        ['bytes', 'desc'],
      ]);
      expect(tab.globalState.filters).toStrictEqual(filters);
      expect(tab.appState.filters).toBeUndefined();
      expect(tab.appState.dataSource).toStrictEqual({
        type: DataSourceType.DataView,
        dataViewId: 'the-data-view-id',
      });

      // Transition to ES|QL mode
      internalState.dispatch(
        internalStateActions.transitionFromDataViewToESQL({
          tabId,
          dataView,
        })
      );

      // Get the updated tab state
      state = internalState.getState();
      tab = selectTab(state, tabId);

      // Verify the state was updated correctly
      expect(tab.appState.query).toStrictEqual({
        esql: 'FROM the-data-view-title | WHERE KQL("""foo: \'bar\'""")',
      });
      expect(tab.appState.sort).toEqual([['bytes', 'desc']]);
      expect(tab.globalState.filters).toStrictEqual([]);
      expect(tab.appState.filters).toStrictEqual([]);
      expect(tab.appState.dataSource).toStrictEqual({
        type: DataSourceType.Esql,
      });
    });
  });

  describe('updateESQLQuery', () => {
    it('should update the ES|QL query string', async () => {
      const { internalState, tabId } = await setup();

      let state = internalState.getState();
      let tab = selectTab(state, tabId);

      expect(tab.appState.query).toStrictEqual({ esql: 'FROM test-index' });

      // Update the ES|QL query string
      internalState.dispatch(
        internalStateActions.updateESQLQuery({
          tabId,
          queryOrUpdater: 'FROM test-index | WHERE status = 200',
        })
      );

      // Get the updated tab state
      state = internalState.getState();
      tab = selectTab(state, tabId);

      // Verify the query string was updated correctly
      expect(tab.appState.query).toStrictEqual({ esql: 'FROM test-index | WHERE status = 200' });
    });

    it('should update the ES|QL query string using an updater function', async () => {
      const { internalState, tabId } = await setup();

      let state = internalState.getState();
      let tab = selectTab(state, tabId);

      expect(tab.appState.query).toStrictEqual({ esql: 'FROM test-index' });

      // Update the ES|QL query string using an updater function
      internalState.dispatch(
        internalStateActions.updateESQLQuery({
          tabId,
          queryOrUpdater: (currentQuery) => {
            return currentQuery + ' | WHERE status = 404';
          },
        })
      );

      // Get the updated tab state
      state = internalState.getState();
      tab = selectTab(state, tabId);

      // Verify the query string was updated correctly
      expect(tab.appState.query).toStrictEqual({ esql: 'FROM test-index | WHERE status = 404' });
    });
  });
});
