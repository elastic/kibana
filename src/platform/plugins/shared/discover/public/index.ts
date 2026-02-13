/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { DiscoverPlugin } from './plugin';

export type { DiscoverSetup, DiscoverStart } from './types';
export function plugin(initializerContext: PluginInitializerContext) {
  return new DiscoverPlugin(initializerContext);
}

export type { DiscoverAppState } from './application/main/state_management/redux';
export type { DataDocumentsMsg } from './application/main/state_management/discover_data_state_container';
export type { DiscoverContainerProps } from './components/discover_container';
export type {
  ExtendedDiscoverStateContainer,
  CustomizationCallback,
  DiscoverCustomization,
  DiscoverCustomizationService,
  SearchBarCustomization,
  UnifiedHistogramCustomization,
} from './customizations';
export {
  SEARCH_EMBEDDABLE_TYPE,
  apiPublishesSavedSearch,
  type PublishesSavedSearch,
  type PublishesWritableSavedSearch,
  type HasTimeRange,
  type SearchEmbeddableRuntimeState,
  type SearchEmbeddableApi,
} from './embeddable';
export type { DiscoverServices } from './build_services';

export const loadSharingDataHelpers = () => import('./utils/get_sharing_data');
