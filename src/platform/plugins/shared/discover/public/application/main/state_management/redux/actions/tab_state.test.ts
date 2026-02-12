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
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { mockControlState } from '../../../../../__mocks__/esql_controls';
import { getPersistedTabMock } from '../__mocks__/internal_state.mocks';

const setup = async () => {
  const services = createDiscoverServicesMock();
  const toolkit = getDiscoverInternalStateMock({
    services,
    persistedDataViews: [dataViewMockWithTimeField],
  });

  const persistedTab = getPersistedTabMock({
    dataView: dataViewMockWithTimeField,
    services,
    appStateOverrides: {
      query: { esql: 'FROM test-index' },
      dataSource: { type: DataSourceType.Esql },
      columns: ['field1', 'field2'],
    },
  });

  await toolkit.initializeTabs({
    persistedDiscoverSession: createDiscoverSessionMock({
      id: 'test-session',
      tabs: [persistedTab],
    }),
  });
  await toolkit.initializeSingleTab({ tabId: persistedTab.id });

  return {
    ...toolkit,
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

  describe('updateAttributes', () => {
    it('should update individual tab attributes', async () => {
      const { internalState, tabId } = await setup();

      let state = internalState.getState();
      let tab = selectTab(state, tabId);

      expect(tab.attributes.controlGroupState).toBeUndefined();

      // Update the hideChart attribute
      internalState.dispatch(
        internalStateActions.updateAttributes({
          tabId,
          attributes: {
            controlGroupState: mockControlState,
          },
        })
      );

      // Get the updated tab state
      state = internalState.getState();
      tab = selectTab(state, tabId);

      // Verify the controlGroupState attribute was updated correctly
      expect(tab.attributes).toStrictEqual({
        controlGroupState: mockControlState,
        visContext: undefined,
        timeRestore: false,
      });
    });

    it('should not overwrite existing attributes when updating', async () => {
      const { internalState, tabId } = await setup();

      let state = internalState.getState();
      let tab = selectTab(state, tabId);

      expect(tab.attributes.visContext).toBeUndefined();
      const visContext = { some: 'context' };

      internalState.dispatch(
        internalStateActions.updateAttributes({
          tabId,
          attributes: {
            visContext,
          },
        })
      );

      internalState.dispatch(
        internalStateActions.updateAttributes({
          tabId,
          attributes: {
            controlGroupState: mockControlState,
          },
        })
      );

      // Get the updated tab state
      state = internalState.getState();
      tab = selectTab(state, tabId);

      // Verify the visContext attribute was not overwritten
      expect(tab.attributes.visContext).toBe(visContext);
      // Verify the controlGroupState attribute was updated correctly
      expect(tab.attributes.controlGroupState).toBe(mockControlState);
    });

    it('should not update attributes if they are the same', async () => {
      const { internalState, tabId } = await setup();

      let state = internalState.getState();
      let tab = selectTab(state, tabId);

      expect(tab.attributes.visContext).toBeUndefined();
      const visContext = { some: 'context' };

      internalState.dispatch(
        internalStateActions.updateAttributes({
          tabId,
          attributes: {
            visContext,
          },
        })
      );

      // Capture state after first update
      state = internalState.getState();
      tab = selectTab(state, tabId);
      expect(tab.attributes.visContext).toBe(visContext);

      const stateAfterFirstUpdate = state;

      // Dispatch the same update again
      internalState.dispatch(
        internalStateActions.updateAttributes({
          tabId,
          attributes: {
            visContext,
          },
        })
      );

      // Get the updated tab state
      state = internalState.getState();
      tab = selectTab(state, tabId);

      // Verify the state has not changed
      expect(state).toBe(stateAfterFirstUpdate);
      // Verify the visContext attribute remains the same
      expect(tab.attributes.visContext).toBe(visContext);
    });
  });
});
