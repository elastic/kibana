import type { Filter } from '../filters';
import type { DataViewBase } from './types';
/** @internal */
export interface DeprecatedMatchPhraseFilter extends Filter {
    match: {
        [field: string]: {
            query: any;
            type: 'phrase';
        };
    };
}
/** @internal */
export declare function migrateFilter(filter: Filter, indexPattern?: DataViewBase): Filter;
