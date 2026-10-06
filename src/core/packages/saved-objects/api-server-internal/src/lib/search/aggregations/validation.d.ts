import type { estypes } from '@elastic/elasticsearch';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
/**
 * Validate an aggregation structure against the declared mappings and
 * aggregation schemas, and rewrite the attribute fields using the KQL-like syntax
 * - `{type}.attributes.{attribute}` to `{type}.{attribute}`
 * - `{type}.{rootField}` to `{rootField}`
 *
 * throws on the first validation error if any is encountered.
 */
export declare const validateAndConvertAggregations: (allowedTypes: string[], aggs: Record<string, estypes.AggregationsAggregationContainer>, indexMapping: IndexMapping) => Record<string, estypes.AggregationsAggregationContainer>;
