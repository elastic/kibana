/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import type { DiscoverServices } from '../../../../../build_services';
import { DataSourceType } from '../../../../../../common/data_sources';
import type { DiscoverAppState } from '../types';
import { fromTabStateToSavedObjectTab } from '../tab_mapping_utils';
import { getTabStateMock } from './internal_state.mocks';
import type { TabState } from '../types';

export const createDefaultPersistedTab = ({
  tabId = 'test-tab',
  dataView = dataViewMockWithTimeField,
  appStateOverrides = {},
  initialInternalStateOverrides = {},
  services,
}: {
  tabId?: string;
  dataView?: DataView;
  appStateOverrides?: Partial<DiscoverAppState>;
  initialInternalStateOverrides?: Partial<TabState['initialInternalState']>;
  services: DiscoverServices;
}) => {
  const defaultQuery = { query: '', language: 'kuery' };
  const query = appStateOverrides.query || defaultQuery;

  return fromTabStateToSavedObjectTab({
    tab: getTabStateMock({
      id: tabId,
      initialInternalState: {
        serializedSearchSource: {
          index: dataView.id,
          query,
        },
        ...initialInternalStateOverrides,
      },
      appState: {
        query,
        columns: ['field1', 'field2'],
        dataSource: {
          type: DataSourceType.DataView,
          dataViewId: dataView.id!,
        },
        sort: [['@timestamp', 'desc']],
        interval: 'auto',
        hideChart: false,
        ...appStateOverrides,
      },
    }),
    timeRestore: false,
    services,
  });
};
