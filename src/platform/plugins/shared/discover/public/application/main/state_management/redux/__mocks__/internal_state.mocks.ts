/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DiscoverServices } from '../../../../../build_services';
import { DataSourceType } from '../../../../../../common/data_sources';
import { DEFAULT_TAB_STATE } from '../constants';
import type { DiscoverAppState, RecentlyClosedTabState, TabState } from '../types';
import { fromTabStateToSavedObjectTab } from '../tab_mapping_utils';

export const getTabStateMock = (
  partial: Partial<Omit<TabState, 'attributes'>> & {
    id: TabState['id'];
    attributes?: Partial<TabState['attributes']>;
  }
): TabState => ({
  ...DEFAULT_TAB_STATE,
  label: 'Untitled',
  ...partial,
  attributes: {
    ...DEFAULT_TAB_STATE.attributes,
    ...partial.attributes,
  },
});

export const getRecentlyClosedTabStateMock = (
  partial: Partial<Omit<RecentlyClosedTabState, 'attributes'>> & {
    id: RecentlyClosedTabState['id'];
    closedAt: RecentlyClosedTabState['closedAt'];
    attributes?: Partial<TabState['attributes']>;
  }
): RecentlyClosedTabState => ({ ...getTabStateMock(partial), closedAt: partial.closedAt });

export const getPersistedTabMock = ({
  tabId = 'test-tab',
  dataView,
  appStateOverrides = {},
  globalStateOverrides = {},
  initialInternalStateOverrides = {},
  overridenTimeRestore,
  services,
}: {
  tabId?: string;
  dataView: DataView;
  attributesOverrides?: Partial<TabState['attributes']>;
  appStateOverrides?: Partial<DiscoverAppState>;
  globalStateOverrides?: Partial<TabState['globalState']>;
  initialInternalStateOverrides?: Partial<TabState['initialInternalState']>;
  overridenTimeRestore?: boolean;
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
        columns: [],
        dataSource: {
          type: DataSourceType.DataView,
          dataViewId: dataView.id!,
        },
        sort: [['@timestamp', 'desc']],
        interval: 'auto',
        hideChart: false,
        ...appStateOverrides,
      },
      globalState: globalStateOverrides,
    }),
    overridenTimeRestore,
    services,
  });
};
