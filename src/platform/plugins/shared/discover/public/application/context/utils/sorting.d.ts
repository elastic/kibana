import type { DataView } from '@kbn/data-views-plugin/public';
export declare enum SortDirection {
    asc = "asc",
    desc = "desc"
}
/**
 * Returns a field from the intersection of the set of sortable fields in the
 * given data view and a given set of candidate field names.
 */
export declare function getFirstSortableField(dataView: DataView, fieldNames: string[]): string;
/**
 * Return the reversed sort direction.
 */
export declare function reverseSortDir(sortDirection: SortDirection): SortDirection;
