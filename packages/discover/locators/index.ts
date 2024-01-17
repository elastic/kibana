/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  DiscoverSingleDocLocator,
  DiscoverSingleDocLocatorParams,
  DocHistoryLocationState,
} from './doc';

export { DISCOVER_SINGLE_DOC_LOCATOR, DiscoverSingleDocLocatorDefinition } from './doc';

export type {
  ContextHistoryLocationState,
  DiscoverContextAppLocator,
  DiscoverContextAppLocatorDependencies,
  DiscoverContextAppLocatorParams,
} from './context_app';

export { DISCOVER_CONTEXT_APP_LOCATOR, DiscoverContextAppLocatorDefinition } from './context_app';

export type {
  DiscoverAppLocator,
  DiscoverAppLocatorDependencies,
  DiscoverAppLocatorParams,
  MainHistoryLocationState,
} from './app';

export { DISCOVER_APP_LOCATOR, DiscoverAppLocatorDefinition } from './app';
