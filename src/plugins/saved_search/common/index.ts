/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { getSavedSearchUrl, getSavedSearchFullPathUrl } from './saved_searches_url';
export { fromSavedSearchAttributes } from './saved_searches_utils';

export type {
  DiscoverGridSettings,
  DiscoverGridSettingsColumn,
  SavedSearch,
  SavedSearchAttributes,
} from './types';

export enum VIEW_MODE {
  DOCUMENT_LEVEL = 'documents',
  AGGREGATED_LEVEL = 'aggregated',
}
