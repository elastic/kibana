import type { DataView } from '@kbn/data-views-plugin/public';
import { type SortOrder } from './get_sort';
/**
 * use in case the user didn't manually sort.
 * the default sort is returned depending on the data view or non for ES|QL queries
 */
export declare function getDefaultSort(dataView: DataView | Pick<DataView, 'timeFieldName'> | undefined, defaultSortOrder: string | undefined, hidingTimeColumn: boolean | undefined, isEsqlMode: boolean): SortOrder[];
