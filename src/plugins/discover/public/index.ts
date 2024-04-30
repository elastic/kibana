/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { DiscoverPlugin } from './plugin';

export type { DiscoverSetup, DiscoverStart } from './plugin';
export function plugin(initializerContext: PluginInitializerContext) {
  return new DiscoverPlugin(initializerContext);
}

export type { ISearchEmbeddable, SearchInput } from './embeddable';
export type { DiscoverAppState } from './application/main/services/discover_app_state_container';
export type { DiscoverStateContainer } from './application/main/services/discover_state';
export type { DataDocumentsMsg } from './application/main/services/discover_data_state_container';
export type { DiscoverContainerProps } from './components/discover_container';
export type {
  CustomizationCallback,
  DiscoverCustomization,
  DiscoverCustomizationService,
  FlyoutCustomization,
  FlyoutContentProps,
  SearchBarCustomization,
  UnifiedHistogramCustomization,
  TopNavCustomization,
} from './customizations';
export { SEARCH_EMBEDDABLE_TYPE, SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID } from './embeddable';
export { loadSharingDataHelpers } from './utils';
export { LogsExplorerTabs, type LogsExplorerTabsProps } from './components/logs_explorer_tabs';
