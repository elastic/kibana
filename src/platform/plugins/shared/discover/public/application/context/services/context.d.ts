import type { Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart, ISearchSource } from '@kbn/data-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import type { SortDirection } from '../utils/sorting';
import type { DiscoverServices } from '../../../build_services';
import type { ScopedProfilesManager } from '../../../context_awareness';
export declare enum SurrDocType {
    SUCCESSORS = "successors",
    PREDECESSORS = "predecessors"
}
/**
 * Fetch successor or predecessor documents of a given anchor document
 *
 * @param {SurrDocType} type - `successors` or `predecessors`
 * @param {DataView} dataView
 * @param {DataTableRecord} anchor - anchor record
 * @param {string} tieBreakerField - name of the tie breaker, the 2nd sort field
 * @param {SortDirection} sortDir - direction of sorting
 * @param {number} size - number of records to retrieve
 * @param {Filter[]} filters - to apply in the elastic query
 * @param {DataPublicPluginStart} data
 * @param {DiscoverServices} services
 * @returns {Promise<object[]>}
 */
export declare function fetchSurroundingDocs(type: SurrDocType, dataView: DataView, anchor: DataTableRecord, tieBreakerField: string, sortDir: SortDirection, size: number, filters: Filter[], data: DataPublicPluginStart, services: DiscoverServices, scopedProfilesManager: ScopedProfilesManager): Promise<{
    rows: DataTableRecord[];
    interceptedWarnings: SearchResponseWarning[] | undefined;
}>;
export declare function updateSearchSource(searchSource: ISearchSource, dataView: DataView, filters: Filter[]): import("@kbn/data-plugin/public").SearchSource;
