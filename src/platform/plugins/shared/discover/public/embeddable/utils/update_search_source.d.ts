import type { ISearchSource } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { FetchContext } from '@kbn/presentation-publishing';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import type { DiscoverServices } from '../../build_services';
export declare const getTimeRangeFromFetchContext: (fetchContext: FetchContext) => import("@kbn/es-query").TimeRange | undefined;
export declare const updateSearchSource: (discoverServices: DiscoverServices, searchSource: ISearchSource, dataView: DataView | undefined, sort: (SortOrder[] & string[][]) | undefined, sampleSize: number, fetchContext: FetchContext, defaults: {
    sortDir: string;
}) => void;
