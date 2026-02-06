/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Content List Provider
 *
 * A modular, feature-based architecture for building content listing UIs.
 */

// Provider.
export { ContentListProvider, useContentListConfig } from './src/context';
export type {
  ContentListProviderProps,
  ContentListIdentity,
  ContentListLabels,
  ContentListCoreConfig,
  ContentListConfig,
} from './src/context';

// Hooks.
export { useContentListItems } from './src/state';
export { useContentListSort } from './src/features';

// Types.
export type { ContentListItem, ContentListItemConfig } from './src/item';
export type {
  ContentListFeatures,
  ContentListSupports,
  SortingConfig,
  UseContentListSortReturn,
} from './src/features';
export type {
  FindItemsFn,
  FindItemsParams,
  FindItemsResult,
  DataSourceConfig,
} from './src/datasource';

// Utilities.
export { contentListKeys } from './src/query';
