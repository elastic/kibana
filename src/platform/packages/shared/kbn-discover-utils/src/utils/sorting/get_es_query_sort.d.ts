import type { EsQuerySortValue, SortDirection } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
/**
 * Returns `EsQuerySort` which is used to sort records in the ES query
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html
 * @param sortDir
 * @param timeFieldName
 * @param tieBreakerFieldName
 * @param isTimeNanosBased
 */
export declare function getEsQuerySort({ sortDir, timeFieldName, tieBreakerFieldName, isTimeNanosBased, }: {
    sortDir: SortDirection;
    timeFieldName: string;
    tieBreakerFieldName: string;
    isTimeNanosBased: boolean;
}): [EsQuerySortValue, EsQuerySortValue];
/**
 * Prepares "sort" structure for a time field for next ES request
 * @param sortDir
 * @param timeFieldName
 * @param isTimeNanosBased
 */
export declare function getESQuerySortForTimeField({ sortDir, timeFieldName, isTimeNanosBased, }: {
    sortDir: SortDirection;
    timeFieldName: string;
    isTimeNanosBased: boolean;
}): EsQuerySortValue;
/**
 * Prepares "sort" structure for a tie breaker for next ES request
 * @param sortDir
 * @param tieBreakerFieldName
 */
export declare function getESQuerySortForTieBreaker({ sortDir, tieBreakerFieldName, }: {
    sortDir: SortDirection;
    tieBreakerFieldName: string;
}): EsQuerySortValue;
/**
 * The default tie breaker for Discover
 */
export declare const DEFAULT_TIE_BREAKER_NAME = "_doc";
/**
 * Returns a field from the intersection of the set of sortable fields in the
 * given data view and a given set of candidate field names.
 */
export declare function getTieBreakerFieldName(dataView: DataView, uiSettings: Pick<IUiSettingsClient, 'get'>): any;
