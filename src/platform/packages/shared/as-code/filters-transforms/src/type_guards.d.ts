/**
 * Type detection and guard functions for filter conversion
 */
import type { AsCodeFilter, AsCodeConditionFilter, AsCodeGroupFilter, AsCodeDSLFilter, AsCodeSpatialFilter } from '@kbn/as-code-filters-schema';
import type { StoredFilter } from './types';
/**
 * Type guard for query objects with term property
 */
export declare function hasTermQuery(query: unknown): query is {
    term: Record<string, unknown>;
};
/**
 * Type guard for query objects with terms property
 */
export declare function hasTermsQuery(query: unknown): query is {
    terms: Record<string, unknown>;
};
/**
 * Type guard for query objects with range property
 */
export declare function hasRangeQuery(query: unknown): query is {
    range: Record<string, unknown>;
};
/**
 * Type guard for query objects with exists property
 */
export declare function hasExistsQuery(query: unknown): query is {
    exists: {
        field: string;
    };
};
/**
 * Type guard for query objects with match property
 */
export declare function hasMatchQuery(query: unknown): query is {
    match: Record<string, unknown>;
};
/**
 * Type guard for query objects with match_phrase property
 */
export declare function hasMatchPhraseQuery(query: unknown): query is {
    match_phrase: Record<string, unknown>;
};
/**
 * Type guard for phrases filter format
 */
export declare function isPhrasesFilter(storedFilter: StoredFilter): boolean;
/**
 * Type guard for combined filter format
 * Validates that params is a non-empty array of Filter objects (not primitives)
 */
export declare function isCombinedFilter(storedFilter: StoredFilter): boolean;
/**
 * Type guard to check if filter has a condition property
 */
export declare function isConditionFilter(filter: AsCodeFilter): filter is AsCodeConditionFilter;
/**
 * Type guard to check if a condition filter has a range operator
 * Range filters are the only condition filters that can have a negate property
 */
export declare function isRangeConditionFilter(filter: AsCodeFilter): filter is AsCodeConditionFilter & {
    condition: {
        operator: 'range';
    };
    negate?: boolean;
};
/**
 * Type guard to check if filter has a group property
 */
export declare function isGroupFilter(filter: AsCodeFilter): filter is AsCodeGroupFilter;
/**
 * Type guard to check if filter has a dsl property
 */
export declare function isDSLFilter(filter: AsCodeFilter): filter is AsCodeDSLFilter;
/**
 * Type guard to check if filter is a spatial filter
 */
export declare function isSpatialFilter(filter: AsCodeFilter): filter is AsCodeSpatialFilter;
/**
 * Type guard to check if condition is a group of conditions
 */
export declare function isGroupCondition(condition: AsCodeConditionFilter['condition'] | AsCodeGroupFilter['group']): condition is AsCodeGroupFilter['group'];
/**
 * Type guard to check if an AsCodeFilter has valid structure
 * Validates that exactly one of condition, group, dsl, or spatial is present
 */
export declare function isAsCodeFilter(filter: AsCodeFilter): boolean;
