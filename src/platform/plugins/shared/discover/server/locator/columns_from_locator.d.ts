import type { DataView } from '@kbn/data-views-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import type { LocatorServicesDeps } from '.';
import type { DiscoverAppLocatorParams } from '../../common';
/**
 * @internal
 */
export declare const getColumns: (services: LocatorServicesDeps, index: DataView, savedSearch: SavedSearch) => Promise<{
    timeFieldName: string | undefined;
    columns: string[] | undefined;
}>;
/**
 * @internal
 */
export declare function columnsFromLocatorFactory(services: LocatorServicesDeps): (params: DiscoverAppLocatorParams) => Promise<string[] | undefined>;
export type ColumnsFromLocatorFn = ReturnType<typeof columnsFromLocatorFactory>;
