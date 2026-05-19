import type { DataViewFieldBase, DataViewBaseNoFields } from '../../es_query';
import type { Filter, FilterMeta } from './types';
/** @public */
export type ExistsFilter = Filter & {
    meta: FilterMeta;
    query: {
        exists?: {
            field: string;
        };
    };
};
/**
 * @param filter
 * @returns `true` if a filter is an `ExistsFilter`
 *
 * @public
 */
export declare const isExistsFilter: (filter: Filter) => filter is ExistsFilter;
/**
 * @internal
 */
export declare const getExistsFilterField: (filter: ExistsFilter) => string | undefined;
/**
 * Builds an `ExistsFilter`
 * @param field field to validate the existence of
 * @param indexPattern index pattern to look for the field in
 * @returns An `ExistsFilter`
 *
 * @public
 */
export declare const buildExistsFilter: (field: DataViewFieldBase, indexPattern: DataViewBaseNoFields) => ExistsFilter;
export declare const buildSimpleExistFilter: (fieldName: string, dataViewId: string) => ExistsFilter;
