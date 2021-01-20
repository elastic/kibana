/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginInitializerContext } from '../../../../src/core/public';
import { SavedObjectTaggingOssPlugin } from './plugin';

export { SavedObjectTaggingOssPluginSetup, SavedObjectTaggingOssPluginStart } from './types';

export {
  SavedObjectsTaggingApi,
  SavedObjectsTaggingApiUi,
  SavedObjectsTaggingApiUiComponent,
  ITagsCache,
  TagListComponentProps,
  TagSelectorComponentProps,
  GetSearchBarFilterOptions,
  ParsedSearchQuery,
  ParseSearchQueryOptions,
  SavedObjectSaveModalTagSelectorComponentProps,
  SavedObjectTagDecoratorTypeGuard,
} from './api';

export { TagDecoratedSavedObject } from './decorator';

export const plugin = (initializerContext: PluginInitializerContext) =>
  new SavedObjectTaggingOssPlugin(initializerContext);
