/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  getDiscoverInternalStateMock,
  getDiscoverStateMock,
} from '../../../../../__mocks__/discover_state.mock';
import { createRuntimeStateManager, internalStateActions, selectTabRuntimeState } from '..';
import { createDataViewDataSource, DataSourceType } from '../../../../../../common/data_sources';
import { createDiscoverServicesMock, discoverServiceMock } from '../../../../../__mocks__/services';
import { dataViewMock, dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { fromTabStateToSavedObjectTab } from '../tab_mapping_utils';
import { getTabStateMock } from '../__mocks__/internal_state.mocks';
import { savedSearchMock } from '../../../../../__mocks__/saved_search';
import {
  dataViewComplexMock,
  dataViewWithDefaultColumnMock,
} from '../../../../../__mocks__/data_view_complex';

const setup = async () => {
  const services = createDiscoverServicesMock();
  const { internalState, initializeTabs, initializeSingleTab, runtimeStateManager } =
    getDiscoverInternalStateMock({
      services,
      persistedDataViews: [dataViewMockWithTimeField, dataViewMock],
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
    runtimeStateManager,
    tabId: persistedTab.id,
  };
};

describe('tab_state_data_view actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('assignNextDataView', () => {
    it('should transition from ES|QL mode to Data View mode', async () => {
      const { internalState, tabId, runtimeStateManager } = await setup();
      jest.spyOn(internalStateActions, 'pauseAutoRefreshInterval');

      const dataViewIdBefore = selectTabRuntimeState(
        runtimeStateManager,
        tabId
      )?.currentDataView$?.getValue()?.id;

      internalState.dispatch(
        internalStateActions.assignNextDataView({
          tabId,
          dataView: dataViewMock,
        })
      );

      const dataViewIdAfter = selectTabRuntimeState(
        runtimeStateManager,
        tabId
      )?.currentDataView$?.getValue()?.id;

      expect(dataViewIdAfter).toBe(dataViewMock.id);
      expect(dataViewIdBefore).not.toBe(dataViewIdAfter);
      expect(internalStateActions.pauseAutoRefreshInterval).toHaveBeenCalledWith({
        tabId,
        dataView: dataViewMock,
      });
    });
  });

  describe('changeDataView', () => {
    const setupTestParams = (dataView: DataView | undefined) => {
      const savedSearch = savedSearchMock;
      const services = discoverServiceMock;
      const runtimeStateManager = createRuntimeStateManager();
      const discoverState = getDiscoverStateMock({ savedSearch, runtimeStateManager, services });
      discoverState.internalState.dispatch(
        discoverState.injectCurrentTab(internalStateActions.setDataView)({
          dataView: savedSearch.searchSource.getField('index')!,
        })
      );
      services.dataViews.get = jest.fn(() => Promise.resolve(dataView as DataView));
      return {
        services,
        internalState: discoverState.internalState,
        runtimeStateManager,
        injectCurrentTab: discoverState.injectCurrentTab,
        getCurrentTab: discoverState.getCurrentTab,
      };
    };

    it('should set the right app state when a valid data view (which includes the preconfigured default column) to switch to is given', async () => {
      const params = setupTestParams(dataViewWithDefaultColumnMock);
      const updateAppStateSpy = jest.spyOn(internalStateActions, 'updateAppState').mockClear();
      const promise = params.internalState.dispatch(
        params.injectCurrentTab(internalStateActions.changeDataView)({
          dataViewOrDataViewId: dataViewWithDefaultColumnMock.id!,
        })
      );
      expect(params.getCurrentTab().isDataViewLoading).toBe(true);
      await promise;
      expect(updateAppStateSpy).toHaveBeenCalledWith({
        tabId: params.getCurrentTab().id,
        appState: {
          columns: ['default_column'], // default_column would be added as dataViewWithDefaultColumn has it as a mapped field
          dataSource: createDataViewDataSource({
            dataViewId: 'data-view-with-user-default-column-id',
          }),
          sort: [['@timestamp', 'desc']],
        },
      });
      expect(params.getCurrentTab().isDataViewLoading).toBe(false);
    });

    it('should set the right app state when a valid data view to switch to is given', async () => {
      const params = setupTestParams(dataViewComplexMock);
      const updateAppStateSpy = jest.spyOn(internalStateActions, 'updateAppState').mockClear();
      const promise = params.internalState.dispatch(
        params.injectCurrentTab(internalStateActions.changeDataView)({
          dataViewOrDataViewId: dataViewComplexMock.id!,
        })
      );
      expect(params.getCurrentTab().isDataViewLoading).toBe(true);
      await promise;
      expect(updateAppStateSpy).toHaveBeenCalledWith({
        tabId: params.getCurrentTab().id,
        appState: {
          columns: [], // default_column would not be added as dataViewComplexMock does not have it as a mapped field
          dataSource: createDataViewDataSource({
            dataViewId: 'data-view-with-various-field-types-id',
          }),
          sort: [['data', 'desc']],
        },
      });
      expect(params.getCurrentTab().isDataViewLoading).toBe(false);
    });

    it('should not set the app state when an invalid data view to switch to is given', async () => {
      const params = setupTestParams(undefined);
      const updateAppStateSpy = jest.spyOn(internalStateActions, 'updateAppState').mockClear();
      const promise = params.internalState.dispatch(
        params.injectCurrentTab(internalStateActions.changeDataView)({
          dataViewOrDataViewId: 'data-view-with-various-field-types',
        })
      );
      expect(params.getCurrentTab().isDataViewLoading).toBe(true);
      await promise;
      expect(updateAppStateSpy).not.toHaveBeenCalled();
      expect(params.getCurrentTab().isDataViewLoading).toBe(false);
    });

    it('should call setResetDefaultProfileState correctly when switching data view', async () => {
      const params = setupTestParams(dataViewComplexMock);
      expect(params.getCurrentTab().resetDefaultProfileState).toEqual(
        expect.objectContaining({
          columns: false,
          rowHeight: false,
          breakdownField: false,
          hideChart: false,
        })
      );
      await params.internalState.dispatch(
        params.injectCurrentTab(internalStateActions.changeDataView)({
          dataViewOrDataViewId: dataViewComplexMock.id!,
        })
      );
      expect(params.getCurrentTab().resetDefaultProfileState).toEqual(
        expect.objectContaining({
          columns: true,
          rowHeight: true,
          breakdownField: true,
          hideChart: true,
        })
      );
    });
  });
});
