import type { estypes } from '@elastic/elasticsearch';
import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
/**
 * Builds `terms` filter clauses from optional arrays. Skips undefined or empty arrays.
 */
export declare const buildConditionalTermsFilters: (filters: ReadonlyArray<{
    field: string;
    values: FieldValue[] | undefined;
}>) => estypes.QueryDslQueryContainer[];
/**
 * Builds the full-text search clause used by the workflow list endpoint.
 * Combines phrase matching, best-fields, prefix matching, and wildcard matching
 * across name, description, and tags fields with appropriate boosts.
 */
export declare const buildWorkflowTextSearchClause: (query: string) => estypes.QueryDslQueryContainer;
