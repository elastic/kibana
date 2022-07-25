/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { SavedObjectTaggingOssPlugin } from './plugin';

export type { SavedObjectTaggingOssPluginSetup, SavedObjectTaggingOssPluginStart } from './types';

export type {
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

export type { TagDecoratedSavedObject } from './decorator';

export const plugin = (initializerContext: PluginInitializerContext) =>
  new SavedObjectTaggingOssPlugin(initializerContext);
