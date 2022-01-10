/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export {
  ILLEGAL_CHARACTERS_KEY,
  CONTAINS_SPACES_KEY,
  ILLEGAL_CHARACTERS_VISIBLE,
  ILLEGAL_CHARACTERS,
  validateDataView,
} from '../common/lib';
export { onRedirectNoIndexPattern } from './data_views';

export type { IIndexPatternFieldList, TypeMeta } from '../common';
export { IndexPatternField, DataViewField, DataViewType, META_FIELDS } from '../common';

export type { IndexPatternsContract, DataViewsContract } from './data_views';
export type { DataViewListItem } from './data_views';
export {
  IndexPatternsService,
  IndexPattern,
  DataViewsApiClient,
  DataViewsService,
  DataView,
} from './data_views';
export { UiSettingsPublicToCommon } from './ui_settings_wrapper';
export { SavedObjectsClientPublicToCommon } from './saved_objects_client_wrapper';

/*
 * Plugin setup
 */

import { DataViewsPublicPlugin } from './plugin';

export function plugin() {
  return new DataViewsPublicPlugin();
}

export type { DataViewsPublicPluginSetup, DataViewsPublicPluginStart } from './types';

// Export plugin after all other imports
export type { DataViewsPublicPlugin as DataViewsPlugin };
