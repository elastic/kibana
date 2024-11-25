/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedSearchPublicPlugin } from './plugin';

export type { SortOrder } from '../common/types';
export type {
  SavedSearch,
  SaveSavedSearchOptions,
  SavedSearchByValueAttributes,
  SavedSearchUnwrapMetaInfo,
  SavedSearchUnwrapResult,
} from './services/saved_searches';
export { getSavedSearchFullPathUrl, getSavedSearchUrl } from './services/saved_searches';
export { VIEW_MODE } from '../common';
export type { SavedSearchPublicPluginStart } from './plugin';

export function plugin() {
  return new SavedSearchPublicPlugin();
}
