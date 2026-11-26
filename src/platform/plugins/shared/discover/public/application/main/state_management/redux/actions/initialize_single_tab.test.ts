/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildPhraseFilter } from '@kbn/es-query';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { createResolvedMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { dataViewWithTimefieldMock } from '../../../../../__mocks__/data_view_with_timefield';
import { dataViewWithNoTimefieldMock } from '../../../../../__mocks__/data_view_no_timefield';
import { createDataViewDataSource, DataSourceType } from '../../../../../../common/data_sources';
import { getPersistedTabMock } from '../__mocks__/internal_state.mocks';
import { getTabDataView, selectTab, selectTabRuntimeState, TabInitializationStatus } from '..';
import type { DiscoverAppState } from '../types';
import * as resolveEsqlSourceModule from '../../../data_fetching/resolve_esql_source';

// The saved data view of the tab is not among the persisted ones, like a data view deleted after saving
const deletedDataView = dataViewWithNoTimefieldMock;
const replacementDataSource = createDataViewDataSource({
  dataViewId: dataViewWithTimefieldMock.id!,
});

const setup = async (appStateOverrides?: Partial<DiscoverAppState>) => {
  const services = createDiscoverServicesMock();
  const toolkit = getDiscoverInternalStateMock({
    services,
    persistedDataViews: [dataViewWithTimefieldMock],
  });
  const persistedTab = getPersistedTabMock({
    dataView: deletedDataView,
    appStateOverrides: { columns: ['saved-column'], ...appStateOverrides },
    services,
  });

  await toolkit.initializeTabs({
    persistedDiscoverSession: createDiscoverSessionMock({ id: 'test-id', tabs: [persistedTab] }),
  });

  return { toolkit, services, persistedTab };
};

describe('initializeSingleTab', () => {
  describe('when the saved data view no longer exists', () => {
    it('asks for a replacement data view instead of failing', async () => {
      const { toolkit, services, persistedTab } = await setup();

      await toolkit.initializeSingleTab({ tabId: persistedTab.id, skipWaitForDataFetching: true });

      expect(
        selectTab(toolkit.internalState.getState(), persistedTab.id).initializationState
      ).toEqual({
        initializationStatus: TabInitializationStatus.MissingDataView,
        missingDataViewId: deletedDataView.id,
      });
      expect(services.toastNotifications.addWarning).not.toHaveBeenCalled();
    });

    it('initializes the tab with the replacement data view', async () => {
      const { toolkit, services, persistedTab } = await setup();
      await toolkit.initializeSingleTab({ tabId: persistedTab.id, skipWaitForDataFetching: true });

      await toolkit.initializeSingleTab({
        tabId: persistedTab.id,
        defaultUrlState: { dataSource: replacementDataSource },
      });

      const tab = selectTab(toolkit.internalState.getState(), persistedTab.id);
      expect(tab.initializationState).toEqual({
        initializationStatus: TabInitializationStatus.Complete,
      });
      expect(tab.appState.dataSource).toEqual(replacementDataSource);
      expect(tab.appState.columns).toEqual(['saved-column']);
      expect(
        getTabDataView(selectTabRuntimeState(toolkit.runtimeStateManager, persistedTab.id))
      ).toBe(dataViewWithTimefieldMock);
      expect(services.toastNotifications.addWarning).not.toHaveBeenCalled();
    });

    it('rebinds the filters of the deleted data view to the replacement', async () => {
      const deletedDataViewFilter = buildPhraseFilter(
        { name: 'saved-field', type: 'string' },
        'saved-value',
        deletedDataView
      );
      const otherDataViewFilter = buildPhraseFilter(
        { name: 'other-field', type: 'string' },
        'other-value',
        { id: 'other-data-view-id', title: 'other-data-view' }
      );
      const { toolkit, services, persistedTab } = await setup({
        filters: [deletedDataViewFilter, otherDataViewFilter],
      });
      await toolkit.initializeSingleTab({ tabId: persistedTab.id, skipWaitForDataFetching: true });

      await toolkit.initializeSingleTab({
        tabId: persistedTab.id,
        defaultUrlState: { dataSource: replacementDataSource },
      });

      expect(services.filterManager.setAppFilters).toHaveBeenCalledWith([
        {
          ...deletedDataViewFilter,
          meta: { ...deletedDataViewFilter.meta, index: dataViewWithTimefieldMock.id },
        },
        otherDataViewFilter,
      ]);
    });

    it('asks for a replacement instead of showing the no data page when no persisted data views are left', async () => {
      const { toolkit, services, persistedTab } = await setup();
      jest.mocked(services.dataViews.hasData.hasDataView).mockResolvedValueOnce(false);

      await toolkit.initializeSingleTab({ tabId: persistedTab.id, skipWaitForDataFetching: true });

      const { initializationState, tabs } = toolkit.internalState.getState();
      expect(initializationState.hasDataView).toBe(false);
      expect(tabs.byId[persistedTab.id].initializationState).toEqual({
        initializationStatus: TabInitializationStatus.MissingDataView,
        missingDataViewId: deletedDataView.id,
      });
    });

    it('opens an ES|QL tab without asking for a replacement', async () => {
      const resolveSpy = jest
        .spyOn(resolveEsqlSourceModule, 'resolveEsqlSource')
        .mockResolvedValue(await createResolvedMockEsqlSource());
      const { toolkit, persistedTab } = await setup({
        query: { esql: 'FROM logs-*' },
        dataSource: { type: DataSourceType.Esql },
      });

      await toolkit.initializeSingleTab({ tabId: persistedTab.id, skipWaitForDataFetching: true });

      expect(
        selectTab(toolkit.internalState.getState(), persistedTab.id).initializationState
      ).toEqual({ initializationStatus: TabInitializationStatus.Complete });
      resolveSpy.mockRestore();
    });
  });
});
