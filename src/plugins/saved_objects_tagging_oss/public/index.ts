/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import { SavedObjectTaggingOssPlugin } from './plugin';

export {
  GetSearchBarFilterOptions,
  ITagsCache,
  ParsedSearchQuery,
  ParseSearchQueryOptions,
  SavedObjectSaveModalTagSelectorComponentProps,
  SavedObjectsTaggingApi,
  SavedObjectsTaggingApiUi,
  SavedObjectsTaggingApiUiComponent,
  SavedObjectTagDecoratorTypeGuard,
  TagListComponentProps,
  TagSelectorComponentProps,
} from './api';
export { TagDecoratedSavedObject } from './decorator';
export { SavedObjectTaggingOssPluginSetup, SavedObjectTaggingOssPluginStart } from './types';

export const plugin = (initializerContext: PluginInitializerContext) =>
  new SavedObjectTaggingOssPlugin(initializerContext);
