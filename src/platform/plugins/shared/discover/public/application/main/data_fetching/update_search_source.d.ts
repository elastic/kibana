import type { ISearchSource } from '@kbn/data-plugin/public';
import { type DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import type { DiscoverServices } from '../../../build_services';
/**
 * Helper function to update the given searchSource before fetching/sharing/persisting
 */
export declare function updateVolatileSearchSource(searchSource: ISearchSource, { dataView, services, sort, inputTimeRange, }: {
    dataView: DataView;
    services: DiscoverServices;
    sort?: SortOrder[];
    inputTimeRange?: TimeRange;
}): void;
