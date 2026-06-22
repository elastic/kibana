/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */
// @ts-nocheck

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

/**
 * We are still working on this type, it will arrive soon.
 * If it's critical for you, please open an issue.
 * https://github.com/elastic/elasticsearch-specification
 */
export const TODO = z.record(z.string(), z.any())
export type TODO = z.infer<typeof TODO>

export const SearchBoundaryScanner = z.enum(['chars', 'sentence', 'word']).meta({ id: 'SearchBoundaryScanner' })
export type SearchBoundaryScanner = z.infer<typeof SearchBoundaryScanner>

/** Path to field or array of paths. Some API's support wildcards in the path to select multiple fields. */
export const Field = z.string().meta({ id: 'Field' })
export type Field = z.infer<typeof Field>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

/** A reference to a field with formatting instructions on how to return the value */
export const QueryDslFieldAndFormat = z.object({
  field: Field.describe('A wildcard pattern. The request returns values for field names matching this pattern.'),
  format: z.string().describe('The format in which the values are returned.').optional(),
  include_unmapped: z.boolean().optional()
}).meta({ id: 'QueryDslFieldAndFormat' })
export type QueryDslFieldAndFormat = z.infer<typeof QueryDslFieldAndFormat>

export const SearchHighlighterType = z.union([z.enum(['plain', 'fvh', 'unified']), z.string()]).meta({ id: 'SearchHighlighterType' })
export type SearchHighlighterType = z.infer<typeof SearchHighlighterType>

export const SearchHighlighterFragmenter = z.enum(['simple', 'span']).meta({ id: 'SearchHighlighterFragmenter' })
export type SearchHighlighterFragmenter = z.infer<typeof SearchHighlighterFragmenter>

export const float = z.number().meta({ id: 'float' })
export type float = z.infer<typeof float>

export const QueryDslQueryBase = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional()
}).meta({ id: 'QueryDslQueryBase' })
export type QueryDslQueryBase = z.infer<typeof QueryDslQueryBase>

/** The minimum number of terms that should match as integer, percentage or range */
export const MinimumShouldMatch = z.union([integer, z.string()]).meta({ id: 'MinimumShouldMatch' })
export type MinimumShouldMatch = z.infer<typeof MinimumShouldMatch>

export interface QueryDslBoolQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  minimum_should_match?: MinimumShouldMatch | undefined
  must?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  must_not?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  should?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
}
export const QueryDslBoolQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('The clause (query) must appear in matching documents. However, unlike `must`, the score of the query will be ignored.').optional() },
  minimum_should_match: MinimumShouldMatch.describe('Specifies the number or percentage of `should` clauses returned documents must match.').optional(),
  get must (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('The clause (query) must appear in matching documents and will contribute to the score.').optional() },
  get must_not (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('The clause (query) must not appear in the matching documents. Because scoring is ignored, a score of `0` is returned for all documents.').optional() },
  get should (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('The clause (query) should appear in the matching document.').optional() }
}).meta({ id: 'QueryDslBoolQuery' })
export type QueryDslBoolQuery = z.infer<typeof QueryDslBoolQuery>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

export interface QueryDslBoostingQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  negative_boost: double
  negative: QueryDslQueryContainerShape
  positive: QueryDslQueryContainerShape
}
export const QueryDslBoostingQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  negative_boost: double.describe('Floating point number between 0 and 1.0 used to decrease the relevance scores of documents matching the `negative` query.'),
  get negative () { return QueryDslQueryContainer.describe('Query used to decrease the relevance score of matching documents.') },
  get positive () { return QueryDslQueryContainer.describe('Any returned documents must match this query.') }
}).meta({ id: 'QueryDslBoostingQuery' })
export type QueryDslBoostingQuery = z.infer<typeof QueryDslBoostingQuery>

export const QueryDslOperator = z.enum(['and', 'AND', 'or', 'OR']).meta({ id: 'QueryDslOperator' })
export type QueryDslOperator = z.infer<typeof QueryDslOperator>

export const QueryDslCommonTermsQuery = z.object({
  ...QueryDslQueryBase.shape,
  analyzer: z.string().optional(),
  cutoff_frequency: double.optional(),
  high_freq_operator: QueryDslOperator.optional(),
  low_freq_operator: QueryDslOperator.optional(),
  minimum_should_match: MinimumShouldMatch.optional(),
  query: z.string()
}).meta({ id: 'QueryDslCommonTermsQuery' })
export type QueryDslCommonTermsQuery = z.infer<typeof QueryDslCommonTermsQuery>

export const QueryDslCombinedFieldsOperator = z.enum(['or', 'and']).meta({ id: 'QueryDslCombinedFieldsOperator' })
export type QueryDslCombinedFieldsOperator = z.infer<typeof QueryDslCombinedFieldsOperator>

export const QueryDslCombinedFieldsZeroTerms = z.enum(['none', 'all']).meta({ id: 'QueryDslCombinedFieldsZeroTerms' })
export type QueryDslCombinedFieldsZeroTerms = z.infer<typeof QueryDslCombinedFieldsZeroTerms>

export const QueryDslCombinedFieldsQuery = z.object({
  ...QueryDslQueryBase.shape,
  fields: z.array(Field).describe('List of fields to search. Field wildcard patterns are allowed. Only `text` fields are supported, and they must all have the same search `analyzer`.'),
  query: z.string().describe('Text to search for in the provided `fields`. The `combined_fields` query analyzes the provided text before performing a search.'),
  auto_generate_synonyms_phrase_query: z.boolean().describe('If true, match phrase queries are automatically created for multi-term synonyms.').optional(),
  operator: QueryDslCombinedFieldsOperator.describe('Boolean logic used to interpret text in the query value.').optional(),
  minimum_should_match: MinimumShouldMatch.describe('Minimum number of clauses that must match for a document to be returned.').optional(),
  zero_terms_query: QueryDslCombinedFieldsZeroTerms.describe('Indicates whether no documents are returned if the analyzer removes all tokens, such as when using a `stop` filter.').optional()
}).meta({ id: 'QueryDslCombinedFieldsQuery' })
export type QueryDslCombinedFieldsQuery = z.infer<typeof QueryDslCombinedFieldsQuery>

export interface QueryDslConstantScoreQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  filter: QueryDslQueryContainerShape
}
export const QueryDslConstantScoreQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get filter () { return QueryDslQueryContainer.describe('Filter query you wish to run. Any returned documents must match this query. Filter queries do not calculate relevance scores. To speed up performance, Elasticsearch automatically caches frequently used filter queries.') }
}).meta({ id: 'QueryDslConstantScoreQuery' })
export type QueryDslConstantScoreQuery = z.infer<typeof QueryDslConstantScoreQuery>

export interface QueryDslDisMaxQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  queries: QueryDslQueryContainerShape[]
  tie_breaker?: double | undefined
}
export const QueryDslDisMaxQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get queries () { return QueryDslQueryContainer.array().describe('One or more query clauses. Returned documents must match one or more of these queries. If a document matches multiple queries, Elasticsearch uses the highest relevance score.') },
  tie_breaker: double.describe('Floating point number between 0 and 1.0 used to increase the relevance scores of documents matching multiple query clauses.').optional()
}).meta({ id: 'QueryDslDisMaxQuery' })
export type QueryDslDisMaxQuery = z.infer<typeof QueryDslDisMaxQuery>

export const QueryDslDistanceFeatureQueryBase = z.object({
  ...QueryDslQueryBase.shape,
  origin: z.any().describe('Date or point of origin used to calculate distances. If the `field` value is a `date` or `date_nanos` field, the `origin` value must be a date. Date Math, such as `now-1h`, is supported. If the field value is a `geo_point` field, the `origin` value must be a geopoint.'),
  pivot: z.any().describe('Distance from the `origin` at which relevance scores receive half of the `boost` value. If the `field` value is a `date` or `date_nanos` field, the `pivot` value must be a time unit, such as `1h` or `10d`. If the `field` value is a `geo_point` field, the `pivot` value must be a distance unit, such as `1km` or `12m`.'),
  field: Field.describe('Name of the field used to calculate distances. This field must meet the following criteria: be a `date`, `date_nanos` or `geo_point` field; have an `index` mapping parameter value of `true`, which is the default; have an `doc_values` mapping parameter value of `true`, which is the default.')
}).meta({ id: 'QueryDslDistanceFeatureQueryBase' })
export type QueryDslDistanceFeatureQueryBase = z.infer<typeof QueryDslDistanceFeatureQueryBase>

export const QueryDslUntypedDistanceFeatureQuery = z.object({
  ...QueryDslDistanceFeatureQueryBase.shape
}).meta({ id: 'QueryDslUntypedDistanceFeatureQuery' })
export type QueryDslUntypedDistanceFeatureQuery = z.infer<typeof QueryDslUntypedDistanceFeatureQuery>

export const QueryDslGeoDistanceFeatureQuery = z.object({
  ...QueryDslDistanceFeatureQueryBase.shape
}).meta({ id: 'QueryDslGeoDistanceFeatureQuery' })
export type QueryDslGeoDistanceFeatureQuery = z.infer<typeof QueryDslGeoDistanceFeatureQuery>

export const QueryDslDateDistanceFeatureQuery = z.object({
  ...QueryDslDistanceFeatureQueryBase.shape
}).meta({ id: 'QueryDslDateDistanceFeatureQuery' })
export type QueryDslDateDistanceFeatureQuery = z.infer<typeof QueryDslDateDistanceFeatureQuery>

export const QueryDslDistanceFeatureQuery = z.union([QueryDslUntypedDistanceFeatureQuery, QueryDslGeoDistanceFeatureQuery, QueryDslDateDistanceFeatureQuery]).meta({ id: 'QueryDslDistanceFeatureQuery' })
export type QueryDslDistanceFeatureQuery = z.infer<typeof QueryDslDistanceFeatureQuery>

export const QueryDslExistsQuery = z.object({
  ...QueryDslQueryBase.shape,
  field: Field.describe('Name of the field you wish to search.')
}).meta({ id: 'QueryDslExistsQuery' })
export type QueryDslExistsQuery = z.infer<typeof QueryDslExistsQuery>

export const QueryDslFunctionBoostMode = z.enum(['multiply', 'replace', 'sum', 'avg', 'max', 'min']).meta({ id: 'QueryDslFunctionBoostMode' })
export type QueryDslFunctionBoostMode = z.infer<typeof QueryDslFunctionBoostMode>

export const QueryDslMultiValueMode = z.enum(['min', 'max', 'avg', 'sum']).meta({ id: 'QueryDslMultiValueMode' })
export type QueryDslMultiValueMode = z.infer<typeof QueryDslMultiValueMode>

export const QueryDslDecayFunctionBase = z.object({
  multi_value_mode: QueryDslMultiValueMode.describe('Determines how the distance is calculated when a field used for computing the decay contains multiple values.').optional()
}).meta({ id: 'QueryDslDecayFunctionBase' })
export type QueryDslDecayFunctionBase = z.infer<typeof QueryDslDecayFunctionBase>

export const QueryDslUntypedDecayFunction = z.object({
  multi_value_mode: QueryDslMultiValueMode.describe('Determines how the distance is calculated when a field used for computing the decay contains multiple values.').optional()
}).catchall(z.any()).meta({ id: 'QueryDslUntypedDecayFunction' })
export type QueryDslUntypedDecayFunction = z.infer<typeof QueryDslUntypedDecayFunction>

export const QueryDslDateDecayFunction = z.object({
  multi_value_mode: QueryDslMultiValueMode.describe('Determines how the distance is calculated when a field used for computing the decay contains multiple values.').optional()
}).catchall(z.any()).meta({ id: 'QueryDslDateDecayFunction' })
export type QueryDslDateDecayFunction = z.infer<typeof QueryDslDateDecayFunction>

export const QueryDslNumericDecayFunction = z.object({
  multi_value_mode: QueryDslMultiValueMode.describe('Determines how the distance is calculated when a field used for computing the decay contains multiple values.').optional()
}).catchall(z.any()).meta({ id: 'QueryDslNumericDecayFunction' })
export type QueryDslNumericDecayFunction = z.infer<typeof QueryDslNumericDecayFunction>

export const QueryDslGeoDecayFunction = z.object({
  multi_value_mode: QueryDslMultiValueMode.describe('Determines how the distance is calculated when a field used for computing the decay contains multiple values.').optional()
}).catchall(z.any()).meta({ id: 'QueryDslGeoDecayFunction' })
export type QueryDslGeoDecayFunction = z.infer<typeof QueryDslGeoDecayFunction>

export const QueryDslDecayFunction = z.union([QueryDslUntypedDecayFunction, QueryDslDateDecayFunction, QueryDslNumericDecayFunction, QueryDslGeoDecayFunction]).meta({ id: 'QueryDslDecayFunction' })
export type QueryDslDecayFunction = z.infer<typeof QueryDslDecayFunction>

export const QueryDslFieldValueFactorModifier = z.enum(['none', 'log', 'log1p', 'log2p', 'ln', 'ln1p', 'ln2p', 'square', 'sqrt', 'reciprocal']).meta({ id: 'QueryDslFieldValueFactorModifier' })
export type QueryDslFieldValueFactorModifier = z.infer<typeof QueryDslFieldValueFactorModifier>

export const QueryDslFieldValueFactorScoreFunction = z.object({
  field: Field.describe('Field to be extracted from the document.'),
  factor: double.describe('Optional factor to multiply the field value with.').optional(),
  missing: double.describe('Value used if the document doesn’t have that field. The modifier and factor are still applied to it as though it were read from the document.').optional(),
  modifier: QueryDslFieldValueFactorModifier.describe('Modifier to apply to the field value.').optional()
}).meta({ id: 'QueryDslFieldValueFactorScoreFunction' })
export type QueryDslFieldValueFactorScoreFunction = z.infer<typeof QueryDslFieldValueFactorScoreFunction>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const QueryDslRandomScoreFunction = z.object({
  field: Field.optional(),
  seed: z.union([long, z.string()]).optional()
}).meta({ id: 'QueryDslRandomScoreFunction' })
export type QueryDslRandomScoreFunction = z.infer<typeof QueryDslRandomScoreFunction>

export const Metadata = z.record(z.string(), z.any()).meta({ id: 'Metadata' })
export type Metadata = z.infer<typeof Metadata>

export const AggregationsAggregation = z.object({
}).meta({ id: 'AggregationsAggregation' })
export type AggregationsAggregation = z.infer<typeof AggregationsAggregation>

/** Base type for bucket aggregations. These aggregations also accept sub-aggregations. */
export const AggregationsBucketAggregationBase = z.object({
}).meta({ id: 'AggregationsBucketAggregationBase' })
export type AggregationsBucketAggregationBase = z.infer<typeof AggregationsBucketAggregationBase>

export interface AggregationsAdjacencyMatrixAggregationShape {
  filters?: Record<string, QueryDslQueryContainerShape> | undefined
  separator?: string | undefined
}
export const AggregationsAdjacencyMatrixAggregation = z.object({
  get filters (): z.ZodOptional<z.ZodRecord<z.ZodString, typeof QueryDslQueryContainer>> { return z.record(z.string(), QueryDslQueryContainer).describe('Filters used to create buckets. At least one filter is required.').optional() },
  separator: z.string().describe('Separator used to concatenate filter names. Defaults to &.').optional()
}).meta({ id: 'AggregationsAdjacencyMatrixAggregation' })
export type AggregationsAdjacencyMatrixAggregation = z.infer<typeof AggregationsAdjacencyMatrixAggregation>

export const AggregationsMinimumInterval = z.enum(['second', 'minute', 'hour', 'day', 'month', 'year']).meta({ id: 'AggregationsMinimumInterval' })
export type AggregationsMinimumInterval = z.infer<typeof AggregationsMinimumInterval>

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

/**
 * A date and time, either as a string whose format can depend on the context (defaulting to ISO 8601), or a
 * number of milliseconds since the Epoch. Elasticsearch accepts both as input, but will generally output a string
 * representation.
 */
export const DateTime = z.union([z.string(), EpochTime]).meta({ id: 'DateTime' })
export type DateTime = z.infer<typeof DateTime>

export const TimeZone = z.string().meta({ id: 'TimeZone' })
export type TimeZone = z.infer<typeof TimeZone>

export interface AggregationsAutoDateHistogramAggregationShape {
  buckets?: integer | undefined
  field?: Field | undefined
  format?: string | undefined
  minimum_interval?: AggregationsMinimumInterval | undefined
  missing?: DateTime | undefined
  offset?: string | undefined
  params?: Record<string, unknown> | undefined
  script?: ScriptShape | undefined
  time_zone?: TimeZone | undefined
}
export const AggregationsAutoDateHistogramAggregation = z.object({
  buckets: integer.describe('The target number of buckets.').optional(),
  field: Field.describe('The field on which to run the aggregation.').optional(),
  format: z.string().describe('The date format used to format `key_as_string` in the response. If no `format` is specified, the first date format specified in the field mapping is used.').optional(),
  minimum_interval: AggregationsMinimumInterval.describe('The minimum rounding interval. This can make the collection process more efficient, as the aggregation will not attempt to round at any interval lower than `minimum_interval`.').optional(),
  missing: DateTime.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  offset: z.string().describe('Time zone specified as a ISO 8601 UTC offset.').optional(),
  params: z.record(z.string(), z.any()).optional(),
  get script () { return Script.optional() },
  time_zone: TimeZone.describe('Time zone ID.').optional()
}).meta({ id: 'AggregationsAutoDateHistogramAggregation' })
export type AggregationsAutoDateHistogramAggregation = z.infer<typeof AggregationsAutoDateHistogramAggregation>

export const AggregationsMissing = z.union([z.string(), integer, double, z.boolean()]).meta({ id: 'AggregationsMissing' })
export type AggregationsMissing = z.infer<typeof AggregationsMissing>

export interface AggregationsMetricAggregationBaseShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
}
export const AggregationsMetricAggregationBase = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() }
}).meta({ id: 'AggregationsMetricAggregationBase' })
export type AggregationsMetricAggregationBase = z.infer<typeof AggregationsMetricAggregationBase>

export interface AggregationsFormatMetricAggregationBaseShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  format?: string | undefined
}
export const AggregationsFormatMetricAggregationBase = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  format: z.string().optional()
}).meta({ id: 'AggregationsFormatMetricAggregationBase' })
export type AggregationsFormatMetricAggregationBase = z.infer<typeof AggregationsFormatMetricAggregationBase>

export interface AggregationsAverageAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  format?: string | undefined
}
export const AggregationsAverageAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  format: z.string().optional()
}).meta({ id: 'AggregationsAverageAggregation' })
export type AggregationsAverageAggregation = z.infer<typeof AggregationsAverageAggregation>

/**
 * Buckets path can be expressed in different ways, and an aggregation may accept some or all of these
 * forms depending on its type. Please refer to each aggregation's documentation to know what buckets
 * path forms they accept.
 */
export const AggregationsBucketsPath = z.union([z.string(), z.array(z.string()), z.record(z.string(), z.string())]).meta({ id: 'AggregationsBucketsPath' })
export type AggregationsBucketsPath = z.infer<typeof AggregationsBucketsPath>

export const AggregationsBucketPathAggregation = z.object({
  buckets_path: AggregationsBucketsPath.describe('Path to the buckets that contain one set of values to correlate.').optional()
}).meta({ id: 'AggregationsBucketPathAggregation' })
export type AggregationsBucketPathAggregation = z.infer<typeof AggregationsBucketPathAggregation>

export const AggregationsGapPolicy = z.enum(['skip', 'insert_zeros', 'keep_values']).meta({ id: 'AggregationsGapPolicy' })
export type AggregationsGapPolicy = z.infer<typeof AggregationsGapPolicy>

export const AggregationsPipelineAggregationBase = z.object({
  ...AggregationsBucketPathAggregation.shape,
  format: z.string().describe('`DecimalFormat` pattern for the output value. If specified, the formatted value is returned in the aggregation’s `value_as_string` property.').optional(),
  gap_policy: AggregationsGapPolicy.describe('Policy to apply when gaps are found in the data.').optional()
}).meta({ id: 'AggregationsPipelineAggregationBase' })
export type AggregationsPipelineAggregationBase = z.infer<typeof AggregationsPipelineAggregationBase>

export const AggregationsAverageBucketAggregation = z.object({
  ...AggregationsPipelineAggregationBase.shape
}).meta({ id: 'AggregationsAverageBucketAggregation' })
export type AggregationsAverageBucketAggregation = z.infer<typeof AggregationsAverageBucketAggregation>

export const AggregationsTDigestExecutionHint = z.enum(['default', 'high_accuracy']).meta({ id: 'AggregationsTDigestExecutionHint' })
export type AggregationsTDigestExecutionHint = z.infer<typeof AggregationsTDigestExecutionHint>

export interface AggregationsBoxplotAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  compression?: double | undefined
  execution_hint?: AggregationsTDigestExecutionHint | undefined
}
export const AggregationsBoxplotAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  compression: double.describe('Limits the maximum number of nodes used by the underlying TDigest algorithm to `20 * compression`, enabling control of memory usage and approximation error.').optional(),
  execution_hint: AggregationsTDigestExecutionHint.describe('The default implementation of TDigest is optimized for performance, scaling to millions or even billions of sample values while maintaining acceptable accuracy levels (close to 1% relative error for millions of samples in some cases). To use an implementation optimized for accuracy, set this parameter to high_accuracy instead.').optional()
}).meta({ id: 'AggregationsBoxplotAggregation' })
export type AggregationsBoxplotAggregation = z.infer<typeof AggregationsBoxplotAggregation>

export interface AggregationsBucketScriptAggregationShape {
  buckets_path?: AggregationsBucketsPath | undefined
  format?: string | undefined
  gap_policy?: AggregationsGapPolicy | undefined
  script?: ScriptShape | undefined
}
export const AggregationsBucketScriptAggregation = z.object({
  buckets_path: AggregationsBucketsPath.describe('Path to the buckets that contain one set of values to correlate.').optional(),
  format: z.string().describe('`DecimalFormat` pattern for the output value. If specified, the formatted value is returned in the aggregation’s `value_as_string` property.').optional(),
  gap_policy: AggregationsGapPolicy.describe('Policy to apply when gaps are found in the data.').optional(),
  get script () { return Script.describe('The script to run for this aggregation.').optional() }
}).meta({ id: 'AggregationsBucketScriptAggregation' })
export type AggregationsBucketScriptAggregation = z.infer<typeof AggregationsBucketScriptAggregation>

export interface AggregationsBucketSelectorAggregationShape {
  buckets_path?: AggregationsBucketsPath | undefined
  format?: string | undefined
  gap_policy?: AggregationsGapPolicy | undefined
  script?: ScriptShape | undefined
}
export const AggregationsBucketSelectorAggregation = z.object({
  buckets_path: AggregationsBucketsPath.describe('Path to the buckets that contain one set of values to correlate.').optional(),
  format: z.string().describe('`DecimalFormat` pattern for the output value. If specified, the formatted value is returned in the aggregation’s `value_as_string` property.').optional(),
  gap_policy: AggregationsGapPolicy.describe('Policy to apply when gaps are found in the data.').optional(),
  get script () { return Script.describe('The script to run for this aggregation.').optional() }
}).meta({ id: 'AggregationsBucketSelectorAggregation' })
export type AggregationsBucketSelectorAggregation = z.infer<typeof AggregationsBucketSelectorAggregation>

export const SortOrder = z.enum(['asc', 'desc']).meta({ id: 'SortOrder' })
export type SortOrder = z.infer<typeof SortOrder>

export const ScoreSort = z.object({
  order: SortOrder.optional()
}).meta({ id: 'ScoreSort' })
export type ScoreSort = z.infer<typeof ScoreSort>

export const SortMode = z.enum(['min', 'max', 'sum', 'avg', 'median']).meta({ id: 'SortMode' })
export type SortMode = z.infer<typeof SortMode>

export const GeoDistanceType = z.enum(['arc', 'plane']).meta({ id: 'GeoDistanceType' })
export type GeoDistanceType = z.infer<typeof GeoDistanceType>

export const DistanceUnit = z.enum(['in', 'ft', 'yd', 'mi', 'nmi', 'km', 'm', 'cm', 'mm']).meta({ id: 'DistanceUnit' })
export type DistanceUnit = z.infer<typeof DistanceUnit>

export interface NestedSortValueShape {
  filter?: QueryDslQueryContainerShape | undefined
  max_children?: integer | undefined
  nested?: NestedSortValueShape | undefined
  path: Field
}
export const NestedSortValue = z.object({
  get filter () { return QueryDslQueryContainer.optional() },
  max_children: integer.optional(),
  get nested () { return NestedSortValue.optional() },
  path: Field
}).meta({ id: 'NestedSortValue' })
export type NestedSortValue = z.infer<typeof NestedSortValue>

export interface GeoDistanceSortShape {
  mode?: SortMode | undefined
  distance_type?: GeoDistanceType | undefined
  ignore_unmapped?: boolean | undefined
  order?: SortOrder | undefined
  unit?: DistanceUnit | undefined
  nested?: NestedSortValueShape | undefined
}
export const GeoDistanceSort = z.looseObject({
  mode: SortMode.optional(),
  distance_type: GeoDistanceType.optional(),
  ignore_unmapped: z.boolean().optional(),
  order: SortOrder.optional(),
  unit: DistanceUnit.optional(),
  get nested () { return NestedSortValue.optional() }
}).meta({ id: 'GeoDistanceSort' })
export type GeoDistanceSort = z.infer<typeof GeoDistanceSort>

export const ScriptSortType = z.enum(['string', 'number', 'version']).meta({ id: 'ScriptSortType' })
export type ScriptSortType = z.infer<typeof ScriptSortType>

export interface ScriptSortShape {
  order?: SortOrder | undefined
  script: ScriptShape
  type?: ScriptSortType | undefined
  mode?: SortMode | undefined
  nested?: NestedSortValueShape | undefined
}
export const ScriptSort = z.object({
  order: SortOrder.optional(),
  get script () { return Script },
  type: ScriptSortType.optional(),
  mode: SortMode.optional(),
  get nested () { return NestedSortValue.optional() }
}).meta({ id: 'ScriptSort' })
export type ScriptSort = z.infer<typeof ScriptSort>

export interface SortOptionsShape {
  _score?: ScoreSort | undefined
  _doc?: ScoreSort | undefined
  _geo_distance?: GeoDistanceSortShape | undefined
  _script?: ScriptSortShape | undefined
}
export const SortOptions = z.looseObject({
  _score: ScoreSort.optional(),
  _doc: ScoreSort.optional(),
  get _geo_distance () { return GeoDistanceSort.optional() },
  get _script () { return ScriptSort.optional() }
}).meta({ id: 'SortOptions' })
export type SortOptions = z.infer<typeof SortOptions>

export type SortCombinationsShape = Field | SortOptionsShape
export const SortCombinations: z.ZodType<SortCombinationsShape> = z.union([Field, z.lazy(() => SortOptions)]).meta({ id: 'SortCombinations' })
export type SortCombinations = z.infer<typeof SortCombinations>

export type SortShape = SortCombinationsShape | SortCombinationsShape[]
export const Sort: z.ZodType<SortShape> = z.union([z.lazy(() => SortCombinations), z.array(z.lazy(() => SortCombinations))]).meta({ id: 'Sort' })
export type Sort = z.infer<typeof Sort>

export interface AggregationsBucketSortAggregationShape {
  from?: integer | undefined
  gap_policy?: AggregationsGapPolicy | undefined
  size?: integer | undefined
  sort?: SortShape | undefined
}
export const AggregationsBucketSortAggregation = z.object({
  from: integer.describe('Buckets in positions prior to `from` will be truncated.').optional(),
  gap_policy: AggregationsGapPolicy.describe('The policy to apply when gaps are found in the data.').optional(),
  size: integer.describe('The number of buckets to return. Defaults to all buckets of the parent aggregation.').optional(),
  get sort () { return Sort.describe('The list of fields to sort on.').optional() }
}).meta({ id: 'AggregationsBucketSortAggregation' })
export type AggregationsBucketSortAggregation = z.infer<typeof AggregationsBucketSortAggregation>

/**
 * A sibling pipeline aggregation which executes a two sample Kolmogorov–Smirnov test (referred
 * to as a "K-S test" from now on) against a provided distribution, and the distribution implied
 * by the documents counts in the configured sibling aggregation. Specifically, for some metric,
 * assuming that the percentile intervals of the metric are known beforehand or have been computed
 * by an aggregation, then one would use range aggregation for the sibling to compute the p-value
 * of the distribution difference between the metric and the restriction of that metric to a subset
 * of the documents. A natural use case is if the sibling aggregation range aggregation nested in a
 * terms aggregation, in which case one compares the overall distribution of metric to its restriction
 * to each term.
 */
export const AggregationsBucketKsAggregation = z.object({
  ...AggregationsBucketPathAggregation.shape,
  alternative: z.array(z.string()).describe('A list of string values indicating which K-S test alternative to calculate. The valid values are: "greater", "less", "two_sided". This parameter is key for determining the K-S statistic used when calculating the K-S test. Default value is all possible alternative hypotheses.').optional(),
  fractions: z.array(double).describe('A list of doubles indicating the distribution of the samples with which to compare to the `buckets_path` results. In typical usage this is the overall proportion of documents in each bucket, which is compared with the actual document proportions in each bucket from the sibling aggregation counts. The default is to assume that overall documents are uniformly distributed on these buckets, which they would be if one used equal percentiles of a metric to define the bucket end points.').optional(),
  sampling_method: z.string().describe('Indicates the sampling methodology when calculating the K-S test. Note, this is sampling of the returned values. This determines the cumulative distribution function (CDF) points used comparing the two samples. Default is `upper_tail`, which emphasizes the upper end of the CDF points. Valid options are: `upper_tail`, `uniform`, and `lower_tail`.').optional()
}).meta({ id: 'AggregationsBucketKsAggregation' })
export type AggregationsBucketKsAggregation = z.infer<typeof AggregationsBucketKsAggregation>

export const AggregationsBucketCorrelationFunctionCountCorrelationIndicator = z.object({
  doc_count: integer.describe('The total number of documents that initially created the expectations. It’s required to be greater than or equal to the sum of all values in the buckets_path as this is the originating superset of data to which the term values are correlated.'),
  expectations: z.array(double).describe('An array of numbers with which to correlate the configured `bucket_path` values. The length of this value must always equal the number of buckets returned by the `bucket_path`.'),
  fractions: z.array(double).describe('An array of fractions to use when averaging and calculating variance. This should be used if the pre-calculated data and the buckets_path have known gaps. The length of fractions, if provided, must equal expectations.').optional()
}).meta({ id: 'AggregationsBucketCorrelationFunctionCountCorrelationIndicator' })
export type AggregationsBucketCorrelationFunctionCountCorrelationIndicator = z.infer<typeof AggregationsBucketCorrelationFunctionCountCorrelationIndicator>

export const AggregationsBucketCorrelationFunctionCountCorrelation = z.object({
  indicator: AggregationsBucketCorrelationFunctionCountCorrelationIndicator.describe('The indicator with which to correlate the configured `bucket_path` values.')
}).meta({ id: 'AggregationsBucketCorrelationFunctionCountCorrelation' })
export type AggregationsBucketCorrelationFunctionCountCorrelation = z.infer<typeof AggregationsBucketCorrelationFunctionCountCorrelation>

export const AggregationsBucketCorrelationFunction = z.object({
  count_correlation: AggregationsBucketCorrelationFunctionCountCorrelation.describe('The configuration to calculate a count correlation. This function is designed for determining the correlation of a term value and a given metric.')
}).meta({ id: 'AggregationsBucketCorrelationFunction' })
export type AggregationsBucketCorrelationFunction = z.infer<typeof AggregationsBucketCorrelationFunction>

/** A sibling pipeline aggregation which executes a correlation function on the configured sibling multi-bucket aggregation. */
export const AggregationsBucketCorrelationAggregation = z.object({
  ...AggregationsBucketPathAggregation.shape,
  function: AggregationsBucketCorrelationFunction.describe('The correlation function to execute.')
}).meta({ id: 'AggregationsBucketCorrelationAggregation' })
export type AggregationsBucketCorrelationAggregation = z.infer<typeof AggregationsBucketCorrelationAggregation>

export const AggregationsCardinalityExecutionMode = z.enum(['global_ordinals', 'segment_ordinals', 'direct', 'save_memory_heuristic', 'save_time_heuristic']).meta({ id: 'AggregationsCardinalityExecutionMode' })
export type AggregationsCardinalityExecutionMode = z.infer<typeof AggregationsCardinalityExecutionMode>

export interface AggregationsCardinalityAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  precision_threshold?: integer | undefined
  rehash?: boolean | undefined
  execution_hint?: AggregationsCardinalityExecutionMode | undefined
}
export const AggregationsCardinalityAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  precision_threshold: integer.describe('A unique count below which counts are expected to be close to accurate. This allows to trade memory for accuracy.').optional(),
  rehash: z.boolean().optional(),
  execution_hint: AggregationsCardinalityExecutionMode.describe('Mechanism by which cardinality aggregations is run.').optional()
}).meta({ id: 'AggregationsCardinalityAggregation' })
export type AggregationsCardinalityAggregation = z.infer<typeof AggregationsCardinalityAggregation>

export interface AggregationsCartesianBoundsAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
}
export const AggregationsCartesianBoundsAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() }
}).meta({ id: 'AggregationsCartesianBoundsAggregation' })
export type AggregationsCartesianBoundsAggregation = z.infer<typeof AggregationsCartesianBoundsAggregation>

export interface AggregationsCartesianCentroidAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
}
export const AggregationsCartesianCentroidAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() }
}).meta({ id: 'AggregationsCartesianCentroidAggregation' })
export type AggregationsCartesianCentroidAggregation = z.infer<typeof AggregationsCartesianCentroidAggregation>

export const AggregationsCustomCategorizeTextAnalyzer = z.object({
  char_filter: z.array(z.string()).optional(),
  tokenizer: z.string().optional(),
  filter: z.array(z.string()).optional()
}).meta({ id: 'AggregationsCustomCategorizeTextAnalyzer' })
export type AggregationsCustomCategorizeTextAnalyzer = z.infer<typeof AggregationsCustomCategorizeTextAnalyzer>

export const AggregationsCategorizeTextAnalyzer = z.union([z.string(), AggregationsCustomCategorizeTextAnalyzer]).meta({ id: 'AggregationsCategorizeTextAnalyzer' })
export type AggregationsCategorizeTextAnalyzer = z.infer<typeof AggregationsCategorizeTextAnalyzer>

/**
 * A multi-bucket aggregation that groups semi-structured text into buckets. Each text
 * field is re-analyzed using a custom analyzer. The resulting tokens are then categorized
 * creating buckets of similarly formatted text values. This aggregation works best with machine
 * generated text like system logs. Only the first 100 analyzed tokens are used to categorize the text.
 */
export const AggregationsCategorizeTextAggregation = z.object({
  field: Field.describe('The semi-structured text field to categorize.'),
  max_unique_tokens: integer.describe('The maximum number of unique tokens at any position up to max_matched_tokens. Must be larger than 1. Smaller values use less memory and create fewer categories. Larger values will use more memory and create narrower categories. Max allowed value is 100.').optional(),
  max_matched_tokens: integer.describe('The maximum number of token positions to match on before attempting to merge categories. Larger values will use more memory and create narrower categories. Max allowed value is 100.').optional(),
  similarity_threshold: integer.describe('The minimum percentage of tokens that must match for text to be added to the category bucket. Must be between 1 and 100. The larger the value the narrower the categories. Larger values will increase memory usage and create narrower categories.').optional(),
  categorization_filters: z.array(z.string()).describe('This property expects an array of regular expressions. The expressions are used to filter out matching sequences from the categorization field values. You can use this functionality to fine tune the categorization by excluding sequences from consideration when categories are defined. For example, you can exclude SQL statements that appear in your log files. This property cannot be used at the same time as categorization_analyzer. If you only want to define simple regular expression filters that are applied prior to tokenization, setting this property is the easiest method. If you also want to customize the tokenizer or post-tokenization filtering, use the categorization_analyzer property instead and include the filters as pattern_replace character filters.').optional(),
  categorization_analyzer: AggregationsCategorizeTextAnalyzer.describe('The categorization analyzer specifies how the text is analyzed and tokenized before being categorized. The syntax is very similar to that used to define the analyzer in the analyze API. This property cannot be used at the same time as `categorization_filters`.').optional(),
  shard_size: integer.describe('The number of categorization buckets to return from each shard before merging all the results.').optional(),
  size: integer.describe('The number of buckets to return.').optional(),
  min_doc_count: integer.describe('The minimum number of documents in a bucket to be returned to the results.').optional(),
  shard_min_doc_count: integer.describe('The minimum number of documents in a bucket to be returned from the shard before merging.').optional()
}).meta({ id: 'AggregationsCategorizeTextAggregation' })
export type AggregationsCategorizeTextAggregation = z.infer<typeof AggregationsCategorizeTextAggregation>

export const AggregationsChangePointAggregation = z.object({
  ...AggregationsPipelineAggregationBase.shape
}).meta({ id: 'AggregationsChangePointAggregation' })
export type AggregationsChangePointAggregation = z.infer<typeof AggregationsChangePointAggregation>

export const RelationName = z.string().meta({ id: 'RelationName' })
export type RelationName = z.infer<typeof RelationName>

export const AggregationsChildrenAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape,
  type: RelationName.describe('The child type that should be selected.').optional()
}).meta({ id: 'AggregationsChildrenAggregation' })
export type AggregationsChildrenAggregation = z.infer<typeof AggregationsChildrenAggregation>

/** A field value. */
export const FieldValue = z.union([long, double, z.string(), z.boolean(), z.null()]).meta({ id: 'FieldValue' })
export type FieldValue = z.infer<typeof FieldValue>

export const AggregationsCompositeAggregateKey = z.record(Field, FieldValue).meta({ id: 'AggregationsCompositeAggregateKey' })
export type AggregationsCompositeAggregateKey = z.infer<typeof AggregationsCompositeAggregateKey>

export const AggregationsMissingOrder = z.enum(['first', 'last', 'default']).meta({ id: 'AggregationsMissingOrder' })
export type AggregationsMissingOrder = z.infer<typeof AggregationsMissingOrder>

export const AggregationsValueType = z.enum(['string', 'long', 'double', 'number', 'date', 'date_nanos', 'ip', 'numeric', 'geo_point', 'boolean']).meta({ id: 'AggregationsValueType' })
export type AggregationsValueType = z.infer<typeof AggregationsValueType>

export interface AggregationsCompositeAggregationBaseShape {
  field?: Field | undefined
  missing_bucket?: boolean | undefined
  missing_order?: AggregationsMissingOrder | undefined
  script?: ScriptShape | undefined
  value_type?: AggregationsValueType | undefined
  order?: SortOrder | undefined
}
export const AggregationsCompositeAggregationBase = z.object({
  field: Field.describe('Either `field` or `script` must be present').optional(),
  missing_bucket: z.boolean().optional(),
  missing_order: AggregationsMissingOrder.optional(),
  get script () { return Script.describe('Either `field` or `script` must be present').optional() },
  value_type: AggregationsValueType.optional(),
  order: SortOrder.optional()
}).meta({ id: 'AggregationsCompositeAggregationBase' })
export type AggregationsCompositeAggregationBase = z.infer<typeof AggregationsCompositeAggregationBase>

export interface AggregationsCompositeTermsAggregationShape {
  field?: Field | undefined
  missing_bucket?: boolean | undefined
  missing_order?: AggregationsMissingOrder | undefined
  script?: ScriptShape | undefined
  value_type?: AggregationsValueType | undefined
  order?: SortOrder | undefined
}
export const AggregationsCompositeTermsAggregation = z.object({
  field: Field.describe('Either `field` or `script` must be present').optional(),
  missing_bucket: z.boolean().optional(),
  missing_order: AggregationsMissingOrder.optional(),
  get script () { return Script.describe('Either `field` or `script` must be present').optional() },
  value_type: AggregationsValueType.optional(),
  order: SortOrder.optional()
}).meta({ id: 'AggregationsCompositeTermsAggregation' })
export type AggregationsCompositeTermsAggregation = z.infer<typeof AggregationsCompositeTermsAggregation>

export interface AggregationsCompositeHistogramAggregationShape {
  field?: Field | undefined
  missing_bucket?: boolean | undefined
  missing_order?: AggregationsMissingOrder | undefined
  script?: ScriptShape | undefined
  value_type?: AggregationsValueType | undefined
  order?: SortOrder | undefined
  interval: double
}
export const AggregationsCompositeHistogramAggregation = z.object({
  field: Field.describe('Either `field` or `script` must be present').optional(),
  missing_bucket: z.boolean().optional(),
  missing_order: AggregationsMissingOrder.optional(),
  get script () { return Script.describe('Either `field` or `script` must be present').optional() },
  value_type: AggregationsValueType.optional(),
  order: SortOrder.optional(),
  interval: double
}).meta({ id: 'AggregationsCompositeHistogramAggregation' })
export type AggregationsCompositeHistogramAggregation = z.infer<typeof AggregationsCompositeHistogramAggregation>

/**
 * A date histogram interval. Similar to `Duration` with additional units: `w` (week), `M` (month), `q` (quarter) and
 * `y` (year)
 */
export const DurationLarge = z.string().meta({ id: 'DurationLarge' })
export type DurationLarge = z.infer<typeof DurationLarge>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export interface AggregationsCompositeDateHistogramAggregationShape {
  field?: Field | undefined
  missing_bucket?: boolean | undefined
  missing_order?: AggregationsMissingOrder | undefined
  script?: ScriptShape | undefined
  value_type?: AggregationsValueType | undefined
  order?: SortOrder | undefined
  format?: string | undefined
  calendar_interval?: DurationLarge | undefined
  fixed_interval?: DurationLarge | undefined
  offset?: Duration | undefined
  time_zone?: TimeZone | undefined
}
export const AggregationsCompositeDateHistogramAggregation = z.object({
  field: Field.describe('Either `field` or `script` must be present').optional(),
  missing_bucket: z.boolean().optional(),
  missing_order: AggregationsMissingOrder.optional(),
  get script () { return Script.describe('Either `field` or `script` must be present').optional() },
  value_type: AggregationsValueType.optional(),
  order: SortOrder.optional(),
  format: z.string().optional(),
  calendar_interval: DurationLarge.describe('Either `calendar_interval` or `fixed_interval` must be present').optional(),
  fixed_interval: DurationLarge.describe('Either `calendar_interval` or `fixed_interval` must be present').optional(),
  offset: Duration.optional(),
  time_zone: TimeZone.optional()
}).meta({ id: 'AggregationsCompositeDateHistogramAggregation' })
export type AggregationsCompositeDateHistogramAggregation = z.infer<typeof AggregationsCompositeDateHistogramAggregation>

export const CoordsGeoBounds = z.object({
  top: double,
  bottom: double,
  left: double,
  right: double
}).meta({ id: 'CoordsGeoBounds' })
export type CoordsGeoBounds = z.infer<typeof CoordsGeoBounds>

export const LatLonGeoLocation = z.object({
  lat: double.describe('Latitude'),
  lon: double.describe('Longitude')
}).meta({ id: 'LatLonGeoLocation' })
export type LatLonGeoLocation = z.infer<typeof LatLonGeoLocation>

export const GeoHash = z.string().meta({ id: 'GeoHash' })
export type GeoHash = z.infer<typeof GeoHash>

export const GeoHashLocation = z.object({
  geohash: GeoHash
}).meta({ id: 'GeoHashLocation' })
export type GeoHashLocation = z.infer<typeof GeoHashLocation>

/**
 * A latitude/longitude as a 2 dimensional point. It can be represented in various ways:
 * - as a `{lat, long}` object
 * - as a geo hash value
 * - as a `[lon, lat]` array
 * - as a string in `"<lat>, <lon>"` or WKT point formats
 */
export const GeoLocation = z.union([LatLonGeoLocation, GeoHashLocation, z.array(double), z.string()]).meta({ id: 'GeoLocation' })
export type GeoLocation = z.infer<typeof GeoLocation>

export const TopLeftBottomRightGeoBounds = z.object({
  top_left: GeoLocation,
  bottom_right: GeoLocation
}).meta({ id: 'TopLeftBottomRightGeoBounds' })
export type TopLeftBottomRightGeoBounds = z.infer<typeof TopLeftBottomRightGeoBounds>

export const TopRightBottomLeftGeoBounds = z.object({
  top_right: GeoLocation,
  bottom_left: GeoLocation
}).meta({ id: 'TopRightBottomLeftGeoBounds' })
export type TopRightBottomLeftGeoBounds = z.infer<typeof TopRightBottomLeftGeoBounds>

export const WktGeoBounds = z.object({
  wkt: z.string()
}).meta({ id: 'WktGeoBounds' })
export type WktGeoBounds = z.infer<typeof WktGeoBounds>

/**
 * A geo bounding box. It can be represented in various ways:
 * - as 4 top/bottom/left/right coordinates
 * - as 2 top_left / bottom_right points
 * - as 2 top_right / bottom_left points
 * - as a WKT bounding box
 */
export const GeoBounds = z.union([CoordsGeoBounds, TopLeftBottomRightGeoBounds, TopRightBottomLeftGeoBounds, WktGeoBounds]).meta({ id: 'GeoBounds' })
export type GeoBounds = z.infer<typeof GeoBounds>

export interface AggregationsCompositeGeoTileGridAggregationShape {
  field?: Field | undefined
  missing_bucket?: boolean | undefined
  missing_order?: AggregationsMissingOrder | undefined
  script?: ScriptShape | undefined
  value_type?: AggregationsValueType | undefined
  order?: SortOrder | undefined
  precision?: integer | undefined
  bounds?: GeoBounds | undefined
}
export const AggregationsCompositeGeoTileGridAggregation = z.object({
  field: Field.describe('Either `field` or `script` must be present').optional(),
  missing_bucket: z.boolean().optional(),
  missing_order: AggregationsMissingOrder.optional(),
  get script () { return Script.describe('Either `field` or `script` must be present').optional() },
  value_type: AggregationsValueType.optional(),
  order: SortOrder.optional(),
  precision: integer.optional(),
  bounds: GeoBounds.optional()
}).meta({ id: 'AggregationsCompositeGeoTileGridAggregation' })
export type AggregationsCompositeGeoTileGridAggregation = z.infer<typeof AggregationsCompositeGeoTileGridAggregation>

const AggregationsCompositeAggregationSourceExclusiveProps = z.union([z.object({ terms: z.lazy(() => AggregationsCompositeTermsAggregation) }), z.object({ histogram: z.lazy(() => AggregationsCompositeHistogramAggregation) }), z.object({ date_histogram: z.lazy(() => AggregationsCompositeDateHistogramAggregation) }), z.object({ geotile_grid: z.lazy(() => AggregationsCompositeGeoTileGridAggregation) })])

export interface AggregationsCompositeAggregationSourceShape {
  terms?: AggregationsCompositeTermsAggregation | undefined
  histogram?: AggregationsCompositeHistogramAggregation | undefined
  date_histogram?: AggregationsCompositeDateHistogramAggregation | undefined
  geotile_grid?: AggregationsCompositeGeoTileGridAggregation | undefined
}
export const AggregationsCompositeAggregationSource: z.ZodType<AggregationsCompositeAggregationSourceShape> = AggregationsCompositeAggregationSourceExclusiveProps.meta({ id: 'AggregationsCompositeAggregationSource' })
export type AggregationsCompositeAggregationSource = z.infer<typeof AggregationsCompositeAggregationSource>

export interface AggregationsCompositeAggregationShape {
  after?: AggregationsCompositeAggregateKey | undefined
  size?: integer | undefined
  sources?: Array<Record<string, AggregationsCompositeAggregationSourceShape>> | undefined
}
export const AggregationsCompositeAggregation = z.object({
  after: AggregationsCompositeAggregateKey.describe('When paginating, use the `after_key` value returned in the previous response to retrieve the next page.').optional(),
  size: integer.describe('The number of composite buckets that should be returned.').optional(),
  get sources (): z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, typeof AggregationsCompositeAggregationSource>>> { return z.array(z.record(z.string(), AggregationsCompositeAggregationSource)).describe('The value sources used to build composite buckets. Keys are returned in the order of the `sources` definition.').optional() }
}).meta({ id: 'AggregationsCompositeAggregation' })
export type AggregationsCompositeAggregation = z.infer<typeof AggregationsCompositeAggregation>

export const AggregationsCumulativeCardinalityAggregation = z.object({
  ...AggregationsPipelineAggregationBase.shape
}).meta({ id: 'AggregationsCumulativeCardinalityAggregation' })
export type AggregationsCumulativeCardinalityAggregation = z.infer<typeof AggregationsCumulativeCardinalityAggregation>

export const AggregationsCumulativeSumAggregation = z.object({
  ...AggregationsPipelineAggregationBase.shape
}).meta({ id: 'AggregationsCumulativeSumAggregation' })
export type AggregationsCumulativeSumAggregation = z.infer<typeof AggregationsCumulativeSumAggregation>

export const AggregationsCalendarInterval = z.enum(['second', '1s', 'minute', '1m', 'hour', '1h', 'day', '1d', 'week', '1w', 'month', '1M', 'quarter', '1q', 'year', '1y']).meta({ id: 'AggregationsCalendarInterval' })
export type AggregationsCalendarInterval = z.infer<typeof AggregationsCalendarInterval>

export const AggregationsExtendedBounds = z.object({
  max: z.any().describe('Maximum value for the bound.').optional(),
  min: z.any().describe('Minimum value for the bound.').optional()
}).meta({ id: 'AggregationsExtendedBounds' })
export type AggregationsExtendedBounds = z.infer<typeof AggregationsExtendedBounds>

export const AggregationsAggregateOrder = z.union([z.record(Field, SortOrder), z.array(z.record(Field, SortOrder))]).meta({ id: 'AggregationsAggregateOrder' })
export type AggregationsAggregateOrder = z.infer<typeof AggregationsAggregateOrder>

export interface AggregationsDateHistogramAggregationShape {
  calendar_interval?: AggregationsCalendarInterval | undefined
  extended_bounds?: AggregationsExtendedBounds | undefined
  hard_bounds?: AggregationsExtendedBounds | undefined
  field?: Field | undefined
  fixed_interval?: Duration | undefined
  format?: string | undefined
  interval?: Duration | undefined
  min_doc_count?: integer | undefined
  missing?: DateTime | undefined
  offset?: Duration | undefined
  order?: AggregationsAggregateOrder | undefined
  params?: Record<string, unknown> | undefined
  script?: ScriptShape | undefined
  time_zone?: TimeZone | undefined
  keyed?: boolean | undefined
}
export const AggregationsDateHistogramAggregation = z.object({
  calendar_interval: AggregationsCalendarInterval.describe('Calendar-aware interval. Can be specified using the unit name, such as `month`, or as a single unit quantity, such as `1M`.').optional(),
  extended_bounds: AggregationsExtendedBounds.describe('Enables extending the bounds of the histogram beyond the data itself.').optional(),
  hard_bounds: AggregationsExtendedBounds.describe('Limits the histogram to specified bounds.').optional(),
  field: Field.describe('The date field whose values are use to build a histogram.').optional(),
  fixed_interval: Duration.describe('Fixed intervals: a fixed number of SI units and never deviate, regardless of where they fall on the calendar.').optional(),
  format: z.string().describe('The date format used to format `key_as_string` in the response. If no `format` is specified, the first date format specified in the field mapping is used.').optional(),
  interval: Duration.optional(),
  min_doc_count: integer.describe('Only returns buckets that have `min_doc_count` number of documents. By default, all buckets between the first bucket that matches documents and the last one are returned.').optional(),
  missing: DateTime.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  offset: Duration.describe('Changes the start value of each bucket by the specified positive (`+`) or negative offset (`-`) duration.').optional(),
  order: AggregationsAggregateOrder.describe('The sort order of the returned buckets.').optional(),
  params: z.record(z.string(), z.any()).optional(),
  get script () { return Script.optional() },
  time_zone: TimeZone.describe('Time zone used for bucketing and rounding. Defaults to Coordinated Universal Time (UTC).').optional(),
  keyed: z.boolean().describe('Set to `true` to associate a unique string key with each bucket and return the ranges as a hash rather than an array.').optional()
}).meta({ id: 'AggregationsDateHistogramAggregation' })
export type AggregationsDateHistogramAggregation = z.infer<typeof AggregationsDateHistogramAggregation>

export const DateMath = z.string().meta({ id: 'DateMath' })
export type DateMath = z.infer<typeof DateMath>

/**
 * A date range limit, represented either as a DateMath expression or a number expressed
 * according to the target field's precision.
 */
export const AggregationsFieldDateMath = z.union([DateMath, long]).meta({ id: 'AggregationsFieldDateMath' })
export type AggregationsFieldDateMath = z.infer<typeof AggregationsFieldDateMath>

export const AggregationsDateRangeExpression = z.object({
  from: AggregationsFieldDateMath.describe('Start of the range (inclusive).').optional(),
  key: z.string().describe('Custom key to return the range with.').optional(),
  to: AggregationsFieldDateMath.describe('End of the range (exclusive).').optional()
}).meta({ id: 'AggregationsDateRangeExpression' })
export type AggregationsDateRangeExpression = z.infer<typeof AggregationsDateRangeExpression>

export const AggregationsDateRangeAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape,
  field: Field.describe('The date field whose values are use to build ranges.').optional(),
  format: z.string().describe('The date format used to format `from` and `to` in the response.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  ranges: z.array(AggregationsDateRangeExpression).describe('Array of date ranges.').optional(),
  time_zone: TimeZone.describe('Time zone used to convert dates from another time zone to UTC.').optional(),
  keyed: z.boolean().describe('Set to `true` to associate a unique string key with each bucket and returns the ranges as a hash rather than an array.').optional()
}).meta({ id: 'AggregationsDateRangeAggregation' })
export type AggregationsDateRangeAggregation = z.infer<typeof AggregationsDateRangeAggregation>

export const AggregationsDerivativeAggregation = z.object({
  ...AggregationsPipelineAggregationBase.shape
}).meta({ id: 'AggregationsDerivativeAggregation' })
export type AggregationsDerivativeAggregation = z.infer<typeof AggregationsDerivativeAggregation>

export const AggregationsSamplerAggregationExecutionHint = z.enum(['map', 'global_ordinals', 'bytes_hash']).meta({ id: 'AggregationsSamplerAggregationExecutionHint' })
export type AggregationsSamplerAggregationExecutionHint = z.infer<typeof AggregationsSamplerAggregationExecutionHint>

export interface AggregationsDiversifiedSamplerAggregationShape {
  execution_hint?: AggregationsSamplerAggregationExecutionHint | undefined
  max_docs_per_value?: integer | undefined
  script?: ScriptShape | undefined
  shard_size?: integer | undefined
  field?: Field | undefined
}
export const AggregationsDiversifiedSamplerAggregation = z.object({
  execution_hint: AggregationsSamplerAggregationExecutionHint.describe('The type of value used for de-duplication.').optional(),
  max_docs_per_value: integer.describe('Limits how many documents are permitted per choice of de-duplicating value.').optional(),
  get script () { return Script.optional() },
  shard_size: integer.describe('Limits how many top-scoring documents are collected in the sample processed on each shard.').optional(),
  field: Field.describe('The field used to provide values used for de-duplication.').optional()
}).meta({ id: 'AggregationsDiversifiedSamplerAggregation' })
export type AggregationsDiversifiedSamplerAggregation = z.infer<typeof AggregationsDiversifiedSamplerAggregation>

export interface AggregationsExtendedStatsAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  format?: string | undefined
  sigma?: double | undefined
}
export const AggregationsExtendedStatsAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  format: z.string().optional(),
  sigma: double.describe('The number of standard deviations above/below the mean to display.').optional()
}).meta({ id: 'AggregationsExtendedStatsAggregation' })
export type AggregationsExtendedStatsAggregation = z.infer<typeof AggregationsExtendedStatsAggregation>

export const AggregationsExtendedStatsBucketAggregation = z.object({
  ...AggregationsPipelineAggregationBase.shape,
  sigma: double.describe('The number of standard deviations above/below the mean to display.').optional()
}).meta({ id: 'AggregationsExtendedStatsBucketAggregation' })
export type AggregationsExtendedStatsBucketAggregation = z.infer<typeof AggregationsExtendedStatsBucketAggregation>

export const AggregationsTermsExclude = z.union([z.string(), z.array(z.string())]).meta({ id: 'AggregationsTermsExclude' })
export type AggregationsTermsExclude = z.infer<typeof AggregationsTermsExclude>

export const AggregationsTermsPartition = z.object({
  num_partitions: long.describe('The number of partitions.'),
  partition: long.describe('The partition number for this request.')
}).meta({ id: 'AggregationsTermsPartition' })
export type AggregationsTermsPartition = z.infer<typeof AggregationsTermsPartition>

export const AggregationsTermsInclude = z.union([z.string(), z.array(z.string()), AggregationsTermsPartition]).meta({ id: 'AggregationsTermsInclude' })
export type AggregationsTermsInclude = z.infer<typeof AggregationsTermsInclude>

export const AggregationsFrequentItemSetsField = z.object({
  field: Field,
  exclude: AggregationsTermsExclude.describe('Values to exclude. Can be regular expression strings or arrays of strings of exact terms.').optional(),
  include: AggregationsTermsInclude.describe('Values to include. Can be regular expression strings or arrays of strings of exact terms.').optional()
}).meta({ id: 'AggregationsFrequentItemSetsField' })
export type AggregationsFrequentItemSetsField = z.infer<typeof AggregationsFrequentItemSetsField>

export interface AggregationsFrequentItemSetsAggregationShape {
  fields: AggregationsFrequentItemSetsField[]
  minimum_set_size?: integer | undefined
  minimum_support?: double | undefined
  size?: integer | undefined
  filter?: QueryDslQueryContainerShape | undefined
}
export const AggregationsFrequentItemSetsAggregation = z.object({
  fields: z.array(AggregationsFrequentItemSetsField).describe('Fields to analyze.'),
  minimum_set_size: integer.describe('The minimum size of one item set.').optional(),
  minimum_support: double.describe('The minimum support of one item set.').optional(),
  size: integer.describe('The number of top item sets to return.').optional(),
  get filter () { return QueryDslQueryContainer.describe('Query that filters documents from analysis.').optional() }
}).meta({ id: 'AggregationsFrequentItemSetsAggregation' })
export type AggregationsFrequentItemSetsAggregation = z.infer<typeof AggregationsFrequentItemSetsAggregation>

/**
 * Aggregation buckets. By default they are returned as an array, but if the aggregation has keys configured for
 * the different buckets, the result is a dictionary.
 */
export const AggregationsBuckets = z.union([z.record(z.string(), z.any()), z.array(z.any())]).meta({ id: 'AggregationsBuckets' })
export type AggregationsBuckets = z.infer<typeof AggregationsBuckets>

export const AggregationsFiltersAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape,
  filters: AggregationsBuckets.describe('Collection of queries from which to build buckets.').optional(),
  other_bucket: z.boolean().describe('Set to `true` to add a bucket to the response which will contain all documents that do not match any of the given filters.').optional(),
  other_bucket_key: z.string().describe('The key with which the other bucket is returned.').optional(),
  keyed: z.boolean().describe('By default, the named filters aggregation returns the buckets as an object. Set to `false` to return the buckets as an array of objects.').optional()
}).meta({ id: 'AggregationsFiltersAggregation' })
export type AggregationsFiltersAggregation = z.infer<typeof AggregationsFiltersAggregation>

export interface AggregationsGeoBoundsAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  wrap_longitude?: boolean | undefined
}
export const AggregationsGeoBoundsAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  wrap_longitude: z.boolean().describe('Specifies whether the bounding box should be allowed to overlap the international date line.').optional()
}).meta({ id: 'AggregationsGeoBoundsAggregation' })
export type AggregationsGeoBoundsAggregation = z.infer<typeof AggregationsGeoBoundsAggregation>

export interface AggregationsGeoCentroidAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  count?: long | undefined
  location?: GeoLocation | undefined
}
export const AggregationsGeoCentroidAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  count: long.optional(),
  location: GeoLocation.optional()
}).meta({ id: 'AggregationsGeoCentroidAggregation' })
export type AggregationsGeoCentroidAggregation = z.infer<typeof AggregationsGeoCentroidAggregation>

export const AggregationsAggregationRange = z.object({
  from: z.union([double, z.null()]).describe('Start of the range (inclusive).').optional(),
  key: z.string().describe('Custom key to return the range with.').optional(),
  to: z.union([double, z.null()]).describe('End of the range (exclusive).').optional()
}).meta({ id: 'AggregationsAggregationRange' })
export type AggregationsAggregationRange = z.infer<typeof AggregationsAggregationRange>

export const AggregationsGeoDistanceAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape,
  distance_type: GeoDistanceType.describe('The distance calculation type.').optional(),
  field: Field.describe('A field of type `geo_point` used to evaluate the distance.').optional(),
  origin: GeoLocation.describe('The origin  used to evaluate the distance.').optional(),
  ranges: z.array(AggregationsAggregationRange).describe('An array of ranges used to bucket documents.').optional(),
  unit: DistanceUnit.describe('The distance unit.').optional()
}).meta({ id: 'AggregationsGeoDistanceAggregation' })
export type AggregationsGeoDistanceAggregation = z.infer<typeof AggregationsGeoDistanceAggregation>

/** A precision that can be expressed as a geohash length between 1 and 12, or a distance measure like "1km", "10m". */
export const GeoHashPrecision = z.union([integer, z.string()]).meta({ id: 'GeoHashPrecision' })
export type GeoHashPrecision = z.infer<typeof GeoHashPrecision>

export const AggregationsGeoHashGridAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape,
  bounds: GeoBounds.describe('The bounding box to filter the points in each bucket.').optional(),
  field: Field.describe('Field containing indexed `geo_point` or `geo_shape` values. If the field contains an array, `geohash_grid` aggregates all array values.').optional(),
  precision: GeoHashPrecision.describe('The string length of the geohashes used to define cells/buckets in the results.').optional(),
  shard_size: integer.describe('Allows for more accurate counting of the top cells returned in the final result the aggregation. Defaults to returning `max(10,(size x number-of-shards))` buckets from each shard.').optional(),
  size: integer.describe('The maximum number of geohash buckets to return.').optional()
}).meta({ id: 'AggregationsGeoHashGridAggregation' })
export type AggregationsGeoHashGridAggregation = z.infer<typeof AggregationsGeoHashGridAggregation>

export const AggregationsGeoLinePoint = z.object({
  field: Field.describe('The name of the geo_point field.')
}).meta({ id: 'AggregationsGeoLinePoint' })
export type AggregationsGeoLinePoint = z.infer<typeof AggregationsGeoLinePoint>

export const AggregationsGeoLineSort = z.object({
  field: Field.describe('The name of the numeric field to use as the sort key for ordering the points.')
}).meta({ id: 'AggregationsGeoLineSort' })
export type AggregationsGeoLineSort = z.infer<typeof AggregationsGeoLineSort>

export const AggregationsGeoLineAggregation = z.object({
  point: AggregationsGeoLinePoint.describe('The name of the geo_point field.'),
  sort: AggregationsGeoLineSort.describe('The name of the numeric field to use as the sort key for ordering the points. When the `geo_line` aggregation is nested inside a `time_series` aggregation, this field defaults to `@timestamp`, and any other value will result in error.').optional(),
  include_sort: z.boolean().describe('When `true`, returns an additional array of the sort values in the feature properties.').optional(),
  sort_order: SortOrder.describe('The order in which the line is sorted (ascending or descending).').optional(),
  size: integer.describe('The maximum length of the line represented in the aggregation. Valid sizes are between 1 and 10000.').optional()
}).meta({ id: 'AggregationsGeoLineAggregation' })
export type AggregationsGeoLineAggregation = z.infer<typeof AggregationsGeoLineAggregation>

export const GeoTilePrecision = integer.meta({ id: 'GeoTilePrecision' })
export type GeoTilePrecision = z.infer<typeof GeoTilePrecision>

export const AggregationsGeoTileGridAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape,
  field: Field.describe('Field containing indexed `geo_point` or `geo_shape` values. If the field contains an array, `geotile_grid` aggregates all array values.').optional(),
  precision: GeoTilePrecision.describe('Integer zoom of the key used to define cells/buckets in the results. Values outside of the range [0,29] will be rejected.').optional(),
  shard_size: integer.describe('Allows for more accurate counting of the top cells returned in the final result the aggregation. Defaults to returning `max(10,(size x number-of-shards))` buckets from each shard.').optional(),
  size: integer.describe('The maximum number of buckets to return.').optional(),
  bounds: GeoBounds.describe('A bounding box to filter the geo-points or geo-shapes in each bucket.').optional()
}).meta({ id: 'AggregationsGeoTileGridAggregation' })
export type AggregationsGeoTileGridAggregation = z.infer<typeof AggregationsGeoTileGridAggregation>

export const AggregationsGeohexGridAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape,
  field: Field.describe('Field containing indexed `geo_point` or `geo_shape` values. If the field contains an array, `geohex_grid` aggregates all array values.'),
  precision: integer.describe('Integer zoom of the key used to defined cells or buckets in the results. Value should be between 0-15.').optional(),
  bounds: GeoBounds.describe('Bounding box used to filter the geo-points in each bucket.').optional(),
  size: integer.describe('Maximum number of buckets to return.').optional(),
  shard_size: integer.describe('Number of buckets returned from each shard.').optional()
}).meta({ id: 'AggregationsGeohexGridAggregation' })
export type AggregationsGeohexGridAggregation = z.infer<typeof AggregationsGeohexGridAggregation>

export const AggregationsGlobalAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape
}).meta({ id: 'AggregationsGlobalAggregation' })
export type AggregationsGlobalAggregation = z.infer<typeof AggregationsGlobalAggregation>

export interface AggregationsHistogramAggregationShape {
  extended_bounds?: AggregationsExtendedBounds | undefined
  hard_bounds?: AggregationsExtendedBounds | undefined
  field?: Field | undefined
  interval?: double | undefined
  min_doc_count?: integer | undefined
  missing?: double | undefined
  offset?: double | undefined
  order?: AggregationsAggregateOrder | undefined
  script?: ScriptShape | undefined
  format?: string | undefined
  keyed?: boolean | undefined
}
export const AggregationsHistogramAggregation = z.object({
  extended_bounds: AggregationsExtendedBounds.describe('Enables extending the bounds of the histogram beyond the data itself.').optional(),
  hard_bounds: AggregationsExtendedBounds.describe('Limits the range of buckets in the histogram. It is particularly useful in the case of open data ranges that can result in a very large number of buckets.').optional(),
  field: Field.describe('The name of the field to aggregate on.').optional(),
  interval: double.describe('The interval for the buckets. Must be a positive decimal.').optional(),
  min_doc_count: integer.describe('Only returns buckets that have `min_doc_count` number of documents. By default, the response will fill gaps in the histogram with empty buckets.').optional(),
  missing: double.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  offset: double.describe('By default, the bucket keys start with 0 and then continue in even spaced steps of `interval`. The bucket boundaries can be shifted by using the `offset` option.').optional(),
  order: AggregationsAggregateOrder.describe('The sort order of the returned buckets. By default, the returned buckets are sorted by their key ascending.').optional(),
  get script () { return Script.optional() },
  format: z.string().optional(),
  keyed: z.boolean().describe('If `true`, returns buckets as a hash instead of an array, keyed by the bucket keys.').optional()
}).meta({ id: 'AggregationsHistogramAggregation' })
export type AggregationsHistogramAggregation = z.infer<typeof AggregationsHistogramAggregation>

export const AggregationsIpRangeAggregationRange = z.object({
  from: z.union([z.string(), z.null()]).describe('Start of the range.').optional(),
  mask: z.string().describe('IP range defined as a CIDR mask.').optional(),
  to: z.union([z.string(), z.null()]).describe('End of the range.').optional()
}).meta({ id: 'AggregationsIpRangeAggregationRange' })
export type AggregationsIpRangeAggregationRange = z.infer<typeof AggregationsIpRangeAggregationRange>

export const AggregationsIpRangeAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape,
  field: Field.describe('The date field whose values are used to build ranges.').optional(),
  ranges: z.array(AggregationsIpRangeAggregationRange).describe('Array of IP ranges.').optional()
}).meta({ id: 'AggregationsIpRangeAggregation' })
export type AggregationsIpRangeAggregation = z.infer<typeof AggregationsIpRangeAggregation>

export const AggregationsIpPrefixAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape,
  field: Field.describe('The IP address field to aggregation on. The field mapping type must be `ip`.'),
  prefix_length: integer.describe('Length of the network prefix. For IPv4 addresses the accepted range is [0, 32]. For IPv6 addresses the accepted range is [0, 128].'),
  is_ipv6: z.boolean().describe('Defines whether the prefix applies to IPv6 addresses.').optional(),
  append_prefix_length: z.boolean().describe('Defines whether the prefix length is appended to IP address keys in the response.').optional(),
  keyed: z.boolean().describe('Defines whether buckets are returned as a hash rather than an array in the response.').optional(),
  min_doc_count: long.describe('Minimum number of documents in a bucket for it to be included in the response.').optional()
}).meta({ id: 'AggregationsIpPrefixAggregation' })
export type AggregationsIpPrefixAggregation = z.infer<typeof AggregationsIpPrefixAggregation>

export const MlRegressionInferenceOptions = z.object({
  results_field: Field.describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional(),
  num_top_feature_importance_values: integer.describe('Specifies the maximum number of feature importance values per document.').optional()
}).meta({ id: 'MlRegressionInferenceOptions' })
export type MlRegressionInferenceOptions = z.infer<typeof MlRegressionInferenceOptions>

export const MlClassificationInferenceOptions = z.object({
  num_top_classes: integer.describe('Specifies the number of top class predictions to return. Defaults to 0.').optional(),
  num_top_feature_importance_values: integer.describe('Specifies the maximum number of feature importance values per document.').optional(),
  prediction_field_type: z.string().describe('Specifies the type of the predicted field to write. Acceptable values are: string, number, boolean. When boolean is provided 1.0 is transformed to true and 0.0 to false.').optional(),
  results_field: z.string().describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional(),
  top_classes_results_field: z.string().describe('Specifies the field to which the top classes are written. Defaults to top_classes.').optional()
}).meta({ id: 'MlClassificationInferenceOptions' })
export type MlClassificationInferenceOptions = z.infer<typeof MlClassificationInferenceOptions>

const AggregationsInferenceConfigContainerExclusiveProps = z.union([z.object({ regression: MlRegressionInferenceOptions }), z.object({ classification: MlClassificationInferenceOptions })])

export const AggregationsInferenceConfigContainer = AggregationsInferenceConfigContainerExclusiveProps.meta({ id: 'AggregationsInferenceConfigContainer' })
export type AggregationsInferenceConfigContainer = z.infer<typeof AggregationsInferenceConfigContainer>

export const AggregationsInferenceAggregation = z.object({
  ...AggregationsPipelineAggregationBase.shape,
  model_id: Name.describe('The ID or alias for the trained model.'),
  inference_config: AggregationsInferenceConfigContainer.describe('Contains the inference type and its options.').optional()
}).meta({ id: 'AggregationsInferenceAggregation' })
export type AggregationsInferenceAggregation = z.infer<typeof AggregationsInferenceAggregation>

export const Fields = z.union([Field, z.array(Field)]).meta({ id: 'Fields' })
export type Fields = z.infer<typeof Fields>

export const AggregationsMatrixAggregation = z.object({
  fields: Fields.describe('An array of fields for computing the statistics.').optional(),
  missing: z.record(Field, double).describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional()
}).meta({ id: 'AggregationsMatrixAggregation' })
export type AggregationsMatrixAggregation = z.infer<typeof AggregationsMatrixAggregation>

export const AggregationsMatrixStatsAggregation = z.object({
  ...AggregationsMatrixAggregation.shape,
  mode: SortMode.describe('Array value the aggregation will use for array or multi-valued fields.').optional()
}).meta({ id: 'AggregationsMatrixStatsAggregation' })
export type AggregationsMatrixStatsAggregation = z.infer<typeof AggregationsMatrixStatsAggregation>

export interface AggregationsMaxAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  format?: string | undefined
}
export const AggregationsMaxAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  format: z.string().optional()
}).meta({ id: 'AggregationsMaxAggregation' })
export type AggregationsMaxAggregation = z.infer<typeof AggregationsMaxAggregation>

export const AggregationsMaxBucketAggregation = z.object({
  ...AggregationsPipelineAggregationBase.shape
}).meta({ id: 'AggregationsMaxBucketAggregation' })
export type AggregationsMaxBucketAggregation = z.infer<typeof AggregationsMaxBucketAggregation>

export interface AggregationsMedianAbsoluteDeviationAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  format?: string | undefined
  compression?: double | undefined
  execution_hint?: AggregationsTDigestExecutionHint | undefined
}
export const AggregationsMedianAbsoluteDeviationAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  format: z.string().optional(),
  compression: double.describe('Limits the maximum number of nodes used by the underlying TDigest algorithm to `20 * compression`, enabling control of memory usage and approximation error.').optional(),
  execution_hint: AggregationsTDigestExecutionHint.describe('The default implementation of TDigest is optimized for performance, scaling to millions or even billions of sample values while maintaining acceptable accuracy levels (close to 1% relative error for millions of samples in some cases). To use an implementation optimized for accuracy, set this parameter to high_accuracy instead.').optional()
}).meta({ id: 'AggregationsMedianAbsoluteDeviationAggregation' })
export type AggregationsMedianAbsoluteDeviationAggregation = z.infer<typeof AggregationsMedianAbsoluteDeviationAggregation>

export interface AggregationsMinAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  format?: string | undefined
}
export const AggregationsMinAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  format: z.string().optional()
}).meta({ id: 'AggregationsMinAggregation' })
export type AggregationsMinAggregation = z.infer<typeof AggregationsMinAggregation>

export const AggregationsMinBucketAggregation = z.object({
  ...AggregationsPipelineAggregationBase.shape
}).meta({ id: 'AggregationsMinBucketAggregation' })
export type AggregationsMinBucketAggregation = z.infer<typeof AggregationsMinBucketAggregation>

export const AggregationsMissingAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape,
  field: Field.describe('The name of the field.').optional(),
  missing: AggregationsMissing.optional()
}).meta({ id: 'AggregationsMissingAggregation' })
export type AggregationsMissingAggregation = z.infer<typeof AggregationsMissingAggregation>

export const AggregationsMovingAverageAggregationBase = z.object({
  ...AggregationsPipelineAggregationBase.shape,
  minimize: z.boolean().optional(),
  predict: integer.optional(),
  window: integer.optional()
}).meta({ id: 'AggregationsMovingAverageAggregationBase' })
export type AggregationsMovingAverageAggregationBase = z.infer<typeof AggregationsMovingAverageAggregationBase>

/** For empty Class assignments */
export const EmptyObject = z.object({
}).meta({ id: 'EmptyObject' })
export type EmptyObject = z.infer<typeof EmptyObject>

export const AggregationsLinearMovingAverageAggregation = z.object({
  ...AggregationsMovingAverageAggregationBase.shape,
  model: z.literal('linear'),
  settings: EmptyObject
}).meta({ id: 'AggregationsLinearMovingAverageAggregation' })
export type AggregationsLinearMovingAverageAggregation = z.infer<typeof AggregationsLinearMovingAverageAggregation>

export const AggregationsSimpleMovingAverageAggregation = z.object({
  ...AggregationsMovingAverageAggregationBase.shape,
  model: z.literal('simple'),
  settings: EmptyObject
}).meta({ id: 'AggregationsSimpleMovingAverageAggregation' })
export type AggregationsSimpleMovingAverageAggregation = z.infer<typeof AggregationsSimpleMovingAverageAggregation>

export const AggregationsEwmaModelSettings = z.object({
  alpha: float.optional()
}).meta({ id: 'AggregationsEwmaModelSettings' })
export type AggregationsEwmaModelSettings = z.infer<typeof AggregationsEwmaModelSettings>

export const AggregationsEwmaMovingAverageAggregation = z.object({
  ...AggregationsMovingAverageAggregationBase.shape,
  model: z.literal('ewma'),
  settings: AggregationsEwmaModelSettings
}).meta({ id: 'AggregationsEwmaMovingAverageAggregation' })
export type AggregationsEwmaMovingAverageAggregation = z.infer<typeof AggregationsEwmaMovingAverageAggregation>

export const AggregationsHoltLinearModelSettings = z.object({
  alpha: float.optional(),
  beta: float.optional()
}).meta({ id: 'AggregationsHoltLinearModelSettings' })
export type AggregationsHoltLinearModelSettings = z.infer<typeof AggregationsHoltLinearModelSettings>

export const AggregationsHoltMovingAverageAggregation = z.object({
  ...AggregationsMovingAverageAggregationBase.shape,
  model: z.literal('holt'),
  settings: AggregationsHoltLinearModelSettings
}).meta({ id: 'AggregationsHoltMovingAverageAggregation' })
export type AggregationsHoltMovingAverageAggregation = z.infer<typeof AggregationsHoltMovingAverageAggregation>

export const AggregationsHoltWintersType = z.enum(['add', 'mult']).meta({ id: 'AggregationsHoltWintersType' })
export type AggregationsHoltWintersType = z.infer<typeof AggregationsHoltWintersType>

export const AggregationsHoltWintersModelSettings = z.object({
  alpha: float.optional(),
  beta: float.optional(),
  gamma: float.optional(),
  pad: z.boolean().optional(),
  period: integer.optional(),
  type: AggregationsHoltWintersType.optional()
}).meta({ id: 'AggregationsHoltWintersModelSettings' })
export type AggregationsHoltWintersModelSettings = z.infer<typeof AggregationsHoltWintersModelSettings>

export const AggregationsHoltWintersMovingAverageAggregation = z.object({
  ...AggregationsMovingAverageAggregationBase.shape,
  model: z.literal('holt_winters'),
  settings: AggregationsHoltWintersModelSettings
}).meta({ id: 'AggregationsHoltWintersMovingAverageAggregation' })
export type AggregationsHoltWintersMovingAverageAggregation = z.infer<typeof AggregationsHoltWintersMovingAverageAggregation>

export const AggregationsMovingAverageAggregation = z.union([AggregationsLinearMovingAverageAggregation, AggregationsSimpleMovingAverageAggregation, AggregationsEwmaMovingAverageAggregation, AggregationsHoltMovingAverageAggregation, AggregationsHoltWintersMovingAverageAggregation]).meta({ id: 'AggregationsMovingAverageAggregation' })
export type AggregationsMovingAverageAggregation = z.infer<typeof AggregationsMovingAverageAggregation>

export const AggregationsMovingPercentilesAggregation = z.object({
  ...AggregationsPipelineAggregationBase.shape,
  window: integer.describe('The size of window to "slide" across the histogram.').optional(),
  shift: integer.describe('By default, the window consists of the last n values excluding the current bucket. Increasing `shift` by 1, moves the starting window position by 1 to the right.').optional(),
  keyed: z.boolean().optional()
}).meta({ id: 'AggregationsMovingPercentilesAggregation' })
export type AggregationsMovingPercentilesAggregation = z.infer<typeof AggregationsMovingPercentilesAggregation>

export const AggregationsMovingFunctionAggregation = z.object({
  ...AggregationsPipelineAggregationBase.shape,
  script: z.string().describe('The script that should be executed on each window of data.').optional(),
  shift: integer.describe('By default, the window consists of the last n values excluding the current bucket. Increasing `shift` by 1, moves the starting window position by 1 to the right.').optional(),
  window: integer.describe('The size of window to "slide" across the histogram.').optional()
}).meta({ id: 'AggregationsMovingFunctionAggregation' })
export type AggregationsMovingFunctionAggregation = z.infer<typeof AggregationsMovingFunctionAggregation>

export const AggregationsTermsAggregationCollectMode = z.enum(['depth_first', 'breadth_first']).meta({ id: 'AggregationsTermsAggregationCollectMode' })
export type AggregationsTermsAggregationCollectMode = z.infer<typeof AggregationsTermsAggregationCollectMode>

const AggregationsMultiTermLookupCommonProps = z.object({
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional()
})

const AggregationsMultiTermLookupExclusiveProps = z.union([z.object({ field: Field }), z.object({ script: z.lazy(() => Script) })])

export interface AggregationsMultiTermLookupShape {
  missing?: AggregationsMissing | undefined
  field?: Field | undefined
  script?: Script | undefined
}
export const AggregationsMultiTermLookup: z.ZodType<AggregationsMultiTermLookupShape> = AggregationsMultiTermLookupCommonProps.and(AggregationsMultiTermLookupExclusiveProps).meta({ id: 'AggregationsMultiTermLookup' })
export type AggregationsMultiTermLookup = z.infer<typeof AggregationsMultiTermLookup>

export interface AggregationsMultiTermsAggregationShape {
  collect_mode?: AggregationsTermsAggregationCollectMode | undefined
  order?: AggregationsAggregateOrder | undefined
  min_doc_count?: long | undefined
  shard_min_doc_count?: long | undefined
  shard_size?: integer | undefined
  show_term_doc_count_error?: boolean | undefined
  size?: integer | undefined
  terms: AggregationsMultiTermLookupShape[]
}
export const AggregationsMultiTermsAggregation = z.object({
  collect_mode: AggregationsTermsAggregationCollectMode.describe('Specifies the strategy for data collection.').optional(),
  order: AggregationsAggregateOrder.describe('Specifies the sort order of the buckets. Defaults to sorting by descending document count.').optional(),
  min_doc_count: long.describe('The minimum number of documents in a bucket for it to be returned.').optional(),
  shard_min_doc_count: long.describe('The minimum number of documents in a bucket on each shard for it to be returned.').optional(),
  shard_size: integer.describe('The number of candidate terms produced by each shard. By default, `shard_size` will be automatically estimated based on the number of shards and the `size` parameter.').optional(),
  show_term_doc_count_error: z.boolean().describe('Calculates the doc count error on per term basis.').optional(),
  size: integer.describe('The number of term buckets should be returned out of the overall terms list.').optional(),
  get terms () { return AggregationsMultiTermLookup.array().describe('The field from which to generate sets of terms.') }
}).meta({ id: 'AggregationsMultiTermsAggregation' })
export type AggregationsMultiTermsAggregation = z.infer<typeof AggregationsMultiTermsAggregation>

export const AggregationsNestedAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape,
  path: Field.describe('The path to the field of type `nested`.').optional()
}).meta({ id: 'AggregationsNestedAggregation' })
export type AggregationsNestedAggregation = z.infer<typeof AggregationsNestedAggregation>

export const AggregationsNormalizeMethod = z.enum(['rescale_0_1', 'rescale_0_100', 'percent_of_sum', 'mean', 'z-score', 'softmax']).meta({ id: 'AggregationsNormalizeMethod' })
export type AggregationsNormalizeMethod = z.infer<typeof AggregationsNormalizeMethod>

export const AggregationsNormalizeAggregation = z.object({
  ...AggregationsPipelineAggregationBase.shape,
  method: AggregationsNormalizeMethod.describe('The specific method to apply.').optional()
}).meta({ id: 'AggregationsNormalizeAggregation' })
export type AggregationsNormalizeAggregation = z.infer<typeof AggregationsNormalizeAggregation>

export const AggregationsParentAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape,
  type: RelationName.describe('The child type that should be selected.').optional()
}).meta({ id: 'AggregationsParentAggregation' })
export type AggregationsParentAggregation = z.infer<typeof AggregationsParentAggregation>

export const AggregationsHdrMethod = z.object({
  number_of_significant_value_digits: integer.describe('Specifies the resolution of values for the histogram in number of significant digits.').optional()
}).meta({ id: 'AggregationsHdrMethod' })
export type AggregationsHdrMethod = z.infer<typeof AggregationsHdrMethod>

export const AggregationsTDigest = z.object({
  compression: integer.describe('Limits the maximum number of nodes used by the underlying TDigest algorithm to `20 * compression`, enabling control of memory usage and approximation error.').optional(),
  execution_hint: AggregationsTDigestExecutionHint.describe('The default implementation of TDigest is optimized for performance, scaling to millions or even billions of sample values while maintaining acceptable accuracy levels (close to 1% relative error for millions of samples in some cases). To use an implementation optimized for accuracy, set this parameter to high_accuracy instead.').optional()
}).meta({ id: 'AggregationsTDigest' })
export type AggregationsTDigest = z.infer<typeof AggregationsTDigest>

export interface AggregationsPercentileRanksAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  format?: string | undefined
  keyed?: boolean | undefined
  values?: double[] | null | undefined
  hdr?: AggregationsHdrMethod | undefined
  tdigest?: AggregationsTDigest | undefined
}
export const AggregationsPercentileRanksAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  format: z.string().optional(),
  keyed: z.boolean().describe('By default, the aggregation associates a unique string key with each bucket and returns the ranges as a hash rather than an array. Set to `false` to disable this behavior.').optional(),
  values: z.union([z.array(double), z.null()]).describe('An array of values for which to calculate the percentile ranks.').optional(),
  hdr: AggregationsHdrMethod.describe('Uses the alternative High Dynamic Range Histogram algorithm to calculate percentile ranks.').optional(),
  tdigest: AggregationsTDigest.describe('Sets parameters for the default TDigest algorithm used to calculate percentile ranks.').optional()
}).meta({ id: 'AggregationsPercentileRanksAggregation' })
export type AggregationsPercentileRanksAggregation = z.infer<typeof AggregationsPercentileRanksAggregation>

export interface AggregationsPercentilesAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  format?: string | undefined
  keyed?: boolean | undefined
  percents?: double | double[] | undefined
  hdr?: AggregationsHdrMethod | undefined
  tdigest?: AggregationsTDigest | undefined
}
export const AggregationsPercentilesAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  format: z.string().optional(),
  keyed: z.boolean().describe('By default, the aggregation associates a unique string key with each bucket and returns the ranges as a hash rather than an array. Set to `false` to disable this behavior.').optional(),
  percents: z.union([double, z.array(double)]).describe('The percentiles to calculate.').optional(),
  hdr: AggregationsHdrMethod.describe('Uses the alternative High Dynamic Range Histogram algorithm to calculate percentiles.').optional(),
  tdigest: AggregationsTDigest.describe('Sets parameters for the default TDigest algorithm used to calculate percentiles.').optional()
}).meta({ id: 'AggregationsPercentilesAggregation' })
export type AggregationsPercentilesAggregation = z.infer<typeof AggregationsPercentilesAggregation>

export const AggregationsPercentilesBucketAggregation = z.object({
  ...AggregationsPipelineAggregationBase.shape,
  percents: z.array(double).describe('The list of percentiles to calculate.').optional()
}).meta({ id: 'AggregationsPercentilesBucketAggregation' })
export type AggregationsPercentilesBucketAggregation = z.infer<typeof AggregationsPercentilesBucketAggregation>

export interface AggregationsRangeAggregationShape {
  field?: Field | undefined
  missing?: integer | undefined
  ranges?: AggregationsAggregationRange[] | undefined
  script?: ScriptShape | undefined
  keyed?: boolean | undefined
  format?: string | undefined
}
export const AggregationsRangeAggregation = z.object({
  field: Field.describe('The date field whose values are use to build ranges.').optional(),
  missing: integer.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  ranges: z.array(AggregationsAggregationRange).describe('An array of ranges used to bucket documents.').optional(),
  get script () { return Script.optional() },
  keyed: z.boolean().describe('Set to `true` to associate a unique string key with each bucket and return the ranges as a hash rather than an array.').optional(),
  format: z.string().optional()
}).meta({ id: 'AggregationsRangeAggregation' })
export type AggregationsRangeAggregation = z.infer<typeof AggregationsRangeAggregation>

export const AggregationsRareTermsAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape,
  exclude: AggregationsTermsExclude.describe('Terms that should be excluded from the aggregation.').optional(),
  field: Field.describe('The field from which to return rare terms.').optional(),
  include: AggregationsTermsInclude.describe('Terms that should be included in the aggregation.').optional(),
  max_doc_count: long.describe('The maximum number of documents a term should appear in.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  precision: double.describe('The precision of the internal CuckooFilters. Smaller precision leads to better approximation, but higher memory usage.').optional(),
  value_type: z.string().optional()
}).meta({ id: 'AggregationsRareTermsAggregation' })
export type AggregationsRareTermsAggregation = z.infer<typeof AggregationsRareTermsAggregation>

export const AggregationsRateMode = z.enum(['sum', 'value_count']).meta({ id: 'AggregationsRateMode' })
export type AggregationsRateMode = z.infer<typeof AggregationsRateMode>

export interface AggregationsRateAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  format?: string | undefined
  unit?: AggregationsCalendarInterval | undefined
  mode?: AggregationsRateMode | undefined
}
export const AggregationsRateAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  format: z.string().optional(),
  unit: AggregationsCalendarInterval.describe('The interval used to calculate the rate. By default, the interval of the `date_histogram` is used.').optional(),
  mode: AggregationsRateMode.describe('How the rate is calculated.').optional()
}).meta({ id: 'AggregationsRateAggregation' })
export type AggregationsRateAggregation = z.infer<typeof AggregationsRateAggregation>

export const AggregationsReverseNestedAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape,
  path: Field.describe('Defines the nested object field that should be joined back to. The default is empty, which means that it joins back to the root/main document level.').optional()
}).meta({ id: 'AggregationsReverseNestedAggregation' })
export type AggregationsReverseNestedAggregation = z.infer<typeof AggregationsReverseNestedAggregation>

export const AggregationsSamplerAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape,
  shard_size: integer.describe('Limits how many top-scoring documents are collected in the sample processed on each shard.').optional()
}).meta({ id: 'AggregationsSamplerAggregation' })
export type AggregationsSamplerAggregation = z.infer<typeof AggregationsSamplerAggregation>

export interface AggregationsScriptedMetricAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  combine_script?: ScriptShape | undefined
  init_script?: ScriptShape | undefined
  map_script?: ScriptShape | undefined
  params?: Record<string, unknown> | undefined
  reduce_script?: ScriptShape | undefined
}
export const AggregationsScriptedMetricAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  get combine_script () { return Script.describe('Runs once on each shard after document collection is complete. Allows the aggregation to consolidate the state returned from each shard.').optional() },
  get init_script () { return Script.describe('Runs prior to any collection of documents. Allows the aggregation to set up any initial state.').optional() },
  get map_script () { return Script.describe('Run once per document collected. If no `combine_script` is specified, the resulting state needs to be stored in the `state` object.').optional() },
  params: z.record(z.string(), z.any()).describe('A global object with script parameters for `init`, `map` and `combine` scripts. It is shared between the scripts.').optional(),
  get reduce_script () { return Script.describe('Runs once on the coordinating node after all shards have returned their results. The script is provided with access to a variable `states`, which is an array of the result of the `combine_script` on each shard.').optional() }
}).meta({ id: 'AggregationsScriptedMetricAggregation' })
export type AggregationsScriptedMetricAggregation = z.infer<typeof AggregationsScriptedMetricAggregation>

export const AggregationsSerialDifferencingAggregation = z.object({
  ...AggregationsPipelineAggregationBase.shape,
  lag: integer.describe('The historical bucket to subtract from the current value. Must be a positive, non-zero integer.').optional()
}).meta({ id: 'AggregationsSerialDifferencingAggregation' })
export type AggregationsSerialDifferencingAggregation = z.infer<typeof AggregationsSerialDifferencingAggregation>

export const AggregationsChiSquareHeuristic = z.object({
  background_is_superset: z.boolean().describe('Set to `false` if you defined a custom background filter that represents a different set of documents that you want to compare to.'),
  include_negatives: z.boolean().describe('Set to `false` to filter out the terms that appear less often in the subset than in documents outside the subset.')
}).meta({ id: 'AggregationsChiSquareHeuristic' })
export type AggregationsChiSquareHeuristic = z.infer<typeof AggregationsChiSquareHeuristic>

export const AggregationsTermsAggregationExecutionHint = z.enum(['map', 'global_ordinals', 'global_ordinals_hash', 'global_ordinals_low_cardinality']).meta({ id: 'AggregationsTermsAggregationExecutionHint' })
export type AggregationsTermsAggregationExecutionHint = z.infer<typeof AggregationsTermsAggregationExecutionHint>

export const AggregationsGoogleNormalizedDistanceHeuristic = z.object({
  background_is_superset: z.boolean().describe('Set to `false` if you defined a custom background filter that represents a different set of documents that you want to compare to.').optional()
}).meta({ id: 'AggregationsGoogleNormalizedDistanceHeuristic' })
export type AggregationsGoogleNormalizedDistanceHeuristic = z.infer<typeof AggregationsGoogleNormalizedDistanceHeuristic>

export const AggregationsMutualInformationHeuristic = z.object({
  background_is_superset: z.boolean().describe('Set to `false` if you defined a custom background filter that represents a different set of documents that you want to compare to.').optional(),
  include_negatives: z.boolean().describe('Set to `false` to filter out the terms that appear less often in the subset than in documents outside the subset.').optional()
}).meta({ id: 'AggregationsMutualInformationHeuristic' })
export type AggregationsMutualInformationHeuristic = z.infer<typeof AggregationsMutualInformationHeuristic>

export const AggregationsPercentageScoreHeuristic = z.object({
}).meta({ id: 'AggregationsPercentageScoreHeuristic' })
export type AggregationsPercentageScoreHeuristic = z.infer<typeof AggregationsPercentageScoreHeuristic>

export interface AggregationsScriptedHeuristicShape {
  script: ScriptShape
}
export const AggregationsScriptedHeuristic = z.object({
  get script () { return Script }
}).meta({ id: 'AggregationsScriptedHeuristic' })
export type AggregationsScriptedHeuristic = z.infer<typeof AggregationsScriptedHeuristic>

export const AggregationsPValueHeuristic = z.object({
  background_is_superset: z.boolean().optional(),
  normalize_above: long.describe('Should the results be normalized when above the given value. Allows for consistent significance results at various scales. Note: `0` is a special value which means no normalization').optional()
}).meta({ id: 'AggregationsPValueHeuristic' })
export type AggregationsPValueHeuristic = z.infer<typeof AggregationsPValueHeuristic>

export interface AggregationsSignificantTermsAggregationShape {
  background_filter?: QueryDslQueryContainerShape | undefined
  chi_square?: AggregationsChiSquareHeuristic | undefined
  exclude?: AggregationsTermsExclude | undefined
  execution_hint?: AggregationsTermsAggregationExecutionHint | undefined
  field?: Field | undefined
  gnd?: AggregationsGoogleNormalizedDistanceHeuristic | undefined
  include?: AggregationsTermsInclude | undefined
  jlh?: EmptyObject | undefined
  min_doc_count?: long | undefined
  mutual_information?: AggregationsMutualInformationHeuristic | undefined
  percentage?: AggregationsPercentageScoreHeuristic | undefined
  script_heuristic?: AggregationsScriptedHeuristicShape | undefined
  p_value?: AggregationsPValueHeuristic | undefined
  shard_min_doc_count?: long | undefined
  shard_size?: integer | undefined
  size?: integer | undefined
}
export const AggregationsSignificantTermsAggregation = z.object({
  get background_filter () { return QueryDslQueryContainer.describe('A background filter that can be used to focus in on significant terms within a narrower context, instead of the entire index.').optional() },
  chi_square: AggregationsChiSquareHeuristic.describe('Use Chi square, as described in "Information Retrieval", Manning et al., Chapter 13.5.2, as the significance score.').optional(),
  exclude: AggregationsTermsExclude.describe('Terms to exclude.').optional(),
  execution_hint: AggregationsTermsAggregationExecutionHint.describe('Mechanism by which the aggregation should be executed: using field values directly or using global ordinals.').optional(),
  field: Field.describe('The field from which to return significant terms.').optional(),
  gnd: AggregationsGoogleNormalizedDistanceHeuristic.describe('Use Google normalized distance as described in "The Google Similarity Distance", Cilibrasi and Vitanyi, 2007, as the significance score.').optional(),
  include: AggregationsTermsInclude.describe('Terms to include.').optional(),
  jlh: EmptyObject.describe('Use JLH score as the significance score.').optional(),
  min_doc_count: long.describe('Only return terms that are found in more than `min_doc_count` hits.').optional(),
  mutual_information: AggregationsMutualInformationHeuristic.describe('Use mutual information as described in "Information Retrieval", Manning et al., Chapter 13.5.1, as the significance score.').optional(),
  percentage: AggregationsPercentageScoreHeuristic.describe('A simple calculation of the number of documents in the foreground sample with a term divided by the number of documents in the background with the term.').optional(),
  get script_heuristic () { return AggregationsScriptedHeuristic.describe('Customized score, implemented via a script.').optional() },
  p_value: AggregationsPValueHeuristic.describe('Significant terms heuristic that calculates the p-value between the term existing in foreground and background sets. The p-value is the probability of obtaining test results at least as extreme as the results actually observed, under the assumption that the null hypothesis is correct. The p-value is calculated assuming that the foreground set and the background set are independent https://en.wikipedia.org/wiki/Bernoulli_trial, with the null hypothesis that the probabilities are the same.').optional(),
  shard_min_doc_count: long.describe('Regulates the certainty a shard has if the term should actually be added to the candidate list or not with respect to the `min_doc_count`. Terms will only be considered if their local shard frequency within the set is higher than the `shard_min_doc_count`.').optional(),
  shard_size: integer.describe('Can be used to control the volumes of candidate terms produced by each shard. By default, `shard_size` will be automatically estimated based on the number of shards and the `size` parameter.').optional(),
  size: integer.describe('The number of buckets returned out of the overall terms list.').optional()
}).meta({ id: 'AggregationsSignificantTermsAggregation' })
export type AggregationsSignificantTermsAggregation = z.infer<typeof AggregationsSignificantTermsAggregation>

export interface AggregationsSignificantTextAggregationShape {
  background_filter?: QueryDslQueryContainerShape | undefined
  chi_square?: AggregationsChiSquareHeuristic | undefined
  exclude?: AggregationsTermsExclude | undefined
  execution_hint?: AggregationsTermsAggregationExecutionHint | undefined
  field?: Field | undefined
  filter_duplicate_text?: boolean | undefined
  gnd?: AggregationsGoogleNormalizedDistanceHeuristic | undefined
  include?: AggregationsTermsInclude | undefined
  jlh?: EmptyObject | undefined
  min_doc_count?: long | undefined
  mutual_information?: AggregationsMutualInformationHeuristic | undefined
  percentage?: AggregationsPercentageScoreHeuristic | undefined
  script_heuristic?: AggregationsScriptedHeuristicShape | undefined
  shard_min_doc_count?: long | undefined
  shard_size?: integer | undefined
  size?: integer | undefined
  source_fields?: Fields | undefined
}
export const AggregationsSignificantTextAggregation = z.object({
  get background_filter () { return QueryDslQueryContainer.describe('A background filter that can be used to focus in on significant terms within a narrower context, instead of the entire index.').optional() },
  chi_square: AggregationsChiSquareHeuristic.describe('Use Chi square, as described in "Information Retrieval", Manning et al., Chapter 13.5.2, as the significance score.').optional(),
  exclude: AggregationsTermsExclude.describe('Values to exclude.').optional(),
  execution_hint: AggregationsTermsAggregationExecutionHint.describe('Determines whether the aggregation will use field values directly or global ordinals.').optional(),
  field: Field.describe('The field from which to return significant text.').optional(),
  filter_duplicate_text: z.boolean().describe('Whether to out duplicate text to deal with noisy data.').optional(),
  gnd: AggregationsGoogleNormalizedDistanceHeuristic.describe('Use Google normalized distance as described in "The Google Similarity Distance", Cilibrasi and Vitanyi, 2007, as the significance score.').optional(),
  include: AggregationsTermsInclude.describe('Values to include.').optional(),
  jlh: EmptyObject.describe('Use JLH score as the significance score.').optional(),
  min_doc_count: long.describe('Only return values that are found in more than `min_doc_count` hits.').optional(),
  mutual_information: AggregationsMutualInformationHeuristic.describe('Use mutual information as described in "Information Retrieval", Manning et al., Chapter 13.5.1, as the significance score.').optional(),
  percentage: AggregationsPercentageScoreHeuristic.describe('A simple calculation of the number of documents in the foreground sample with a term divided by the number of documents in the background with the term.').optional(),
  get script_heuristic () { return AggregationsScriptedHeuristic.describe('Customized score, implemented via a script.').optional() },
  shard_min_doc_count: long.describe('Regulates the certainty a shard has if the values should actually be added to the candidate list or not with respect to the min_doc_count. Values will only be considered if their local shard frequency within the set is higher than the `shard_min_doc_count`.').optional(),
  shard_size: integer.describe('The number of candidate terms produced by each shard. By default, `shard_size` will be automatically estimated based on the number of shards and the `size` parameter.').optional(),
  size: integer.describe('The number of buckets returned out of the overall terms list.').optional(),
  source_fields: Fields.describe('Overrides the JSON `_source` fields from which text will be analyzed.').optional()
}).meta({ id: 'AggregationsSignificantTextAggregation' })
export type AggregationsSignificantTextAggregation = z.infer<typeof AggregationsSignificantTextAggregation>

export interface AggregationsStatsAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  format?: string | undefined
}
export const AggregationsStatsAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  format: z.string().optional()
}).meta({ id: 'AggregationsStatsAggregation' })
export type AggregationsStatsAggregation = z.infer<typeof AggregationsStatsAggregation>

export const AggregationsStatsBucketAggregation = z.object({
  ...AggregationsPipelineAggregationBase.shape
}).meta({ id: 'AggregationsStatsBucketAggregation' })
export type AggregationsStatsBucketAggregation = z.infer<typeof AggregationsStatsBucketAggregation>

export interface AggregationsStringStatsAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  show_distribution?: boolean | undefined
}
export const AggregationsStringStatsAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  show_distribution: z.boolean().describe('Shows the probability distribution for all characters.').optional()
}).meta({ id: 'AggregationsStringStatsAggregation' })
export type AggregationsStringStatsAggregation = z.infer<typeof AggregationsStringStatsAggregation>

export interface AggregationsSumAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  format?: string | undefined
}
export const AggregationsSumAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  format: z.string().optional()
}).meta({ id: 'AggregationsSumAggregation' })
export type AggregationsSumAggregation = z.infer<typeof AggregationsSumAggregation>

export const AggregationsSumBucketAggregation = z.object({
  ...AggregationsPipelineAggregationBase.shape
}).meta({ id: 'AggregationsSumBucketAggregation' })
export type AggregationsSumBucketAggregation = z.infer<typeof AggregationsSumBucketAggregation>

export interface AggregationsTermsAggregationShape {
  collect_mode?: AggregationsTermsAggregationCollectMode | undefined
  exclude?: AggregationsTermsExclude | undefined
  execution_hint?: AggregationsTermsAggregationExecutionHint | undefined
  field?: Field | undefined
  include?: AggregationsTermsInclude | undefined
  min_doc_count?: integer | undefined
  missing?: AggregationsMissing | undefined
  missing_order?: AggregationsMissingOrder | undefined
  missing_bucket?: boolean | undefined
  value_type?: string | undefined
  order?: AggregationsAggregateOrder | undefined
  script?: ScriptShape | undefined
  shard_min_doc_count?: long | undefined
  shard_size?: integer | undefined
  show_term_doc_count_error?: boolean | undefined
  size?: integer | undefined
  format?: string | undefined
}
export const AggregationsTermsAggregation = z.object({
  collect_mode: AggregationsTermsAggregationCollectMode.describe('Determines how child aggregations should be calculated: breadth-first or depth-first.').optional(),
  exclude: AggregationsTermsExclude.describe('Values to exclude. Accepts regular expressions and partitions.').optional(),
  execution_hint: AggregationsTermsAggregationExecutionHint.describe('Determines whether the aggregation will use field values directly or global ordinals.').optional(),
  field: Field.describe('The field from which to return terms.').optional(),
  include: AggregationsTermsInclude.describe('Values to include. Accepts regular expressions and partitions.').optional(),
  min_doc_count: integer.describe('Only return values that are found in more than `min_doc_count` hits.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  missing_order: AggregationsMissingOrder.optional(),
  missing_bucket: z.boolean().optional(),
  value_type: z.string().describe('Coerced unmapped fields into the specified type.').optional(),
  order: AggregationsAggregateOrder.describe('Specifies the sort order of the buckets. Defaults to sorting by descending document count.').optional(),
  get script () { return Script.optional() },
  shard_min_doc_count: long.describe('Regulates the certainty a shard has if the term should actually be added to the candidate list or not with respect to the `min_doc_count`. Terms will only be considered if their local shard frequency within the set is higher than the `shard_min_doc_count`.').optional(),
  shard_size: integer.describe('The number of candidate terms produced by each shard. By default, `shard_size` will be automatically estimated based on the number of shards and the `size` parameter.').optional(),
  show_term_doc_count_error: z.boolean().describe('Set to `true` to return the `doc_count_error_upper_bound`, which is an upper bound to the error on the `doc_count` returned by each shard.').optional(),
  size: integer.describe('The number of buckets returned out of the overall terms list.').optional(),
  format: z.string().optional()
}).meta({ id: 'AggregationsTermsAggregation' })
export type AggregationsTermsAggregation = z.infer<typeof AggregationsTermsAggregation>

export const AggregationsTimeSeriesAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape,
  size: integer.describe('The maximum number of results to return.').optional(),
  keyed: z.boolean().describe('Set to `true` to associate a unique string key with each bucket and returns the ranges as a hash rather than an array.').optional()
}).meta({ id: 'AggregationsTimeSeriesAggregation' })
export type AggregationsTimeSeriesAggregation = z.infer<typeof AggregationsTimeSeriesAggregation>

export interface ScriptFieldShape {
  script: ScriptShape
  ignore_failure?: boolean | undefined
}
export const ScriptField = z.object({
  get script () { return Script },
  ignore_failure: z.boolean().optional()
}).meta({ id: 'ScriptField' })
export type ScriptField = z.infer<typeof ScriptField>

export const SearchSourceFilter = z.object({
  exclude_vectors: z.boolean().describe('If `true`, vector fields are excluded from the returned source. This option takes precedence over `includes`: any vector field will remain excluded even if it matches an `includes` rule.').optional(),
  excludes: Fields.describe('A list of fields to exclude from the returned source.').optional(),
  exclude: Fields.describe('A list of fields to exclude from the returned source.').optional(),
  includes: Fields.describe('A list of fields to include in the returned source.').optional(),
  include: Fields.describe('A list of fields to include in the returned source.').optional()
}).meta({ id: 'SearchSourceFilter' })
export type SearchSourceFilter = z.infer<typeof SearchSourceFilter>

/** Defines how to fetch a source. Fetching can be disabled entirely, or the source can be filtered. */
export const SearchSourceConfig = z.union([z.boolean(), SearchSourceFilter]).meta({ id: 'SearchSourceConfig' })
export type SearchSourceConfig = z.infer<typeof SearchSourceConfig>

export interface AggregationsTopHitsAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  docvalue_fields?: QueryDslFieldAndFormat[] | undefined
  explain?: boolean | undefined
  fields?: QueryDslFieldAndFormat[] | undefined
  from?: integer | undefined
  highlight?: SearchHighlightShape | undefined
  script_fields?: Record<string, ScriptFieldShape> | undefined
  size?: integer | undefined
  sort?: SortShape | undefined
  _source?: SearchSourceConfig | undefined
  stored_fields?: Fields | undefined
  track_scores?: boolean | undefined
  version?: boolean | undefined
  seq_no_primary_term?: boolean | undefined
}
export const AggregationsTopHitsAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  docvalue_fields: z.array(QueryDslFieldAndFormat).describe('Fields for which to return doc values.').optional(),
  explain: z.boolean().describe('If `true`, returns detailed information about score computation as part of a hit.').optional(),
  fields: z.array(QueryDslFieldAndFormat).describe('Array of wildcard (*) patterns. The request returns values for field names matching these patterns in the hits.fields property of the response.').optional(),
  from: integer.describe('Starting document offset.').optional(),
  get highlight () { return SearchHighlight.describe('Specifies the highlighter to use for retrieving highlighted snippets from one or more fields in the search results.').optional() },
  get script_fields (): z.ZodOptional<z.ZodRecord<z.ZodString, typeof ScriptField>> { return z.record(z.string(), ScriptField).describe('Returns the result of one or more script evaluations for each hit.').optional() },
  size: integer.describe('The maximum number of top matching hits to return per bucket.').optional(),
  get sort () { return Sort.describe('Sort order of the top matching hits. By default, the hits are sorted by the score of the main query.').optional() },
  _source: SearchSourceConfig.describe('Selects the fields of the source that are returned.').optional(),
  stored_fields: Fields.describe('Returns values for the specified stored fields (fields that use the `store` mapping option).').optional(),
  track_scores: z.boolean().describe('If `true`, calculates and returns document scores, even if the scores are not used for sorting.').optional(),
  version: z.boolean().describe('If `true`, returns document version as part of a hit.').optional(),
  seq_no_primary_term: z.boolean().describe('If `true`, returns sequence number and primary term of the last modification of each hit.').optional()
}).meta({ id: 'AggregationsTopHitsAggregation' })
export type AggregationsTopHitsAggregation = z.infer<typeof AggregationsTopHitsAggregation>

export interface AggregationsTestPopulationShape {
  field: Field
  script?: ScriptShape | undefined
  filter?: QueryDslQueryContainerShape | undefined
}
export const AggregationsTestPopulation = z.object({
  field: Field.describe('The field to aggregate.'),
  get script () { return Script.optional() },
  get filter () { return QueryDslQueryContainer.describe('A filter used to define a set of records to run unpaired t-test on.').optional() }
}).meta({ id: 'AggregationsTestPopulation' })
export type AggregationsTestPopulation = z.infer<typeof AggregationsTestPopulation>

export const AggregationsTTestType = z.enum(['paired', 'homoscedastic', 'heteroscedastic']).meta({ id: 'AggregationsTTestType' })
export type AggregationsTTestType = z.infer<typeof AggregationsTTestType>

export interface AggregationsTTestAggregationShape {
  a?: AggregationsTestPopulationShape | undefined
  b?: AggregationsTestPopulationShape | undefined
  type?: AggregationsTTestType | undefined
}
export const AggregationsTTestAggregation = z.object({
  get a () { return AggregationsTestPopulation.describe('Test population A.').optional() },
  get b () { return AggregationsTestPopulation.describe('Test population B.').optional() },
  type: AggregationsTTestType.describe('The type of test.').optional()
}).meta({ id: 'AggregationsTTestAggregation' })
export type AggregationsTTestAggregation = z.infer<typeof AggregationsTTestAggregation>

export const AggregationsTopMetricsValue = z.object({
  field: Field.describe('A field to return as a metric.')
}).meta({ id: 'AggregationsTopMetricsValue' })
export type AggregationsTopMetricsValue = z.infer<typeof AggregationsTopMetricsValue>

export interface AggregationsTopMetricsAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  metrics?: AggregationsTopMetricsValue | AggregationsTopMetricsValue[] | undefined
  size?: integer | undefined
  sort?: SortShape | undefined
}
export const AggregationsTopMetricsAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  metrics: z.union([AggregationsTopMetricsValue, z.array(AggregationsTopMetricsValue)]).describe('The fields of the top document to return.').optional(),
  size: integer.describe('The number of top documents from which to return metrics.').optional(),
  get sort () { return Sort.describe('The sort order of the documents.').optional() }
}).meta({ id: 'AggregationsTopMetricsAggregation' })
export type AggregationsTopMetricsAggregation = z.infer<typeof AggregationsTopMetricsAggregation>

export interface AggregationsFormattableMetricAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  format?: string | undefined
}
export const AggregationsFormattableMetricAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  format: z.string().optional()
}).meta({ id: 'AggregationsFormattableMetricAggregation' })
export type AggregationsFormattableMetricAggregation = z.infer<typeof AggregationsFormattableMetricAggregation>

export interface AggregationsValueCountAggregationShape {
  field?: Field | undefined
  missing?: AggregationsMissing | undefined
  script?: ScriptShape | undefined
  format?: string | undefined
}
export const AggregationsValueCountAggregation = z.object({
  field: Field.describe('The field on which to run the aggregation.').optional(),
  missing: AggregationsMissing.describe('The value to apply to documents that do not have a value. By default, documents without a value are ignored.').optional(),
  get script () { return Script.optional() },
  format: z.string().optional()
}).meta({ id: 'AggregationsValueCountAggregation' })
export type AggregationsValueCountAggregation = z.infer<typeof AggregationsValueCountAggregation>

export interface AggregationsWeightedAverageValueShape {
  field?: Field | undefined
  missing?: double | undefined
  script?: ScriptShape | undefined
}
export const AggregationsWeightedAverageValue = z.object({
  field: Field.describe('The field from which to extract the values or weights.').optional(),
  missing: double.describe('A value or weight to use if the field is missing.').optional(),
  get script () { return Script.optional() }
}).meta({ id: 'AggregationsWeightedAverageValue' })
export type AggregationsWeightedAverageValue = z.infer<typeof AggregationsWeightedAverageValue>

export interface AggregationsWeightedAverageAggregationShape {
  format?: string | undefined
  value?: AggregationsWeightedAverageValueShape | undefined
  value_type?: AggregationsValueType | undefined
  weight?: AggregationsWeightedAverageValueShape | undefined
}
export const AggregationsWeightedAverageAggregation = z.object({
  format: z.string().describe('A numeric response formatter.').optional(),
  get value () { return AggregationsWeightedAverageValue.describe('Configuration for the field that provides the values.').optional() },
  value_type: AggregationsValueType.optional(),
  get weight () { return AggregationsWeightedAverageValue.describe('Configuration for the field or script that provides the weights.').optional() }
}).meta({ id: 'AggregationsWeightedAverageAggregation' })
export type AggregationsWeightedAverageAggregation = z.infer<typeof AggregationsWeightedAverageAggregation>

export interface AggregationsVariableWidthHistogramAggregationShape {
  field?: Field | undefined
  buckets?: integer | undefined
  shard_size?: integer | undefined
  initial_buffer?: integer | undefined
  script?: ScriptShape | undefined
}
export const AggregationsVariableWidthHistogramAggregation = z.object({
  field: Field.describe('The name of the field.').optional(),
  buckets: integer.describe('The target number of buckets.').optional(),
  shard_size: integer.describe('The number of buckets that the coordinating node will request from each shard. Defaults to `buckets * 50`.').optional(),
  initial_buffer: integer.describe('Specifies the number of individual documents that will be stored in memory on a shard before the initial bucketing algorithm is run. Defaults to `min(10 * shard_size, 50000)`.').optional(),
  get script () { return Script.optional() }
}).meta({ id: 'AggregationsVariableWidthHistogramAggregation' })
export type AggregationsVariableWidthHistogramAggregation = z.infer<typeof AggregationsVariableWidthHistogramAggregation>

const AggregationsAggregationContainerCommonProps = z.object({
  aggregations: z.record(z.string(), z.lazy(() => AggregationsAggregationContainer)).describe('Sub-aggregations for this aggregation. Only applies to bucket aggregations.').optional(),
  aggs: z.record(z.string(), z.lazy(() => AggregationsAggregationContainer)).describe('Sub-aggregations for this aggregation. Only applies to bucket aggregations.').optional(),
  meta: Metadata.optional()
})

const AggregationsAggregationContainerExclusiveProps = z.union([z.object({ adjacency_matrix: z.lazy(() => AggregationsAdjacencyMatrixAggregation) }), z.object({ auto_date_histogram: z.lazy(() => AggregationsAutoDateHistogramAggregation) }), z.object({ avg: z.lazy(() => AggregationsAverageAggregation) }), z.object({ avg_bucket: AggregationsAverageBucketAggregation }), z.object({ boxplot: z.lazy(() => AggregationsBoxplotAggregation) }), z.object({ bucket_script: z.lazy(() => AggregationsBucketScriptAggregation) }), z.object({ bucket_selector: z.lazy(() => AggregationsBucketSelectorAggregation) }), z.object({ bucket_sort: z.lazy(() => AggregationsBucketSortAggregation) }), z.object({ bucket_count_ks_test: AggregationsBucketKsAggregation }), z.object({ bucket_correlation: AggregationsBucketCorrelationAggregation }), z.object({ cardinality: z.lazy(() => AggregationsCardinalityAggregation) }), z.object({ cartesian_bounds: z.lazy(() => AggregationsCartesianBoundsAggregation) }), z.object({ cartesian_centroid: z.lazy(() => AggregationsCartesianCentroidAggregation) }), z.object({ categorize_text: AggregationsCategorizeTextAggregation }), z.object({ change_point: AggregationsChangePointAggregation }), z.object({ children: AggregationsChildrenAggregation }), z.object({ composite: z.lazy(() => AggregationsCompositeAggregation) }), z.object({ cumulative_cardinality: AggregationsCumulativeCardinalityAggregation }), z.object({ cumulative_sum: AggregationsCumulativeSumAggregation }), z.object({ date_histogram: z.lazy(() => AggregationsDateHistogramAggregation) }), z.object({ date_range: AggregationsDateRangeAggregation }), z.object({ derivative: AggregationsDerivativeAggregation }), z.object({ diversified_sampler: z.lazy(() => AggregationsDiversifiedSamplerAggregation) }), z.object({ extended_stats: z.lazy(() => AggregationsExtendedStatsAggregation) }), z.object({ extended_stats_bucket: AggregationsExtendedStatsBucketAggregation }), z.object({ frequent_item_sets: z.lazy(() => AggregationsFrequentItemSetsAggregation) }), z.object({ filter: z.lazy(() => QueryDslQueryContainer) }), z.object({ filters: AggregationsFiltersAggregation }), z.object({ geo_bounds: z.lazy(() => AggregationsGeoBoundsAggregation) }), z.object({ geo_centroid: z.lazy(() => AggregationsGeoCentroidAggregation) }), z.object({ geo_distance: AggregationsGeoDistanceAggregation }), z.object({ geohash_grid: AggregationsGeoHashGridAggregation }), z.object({ geo_line: AggregationsGeoLineAggregation }), z.object({ geotile_grid: AggregationsGeoTileGridAggregation }), z.object({ geohex_grid: AggregationsGeohexGridAggregation }), z.object({ global: AggregationsGlobalAggregation }), z.object({ histogram: z.lazy(() => AggregationsHistogramAggregation) }), z.object({ ip_range: AggregationsIpRangeAggregation }), z.object({ ip_prefix: AggregationsIpPrefixAggregation }), z.object({ inference: AggregationsInferenceAggregation }), z.object({ line: AggregationsGeoLineAggregation }), z.object({ matrix_stats: AggregationsMatrixStatsAggregation }), z.object({ max: z.lazy(() => AggregationsMaxAggregation) }), z.object({ max_bucket: AggregationsMaxBucketAggregation }), z.object({ median_absolute_deviation: z.lazy(() => AggregationsMedianAbsoluteDeviationAggregation) }), z.object({ min: z.lazy(() => AggregationsMinAggregation) }), z.object({ min_bucket: AggregationsMinBucketAggregation }), z.object({ missing: AggregationsMissingAggregation }), z.object({ moving_avg: AggregationsMovingAverageAggregation }), z.object({ moving_percentiles: AggregationsMovingPercentilesAggregation }), z.object({ moving_fn: AggregationsMovingFunctionAggregation }), z.object({ multi_terms: z.lazy(() => AggregationsMultiTermsAggregation) }), z.object({ nested: AggregationsNestedAggregation }), z.object({ normalize: AggregationsNormalizeAggregation }), z.object({ parent: AggregationsParentAggregation }), z.object({ percentile_ranks: z.lazy(() => AggregationsPercentileRanksAggregation) }), z.object({ percentiles: z.lazy(() => AggregationsPercentilesAggregation) }), z.object({ percentiles_bucket: AggregationsPercentilesBucketAggregation }), z.object({ range: z.lazy(() => AggregationsRangeAggregation) }), z.object({ rare_terms: AggregationsRareTermsAggregation }), z.object({ rate: z.lazy(() => AggregationsRateAggregation) }), z.object({ reverse_nested: AggregationsReverseNestedAggregation }), z.object({ sampler: AggregationsSamplerAggregation }), z.object({ scripted_metric: z.lazy(() => AggregationsScriptedMetricAggregation) }), z.object({ serial_diff: AggregationsSerialDifferencingAggregation }), z.object({ significant_terms: z.lazy(() => AggregationsSignificantTermsAggregation) }), z.object({ significant_text: z.lazy(() => AggregationsSignificantTextAggregation) }), z.object({ stats: z.lazy(() => AggregationsStatsAggregation) }), z.object({ stats_bucket: AggregationsStatsBucketAggregation }), z.object({ string_stats: z.lazy(() => AggregationsStringStatsAggregation) }), z.object({ sum: z.lazy(() => AggregationsSumAggregation) }), z.object({ sum_bucket: AggregationsSumBucketAggregation }), z.object({ terms: z.lazy(() => AggregationsTermsAggregation) }), z.object({ time_series: AggregationsTimeSeriesAggregation }), z.object({ top_hits: z.lazy(() => AggregationsTopHitsAggregation) }), z.object({ t_test: z.lazy(() => AggregationsTTestAggregation) }), z.object({ top_metrics: z.lazy(() => AggregationsTopMetricsAggregation) }), z.object({ value_count: z.lazy(() => AggregationsValueCountAggregation) }), z.object({ weighted_avg: z.lazy(() => AggregationsWeightedAverageAggregation) }), z.object({ variable_width_histogram: z.lazy(() => AggregationsVariableWidthHistogramAggregation) })])

export interface AggregationsAggregationContainerShape {
  aggregations?: Record<string, AggregationsAggregationContainerShape> | undefined
  meta?: Metadata | undefined
  adjacency_matrix?: AggregationsAdjacencyMatrixAggregation | undefined
  auto_date_histogram?: AggregationsAutoDateHistogramAggregation | undefined
  avg?: AggregationsAverageAggregation | undefined
  avg_bucket?: AggregationsAverageBucketAggregation | undefined
  boxplot?: AggregationsBoxplotAggregation | undefined
  bucket_script?: AggregationsBucketScriptAggregation | undefined
  bucket_selector?: AggregationsBucketSelectorAggregation | undefined
  bucket_sort?: AggregationsBucketSortAggregation | undefined
  bucket_count_ks_test?: AggregationsBucketKsAggregation | undefined
  bucket_correlation?: AggregationsBucketCorrelationAggregation | undefined
  cardinality?: AggregationsCardinalityAggregation | undefined
  cartesian_bounds?: AggregationsCartesianBoundsAggregation | undefined
  cartesian_centroid?: AggregationsCartesianCentroidAggregation | undefined
  categorize_text?: AggregationsCategorizeTextAggregation | undefined
  change_point?: AggregationsChangePointAggregation | undefined
  children?: AggregationsChildrenAggregation | undefined
  composite?: AggregationsCompositeAggregation | undefined
  cumulative_cardinality?: AggregationsCumulativeCardinalityAggregation | undefined
  cumulative_sum?: AggregationsCumulativeSumAggregation | undefined
  date_histogram?: AggregationsDateHistogramAggregation | undefined
  date_range?: AggregationsDateRangeAggregation | undefined
  derivative?: AggregationsDerivativeAggregation | undefined
  diversified_sampler?: AggregationsDiversifiedSamplerAggregation | undefined
  extended_stats?: AggregationsExtendedStatsAggregation | undefined
  extended_stats_bucket?: AggregationsExtendedStatsBucketAggregation | undefined
  frequent_item_sets?: AggregationsFrequentItemSetsAggregation | undefined
  filter?: QueryDslQueryContainer | undefined
  filters?: AggregationsFiltersAggregation | undefined
  geo_bounds?: AggregationsGeoBoundsAggregation | undefined
  geo_centroid?: AggregationsGeoCentroidAggregation | undefined
  geo_distance?: AggregationsGeoDistanceAggregation | undefined
  geohash_grid?: AggregationsGeoHashGridAggregation | undefined
  geo_line?: AggregationsGeoLineAggregation | undefined
  geotile_grid?: AggregationsGeoTileGridAggregation | undefined
  geohex_grid?: AggregationsGeohexGridAggregation | undefined
  global?: AggregationsGlobalAggregation | undefined
  histogram?: AggregationsHistogramAggregation | undefined
  ip_range?: AggregationsIpRangeAggregation | undefined
  ip_prefix?: AggregationsIpPrefixAggregation | undefined
  inference?: AggregationsInferenceAggregation | undefined
  line?: AggregationsGeoLineAggregation | undefined
  matrix_stats?: AggregationsMatrixStatsAggregation | undefined
  max?: AggregationsMaxAggregation | undefined
  max_bucket?: AggregationsMaxBucketAggregation | undefined
  median_absolute_deviation?: AggregationsMedianAbsoluteDeviationAggregation | undefined
  min?: AggregationsMinAggregation | undefined
  min_bucket?: AggregationsMinBucketAggregation | undefined
  missing?: AggregationsMissingAggregation | undefined
  moving_avg?: AggregationsMovingAverageAggregation | undefined
  moving_percentiles?: AggregationsMovingPercentilesAggregation | undefined
  moving_fn?: AggregationsMovingFunctionAggregation | undefined
  multi_terms?: AggregationsMultiTermsAggregation | undefined
  nested?: AggregationsNestedAggregation | undefined
  normalize?: AggregationsNormalizeAggregation | undefined
  parent?: AggregationsParentAggregation | undefined
  percentile_ranks?: AggregationsPercentileRanksAggregation | undefined
  percentiles?: AggregationsPercentilesAggregation | undefined
  percentiles_bucket?: AggregationsPercentilesBucketAggregation | undefined
  range?: AggregationsRangeAggregation | undefined
  rare_terms?: AggregationsRareTermsAggregation | undefined
  rate?: AggregationsRateAggregation | undefined
  reverse_nested?: AggregationsReverseNestedAggregation | undefined
  sampler?: AggregationsSamplerAggregation | undefined
  scripted_metric?: AggregationsScriptedMetricAggregation | undefined
  serial_diff?: AggregationsSerialDifferencingAggregation | undefined
  significant_terms?: AggregationsSignificantTermsAggregation | undefined
  significant_text?: AggregationsSignificantTextAggregation | undefined
  stats?: AggregationsStatsAggregation | undefined
  stats_bucket?: AggregationsStatsBucketAggregation | undefined
  string_stats?: AggregationsStringStatsAggregation | undefined
  sum?: AggregationsSumAggregation | undefined
  sum_bucket?: AggregationsSumBucketAggregation | undefined
  terms?: AggregationsTermsAggregation | undefined
  time_series?: AggregationsTimeSeriesAggregation | undefined
  top_hits?: AggregationsTopHitsAggregation | undefined
  t_test?: AggregationsTTestAggregation | undefined
  top_metrics?: AggregationsTopMetricsAggregation | undefined
  value_count?: AggregationsValueCountAggregation | undefined
  weighted_avg?: AggregationsWeightedAverageAggregation | undefined
  variable_width_histogram?: AggregationsVariableWidthHistogramAggregation | undefined
}
export const AggregationsAggregationContainer: z.ZodType<AggregationsAggregationContainerShape> = AggregationsAggregationContainerCommonProps.and(AggregationsAggregationContainerExclusiveProps).meta({ id: 'AggregationsAggregationContainer' })
export type AggregationsAggregationContainer = z.infer<typeof AggregationsAggregationContainer>

/**
 * Number of hits matching the query to count accurately. If true, the exact
 * number of hits is returned at the cost of some performance. If false, the
 * response does not include the total number of hits matching the query.
 * Defaults to 10,000 hits.
 */
export const SearchTrackHits = z.union([z.boolean(), integer]).meta({ id: 'SearchTrackHits' })
export type SearchTrackHits = z.infer<typeof SearchTrackHits>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const QueryVector = z.array(float).meta({ id: 'QueryVector' })
export type QueryVector = z.infer<typeof QueryVector>

export const TextEmbedding = z.object({
  model_id: z.string().describe('Model ID is required for all dense_vector fields but may be inferred for semantic_text fields').optional(),
  model_text: z.string().describe('The text to be converted into a vector by the specified model')
}).meta({ id: 'TextEmbedding' })
export type TextEmbedding = z.infer<typeof TextEmbedding>

export const LookupQueryVectorBuilder = z.object({
  id: z.string().describe('The ID of the document to fetch the vector from'),
  index: z.string().describe('The name of the index to fetch the document from'),
  path: z.string().describe('The name of the field containing the vector'),
  routing: z.string().describe('The routing value to use when fetching the document').optional()
}).meta({ id: 'LookupQueryVectorBuilder' })
export type LookupQueryVectorBuilder = z.infer<typeof LookupQueryVectorBuilder>

const QueryVectorBuilderExclusiveProps = z.union([z.object({ text_embedding: TextEmbedding }), z.object({ lookup: LookupQueryVectorBuilder })])

export const QueryVectorBuilder = QueryVectorBuilderExclusiveProps.meta({ id: 'QueryVectorBuilder' })
export type QueryVectorBuilder = z.infer<typeof QueryVectorBuilder>

export const RescoreVector = z.object({
  oversample: float.describe('Applies the specified oversample factor to k on the approximate kNN search')
}).meta({ id: 'RescoreVector' })
export type RescoreVector = z.infer<typeof RescoreVector>

export interface KnnSearchShape {
  field: Field
  query_vector?: QueryVector | undefined
  query_vector_builder?: QueryVectorBuilder | undefined
  k?: integer | undefined
  num_candidates?: integer | undefined
  visit_percentage?: float | undefined
  boost?: float | undefined
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  similarity?: float | undefined
  inner_hits?: SearchInnerHitsShape | undefined
  rescore_vector?: RescoreVector | undefined
  query_name?: string | undefined
}
export const KnnSearch = z.object({
  field: Field.describe('The name of the vector field to search against'),
  query_vector: QueryVector.describe('The query vector').optional(),
  query_vector_builder: QueryVectorBuilder.describe('The query vector builder. You must provide a query_vector_builder or query_vector, but not both.').optional(),
  k: integer.describe('The final number of nearest neighbors to return as top hits').optional(),
  num_candidates: integer.describe('The number of nearest neighbor candidates to consider per shard').optional(),
  visit_percentage: float.describe('The percentage of vectors to explore per shard while doing knn search with bbq_disk').optional(),
  boost: float.describe('Boost value to apply to kNN scores').optional(),
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Filters for the kNN search query').optional() },
  similarity: float.describe('The minimum similarity for a vector to be considered a match').optional(),
  get inner_hits () { return SearchInnerHits.describe('If defined, each search hit will contain inner hits.').optional() },
  rescore_vector: RescoreVector.describe('Apply oversampling and rescoring to quantized vectors').optional(),
  query_name: z.string().optional()
}).meta({ id: 'KnnSearch' })
export type KnnSearch = z.infer<typeof KnnSearch>

export const SearchScoreMode = z.enum(['avg', 'max', 'min', 'multiply', 'total']).meta({ id: 'SearchScoreMode' })
export type SearchScoreMode = z.infer<typeof SearchScoreMode>

export interface SearchRescoreQueryShape {
  Query: QueryDslQueryContainerShape
  query_weight?: double | undefined
  rescore_query_weight?: double | undefined
  score_mode?: SearchScoreMode | undefined
}
export const SearchRescoreQuery = z.object({
  get Query () { return QueryDslQueryContainer.describe('The query to use for rescoring. This query is only run on the Top-K results returned by the `query` and `post_filter` phases.') },
  query_weight: double.describe('Relative importance of the original query versus the rescore query.').optional(),
  rescore_query_weight: double.describe('Relative importance of the rescore query versus the original query.').optional(),
  score_mode: SearchScoreMode.describe('Determines how scores are combined.').optional()
}).meta({ id: 'SearchRescoreQuery' })
export type SearchRescoreQuery = z.infer<typeof SearchRescoreQuery>

export const SearchLearningToRank = z.object({
  model_id: z.string().describe('The unique identifier of the trained model uploaded to Elasticsearch'),
  params: z.record(z.string(), z.any()).describe('Named parameters to be passed to the query templates used for feature').optional()
}).meta({ id: 'SearchLearningToRank' })
export type SearchLearningToRank = z.infer<typeof SearchLearningToRank>

export interface SearchScriptRescoreShape {
  script: ScriptShape
}
export const SearchScriptRescore = z.object({
  get script () { return Script }
}).meta({ id: 'SearchScriptRescore' })
export type SearchScriptRescore = z.infer<typeof SearchScriptRescore>

const SearchRescoreCommonProps = z.object({
  window_size: integer.optional()
})

const SearchRescoreExclusiveProps = z.union([z.object({ query: z.lazy(() => SearchRescoreQuery) }), z.object({ learning_to_rank: SearchLearningToRank }), z.object({ script: z.lazy(() => SearchScriptRescore) })])

export interface SearchRescoreShape {
  window_size?: integer | undefined
  query?: SearchRescoreQuery | undefined
  learning_to_rank?: SearchLearningToRank | undefined
  script?: SearchScriptRescore | undefined
}
export const SearchRescore: z.ZodType<SearchRescoreShape> = SearchRescoreCommonProps.and(SearchRescoreExclusiveProps).meta({ id: 'SearchRescore' })
export type SearchRescore = z.infer<typeof SearchRescore>

export interface RetrieverBaseShape {
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  min_score?: float | undefined
  _name?: string | undefined
}
export const RetrieverBase = z.object({
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Query to filter the documents that can match.').optional() },
  min_score: float.describe('Minimum _score for matching documents. Documents with a lower _score are not included in the top documents.').optional(),
  _name: z.string().describe('Retriever name.').optional()
}).meta({ id: 'RetrieverBase' })
export type RetrieverBase = z.infer<typeof RetrieverBase>

export const SortResults = z.array(FieldValue).meta({ id: 'SortResults' })
export type SortResults = z.infer<typeof SortResults>

export interface StandardRetrieverShape {
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  min_score?: float | undefined
  _name?: string | undefined
  query?: QueryDslQueryContainerShape | undefined
  search_after?: SortResults | undefined
  terminate_after?: integer | undefined
  sort?: SortShape | undefined
  collapse?: SearchFieldCollapseShape | undefined
}
export const StandardRetriever = z.object({
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Query to filter the documents that can match.').optional() },
  min_score: float.describe('Minimum _score for matching documents. Documents with a lower _score are not included in the top documents.').optional(),
  _name: z.string().describe('Retriever name.').optional(),
  get query () { return QueryDslQueryContainer.describe('Defines a query to retrieve a set of top documents.').optional() },
  search_after: SortResults.describe('Defines a search after object parameter used for pagination.').optional(),
  terminate_after: integer.describe('Maximum number of documents to collect for each shard.').optional(),
  get sort () { return Sort.describe('A sort object that that specifies the order of matching documents.').optional() },
  get collapse () { return SearchFieldCollapse.describe('Collapses the top documents by a specified key into a single top document per key.').optional() }
}).meta({ id: 'StandardRetriever' })
export type StandardRetriever = z.infer<typeof StandardRetriever>

export interface KnnRetrieverShape {
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  min_score?: float | undefined
  _name?: string | undefined
  field: string
  query_vector?: QueryVector | undefined
  query_vector_builder?: QueryVectorBuilder | undefined
  k: integer
  num_candidates: integer
  visit_percentage?: float | undefined
  similarity?: float | undefined
  rescore_vector?: RescoreVector | undefined
}
export const KnnRetriever = z.object({
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Query to filter the documents that can match.').optional() },
  min_score: float.describe('Minimum _score for matching documents. Documents with a lower _score are not included in the top documents.').optional(),
  _name: z.string().describe('Retriever name.').optional(),
  field: z.string().describe('The name of the vector field to search against.'),
  query_vector: QueryVector.describe('Query vector. Must have the same number of dimensions as the vector field you are searching against. You must provide a query_vector_builder or query_vector, but not both.').optional(),
  query_vector_builder: QueryVectorBuilder.describe('Defines a model to build a query vector.').optional(),
  k: integer.describe('Number of nearest neighbors to return as top hits.'),
  num_candidates: integer.describe('Number of nearest neighbor candidates to consider per shard.'),
  visit_percentage: float.describe('The percentage of vectors to explore per shard while doing knn search with bbq_disk').optional(),
  similarity: float.describe('The minimum similarity required for a document to be considered a match.').optional(),
  rescore_vector: RescoreVector.describe('Apply oversampling and rescoring to quantized vectors').optional()
}).meta({ id: 'KnnRetriever' })
export type KnnRetriever = z.infer<typeof KnnRetriever>

export interface RRFRetrieverComponentShape {
  retriever: RetrieverContainerShape
  weight?: float | undefined
}
/** Wraps a retriever with an optional weight for RRF scoring. */
export const RRFRetrieverComponent = z.object({
  get retriever () { return RetrieverContainer.describe('The nested retriever configuration.') },
  weight: float.describe('Weight multiplier for this retriever\'s contribution to the RRF score. Higher values increase influence. Defaults to 1.0 if not specified. Must be non-negative.').optional()
}).meta({ id: 'RRFRetrieverComponent' })
export type RRFRetrieverComponent = z.infer<typeof RRFRetrieverComponent>

export type RRFRetrieverEntryShape = RetrieverContainerShape | RRFRetrieverComponentShape
/** Either a direct RetrieverContainer (backward compatible) or an RRFRetrieverComponent with weight. */
export const RRFRetrieverEntry: z.ZodType<RRFRetrieverEntryShape> = z.union([z.lazy(() => RetrieverContainer), z.lazy(() => RRFRetrieverComponent)]).meta({ id: 'RRFRetrieverEntry' })
export type RRFRetrieverEntry = z.infer<typeof RRFRetrieverEntry>

export interface RRFRetrieverShape {
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  min_score?: float | undefined
  _name?: string | undefined
  retrievers: RRFRetrieverEntryShape[]
  rank_constant?: integer | undefined
  rank_window_size?: integer | undefined
  query?: string | undefined
  fields?: string[] | undefined
}
export const RRFRetriever = z.object({
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Query to filter the documents that can match.').optional() },
  min_score: float.describe('Minimum _score for matching documents. Documents with a lower _score are not included in the top documents.').optional(),
  _name: z.string().describe('Retriever name.').optional(),
  get retrievers () { return RRFRetrieverEntry.array().describe('A list of child retrievers to specify which sets of returned top documents will have the RRF formula applied to them. Each retriever can optionally include a weight parameter.') },
  rank_constant: integer.describe('This value determines how much influence documents in individual result sets per query have over the final ranked result set.').optional(),
  rank_window_size: integer.describe('This value determines the size of the individual result sets per query.').optional(),
  query: z.string().optional(),
  fields: z.array(z.string()).optional()
}).meta({ id: 'RRFRetriever' })
export type RRFRetriever = z.infer<typeof RRFRetriever>

export const MappingChunkRescorerChunkingSettings = z.object({
  max_chunk_size: integer.describe('The maximum size of a chunk in words. This value cannot be lower than `20` (for `sentence` strategy) or `10` (for `word` strategy). This value should not exceed the window size for the associated model.'),
  overlap: integer.describe('The number of overlapping words for chunks. It is applicable only to a `word` chunking strategy. This value cannot be higher than half the `max_chunk_size` value.').optional(),
  sentence_overlap: integer.describe('The number of overlapping sentences for chunks. It is applicable only for a `sentence` chunking strategy. It can be either `1` or `0`.').optional(),
  separator_group: z.string().describe('Only applicable to the `recursive` strategy and required when using it. Sets a predefined list of separators in the saved chunking settings based on the selected text type. Values can be `markdown` or `plaintext`. Using this parameter is an alternative to manually specifying a custom `separators` list.').optional(),
  separators: z.array(z.string()).describe('Only applicable to the `recursive` strategy and required when using it. A list of strings used as possible split points when chunking text. Each string can be a plain string or a regular expression (regex) pattern. The system tries each separator in order to split the text, starting from the first item in the list. After splitting, it attempts to recombine smaller pieces into larger chunks that stay within the `max_chunk_size` limit, to reduce the total number of chunks generated.').optional(),
  strategy: z.string().describe('The chunking strategy: `sentence`, `word`, `none` or `recursive`.  * If `strategy` is set to `recursive`, you must also specify: - `max_chunk_size` - either `separators` or`separator_group` Learn more about different chunking strategies in the linked documentation.').optional()
}).meta({ id: 'MappingChunkRescorerChunkingSettings' })
export type MappingChunkRescorerChunkingSettings = z.infer<typeof MappingChunkRescorerChunkingSettings>

export const ChunkRescorer = z.object({
  size: integer.describe('The number of chunks per document to evaluate for reranking.').optional(),
  chunking_settings: MappingChunkRescorerChunkingSettings.describe('Chunking settings to apply').optional()
}).meta({ id: 'ChunkRescorer' })
export type ChunkRescorer = z.infer<typeof ChunkRescorer>

export interface TextSimilarityRerankerShape {
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  min_score?: float | undefined
  _name?: string | undefined
  retriever: RetrieverContainerShape
  rank_window_size?: integer | undefined
  inference_id?: string | undefined
  inference_text: string
  field: string
  chunk_rescorer?: ChunkRescorer | undefined
}
export const TextSimilarityReranker = z.object({
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Query to filter the documents that can match.').optional() },
  min_score: float.describe('Minimum _score for matching documents. Documents with a lower _score are not included in the top documents.').optional(),
  _name: z.string().describe('Retriever name.').optional(),
  get retriever () { return RetrieverContainer.describe('The nested retriever which will produce the first-level results, that will later be used for reranking.') },
  rank_window_size: integer.describe('This value determines how many documents we will consider from the nested retriever.').optional(),
  inference_id: z.string().describe('Unique identifier of the inference endpoint created using the inference API.').optional(),
  inference_text: z.string().describe('The text snippet used as the basis for similarity comparison.'),
  field: z.string().describe('The document field to be used for text similarity comparisons. This field should contain the text that will be evaluated against the inference_text.'),
  chunk_rescorer: ChunkRescorer.describe('Whether to rescore on only the best matching chunks.').optional()
}).meta({ id: 'TextSimilarityReranker' })
export type TextSimilarityReranker = z.infer<typeof TextSimilarityReranker>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export interface RuleRetrieverShape {
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  min_score?: float | undefined
  _name?: string | undefined
  ruleset_ids: Id | Id[]
  match_criteria: unknown
  retriever: RetrieverContainerShape
  rank_window_size?: integer | undefined
}
export const RuleRetriever = z.object({
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Query to filter the documents that can match.').optional() },
  min_score: float.describe('Minimum _score for matching documents. Documents with a lower _score are not included in the top documents.').optional(),
  _name: z.string().describe('Retriever name.').optional(),
  ruleset_ids: z.union([Id, z.array(Id)]).describe('The ruleset IDs containing the rules this retriever is evaluating against.'),
  match_criteria: z.any().describe('The match criteria that will determine if a rule in the provided rulesets should be applied.'),
  get retriever () { return RetrieverContainer.describe('The retriever whose results rules should be applied to.') },
  rank_window_size: integer.describe('This value determines the size of the individual result set.').optional()
}).meta({ id: 'RuleRetriever' })
export type RuleRetriever = z.infer<typeof RuleRetriever>

export interface RescorerRetrieverShape {
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  min_score?: float | undefined
  _name?: string | undefined
  retriever: RetrieverContainerShape
  rescore: SearchRescoreShape | SearchRescoreShape[]
}
export const RescorerRetriever = z.object({
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Query to filter the documents that can match.').optional() },
  min_score: float.describe('Minimum _score for matching documents. Documents with a lower _score are not included in the top documents.').optional(),
  _name: z.string().describe('Retriever name.').optional(),
  get retriever () { return RetrieverContainer.describe('Inner retriever.') },
  get rescore (): z.ZodUnion<readonly [typeof SearchRescore, z.ZodArray<typeof SearchRescore>]> { return z.union([SearchRescore, SearchRescore.array()]) }
}).meta({ id: 'RescorerRetriever' })
export type RescorerRetriever = z.infer<typeof RescorerRetriever>

export const ScoreNormalizer = z.enum(['none', 'minmax', 'l2_norm']).meta({ id: 'ScoreNormalizer' })
export type ScoreNormalizer = z.infer<typeof ScoreNormalizer>

export interface InnerRetrieverShape {
  retriever: RetrieverContainerShape
  weight: float
  normalizer: ScoreNormalizer
}
export const InnerRetriever = z.object({
  get retriever () { return RetrieverContainer },
  weight: float,
  normalizer: ScoreNormalizer
}).meta({ id: 'InnerRetriever' })
export type InnerRetriever = z.infer<typeof InnerRetriever>

export interface LinearRetrieverShape {
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  min_score?: float | undefined
  _name?: string | undefined
  retrievers?: InnerRetrieverShape[] | undefined
  rank_window_size?: integer | undefined
  query?: string | undefined
  fields?: string[] | undefined
  normalizer?: ScoreNormalizer | undefined
}
export const LinearRetriever = z.object({
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Query to filter the documents that can match.').optional() },
  min_score: float.describe('Minimum _score for matching documents. Documents with a lower _score are not included in the top documents.').optional(),
  _name: z.string().describe('Retriever name.').optional(),
  get retrievers () { return InnerRetriever.array().describe('Inner retrievers.').optional() },
  rank_window_size: integer.optional(),
  query: z.string().optional(),
  fields: z.array(z.string()).optional(),
  normalizer: ScoreNormalizer.optional()
}).meta({ id: 'LinearRetriever' })
export type LinearRetriever = z.infer<typeof LinearRetriever>

export const SpecifiedDocument = z.object({
  index: IndexName.optional(),
  id: Id
}).meta({ id: 'SpecifiedDocument' })
export type SpecifiedDocument = z.infer<typeof SpecifiedDocument>

export interface PinnedRetrieverShape {
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  min_score?: float | undefined
  _name?: string | undefined
  retriever: RetrieverContainerShape
  ids?: string[] | undefined
  docs?: SpecifiedDocument[] | undefined
  rank_window_size?: integer | undefined
}
export const PinnedRetriever = z.object({
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Query to filter the documents that can match.').optional() },
  min_score: float.describe('Minimum _score for matching documents. Documents with a lower _score are not included in the top documents.').optional(),
  _name: z.string().describe('Retriever name.').optional(),
  get retriever () { return RetrieverContainer.describe('Inner retriever.') },
  ids: z.array(z.string()).optional(),
  docs: z.array(SpecifiedDocument).optional(),
  rank_window_size: integer.optional()
}).meta({ id: 'PinnedRetriever' })
export type PinnedRetriever = z.infer<typeof PinnedRetriever>

export const DiversifyRetrieverTypes = z.enum(['mmr']).meta({ id: 'DiversifyRetrieverTypes' })
export type DiversifyRetrieverTypes = z.infer<typeof DiversifyRetrieverTypes>

export interface DiversifyRetrieverShape {
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  min_score?: float | undefined
  _name?: string | undefined
  type: DiversifyRetrieverTypes
  field: string
  retriever: RetrieverContainerShape
  size?: integer | undefined
  rank_window_size?: integer | undefined
  query_vector?: QueryVector | undefined
  query_vector_builder?: QueryVectorBuilder | undefined
  lambda?: float | undefined
}
export const DiversifyRetriever = z.object({
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Query to filter the documents that can match.').optional() },
  min_score: float.describe('Minimum _score for matching documents. Documents with a lower _score are not included in the top documents.').optional(),
  _name: z.string().describe('Retriever name.').optional(),
  type: DiversifyRetrieverTypes.describe('The diversification strategy to apply.'),
  field: z.string().describe('The document field on which to diversify results on.'),
  get retriever () { return RetrieverContainer.describe('The nested retriever whose results will be diversified.') },
  size: integer.describe('The number of top documents to return after diversification.').optional(),
  rank_window_size: integer.describe('The number of top documents from the nested retriever to consider for diversification.').optional(),
  query_vector: QueryVector.describe('The query vector used for diversification.').optional(),
  query_vector_builder: QueryVectorBuilder.describe('a dense vector query vector builder to use instead of a static query_vector').optional(),
  lambda: float.describe('Controls the trade-off between relevance and diversity for MMR. A value of 0.0 focuses solely on diversity, while a value of 1.0 focuses solely on relevance. Required for MMR').optional()
}).meta({ id: 'DiversifyRetriever' })
export type DiversifyRetriever = z.infer<typeof DiversifyRetriever>

const RetrieverContainerExclusiveProps = z.union([z.object({ standard: z.lazy(() => StandardRetriever) }), z.object({ knn: z.lazy(() => KnnRetriever) }), z.object({ rrf: z.lazy(() => RRFRetriever) }), z.object({ text_similarity_reranker: z.lazy(() => TextSimilarityReranker) }), z.object({ rule: z.lazy(() => RuleRetriever) }), z.object({ rescorer: z.lazy(() => RescorerRetriever) }), z.object({ linear: z.lazy(() => LinearRetriever) }), z.object({ pinned: z.lazy(() => PinnedRetriever) }), z.object({ diversify: z.lazy(() => DiversifyRetriever) })])

export interface RetrieverContainerShape {
  standard?: StandardRetriever | undefined
  knn?: KnnRetriever | undefined
  rrf?: RRFRetriever | undefined
  text_similarity_reranker?: TextSimilarityReranker | undefined
  rule?: RuleRetriever | undefined
  rescorer?: RescorerRetriever | undefined
  linear?: LinearRetriever | undefined
  pinned?: PinnedRetriever | undefined
  diversify?: DiversifyRetriever | undefined
}
export const RetrieverContainer: z.ZodType<RetrieverContainerShape> = RetrieverContainerExclusiveProps.meta({ id: 'RetrieverContainer' })
export type RetrieverContainer = z.infer<typeof RetrieverContainer>

export const SlicedScroll = z.object({
  field: Field.optional(),
  id: Id,
  max: integer
}).meta({ id: 'SlicedScroll' })
export type SlicedScroll = z.infer<typeof SlicedScroll>

export const SearchSuggester = z.object({
  text: z.string().describe('Global suggest text, to avoid repetition when the same text is used in several suggesters').optional()
}).catchall(z.any()).meta({ id: 'SearchSuggester' })
export type SearchSuggester = z.infer<typeof SearchSuggester>

export const SearchPointInTimeReference = z.object({
  id: Id,
  keep_alive: Duration.optional()
}).meta({ id: 'SearchPointInTimeReference' })
export type SearchPointInTimeReference = z.infer<typeof SearchPointInTimeReference>

export const MappingRuntimeFieldType = z.enum(['boolean', 'composite', 'date', 'double', 'geo_point', 'geo_shape', 'ip', 'keyword', 'long', 'lookup']).meta({ id: 'MappingRuntimeFieldType' })
export type MappingRuntimeFieldType = z.infer<typeof MappingRuntimeFieldType>

export const MappingCompositeSubField = z.object({
  type: MappingRuntimeFieldType
}).meta({ id: 'MappingCompositeSubField' })
export type MappingCompositeSubField = z.infer<typeof MappingCompositeSubField>

export const MappingRuntimeFieldFetchFields = z.object({
  field: Field,
  format: z.string().optional()
}).meta({ id: 'MappingRuntimeFieldFetchFields' })
export type MappingRuntimeFieldFetchFields = z.infer<typeof MappingRuntimeFieldFetchFields>

export interface MappingRuntimeFieldShape {
  fields?: Record<string, MappingCompositeSubField> | undefined
  fetch_fields?: MappingRuntimeFieldFetchFields[] | undefined
  format?: string | undefined
  input_field?: Field | undefined
  target_field?: Field | undefined
  target_index?: IndexName | undefined
  script?: ScriptShape | undefined
  type: MappingRuntimeFieldType
}
export const MappingRuntimeField = z.object({
  fields: z.record(z.string(), MappingCompositeSubField).describe('For type `composite`').optional(),
  fetch_fields: z.array(MappingRuntimeFieldFetchFields).describe('For type `lookup`').optional(),
  format: z.string().describe('A custom format for `date` type runtime fields.').optional(),
  input_field: Field.describe('For type `lookup`').optional(),
  target_field: Field.describe('For type `lookup`').optional(),
  target_index: IndexName.describe('For type `lookup`').optional(),
  get script () { return Script.describe('Painless script executed at query time.').optional() },
  type: MappingRuntimeFieldType.describe('Field type, which can be: `boolean`, `composite`, `date`, `double`, `geo_point`, `ip`,`keyword`, `long`, or `lookup`.')
}).meta({ id: 'MappingRuntimeField' })
export type MappingRuntimeField = z.infer<typeof MappingRuntimeField>

export type MappingRuntimeFieldsShape = Record<Field, MappingRuntimeFieldShape>
export const MappingRuntimeFields: z.ZodType<MappingRuntimeFieldsShape> = z.record(Field, z.lazy(() => MappingRuntimeField)).meta({ id: 'MappingRuntimeFields' })
export type MappingRuntimeFields = z.infer<typeof MappingRuntimeFields>

export interface SearchSearchRequestBodyShape {
  aggregations?: Record<string, AggregationsAggregationContainerShape> | undefined
  collapse?: SearchFieldCollapseShape | undefined
  explain?: boolean | undefined
  ext?: Record<string, unknown> | undefined
  from?: integer | undefined
  highlight?: SearchHighlightShape | undefined
  track_total_hits?: SearchTrackHits | undefined
  indices_boost?: Array<Record<IndexName, double>> | undefined
  docvalue_fields?: QueryDslFieldAndFormat[] | undefined
  knn?: KnnSearchShape | KnnSearchShape[] | undefined
  min_score?: double | undefined
  post_filter?: QueryDslQueryContainerShape | undefined
  profile?: boolean | undefined
  query?: QueryDslQueryContainerShape | undefined
  rescore?: SearchRescoreShape | SearchRescoreShape[] | undefined
  retriever?: RetrieverContainerShape | undefined
  script_fields?: Record<string, ScriptFieldShape> | undefined
  search_after?: SortResults | undefined
  size?: integer | undefined
  slice?: SlicedScroll | undefined
  sort?: SortShape | undefined
  _source?: SearchSourceConfig | undefined
  fields?: QueryDslFieldAndFormat[] | undefined
  suggest?: SearchSuggester | undefined
  terminate_after?: long | undefined
  timeout?: string | undefined
  track_scores?: boolean | undefined
  version?: boolean | undefined
  seq_no_primary_term?: boolean | undefined
  stored_fields?: Fields | undefined
  pit?: SearchPointInTimeReference | undefined
  runtime_mappings?: MappingRuntimeFieldsShape | undefined
  stats?: string[] | undefined
}
export const SearchSearchRequestBody = z.object({
  get aggregations (): z.ZodOptional<z.ZodRecord<z.ZodString, typeof AggregationsAggregationContainer>> { return z.record(z.string(), AggregationsAggregationContainer).describe('Defines the aggregations that are run as part of the search request.').optional() },
  get collapse () { return SearchFieldCollapse.describe('Collapses search results the values of the specified field.').optional() },
  explain: z.boolean().describe('If `true`, the request returns detailed information about score computation as part of a hit.').optional(),
  ext: z.record(z.string(), z.any()).describe('Configuration of search extensions defined by Elasticsearch plugins.').optional(),
  from: integer.describe('The starting document offset, which must be non-negative. By default, you cannot page through more than 10,000 hits using the `from` and `size` parameters. To page through more hits, use the `search_after` parameter.').optional(),
  get highlight () { return SearchHighlight.describe('Specifies the highlighter to use for retrieving highlighted snippets from one or more fields in your search results.').optional() },
  track_total_hits: SearchTrackHits.describe('Number of hits matching the query to count accurately. If `true`, the exact number of hits is returned at the cost of some performance. If `false`, the  response does not include the total number of hits matching the query.').optional(),
  indices_boost: z.array(z.record(IndexName, double)).describe('Boost the `_score` of documents from specified indices. The boost value is the factor by which scores are multiplied. A boost value greater than `1.0` increases the score. A boost value between `0` and `1.0` decreases the score.').optional(),
  docvalue_fields: z.array(QueryDslFieldAndFormat).describe('An array of wildcard (`*`) field patterns. The request returns doc values for field names matching these patterns in the `hits.fields` property of the response.').optional(),
  get knn (): z.ZodOptional<z.ZodUnion<readonly [typeof KnnSearch, z.ZodArray<typeof KnnSearch>]>> { return z.union([KnnSearch, KnnSearch.array()]).describe('The approximate kNN search to run.').optional() },
  min_score: double.describe('The minimum `_score` for matching documents. Documents with a lower `_score` are not included in search results or results collected by aggregations.').optional(),
  get post_filter () { return QueryDslQueryContainer.describe('Use the `post_filter` parameter to filter search results. The search hits are filtered after the aggregations are calculated. A post filter has no impact on the aggregation results.').optional() },
  profile: z.boolean().describe('Set to `true` to return detailed timing information about the execution of individual components in a search request. NOTE: This is a debugging tool and adds significant overhead to search execution.').optional(),
  get query () { return QueryDslQueryContainer.describe('The search definition using the Query DSL.').optional() },
  get rescore (): z.ZodOptional<z.ZodUnion<readonly [typeof SearchRescore, z.ZodArray<typeof SearchRescore>]>> { return z.union([SearchRescore, SearchRescore.array()]).describe('Can be used to improve precision by reordering just the top (for example 100 - 500) documents returned by the `query` and `post_filter` phases.').optional() },
  get retriever () { return RetrieverContainer.describe('A retriever is a specification to describe top documents returned from a search. A retriever replaces other elements of the search API that also return top documents such as `query` and `knn`.').optional() },
  get script_fields (): z.ZodOptional<z.ZodRecord<z.ZodString, typeof ScriptField>> { return z.record(z.string(), ScriptField).describe('Retrieve a script evaluation (based on different fields) for each hit.').optional() },
  search_after: SortResults.describe('Used to retrieve the next page of hits using a set of sort values from the previous page.').optional(),
  size: integer.describe('The number of hits to return, which must not be negative. By default, you cannot page through more than 10,000 hits using the `from` and `size` parameters. To page through more hits, use the `search_after` property.').optional(),
  slice: SlicedScroll.describe('Split a scrolled search into multiple slices that can be consumed independently.').optional(),
  get sort () { return Sort.describe('A comma-separated list of <field>:<direction> pairs.').optional() },
  _source: SearchSourceConfig.describe('The source fields that are returned for matching documents. These fields are returned in the `hits._source` property of the search response. If the `stored_fields` property is specified, the `_source` property defaults to `false`. Otherwise, it defaults to `true`.').optional(),
  fields: z.array(QueryDslFieldAndFormat).describe('An array of wildcard (`*`) field patterns. The request returns values for field names matching these patterns in the `hits.fields` property of the response.').optional(),
  suggest: SearchSuggester.describe('Defines a suggester that provides similar looking terms based on a provided text.').optional(),
  terminate_after: long.describe('The maximum number of documents to collect for each shard. If a query reaches this limit, Elasticsearch terminates the query early. Elasticsearch collects documents before sorting. IMPORTANT: Use with caution. Elasticsearch applies this property to each shard handling the request. When possible, let Elasticsearch perform early termination automatically. Avoid specifying this property for requests that target data streams with backing indices across multiple data tiers. If set to `0` (default), the query does not terminate early.').optional(),
  timeout: z.string().describe('The period of time to wait for a response from each shard. If no response is received before the timeout expires, the request fails and returns an error. Defaults to no timeout.').optional(),
  track_scores: z.boolean().describe('If `true`, calculate and return document scores, even if the scores are not used for sorting.').optional(),
  version: z.boolean().describe('If `true`, the request returns the document version as part of a hit.').optional(),
  seq_no_primary_term: z.boolean().describe('If `true`, the request returns sequence number and primary term of the last modification of each hit.').optional(),
  stored_fields: Fields.describe('A comma-separated list of stored fields to return as part of a hit. If no fields are specified, no stored fields are included in the response. If this field is specified, the `_source` property defaults to `false`. You can pass `_source: true` to return both source fields and stored fields in the search response.').optional(),
  pit: SearchPointInTimeReference.describe('Limit the search to a point in time (PIT). If you provide a PIT, you cannot specify an `<index>` in the request path.').optional(),
  get runtime_mappings () { return MappingRuntimeFields.describe('One or more runtime fields in the search request. These fields take precedence over mapped fields with the same name.').optional() },
  stats: z.array(z.string()).describe('The stats groups to associate with the search. Each group maintains a statistics aggregation for its associated searches. You can retrieve these stats using the indices stats API.').optional()
}).meta({ id: 'SearchSearchRequestBody' })
export type SearchSearchRequestBody = z.infer<typeof SearchSearchRequestBody>

export type ScriptSourceShape = string | SearchSearchRequestBodyShape
export const ScriptSource: z.ZodType<ScriptSourceShape> = z.union([z.string(), z.lazy(() => SearchSearchRequestBody)]).meta({ id: 'ScriptSource' })
export type ScriptSource = z.infer<typeof ScriptSource>

export const ScriptLanguage = z.union([z.enum(['painless', 'expression', 'mustache', 'java']), z.string()]).meta({ id: 'ScriptLanguage' })
export type ScriptLanguage = z.infer<typeof ScriptLanguage>

export interface ScriptShape {
  source?: ScriptSourceShape | undefined
  id?: Id | undefined
  params?: Record<string, unknown> | undefined
  lang?: ScriptLanguage | undefined
  options?: Record<string, string> | undefined
}
export const Script = z.object({
  get source () { return ScriptSource.describe('The script source.').optional() },
  id: Id.describe('The `id` for a stored script.').optional(),
  params: z.record(z.string(), z.any()).describe('Specifies any named parameters that are passed into the script as variables. Use parameters instead of hard-coded values to decrease compile time.').optional(),
  lang: ScriptLanguage.describe('Specifies the language the script is written in.').optional(),
  options: z.record(z.string(), z.string()).optional()
}).meta({ id: 'Script' })
export type Script = z.infer<typeof Script>

export interface QueryDslScriptScoreFunctionShape {
  script: ScriptShape
}
export const QueryDslScriptScoreFunction = z.object({
  get script () { return Script.describe('A script that computes a score.') }
}).meta({ id: 'QueryDslScriptScoreFunction' })
export type QueryDslScriptScoreFunction = z.infer<typeof QueryDslScriptScoreFunction>

const QueryDslFunctionScoreContainerCommonProps = z.object({
  filter: z.lazy(() => QueryDslQueryContainer).optional(),
  weight: double.optional()
})

const QueryDslFunctionScoreContainerExclusiveProps = z.union([z.object({ exp: QueryDslDecayFunction }), z.object({ gauss: QueryDslDecayFunction }), z.object({ linear: QueryDslDecayFunction }), z.object({ field_value_factor: QueryDslFieldValueFactorScoreFunction }), z.object({ random_score: QueryDslRandomScoreFunction }), z.object({ script_score: z.lazy(() => QueryDslScriptScoreFunction) })])

export interface QueryDslFunctionScoreContainerShape {
  filter?: QueryDslQueryContainerShape | undefined
  weight?: double | undefined
  exp?: QueryDslDecayFunction | undefined
  gauss?: QueryDslDecayFunction | undefined
  linear?: QueryDslDecayFunction | undefined
  field_value_factor?: QueryDslFieldValueFactorScoreFunction | undefined
  random_score?: QueryDslRandomScoreFunction | undefined
  script_score?: QueryDslScriptScoreFunction | undefined
}
export const QueryDslFunctionScoreContainer: z.ZodType<QueryDslFunctionScoreContainerShape> = QueryDslFunctionScoreContainerCommonProps.and(QueryDslFunctionScoreContainerExclusiveProps).meta({ id: 'QueryDslFunctionScoreContainer' })
export type QueryDslFunctionScoreContainer = z.infer<typeof QueryDslFunctionScoreContainer>

export const QueryDslFunctionScoreMode = z.enum(['multiply', 'sum', 'avg', 'first', 'max', 'min']).meta({ id: 'QueryDslFunctionScoreMode' })
export type QueryDslFunctionScoreMode = z.infer<typeof QueryDslFunctionScoreMode>

export interface QueryDslFunctionScoreQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  boost_mode?: QueryDslFunctionBoostMode | undefined
  functions?: QueryDslFunctionScoreContainerShape[] | undefined
  max_boost?: double | undefined
  min_score?: double | undefined
  query?: QueryDslQueryContainerShape | undefined
  score_mode?: QueryDslFunctionScoreMode | undefined
}
export const QueryDslFunctionScoreQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  boost_mode: QueryDslFunctionBoostMode.describe('Defines how he newly computed score is combined with the score of the query').optional(),
  get functions () { return QueryDslFunctionScoreContainer.array().describe('One or more functions that compute a new score for each document returned by the query.').optional() },
  max_boost: double.describe('Restricts the new score to not exceed the provided limit.').optional(),
  min_score: double.describe('Excludes documents that do not meet the provided score threshold.').optional(),
  get query () { return QueryDslQueryContainer.describe('A query that determines the documents for which a new score is computed.').optional() },
  score_mode: QueryDslFunctionScoreMode.describe('Specifies how the computed scores are combined').optional()
}).meta({ id: 'QueryDslFunctionScoreQuery' })
export type QueryDslFunctionScoreQuery = z.infer<typeof QueryDslFunctionScoreQuery>

export const MultiTermQueryRewrite = z.string().meta({ id: 'MultiTermQueryRewrite' })
export type MultiTermQueryRewrite = z.infer<typeof MultiTermQueryRewrite>

export const Fuzziness = z.union([z.string(), integer]).meta({ id: 'Fuzziness' })
export type Fuzziness = z.infer<typeof Fuzziness>

export const QueryDslFuzzyQuery = z.object({
  ...QueryDslQueryBase.shape,
  max_expansions: integer.describe('Maximum number of variations created.').optional(),
  prefix_length: integer.describe('Number of beginning characters left unchanged when creating expansions.').optional(),
  rewrite: MultiTermQueryRewrite.describe('Number of beginning characters left unchanged when creating expansions.').optional(),
  transpositions: z.boolean().describe('Indicates whether edits include transpositions of two adjacent characters (for example `ab` to `ba`).').optional(),
  fuzziness: Fuzziness.describe('Maximum edit distance allowed for matching.').optional(),
  value: z.union([z.string(), double, z.boolean()]).describe('Term you wish to find in the provided field.')
}).meta({ id: 'QueryDslFuzzyQuery' })
export type QueryDslFuzzyQuery = z.infer<typeof QueryDslFuzzyQuery>

export const QueryDslGeoExecution = z.enum(['memory', 'indexed']).meta({ id: 'QueryDslGeoExecution' })
export type QueryDslGeoExecution = z.infer<typeof QueryDslGeoExecution>

export const QueryDslGeoValidationMethod = z.enum(['coerce', 'ignore_malformed', 'strict']).meta({ id: 'QueryDslGeoValidationMethod' })
export type QueryDslGeoValidationMethod = z.infer<typeof QueryDslGeoValidationMethod>

export const QueryDslGeoBoundingBoxQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  type: QueryDslGeoExecution.optional(),
  validation_method: QueryDslGeoValidationMethod.describe('Set to `IGNORE_MALFORMED` to accept geo points with invalid latitude or longitude. Set to `COERCE` to also try to infer correct latitude or longitude.').optional(),
  ignore_unmapped: z.boolean().describe('Set to `true` to ignore an unmapped field and not match any documents for this query. Set to `false` to throw an exception if the field is not mapped.').optional()
}).catchall(z.any()).meta({ id: 'QueryDslGeoBoundingBoxQuery' })
export type QueryDslGeoBoundingBoxQuery = z.infer<typeof QueryDslGeoBoundingBoxQuery>

export const Distance = z.string().meta({ id: 'Distance' })
export type Distance = z.infer<typeof Distance>

export const QueryDslGeoDistanceQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  distance: Distance.describe('The radius of the circle centred on the specified location. Points which fall into this circle are considered to be matches.'),
  distance_type: GeoDistanceType.describe('How to compute the distance. Set to `plane` for a faster calculation that\'s inaccurate on long distances and close to the poles.').optional(),
  validation_method: QueryDslGeoValidationMethod.describe('Set to `IGNORE_MALFORMED` to accept geo points with invalid latitude or longitude. Set to `COERCE` to also try to infer correct latitude or longitude.').optional(),
  ignore_unmapped: z.boolean().describe('Set to `true` to ignore an unmapped field and not match any documents for this query. Set to `false` to throw an exception if the field is not mapped.').optional()
}).catchall(z.any()).meta({ id: 'QueryDslGeoDistanceQuery' })
export type QueryDslGeoDistanceQuery = z.infer<typeof QueryDslGeoDistanceQuery>

/** A map tile reference, represented as `{zoom}/{x}/{y}` */
export const GeoTile = z.string().meta({ id: 'GeoTile' })
export type GeoTile = z.infer<typeof GeoTile>

/** A map hex cell (H3) reference */
export const GeoHexCell = z.string().meta({ id: 'GeoHexCell' })
export type GeoHexCell = z.infer<typeof GeoHexCell>

const QueryDslGeoGridQueryExclusiveProps = z.union([z.object({ geotile: GeoTile }), z.object({ geohash: GeoHash }), z.object({ geohex: GeoHexCell })])

export const QueryDslGeoGridQuery = QueryDslGeoGridQueryExclusiveProps.meta({ id: 'QueryDslGeoGridQuery' })
export type QueryDslGeoGridQuery = z.infer<typeof QueryDslGeoGridQuery>

export const QueryDslGeoPolygonQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  validation_method: QueryDslGeoValidationMethod.optional(),
  ignore_unmapped: z.boolean().optional()
}).catchall(z.any()).meta({ id: 'QueryDslGeoPolygonQuery' })
export type QueryDslGeoPolygonQuery = z.infer<typeof QueryDslGeoPolygonQuery>

export const QueryDslGeoShapeQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  ignore_unmapped: z.boolean().describe('Set to `true` to ignore an unmapped field and not match any documents for this query. Set to `false` to throw an exception if the field is not mapped.').optional()
}).catchall(z.any()).meta({ id: 'QueryDslGeoShapeQuery' })
export type QueryDslGeoShapeQuery = z.infer<typeof QueryDslGeoShapeQuery>

export const QueryDslChildScoreMode = z.enum(['none', 'avg', 'sum', 'max', 'min']).meta({ id: 'QueryDslChildScoreMode' })
export type QueryDslChildScoreMode = z.infer<typeof QueryDslChildScoreMode>

export interface QueryDslHasChildQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  ignore_unmapped?: boolean | undefined
  inner_hits?: SearchInnerHitsShape | undefined
  max_children?: integer | undefined
  min_children?: integer | undefined
  query: QueryDslQueryContainerShape
  score_mode?: QueryDslChildScoreMode | undefined
  type: RelationName
}
export const QueryDslHasChildQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  ignore_unmapped: z.boolean().describe('Indicates whether to ignore an unmapped `type` and not return any documents instead of an error.').optional(),
  get inner_hits () { return SearchInnerHits.describe('If defined, each search hit will contain inner hits.').optional() },
  max_children: integer.describe('Maximum number of child documents that match the query allowed for a returned parent document. If the parent document exceeds this limit, it is excluded from the search results.').optional(),
  min_children: integer.describe('Minimum number of child documents that match the query required to match the query for a returned parent document. If the parent document does not meet this limit, it is excluded from the search results.').optional(),
  get query () { return QueryDslQueryContainer.describe('Query you wish to run on child documents of the `type` field. If a child document matches the search, the query returns the parent document.') },
  score_mode: QueryDslChildScoreMode.describe('Indicates how scores for matching child documents affect the root parent document’s relevance score.').optional(),
  type: RelationName.describe('Name of the child relationship mapped for the `join` field.')
}).meta({ id: 'QueryDslHasChildQuery' })
export type QueryDslHasChildQuery = z.infer<typeof QueryDslHasChildQuery>

export interface QueryDslHasParentQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  ignore_unmapped?: boolean | undefined
  inner_hits?: SearchInnerHitsShape | undefined
  parent_type: RelationName
  query: QueryDslQueryContainerShape
  score?: boolean | undefined
}
export const QueryDslHasParentQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  ignore_unmapped: z.boolean().describe('Indicates whether to ignore an unmapped `parent_type` and not return any documents instead of an error. You can use this parameter to query multiple indices that may not contain the `parent_type`.').optional(),
  get inner_hits () { return SearchInnerHits.describe('If defined, each search hit will contain inner hits.').optional() },
  parent_type: RelationName.describe('Name of the parent relationship mapped for the `join` field.'),
  get query () { return QueryDslQueryContainer.describe('Query you wish to run on parent documents of the `parent_type` field. If a parent document matches the search, the query returns its child documents.') },
  score: z.boolean().describe('Indicates whether the relevance score of a matching parent document is aggregated into its child documents.').optional()
}).meta({ id: 'QueryDslHasParentQuery' })
export type QueryDslHasParentQuery = z.infer<typeof QueryDslHasParentQuery>

export const Ids = z.union([Id, z.array(Id)]).meta({ id: 'Ids' })
export type Ids = z.infer<typeof Ids>

export const QueryDslIdsQuery = z.object({
  ...QueryDslQueryBase.shape,
  values: Ids.describe('An array of document IDs.').optional()
}).meta({ id: 'QueryDslIdsQuery' })
export type QueryDslIdsQuery = z.infer<typeof QueryDslIdsQuery>

const QueryDslIntervalsFilterExclusiveProps = z.union([z.object({ after: z.lazy(() => QueryDslIntervalsContainer) }), z.object({ before: z.lazy(() => QueryDslIntervalsContainer) }), z.object({ contained_by: z.lazy(() => QueryDslIntervalsContainer) }), z.object({ containing: z.lazy(() => QueryDslIntervalsContainer) }), z.object({ not_contained_by: z.lazy(() => QueryDslIntervalsContainer) }), z.object({ not_containing: z.lazy(() => QueryDslIntervalsContainer) }), z.object({ not_overlapping: z.lazy(() => QueryDslIntervalsContainer) }), z.object({ overlapping: z.lazy(() => QueryDslIntervalsContainer) }), z.object({ script: z.lazy(() => Script) })])

export interface QueryDslIntervalsFilterShape {
  after?: QueryDslIntervalsContainer | undefined
  before?: QueryDslIntervalsContainer | undefined
  contained_by?: QueryDslIntervalsContainer | undefined
  containing?: QueryDslIntervalsContainer | undefined
  not_contained_by?: QueryDslIntervalsContainer | undefined
  not_containing?: QueryDslIntervalsContainer | undefined
  not_overlapping?: QueryDslIntervalsContainer | undefined
  overlapping?: QueryDslIntervalsContainer | undefined
  script?: Script | undefined
}
export const QueryDslIntervalsFilter: z.ZodType<QueryDslIntervalsFilterShape> = QueryDslIntervalsFilterExclusiveProps.meta({ id: 'QueryDslIntervalsFilter' })
export type QueryDslIntervalsFilter = z.infer<typeof QueryDslIntervalsFilter>

export interface QueryDslIntervalsAnyOfShape {
  intervals: QueryDslIntervalsContainerShape[]
  filter?: QueryDslIntervalsFilterShape | undefined
}
export const QueryDslIntervalsAnyOf = z.object({
  get intervals () { return QueryDslIntervalsContainer.array().describe('An array of rules to match.') },
  get filter () { return QueryDslIntervalsFilter.describe('Rule used to filter returned intervals.').optional() }
}).meta({ id: 'QueryDslIntervalsAnyOf' })
export type QueryDslIntervalsAnyOf = z.infer<typeof QueryDslIntervalsAnyOf>

export const QueryDslIntervalsFuzzy = z.object({
  analyzer: z.string().describe('Analyzer used to normalize the term.').optional(),
  fuzziness: Fuzziness.describe('Maximum edit distance allowed for matching.').optional(),
  prefix_length: integer.describe('Number of beginning characters left unchanged when creating expansions.').optional(),
  term: z.string().describe('The term to match.'),
  transpositions: z.boolean().describe('Indicates whether edits include transpositions of two adjacent characters (for example, `ab` to `ba`).').optional(),
  use_field: Field.describe('If specified, match intervals from this field rather than the top-level field. The `term` is normalized using the search analyzer from this field, unless `analyzer` is specified separately.').optional()
}).meta({ id: 'QueryDslIntervalsFuzzy' })
export type QueryDslIntervalsFuzzy = z.infer<typeof QueryDslIntervalsFuzzy>

export interface QueryDslIntervalsMatchShape {
  analyzer?: string | undefined
  max_gaps?: integer | undefined
  ordered?: boolean | undefined
  query: string
  use_field?: Field | undefined
  filter?: QueryDslIntervalsFilterShape | undefined
}
export const QueryDslIntervalsMatch = z.object({
  analyzer: z.string().describe('Analyzer used to analyze terms in the query.').optional(),
  max_gaps: integer.describe('Maximum number of positions between the matching terms. Terms further apart than this are not considered matches.').optional(),
  ordered: z.boolean().describe('If `true`, matching terms must appear in their specified order.').optional(),
  query: z.string().describe('Text you wish to find in the provided field.'),
  use_field: Field.describe('If specified, match intervals from this field rather than the top-level field. The `term` is normalized using the search analyzer from this field, unless `analyzer` is specified separately.').optional(),
  get filter () { return QueryDslIntervalsFilter.describe('An optional interval filter.').optional() }
}).meta({ id: 'QueryDslIntervalsMatch' })
export type QueryDslIntervalsMatch = z.infer<typeof QueryDslIntervalsMatch>

export const QueryDslIntervalsPrefix = z.object({
  analyzer: z.string().describe('Analyzer used to analyze the `prefix`.').optional(),
  prefix: z.string().describe('Beginning characters of terms you wish to find in the top-level field.'),
  use_field: Field.describe('If specified, match intervals from this field rather than the top-level field. The `prefix` is normalized using the search analyzer from this field, unless `analyzer` is specified separately.').optional()
}).meta({ id: 'QueryDslIntervalsPrefix' })
export type QueryDslIntervalsPrefix = z.infer<typeof QueryDslIntervalsPrefix>

export const QueryDslIntervalsRange = z.object({
  analyzer: z.string().describe('Analyzer used to analyze the `prefix`.').optional(),
  gte: z.string().describe('Lower term, either gte or gt must be provided.').optional(),
  gt: z.string().describe('Lower term, either gte or gt must be provided.').optional(),
  lte: z.string().describe('Upper term, either lte or lt must be provided.').optional(),
  lt: z.string().describe('Upper term, either lte or lt must be provided.').optional(),
  use_field: Field.describe('If specified, match intervals from this field rather than the top-level field. The `prefix` is normalized using the search analyzer from this field, unless `analyzer` is specified separately.').optional()
}).meta({ id: 'QueryDslIntervalsRange' })
export type QueryDslIntervalsRange = z.infer<typeof QueryDslIntervalsRange>

export const QueryDslIntervalsRegexp = z.object({
  analyzer: z.string().describe('Analyzer used to analyze the `prefix`.').optional(),
  pattern: z.string().describe('Regex pattern.'),
  use_field: Field.describe('If specified, match intervals from this field rather than the top-level field. The `prefix` is normalized using the search analyzer from this field, unless `analyzer` is specified separately.').optional()
}).meta({ id: 'QueryDslIntervalsRegexp' })
export type QueryDslIntervalsRegexp = z.infer<typeof QueryDslIntervalsRegexp>

export const QueryDslIntervalsWildcard = z.object({
  analyzer: z.string().describe('Analyzer used to analyze the `pattern`. Defaults to the top-level field\'s analyzer.').optional(),
  pattern: z.string().describe('Wildcard pattern used to find matching terms.'),
  use_field: Field.describe('If specified, match intervals from this field rather than the top-level field. The `pattern` is normalized using the search analyzer from this field, unless `analyzer` is specified separately.').optional()
}).meta({ id: 'QueryDslIntervalsWildcard' })
export type QueryDslIntervalsWildcard = z.infer<typeof QueryDslIntervalsWildcard>

const QueryDslIntervalsContainerExclusiveProps = z.union([z.object({ all_of: z.lazy(() => QueryDslIntervalsAllOf) }), z.object({ any_of: z.lazy(() => QueryDslIntervalsAnyOf) }), z.object({ fuzzy: QueryDslIntervalsFuzzy }), z.object({ match: z.lazy(() => QueryDslIntervalsMatch) }), z.object({ prefix: QueryDslIntervalsPrefix }), z.object({ range: QueryDslIntervalsRange }), z.object({ regexp: QueryDslIntervalsRegexp }), z.object({ wildcard: QueryDslIntervalsWildcard })])

export interface QueryDslIntervalsContainerShape {
  all_of?: QueryDslIntervalsAllOf | undefined
  any_of?: QueryDslIntervalsAnyOf | undefined
  fuzzy?: QueryDslIntervalsFuzzy | undefined
  match?: QueryDslIntervalsMatch | undefined
  prefix?: QueryDslIntervalsPrefix | undefined
  range?: QueryDslIntervalsRange | undefined
  regexp?: QueryDslIntervalsRegexp | undefined
  wildcard?: QueryDslIntervalsWildcard | undefined
}
export const QueryDslIntervalsContainer: z.ZodType<QueryDslIntervalsContainerShape> = QueryDslIntervalsContainerExclusiveProps.meta({ id: 'QueryDslIntervalsContainer' })
export type QueryDslIntervalsContainer = z.infer<typeof QueryDslIntervalsContainer>

export interface QueryDslIntervalsAllOfShape {
  intervals: QueryDslIntervalsContainerShape[]
  max_gaps?: integer | undefined
  ordered?: boolean | undefined
  filter?: QueryDslIntervalsFilterShape | undefined
}
export const QueryDslIntervalsAllOf = z.object({
  get intervals () { return QueryDslIntervalsContainer.array().describe('An array of rules to combine. All rules must produce a match in a document for the overall source to match.') },
  max_gaps: integer.describe('Maximum number of positions between the matching terms. Intervals produced by the rules further apart than this are not considered matches.').optional(),
  ordered: z.boolean().describe('If `true`, intervals produced by the rules should appear in the order in which they are specified.').optional(),
  get filter () { return QueryDslIntervalsFilter.describe('Rule used to filter returned intervals.').optional() }
}).meta({ id: 'QueryDslIntervalsAllOf' })
export type QueryDslIntervalsAllOf = z.infer<typeof QueryDslIntervalsAllOf>

const QueryDslIntervalsQueryExclusiveProps = z.union([z.object({ all_of: z.lazy(() => QueryDslIntervalsAllOf) }), z.object({ any_of: z.lazy(() => QueryDslIntervalsAnyOf) }), z.object({ fuzzy: QueryDslIntervalsFuzzy }), z.object({ match: z.lazy(() => QueryDslIntervalsMatch) }), z.object({ prefix: QueryDslIntervalsPrefix }), z.object({ range: QueryDslIntervalsRange }), z.object({ regexp: QueryDslIntervalsRegexp }), z.object({ wildcard: QueryDslIntervalsWildcard })])

export interface QueryDslIntervalsQueryShape {
  all_of?: QueryDslIntervalsAllOf | undefined
  any_of?: QueryDslIntervalsAnyOf | undefined
  fuzzy?: QueryDslIntervalsFuzzy | undefined
  match?: QueryDslIntervalsMatch | undefined
  prefix?: QueryDslIntervalsPrefix | undefined
  range?: QueryDslIntervalsRange | undefined
  regexp?: QueryDslIntervalsRegexp | undefined
  wildcard?: QueryDslIntervalsWildcard | undefined
}
export const QueryDslIntervalsQuery: z.ZodType<QueryDslIntervalsQueryShape> = QueryDslIntervalsQueryExclusiveProps.meta({ id: 'QueryDslIntervalsQuery' })
export type QueryDslIntervalsQuery = z.infer<typeof QueryDslIntervalsQuery>

export interface KnnQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  field: Field
  query_vector?: QueryVector | undefined
  query_vector_builder?: QueryVectorBuilder | undefined
  num_candidates?: integer | undefined
  visit_percentage?: float | undefined
  k?: integer | undefined
  filter?: QueryDslQueryContainerShape | QueryDslQueryContainerShape[] | undefined
  similarity?: float | undefined
  rescore_vector?: RescoreVector | undefined
}
export const KnnQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  field: Field.describe('The name of the vector field to search against'),
  query_vector: QueryVector.describe('The query vector').optional(),
  query_vector_builder: QueryVectorBuilder.describe('The query vector builder. You must provide a query_vector_builder or query_vector, but not both.').optional(),
  num_candidates: integer.describe('The number of nearest neighbor candidates to consider per shard').optional(),
  visit_percentage: float.describe('The percentage of vectors to explore per shard while doing knn search with bbq_disk').optional(),
  k: integer.describe('The final number of nearest neighbors to return as top hits').optional(),
  get filter (): z.ZodOptional<z.ZodUnion<readonly [typeof QueryDslQueryContainer, z.ZodArray<typeof QueryDslQueryContainer>]>> { return z.union([QueryDslQueryContainer, QueryDslQueryContainer.array()]).describe('Filters for the kNN search query').optional() },
  similarity: float.describe('The minimum similarity for a vector to be considered a match').optional(),
  rescore_vector: RescoreVector.describe('Apply oversampling and rescoring to quantized vectors').optional()
}).meta({ id: 'KnnQuery' })
export type KnnQuery = z.infer<typeof KnnQuery>

export const QueryDslZeroTermsQuery = z.enum(['all', 'none']).meta({ id: 'QueryDslZeroTermsQuery' })
export type QueryDslZeroTermsQuery = z.infer<typeof QueryDslZeroTermsQuery>

export const QueryDslMatchQuery = z.object({
  ...QueryDslQueryBase.shape,
  analyzer: z.string().describe('Analyzer used to convert the text in the query value into tokens.').optional(),
  auto_generate_synonyms_phrase_query: z.boolean().describe('If `true`, match phrase queries are automatically created for multi-term synonyms.').optional(),
  cutoff_frequency: double.optional(),
  fuzziness: Fuzziness.describe('Maximum edit distance allowed for matching.').optional(),
  fuzzy_rewrite: MultiTermQueryRewrite.describe('Method used to rewrite the query.').optional(),
  fuzzy_transpositions: z.boolean().describe('If `true`, edits for fuzzy matching include transpositions of two adjacent characters (for example, `ab` to `ba`).').optional(),
  lenient: z.boolean().describe('If `true`, format-based errors, such as providing a text query value for a numeric field, are ignored.').optional(),
  max_expansions: integer.describe('Maximum number of terms to which the query will expand.').optional(),
  minimum_should_match: MinimumShouldMatch.describe('Minimum number of clauses that must match for a document to be returned.').optional(),
  operator: QueryDslOperator.describe('Boolean logic used to interpret text in the query value.').optional(),
  prefix_length: integer.describe('Number of beginning characters left unchanged for fuzzy matching.').optional(),
  query: z.union([z.string(), float, z.boolean()]).describe('Text, number, boolean value or date you wish to find in the provided field.'),
  zero_terms_query: QueryDslZeroTermsQuery.describe('Indicates whether no documents are returned if the `analyzer` removes all tokens, such as when using a `stop` filter.').optional()
}).meta({ id: 'QueryDslMatchQuery' })
export type QueryDslMatchQuery = z.infer<typeof QueryDslMatchQuery>

export const QueryDslMatchAllQuery = z.object({
  ...QueryDslQueryBase.shape
}).meta({ id: 'QueryDslMatchAllQuery' })
export type QueryDslMatchAllQuery = z.infer<typeof QueryDslMatchAllQuery>

export const QueryDslMatchBoolPrefixQuery = z.object({
  ...QueryDslQueryBase.shape,
  analyzer: z.string().describe('Analyzer used to convert the text in the query value into tokens.').optional(),
  fuzziness: Fuzziness.describe('Maximum edit distance allowed for matching. Can be applied to the term subqueries constructed for all terms but the final term.').optional(),
  fuzzy_rewrite: MultiTermQueryRewrite.describe('Method used to rewrite the query. Can be applied to the term subqueries constructed for all terms but the final term.').optional(),
  fuzzy_transpositions: z.boolean().describe('If `true`, edits for fuzzy matching include transpositions of two adjacent characters (for example, `ab` to `ba`). Can be applied to the term subqueries constructed for all terms but the final term.').optional(),
  max_expansions: integer.describe('Maximum number of terms to which the query will expand. Can be applied to the term subqueries constructed for all terms but the final term.').optional(),
  minimum_should_match: MinimumShouldMatch.describe('Minimum number of clauses that must match for a document to be returned. Applied to the constructed bool query.').optional(),
  operator: QueryDslOperator.describe('Boolean logic used to interpret text in the query value. Applied to the constructed bool query.').optional(),
  prefix_length: integer.describe('Number of beginning characters left unchanged for fuzzy matching. Can be applied to the term subqueries constructed for all terms but the final term.').optional(),
  query: z.string().describe('Terms you wish to find in the provided field. The last term is used in a prefix query.')
}).meta({ id: 'QueryDslMatchBoolPrefixQuery' })
export type QueryDslMatchBoolPrefixQuery = z.infer<typeof QueryDslMatchBoolPrefixQuery>

export const QueryDslMatchNoneQuery = z.object({
  ...QueryDslQueryBase.shape
}).meta({ id: 'QueryDslMatchNoneQuery' })
export type QueryDslMatchNoneQuery = z.infer<typeof QueryDslMatchNoneQuery>

export const QueryDslMatchPhraseQuery = z.object({
  ...QueryDslQueryBase.shape,
  analyzer: z.string().describe('Analyzer used to convert the text in the query value into tokens.').optional(),
  query: z.string().describe('Query terms that are analyzed and turned into a phrase query.'),
  slop: integer.describe('Maximum number of positions allowed between matching tokens.').optional(),
  zero_terms_query: QueryDslZeroTermsQuery.describe('Indicates whether no documents are returned if the `analyzer` removes all tokens, such as when using a `stop` filter.').optional()
}).meta({ id: 'QueryDslMatchPhraseQuery' })
export type QueryDslMatchPhraseQuery = z.infer<typeof QueryDslMatchPhraseQuery>

export const QueryDslMatchPhrasePrefixQuery = z.object({
  ...QueryDslQueryBase.shape,
  analyzer: z.string().describe('Analyzer used to convert text in the query value into tokens.').optional(),
  max_expansions: integer.describe('Maximum number of terms to which the last provided term of the query value will expand.').optional(),
  query: z.string().describe('Text you wish to find in the provided field.'),
  slop: integer.describe('Maximum number of positions allowed between matching tokens.').optional(),
  zero_terms_query: QueryDslZeroTermsQuery.describe('Indicates whether no documents are returned if the analyzer removes all tokens, such as when using a `stop` filter.').optional()
}).meta({ id: 'QueryDslMatchPhrasePrefixQuery' })
export type QueryDslMatchPhrasePrefixQuery = z.infer<typeof QueryDslMatchPhrasePrefixQuery>

/** Only to be used in query and path parameters, as the array form is actually a csv */
export const Routing = z.union([z.string(), z.array(z.string())]).meta({ id: 'Routing' })
export type Routing = z.infer<typeof Routing>

export const VersionNumber = long.meta({ id: 'VersionNumber' })
export type VersionNumber = z.infer<typeof VersionNumber>

export const VersionType = z.enum(['internal', 'external', 'external_gte']).meta({ id: 'VersionType' })
export type VersionType = z.infer<typeof VersionType>

export const QueryDslLikeDocument = z.object({
  doc: z.any().describe('A document not present in the index.').optional(),
  fields: z.array(Field).optional(),
  _id: Id.describe('ID of a document.').optional(),
  _index: IndexName.describe('Index of a document.').optional(),
  per_field_analyzer: z.record(Field, z.string()).describe('Overrides the default analyzer.').optional(),
  routing: Routing.optional(),
  version: VersionNumber.optional(),
  version_type: VersionType.optional()
}).meta({ id: 'QueryDslLikeDocument' })
export type QueryDslLikeDocument = z.infer<typeof QueryDslLikeDocument>

/** Text that we want similar documents for or a lookup to a document's field for the text. */
export const QueryDslLike = z.union([z.string(), QueryDslLikeDocument]).meta({ id: 'QueryDslLike' })
export type QueryDslLike = z.infer<typeof QueryDslLike>

export const AnalysisStopWordLanguage = z.enum(['_arabic_', '_armenian_', '_basque_', '_bengali_', '_brazilian_', '_bulgarian_', '_catalan_', '_cjk_', '_czech_', '_danish_', '_dutch_', '_english_', '_estonian_', '_finnish_', '_french_', '_galician_', '_german_', '_greek_', '_hindi_', '_hungarian_', '_indonesian_', '_irish_', '_italian_', '_latvian_', '_lithuanian_', '_norwegian_', '_persian_', '_portuguese_', '_romanian_', '_russian_', '_serbian_', '_sorani_', '_spanish_', '_swedish_', '_thai_', '_turkish_', '_none_']).meta({ id: 'AnalysisStopWordLanguage' })
export type AnalysisStopWordLanguage = z.infer<typeof AnalysisStopWordLanguage>

/**
 * Language value, such as _arabic_ or _thai_. Defaults to _english_.
 * Each language value corresponds to a predefined list of stop words in Lucene. See Stop words by language for supported language values and their stop words.
 * Also accepts an array of stop words.
 */
export const AnalysisStopWords = z.union([AnalysisStopWordLanguage, z.array(z.string())]).meta({ id: 'AnalysisStopWords' })
export type AnalysisStopWords = z.infer<typeof AnalysisStopWords>

export const QueryDslMoreLikeThisQuery = z.object({
  ...QueryDslQueryBase.shape,
  analyzer: z.string().describe('The analyzer that is used to analyze the free form text. Defaults to the analyzer associated with the first field in fields.').optional(),
  boost_terms: double.describe('Each term in the formed query could be further boosted by their tf-idf score. This sets the boost factor to use when using this feature. Defaults to deactivated (0).').optional(),
  fail_on_unsupported_field: z.boolean().describe('Controls whether the query should fail (throw an exception) if any of the specified fields are not of the supported types (`text` or `keyword`).').optional(),
  fields: z.array(Field).describe('A list of fields to fetch and analyze the text from. Defaults to the `index.query.default_field` index setting, which has a default value of `*`.').optional(),
  include: z.boolean().describe('Specifies whether the input documents should also be included in the search results returned.').optional(),
  like: z.union([QueryDslLike, z.array(QueryDslLike)]).describe('Specifies free form text and/or a single or multiple documents for which you want to find similar documents.'),
  max_doc_freq: integer.describe('The maximum document frequency above which the terms are ignored from the input document.').optional(),
  max_query_terms: integer.describe('The maximum number of query terms that can be selected.').optional(),
  max_word_length: integer.describe('The maximum word length above which the terms are ignored. Defaults to unbounded (`0`).').optional(),
  min_doc_freq: integer.describe('The minimum document frequency below which the terms are ignored from the input document.').optional(),
  minimum_should_match: MinimumShouldMatch.describe('After the disjunctive query has been formed, this parameter controls the number of terms that must match.').optional(),
  min_term_freq: integer.describe('The minimum term frequency below which the terms are ignored from the input document.').optional(),
  min_word_length: integer.describe('The minimum word length below which the terms are ignored.').optional(),
  routing: z.string().optional(),
  stop_words: AnalysisStopWords.describe('An array of stop words. Any word in this set is ignored.').optional(),
  unlike: z.union([QueryDslLike, z.array(QueryDslLike)]).describe('Used in combination with `like` to exclude documents that match a set of terms.').optional(),
  version: VersionNumber.optional(),
  version_type: VersionType.optional()
}).meta({ id: 'QueryDslMoreLikeThisQuery' })
export type QueryDslMoreLikeThisQuery = z.infer<typeof QueryDslMoreLikeThisQuery>

export const QueryDslTextQueryType = z.enum(['best_fields', 'most_fields', 'cross_fields', 'phrase', 'phrase_prefix', 'bool_prefix']).meta({ id: 'QueryDslTextQueryType' })
export type QueryDslTextQueryType = z.infer<typeof QueryDslTextQueryType>

export const QueryDslMultiMatchQuery = z.object({
  ...QueryDslQueryBase.shape,
  analyzer: z.string().describe('Analyzer used to convert the text in the query value into tokens.').optional(),
  auto_generate_synonyms_phrase_query: z.boolean().describe('If `true`, match phrase queries are automatically created for multi-term synonyms.').optional(),
  cutoff_frequency: double.optional(),
  fields: Fields.describe('The fields to be queried. Defaults to the `index.query.default_field` index settings, which in turn defaults to `*`.').optional(),
  fuzziness: Fuzziness.describe('Maximum edit distance allowed for matching.').optional(),
  fuzzy_rewrite: MultiTermQueryRewrite.describe('Method used to rewrite the query.').optional(),
  fuzzy_transpositions: z.boolean().describe('If `true`, edits for fuzzy matching include transpositions of two adjacent characters (for example, `ab` to `ba`). Can be applied to the term subqueries constructed for all terms but the final term.').optional(),
  lenient: z.boolean().describe('If `true`, format-based errors, such as providing a text query value for a numeric field, are ignored.').optional(),
  max_expansions: integer.describe('Maximum number of terms to which the query will expand.').optional(),
  minimum_should_match: MinimumShouldMatch.describe('Minimum number of clauses that must match for a document to be returned.').optional(),
  operator: QueryDslOperator.describe('Boolean logic used to interpret text in the query value.').optional(),
  prefix_length: integer.describe('Number of beginning characters left unchanged for fuzzy matching.').optional(),
  query: z.string().describe('Text, number, boolean value or date you wish to find in the provided field.'),
  slop: integer.describe('Maximum number of positions allowed between matching tokens.').optional(),
  tie_breaker: double.describe('Determines how scores for each per-term blended query and scores across groups are combined.').optional(),
  type: QueryDslTextQueryType.describe('How `the` multi_match query is executed internally.').optional(),
  zero_terms_query: QueryDslZeroTermsQuery.describe('Indicates whether no documents are returned if the `analyzer` removes all tokens, such as when using a `stop` filter.').optional()
}).meta({ id: 'QueryDslMultiMatchQuery' })
export type QueryDslMultiMatchQuery = z.infer<typeof QueryDslMultiMatchQuery>

export interface QueryDslNestedQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  ignore_unmapped?: boolean | undefined
  inner_hits?: SearchInnerHitsShape | undefined
  path: Field
  query: QueryDslQueryContainerShape
  score_mode?: QueryDslChildScoreMode | undefined
}
export const QueryDslNestedQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  ignore_unmapped: z.boolean().describe('Indicates whether to ignore an unmapped path and not return any documents instead of an error.').optional(),
  get inner_hits () { return SearchInnerHits.describe('If defined, each search hit will contain inner hits.').optional() },
  path: Field.describe('Path to the nested object you wish to search.'),
  get query () { return QueryDslQueryContainer.describe('Query you wish to run on nested objects in the path.') },
  score_mode: QueryDslChildScoreMode.describe('How scores for matching child objects affect the root parent document’s relevance score.').optional()
}).meta({ id: 'QueryDslNestedQuery' })
export type QueryDslNestedQuery = z.infer<typeof QueryDslNestedQuery>

export const QueryDslParentIdQuery = z.object({
  ...QueryDslQueryBase.shape,
  id: Id.describe('ID of the parent document.').optional(),
  ignore_unmapped: z.boolean().describe('Indicates whether to ignore an unmapped `type` and not return any documents instead of an error.').optional(),
  type: RelationName.describe('Name of the child relationship mapped for the `join` field.').optional()
}).meta({ id: 'QueryDslParentIdQuery' })
export type QueryDslParentIdQuery = z.infer<typeof QueryDslParentIdQuery>

export const QueryDslPercolateQuery = z.object({
  ...QueryDslQueryBase.shape,
  document: z.any().describe('The source of the document being percolated.').optional(),
  documents: z.array(z.any()).describe('An array of sources of the documents being percolated.').optional(),
  field: Field.describe('Field that holds the indexed queries. The field must use the `percolator` mapping type.'),
  id: Id.describe('The ID of a stored document to percolate.').optional(),
  index: IndexName.describe('The index of a stored document to percolate.').optional(),
  name: z.string().describe('The suffix used for the `_percolator_document_slot` field when multiple `percolate` queries are specified.').optional(),
  preference: z.string().describe('Preference used to fetch document to percolate.').optional(),
  routing: z.string().describe('Routing used to fetch document to percolate.').optional(),
  version: VersionNumber.describe('The expected version of a stored document to percolate.').optional()
}).meta({ id: 'QueryDslPercolateQuery' })
export type QueryDslPercolateQuery = z.infer<typeof QueryDslPercolateQuery>

export const QueryDslPinnedDoc = z.object({
  _id: Id.describe('The unique document ID.'),
  _index: IndexName.describe('The index that contains the document.').optional()
}).meta({ id: 'QueryDslPinnedDoc' })
export type QueryDslPinnedDoc = z.infer<typeof QueryDslPinnedDoc>

const QueryDslPinnedQueryCommonProps = z.object({
  organic: z.lazy(() => QueryDslQueryContainer).describe('Any choice of query used to rank documents which will be ranked below the "pinned" documents.')
})

const QueryDslPinnedQueryExclusiveProps = z.union([z.object({ ids: z.array(Id) }), z.object({ docs: z.array(QueryDslPinnedDoc) })])

export interface QueryDslPinnedQueryShape {
  organic: QueryDslQueryContainerShape
  ids?: Id[] | undefined
  docs?: QueryDslPinnedDoc[] | undefined
}
export const QueryDslPinnedQuery: z.ZodType<QueryDslPinnedQueryShape> = QueryDslPinnedQueryCommonProps.and(QueryDslPinnedQueryExclusiveProps).meta({ id: 'QueryDslPinnedQuery' })
export type QueryDslPinnedQuery = z.infer<typeof QueryDslPinnedQuery>

export const QueryDslPrefixQuery = z.object({
  ...QueryDslQueryBase.shape,
  rewrite: MultiTermQueryRewrite.describe('Method used to rewrite the query.').optional(),
  value: z.string().describe('Beginning characters of terms you wish to find in the provided field.'),
  case_insensitive: z.boolean().describe('Allows ASCII case insensitive matching of the value with the indexed field values when set to `true`. Default is `false` which means the case sensitivity of matching depends on the underlying field’s mapping.').optional()
}).meta({ id: 'QueryDslPrefixQuery' })
export type QueryDslPrefixQuery = z.infer<typeof QueryDslPrefixQuery>

export const QueryDslQueryStringQuery = z.object({
  ...QueryDslQueryBase.shape,
  allow_leading_wildcard: z.boolean().describe('If `true`, the wildcard characters `*` and `?` are allowed as the first character of the query string.').optional(),
  analyzer: z.string().describe('Analyzer used to convert text in the query string into tokens.').optional(),
  analyze_wildcard: z.boolean().describe('If `true`, the query attempts to analyze wildcard terms in the query string.').optional(),
  auto_generate_synonyms_phrase_query: z.boolean().describe('If `true`, match phrase queries are automatically created for multi-term synonyms.').optional(),
  default_field: Field.describe('Default field to search if no field is provided in the query string. Supports wildcards (`*`). Defaults to the `index.query.default_field` index setting, which has a default value of `*`.').optional(),
  default_operator: QueryDslOperator.describe('Default boolean logic used to interpret text in the query string if no operators are specified.').optional(),
  enable_position_increments: z.boolean().describe('If `true`, enable position increments in queries constructed from a `query_string` search.').optional(),
  escape: z.boolean().optional(),
  fields: z.array(Field).describe('Array of fields to search. Supports wildcards (`*`).').optional(),
  fuzziness: Fuzziness.describe('Maximum edit distance allowed for fuzzy matching.').optional(),
  fuzzy_max_expansions: integer.describe('Maximum number of terms to which the query expands for fuzzy matching.').optional(),
  fuzzy_prefix_length: integer.describe('Number of beginning characters left unchanged for fuzzy matching.').optional(),
  fuzzy_rewrite: MultiTermQueryRewrite.describe('Method used to rewrite the query.').optional(),
  fuzzy_transpositions: z.boolean().describe('If `true`, edits for fuzzy matching include transpositions of two adjacent characters (for example, `ab` to `ba`).').optional(),
  lenient: z.boolean().describe('If `true`, format-based errors, such as providing a text value for a numeric field, are ignored.').optional(),
  max_determinized_states: integer.describe('Maximum number of automaton states required for the query.').optional(),
  minimum_should_match: MinimumShouldMatch.describe('Minimum number of clauses that must match for a document to be returned.').optional(),
  phrase_slop: double.describe('Maximum number of positions allowed between matching tokens for phrases.').optional(),
  query: z.string().describe('Query string you wish to parse and use for search.'),
  quote_analyzer: z.string().describe('Analyzer used to convert quoted text in the query string into tokens. For quoted text, this parameter overrides the analyzer specified in the `analyzer` parameter.').optional(),
  quote_field_suffix: z.string().describe('Suffix appended to quoted text in the query string. You can use this suffix to use a different analysis method for exact matches.').optional(),
  rewrite: MultiTermQueryRewrite.describe('Method used to rewrite the query.').optional(),
  tie_breaker: double.describe('How to combine the queries generated from the individual search terms in the resulting `dis_max` query.').optional(),
  time_zone: TimeZone.describe('Coordinated Universal Time (UTC) offset or IANA time zone used to convert date values in the query string to UTC.').optional(),
  type: QueryDslTextQueryType.describe('Determines how the query matches and scores documents.').optional()
}).meta({ id: 'QueryDslQueryStringQuery' })
export type QueryDslQueryStringQuery = z.infer<typeof QueryDslQueryStringQuery>

export const QueryDslRangeRelation = z.enum(['within', 'contains', 'intersects']).meta({ id: 'QueryDslRangeRelation' })
export type QueryDslRangeRelation = z.infer<typeof QueryDslRangeRelation>

export const QueryDslRangeQueryBase = z.object({
  ...QueryDslQueryBase.shape,
  relation: QueryDslRangeRelation.describe('Indicates how the range query matches values for `range` fields.').optional(),
  gt: z.any().describe('Greater than.').optional(),
  gte: z.any().describe('Greater than or equal to.').optional(),
  lt: z.any().describe('Less than.').optional(),
  lte: z.any().describe('Less than or equal to.').optional()
}).meta({ id: 'QueryDslRangeQueryBase' })
export type QueryDslRangeQueryBase = z.infer<typeof QueryDslRangeQueryBase>

export const DateFormat = z.string().meta({ id: 'DateFormat' })
export type DateFormat = z.infer<typeof DateFormat>

export const QueryDslUntypedRangeQuery = z.object({
  ...QueryDslRangeQueryBase.shape,
  format: DateFormat.describe('Date format used to convert `date` values in the query.').optional(),
  time_zone: TimeZone.describe('Coordinated Universal Time (UTC) offset or IANA time zone used to convert `date` values in the query to UTC.').optional()
}).meta({ id: 'QueryDslUntypedRangeQuery' })
export type QueryDslUntypedRangeQuery = z.infer<typeof QueryDslUntypedRangeQuery>

export const QueryDslDateRangeQuery = z.object({
  ...QueryDslRangeQueryBase.shape,
  format: DateFormat.describe('Date format used to convert `date` values in the query.').optional(),
  time_zone: TimeZone.describe('Coordinated Universal Time (UTC) offset or IANA time zone used to convert `date` values in the query to UTC.').optional()
}).meta({ id: 'QueryDslDateRangeQuery' })
export type QueryDslDateRangeQuery = z.infer<typeof QueryDslDateRangeQuery>

export const QueryDslNumberRangeQuery = z.object({
  ...QueryDslRangeQueryBase.shape
}).meta({ id: 'QueryDslNumberRangeQuery' })
export type QueryDslNumberRangeQuery = z.infer<typeof QueryDslNumberRangeQuery>

export const QueryDslLongNumberRangeQuery = z.object({
  ...QueryDslRangeQueryBase.shape
}).meta({ id: 'QueryDslLongNumberRangeQuery' })
export type QueryDslLongNumberRangeQuery = z.infer<typeof QueryDslLongNumberRangeQuery>

export const QueryDslTermRangeQuery = z.object({
  ...QueryDslRangeQueryBase.shape
}).meta({ id: 'QueryDslTermRangeQuery' })
export type QueryDslTermRangeQuery = z.infer<typeof QueryDslTermRangeQuery>

export const QueryDslRangeQuery = z.union([QueryDslUntypedRangeQuery, QueryDslDateRangeQuery, QueryDslNumberRangeQuery, QueryDslLongNumberRangeQuery, QueryDslTermRangeQuery]).meta({ id: 'QueryDslRangeQuery' })
export type QueryDslRangeQuery = z.infer<typeof QueryDslRangeQuery>

export const QueryDslRankFeatureFunction = z.object({
}).meta({ id: 'QueryDslRankFeatureFunction' })
export type QueryDslRankFeatureFunction = z.infer<typeof QueryDslRankFeatureFunction>

export const QueryDslRankFeatureFunctionSaturation = z.object({
  pivot: float.describe('Configurable pivot value so that the result will be less than 0.5.').optional()
}).meta({ id: 'QueryDslRankFeatureFunctionSaturation' })
export type QueryDslRankFeatureFunctionSaturation = z.infer<typeof QueryDslRankFeatureFunctionSaturation>

export const QueryDslRankFeatureFunctionLogarithm = z.object({
  scaling_factor: float.describe('Configurable scaling factor.')
}).meta({ id: 'QueryDslRankFeatureFunctionLogarithm' })
export type QueryDslRankFeatureFunctionLogarithm = z.infer<typeof QueryDslRankFeatureFunctionLogarithm>

export const QueryDslRankFeatureFunctionLinear = z.object({
}).meta({ id: 'QueryDslRankFeatureFunctionLinear' })
export type QueryDslRankFeatureFunctionLinear = z.infer<typeof QueryDslRankFeatureFunctionLinear>

export const QueryDslRankFeatureFunctionSigmoid = z.object({
  pivot: float.describe('Configurable pivot value so that the result will be less than 0.5.'),
  exponent: float.describe('Configurable Exponent.')
}).meta({ id: 'QueryDslRankFeatureFunctionSigmoid' })
export type QueryDslRankFeatureFunctionSigmoid = z.infer<typeof QueryDslRankFeatureFunctionSigmoid>

export const QueryDslRankFeatureQuery = z.object({
  ...QueryDslQueryBase.shape,
  field: Field.describe('`rank_feature` or `rank_features` field used to boost relevance scores.'),
  saturation: QueryDslRankFeatureFunctionSaturation.describe('Saturation function used to boost relevance scores based on the value of the rank feature `field`.').optional(),
  log: QueryDslRankFeatureFunctionLogarithm.describe('Logarithmic function used to boost relevance scores based on the value of the rank feature `field`.').optional(),
  linear: QueryDslRankFeatureFunctionLinear.describe('Linear function used to boost relevance scores based on the value of the rank feature `field`.').optional(),
  sigmoid: QueryDslRankFeatureFunctionSigmoid.describe('Sigmoid function used to boost relevance scores based on the value of the rank feature `field`.').optional()
}).meta({ id: 'QueryDslRankFeatureQuery' })
export type QueryDslRankFeatureQuery = z.infer<typeof QueryDslRankFeatureQuery>

export const QueryDslRegexpQuery = z.object({
  ...QueryDslQueryBase.shape,
  case_insensitive: z.boolean().describe('Allows case insensitive matching of the regular expression value with the indexed field values when set to `true`. When `false`, case sensitivity of matching depends on the underlying field’s mapping.').optional(),
  flags: z.string().describe('Enables optional operators for the regular expression.').optional(),
  max_determinized_states: integer.describe('Maximum number of automaton states required for the query.').optional(),
  rewrite: MultiTermQueryRewrite.describe('Method used to rewrite the query.').optional(),
  value: z.string().describe('Regular expression for terms you wish to find in the provided field.')
}).meta({ id: 'QueryDslRegexpQuery' })
export type QueryDslRegexpQuery = z.infer<typeof QueryDslRegexpQuery>

export interface QueryDslRuleQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  organic: QueryDslQueryContainerShape
  ruleset_ids?: Id | Id[] | undefined
  ruleset_id?: string | undefined
  match_criteria: unknown
}
export const QueryDslRuleQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get organic () { return QueryDslQueryContainer },
  ruleset_ids: z.union([Id, z.array(Id)]).optional(),
  ruleset_id: z.string().optional(),
  match_criteria: z.any()
}).meta({ id: 'QueryDslRuleQuery' })
export type QueryDslRuleQuery = z.infer<typeof QueryDslRuleQuery>

export interface QueryDslScriptQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  script: ScriptShape
}
export const QueryDslScriptQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get script () { return Script.describe('Contains a script to run as a query. This script must return a boolean value, `true` or `false`.') }
}).meta({ id: 'QueryDslScriptQuery' })
export type QueryDslScriptQuery = z.infer<typeof QueryDslScriptQuery>

export interface QueryDslScriptScoreQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  min_score?: float | undefined
  query: QueryDslQueryContainerShape
  script: ScriptShape
}
export const QueryDslScriptScoreQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  min_score: float.describe('Documents with a score lower than this floating point number are excluded from the search results.').optional(),
  get query () { return QueryDslQueryContainer.describe('Query used to return documents.') },
  get script () { return Script.describe('Script used to compute the score of documents returned by the query. Important: final relevance scores from the `script_score` query cannot be negative.') }
}).meta({ id: 'QueryDslScriptScoreQuery' })
export type QueryDslScriptScoreQuery = z.infer<typeof QueryDslScriptScoreQuery>

export const QueryDslSemanticQuery = z.object({
  ...QueryDslQueryBase.shape,
  field: z.string().describe('The field to query, which must be a semantic_text field type'),
  query: z.string().describe('The query text')
}).meta({ id: 'QueryDslSemanticQuery' })
export type QueryDslSemanticQuery = z.infer<typeof QueryDslSemanticQuery>

export const QueryDslShapeQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  ignore_unmapped: z.boolean().describe('When set to `true` the query ignores an unmapped field and will not match any documents.').optional()
}).catchall(z.any()).meta({ id: 'QueryDslShapeQuery' })
export type QueryDslShapeQuery = z.infer<typeof QueryDslShapeQuery>

/**
 * A set of flags that can be represented as a single enum value or a set of values that are encoded
 * as a pipe-separated string
 *
 * Depending on the target language, code generators can use this hint to generate language specific
 * flags enum constructs and the corresponding (de-)serialization code.
 */
export const SpecUtilsPipeSeparatedFlags = z.union([z.any(), z.string()]).meta({ id: 'SpecUtilsPipeSeparatedFlags' })
export type SpecUtilsPipeSeparatedFlags = z.infer<typeof SpecUtilsPipeSeparatedFlags>

/** Query flags can be either a single flag or a combination of flags, e.g. `OR|AND|PREFIX` */
export const QueryDslSimpleQueryStringFlags = SpecUtilsPipeSeparatedFlags.meta({ id: 'QueryDslSimpleQueryStringFlags' })
export type QueryDslSimpleQueryStringFlags = z.infer<typeof QueryDslSimpleQueryStringFlags>

export const QueryDslSimpleQueryStringQuery = z.object({
  ...QueryDslQueryBase.shape,
  analyzer: z.string().describe('Analyzer used to convert text in the query string into tokens.').optional(),
  analyze_wildcard: z.boolean().describe('If `true`, the query attempts to analyze wildcard terms in the query string.').optional(),
  auto_generate_synonyms_phrase_query: z.boolean().describe('If `true`, the parser creates a match_phrase query for each multi-position token.').optional(),
  default_operator: QueryDslOperator.describe('Default boolean logic used to interpret text in the query string if no operators are specified.').optional(),
  fields: z.array(Field).describe('Array of fields you wish to search. Accepts wildcard expressions. You also can boost relevance scores for matches to particular fields using a caret (`^`) notation. Defaults to the `index.query.default_field index` setting, which has a default value of `*`.').optional(),
  flags: QueryDslSimpleQueryStringFlags.describe('List of enabled operators for the simple query string syntax.').optional(),
  fuzzy_max_expansions: integer.describe('Maximum number of terms to which the query expands for fuzzy matching.').optional(),
  fuzzy_prefix_length: integer.describe('Number of beginning characters left unchanged for fuzzy matching.').optional(),
  fuzzy_transpositions: z.boolean().describe('If `true`, edits for fuzzy matching include transpositions of two adjacent characters (for example, `ab` to `ba`).').optional(),
  lenient: z.boolean().describe('If `true`, format-based errors, such as providing a text value for a numeric field, are ignored.').optional(),
  minimum_should_match: MinimumShouldMatch.describe('Minimum number of clauses that must match for a document to be returned.').optional(),
  query: z.string().describe('Query string in the simple query string syntax you wish to parse and use for search.'),
  quote_field_suffix: z.string().describe('Suffix appended to quoted text in the query string.').optional()
}).meta({ id: 'QueryDslSimpleQueryStringQuery' })
export type QueryDslSimpleQueryStringQuery = z.infer<typeof QueryDslSimpleQueryStringQuery>

export interface QueryDslSpanFieldMaskingQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  field: Field
  query: QueryDslSpanQueryShape
}
export const QueryDslSpanFieldMaskingQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  field: Field,
  get query () { return QueryDslSpanQuery }
}).meta({ id: 'QueryDslSpanFieldMaskingQuery' })
export type QueryDslSpanFieldMaskingQuery = z.infer<typeof QueryDslSpanFieldMaskingQuery>

export interface QueryDslSpanFirstQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  end: integer
  match: QueryDslSpanQueryShape
}
export const QueryDslSpanFirstQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  end: integer.describe('Controls the maximum end position permitted in a match.'),
  get match () { return QueryDslSpanQuery.describe('Can be any other span type query.') }
}).meta({ id: 'QueryDslSpanFirstQuery' })
export type QueryDslSpanFirstQuery = z.infer<typeof QueryDslSpanFirstQuery>

/** Can only be used as a clause in a span_near query. */
export const QueryDslSpanGapQuery = z.record(Field, integer).meta({ id: 'QueryDslSpanGapQuery' })
export type QueryDslSpanGapQuery = z.infer<typeof QueryDslSpanGapQuery>

export interface QueryDslSpanMultiTermQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  match: QueryDslQueryContainerShape
}
export const QueryDslSpanMultiTermQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get match () { return QueryDslQueryContainer.describe('Should be a multi term query (one of `wildcard`, `fuzzy`, `prefix`, `range`, or `regexp` query).') }
}).meta({ id: 'QueryDslSpanMultiTermQuery' })
export type QueryDslSpanMultiTermQuery = z.infer<typeof QueryDslSpanMultiTermQuery>

export interface QueryDslSpanNearQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  clauses: QueryDslSpanQueryShape[]
  in_order?: boolean | undefined
  slop?: integer | undefined
}
export const QueryDslSpanNearQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get clauses () { return QueryDslSpanQuery.array().describe('Array of one or more other span type queries.') },
  in_order: z.boolean().describe('Controls whether matches are required to be in-order.').optional(),
  slop: integer.describe('Controls the maximum number of intervening unmatched positions permitted.').optional()
}).meta({ id: 'QueryDslSpanNearQuery' })
export type QueryDslSpanNearQuery = z.infer<typeof QueryDslSpanNearQuery>

export interface QueryDslSpanNotQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  dist?: integer | undefined
  exclude: QueryDslSpanQueryShape
  include: QueryDslSpanQueryShape
  post?: integer | undefined
  pre?: integer | undefined
}
export const QueryDslSpanNotQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  dist: integer.describe('The number of tokens from within the include span that can’t have overlap with the exclude span. Equivalent to setting both `pre` and `post`.').optional(),
  get exclude () { return QueryDslSpanQuery.describe('Span query whose matches must not overlap those returned.') },
  get include () { return QueryDslSpanQuery.describe('Span query whose matches are filtered.') },
  post: integer.describe('The number of tokens after the include span that can’t have overlap with the exclude span.').optional(),
  pre: integer.describe('The number of tokens before the include span that can’t have overlap with the exclude span.').optional()
}).meta({ id: 'QueryDslSpanNotQuery' })
export type QueryDslSpanNotQuery = z.infer<typeof QueryDslSpanNotQuery>

export interface QueryDslSpanOrQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  clauses: QueryDslSpanQueryShape[]
}
export const QueryDslSpanOrQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get clauses () { return QueryDslSpanQuery.array().describe('Array of one or more other span type queries.') }
}).meta({ id: 'QueryDslSpanOrQuery' })
export type QueryDslSpanOrQuery = z.infer<typeof QueryDslSpanOrQuery>

export const QueryDslSpanTermQuery = z.object({
  ...QueryDslQueryBase.shape,
  value: FieldValue,
  term: FieldValue
}).meta({ id: 'QueryDslSpanTermQuery' })
export type QueryDslSpanTermQuery = z.infer<typeof QueryDslSpanTermQuery>

export interface QueryDslSpanWithinQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  big: QueryDslSpanQueryShape
  little: QueryDslSpanQueryShape
}
export const QueryDslSpanWithinQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get big () { return QueryDslSpanQuery.describe('Can be any span query. Matching spans from `little` that are enclosed within `big` are returned.') },
  get little () { return QueryDslSpanQuery.describe('Can be any span query. Matching spans from `little` that are enclosed within `big` are returned.') }
}).meta({ id: 'QueryDslSpanWithinQuery' })
export type QueryDslSpanWithinQuery = z.infer<typeof QueryDslSpanWithinQuery>

const QueryDslSpanQueryExclusiveProps = z.union([z.object({ span_containing: z.lazy(() => QueryDslSpanContainingQuery) }), z.object({ span_field_masking: z.lazy(() => QueryDslSpanFieldMaskingQuery) }), z.object({ span_first: z.lazy(() => QueryDslSpanFirstQuery) }), z.object({ span_gap: QueryDslSpanGapQuery }), z.object({ span_multi: z.lazy(() => QueryDslSpanMultiTermQuery) }), z.object({ span_near: z.lazy(() => QueryDslSpanNearQuery) }), z.object({ span_not: z.lazy(() => QueryDslSpanNotQuery) }), z.object({ span_or: z.lazy(() => QueryDslSpanOrQuery) }), z.object({ span_term: z.record(Field, QueryDslSpanTermQuery) }), z.object({ span_within: z.lazy(() => QueryDslSpanWithinQuery) })])

export interface QueryDslSpanQueryShape {
  span_containing?: QueryDslSpanContainingQuery | undefined
  span_field_masking?: QueryDslSpanFieldMaskingQuery | undefined
  span_first?: QueryDslSpanFirstQuery | undefined
  span_gap?: QueryDslSpanGapQuery | undefined
  span_multi?: QueryDslSpanMultiTermQuery | undefined
  span_near?: QueryDslSpanNearQuery | undefined
  span_not?: QueryDslSpanNotQuery | undefined
  span_or?: QueryDslSpanOrQuery | undefined
  span_term?: Record<Field, QueryDslSpanTermQuery> | undefined
  span_within?: QueryDslSpanWithinQuery | undefined
}
export const QueryDslSpanQuery: z.ZodType<QueryDslSpanQueryShape> = QueryDslSpanQueryExclusiveProps.meta({ id: 'QueryDslSpanQuery' })
export type QueryDslSpanQuery = z.infer<typeof QueryDslSpanQuery>

export interface QueryDslSpanContainingQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  big: QueryDslSpanQueryShape
  little: QueryDslSpanQueryShape
}
export const QueryDslSpanContainingQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  get big () { return QueryDslSpanQuery.describe('Can be any span query. Matching spans from `big` that contain matches from `little` are returned.') },
  get little () { return QueryDslSpanQuery.describe('Can be any span query. Matching spans from `big` that contain matches from `little` are returned.') }
}).meta({ id: 'QueryDslSpanContainingQuery' })
export type QueryDslSpanContainingQuery = z.infer<typeof QueryDslSpanContainingQuery>

export const TokenPruningConfig = z.object({
  tokens_freq_ratio_threshold: integer.describe('Tokens whose frequency is more than this threshold times the average frequency of all tokens in the specified field are considered outliers and pruned.').optional(),
  tokens_weight_threshold: float.describe('Tokens whose weight is less than this threshold are considered nonsignificant and pruned.').optional(),
  only_score_pruned_tokens: z.boolean().describe('Whether to only score pruned tokens, vs only scoring kept tokens.').optional()
}).meta({ id: 'TokenPruningConfig' })
export type TokenPruningConfig = z.infer<typeof TokenPruningConfig>

const QueryDslSparseVectorQueryCommonProps = z.object({
  field: Field.describe('The name of the field that contains the token-weight pairs to be searched against. This field must be a mapped sparse_vector field.'),
  query: z.string().describe('The query text you want to use for search. If inference_id is specified, query must also be specified.').optional(),
  prune: z.boolean().describe('Whether to perform pruning, omitting the non-significant tokens from the query to improve query performance. If prune is true but the pruning_config is not specified, pruning will occur but default values will be used. Default: false').optional(),
  pruning_config: TokenPruningConfig.describe('Optional pruning configuration. If enabled, this will omit non-significant tokens from the query in order to improve query performance. This is only used if prune is set to true. If prune is set to true but pruning_config is not specified, default values will be used.').optional()
})

const QueryDslSparseVectorQueryExclusiveProps = z.union([z.object({ query_vector: z.record(z.string(), float) }), z.object({ inference_id: Id })])

export const QueryDslSparseVectorQuery = QueryDslSparseVectorQueryCommonProps.and(QueryDslSparseVectorQueryExclusiveProps).meta({ id: 'QueryDslSparseVectorQuery' })
export type QueryDslSparseVectorQuery = z.infer<typeof QueryDslSparseVectorQuery>

export const QueryDslTermQuery = z.object({
  ...QueryDslQueryBase.shape,
  value: FieldValue.describe('Term you wish to find in the provided field.'),
  case_insensitive: z.boolean().describe('Allows ASCII case insensitive matching of the value with the indexed field values when set to `true`. When `false`, the case sensitivity of matching depends on the underlying field’s mapping.').optional()
}).meta({ id: 'QueryDslTermQuery' })
export type QueryDslTermQuery = z.infer<typeof QueryDslTermQuery>

export const QueryDslTermsQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional()
}).catchall(z.any()).meta({ id: 'QueryDslTermsQuery' })
export type QueryDslTermsQuery = z.infer<typeof QueryDslTermsQuery>

export interface QueryDslTermsSetQueryShape {
  boost?: float | undefined
  query_name?: string | undefined
  minimum_should_match?: MinimumShouldMatch | undefined
  minimum_should_match_field?: Field | undefined
  minimum_should_match_script?: ScriptShape | undefined
  terms: FieldValue[]
}
export const QueryDslTermsSetQuery = z.object({
  boost: float.describe('Floating point number used to decrease or increase the relevance scores of the query. Boost values are relative to the default value of 1.0. A boost value between 0 and 1.0 decreases the relevance score. A value greater than 1.0 increases the relevance score.').optional(),
  query_name: z.string().optional(),
  minimum_should_match: MinimumShouldMatch.describe('Specification describing number of matching terms required to return a document.').optional(),
  minimum_should_match_field: Field.describe('Numeric field containing the number of matching terms required to return a document.').optional(),
  get minimum_should_match_script () { return Script.describe('Custom script containing the number of matching terms required to return a document.').optional() },
  terms: z.array(FieldValue).describe('Array of terms you wish to find in the provided field.')
}).meta({ id: 'QueryDslTermsSetQuery' })
export type QueryDslTermsSetQuery = z.infer<typeof QueryDslTermsSetQuery>

export const QueryDslTextExpansionQuery = z.object({
  ...QueryDslQueryBase.shape,
  model_id: z.string().describe('The text expansion NLP model to use'),
  model_text: z.string().describe('The query text'),
  pruning_config: TokenPruningConfig.describe('Token pruning configurations').optional()
}).meta({ id: 'QueryDslTextExpansionQuery' })
export type QueryDslTextExpansionQuery = z.infer<typeof QueryDslTextExpansionQuery>

export const QueryDslWeightedTokensQuery = z.object({
  ...QueryDslQueryBase.shape,
  tokens: z.union([z.record(z.string(), float), z.array(z.record(z.string(), float))]).describe('The tokens representing this query'),
  pruning_config: TokenPruningConfig.describe('Token pruning configurations').optional()
}).meta({ id: 'QueryDslWeightedTokensQuery' })
export type QueryDslWeightedTokensQuery = z.infer<typeof QueryDslWeightedTokensQuery>

export const QueryDslWildcardQuery = z.object({
  ...QueryDslQueryBase.shape,
  case_insensitive: z.boolean().describe('Allows case insensitive matching of the pattern with the indexed field values when set to true. Default is false which means the case sensitivity of matching depends on the underlying field’s mapping.').optional(),
  rewrite: MultiTermQueryRewrite.describe('Method used to rewrite the query.').optional(),
  value: z.string().describe('Wildcard pattern for terms you wish to find in the provided field. Required, when wildcard is not set.').optional(),
  wildcard: z.string().describe('Wildcard pattern for terms you wish to find in the provided field. Required, when value is not set.').optional()
}).meta({ id: 'QueryDslWildcardQuery' })
export type QueryDslWildcardQuery = z.infer<typeof QueryDslWildcardQuery>

export const QueryDslWrapperQuery = z.object({
  ...QueryDslQueryBase.shape,
  query: z.string().describe('A base64 encoded query. The binary data format can be any of JSON, YAML, CBOR or SMILE encodings')
}).meta({ id: 'QueryDslWrapperQuery' })
export type QueryDslWrapperQuery = z.infer<typeof QueryDslWrapperQuery>

export const QueryDslTypeQuery = z.object({
  ...QueryDslQueryBase.shape,
  value: z.string()
}).meta({ id: 'QueryDslTypeQuery' })
export type QueryDslTypeQuery = z.infer<typeof QueryDslTypeQuery>

const QueryDslQueryContainerExclusiveProps = z.union([z.object({ bool: z.lazy(() => QueryDslBoolQuery) }), z.object({ boosting: z.lazy(() => QueryDslBoostingQuery) }), z.object({ common: z.record(Field, QueryDslCommonTermsQuery) }), z.object({ combined_fields: QueryDslCombinedFieldsQuery }), z.object({ constant_score: z.lazy(() => QueryDslConstantScoreQuery) }), z.object({ dis_max: z.lazy(() => QueryDslDisMaxQuery) }), z.object({ distance_feature: QueryDslDistanceFeatureQuery }), z.object({ exists: QueryDslExistsQuery }), z.object({ function_score: z.lazy(() => QueryDslFunctionScoreQuery) }), z.object({ fuzzy: z.record(Field, QueryDslFuzzyQuery) }), z.object({ geo_bounding_box: QueryDslGeoBoundingBoxQuery }), z.object({ geo_distance: QueryDslGeoDistanceQuery }), z.object({ geo_grid: z.record(Field, QueryDslGeoGridQuery) }), z.object({ geo_polygon: QueryDslGeoPolygonQuery }), z.object({ geo_shape: QueryDslGeoShapeQuery }), z.object({ has_child: z.lazy(() => QueryDslHasChildQuery) }), z.object({ has_parent: z.lazy(() => QueryDslHasParentQuery) }), z.object({ ids: QueryDslIdsQuery }), z.object({ intervals: z.record(Field, z.lazy(() => QueryDslIntervalsQuery)) }), z.object({ knn: z.lazy(() => KnnQuery) }), z.object({ match: z.record(Field, QueryDslMatchQuery) }), z.object({ match_all: QueryDslMatchAllQuery }), z.object({ match_bool_prefix: z.record(Field, QueryDslMatchBoolPrefixQuery) }), z.object({ match_none: QueryDslMatchNoneQuery }), z.object({ match_phrase: z.record(Field, QueryDslMatchPhraseQuery) }), z.object({ match_phrase_prefix: z.record(Field, QueryDslMatchPhrasePrefixQuery) }), z.object({ more_like_this: QueryDslMoreLikeThisQuery }), z.object({ multi_match: QueryDslMultiMatchQuery }), z.object({ nested: z.lazy(() => QueryDslNestedQuery) }), z.object({ parent_id: QueryDslParentIdQuery }), z.object({ percolate: QueryDslPercolateQuery }), z.object({ pinned: z.lazy(() => QueryDslPinnedQuery) }), z.object({ prefix: z.record(Field, QueryDslPrefixQuery) }), z.object({ query_string: QueryDslQueryStringQuery }), z.object({ range: z.record(Field, QueryDslRangeQuery) }), z.object({ rank_feature: QueryDslRankFeatureQuery }), z.object({ regexp: z.record(Field, QueryDslRegexpQuery) }), z.object({ rule: z.lazy(() => QueryDslRuleQuery) }), z.object({ script: z.lazy(() => QueryDslScriptQuery) }), z.object({ script_score: z.lazy(() => QueryDslScriptScoreQuery) }), z.object({ semantic: QueryDslSemanticQuery }), z.object({ shape: QueryDslShapeQuery }), z.object({ simple_query_string: QueryDslSimpleQueryStringQuery }), z.object({ span_containing: z.lazy(() => QueryDslSpanContainingQuery) }), z.object({ span_field_masking: z.lazy(() => QueryDslSpanFieldMaskingQuery) }), z.object({ span_first: z.lazy(() => QueryDslSpanFirstQuery) }), z.object({ span_multi: z.lazy(() => QueryDslSpanMultiTermQuery) }), z.object({ span_near: z.lazy(() => QueryDslSpanNearQuery) }), z.object({ span_not: z.lazy(() => QueryDslSpanNotQuery) }), z.object({ span_or: z.lazy(() => QueryDslSpanOrQuery) }), z.object({ span_term: z.record(Field, QueryDslSpanTermQuery) }), z.object({ span_within: z.lazy(() => QueryDslSpanWithinQuery) }), z.object({ sparse_vector: QueryDslSparseVectorQuery }), z.object({ term: z.record(Field, QueryDslTermQuery) }), z.object({ terms: QueryDslTermsQuery }), z.object({ terms_set: z.record(Field, z.lazy(() => QueryDslTermsSetQuery)) }), z.object({ text_expansion: z.record(Field, QueryDslTextExpansionQuery) }), z.object({ weighted_tokens: z.record(Field, QueryDslWeightedTokensQuery) }), z.object({ wildcard: z.record(Field, QueryDslWildcardQuery) }), z.object({ wrapper: QueryDslWrapperQuery }), z.object({ type: QueryDslTypeQuery })])

export interface QueryDslQueryContainerShape {
  bool?: QueryDslBoolQuery | undefined
  boosting?: QueryDslBoostingQuery | undefined
  common?: Record<Field, QueryDslCommonTermsQuery> | undefined
  combined_fields?: QueryDslCombinedFieldsQuery | undefined
  constant_score?: QueryDslConstantScoreQuery | undefined
  dis_max?: QueryDslDisMaxQuery | undefined
  distance_feature?: QueryDslDistanceFeatureQuery | undefined
  exists?: QueryDslExistsQuery | undefined
  function_score?: QueryDslFunctionScoreQuery | undefined
  fuzzy?: Record<Field, QueryDslFuzzyQuery> | undefined
  geo_bounding_box?: QueryDslGeoBoundingBoxQuery | undefined
  geo_distance?: QueryDslGeoDistanceQuery | undefined
  geo_grid?: Record<Field, QueryDslGeoGridQuery> | undefined
  geo_polygon?: QueryDslGeoPolygonQuery | undefined
  geo_shape?: QueryDslGeoShapeQuery | undefined
  has_child?: QueryDslHasChildQuery | undefined
  has_parent?: QueryDslHasParentQuery | undefined
  ids?: QueryDslIdsQuery | undefined
  intervals?: Record<Field, QueryDslIntervalsQuery> | undefined
  knn?: KnnQuery | undefined
  match?: Record<Field, QueryDslMatchQuery> | undefined
  match_all?: QueryDslMatchAllQuery | undefined
  match_bool_prefix?: Record<Field, QueryDslMatchBoolPrefixQuery> | undefined
  match_none?: QueryDslMatchNoneQuery | undefined
  match_phrase?: Record<Field, QueryDslMatchPhraseQuery> | undefined
  match_phrase_prefix?: Record<Field, QueryDslMatchPhrasePrefixQuery> | undefined
  more_like_this?: QueryDslMoreLikeThisQuery | undefined
  multi_match?: QueryDslMultiMatchQuery | undefined
  nested?: QueryDslNestedQuery | undefined
  parent_id?: QueryDslParentIdQuery | undefined
  percolate?: QueryDslPercolateQuery | undefined
  pinned?: QueryDslPinnedQuery | undefined
  prefix?: Record<Field, QueryDslPrefixQuery> | undefined
  query_string?: QueryDslQueryStringQuery | undefined
  range?: Record<Field, QueryDslRangeQuery> | undefined
  rank_feature?: QueryDslRankFeatureQuery | undefined
  regexp?: Record<Field, QueryDslRegexpQuery> | undefined
  rule?: QueryDslRuleQuery | undefined
  script?: QueryDslScriptQuery | undefined
  script_score?: QueryDslScriptScoreQuery | undefined
  semantic?: QueryDslSemanticQuery | undefined
  shape?: QueryDslShapeQuery | undefined
  simple_query_string?: QueryDslSimpleQueryStringQuery | undefined
  span_containing?: QueryDslSpanContainingQuery | undefined
  span_field_masking?: QueryDslSpanFieldMaskingQuery | undefined
  span_first?: QueryDslSpanFirstQuery | undefined
  span_multi?: QueryDslSpanMultiTermQuery | undefined
  span_near?: QueryDslSpanNearQuery | undefined
  span_not?: QueryDslSpanNotQuery | undefined
  span_or?: QueryDslSpanOrQuery | undefined
  span_term?: Record<Field, QueryDslSpanTermQuery> | undefined
  span_within?: QueryDslSpanWithinQuery | undefined
  sparse_vector?: QueryDslSparseVectorQuery | undefined
  term?: Record<Field, QueryDslTermQuery> | undefined
  terms?: QueryDslTermsQuery | undefined
  terms_set?: Record<Field, QueryDslTermsSetQuery> | undefined
  text_expansion?: Record<Field, QueryDslTextExpansionQuery> | undefined
  weighted_tokens?: Record<Field, QueryDslWeightedTokensQuery> | undefined
  wildcard?: Record<Field, QueryDslWildcardQuery> | undefined
  wrapper?: QueryDslWrapperQuery | undefined
  type?: QueryDslTypeQuery | undefined
}
/** An Elasticsearch Query DSL (Domain Specific Language) object that defines a query. */
export const QueryDslQueryContainer: z.ZodType<QueryDslQueryContainerShape> = QueryDslQueryContainerExclusiveProps.meta({ id: 'QueryDslQueryContainer' })
export type QueryDslQueryContainer = z.infer<typeof QueryDslQueryContainer>

export const SearchHighlighterOrder = z.enum(['score']).meta({ id: 'SearchHighlighterOrder' })
export type SearchHighlighterOrder = z.infer<typeof SearchHighlighterOrder>

export const SearchHighlighterTagsSchema = z.enum(['styled']).meta({ id: 'SearchHighlighterTagsSchema' })
export type SearchHighlighterTagsSchema = z.infer<typeof SearchHighlighterTagsSchema>

export interface SearchHighlightBaseShape {
  type?: SearchHighlighterType | undefined
  boundary_chars?: string | undefined
  boundary_max_scan?: integer | undefined
  boundary_scanner?: SearchBoundaryScanner | undefined
  boundary_scanner_locale?: string | undefined
  force_source?: boolean | undefined
  fragmenter?: SearchHighlighterFragmenter | undefined
  fragment_size?: integer | undefined
  highlight_filter?: boolean | undefined
  highlight_query?: QueryDslQueryContainerShape | undefined
  max_fragment_length?: integer | undefined
  max_analyzed_offset?: integer | undefined
  no_match_size?: integer | undefined
  number_of_fragments?: integer | undefined
  options?: Record<string, unknown> | undefined
  order?: SearchHighlighterOrder | undefined
  phrase_limit?: integer | undefined
  post_tags?: string[] | undefined
  pre_tags?: string[] | undefined
  require_field_match?: boolean | undefined
  tags_schema?: SearchHighlighterTagsSchema | undefined
}
export const SearchHighlightBase = z.object({
  type: SearchHighlighterType.optional(),
  boundary_chars: z.string().describe('A string that contains each boundary character.').optional(),
  boundary_max_scan: integer.describe('How far to scan for boundary characters.').optional(),
  boundary_scanner: SearchBoundaryScanner.describe('Specifies how to break the highlighted fragments: chars, sentence, or word. Only valid for the unified and fvh highlighters. Defaults to `sentence` for the `unified` highlighter. Defaults to `chars` for the `fvh` highlighter.').optional(),
  boundary_scanner_locale: z.string().describe('Controls which locale is used to search for sentence and word boundaries. This parameter takes a form of a language tag, for example: `"en-US"`, `"fr-FR"`, `"ja-JP"`.').optional(),
  force_source: z.boolean().optional(),
  fragmenter: SearchHighlighterFragmenter.describe('Specifies how text should be broken up in highlight snippets: `simple` or `span`. Only valid for the `plain` highlighter.').optional(),
  fragment_size: integer.describe('The size of the highlighted fragment in characters.').optional(),
  highlight_filter: z.boolean().optional(),
  get highlight_query () { return QueryDslQueryContainer.describe('Highlight matches for a query other than the search query. This is especially useful if you use a rescore query because those are not taken into account by highlighting by default.').optional() },
  max_fragment_length: integer.optional(),
  max_analyzed_offset: integer.describe('If set to a non-negative value, highlighting stops at this defined maximum limit. The rest of the text is not processed, thus not highlighted and no error is returned The `max_analyzed_offset` query setting does not override the `index.highlight.max_analyzed_offset` setting, which prevails when it’s set to lower value than the query setting.').optional(),
  no_match_size: integer.describe('The amount of text you want to return from the beginning of the field if there are no matching fragments to highlight.').optional(),
  number_of_fragments: integer.describe('The maximum number of fragments to return. If the number of fragments is set to `0`, no fragments are returned. Instead, the entire field contents are highlighted and returned. This can be handy when you need to highlight short texts such as a title or address, but fragmentation is not required. If `number_of_fragments` is `0`, `fragment_size` is ignored.').optional(),
  options: z.record(z.string(), z.any()).optional(),
  order: SearchHighlighterOrder.describe('Sorts highlighted fragments by score when set to `score`. By default, fragments will be output in the order they appear in the field (order: `none`). Setting this option to `score` will output the most relevant fragments first. Each highlighter applies its own logic to compute relevancy scores.').optional(),
  phrase_limit: integer.describe('Controls the number of matching phrases in a document that are considered. Prevents the `fvh` highlighter from analyzing too many phrases and consuming too much memory. When using `matched_fields`, `phrase_limit` phrases per matched field are considered. Raising the limit increases query time and consumes more memory. Only supported by the `fvh` highlighter.').optional(),
  post_tags: z.array(z.string()).describe('Use in conjunction with `pre_tags` to define the HTML tags to use for the highlighted text. By default, highlighted text is wrapped in `<em>` and `</em>` tags.').optional(),
  pre_tags: z.array(z.string()).describe('Use in conjunction with `post_tags` to define the HTML tags to use for the highlighted text. By default, highlighted text is wrapped in `<em>` and `</em>` tags.').optional(),
  require_field_match: z.boolean().describe('By default, only fields that contains a query match are highlighted. Set to `false` to highlight all fields.').optional(),
  tags_schema: SearchHighlighterTagsSchema.describe('Set to `styled` to use the built-in tag schema.').optional()
}).meta({ id: 'SearchHighlightBase' })
export type SearchHighlightBase = z.infer<typeof SearchHighlightBase>

export const SearchHighlighterEncoder = z.enum(['default', 'html']).meta({ id: 'SearchHighlighterEncoder' })
export type SearchHighlighterEncoder = z.infer<typeof SearchHighlighterEncoder>

export interface SearchHighlightFieldShape {
  type?: SearchHighlighterType | undefined
  boundary_chars?: string | undefined
  boundary_max_scan?: integer | undefined
  boundary_scanner?: SearchBoundaryScanner | undefined
  boundary_scanner_locale?: string | undefined
  force_source?: boolean | undefined
  fragmenter?: SearchHighlighterFragmenter | undefined
  fragment_size?: integer | undefined
  highlight_filter?: boolean | undefined
  highlight_query?: QueryDslQueryContainerShape | undefined
  max_fragment_length?: integer | undefined
  max_analyzed_offset?: integer | undefined
  no_match_size?: integer | undefined
  number_of_fragments?: integer | undefined
  options?: Record<string, unknown> | undefined
  order?: SearchHighlighterOrder | undefined
  phrase_limit?: integer | undefined
  post_tags?: string[] | undefined
  pre_tags?: string[] | undefined
  require_field_match?: boolean | undefined
  tags_schema?: SearchHighlighterTagsSchema | undefined
  fragment_offset?: integer | undefined
  matched_fields?: Fields | undefined
}
export const SearchHighlightField = z.object({
  type: SearchHighlighterType.optional(),
  boundary_chars: z.string().describe('A string that contains each boundary character.').optional(),
  boundary_max_scan: integer.describe('How far to scan for boundary characters.').optional(),
  boundary_scanner: SearchBoundaryScanner.describe('Specifies how to break the highlighted fragments: chars, sentence, or word. Only valid for the unified and fvh highlighters. Defaults to `sentence` for the `unified` highlighter. Defaults to `chars` for the `fvh` highlighter.').optional(),
  boundary_scanner_locale: z.string().describe('Controls which locale is used to search for sentence and word boundaries. This parameter takes a form of a language tag, for example: `"en-US"`, `"fr-FR"`, `"ja-JP"`.').optional(),
  force_source: z.boolean().optional(),
  fragmenter: SearchHighlighterFragmenter.describe('Specifies how text should be broken up in highlight snippets: `simple` or `span`. Only valid for the `plain` highlighter.').optional(),
  fragment_size: integer.describe('The size of the highlighted fragment in characters.').optional(),
  highlight_filter: z.boolean().optional(),
  get highlight_query () { return QueryDslQueryContainer.describe('Highlight matches for a query other than the search query. This is especially useful if you use a rescore query because those are not taken into account by highlighting by default.').optional() },
  max_fragment_length: integer.optional(),
  max_analyzed_offset: integer.describe('If set to a non-negative value, highlighting stops at this defined maximum limit. The rest of the text is not processed, thus not highlighted and no error is returned The `max_analyzed_offset` query setting does not override the `index.highlight.max_analyzed_offset` setting, which prevails when it’s set to lower value than the query setting.').optional(),
  no_match_size: integer.describe('The amount of text you want to return from the beginning of the field if there are no matching fragments to highlight.').optional(),
  number_of_fragments: integer.describe('The maximum number of fragments to return. If the number of fragments is set to `0`, no fragments are returned. Instead, the entire field contents are highlighted and returned. This can be handy when you need to highlight short texts such as a title or address, but fragmentation is not required. If `number_of_fragments` is `0`, `fragment_size` is ignored.').optional(),
  options: z.record(z.string(), z.any()).optional(),
  order: SearchHighlighterOrder.describe('Sorts highlighted fragments by score when set to `score`. By default, fragments will be output in the order they appear in the field (order: `none`). Setting this option to `score` will output the most relevant fragments first. Each highlighter applies its own logic to compute relevancy scores.').optional(),
  phrase_limit: integer.describe('Controls the number of matching phrases in a document that are considered. Prevents the `fvh` highlighter from analyzing too many phrases and consuming too much memory. When using `matched_fields`, `phrase_limit` phrases per matched field are considered. Raising the limit increases query time and consumes more memory. Only supported by the `fvh` highlighter.').optional(),
  post_tags: z.array(z.string()).describe('Use in conjunction with `pre_tags` to define the HTML tags to use for the highlighted text. By default, highlighted text is wrapped in `<em>` and `</em>` tags.').optional(),
  pre_tags: z.array(z.string()).describe('Use in conjunction with `post_tags` to define the HTML tags to use for the highlighted text. By default, highlighted text is wrapped in `<em>` and `</em>` tags.').optional(),
  require_field_match: z.boolean().describe('By default, only fields that contains a query match are highlighted. Set to `false` to highlight all fields.').optional(),
  tags_schema: SearchHighlighterTagsSchema.describe('Set to `styled` to use the built-in tag schema.').optional(),
  fragment_offset: integer.optional(),
  matched_fields: Fields.optional()
}).meta({ id: 'SearchHighlightField' })
export type SearchHighlightField = z.infer<typeof SearchHighlightField>

export interface SearchHighlightShape {
  type?: SearchHighlighterType | undefined
  boundary_chars?: string | undefined
  boundary_max_scan?: integer | undefined
  boundary_scanner?: SearchBoundaryScanner | undefined
  boundary_scanner_locale?: string | undefined
  force_source?: boolean | undefined
  fragmenter?: SearchHighlighterFragmenter | undefined
  fragment_size?: integer | undefined
  highlight_filter?: boolean | undefined
  highlight_query?: QueryDslQueryContainerShape | undefined
  max_fragment_length?: integer | undefined
  max_analyzed_offset?: integer | undefined
  no_match_size?: integer | undefined
  number_of_fragments?: integer | undefined
  options?: Record<string, unknown> | undefined
  order?: SearchHighlighterOrder | undefined
  phrase_limit?: integer | undefined
  post_tags?: string[] | undefined
  pre_tags?: string[] | undefined
  require_field_match?: boolean | undefined
  tags_schema?: SearchHighlighterTagsSchema | undefined
  encoder?: SearchHighlighterEncoder | undefined
  fields: Record<Field, SearchHighlightFieldShape> | Array<Record<Field, SearchHighlightFieldShape>>
}
export const SearchHighlight = z.object({
  type: SearchHighlighterType.optional(),
  boundary_chars: z.string().describe('A string that contains each boundary character.').optional(),
  boundary_max_scan: integer.describe('How far to scan for boundary characters.').optional(),
  boundary_scanner: SearchBoundaryScanner.describe('Specifies how to break the highlighted fragments: chars, sentence, or word. Only valid for the unified and fvh highlighters. Defaults to `sentence` for the `unified` highlighter. Defaults to `chars` for the `fvh` highlighter.').optional(),
  boundary_scanner_locale: z.string().describe('Controls which locale is used to search for sentence and word boundaries. This parameter takes a form of a language tag, for example: `"en-US"`, `"fr-FR"`, `"ja-JP"`.').optional(),
  force_source: z.boolean().optional(),
  fragmenter: SearchHighlighterFragmenter.describe('Specifies how text should be broken up in highlight snippets: `simple` or `span`. Only valid for the `plain` highlighter.').optional(),
  fragment_size: integer.describe('The size of the highlighted fragment in characters.').optional(),
  highlight_filter: z.boolean().optional(),
  get highlight_query () { return QueryDslQueryContainer.describe('Highlight matches for a query other than the search query. This is especially useful if you use a rescore query because those are not taken into account by highlighting by default.').optional() },
  max_fragment_length: integer.optional(),
  max_analyzed_offset: integer.describe('If set to a non-negative value, highlighting stops at this defined maximum limit. The rest of the text is not processed, thus not highlighted and no error is returned The `max_analyzed_offset` query setting does not override the `index.highlight.max_analyzed_offset` setting, which prevails when it’s set to lower value than the query setting.').optional(),
  no_match_size: integer.describe('The amount of text you want to return from the beginning of the field if there are no matching fragments to highlight.').optional(),
  number_of_fragments: integer.describe('The maximum number of fragments to return. If the number of fragments is set to `0`, no fragments are returned. Instead, the entire field contents are highlighted and returned. This can be handy when you need to highlight short texts such as a title or address, but fragmentation is not required. If `number_of_fragments` is `0`, `fragment_size` is ignored.').optional(),
  options: z.record(z.string(), z.any()).optional(),
  order: SearchHighlighterOrder.describe('Sorts highlighted fragments by score when set to `score`. By default, fragments will be output in the order they appear in the field (order: `none`). Setting this option to `score` will output the most relevant fragments first. Each highlighter applies its own logic to compute relevancy scores.').optional(),
  phrase_limit: integer.describe('Controls the number of matching phrases in a document that are considered. Prevents the `fvh` highlighter from analyzing too many phrases and consuming too much memory. When using `matched_fields`, `phrase_limit` phrases per matched field are considered. Raising the limit increases query time and consumes more memory. Only supported by the `fvh` highlighter.').optional(),
  post_tags: z.array(z.string()).describe('Use in conjunction with `pre_tags` to define the HTML tags to use for the highlighted text. By default, highlighted text is wrapped in `<em>` and `</em>` tags.').optional(),
  pre_tags: z.array(z.string()).describe('Use in conjunction with `post_tags` to define the HTML tags to use for the highlighted text. By default, highlighted text is wrapped in `<em>` and `</em>` tags.').optional(),
  require_field_match: z.boolean().describe('By default, only fields that contains a query match are highlighted. Set to `false` to highlight all fields.').optional(),
  tags_schema: SearchHighlighterTagsSchema.describe('Set to `styled` to use the built-in tag schema.').optional(),
  encoder: SearchHighlighterEncoder.optional(),
  get fields (): z.ZodUnion<readonly [z.ZodRecord<typeof Field, typeof SearchHighlightField>, z.ZodArray<z.ZodRecord<typeof Field, typeof SearchHighlightField>>]> { return z.union([z.record(Field, SearchHighlightField), z.array(z.record(Field, SearchHighlightField))]) }
}).meta({ id: 'SearchHighlight' })
export type SearchHighlight = z.infer<typeof SearchHighlight>

export interface SearchInnerHitsShape {
  name?: Name | undefined
  size?: integer | undefined
  from?: integer | undefined
  collapse?: SearchFieldCollapseShape | undefined
  docvalue_fields?: QueryDslFieldAndFormat[] | undefined
  explain?: boolean | undefined
  highlight?: SearchHighlightShape | undefined
  ignore_unmapped?: boolean | undefined
  script_fields?: Record<Field, ScriptFieldShape> | undefined
  seq_no_primary_term?: boolean | undefined
  fields?: Field[] | undefined
  sort?: SortShape | undefined
  _source?: SearchSourceConfig | undefined
  stored_fields?: Fields | undefined
  track_scores?: boolean | undefined
  version?: boolean | undefined
}
export const SearchInnerHits = z.object({
  name: Name.describe('The name for the particular inner hit definition in the response. Useful when a search request contains multiple inner hits.').optional(),
  size: integer.describe('The maximum number of hits to return per `inner_hits`.').optional(),
  from: integer.describe('Inner hit starting document offset.').optional(),
  get collapse () { return SearchFieldCollapse.optional() },
  docvalue_fields: z.array(QueryDslFieldAndFormat).optional(),
  explain: z.boolean().optional(),
  get highlight () { return SearchHighlight.optional() },
  ignore_unmapped: z.boolean().optional(),
  get script_fields (): z.ZodOptional<z.ZodRecord<typeof Field, typeof ScriptField>> { return z.record(Field, ScriptField).optional() },
  seq_no_primary_term: z.boolean().optional(),
  fields: z.array(Field).optional(),
  get sort () { return Sort.describe('How the inner hits should be sorted per `inner_hits`. By default, inner hits are sorted by score.').optional() },
  _source: SearchSourceConfig.optional(),
  stored_fields: Fields.optional(),
  track_scores: z.boolean().optional(),
  version: z.boolean().optional()
}).meta({ id: 'SearchInnerHits' })
export type SearchInnerHits = z.infer<typeof SearchInnerHits>

export interface SearchFieldCollapseShape {
  field: Field
  inner_hits?: SearchInnerHitsShape | SearchInnerHitsShape[] | undefined
  max_concurrent_group_searches?: integer | undefined
  collapse?: SearchFieldCollapseShape | undefined
}
export const SearchFieldCollapse = z.object({
  field: Field.describe('The field to collapse the result set on'),
  get inner_hits (): z.ZodOptional<z.ZodUnion<readonly [typeof SearchInnerHits, z.ZodArray<typeof SearchInnerHits>]>> { return z.union([SearchInnerHits, SearchInnerHits.array()]).describe('The number of inner hits and their sort order').optional() },
  max_concurrent_group_searches: integer.describe('The number of concurrent requests allowed to retrieve the inner_hits per group').optional(),
  get collapse () { return SearchFieldCollapse.optional() }
}).meta({ id: 'SearchFieldCollapse' })
export type SearchFieldCollapse = z.infer<typeof SearchFieldCollapse>

/**
 * Some APIs will return values such as numbers also as a string (notably epoch timestamps). This behavior
 * is used to capture this behavior while keeping the semantics of the field type.
 *
 * Depending on the target language, code generators can keep the union or remove it and leniently parse
 * strings to the target type.
 */
export const SpecUtilsStringified = z.union([z.any(), z.string()]).meta({ id: 'SpecUtilsStringified' })
export type SpecUtilsStringified = z.infer<typeof SpecUtilsStringified>

export const ByteSize = z.union([long, z.string()]).meta({ id: 'ByteSize' })
export type ByteSize = z.infer<typeof ByteSize>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

export const AnalysisTokenFilterBase = z.object({
  version: VersionString.optional()
}).meta({ id: 'AnalysisTokenFilterBase' })
export type AnalysisTokenFilterBase = z.infer<typeof AnalysisTokenFilterBase>

export const AnalysisApostropheTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('apostrophe')
}).meta({ id: 'AnalysisApostropheTokenFilter' })
export type AnalysisApostropheTokenFilter = z.infer<typeof AnalysisApostropheTokenFilter>

export const AnalysisArabicNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('arabic_normalization')
}).meta({ id: 'AnalysisArabicNormalizationTokenFilter' })
export type AnalysisArabicNormalizationTokenFilter = z.infer<typeof AnalysisArabicNormalizationTokenFilter>

export const AnalysisArabicStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('arabic_stem')
}).meta({ id: 'AnalysisArabicStemTokenFilter' })
export type AnalysisArabicStemTokenFilter = z.infer<typeof AnalysisArabicStemTokenFilter>

export const AnalysisAsciiFoldingTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('asciifolding'),
  preserve_original: SpecUtilsStringified.describe('If `true`, emit both original tokens and folded tokens. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisAsciiFoldingTokenFilter' })
export type AnalysisAsciiFoldingTokenFilter = z.infer<typeof AnalysisAsciiFoldingTokenFilter>

export const AnalysisBengaliNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('bengali_normalization')
}).meta({ id: 'AnalysisBengaliNormalizationTokenFilter' })
export type AnalysisBengaliNormalizationTokenFilter = z.infer<typeof AnalysisBengaliNormalizationTokenFilter>

export const AnalysisBrazilianStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('brazilian_stem')
}).meta({ id: 'AnalysisBrazilianStemTokenFilter' })
export type AnalysisBrazilianStemTokenFilter = z.infer<typeof AnalysisBrazilianStemTokenFilter>

export const AnalysisCharFilterBase = z.object({
  version: VersionString.optional()
}).meta({ id: 'AnalysisCharFilterBase' })
export type AnalysisCharFilterBase = z.infer<typeof AnalysisCharFilterBase>

export const AnalysisHtmlStripCharFilter = z.object({
  ...AnalysisCharFilterBase.shape,
  type: z.literal('html_strip'),
  escaped_tags: z.array(z.string()).optional()
}).meta({ id: 'AnalysisHtmlStripCharFilter' })
export type AnalysisHtmlStripCharFilter = z.infer<typeof AnalysisHtmlStripCharFilter>

export const AnalysisMappingCharFilter = z.object({
  ...AnalysisCharFilterBase.shape,
  type: z.literal('mapping'),
  mappings: z.array(z.string()).optional(),
  mappings_path: z.string().optional()
}).meta({ id: 'AnalysisMappingCharFilter' })
export type AnalysisMappingCharFilter = z.infer<typeof AnalysisMappingCharFilter>

export const AnalysisPatternReplaceCharFilter = z.object({
  ...AnalysisCharFilterBase.shape,
  type: z.literal('pattern_replace'),
  flags: z.string().optional(),
  pattern: z.string(),
  replacement: z.string().optional()
}).meta({ id: 'AnalysisPatternReplaceCharFilter' })
export type AnalysisPatternReplaceCharFilter = z.infer<typeof AnalysisPatternReplaceCharFilter>

export const AnalysisIcuNormalizationMode = z.enum(['decompose', 'compose']).meta({ id: 'AnalysisIcuNormalizationMode' })
export type AnalysisIcuNormalizationMode = z.infer<typeof AnalysisIcuNormalizationMode>

export const AnalysisIcuNormalizationType = z.enum(['nfc', 'nfkc', 'nfkc_cf']).meta({ id: 'AnalysisIcuNormalizationType' })
export type AnalysisIcuNormalizationType = z.infer<typeof AnalysisIcuNormalizationType>

export const AnalysisIcuNormalizationCharFilter = z.object({
  ...AnalysisCharFilterBase.shape,
  type: z.literal('icu_normalizer'),
  mode: AnalysisIcuNormalizationMode.optional(),
  name: AnalysisIcuNormalizationType.optional(),
  unicode_set_filter: z.string().optional()
}).meta({ id: 'AnalysisIcuNormalizationCharFilter' })
export type AnalysisIcuNormalizationCharFilter = z.infer<typeof AnalysisIcuNormalizationCharFilter>

export const AnalysisKuromojiIterationMarkCharFilter = z.object({
  ...AnalysisCharFilterBase.shape,
  type: z.literal('kuromoji_iteration_mark'),
  normalize_kana: z.boolean(),
  normalize_kanji: z.boolean()
}).meta({ id: 'AnalysisKuromojiIterationMarkCharFilter' })
export type AnalysisKuromojiIterationMarkCharFilter = z.infer<typeof AnalysisKuromojiIterationMarkCharFilter>

export const AnalysisCharFilterDefinition = z.union([AnalysisHtmlStripCharFilter, AnalysisMappingCharFilter, AnalysisPatternReplaceCharFilter, AnalysisIcuNormalizationCharFilter, AnalysisKuromojiIterationMarkCharFilter]).meta({ id: 'AnalysisCharFilterDefinition' })
export type AnalysisCharFilterDefinition = z.infer<typeof AnalysisCharFilterDefinition>

export const AnalysisCharFilter = z.union([z.string(), AnalysisCharFilterDefinition]).meta({ id: 'AnalysisCharFilter' })
export type AnalysisCharFilter = z.infer<typeof AnalysisCharFilter>

export const AnalysisTokenizerBase = z.object({
  version: VersionString.optional()
}).meta({ id: 'AnalysisTokenizerBase' })
export type AnalysisTokenizerBase = z.infer<typeof AnalysisTokenizerBase>

export const AnalysisCharGroupTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('char_group'),
  tokenize_on_chars: z.array(z.string()),
  max_token_length: integer.optional()
}).meta({ id: 'AnalysisCharGroupTokenizer' })
export type AnalysisCharGroupTokenizer = z.infer<typeof AnalysisCharGroupTokenizer>

export const AnalysisCjkBigramIgnoredScript = z.enum(['han', 'hangul', 'hiragana', 'katakana']).meta({ id: 'AnalysisCjkBigramIgnoredScript' })
export type AnalysisCjkBigramIgnoredScript = z.infer<typeof AnalysisCjkBigramIgnoredScript>

export const AnalysisCjkBigramTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('cjk_bigram'),
  ignored_scripts: z.array(AnalysisCjkBigramIgnoredScript).describe('Array of character scripts for which to disable bigrams.').optional(),
  output_unigrams: z.boolean().describe('If `true`, emit tokens in both bigram and unigram form. If `false`, a CJK character is output in unigram form when it has no adjacent characters. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisCjkBigramTokenFilter' })
export type AnalysisCjkBigramTokenFilter = z.infer<typeof AnalysisCjkBigramTokenFilter>

export const AnalysisCjkWidthTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('cjk_width')
}).meta({ id: 'AnalysisCjkWidthTokenFilter' })
export type AnalysisCjkWidthTokenFilter = z.infer<typeof AnalysisCjkWidthTokenFilter>

export const AnalysisClassicTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('classic')
}).meta({ id: 'AnalysisClassicTokenFilter' })
export type AnalysisClassicTokenFilter = z.infer<typeof AnalysisClassicTokenFilter>

export const AnalysisClassicTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('classic'),
  max_token_length: integer.optional()
}).meta({ id: 'AnalysisClassicTokenizer' })
export type AnalysisClassicTokenizer = z.infer<typeof AnalysisClassicTokenizer>

export const AnalysisCommonGramsTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('common_grams'),
  common_words: z.array(z.string()).describe('A list of tokens. The filter generates bigrams for these tokens. Either this or the `common_words_path` parameter is required.').optional(),
  common_words_path: z.string().describe('Path to a file containing a list of tokens. The filter generates bigrams for these tokens. This path must be absolute or relative to the `config` location. The file must be UTF-8 encoded. Each token in the file must be separated by a line break. Either this or the `common_words` parameter is required.').optional(),
  ignore_case: z.boolean().describe('If `true`, matches for common words matching are case-insensitive. Defaults to `false`.').optional(),
  query_mode: z.boolean().describe('If `true`, the filter excludes the following tokens from the output: - Unigrams for common words - Unigrams for terms followed by common words Defaults to `false`. We recommend enabling this parameter for search analyzers.').optional()
}).meta({ id: 'AnalysisCommonGramsTokenFilter' })
export type AnalysisCommonGramsTokenFilter = z.infer<typeof AnalysisCommonGramsTokenFilter>

export const AnalysisCompoundWordTokenFilterBase = z.object({
  ...AnalysisTokenFilterBase.shape,
  max_subword_size: integer.describe('Maximum subword character length. Longer subword tokens are excluded from the output. Defaults to `15`.').optional(),
  min_subword_size: integer.describe('Minimum subword character length. Shorter subword tokens are excluded from the output. Defaults to `2`.').optional(),
  min_word_size: integer.describe('Minimum word character length. Shorter word tokens are excluded from the output. Defaults to `5`.').optional(),
  only_longest_match: z.boolean().describe('If `true`, only include the longest matching subword. Defaults to `false`.').optional(),
  word_list: z.array(z.string()).describe('A list of subwords to look for in the token stream. If found, the subword is included in the token output. Either this parameter or `word_list_path` must be specified.').optional(),
  word_list_path: z.string().describe('Path to a file that contains a list of subwords to find in the token stream. If found, the subword is included in the token output. This path must be absolute or relative to the config location, and the file must be UTF-8 encoded. Each token in the file must be separated by a line break. Either this parameter or `word_list` must be specified.').optional()
}).meta({ id: 'AnalysisCompoundWordTokenFilterBase' })
export type AnalysisCompoundWordTokenFilterBase = z.infer<typeof AnalysisCompoundWordTokenFilterBase>

export const AnalysisConditionTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('condition'),
  filter: z.array(z.string()).describe('Array of token filters. If a token matches the predicate script in the `script` parameter, these filters are applied to the token in the order provided.'),
  script: z.lazy(() => Script).describe('Predicate script used to apply token filters. If a token matches this script, the filters in the `filter` parameter are applied to the token.')
}).meta({ id: 'AnalysisConditionTokenFilter' })
export type AnalysisConditionTokenFilter = z.infer<typeof AnalysisConditionTokenFilter>

export const AnalysisCzechStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('czech_stem')
}).meta({ id: 'AnalysisCzechStemTokenFilter' })
export type AnalysisCzechStemTokenFilter = z.infer<typeof AnalysisCzechStemTokenFilter>

export const AnalysisDecimalDigitTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('decimal_digit')
}).meta({ id: 'AnalysisDecimalDigitTokenFilter' })
export type AnalysisDecimalDigitTokenFilter = z.infer<typeof AnalysisDecimalDigitTokenFilter>

export const AnalysisDelimitedPayloadEncoding = z.enum(['int', 'float', 'identity']).meta({ id: 'AnalysisDelimitedPayloadEncoding' })
export type AnalysisDelimitedPayloadEncoding = z.infer<typeof AnalysisDelimitedPayloadEncoding>

export const AnalysisDelimitedPayloadTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('delimited_payload'),
  delimiter: z.string().describe('Character used to separate tokens from payloads. Defaults to `|`.').optional(),
  encoding: AnalysisDelimitedPayloadEncoding.describe('Data type for the stored payload.').optional()
}).meta({ id: 'AnalysisDelimitedPayloadTokenFilter' })
export type AnalysisDelimitedPayloadTokenFilter = z.infer<typeof AnalysisDelimitedPayloadTokenFilter>

export const AnalysisDictionaryDecompounderTokenFilter = z.object({
  ...AnalysisCompoundWordTokenFilterBase.shape,
  type: z.literal('dictionary_decompounder')
}).meta({ id: 'AnalysisDictionaryDecompounderTokenFilter' })
export type AnalysisDictionaryDecompounderTokenFilter = z.infer<typeof AnalysisDictionaryDecompounderTokenFilter>

export const AnalysisDutchStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('dutch_stem')
}).meta({ id: 'AnalysisDutchStemTokenFilter' })
export type AnalysisDutchStemTokenFilter = z.infer<typeof AnalysisDutchStemTokenFilter>

export const AnalysisEdgeNGramSide = z.enum(['front', 'back']).meta({ id: 'AnalysisEdgeNGramSide' })
export type AnalysisEdgeNGramSide = z.infer<typeof AnalysisEdgeNGramSide>

export const AnalysisEdgeNGramTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('edge_ngram'),
  max_gram: integer.describe('Maximum character length of a gram. For custom token filters, defaults to `2`. For the built-in edge_ngram filter, defaults to `1`.').optional(),
  min_gram: integer.describe('Minimum character length of a gram. Defaults to `1`.').optional(),
  side: AnalysisEdgeNGramSide.describe('Indicates whether to truncate tokens from the `front` or `back`. Defaults to `front`.').optional(),
  preserve_original: SpecUtilsStringified.describe('Emits original token when set to `true`. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisEdgeNGramTokenFilter' })
export type AnalysisEdgeNGramTokenFilter = z.infer<typeof AnalysisEdgeNGramTokenFilter>

export const AnalysisTokenChar = z.enum(['letter', 'digit', 'whitespace', 'punctuation', 'symbol', 'custom']).meta({ id: 'AnalysisTokenChar' })
export type AnalysisTokenChar = z.infer<typeof AnalysisTokenChar>

export const AnalysisEdgeNGramTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('edge_ngram'),
  custom_token_chars: z.string().optional(),
  max_gram: integer.optional(),
  min_gram: integer.optional(),
  token_chars: z.array(AnalysisTokenChar).optional()
}).meta({ id: 'AnalysisEdgeNGramTokenizer' })
export type AnalysisEdgeNGramTokenizer = z.infer<typeof AnalysisEdgeNGramTokenizer>

export const AnalysisElisionTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('elision'),
  articles: z.array(z.string()).describe('List of elisions to remove. To be removed, the elision must be at the beginning of a token and be immediately followed by an apostrophe. Both the elision and apostrophe are removed. For custom `elision` filters, either this parameter or `articles_path` must be specified.').optional(),
  articles_path: z.string().describe('Path to a file that contains a list of elisions to remove. This path must be absolute or relative to the `config` location, and the file must be UTF-8 encoded. Each elision in the file must be separated by a line break. To be removed, the elision must be at the beginning of a token and be immediately followed by an apostrophe. Both the elision and apostrophe are removed. For custom `elision` filters, either this parameter or `articles` must be specified.').optional(),
  articles_case: SpecUtilsStringified.describe('If `true`, elision matching is case insensitive. If `false`, elision matching is case sensitive. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisElisionTokenFilter' })
export type AnalysisElisionTokenFilter = z.infer<typeof AnalysisElisionTokenFilter>

export const AnalysisFingerprintTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('fingerprint'),
  max_output_size: integer.describe('Maximum character length, including whitespace, of the output token. Defaults to `255`. Concatenated tokens longer than this will result in no token output.').optional(),
  separator: z.string().describe('Character to use to concatenate the token stream input. Defaults to a space.').optional()
}).meta({ id: 'AnalysisFingerprintTokenFilter' })
export type AnalysisFingerprintTokenFilter = z.infer<typeof AnalysisFingerprintTokenFilter>

export const AnalysisFlattenGraphTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('flatten_graph')
}).meta({ id: 'AnalysisFlattenGraphTokenFilter' })
export type AnalysisFlattenGraphTokenFilter = z.infer<typeof AnalysisFlattenGraphTokenFilter>

export const AnalysisFrenchStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('french_stem')
}).meta({ id: 'AnalysisFrenchStemTokenFilter' })
export type AnalysisFrenchStemTokenFilter = z.infer<typeof AnalysisFrenchStemTokenFilter>

export const AnalysisGermanNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('german_normalization')
}).meta({ id: 'AnalysisGermanNormalizationTokenFilter' })
export type AnalysisGermanNormalizationTokenFilter = z.infer<typeof AnalysisGermanNormalizationTokenFilter>

export const AnalysisGermanStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('german_stem')
}).meta({ id: 'AnalysisGermanStemTokenFilter' })
export type AnalysisGermanStemTokenFilter = z.infer<typeof AnalysisGermanStemTokenFilter>

export const AnalysisHindiNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('hindi_normalization')
}).meta({ id: 'AnalysisHindiNormalizationTokenFilter' })
export type AnalysisHindiNormalizationTokenFilter = z.infer<typeof AnalysisHindiNormalizationTokenFilter>

export const AnalysisHunspellTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('hunspell'),
  dedup: z.boolean().describe('If `true`, duplicate tokens are removed from the filter’s output. Defaults to `true`.').optional(),
  dictionary: z.string().describe('One or more `.dic` files (e.g, `en_US.dic`, my_custom.dic) to use for the Hunspell dictionary. By default, the `hunspell` filter uses all `.dic` files in the `<$ES_PATH_CONF>/hunspell/<locale>` directory specified using the `lang`, `language`, or `locale` parameter.').optional(),
  locale: z.string().describe('Locale directory used to specify the `.aff` and `.dic` files for a Hunspell dictionary.'),
  lang: z.string().describe('Locale directory used to specify the `.aff` and `.dic` files for a Hunspell dictionary.'),
  language: z.string().describe('Locale directory used to specify the `.aff` and `.dic` files for a Hunspell dictionary.'),
  longest_only: z.boolean().describe('If `true`, only the longest stemmed version of each token is included in the output. If `false`, all stemmed versions of the token are included. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisHunspellTokenFilter' })
export type AnalysisHunspellTokenFilter = z.infer<typeof AnalysisHunspellTokenFilter>

export const AnalysisHyphenationDecompounderTokenFilter = z.object({
  ...AnalysisCompoundWordTokenFilterBase.shape,
  type: z.literal('hyphenation_decompounder'),
  hyphenation_patterns_path: z.string().describe('Path to an Apache FOP (Formatting Objects Processor) XML hyphenation pattern file. This path must be absolute or relative to the `config` location. Only FOP v1.2 compatible files are supported.'),
  no_sub_matches: z.boolean().describe('If `true`, do not match sub tokens in tokens that are in the word list. Defaults to `false`.').optional(),
  no_overlapping_matches: z.boolean().describe('If `true`, do not allow overlapping tokens. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisHyphenationDecompounderTokenFilter' })
export type AnalysisHyphenationDecompounderTokenFilter = z.infer<typeof AnalysisHyphenationDecompounderTokenFilter>

export const AnalysisIcuCollationAlternate = z.enum(['shifted', 'non-ignorable']).meta({ id: 'AnalysisIcuCollationAlternate' })
export type AnalysisIcuCollationAlternate = z.infer<typeof AnalysisIcuCollationAlternate>

export const AnalysisIcuCollationCaseFirst = z.enum(['lower', 'upper']).meta({ id: 'AnalysisIcuCollationCaseFirst' })
export type AnalysisIcuCollationCaseFirst = z.infer<typeof AnalysisIcuCollationCaseFirst>

export const AnalysisIcuCollationDecomposition = z.enum(['no', 'identical']).meta({ id: 'AnalysisIcuCollationDecomposition' })
export type AnalysisIcuCollationDecomposition = z.infer<typeof AnalysisIcuCollationDecomposition>

export const AnalysisIcuCollationStrength = z.enum(['primary', 'secondary', 'tertiary', 'quaternary', 'identical']).meta({ id: 'AnalysisIcuCollationStrength' })
export type AnalysisIcuCollationStrength = z.infer<typeof AnalysisIcuCollationStrength>

export const AnalysisIcuCollationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('icu_collation'),
  alternate: AnalysisIcuCollationAlternate.optional(),
  caseFirst: AnalysisIcuCollationCaseFirst.optional(),
  caseLevel: z.boolean().optional(),
  country: z.string().optional(),
  decomposition: AnalysisIcuCollationDecomposition.optional(),
  hiraganaQuaternaryMode: z.boolean().optional(),
  language: z.string().optional(),
  numeric: z.boolean().optional(),
  rules: z.string().optional(),
  strength: AnalysisIcuCollationStrength.optional(),
  variableTop: z.string().optional(),
  variant: z.string().optional()
}).meta({ id: 'AnalysisIcuCollationTokenFilter' })
export type AnalysisIcuCollationTokenFilter = z.infer<typeof AnalysisIcuCollationTokenFilter>

export const AnalysisIcuFoldingTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('icu_folding'),
  unicode_set_filter: z.string()
}).meta({ id: 'AnalysisIcuFoldingTokenFilter' })
export type AnalysisIcuFoldingTokenFilter = z.infer<typeof AnalysisIcuFoldingTokenFilter>

export const AnalysisIcuNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('icu_normalizer'),
  name: AnalysisIcuNormalizationType
}).meta({ id: 'AnalysisIcuNormalizationTokenFilter' })
export type AnalysisIcuNormalizationTokenFilter = z.infer<typeof AnalysisIcuNormalizationTokenFilter>

export const AnalysisIcuTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('icu_tokenizer'),
  rule_files: z.string()
}).meta({ id: 'AnalysisIcuTokenizer' })
export type AnalysisIcuTokenizer = z.infer<typeof AnalysisIcuTokenizer>

export const AnalysisIcuTransformDirection = z.enum(['forward', 'reverse']).meta({ id: 'AnalysisIcuTransformDirection' })
export type AnalysisIcuTransformDirection = z.infer<typeof AnalysisIcuTransformDirection>

export const AnalysisIcuTransformTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('icu_transform'),
  dir: AnalysisIcuTransformDirection.optional(),
  id: z.string()
}).meta({ id: 'AnalysisIcuTransformTokenFilter' })
export type AnalysisIcuTransformTokenFilter = z.infer<typeof AnalysisIcuTransformTokenFilter>

export const AnalysisIndicNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('indic_normalization')
}).meta({ id: 'AnalysisIndicNormalizationTokenFilter' })
export type AnalysisIndicNormalizationTokenFilter = z.infer<typeof AnalysisIndicNormalizationTokenFilter>

export const AnalysisJaStopTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('ja_stop'),
  stopwords: AnalysisStopWords.optional()
}).meta({ id: 'AnalysisJaStopTokenFilter' })
export type AnalysisJaStopTokenFilter = z.infer<typeof AnalysisJaStopTokenFilter>

export const AnalysisKStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('kstem')
}).meta({ id: 'AnalysisKStemTokenFilter' })
export type AnalysisKStemTokenFilter = z.infer<typeof AnalysisKStemTokenFilter>

export const AnalysisKeepTypesMode = z.enum(['include', 'exclude']).meta({ id: 'AnalysisKeepTypesMode' })
export type AnalysisKeepTypesMode = z.infer<typeof AnalysisKeepTypesMode>

export const AnalysisKeepTypesTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('keep_types'),
  mode: AnalysisKeepTypesMode.describe('Indicates whether to keep or remove the specified token types.').optional(),
  types: z.array(z.string()).describe('List of token types to keep or remove.')
}).meta({ id: 'AnalysisKeepTypesTokenFilter' })
export type AnalysisKeepTypesTokenFilter = z.infer<typeof AnalysisKeepTypesTokenFilter>

export const AnalysisKeepWordsTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('keep'),
  keep_words: z.array(z.string()).describe('List of words to keep. Only tokens that match words in this list are included in the output. Either this parameter or `keep_words_path` must be specified.').optional(),
  keep_words_case: z.boolean().describe('If `true`, lowercase all keep words. Defaults to `false`.').optional(),
  keep_words_path: z.string().describe('Path to a file that contains a list of words to keep. Only tokens that match words in this list are included in the output. This path must be absolute or relative to the `config` location, and the file must be UTF-8 encoded. Each word in the file must be separated by a line break. Either this parameter or `keep_words` must be specified.').optional()
}).meta({ id: 'AnalysisKeepWordsTokenFilter' })
export type AnalysisKeepWordsTokenFilter = z.infer<typeof AnalysisKeepWordsTokenFilter>

export const AnalysisKeywordMarkerTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('keyword_marker'),
  ignore_case: z.boolean().describe('If `true`, matching for the `keywords` and `keywords_path` parameters ignores letter case. Defaults to `false`.').optional(),
  keywords: z.union([z.string(), z.array(z.string())]).describe('Array of keywords. Tokens that match these keywords are not stemmed. This parameter, `keywords_path`, or `keywords_pattern` must be specified. You cannot specify this parameter and `keywords_pattern`.').optional(),
  keywords_path: z.string().describe('Path to a file that contains a list of keywords. Tokens that match these keywords are not stemmed. This path must be absolute or relative to the `config` location, and the file must be UTF-8 encoded. Each word in the file must be separated by a line break. This parameter, `keywords`, or `keywords_pattern` must be specified. You cannot specify this parameter and `keywords_pattern`.').optional(),
  keywords_pattern: z.string().describe('Java regular expression used to match tokens. Tokens that match this expression are marked as keywords and not stemmed. This parameter, `keywords`, or `keywords_path` must be specified. You cannot specify this parameter and `keywords` or `keywords_pattern`.').optional()
}).meta({ id: 'AnalysisKeywordMarkerTokenFilter' })
export type AnalysisKeywordMarkerTokenFilter = z.infer<typeof AnalysisKeywordMarkerTokenFilter>

export const AnalysisKeywordRepeatTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('keyword_repeat')
}).meta({ id: 'AnalysisKeywordRepeatTokenFilter' })
export type AnalysisKeywordRepeatTokenFilter = z.infer<typeof AnalysisKeywordRepeatTokenFilter>

export const AnalysisKeywordTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('keyword'),
  buffer_size: integer.optional()
}).meta({ id: 'AnalysisKeywordTokenizer' })
export type AnalysisKeywordTokenizer = z.infer<typeof AnalysisKeywordTokenizer>

export const AnalysisKuromojiPartOfSpeechTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('kuromoji_part_of_speech'),
  stoptags: z.array(z.string())
}).meta({ id: 'AnalysisKuromojiPartOfSpeechTokenFilter' })
export type AnalysisKuromojiPartOfSpeechTokenFilter = z.infer<typeof AnalysisKuromojiPartOfSpeechTokenFilter>

export const AnalysisKuromojiReadingFormTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('kuromoji_readingform'),
  use_romaji: z.boolean()
}).meta({ id: 'AnalysisKuromojiReadingFormTokenFilter' })
export type AnalysisKuromojiReadingFormTokenFilter = z.infer<typeof AnalysisKuromojiReadingFormTokenFilter>

export const AnalysisKuromojiStemmerTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('kuromoji_stemmer'),
  minimum_length: integer
}).meta({ id: 'AnalysisKuromojiStemmerTokenFilter' })
export type AnalysisKuromojiStemmerTokenFilter = z.infer<typeof AnalysisKuromojiStemmerTokenFilter>

export const AnalysisKuromojiTokenizationMode = z.enum(['normal', 'search', 'extended']).meta({ id: 'AnalysisKuromojiTokenizationMode' })
export type AnalysisKuromojiTokenizationMode = z.infer<typeof AnalysisKuromojiTokenizationMode>

export const AnalysisKuromojiTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('kuromoji_tokenizer'),
  discard_punctuation: z.boolean().optional(),
  mode: AnalysisKuromojiTokenizationMode,
  nbest_cost: integer.optional(),
  nbest_examples: z.string().optional(),
  user_dictionary: z.string().optional(),
  user_dictionary_rules: z.array(z.string()).optional(),
  discard_compound_token: z.boolean().optional()
}).meta({ id: 'AnalysisKuromojiTokenizer' })
export type AnalysisKuromojiTokenizer = z.infer<typeof AnalysisKuromojiTokenizer>

export const AnalysisLengthTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('length'),
  max: integer.describe('Maximum character length of a token. Longer tokens are excluded from the output. Defaults to `Integer.MAX_VALUE`, which is `2^31-1` or `2147483647`.').optional(),
  min: integer.describe('Minimum character length of a token. Shorter tokens are excluded from the output. Defaults to `0`.').optional()
}).meta({ id: 'AnalysisLengthTokenFilter' })
export type AnalysisLengthTokenFilter = z.infer<typeof AnalysisLengthTokenFilter>

export const AnalysisLetterTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('letter')
}).meta({ id: 'AnalysisLetterTokenizer' })
export type AnalysisLetterTokenizer = z.infer<typeof AnalysisLetterTokenizer>

export const AnalysisLimitTokenCountTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('limit'),
  consume_all_tokens: z.boolean().describe('If `true`, the limit filter exhausts the token stream, even if the `max_token_count` has already been reached. Defaults to `false`.').optional(),
  max_token_count: SpecUtilsStringified.describe('Maximum number of tokens to keep. Once this limit is reached, any remaining tokens are excluded from the output. Defaults to `1`.').optional()
}).meta({ id: 'AnalysisLimitTokenCountTokenFilter' })
export type AnalysisLimitTokenCountTokenFilter = z.infer<typeof AnalysisLimitTokenCountTokenFilter>

export const AnalysisLowercaseTokenFilterLanguages = z.enum(['greek', 'irish', 'turkish']).meta({ id: 'AnalysisLowercaseTokenFilterLanguages' })
export type AnalysisLowercaseTokenFilterLanguages = z.infer<typeof AnalysisLowercaseTokenFilterLanguages>

export const AnalysisLowercaseTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('lowercase'),
  language: AnalysisLowercaseTokenFilterLanguages.describe('Language-specific lowercase token filter to use.').optional()
}).meta({ id: 'AnalysisLowercaseTokenFilter' })
export type AnalysisLowercaseTokenFilter = z.infer<typeof AnalysisLowercaseTokenFilter>

export const AnalysisLowercaseTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('lowercase')
}).meta({ id: 'AnalysisLowercaseTokenizer' })
export type AnalysisLowercaseTokenizer = z.infer<typeof AnalysisLowercaseTokenizer>

export const AnalysisMinHashTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('min_hash'),
  bucket_count: integer.describe('Number of buckets to which hashes are assigned. Defaults to `512`.').optional(),
  hash_count: integer.describe('Number of ways to hash each token in the stream. Defaults to `1`.').optional(),
  hash_set_size: integer.describe('Number of hashes to keep from each bucket. Defaults to `1`. Hashes are retained by ascending size, starting with the bucket’s smallest hash first.').optional(),
  with_rotation: z.boolean().describe('If `true`, the filter fills empty buckets with the value of the first non-empty bucket to its circular right if the `hash_set_size` is `1`. If the `bucket_count` argument is greater than 1, this parameter defaults to `true`. Otherwise, this parameter defaults to `false`.').optional()
}).meta({ id: 'AnalysisMinHashTokenFilter' })
export type AnalysisMinHashTokenFilter = z.infer<typeof AnalysisMinHashTokenFilter>

export const AnalysisMultiplexerTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('multiplexer'),
  filters: z.array(z.string()).describe('A list of token filters to apply to incoming tokens.'),
  preserve_original: SpecUtilsStringified.describe('If `true` (the default) then emit the original token in addition to the filtered tokens.').optional()
}).meta({ id: 'AnalysisMultiplexerTokenFilter' })
export type AnalysisMultiplexerTokenFilter = z.infer<typeof AnalysisMultiplexerTokenFilter>

export const AnalysisNGramTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('ngram'),
  max_gram: integer.describe('Maximum length of characters in a gram. Defaults to `2`.').optional(),
  min_gram: integer.describe('Minimum length of characters in a gram. Defaults to `1`.').optional(),
  preserve_original: SpecUtilsStringified.describe('Emits original token when set to `true`. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisNGramTokenFilter' })
export type AnalysisNGramTokenFilter = z.infer<typeof AnalysisNGramTokenFilter>

export const AnalysisNGramTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('ngram'),
  custom_token_chars: z.string().optional(),
  max_gram: integer.optional(),
  min_gram: integer.optional(),
  token_chars: z.array(AnalysisTokenChar).optional()
}).meta({ id: 'AnalysisNGramTokenizer' })
export type AnalysisNGramTokenizer = z.infer<typeof AnalysisNGramTokenizer>

export const AnalysisNoriDecompoundMode = z.enum(['discard', 'none', 'mixed']).meta({ id: 'AnalysisNoriDecompoundMode' })
export type AnalysisNoriDecompoundMode = z.infer<typeof AnalysisNoriDecompoundMode>

export const AnalysisNoriPartOfSpeechTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('nori_part_of_speech'),
  stoptags: z.array(z.string()).describe('An array of part-of-speech tags that should be removed.').optional()
}).meta({ id: 'AnalysisNoriPartOfSpeechTokenFilter' })
export type AnalysisNoriPartOfSpeechTokenFilter = z.infer<typeof AnalysisNoriPartOfSpeechTokenFilter>

export const AnalysisNoriTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('nori_tokenizer'),
  decompound_mode: AnalysisNoriDecompoundMode.optional(),
  discard_punctuation: z.boolean().optional(),
  user_dictionary: z.string().optional(),
  user_dictionary_rules: z.array(z.string()).optional()
}).meta({ id: 'AnalysisNoriTokenizer' })
export type AnalysisNoriTokenizer = z.infer<typeof AnalysisNoriTokenizer>

export const AnalysisPathHierarchyTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('path_hierarchy'),
  buffer_size: SpecUtilsStringified.optional(),
  delimiter: z.string().optional(),
  replacement: z.string().optional(),
  reverse: SpecUtilsStringified.optional(),
  skip: SpecUtilsStringified.optional()
}).meta({ id: 'AnalysisPathHierarchyTokenizer' })
export type AnalysisPathHierarchyTokenizer = z.infer<typeof AnalysisPathHierarchyTokenizer>

export const AnalysisPatternCaptureTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('pattern_capture'),
  patterns: z.array(z.string()).describe('A list of regular expressions to match.'),
  preserve_original: SpecUtilsStringified.describe('If set to `true` (the default) it will emit the original token.').optional()
}).meta({ id: 'AnalysisPatternCaptureTokenFilter' })
export type AnalysisPatternCaptureTokenFilter = z.infer<typeof AnalysisPatternCaptureTokenFilter>

export const AnalysisPatternReplaceTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('pattern_replace'),
  all: z.boolean().describe('If `true`, all substrings matching the pattern parameter’s regular expression are replaced. If `false`, the filter replaces only the first matching substring in each token. Defaults to `true`.').optional(),
  flags: z.string().optional(),
  pattern: z.string().describe('Regular expression, written in Java’s regular expression syntax. The filter replaces token substrings matching this pattern with the substring in the `replacement` parameter.'),
  replacement: z.string().describe('Replacement substring. Defaults to an empty substring (`""`).').optional()
}).meta({ id: 'AnalysisPatternReplaceTokenFilter' })
export type AnalysisPatternReplaceTokenFilter = z.infer<typeof AnalysisPatternReplaceTokenFilter>

export const AnalysisPatternTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('pattern'),
  flags: z.string().optional(),
  group: integer.optional(),
  pattern: z.string().optional()
}).meta({ id: 'AnalysisPatternTokenizer' })
export type AnalysisPatternTokenizer = z.infer<typeof AnalysisPatternTokenizer>

export const AnalysisPersianNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('persian_normalization')
}).meta({ id: 'AnalysisPersianNormalizationTokenFilter' })
export type AnalysisPersianNormalizationTokenFilter = z.infer<typeof AnalysisPersianNormalizationTokenFilter>

export const AnalysisPersianStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('persian_stem')
}).meta({ id: 'AnalysisPersianStemTokenFilter' })
export type AnalysisPersianStemTokenFilter = z.infer<typeof AnalysisPersianStemTokenFilter>

export const AnalysisPhoneticEncoder = z.enum(['metaphone', 'double_metaphone', 'soundex', 'refined_soundex', 'caverphone1', 'caverphone2', 'cologne', 'nysiis', 'koelnerphonetik', 'haasephonetik', 'beider_morse', 'daitch_mokotoff']).meta({ id: 'AnalysisPhoneticEncoder' })
export type AnalysisPhoneticEncoder = z.infer<typeof AnalysisPhoneticEncoder>

export const AnalysisPhoneticLanguage = z.enum(['any', 'common', 'cyrillic', 'english', 'french', 'german', 'hebrew', 'hungarian', 'polish', 'romanian', 'russian', 'spanish']).meta({ id: 'AnalysisPhoneticLanguage' })
export type AnalysisPhoneticLanguage = z.infer<typeof AnalysisPhoneticLanguage>

export const AnalysisPhoneticNameType = z.enum(['generic', 'ashkenazi', 'sephardic']).meta({ id: 'AnalysisPhoneticNameType' })
export type AnalysisPhoneticNameType = z.infer<typeof AnalysisPhoneticNameType>

export const AnalysisPhoneticRuleType = z.enum(['approx', 'exact']).meta({ id: 'AnalysisPhoneticRuleType' })
export type AnalysisPhoneticRuleType = z.infer<typeof AnalysisPhoneticRuleType>

export const AnalysisPhoneticTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('phonetic'),
  encoder: AnalysisPhoneticEncoder,
  languageset: z.union([AnalysisPhoneticLanguage, z.array(AnalysisPhoneticLanguage)]).optional(),
  max_code_len: integer.optional(),
  name_type: AnalysisPhoneticNameType.optional(),
  replace: z.boolean().optional(),
  rule_type: AnalysisPhoneticRuleType.optional()
}).meta({ id: 'AnalysisPhoneticTokenFilter' })
export type AnalysisPhoneticTokenFilter = z.infer<typeof AnalysisPhoneticTokenFilter>

export const AnalysisPorterStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('porter_stem')
}).meta({ id: 'AnalysisPorterStemTokenFilter' })
export type AnalysisPorterStemTokenFilter = z.infer<typeof AnalysisPorterStemTokenFilter>

export const AnalysisPredicateTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('predicate_token_filter'),
  script: z.lazy(() => Script).describe('Script containing a condition used to filter incoming tokens. Only tokens that match this script are included in the output.')
}).meta({ id: 'AnalysisPredicateTokenFilter' })
export type AnalysisPredicateTokenFilter = z.infer<typeof AnalysisPredicateTokenFilter>

export const AnalysisRemoveDuplicatesTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('remove_duplicates')
}).meta({ id: 'AnalysisRemoveDuplicatesTokenFilter' })
export type AnalysisRemoveDuplicatesTokenFilter = z.infer<typeof AnalysisRemoveDuplicatesTokenFilter>

export const AnalysisReverseTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('reverse')
}).meta({ id: 'AnalysisReverseTokenFilter' })
export type AnalysisReverseTokenFilter = z.infer<typeof AnalysisReverseTokenFilter>

export const AnalysisRussianStemTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('russian_stem')
}).meta({ id: 'AnalysisRussianStemTokenFilter' })
export type AnalysisRussianStemTokenFilter = z.infer<typeof AnalysisRussianStemTokenFilter>

export const AnalysisScandinavianFoldingTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('scandinavian_folding')
}).meta({ id: 'AnalysisScandinavianFoldingTokenFilter' })
export type AnalysisScandinavianFoldingTokenFilter = z.infer<typeof AnalysisScandinavianFoldingTokenFilter>

export const AnalysisScandinavianNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('scandinavian_normalization')
}).meta({ id: 'AnalysisScandinavianNormalizationTokenFilter' })
export type AnalysisScandinavianNormalizationTokenFilter = z.infer<typeof AnalysisScandinavianNormalizationTokenFilter>

export const AnalysisSerbianNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('serbian_normalization')
}).meta({ id: 'AnalysisSerbianNormalizationTokenFilter' })
export type AnalysisSerbianNormalizationTokenFilter = z.infer<typeof AnalysisSerbianNormalizationTokenFilter>

export const AnalysisShingleTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('shingle'),
  filler_token: z.string().describe('String used in shingles as a replacement for empty positions that do not contain a token. This filler token is only used in shingles, not original unigrams. Defaults to an underscore (`_`).').optional(),
  max_shingle_size: SpecUtilsStringified.describe('Maximum number of tokens to concatenate when creating shingles. Defaults to `2`.').optional(),
  min_shingle_size: SpecUtilsStringified.describe('Minimum number of tokens to concatenate when creating shingles. Defaults to `2`.').optional(),
  output_unigrams: z.boolean().describe('If `true`, the output includes the original input tokens. If `false`, the output only includes shingles; the original input tokens are removed. Defaults to `true`.').optional(),
  output_unigrams_if_no_shingles: z.boolean().describe('If `true`, the output includes the original input tokens only if no shingles are produced; if shingles are produced, the output only includes shingles. Defaults to `false`.').optional(),
  token_separator: z.string().describe('Separator used to concatenate adjacent tokens to form a shingle. Defaults to a space (`" "`).').optional()
}).meta({ id: 'AnalysisShingleTokenFilter' })
export type AnalysisShingleTokenFilter = z.infer<typeof AnalysisShingleTokenFilter>

export const AnalysisSimplePatternSplitTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('simple_pattern_split'),
  pattern: z.string().optional()
}).meta({ id: 'AnalysisSimplePatternSplitTokenizer' })
export type AnalysisSimplePatternSplitTokenizer = z.infer<typeof AnalysisSimplePatternSplitTokenizer>

export const AnalysisSimplePatternTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('simple_pattern'),
  pattern: z.string().optional()
}).meta({ id: 'AnalysisSimplePatternTokenizer' })
export type AnalysisSimplePatternTokenizer = z.infer<typeof AnalysisSimplePatternTokenizer>

export const AnalysisSnowballLanguage = z.enum(['Arabic', 'Armenian', 'Basque', 'Catalan', 'Danish', 'Dutch', 'English', 'Estonian', 'Finnish', 'French', 'German', 'German2', 'Hungarian', 'Italian', 'Irish', 'Kp', 'Lithuanian', 'Lovins', 'Norwegian', 'Porter', 'Portuguese', 'Romanian', 'Russian', 'Serbian', 'Spanish', 'Swedish', 'Turkish']).meta({ id: 'AnalysisSnowballLanguage' })
export type AnalysisSnowballLanguage = z.infer<typeof AnalysisSnowballLanguage>

export const AnalysisSnowballTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('snowball'),
  language: AnalysisSnowballLanguage.describe('Controls the language used by the stemmer.').optional()
}).meta({ id: 'AnalysisSnowballTokenFilter' })
export type AnalysisSnowballTokenFilter = z.infer<typeof AnalysisSnowballTokenFilter>

export const AnalysisSoraniNormalizationTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('sorani_normalization')
}).meta({ id: 'AnalysisSoraniNormalizationTokenFilter' })
export type AnalysisSoraniNormalizationTokenFilter = z.infer<typeof AnalysisSoraniNormalizationTokenFilter>

export const AnalysisStandardTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('standard'),
  max_token_length: integer.optional()
}).meta({ id: 'AnalysisStandardTokenizer' })
export type AnalysisStandardTokenizer = z.infer<typeof AnalysisStandardTokenizer>

export const AnalysisStemmerOverrideTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('stemmer_override'),
  rules: z.array(z.string()).describe('A list of mapping rules to use.').optional(),
  rules_path: z.string().describe('A path (either relative to `config` location, or absolute) to a list of mappings.').optional()
}).meta({ id: 'AnalysisStemmerOverrideTokenFilter' })
export type AnalysisStemmerOverrideTokenFilter = z.infer<typeof AnalysisStemmerOverrideTokenFilter>

export const AnalysisStemmerTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('stemmer'),
  language: z.string().optional(),
  name: z.string().optional()
}).meta({ id: 'AnalysisStemmerTokenFilter' })
export type AnalysisStemmerTokenFilter = z.infer<typeof AnalysisStemmerTokenFilter>

export const AnalysisStopTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('stop'),
  ignore_case: z.boolean().describe('If `true`, stop word matching is case insensitive. For example, if `true`, a stop word of the matches and removes `The`, `THE`, or `the`. Defaults to `false`.').optional(),
  remove_trailing: z.boolean().describe('If `true`, the last token of a stream is removed if it’s a stop word. Defaults to `true`.').optional(),
  stopwords: AnalysisStopWords.describe('Language value, such as `_arabic_` or `_thai_`. Defaults to `_english_`.').optional(),
  stopwords_path: z.string().describe('Path to a file that contains a list of stop words to remove. This path must be absolute or relative to the `config` location, and the file must be UTF-8 encoded. Each stop word in the file must be separated by a line break.').optional()
}).meta({ id: 'AnalysisStopTokenFilter' })
export type AnalysisStopTokenFilter = z.infer<typeof AnalysisStopTokenFilter>

export const AnalysisSynonymFormat = z.enum(['solr', 'wordnet']).meta({ id: 'AnalysisSynonymFormat' })
export type AnalysisSynonymFormat = z.infer<typeof AnalysisSynonymFormat>

export const AnalysisSynonymTokenFilterBase = z.object({
  ...AnalysisTokenFilterBase.shape,
  expand: z.boolean().describe('Expands definitions for equivalent synonym rules. Defaults to `true`.').optional(),
  format: AnalysisSynonymFormat.describe('Sets the synonym rules format.').optional(),
  lenient: z.boolean().describe('If `true` ignores errors while parsing the synonym rules. It is important to note that only those synonym rules which cannot get parsed are ignored. Defaults to the value of the `updateable` setting.').optional(),
  synonyms: z.array(z.string()).describe('Used to define inline synonyms.').optional(),
  synonyms_path: z.string().describe('Used to provide a synonym file. This path must be absolute or relative to the `config` location.').optional(),
  synonyms_set: z.string().describe('Provide a synonym set created via Synonyms Management APIs.').optional(),
  tokenizer: z.string().describe('Controls the tokenizers that will be used to tokenize the synonym, this parameter is for backwards compatibility for indices that created before 6.0.').optional(),
  updateable: z.boolean().describe('If `true` allows reloading search analyzers to pick up changes to synonym files. Only to be used for search analyzers. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisSynonymTokenFilterBase' })
export type AnalysisSynonymTokenFilterBase = z.infer<typeof AnalysisSynonymTokenFilterBase>

export const AnalysisSynonymGraphTokenFilter = z.object({
  ...AnalysisSynonymTokenFilterBase.shape,
  type: z.literal('synonym_graph')
}).meta({ id: 'AnalysisSynonymGraphTokenFilter' })
export type AnalysisSynonymGraphTokenFilter = z.infer<typeof AnalysisSynonymGraphTokenFilter>

export const AnalysisSynonymTokenFilter = z.object({
  ...AnalysisSynonymTokenFilterBase.shape,
  type: z.literal('synonym')
}).meta({ id: 'AnalysisSynonymTokenFilter' })
export type AnalysisSynonymTokenFilter = z.infer<typeof AnalysisSynonymTokenFilter>

export const AnalysisThaiTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('thai')
}).meta({ id: 'AnalysisThaiTokenizer' })
export type AnalysisThaiTokenizer = z.infer<typeof AnalysisThaiTokenizer>

export const AnalysisTrimTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('trim')
}).meta({ id: 'AnalysisTrimTokenFilter' })
export type AnalysisTrimTokenFilter = z.infer<typeof AnalysisTrimTokenFilter>

export const AnalysisTruncateTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('truncate'),
  length: integer.describe('Character limit for each token. Tokens exceeding this limit are truncated. Defaults to `10`.').optional()
}).meta({ id: 'AnalysisTruncateTokenFilter' })
export type AnalysisTruncateTokenFilter = z.infer<typeof AnalysisTruncateTokenFilter>

export const AnalysisUniqueTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('unique'),
  only_on_same_position: z.boolean().describe('If `true`, only remove duplicate tokens in the same position. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisUniqueTokenFilter' })
export type AnalysisUniqueTokenFilter = z.infer<typeof AnalysisUniqueTokenFilter>

export const AnalysisUppercaseTokenFilter = z.object({
  ...AnalysisTokenFilterBase.shape,
  type: z.literal('uppercase')
}).meta({ id: 'AnalysisUppercaseTokenFilter' })
export type AnalysisUppercaseTokenFilter = z.infer<typeof AnalysisUppercaseTokenFilter>

export const AnalysisWordDelimiterTokenFilterBase = z.object({
  ...AnalysisTokenFilterBase.shape,
  catenate_all: z.boolean().describe('If `true`, the filter produces catenated tokens for chains of alphanumeric characters separated by non-alphabetic delimiters. Defaults to `false`.').optional(),
  catenate_numbers: z.boolean().describe('If `true`, the filter produces catenated tokens for chains of numeric characters separated by non-alphabetic delimiters. Defaults to `false`.').optional(),
  catenate_words: z.boolean().describe('If `true`, the filter produces catenated tokens for chains of alphabetical characters separated by non-alphabetic delimiters. Defaults to `false`.').optional(),
  generate_number_parts: z.boolean().describe('If `true`, the filter includes tokens consisting of only numeric characters in the output. If `false`, the filter excludes these tokens from the output. Defaults to `true`.').optional(),
  generate_word_parts: z.boolean().describe('If `true`, the filter includes tokens consisting of only alphabetical characters in the output. If `false`, the filter excludes these tokens from the output. Defaults to `true`.').optional(),
  preserve_original: SpecUtilsStringified.describe('If `true`, the filter includes the original version of any split tokens in the output. This original version includes non-alphanumeric delimiters. Defaults to `false`.').optional(),
  protected_words: z.array(z.string()).describe('Array of tokens the filter won’t split.').optional(),
  protected_words_path: z.string().describe('Path to a file that contains a list of tokens the filter won’t split. This path must be absolute or relative to the `config` location, and the file must be UTF-8 encoded. Each token in the file must be separated by a line break.').optional(),
  split_on_case_change: z.boolean().describe('If `true`, the filter splits tokens at letter case transitions. For example: camelCase -> [ camel, Case ]. Defaults to `true`.').optional(),
  split_on_numerics: z.boolean().describe('If `true`, the filter splits tokens at letter-number transitions. For example: j2se -> [ j, 2, se ]. Defaults to `true`.').optional(),
  stem_english_possessive: z.boolean().describe('If `true`, the filter removes the English possessive (`\'s`) from the end of each token. For example: O\'Neil\'s -> [ O, Neil ]. Defaults to `true`.').optional(),
  type_table: z.array(z.string()).describe('Array of custom type mappings for characters. This allows you to map non-alphanumeric characters as numeric or alphanumeric to avoid splitting on those characters.').optional(),
  type_table_path: z.string().describe('Path to a file that contains custom type mappings for characters. This allows you to map non-alphanumeric characters as numeric or alphanumeric to avoid splitting on those characters.').optional()
}).meta({ id: 'AnalysisWordDelimiterTokenFilterBase' })
export type AnalysisWordDelimiterTokenFilterBase = z.infer<typeof AnalysisWordDelimiterTokenFilterBase>

export const AnalysisWordDelimiterGraphTokenFilter = z.object({
  ...AnalysisWordDelimiterTokenFilterBase.shape,
  type: z.literal('word_delimiter_graph'),
  adjust_offsets: z.boolean().describe('If `true`, the filter adjusts the offsets of split or catenated tokens to better reflect their actual position in the token stream. Defaults to `true`.').optional(),
  ignore_keywords: z.boolean().describe('If `true`, the filter skips tokens with a keyword attribute of true. Defaults to `false`.').optional()
}).meta({ id: 'AnalysisWordDelimiterGraphTokenFilter' })
export type AnalysisWordDelimiterGraphTokenFilter = z.infer<typeof AnalysisWordDelimiterGraphTokenFilter>

export const AnalysisWordDelimiterTokenFilter = z.object({
  ...AnalysisWordDelimiterTokenFilterBase.shape,
  type: z.literal('word_delimiter')
}).meta({ id: 'AnalysisWordDelimiterTokenFilter' })
export type AnalysisWordDelimiterTokenFilter = z.infer<typeof AnalysisWordDelimiterTokenFilter>

export const AnalysisTokenFilterDefinition = z.union([AnalysisApostropheTokenFilter, AnalysisArabicStemTokenFilter, AnalysisArabicNormalizationTokenFilter, AnalysisAsciiFoldingTokenFilter, AnalysisBengaliNormalizationTokenFilter, AnalysisBrazilianStemTokenFilter, AnalysisCjkBigramTokenFilter, AnalysisCjkWidthTokenFilter, AnalysisClassicTokenFilter, AnalysisCommonGramsTokenFilter, AnalysisConditionTokenFilter, AnalysisCzechStemTokenFilter, AnalysisDecimalDigitTokenFilter, AnalysisDelimitedPayloadTokenFilter, AnalysisDutchStemTokenFilter, AnalysisEdgeNGramTokenFilter, AnalysisElisionTokenFilter, AnalysisFingerprintTokenFilter, AnalysisFlattenGraphTokenFilter, AnalysisFrenchStemTokenFilter, AnalysisGermanNormalizationTokenFilter, AnalysisGermanStemTokenFilter, AnalysisHindiNormalizationTokenFilter, AnalysisHunspellTokenFilter, AnalysisHyphenationDecompounderTokenFilter, AnalysisIndicNormalizationTokenFilter, AnalysisKeepTypesTokenFilter, AnalysisKeepWordsTokenFilter, AnalysisKeywordMarkerTokenFilter, AnalysisKeywordRepeatTokenFilter, AnalysisKStemTokenFilter, AnalysisLengthTokenFilter, AnalysisLimitTokenCountTokenFilter, AnalysisLowercaseTokenFilter, AnalysisMinHashTokenFilter, AnalysisMultiplexerTokenFilter, AnalysisNGramTokenFilter, AnalysisNoriPartOfSpeechTokenFilter, AnalysisPatternCaptureTokenFilter, AnalysisPatternReplaceTokenFilter, AnalysisPersianNormalizationTokenFilter, AnalysisPersianStemTokenFilter, AnalysisPorterStemTokenFilter, AnalysisPredicateTokenFilter, AnalysisRemoveDuplicatesTokenFilter, AnalysisReverseTokenFilter, AnalysisRussianStemTokenFilter, AnalysisScandinavianFoldingTokenFilter, AnalysisScandinavianNormalizationTokenFilter, AnalysisSerbianNormalizationTokenFilter, AnalysisShingleTokenFilter, AnalysisSnowballTokenFilter, AnalysisSoraniNormalizationTokenFilter, AnalysisStemmerOverrideTokenFilter, AnalysisStemmerTokenFilter, AnalysisStopTokenFilter, AnalysisSynonymGraphTokenFilter, AnalysisSynonymTokenFilter, AnalysisTrimTokenFilter, AnalysisTruncateTokenFilter, AnalysisUniqueTokenFilter, AnalysisUppercaseTokenFilter, AnalysisWordDelimiterGraphTokenFilter, AnalysisWordDelimiterTokenFilter, AnalysisJaStopTokenFilter, AnalysisKuromojiStemmerTokenFilter, AnalysisKuromojiReadingFormTokenFilter, AnalysisKuromojiPartOfSpeechTokenFilter, AnalysisIcuCollationTokenFilter, AnalysisIcuFoldingTokenFilter, AnalysisIcuNormalizationTokenFilter, AnalysisIcuTransformTokenFilter, AnalysisPhoneticTokenFilter, AnalysisDictionaryDecompounderTokenFilter]).meta({ id: 'AnalysisTokenFilterDefinition' })
export type AnalysisTokenFilterDefinition = z.infer<typeof AnalysisTokenFilterDefinition>

export const AnalysisTokenFilter = z.union([z.string(), AnalysisTokenFilterDefinition]).meta({ id: 'AnalysisTokenFilter' })
export type AnalysisTokenFilter = z.infer<typeof AnalysisTokenFilter>

export const AnalysisUaxEmailUrlTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('uax_url_email'),
  max_token_length: integer.optional()
}).meta({ id: 'AnalysisUaxEmailUrlTokenizer' })
export type AnalysisUaxEmailUrlTokenizer = z.infer<typeof AnalysisUaxEmailUrlTokenizer>

export const AnalysisWhitespaceTokenizer = z.object({
  ...AnalysisTokenizerBase.shape,
  type: z.literal('whitespace'),
  max_token_length: integer.optional()
}).meta({ id: 'AnalysisWhitespaceTokenizer' })
export type AnalysisWhitespaceTokenizer = z.infer<typeof AnalysisWhitespaceTokenizer>

export const AnalysisTokenizerDefinition = z.union([AnalysisCharGroupTokenizer, AnalysisClassicTokenizer, AnalysisEdgeNGramTokenizer, AnalysisKeywordTokenizer, AnalysisLetterTokenizer, AnalysisLowercaseTokenizer, AnalysisNGramTokenizer, AnalysisPathHierarchyTokenizer, AnalysisPatternTokenizer, AnalysisSimplePatternTokenizer, AnalysisSimplePatternSplitTokenizer, AnalysisStandardTokenizer, AnalysisThaiTokenizer, AnalysisUaxEmailUrlTokenizer, AnalysisWhitespaceTokenizer, AnalysisIcuTokenizer, AnalysisKuromojiTokenizer, AnalysisNoriTokenizer]).meta({ id: 'AnalysisTokenizerDefinition' })
export type AnalysisTokenizerDefinition = z.infer<typeof AnalysisTokenizerDefinition>

export const AnalysisTokenizer = z.union([z.string(), AnalysisTokenizerDefinition]).meta({ id: 'AnalysisTokenizer' })
export type AnalysisTokenizer = z.infer<typeof AnalysisTokenizer>

export const MlCategorizationAnalyzerDefinition = z.object({
  char_filter: z.array(AnalysisCharFilter).describe('One or more character filters. In addition to the built-in character filters, other plugins can provide more character filters. If this property is not specified, no character filters are applied prior to categorization. If you are customizing some other aspect of the analyzer and you need to achieve the equivalent of `categorization_filters` (which are not permitted when some other aspect of the analyzer is customized), add them here as pattern replace character filters.').optional(),
  filter: z.array(AnalysisTokenFilter).describe('One or more token filters. In addition to the built-in token filters, other plugins can provide more token filters. If this property is not specified, no token filters are applied prior to categorization.').optional(),
  tokenizer: AnalysisTokenizer.describe('The name or definition of the tokenizer to use after character filters are applied. This property is compulsory if `categorization_analyzer` is specified as an object. Machine learning provides a tokenizer called `ml_standard` that tokenizes in a way that has been determined to produce good categorization results on a variety of log file formats for logs in English. If you want to use that tokenizer but change the character or token filters, specify "tokenizer": "ml_standard" in your `categorization_analyzer`. Additionally, the `ml_classic` tokenizer is available, which tokenizes in the same way as the non-customizable tokenizer in old versions of the product (before 6.2). `ml_classic` was the default categorization tokenizer in versions 6.2 to 7.13, so if you need categorization identical to the default for jobs created in these versions, specify "tokenizer": "ml_classic" in your `categorization_analyzer`.').optional()
}).meta({ id: 'MlCategorizationAnalyzerDefinition' })
export type MlCategorizationAnalyzerDefinition = z.infer<typeof MlCategorizationAnalyzerDefinition>

export const MlCategorizationAnalyzer = z.union([z.string(), MlCategorizationAnalyzerDefinition]).meta({ id: 'MlCategorizationAnalyzer' })
export type MlCategorizationAnalyzer = z.infer<typeof MlCategorizationAnalyzer>

export const MlInfoAnomalyDetectors = z.object({
  categorization_analyzer: MlCategorizationAnalyzer,
  categorization_examples_limit: integer,
  model_memory_limit: z.string(),
  model_snapshot_retention_days: integer,
  daily_model_snapshot_retention_after_days: integer
}).meta({ id: 'MlInfoAnomalyDetectors' })
export type MlInfoAnomalyDetectors = z.infer<typeof MlInfoAnomalyDetectors>

export const MlInfoDatafeeds = z.object({
  scroll_size: integer
}).meta({ id: 'MlInfoDatafeeds' })
export type MlInfoDatafeeds = z.infer<typeof MlInfoDatafeeds>

export const MlInfoDefaults = z.object({
  anomaly_detectors: MlInfoAnomalyDetectors,
  datafeeds: MlInfoDatafeeds
}).meta({ id: 'MlInfoDefaults' })
export type MlInfoDefaults = z.infer<typeof MlInfoDefaults>

export const MlInfoLimits = z.object({
  max_single_ml_node_processors: integer.optional(),
  total_ml_processors: integer.optional(),
  max_model_memory_limit: ByteSize.optional(),
  effective_max_model_memory_limit: ByteSize.optional(),
  total_ml_memory: ByteSize
}).meta({ id: 'MlInfoLimits' })
export type MlInfoLimits = z.infer<typeof MlInfoLimits>

export const MlInfoNativeCode = z.object({
  build_hash: z.string(),
  version: VersionString
}).meta({ id: 'MlInfoNativeCode' })
export type MlInfoNativeCode = z.infer<typeof MlInfoNativeCode>

/**
 * Get machine learning information.
 *
 * Get defaults and limits used by machine learning.
 * This endpoint is designed to be used by a user interface that needs to fully
 * understand machine learning configurations where some options are not
 * specified, meaning that the defaults should be used. This endpoint may be
 * used to find out what those defaults are. It also provides information about
 * the maximum size of machine learning jobs that could run in the current
 * cluster configuration.
 */
export const MlInfoRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'MlInfoRequest' })
export type MlInfoRequest = z.infer<typeof MlInfoRequest>

export const MlInfoResponse = z.object({
  defaults: MlInfoDefaults,
  limits: MlInfoLimits,
  upgrade_mode: z.boolean(),
  native_code: MlInfoNativeCode
}).meta({ id: 'MlInfoResponse' })
export type MlInfoResponse = z.infer<typeof MlInfoResponse>
