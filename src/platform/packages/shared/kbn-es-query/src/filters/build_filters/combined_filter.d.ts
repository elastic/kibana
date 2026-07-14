import { FilterStateStore } from '@kbn/es-query-constants';
import type { Filter, FilterMeta } from './types';
import { FILTERS } from './types';
import type { DataViewBase } from '../../es_query';
/**
 * @public
 */
export declare enum BooleanRelation {
    AND = "AND",
    OR = "OR"
}
/**
 * @public
 */
export interface CombinedFilterMeta extends FilterMeta {
    type: typeof FILTERS.COMBINED;
    relation: BooleanRelation;
    params: Filter[];
}
/**
 * @public
 */
export interface CombinedFilter extends Filter {
    meta: CombinedFilterMeta;
}
/**
 * @public
 */
export declare function isCombinedFilter(filter: Filter): filter is CombinedFilter;
/**
 * Builds an COMBINED filter. An COMBINED filter is a filter with multiple sub-filters. Each sub-filter (FilterItem)
 * represents a condition.
 * @param relation The type of relation with which to combine the filters (AND/OR)
 * @param filters An array of sub-filters
 * @public
 */
export declare function buildCombinedFilter(relation: BooleanRelation, filters: Filter[], indexPattern: Pick<DataViewBase, 'id'>, disabled?: FilterMeta['disabled'], negate?: FilterMeta['negate'], alias?: FilterMeta['alias'], store?: FilterStateStore): CombinedFilter;
