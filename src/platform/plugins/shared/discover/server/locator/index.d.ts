import type { CoreStart, IUiSettingsClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import type { DiscoverServerPluginLocatorService, DiscoverServerPluginStartDeps } from '..';
export type { ColumnsFromLocatorFn } from './columns_from_locator';
export type { SearchSourceFromLocatorFn } from './searchsource_from_locator';
export type { TitleFromLocatorFn } from './title_from_locator';
export type { QueryFromLocatorFn } from './query_from_locator';
export type { FiltersFromLocatorFn } from './filters_from_locator';
export type { TimeFieldNameFromLocatorFn } from './time_field_name_from_locator';
/**
 * @internal
 */
export interface LocatorServicesDeps {
    searchSourceStart: ISearchStartSearchSource;
    savedObjects: SavedObjectsClientContract;
    uiSettings: IUiSettingsClient;
}
/**
 * @internal
 */
export declare const initializeLocatorServices: (core: CoreStart, deps: DiscoverServerPluginStartDeps) => DiscoverServerPluginLocatorService;
