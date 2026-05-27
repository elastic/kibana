import { type Filter } from '@kbn/es-query';
export interface FilterTranslationResult {
    /** Combined WHERE expression fragment (all translatable filters ANDed), empty string if none */
    esqlExpression: string;
    /** Filters that could not be translated to ES|QL */
    untranslatableFilters: Filter[];
}
/**
 * Converts an array of Elasticsearch Query DSL filters to an ES|QL WHERE clause expression.
 * Disabled filters are skipped. Negated filters are wrapped with NOT.
 * Untranslatable filter types (custom, spatial, scripted) are returned separately.
 */
export declare const convertFiltersToESQLExpression: (filters: Filter[]) => FilterTranslationResult;
