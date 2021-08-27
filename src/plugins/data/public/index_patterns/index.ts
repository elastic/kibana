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
  validateIndexPattern,
  isDefault,
} from '../../common/index_patterns/lib';
export { flattenHitWrapper, formatHitProvider, onRedirectNoIndexPattern } from './index_patterns';

export { IndexPatternField, IIndexPatternFieldList, TypeMeta } from '../../common/index_patterns';

export {
  IndexPatternsService,
  IndexPatternsContract,
  IndexPattern,
  IndexPatternsApiClient,
} from './index_patterns';
export { UiSettingsPublicToCommon } from './ui_settings_wrapper';
export { SavedObjectsClientPublicToCommon } from './saved_objects_client_wrapper';
