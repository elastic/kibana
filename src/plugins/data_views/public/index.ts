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
export { formatHitProvider, onRedirectNoIndexPattern } from './data_views';

export { IndexPatternField, IIndexPatternFieldList, TypeMeta } from '../common';

export {
  IndexPatternsService,
  IndexPatternsContract,
  IndexPattern,
  DataViewsApiClient,
  DataViewsService,
  DataViewsContract,
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
export type { DataViewsPublicPlugin as DataPlugin };
