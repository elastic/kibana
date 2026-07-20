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
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { internalStateActions, selectTabRuntimeState, selectTab } from '..';
import { createDataViewDataSource } from '../../../../../../common/data_sources';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { dataViewMock, dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { savedSearchMock } from '../../../../../__mocks__/saved_search';
import {
  dataViewAdHoc,
  dataViewComplexMock,
  dataViewWithDefaultColumnMock,
} from '../../../../../__mocks__/data_view_complex';
import { getPersistedTabMock } from '../__mocks__/internal_state.mocks';
import * as tabStateActions from './tab_state';
import { selectDataSourceProfileId } from '../runtime_state';
import { getTabRuntimeStateMock } from '../__mocks__/runtime_state.mocks';
import { BehaviorSubject } from 'rxjs';
import { UPDATE_FILTER_REFERENCES_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';

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
    const setupTestParams = async (dataView: DataView) => {
      const services = createDiscoverServicesMock();
      const toolkit = getDiscoverInternalStateMock({
        services,
        persistedDataViews: [
          savedSearchMock.searchSource.getField('index')!,
          dataViewMockWithTimeField,
          dataViewMock,
          dataViewComplexMock,
          dataViewWithDefaultColumnMock,
        ],
      });

      const persistedTab = getPersistedTabMock({
        dataView: savedSearchMock.searchSource.getField('index')!,
        services,
      });

      await toolkit.initializeTabs({
        persistedDiscoverSession: createDiscoverSessionMock({
          id: 'test-session',
          tabs: [persistedTab],
        }),
      });
      await toolkit.initializeSingleTab({ tabId: persistedTab.id });

      const getDataView = jest.spyOn(services.dataViews, 'get').mockResolvedValue(dataView);

      return {
        services,
        internalState: toolkit.internalState,
        runtimeStateManager: toolkit.runtimeStateManager,
        injectCurrentTab: toolkit.injectCurrentTab,
        getCurrentTab: toolkit.getCurrentTab,
        getDataView,
      };
    };

    it('should set the right app state when a valid data view (which includes the preconfigured default column) to switch to is given', async () => {
      const params = await setupTestParams(dataViewWithDefaultColumnMock);
      const promise = params.internalState.dispatch(
        params.injectCurrentTab(internalStateActions.changeDataView)({
          dataViewOrDataViewId: dataViewWithDefaultColumnMock.id!,
        })
      );
      expect(params.getCurrentTab().isDataViewLoading).toBe(true);
      await promise;
      expect(params.getCurrentTab().appState.columns).toEqual(['default_column']);
      expect(params.getCurrentTab().appState.dataSource).toEqual(
        createDataViewDataSource({
          dataViewId: 'data-view-with-user-default-column-id',
        })
      );
      expect(params.getCurrentTab().appState.sort).toEqual([['@timestamp', 'desc']]);
      expect(params.getCurrentTab().isDataViewLoading).toBe(false);
    });

    it('should reset profile fields without syncing snapshots when switching data view', async () => {
      const params = await setupTestParams(dataViewComplexMock);
      const profileId = selectDataSourceProfileId(
        params.runtimeStateManager,
        params.getCurrentTab().id
      );
      const previousSnapshot =
        params.getCurrentTab().defaultProfileState.snapshotsByProfileId[profileId];
      const previousResetId = params.getCurrentTab().defaultProfileState.resetId;

      await params.internalState.dispatch(
        params.injectCurrentTab(internalStateActions.changeDataView)({
          dataViewOrDataViewId: dataViewComplexMock.id!,
        })
      );

      expect(params.getCurrentTab().defaultProfileState.fieldsToReset).toBe('all');
      expect(params.getCurrentTab().defaultProfileState.resetId).not.toBe(previousResetId);
      expect(params.getCurrentTab().defaultProfileState.snapshotsByProfileId[profileId]).toBe(
        previousSnapshot
      );
    });

    it('should set the right app state when a valid data view to switch to is given', async () => {
      const params = await setupTestParams(dataViewComplexMock);
      const promise = params.internalState.dispatch(
        params.injectCurrentTab(internalStateActions.changeDataView)({
          dataViewOrDataViewId: dataViewComplexMock.id!,
        })
      );
      expect(params.getCurrentTab().isDataViewLoading).toBe(true);
      await promise;
      expect(params.getCurrentTab().appState.columns).toEqual([]);
      expect(params.getCurrentTab().appState.dataSource).toEqual(
        createDataViewDataSource({
          dataViewId: 'data-view-with-various-field-types-id',
        })
      );
      expect(params.getCurrentTab().appState.sort).toEqual([['data', 'desc']]);
      expect(params.getCurrentTab().isDataViewLoading).toBe(false);
    });

    it('should not set the app state when an invalid data view to switch to is given', async () => {
      const params = await setupTestParams(dataViewComplexMock);
      params.getDataView.mockRejectedValueOnce(new Error('Data view not found'));
      const previousAppState = params.getCurrentTab().appState;
      const promise = params.internalState.dispatch(
        params.injectCurrentTab(internalStateActions.changeDataView)({
          dataViewOrDataViewId: 'data-view-with-various-field-types',
        })
      );
      expect(params.getCurrentTab().isDataViewLoading).toBe(true);
      await promise;
      expect(params.getCurrentTab().appState).toBe(previousAppState);
      expect(params.getCurrentTab().isDataViewLoading).toBe(false);
    });

    it('should call setProfileStateFieldsToReset correctly when switching data view', async () => {
      const params = await setupTestParams(dataViewComplexMock);
      expect(params.getCurrentTab().defaultProfileState.fieldsToReset).toBe('none');
      await params.internalState.dispatch(
        params.injectCurrentTab(internalStateActions.changeDataView)({
          dataViewOrDataViewId: dataViewComplexMock.id!,
        })
      );
      expect(params.getCurrentTab().defaultProfileState.fieldsToReset).toBe('all');
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
      expect(selectTabRuntimeState(runtimeStateManager, tabId).currentDataView$.getValue()).toBe(
        dataViewMockWithTimeField
      );
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
      // Verify the ad-hoc data view was added to the runtime state
      const adHocDataViews = runtimeStateManager.adHocDataViews$.getValue();
      expect(adHocDataViews.map((dv) => dv.id)).toContain(dataViewAdHoc.id);
      // Verify the app state was updated with the new data source
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

  describe('updateAdHocDataViewId', () => {
    const setupWithAdHocDataView = async () => {
      const toolkit = await setup();
      const { internalState, tabId, services } = toolkit;

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

      return toolkit;
    };

    it('should generate new ID and create new data view', async () => {
      const { internalState, tabId, services } = await setupWithAdHocDataView();

      const createSpy = services.dataViews.create as jest.Mock;
      createSpy.mockClear();

      const result = await internalState.dispatch(
        internalStateActions.updateAdHocDataViewId({
          tabId,
          editedDataView: dataViewAdHoc,
        })
      );

      expect(createSpy).toHaveBeenCalled();
      expect(result?.id).not.toBe(dataViewAdHoc.id);
    });

    it('should update filter references to new data view ID', async () => {
      const { internalState, tabId, services } = await setupWithAdHocDataView();

      await internalState.dispatch(
        internalStateActions.updateAdHocDataViewId({
          tabId,
          editedDataView: dataViewAdHoc,
        })
      );

      expect(services.uiActions.getTrigger).toHaveBeenCalledWith(UPDATE_FILTER_REFERENCES_TRIGGER);
    });

    it('should replace data view when used in single tab', async () => {
      const { internalState, tabId, runtimeStateManager } = await setupWithAdHocDataView();

      const previousId = dataViewAdHoc.id;

      await internalState.dispatch(
        internalStateActions.updateAdHocDataViewId({
          tabId,
          editedDataView: dataViewAdHoc,
        })
      );

      const adHocDataViews = runtimeStateManager.adHocDataViews$.getValue();
      expect(adHocDataViews).toHaveLength(1);
      expect(adHocDataViews[0].id).not.toBe(previousId);
    });

    it('should append data view when used in multiple tabs', async () => {
      const { internalState, tabId, runtimeStateManager } = await setupWithAdHocDataView();

      // Add a second tab with the same ad-hoc data view to simulate multi-tab usage
      runtimeStateManager.tabs.byId['second-tab'] = getTabRuntimeStateMock({
        currentDataView$: new BehaviorSubject<DataView | undefined>(dataViewAdHoc),
      });

      const adHocDataViewsBefore = runtimeStateManager.adHocDataViews$.getValue();
      expect(adHocDataViewsBefore).toHaveLength(1);

      await internalState.dispatch(
        internalStateActions.updateAdHocDataViewId({
          tabId,
          editedDataView: dataViewAdHoc,
        })
      );

      // Multi-tab: new data view is appended rather than replacing the old one
      expect(runtimeStateManager.adHocDataViews$.getValue()).toHaveLength(2);
    });

    it('should be no-op for persisted data views', async () => {
      const { internalState, tabId, services } = await setup();
      // setup() initializes with dataViewMockWithTimeField which is persisted

      const createSpy = services.dataViews.create as jest.Mock;
      createSpy.mockClear();

      const result = await internalState.dispatch(
        internalStateActions.updateAdHocDataViewId({
          tabId,
          editedDataView: dataViewMockWithTimeField,
        })
      );

      expect(result).toBeUndefined();
      expect(createSpy).not.toHaveBeenCalled();
    });
  });
});
