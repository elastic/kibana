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
import {
  createRuntimeStateManager,
  internalStateActions,
  selectTabRuntimeState,
  selectTab,
} from '..';
import { createDataViewDataSource } from '../../../../../../common/data_sources';
import { createDiscoverServicesMock, discoverServiceMock } from '../../../../../__mocks__/services';
import { dataViewMock, dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { savedSearchMock } from '../../../../../__mocks__/saved_search';
import {
  dataViewAdHoc,
  dataViewComplexMock,
  dataViewWithDefaultColumnMock,
} from '../../../../../__mocks__/data_view_complex';
import { getPersistedTabMock } from '../__mocks__/internal_state.mocks';
import * as tabStateActions from './tab_state';

const setup = async () => {
  const services = createDiscoverServicesMock();
  const toolkit = getDiscoverInternalStateMock({
    services,
    persistedDataViews: [
      dataViewMockWithTimeField,
      dataViewMock,
      dataViewComplexMock,
      dataViewWithDefaultColumnMock,
    ],
  });

  const persistedTab = getPersistedTabMock({
    dataView: dataViewMockWithTimeField,
    services,
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

describe('tab_state_data_view actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('assignNextDataView', () => {
    it('should update data view', async () => {
      const { internalState, tabId, runtimeStateManager } = await setup();
      jest.spyOn(internalStateActions, 'pauseAutoRefreshInterval');

      expect(selectTabRuntimeState(runtimeStateManager, tabId)?.currentDataView$?.getValue()).toBe(
        dataViewMockWithTimeField
      );

      internalState.dispatch(
        internalStateActions.assignNextDataView({
          tabId,
          dataView: dataViewMock,
        })
      );

      expect(selectTabRuntimeState(runtimeStateManager, tabId)?.currentDataView$?.getValue()).toBe(
        dataViewMock
      );
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

  describe('onDataViewCreated', () => {
    test('onDataViewCreated - persisted data view', async () => {
      const { internalState, tabId, runtimeStateManager } = await setup();
      expect(selectTabRuntimeState(runtimeStateManager, tabId).currentDataView$.getValue()).toBe(
        dataViewMockWithTimeField
      );
      await internalState.dispatch(
        internalStateActions.onDataViewCreated({
          tabId,
          nextDataView: dataViewComplexMock,
        })
      );
      expect(selectTab(internalState.getState(), tabId).appState.dataSource).toEqual(
        createDataViewDataSource({ dataViewId: dataViewComplexMock.id! })
      );
    });

    test('onDataViewCreated - ad-hoc data view', async () => {
      const { internalState, tabId, runtimeStateManager, services } = await setup();
      jest
        .spyOn(services.dataViews, 'get')
        .mockImplementationOnce((id) =>
          id === dataViewAdHoc.id ? Promise.resolve(dataViewAdHoc) : Promise.reject()
        );
      await internalState.dispatch(
        internalStateActions.onDataViewCreated({
          tabId,
          nextDataView: dataViewAdHoc,
        })
      );
      expect(selectTabRuntimeState(runtimeStateManager, tabId).currentDataView$.getValue()).toBe(
        dataViewAdHoc
      );
      expect(selectTab(internalState.getState(), tabId).appState.dataSource).toEqual(
        createDataViewDataSource({ dataViewId: dataViewAdHoc.id! })
      );
      const { currentDataView$ } = selectTabRuntimeState(runtimeStateManager, tabId);
      expect(currentDataView$.getValue()?.id).toBe(dataViewAdHoc.id);
    });
  });

  describe('onDataViewEdited', () => {
    test('onDataViewEdited - persisted data view', async () => {
      const { internalState, tabId, runtimeStateManager } = await setup();
      const fetchDataSpy = jest.spyOn(tabStateActions, 'fetchData');

      const selectedDataView$ = selectTabRuntimeState(runtimeStateManager, tabId).currentDataView$;
      expect(selectedDataView$.getValue()).toEqual(dataViewMockWithTimeField);
      await internalState.dispatch(
        internalStateActions.onDataViewEdited({
          tabId,
          editedDataView: dataViewMockWithTimeField,
        })
      );
      const dataViewAfter = selectedDataView$.getValue();
      expect(dataViewAfter).not.toEqual(dataViewMockWithTimeField);
      expect(dataViewAfter?.id).toBe(dataViewMockWithTimeField.id);
      expect(fetchDataSpy).toHaveBeenCalledWith({ tabId });
    });

    test('onDataViewEdited - ad-hoc data view', async () => {
      const { internalState, tabId, runtimeStateManager } = await setup();
      const fetchDataSpy = jest.spyOn(tabStateActions, 'fetchData');

      await internalState.dispatch(
        internalStateActions.onDataViewCreated({
          tabId,
          nextDataView: dataViewAdHoc,
        })
      );
      const previousId = dataViewAdHoc.id;
      await internalState.dispatch(
        internalStateActions.onDataViewEdited({
          tabId,
          editedDataView: dataViewAdHoc,
        })
      );
      expect(
        selectTabRuntimeState(runtimeStateManager, tabId).currentDataView$.getValue()?.id
      ).not.toBe(previousId);
      expect(fetchDataSpy).toHaveBeenCalledWith({ tabId });
    });
  });

  describe('createAndAppendAdHocDataView', () => {
    test('should create a new data view and append to the ad-hoc data view list', async () => {
      const { internalState, tabId, runtimeStateManager } = await setup();
      await internalState.dispatch(
        internalStateActions.createAndAppendAdHocDataView({
          tabId,
          dataViewSpec: { title: 'ad-hoc' },
        })
      );
      expect(selectTab(internalState.getState(), tabId).appState.dataSource).toEqual(
        createDataViewDataSource({ dataViewId: 'ad-hoc-id' })
      );
      expect(runtimeStateManager.adHocDataViews$.getValue()[0].id).toBe('ad-hoc-id');
    });
  });
});
