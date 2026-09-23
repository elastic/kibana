/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter, TimeRange } from '@kbn/es-query';
import type { RefreshInterval } from '@kbn/data-plugin/public';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { DiscoverAppLocatorParams } from '../../../../common/app_locator';
import type { ProfileStateMap } from '../../../../common/context_awareness';
import type { TabState } from '../state_management/redux';

/**
 * Builds shared locator params, including URL-only values spread from the tab's app state.
 */
export const getDiscoverLocatorParams = ({
  currentTab,
  dataView,
  persistedDiscoverSession,
  filters,
  timeRange,
  refreshInterval,
  profileState,
}: {
  currentTab: TabState;
  dataView: DataView | undefined;
  persistedDiscoverSession: DiscoverSession | undefined;
  filters: Filter[];
  timeRange: TimeRange | undefined;
  refreshInterval: RefreshInterval | undefined;
  profileState: ProfileStateMap | undefined;
}): DiscoverAppLocatorParams & { timeRange: TimeRange | undefined } => ({
  ...omit(currentTab.appState, 'dataSource'),
  ...(persistedDiscoverSession?.id ? { savedSearchId: persistedDiscoverSession.id } : {}),
  ...(dataView?.isPersisted()
    ? { dataViewId: dataView?.id }
    : { dataViewSpec: dataView?.toMinimalSpec() }),
  filters,
  timeRange,
  refreshInterval,
  profileState,
  tab: {
    id: currentTab.id,
    label: currentTab.label,
  },
});
