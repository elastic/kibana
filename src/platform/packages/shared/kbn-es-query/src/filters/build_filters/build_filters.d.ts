import type { FilterStateStore } from '@kbn/es-query-constants';
import type { Serializable } from '@kbn/utility-types';
import type { Filter, FILTERS } from './types';
import type { DataViewFieldBase, DataViewBase } from '../../es_query';
/**
 *
 * @param indexPattern
 * @param field
 * @param type
 * @param negate whether the filter is negated (NOT filter)
 * @param disabled  whether the filter is disabled andwon't be applied to searches
 * @param params
 * @param alias a display name for the filter
 * @param store whether the filter applies to the current application or should be applied to global context
 * @returns
 *
 * @public
 */
export declare function buildFilter(indexPattern: DataViewBase, field: DataViewFieldBase, type: FILTERS, negate: boolean, disabled: boolean, params: Serializable, alias: string | null, store?: FilterStateStore): Filter;
