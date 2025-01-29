/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const PLUGIN_ID = 'discover';
export const APP_ICON = 'discoverApp';

export { DISCOVER_APP_LOCATOR, DiscoverAppLocatorDefinition } from './app_locator';
export type {
  DiscoverAppLocator,
  DiscoverAppLocatorParams,
  MainHistoryLocationState,
} from './app_locator';

export { DiscoverESQLLocatorDefinition } from './esql_locator';
export type { DiscoverESQLLocator, DiscoverESQLLocatorParams } from './esql_locator';
