/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { getSavedSearch, getNewSavedSearch } from '../../../common/service/get_saved_searches';
export {
  getSavedSearchUrl,
  getSavedSearchFullPathUrl,
} from '../../../common/service/saved_searches_utils';
export type { SaveSavedSearchOptions } from './save_saved_searches';
export { saveSavedSearch } from './save_saved_searches';
export { SAVED_SEARCH_TYPE } from './constants';
export type {
  SavedSearch,
  SearchByReferenceInput,
  SearchByValueInput,
  SavedSearchByValueAttributes,
} from './types';
export {
  getSavedSearchAttributeService,
  toSavedSearch,
  type SavedSearchAttributeService,
  type SavedSearchUnwrapMetaInfo,
  type SavedSearchUnwrapResult,
} from './saved_search_attribute_service';
