import type { estypes } from '@elastic/elasticsearch';
import type { ISearchSource, EsQuerySortValue } from '@kbn/data-plugin/public';
import { SortDirection } from '@kbn/data-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import type { IntervalValue } from './generate_intervals';
import type { SurrDocType } from '../services/context';
import type { DiscoverServices } from '../../../build_services';
import type { ScopedProfilesManager } from '../../../context_awareness';
/**
 * Fetch the hits between a given `interval` up to a maximum of `maxCount` documents.
 * The documents are sorted by `sort`
 *
 * The `searchSource` is assumed to have the appropriate data view
 * and filters set.
 */
export declare function fetchHitsInInterval(searchSource: ISearchSource, timeField: string, sort: [EsQuerySortValue, EsQuerySortValue], sortDir: SortDirection, interval: IntervalValue[], searchAfter: estypes.SortResults, maxCount: number, nanosValue: string, anchorId: string, type: SurrDocType, services: DiscoverServices, scopedProfilesManager: ScopedProfilesManager): Promise<{
    rows: DataTableRecord[];
    interceptedWarnings: SearchResponseWarning[];
}>;
