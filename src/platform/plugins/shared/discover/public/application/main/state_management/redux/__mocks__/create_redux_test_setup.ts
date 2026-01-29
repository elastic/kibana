/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { fromTabStateToSavedObjectTab } from '..';
import { getTabStateMock } from './internal_state.mocks';
import { DataSourceType } from '../../../../../../common/data_sources';

export const createReduxTestSetup = async () => {
  const services = createDiscoverServicesMock();
  const { internalState, runtimeStateManager, initializeTabs, initializeSingleTab } =
    getDiscoverInternalStateMock({
      services,
      persistedDataViews: [dataViewMockWithTimeField],
    });

  const persistedTab = fromTabStateToSavedObjectTab({
    tab: getTabStateMock({
      id: 'test-tab',
      initialInternalState: {
        serializedSearchSource: {
          index: dataViewMockWithTimeField.id,
          query: { query: '', language: 'kuery' },
        },
      },
      appState: {
        query: { query: '', language: 'kuery' },
        columns: ['field1', 'field2'],
        dataSource: {
          type: DataSourceType.DataView,
          dataViewId: dataViewMockWithTimeField.id!,
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

  return {
    internalState,
    runtimeStateManager,
    services,
    tabId: persistedTab.id,
    persistedDiscoverSession,
    initializeSingleTab,
  };
};
