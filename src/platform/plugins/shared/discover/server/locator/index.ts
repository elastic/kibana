/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreStart, IUiSettingsClient, SavedObjectsClientContract } from '@kbn/core/server';
import { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import { DiscoverServerPluginLocatorService, DiscoverServerPluginStartDeps } from '..';
import { getScopedClient } from './service';

export type { ColumnsFromLocatorFn } from './columns_from_locator';
export type { SearchSourceFromLocatorFn } from './searchsource_from_locator';
export type { TitleFromLocatorFn } from './title_from_locator';
export type { QueryFromLocatorFn } from './query_from_locator';
export type { FiltersFromLocatorFn } from './filters_from_locator';

/**
 * @internal
 */
export interface LocatorServicesDeps {
  searchSourceStart: ISearchStartSearchSource;
  savedObjects: SavedObjectsClientContract;
  uiSettings: IUiSettingsClient;
}

/**
 * @internal
 */
export const initializeLocatorServices = (
  core: CoreStart,
  deps: DiscoverServerPluginStartDeps
): DiscoverServerPluginLocatorService => getScopedClient(core, deps);
