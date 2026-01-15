/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { internalStateActions, selectTabRuntimeState } from '..';
import { DataSourceType } from '../../../../../../common/data_sources';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { dataViewMock, dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { fromTabStateToSavedObjectTab } from '../tab_mapping_utils';
import { getTabStateMock } from '../__mocks__/internal_state.mocks';

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

describe('data_views actions', () => {
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
});
