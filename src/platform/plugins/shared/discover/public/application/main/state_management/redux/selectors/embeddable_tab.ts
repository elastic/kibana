/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSessionApiEmbeddableTab } from '@kbn/as-code-discover-schema';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { fromStoredEmbeddableTab } from '../../../../../../common/embeddable';
import { migrateLegacyQuery } from '../../../../../utils/migrate_legacy_query';
import { selectTab } from './tabs';
import {
  getTabDataView,
  selectTabRuntimeState,
  selectTabTypeForPersistence,
  type RuntimeStateManager,
} from '../runtime_state';
import type { DiscoverInternalState } from '../types';
import { fromTabStateToSavedObjectTab } from '../tab_mapping_utils';
import type { DiscoverServices } from '../../../../../build_services';

/** Builds the public by-value Dashboard panel tab from a Discover tab. */
export const selectTabEmbeddableTab = ({
  tabId,
  getState,
  runtimeStateManager,
  services,
}: {
  tabId: string;
  getState: () => DiscoverInternalState;
  runtimeStateManager: RuntimeStateManager;
  services: DiscoverServices;
}): DiscoverSessionApiEmbeddableTab => {
  const tabState = selectTab(getState(), tabId);
  const tab = fromTabStateToSavedObjectTab({
    tab: tabState,
    currentDataView: getTabDataView(selectTabRuntimeState(runtimeStateManager, tabId)),
    services,
    tabType: selectTabTypeForPersistence({ runtimeStateManager, tabState }),
  });

  const { serializedSearchSource } = tab;
  const { query } = serializedSearchSource;
  // Like SearchSource creation, read a query saved without a language as Lucene
  const searchSource =
    query === undefined || isOfAggregateQueryType(query)
      ? serializedSearchSource
      : { ...serializedSearchSource, query: migrateLegacyQuery(query) };

  return fromStoredEmbeddableTab(tab, searchSource);
};
