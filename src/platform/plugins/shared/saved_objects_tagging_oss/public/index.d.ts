import type { PluginInitializerContext } from '@kbn/core/public';
import { SavedObjectTaggingOssPlugin } from './plugin';
export type { SavedObjectTaggingOssPluginSetup, SavedObjectTaggingOssPluginStart } from './types';
export type { SavedObjectsTaggingApi, SavedObjectsTaggingApiUi, SavedObjectsTaggingApiUiComponent, ITagsCache, TagListComponentProps, TagSelectorComponentProps, GetSearchBarFilterOptions, ParsedSearchQuery, ParseSearchQueryOptions, SavedObjectSaveModalTagSelectorComponentProps, GetTableColumnDefinitionOptions, } from './api';
export declare const plugin: (initializerContext: PluginInitializerContext) => SavedObjectTaggingOssPlugin;
