import type { DataView } from '@kbn/data-views-plugin/common';
import type { EsQuerySortValue } from '@kbn/data-plugin/common';
import { type SortOrder } from './get_sort';
/**
 * Prepares sort for search source, that's sending the request to ES
 * - Adds default sort if necessary
 * - Handles the special case when there's sorting by date_nanos typed fields
 *   the addon of the numeric_type guarantees the right sort order
 *   when there are indices with date and indices with date_nanos field
 */
export declare function getSortForSearchSource({ sort, dataView, defaultSortDir, includeTieBreaker, }: {
    sort: SortOrder[] | undefined;
    dataView: DataView | undefined;
    defaultSortDir: string;
    includeTieBreaker?: boolean;
}): EsQuerySortValue[];
