import type { GroupingAggregation, ParsedGroupingAggregation } from '../..';
import type { GroupingQueryArgs, GroupingQuery } from './types';
/** The maximum number of groups to render */
export declare const DEFAULT_GROUP_BY_FIELD_SIZE = 10;
export declare const MAX_QUERY_SIZE = 10000;
export declare const MAX_RUNTIME_FIELD_SIZE = 100;
/**
 * Composes grouping query and aggregations
 * @param additionalFilters Global filtering applicable to the grouping component.
 * Array of {@link BoolAgg} to be added to the query
 * @param pageNumber starting grouping results page number
 * @param rootAggregations Top level aggregations to get the groups number or overall groups metrics.
 * Array of {@link NamedAggregation}
 * @param runtimeMappings mappings of runtime fields [see runtimeMappings]{@link GroupingQueryArgs.runtimeMappings}
 * @param size number of grouping results per page
 * @param sort add one or more sorts on specific fields
 * @param statsAggregations group level aggregations which correspond to {@link GroupStatsRenderer} configuration
 * @param uniqueValue unique value to use for crazy query magic
 * @param timeRange timerange object for the query (from - to)
 * @param multiValueFieldsToFlatten list of multi-value field to be flattened when grouping
 * @param countByKeyForMultiValueFields field ES should use to count the documents (defaults to 'groupByField')
 * @param unitsCountFilter custom filter for unitsCount aggregation
 *
 * @returns query dsl {@link GroupingQuery}
 */
export declare const getGroupingQuery: ({ additionalFilters, groupByField, pageNumber, rootAggregations, runtimeMappings, size, sort, statsAggregations, uniqueValue, timeRange, multiValueFieldsToFlatten, countByKeyForMultiValueFields, unitsCountFilter, }: GroupingQueryArgs) => GroupingQuery;
/**
 * Parses the grouping query response to add the isNullGroup
 * flag to the buckets and to format the bucket keys
 * @param selectedGroup from the grouping query
 * @param uniqueValue from the grouping query
 * @param aggs aggregation response from the grouping query
 */
export declare const parseGroupingQuery: <T>(selectedGroup: string, uniqueValue: string, aggs?: GroupingAggregation<T>) => ParsedGroupingAggregation<T> | {};
