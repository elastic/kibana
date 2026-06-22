/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Script, ScriptField, SearchHighlight, SearchHitsMetadata, SearchSourceConfig } from './_global.search'
import type { ScriptFieldShape, ScriptShape, SearchHighlightShape } from './_global.search'
import { CartesianPoint, DateMath, DateTime, DistanceUnit, Duration, DurationLarge, EmptyObject, EpochTime, Field, FieldSortNumericType, FieldValue, Fields, GeoBounds, GeoDistanceType, GeoHash, GeoHashPrecision, GeoHexCell, GeoLine, GeoLocation, GeoTile, GeoTilePrecision, Metadata, Name, RelationName, SortMode, SortOrder, TimeZone, TopLeftBottomRightGeoBounds, double, float, integer, long } from './_types'
import { MappingFieldType } from './_types.mapping'
import { NestedSortValue, QueryDslFieldAndFormat, QueryDslQueryContainer, Sort } from './_types.query_dsl'
import type { QueryDslQueryContainerShape, SortShape } from './_types.query_dsl'
import { MlClassificationInferenceOptions, MlRegressionInferenceOptions } from './ml'

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

export const AggregationsChildrenAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape,
  type: RelationName.describe('The child type that should be selected.').optional()
}).meta({ id: 'AggregationsChildrenAggregation' })
export type AggregationsChildrenAggregation = z.infer<typeof AggregationsChildrenAggregation>

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

const AggregationsInferenceConfigContainerExclusiveProps = z.union([z.object({ regression: z.lazy(() => MlRegressionInferenceOptions) }), z.object({ classification: z.lazy(() => MlClassificationInferenceOptions) })])

export const AggregationsInferenceConfigContainer = AggregationsInferenceConfigContainerExclusiveProps.meta({ id: 'AggregationsInferenceConfigContainer' })
export type AggregationsInferenceConfigContainer = z.infer<typeof AggregationsInferenceConfigContainer>

export const AggregationsInferenceAggregation = z.object({
  ...AggregationsPipelineAggregationBase.shape,
  model_id: Name.describe('The ID or alias for the trained model.'),
  inference_config: AggregationsInferenceConfigContainer.describe('Contains the inference type and its options.').optional()
}).meta({ id: 'AggregationsInferenceAggregation' })
export type AggregationsInferenceAggregation = z.infer<typeof AggregationsInferenceAggregation>

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

export const AggregationsRandomSamplerAggregation = z.object({
  ...AggregationsBucketAggregationBase.shape,
  probability: double.describe('The probability that a document will be included in the aggregated data. Must be greater than 0, less than 0.5, or exactly 1. The lower the probability, the fewer documents are matched.'),
  seed: integer.describe('The seed to generate the random sampling of documents. When a seed is provided, the random subset of documents is the same between calls.').optional()
}).meta({ id: 'AggregationsRandomSamplerAggregation' })
export type AggregationsRandomSamplerAggregation = z.infer<typeof AggregationsRandomSamplerAggregation>

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
  docvalue_fields: z.array(z.lazy(() => QueryDslFieldAndFormat)).describe('Fields for which to return doc values.').optional(),
  explain: z.boolean().describe('If `true`, returns detailed information about score computation as part of a hit.').optional(),
  fields: z.array(z.lazy(() => QueryDslFieldAndFormat)).describe('Array of wildcard (*) patterns. The request returns values for field names matching these patterns in the hits.fields property of the response.').optional(),
  from: integer.describe('Starting document offset.').optional(),
  get highlight () { return SearchHighlight.describe('Specifies the highlighter to use for retrieving highlighted snippets from one or more fields in the search results.').optional() },
  get script_fields (): z.ZodOptional<z.ZodRecord<z.ZodString, typeof ScriptField>> { return z.record(z.string(), ScriptField).describe('Returns the result of one or more script evaluations for each hit.').optional() },
  size: integer.describe('The maximum number of top matching hits to return per bucket.').optional(),
  get sort () { return Sort.describe('Sort order of the top matching hits. By default, the hits are sorted by the score of the main query.').optional() },
  _source: z.lazy(() => SearchSourceConfig).describe('Selects the fields of the source that are returned.').optional(),
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

export const AggregationsAggregateBase = z.object({
  meta: Metadata.optional()
}).meta({ id: 'AggregationsAggregateBase' })
export type AggregationsAggregateBase = z.infer<typeof AggregationsAggregateBase>

export const AggregationsCardinalityAggregate = z.object({
  ...AggregationsAggregateBase.shape,
  value: long
}).meta({ id: 'AggregationsCardinalityAggregate' })
export type AggregationsCardinalityAggregate = z.infer<typeof AggregationsCardinalityAggregate>

export const AggregationsKeyedPercentiles = z.record(z.string(), z.union([z.string(), double, z.null()])).meta({ id: 'AggregationsKeyedPercentiles' })
export type AggregationsKeyedPercentiles = z.infer<typeof AggregationsKeyedPercentiles>

export const AggregationsArrayPercentilesItem = z.object({
  key: double,
  value: z.union([double, z.null()]),
  value_as_string: z.string().optional()
}).meta({ id: 'AggregationsArrayPercentilesItem' })
export type AggregationsArrayPercentilesItem = z.infer<typeof AggregationsArrayPercentilesItem>

export const AggregationsPercentiles = z.union([AggregationsKeyedPercentiles, z.array(AggregationsArrayPercentilesItem)]).meta({ id: 'AggregationsPercentiles' })
export type AggregationsPercentiles = z.infer<typeof AggregationsPercentiles>

export const AggregationsPercentilesAggregateBase = z.object({
  ...AggregationsAggregateBase.shape,
  values: AggregationsPercentiles
}).meta({ id: 'AggregationsPercentilesAggregateBase' })
export type AggregationsPercentilesAggregateBase = z.infer<typeof AggregationsPercentilesAggregateBase>

export const AggregationsHdrPercentilesAggregate = z.object({
  ...AggregationsPercentilesAggregateBase.shape
}).meta({ id: 'AggregationsHdrPercentilesAggregate' })
export type AggregationsHdrPercentilesAggregate = z.infer<typeof AggregationsHdrPercentilesAggregate>

export const AggregationsHdrPercentileRanksAggregate = z.object({
  ...AggregationsPercentilesAggregateBase.shape
}).meta({ id: 'AggregationsHdrPercentileRanksAggregate' })
export type AggregationsHdrPercentileRanksAggregate = z.infer<typeof AggregationsHdrPercentileRanksAggregate>

export const AggregationsTDigestPercentilesAggregate = z.object({
  ...AggregationsPercentilesAggregateBase.shape
}).meta({ id: 'AggregationsTDigestPercentilesAggregate' })
export type AggregationsTDigestPercentilesAggregate = z.infer<typeof AggregationsTDigestPercentilesAggregate>

export const AggregationsTDigestPercentileRanksAggregate = z.object({
  ...AggregationsPercentilesAggregateBase.shape
}).meta({ id: 'AggregationsTDigestPercentileRanksAggregate' })
export type AggregationsTDigestPercentileRanksAggregate = z.infer<typeof AggregationsTDigestPercentileRanksAggregate>

export const AggregationsPercentilesBucketAggregate = z.object({
  ...AggregationsPercentilesAggregateBase.shape
}).meta({ id: 'AggregationsPercentilesBucketAggregate' })
export type AggregationsPercentilesBucketAggregate = z.infer<typeof AggregationsPercentilesBucketAggregate>

export const AggregationsSingleMetricAggregateBase = z.object({
  ...AggregationsAggregateBase.shape,
  value: z.union([double, z.null()]).describe('The metric value. A missing value generally means that there was no data to aggregate, unless specified otherwise.'),
  value_as_string: z.string().optional()
}).meta({ id: 'AggregationsSingleMetricAggregateBase' })
export type AggregationsSingleMetricAggregateBase = z.infer<typeof AggregationsSingleMetricAggregateBase>

export const AggregationsMedianAbsoluteDeviationAggregate = z.object({
  ...AggregationsSingleMetricAggregateBase.shape
}).meta({ id: 'AggregationsMedianAbsoluteDeviationAggregate' })
export type AggregationsMedianAbsoluteDeviationAggregate = z.infer<typeof AggregationsMedianAbsoluteDeviationAggregate>

export const AggregationsMinAggregate = z.object({
  ...AggregationsSingleMetricAggregateBase.shape
}).meta({ id: 'AggregationsMinAggregate' })
export type AggregationsMinAggregate = z.infer<typeof AggregationsMinAggregate>

export const AggregationsMaxAggregate = z.object({
  ...AggregationsSingleMetricAggregateBase.shape
}).meta({ id: 'AggregationsMaxAggregate' })
export type AggregationsMaxAggregate = z.infer<typeof AggregationsMaxAggregate>

/** Sum aggregation result. `value` is always present and is zero if there were no values to process. */
export const AggregationsSumAggregate = z.object({
  ...AggregationsSingleMetricAggregateBase.shape
}).meta({ id: 'AggregationsSumAggregate' })
export type AggregationsSumAggregate = z.infer<typeof AggregationsSumAggregate>

export const AggregationsAvgAggregate = z.object({
  ...AggregationsSingleMetricAggregateBase.shape
}).meta({ id: 'AggregationsAvgAggregate' })
export type AggregationsAvgAggregate = z.infer<typeof AggregationsAvgAggregate>

/** Weighted average aggregation result. `value` is missing if the weight was set to zero. */
export const AggregationsWeightedAvgAggregate = z.object({
  ...AggregationsSingleMetricAggregateBase.shape
}).meta({ id: 'AggregationsWeightedAvgAggregate' })
export type AggregationsWeightedAvgAggregate = z.infer<typeof AggregationsWeightedAvgAggregate>

/** Value count aggregation result. `value` is always present. */
export const AggregationsValueCountAggregate = z.object({
  ...AggregationsSingleMetricAggregateBase.shape
}).meta({ id: 'AggregationsValueCountAggregate' })
export type AggregationsValueCountAggregate = z.infer<typeof AggregationsValueCountAggregate>

export const AggregationsSimpleValueAggregate = z.object({
  ...AggregationsSingleMetricAggregateBase.shape
}).meta({ id: 'AggregationsSimpleValueAggregate' })
export type AggregationsSimpleValueAggregate = z.infer<typeof AggregationsSimpleValueAggregate>

export const AggregationsDerivativeAggregate = z.object({
  ...AggregationsSingleMetricAggregateBase.shape,
  normalized_value: double.optional(),
  normalized_value_as_string: z.string().optional()
}).meta({ id: 'AggregationsDerivativeAggregate' })
export type AggregationsDerivativeAggregate = z.infer<typeof AggregationsDerivativeAggregate>

export const AggregationsBucketMetricValueAggregate = z.object({
  ...AggregationsSingleMetricAggregateBase.shape,
  keys: z.array(z.string())
}).meta({ id: 'AggregationsBucketMetricValueAggregate' })
export type AggregationsBucketMetricValueAggregate = z.infer<typeof AggregationsBucketMetricValueAggregate>

export const AggregationsAbstractChangePoint = z.object({
  p_value: double,
  change_point: integer
}).meta({ id: 'AggregationsAbstractChangePoint' })
export type AggregationsAbstractChangePoint = z.infer<typeof AggregationsAbstractChangePoint>

export const AggregationsDip = z.object({
  ...AggregationsAbstractChangePoint.shape
}).meta({ id: 'AggregationsDip' })
export type AggregationsDip = z.infer<typeof AggregationsDip>

export const AggregationsDistributionChange = z.object({
  ...AggregationsAbstractChangePoint.shape
}).meta({ id: 'AggregationsDistributionChange' })
export type AggregationsDistributionChange = z.infer<typeof AggregationsDistributionChange>

export const AggregationsIndeterminable = z.object({
  reason: z.string()
}).meta({ id: 'AggregationsIndeterminable' })
export type AggregationsIndeterminable = z.infer<typeof AggregationsIndeterminable>

export const AggregationsNonStationary = z.object({
  p_value: double,
  r_value: double,
  trend: z.string()
}).meta({ id: 'AggregationsNonStationary' })
export type AggregationsNonStationary = z.infer<typeof AggregationsNonStationary>

export const AggregationsSpike = z.object({
  ...AggregationsAbstractChangePoint.shape
}).meta({ id: 'AggregationsSpike' })
export type AggregationsSpike = z.infer<typeof AggregationsSpike>

export const AggregationsStationary = z.object({
}).meta({ id: 'AggregationsStationary' })
export type AggregationsStationary = z.infer<typeof AggregationsStationary>

export const AggregationsStepChange = z.object({
  ...AggregationsAbstractChangePoint.shape
}).meta({ id: 'AggregationsStepChange' })
export type AggregationsStepChange = z.infer<typeof AggregationsStepChange>

export const AggregationsTrendChange = z.object({
  p_value: double,
  r_value: double,
  change_point: integer
}).meta({ id: 'AggregationsTrendChange' })
export type AggregationsTrendChange = z.infer<typeof AggregationsTrendChange>

const AggregationsChangeTypeExclusiveProps = z.union([z.object({ dip: AggregationsDip }), z.object({ distribution_change: AggregationsDistributionChange }), z.object({ indeterminable: AggregationsIndeterminable }), z.object({ non_stationary: AggregationsNonStationary }), z.object({ spike: AggregationsSpike }), z.object({ stationary: AggregationsStationary }), z.object({ step_change: AggregationsStepChange }), z.object({ trend_change: AggregationsTrendChange })])

export const AggregationsChangeType = AggregationsChangeTypeExclusiveProps.meta({ id: 'AggregationsChangeType' })
export type AggregationsChangeType = z.infer<typeof AggregationsChangeType>

/** Base type for multi-bucket aggregation results that can hold sub-aggregations results. */
export const AggregationsMultiBucketBase = z.object({
  doc_count: long
}).meta({ id: 'AggregationsMultiBucketBase' })
export type AggregationsMultiBucketBase = z.infer<typeof AggregationsMultiBucketBase>

export const AggregationsChangePointBucket = z.object({
  doc_count: long,
  key: FieldValue
}).catchall(z.any()).meta({ id: 'AggregationsChangePointBucket' })
export type AggregationsChangePointBucket = z.infer<typeof AggregationsChangePointBucket>

export const AggregationsChangePointAggregate = z.object({
  ...AggregationsAggregateBase.shape,
  type: AggregationsChangeType,
  bucket: AggregationsChangePointBucket.optional()
}).meta({ id: 'AggregationsChangePointAggregate' })
export type AggregationsChangePointAggregate = z.infer<typeof AggregationsChangePointAggregate>

/**
 * Statistics aggregation result. `min`, `max` and `avg` are missing if there were no values to process
 * (`count` is zero).
 */
export const AggregationsStatsAggregate = z.object({
  ...AggregationsAggregateBase.shape,
  count: long,
  min: z.union([double, z.null()]),
  max: z.union([double, z.null()]),
  avg: z.union([double, z.null()]),
  sum: double,
  min_as_string: z.string().optional(),
  max_as_string: z.string().optional(),
  avg_as_string: z.string().optional(),
  sum_as_string: z.string().optional()
}).meta({ id: 'AggregationsStatsAggregate' })
export type AggregationsStatsAggregate = z.infer<typeof AggregationsStatsAggregate>

export const AggregationsStatsBucketAggregate = z.object({
  ...AggregationsStatsAggregate.shape
}).meta({ id: 'AggregationsStatsBucketAggregate' })
export type AggregationsStatsBucketAggregate = z.infer<typeof AggregationsStatsBucketAggregate>

export const AggregationsStandardDeviationBounds = z.object({
  upper: z.union([double, z.null()]),
  lower: z.union([double, z.null()]),
  upper_population: z.union([double, z.null()]),
  lower_population: z.union([double, z.null()]),
  upper_sampling: z.union([double, z.null()]),
  lower_sampling: z.union([double, z.null()])
}).meta({ id: 'AggregationsStandardDeviationBounds' })
export type AggregationsStandardDeviationBounds = z.infer<typeof AggregationsStandardDeviationBounds>

export const AggregationsStandardDeviationBoundsAsString = z.object({
  upper: z.string(),
  lower: z.string(),
  upper_population: z.string(),
  lower_population: z.string(),
  upper_sampling: z.string(),
  lower_sampling: z.string()
}).meta({ id: 'AggregationsStandardDeviationBoundsAsString' })
export type AggregationsStandardDeviationBoundsAsString = z.infer<typeof AggregationsStandardDeviationBoundsAsString>

export const AggregationsExtendedStatsAggregate = z.object({
  ...AggregationsStatsAggregate.shape,
  sum_of_squares: z.union([double, z.null()]),
  variance: z.union([double, z.null()]),
  variance_population: z.union([double, z.null()]),
  variance_sampling: z.union([double, z.null()]),
  std_deviation: z.union([double, z.null()]),
  std_deviation_population: z.union([double, z.null()]),
  std_deviation_sampling: z.union([double, z.null()]),
  std_deviation_bounds: AggregationsStandardDeviationBounds.optional(),
  sum_of_squares_as_string: z.string().optional(),
  variance_as_string: z.string().optional(),
  variance_population_as_string: z.string().optional(),
  variance_sampling_as_string: z.string().optional(),
  std_deviation_as_string: z.string().optional(),
  std_deviation_bounds_as_string: AggregationsStandardDeviationBoundsAsString.optional()
}).meta({ id: 'AggregationsExtendedStatsAggregate' })
export type AggregationsExtendedStatsAggregate = z.infer<typeof AggregationsExtendedStatsAggregate>

export const AggregationsExtendedStatsBucketAggregate = z.object({
  ...AggregationsExtendedStatsAggregate.shape
}).meta({ id: 'AggregationsExtendedStatsBucketAggregate' })
export type AggregationsExtendedStatsBucketAggregate = z.infer<typeof AggregationsExtendedStatsBucketAggregate>

export const AggregationsCartesianBoundsAggregate = z.object({
  ...AggregationsAggregateBase.shape,
  bounds: TopLeftBottomRightGeoBounds.optional()
}).meta({ id: 'AggregationsCartesianBoundsAggregate' })
export type AggregationsCartesianBoundsAggregate = z.infer<typeof AggregationsCartesianBoundsAggregate>

export const AggregationsCartesianCentroidAggregate = z.object({
  ...AggregationsAggregateBase.shape,
  count: long,
  location: CartesianPoint.optional()
}).meta({ id: 'AggregationsCartesianCentroidAggregate' })
export type AggregationsCartesianCentroidAggregate = z.infer<typeof AggregationsCartesianCentroidAggregate>

export const AggregationsGeoBoundsAggregate = z.object({
  ...AggregationsAggregateBase.shape,
  bounds: GeoBounds.optional()
}).meta({ id: 'AggregationsGeoBoundsAggregate' })
export type AggregationsGeoBoundsAggregate = z.infer<typeof AggregationsGeoBoundsAggregate>

export const AggregationsGeoCentroidAggregate = z.object({
  ...AggregationsAggregateBase.shape,
  count: long,
  location: GeoLocation.optional()
}).meta({ id: 'AggregationsGeoCentroidAggregate' })
export type AggregationsGeoCentroidAggregate = z.infer<typeof AggregationsGeoCentroidAggregate>

export const AggregationsMultiBucketAggregateBase = z.object({
  ...AggregationsAggregateBase.shape,
  buckets: AggregationsBuckets
}).meta({ id: 'AggregationsMultiBucketAggregateBase' })
export type AggregationsMultiBucketAggregateBase = z.infer<typeof AggregationsMultiBucketAggregateBase>

export const AggregationsHistogramAggregate = z.object({
  ...AggregationsMultiBucketAggregateBase.shape
}).meta({ id: 'AggregationsHistogramAggregate' })
export type AggregationsHistogramAggregate = z.infer<typeof AggregationsHistogramAggregate>

export const AggregationsDateHistogramAggregate = z.object({
  ...AggregationsMultiBucketAggregateBase.shape
}).meta({ id: 'AggregationsDateHistogramAggregate' })
export type AggregationsDateHistogramAggregate = z.infer<typeof AggregationsDateHistogramAggregate>

export const AggregationsAutoDateHistogramAggregate = z.object({
  ...AggregationsMultiBucketAggregateBase.shape,
  interval: DurationLarge
}).meta({ id: 'AggregationsAutoDateHistogramAggregate' })
export type AggregationsAutoDateHistogramAggregate = z.infer<typeof AggregationsAutoDateHistogramAggregate>

export const AggregationsVariableWidthHistogramAggregate = z.object({
  ...AggregationsMultiBucketAggregateBase.shape
}).meta({ id: 'AggregationsVariableWidthHistogramAggregate' })
export type AggregationsVariableWidthHistogramAggregate = z.infer<typeof AggregationsVariableWidthHistogramAggregate>

export const AggregationsTermsAggregateBase = z.object({
  ...AggregationsMultiBucketAggregateBase.shape,
  doc_count_error_upper_bound: long.optional(),
  sum_other_doc_count: long.optional()
}).meta({ id: 'AggregationsTermsAggregateBase' })
export type AggregationsTermsAggregateBase = z.infer<typeof AggregationsTermsAggregateBase>

/** Result of a `terms` aggregation when the field is a string. */
export const AggregationsStringTermsAggregate = z.object({
  ...AggregationsTermsAggregateBase.shape
}).meta({ id: 'AggregationsStringTermsAggregate' })
export type AggregationsStringTermsAggregate = z.infer<typeof AggregationsStringTermsAggregate>

/** Result of a `terms` aggregation when the field is some kind of whole number like a integer, long, or a date. */
export const AggregationsLongTermsAggregate = z.object({
  ...AggregationsTermsAggregateBase.shape
}).meta({ id: 'AggregationsLongTermsAggregate' })
export type AggregationsLongTermsAggregate = z.infer<typeof AggregationsLongTermsAggregate>

/** Result of a `terms` aggregation when the field is some kind of decimal number like a float, double, or distance. */
export const AggregationsDoubleTermsAggregate = z.object({
  ...AggregationsTermsAggregateBase.shape
}).meta({ id: 'AggregationsDoubleTermsAggregate' })
export type AggregationsDoubleTermsAggregate = z.infer<typeof AggregationsDoubleTermsAggregate>

/** Result of a `terms` aggregation when the field is unmapped. `buckets` is always empty. */
export const AggregationsUnmappedTermsAggregate = z.object({
  ...AggregationsTermsAggregateBase.shape
}).meta({ id: 'AggregationsUnmappedTermsAggregate' })
export type AggregationsUnmappedTermsAggregate = z.infer<typeof AggregationsUnmappedTermsAggregate>

/** Result of the `rare_terms` aggregation when the field is some kind of whole number like a integer, long, or a date. */
export const AggregationsLongRareTermsAggregate = z.object({
  ...AggregationsMultiBucketAggregateBase.shape
}).meta({ id: 'AggregationsLongRareTermsAggregate' })
export type AggregationsLongRareTermsAggregate = z.infer<typeof AggregationsLongRareTermsAggregate>

/** Result of the `rare_terms` aggregation when the field is a string. */
export const AggregationsStringRareTermsAggregate = z.object({
  ...AggregationsMultiBucketAggregateBase.shape
}).meta({ id: 'AggregationsStringRareTermsAggregate' })
export type AggregationsStringRareTermsAggregate = z.infer<typeof AggregationsStringRareTermsAggregate>

/** Result of a `rare_terms` aggregation when the field is unmapped. `buckets` is always empty. */
export const AggregationsUnmappedRareTermsAggregate = z.object({
  ...AggregationsMultiBucketAggregateBase.shape
}).meta({ id: 'AggregationsUnmappedRareTermsAggregate' })
export type AggregationsUnmappedRareTermsAggregate = z.infer<typeof AggregationsUnmappedRareTermsAggregate>

export const AggregationsMultiTermsAggregate = z.object({
  ...AggregationsTermsAggregateBase.shape
}).meta({ id: 'AggregationsMultiTermsAggregate' })
export type AggregationsMultiTermsAggregate = z.infer<typeof AggregationsMultiTermsAggregate>

/** Base type for single-bucket aggregation results that can hold sub-aggregations results. */
export const AggregationsSingleBucketAggregateBase = z.object({
  ...AggregationsAggregateBase.shape,
  doc_count: long
}).meta({ id: 'AggregationsSingleBucketAggregateBase' })
export type AggregationsSingleBucketAggregateBase = z.infer<typeof AggregationsSingleBucketAggregateBase>

export const AggregationsMissingAggregate = z.object({
  meta: Metadata.optional(),
  doc_count: long
}).catchall(z.any()).meta({ id: 'AggregationsMissingAggregate' })
export type AggregationsMissingAggregate = z.infer<typeof AggregationsMissingAggregate>

export const AggregationsNestedAggregate = z.object({
  meta: Metadata.optional(),
  doc_count: long
}).catchall(z.any()).meta({ id: 'AggregationsNestedAggregate' })
export type AggregationsNestedAggregate = z.infer<typeof AggregationsNestedAggregate>

export const AggregationsReverseNestedAggregate = z.object({
  meta: Metadata.optional(),
  doc_count: long
}).catchall(z.any()).meta({ id: 'AggregationsReverseNestedAggregate' })
export type AggregationsReverseNestedAggregate = z.infer<typeof AggregationsReverseNestedAggregate>

export const AggregationsGlobalAggregate = z.object({
  meta: Metadata.optional(),
  doc_count: long
}).catchall(z.any()).meta({ id: 'AggregationsGlobalAggregate' })
export type AggregationsGlobalAggregate = z.infer<typeof AggregationsGlobalAggregate>

export const AggregationsFilterAggregate = z.object({
  meta: Metadata.optional(),
  doc_count: long
}).catchall(z.any()).meta({ id: 'AggregationsFilterAggregate' })
export type AggregationsFilterAggregate = z.infer<typeof AggregationsFilterAggregate>

export const AggregationsChildrenAggregate = z.object({
  meta: Metadata.optional(),
  doc_count: long
}).catchall(z.any()).meta({ id: 'AggregationsChildrenAggregate' })
export type AggregationsChildrenAggregate = z.infer<typeof AggregationsChildrenAggregate>

export const AggregationsParentAggregate = z.object({
  meta: Metadata.optional(),
  doc_count: long
}).catchall(z.any()).meta({ id: 'AggregationsParentAggregate' })
export type AggregationsParentAggregate = z.infer<typeof AggregationsParentAggregate>

export const AggregationsSamplerAggregate = z.object({
  meta: Metadata.optional(),
  doc_count: long
}).catchall(z.any()).meta({ id: 'AggregationsSamplerAggregate' })
export type AggregationsSamplerAggregate = z.infer<typeof AggregationsSamplerAggregate>

export const AggregationsUnmappedSamplerAggregate = z.object({
  meta: Metadata.optional(),
  doc_count: long
}).catchall(z.any()).meta({ id: 'AggregationsUnmappedSamplerAggregate' })
export type AggregationsUnmappedSamplerAggregate = z.infer<typeof AggregationsUnmappedSamplerAggregate>

export const AggregationsGeoHashGridAggregate = z.object({
  ...AggregationsMultiBucketAggregateBase.shape
}).meta({ id: 'AggregationsGeoHashGridAggregate' })
export type AggregationsGeoHashGridAggregate = z.infer<typeof AggregationsGeoHashGridAggregate>

export const AggregationsGeoTileGridAggregate = z.object({
  ...AggregationsMultiBucketAggregateBase.shape
}).meta({ id: 'AggregationsGeoTileGridAggregate' })
export type AggregationsGeoTileGridAggregate = z.infer<typeof AggregationsGeoTileGridAggregate>

export const AggregationsGeoHexGridAggregate = z.object({
  ...AggregationsMultiBucketAggregateBase.shape
}).meta({ id: 'AggregationsGeoHexGridAggregate' })
export type AggregationsGeoHexGridAggregate = z.infer<typeof AggregationsGeoHexGridAggregate>

export const AggregationsRangeAggregate = z.object({
  ...AggregationsMultiBucketAggregateBase.shape
}).meta({ id: 'AggregationsRangeAggregate' })
export type AggregationsRangeAggregate = z.infer<typeof AggregationsRangeAggregate>

/**
 * Result of a `date_range` aggregation. Same format as a for a `range` aggregation: `from` and `to`
 * in `buckets` are milliseconds since the Epoch, represented as a floating point number.
 */
export const AggregationsDateRangeAggregate = z.object({
  ...AggregationsRangeAggregate.shape
}).meta({ id: 'AggregationsDateRangeAggregate' })
export type AggregationsDateRangeAggregate = z.infer<typeof AggregationsDateRangeAggregate>

/** Result of a `geo_distance` aggregation. The unit for `from` and `to` is meters by default. */
export const AggregationsGeoDistanceAggregate = z.object({
  ...AggregationsRangeAggregate.shape
}).meta({ id: 'AggregationsGeoDistanceAggregate' })
export type AggregationsGeoDistanceAggregate = z.infer<typeof AggregationsGeoDistanceAggregate>

export const AggregationsIpRangeAggregate = z.object({
  ...AggregationsMultiBucketAggregateBase.shape
}).meta({ id: 'AggregationsIpRangeAggregate' })
export type AggregationsIpRangeAggregate = z.infer<typeof AggregationsIpRangeAggregate>

export const AggregationsIpPrefixAggregate = z.object({
  ...AggregationsMultiBucketAggregateBase.shape
}).meta({ id: 'AggregationsIpPrefixAggregate' })
export type AggregationsIpPrefixAggregate = z.infer<typeof AggregationsIpPrefixAggregate>

export const AggregationsFiltersAggregate = z.object({
  ...AggregationsMultiBucketAggregateBase.shape
}).meta({ id: 'AggregationsFiltersAggregate' })
export type AggregationsFiltersAggregate = z.infer<typeof AggregationsFiltersAggregate>

export const AggregationsAdjacencyMatrixAggregate = z.object({
  ...AggregationsMultiBucketAggregateBase.shape
}).meta({ id: 'AggregationsAdjacencyMatrixAggregate' })
export type AggregationsAdjacencyMatrixAggregate = z.infer<typeof AggregationsAdjacencyMatrixAggregate>

export const AggregationsSignificantTermsAggregateBase = z.object({
  ...AggregationsMultiBucketAggregateBase.shape,
  bg_count: long.optional(),
  doc_count: long.optional()
}).meta({ id: 'AggregationsSignificantTermsAggregateBase' })
export type AggregationsSignificantTermsAggregateBase = z.infer<typeof AggregationsSignificantTermsAggregateBase>

export const AggregationsSignificantLongTermsAggregate = z.object({
  ...AggregationsSignificantTermsAggregateBase.shape
}).meta({ id: 'AggregationsSignificantLongTermsAggregate' })
export type AggregationsSignificantLongTermsAggregate = z.infer<typeof AggregationsSignificantLongTermsAggregate>

export const AggregationsSignificantStringTermsAggregate = z.object({
  ...AggregationsSignificantTermsAggregateBase.shape
}).meta({ id: 'AggregationsSignificantStringTermsAggregate' })
export type AggregationsSignificantStringTermsAggregate = z.infer<typeof AggregationsSignificantStringTermsAggregate>

/** Result of the `significant_terms` aggregation on an unmapped field. `buckets` is always empty. */
export const AggregationsUnmappedSignificantTermsAggregate = z.object({
  ...AggregationsSignificantTermsAggregateBase.shape
}).meta({ id: 'AggregationsUnmappedSignificantTermsAggregate' })
export type AggregationsUnmappedSignificantTermsAggregate = z.infer<typeof AggregationsUnmappedSignificantTermsAggregate>

export const AggregationsCompositeAggregate = z.object({
  ...AggregationsMultiBucketAggregateBase.shape,
  after_key: AggregationsCompositeAggregateKey.optional()
}).meta({ id: 'AggregationsCompositeAggregate' })
export type AggregationsCompositeAggregate = z.infer<typeof AggregationsCompositeAggregate>

export const AggregationsFrequentItemSetsAggregate = z.object({
  ...AggregationsMultiBucketAggregateBase.shape
}).meta({ id: 'AggregationsFrequentItemSetsAggregate' })
export type AggregationsFrequentItemSetsAggregate = z.infer<typeof AggregationsFrequentItemSetsAggregate>

export const AggregationsTimeSeriesAggregate = z.object({
  ...AggregationsMultiBucketAggregateBase.shape
}).meta({ id: 'AggregationsTimeSeriesAggregate' })
export type AggregationsTimeSeriesAggregate = z.infer<typeof AggregationsTimeSeriesAggregate>

export const AggregationsScriptedMetricAggregate = z.object({
  ...AggregationsAggregateBase.shape,
  value: z.any()
}).meta({ id: 'AggregationsScriptedMetricAggregate' })
export type AggregationsScriptedMetricAggregate = z.infer<typeof AggregationsScriptedMetricAggregate>

export const AggregationsTopHitsAggregate = z.object({
  ...AggregationsAggregateBase.shape,
  hits: z.lazy(() => SearchHitsMetadata)
}).meta({ id: 'AggregationsTopHitsAggregate' })
export type AggregationsTopHitsAggregate = z.infer<typeof AggregationsTopHitsAggregate>

export const AggregationsInferenceClassImportance = z.object({
  class_name: z.string(),
  importance: double
}).meta({ id: 'AggregationsInferenceClassImportance' })
export type AggregationsInferenceClassImportance = z.infer<typeof AggregationsInferenceClassImportance>

export const AggregationsInferenceFeatureImportance = z.object({
  feature_name: z.string(),
  importance: double.optional(),
  classes: z.array(AggregationsInferenceClassImportance).optional()
}).meta({ id: 'AggregationsInferenceFeatureImportance' })
export type AggregationsInferenceFeatureImportance = z.infer<typeof AggregationsInferenceFeatureImportance>

export const AggregationsInferenceTopClassEntry = z.object({
  class_name: FieldValue,
  class_probability: double,
  class_score: double
}).meta({ id: 'AggregationsInferenceTopClassEntry' })
export type AggregationsInferenceTopClassEntry = z.infer<typeof AggregationsInferenceTopClassEntry>

export const AggregationsInferenceAggregate = z.object({
  meta: Metadata.optional(),
  value: FieldValue.optional(),
  feature_importance: z.array(AggregationsInferenceFeatureImportance).optional(),
  top_classes: z.array(AggregationsInferenceTopClassEntry).optional(),
  warning: z.string().optional()
}).catchall(z.any()).meta({ id: 'AggregationsInferenceAggregate' })
export type AggregationsInferenceAggregate = z.infer<typeof AggregationsInferenceAggregate>

export const AggregationsStringStatsAggregate = z.object({
  ...AggregationsAggregateBase.shape,
  count: long,
  min_length: z.union([integer, z.null()]),
  max_length: z.union([integer, z.null()]),
  avg_length: z.union([double, z.null()]),
  entropy: z.union([double, z.null()]),
  distribution: z.union([z.record(z.string(), double), z.null()]).optional(),
  min_length_as_string: z.string().optional(),
  max_length_as_string: z.string().optional(),
  avg_length_as_string: z.string().optional()
}).meta({ id: 'AggregationsStringStatsAggregate' })
export type AggregationsStringStatsAggregate = z.infer<typeof AggregationsStringStatsAggregate>

export const AggregationsBoxPlotAggregate = z.object({
  ...AggregationsAggregateBase.shape,
  min: double,
  max: double,
  q1: double,
  q2: double,
  q3: double,
  lower: double,
  upper: double,
  min_as_string: z.string().optional(),
  max_as_string: z.string().optional(),
  q1_as_string: z.string().optional(),
  q2_as_string: z.string().optional(),
  q3_as_string: z.string().optional(),
  lower_as_string: z.string().optional(),
  upper_as_string: z.string().optional()
}).meta({ id: 'AggregationsBoxPlotAggregate' })
export type AggregationsBoxPlotAggregate = z.infer<typeof AggregationsBoxPlotAggregate>

export const AggregationsTopMetrics = z.object({
  sort: z.array(z.union([FieldValue, z.null()])),
  metrics: z.record(z.string(), z.union([FieldValue, z.null()]))
}).meta({ id: 'AggregationsTopMetrics' })
export type AggregationsTopMetrics = z.infer<typeof AggregationsTopMetrics>

export const AggregationsTopMetricsAggregate = z.object({
  ...AggregationsAggregateBase.shape,
  top: z.array(AggregationsTopMetrics)
}).meta({ id: 'AggregationsTopMetricsAggregate' })
export type AggregationsTopMetricsAggregate = z.infer<typeof AggregationsTopMetricsAggregate>

export const AggregationsTTestAggregate = z.object({
  ...AggregationsAggregateBase.shape,
  value: z.union([double, z.null()]),
  value_as_string: z.string().optional()
}).meta({ id: 'AggregationsTTestAggregate' })
export type AggregationsTTestAggregate = z.infer<typeof AggregationsTTestAggregate>

export const AggregationsRateAggregate = z.object({
  ...AggregationsAggregateBase.shape,
  value: double,
  value_as_string: z.string().optional()
}).meta({ id: 'AggregationsRateAggregate' })
export type AggregationsRateAggregate = z.infer<typeof AggregationsRateAggregate>

/** Result of the `cumulative_cardinality` aggregation */
export const AggregationsCumulativeCardinalityAggregate = z.object({
  ...AggregationsAggregateBase.shape,
  value: long,
  value_as_string: z.string().optional()
}).meta({ id: 'AggregationsCumulativeCardinalityAggregate' })
export type AggregationsCumulativeCardinalityAggregate = z.infer<typeof AggregationsCumulativeCardinalityAggregate>

export const AggregationsMatrixStatsFields = z.object({
  name: Field,
  count: long,
  mean: double,
  variance: double,
  skewness: double,
  kurtosis: double,
  covariance: z.record(Field, double),
  correlation: z.record(Field, double)
}).meta({ id: 'AggregationsMatrixStatsFields' })
export type AggregationsMatrixStatsFields = z.infer<typeof AggregationsMatrixStatsFields>

export const AggregationsMatrixStatsAggregate = z.object({
  ...AggregationsAggregateBase.shape,
  doc_count: long,
  fields: z.array(AggregationsMatrixStatsFields).optional()
}).meta({ id: 'AggregationsMatrixStatsAggregate' })
export type AggregationsMatrixStatsAggregate = z.infer<typeof AggregationsMatrixStatsAggregate>

export const AggregationsGeoLineAggregate = z.object({
  ...AggregationsAggregateBase.shape,
  type: z.string(),
  geometry: GeoLine,
  properties: z.any()
}).meta({ id: 'AggregationsGeoLineAggregate' })
export type AggregationsGeoLineAggregate = z.infer<typeof AggregationsGeoLineAggregate>

export const AggregationsAggregate = z.union([AggregationsCardinalityAggregate, AggregationsHdrPercentilesAggregate, AggregationsHdrPercentileRanksAggregate, AggregationsTDigestPercentilesAggregate, AggregationsTDigestPercentileRanksAggregate, AggregationsPercentilesBucketAggregate, AggregationsMedianAbsoluteDeviationAggregate, AggregationsMinAggregate, AggregationsMaxAggregate, AggregationsSumAggregate, AggregationsAvgAggregate, AggregationsWeightedAvgAggregate, AggregationsValueCountAggregate, AggregationsSimpleValueAggregate, AggregationsDerivativeAggregate, AggregationsBucketMetricValueAggregate, AggregationsChangePointAggregate, AggregationsStatsAggregate, AggregationsStatsBucketAggregate, AggregationsExtendedStatsAggregate, AggregationsExtendedStatsBucketAggregate, AggregationsCartesianBoundsAggregate, AggregationsCartesianCentroidAggregate, AggregationsGeoBoundsAggregate, AggregationsGeoCentroidAggregate, AggregationsHistogramAggregate, AggregationsDateHistogramAggregate, AggregationsAutoDateHistogramAggregate, AggregationsVariableWidthHistogramAggregate, AggregationsStringTermsAggregate, AggregationsLongTermsAggregate, AggregationsDoubleTermsAggregate, AggregationsUnmappedTermsAggregate, AggregationsLongRareTermsAggregate, AggregationsStringRareTermsAggregate, AggregationsUnmappedRareTermsAggregate, AggregationsMultiTermsAggregate, AggregationsMissingAggregate, AggregationsNestedAggregate, AggregationsReverseNestedAggregate, AggregationsGlobalAggregate, AggregationsFilterAggregate, AggregationsChildrenAggregate, AggregationsParentAggregate, AggregationsSamplerAggregate, AggregationsUnmappedSamplerAggregate, AggregationsGeoHashGridAggregate, AggregationsGeoTileGridAggregate, AggregationsGeoHexGridAggregate, AggregationsRangeAggregate, AggregationsDateRangeAggregate, AggregationsGeoDistanceAggregate, AggregationsIpRangeAggregate, AggregationsIpPrefixAggregate, AggregationsFiltersAggregate, AggregationsAdjacencyMatrixAggregate, AggregationsSignificantLongTermsAggregate, AggregationsSignificantStringTermsAggregate, AggregationsUnmappedSignificantTermsAggregate, AggregationsCompositeAggregate, AggregationsFrequentItemSetsAggregate, AggregationsTimeSeriesAggregate, AggregationsScriptedMetricAggregate, AggregationsTopHitsAggregate, AggregationsInferenceAggregate, AggregationsStringStatsAggregate, AggregationsBoxPlotAggregate, AggregationsTopMetricsAggregate, AggregationsTTestAggregate, AggregationsRateAggregate, AggregationsCumulativeCardinalityAggregate, AggregationsMatrixStatsAggregate, AggregationsGeoLineAggregate]).meta({ id: 'AggregationsAggregate' })
export type AggregationsAggregate = z.infer<typeof AggregationsAggregate>

export const FieldSort = z.object({
  missing: AggregationsMissing.optional(),
  mode: SortMode.optional(),
  nested: z.lazy(() => NestedSortValue).optional(),
  order: SortOrder.optional(),
  unmapped_type: z.lazy(() => MappingFieldType).optional(),
  numeric_type: FieldSortNumericType.optional(),
  format: z.string().optional()
}).meta({ id: 'FieldSort' })
export type FieldSort = z.infer<typeof FieldSort>

export const AggregationsAdjacencyMatrixBucket = z.object({
  doc_count: long,
  key: z.string()
}).catchall(z.any()).meta({ id: 'AggregationsAdjacencyMatrixBucket' })
export type AggregationsAdjacencyMatrixBucket = z.infer<typeof AggregationsAdjacencyMatrixBucket>

export const AggregationsCompositeBucket = z.object({
  doc_count: long,
  key: AggregationsCompositeAggregateKey
}).catchall(z.any()).meta({ id: 'AggregationsCompositeBucket' })
export type AggregationsCompositeBucket = z.infer<typeof AggregationsCompositeBucket>

export const AggregationsDateHistogramBucket = z.object({
  doc_count: long,
  key_as_string: z.string().optional(),
  key: EpochTime
}).catchall(z.any()).meta({ id: 'AggregationsDateHistogramBucket' })
export type AggregationsDateHistogramBucket = z.infer<typeof AggregationsDateHistogramBucket>

export const AggregationsTermsBucketBase = z.object({
  ...AggregationsMultiBucketBase.shape,
  doc_count_error_upper_bound: long.optional()
}).meta({ id: 'AggregationsTermsBucketBase' })
export type AggregationsTermsBucketBase = z.infer<typeof AggregationsTermsBucketBase>

export const AggregationsDoubleTermsBucket = z.object({
  doc_count: long,
  doc_count_error_upper_bound: long.optional(),
  key: double,
  key_as_string: z.string().optional()
}).catchall(z.any()).meta({ id: 'AggregationsDoubleTermsBucket' })
export type AggregationsDoubleTermsBucket = z.infer<typeof AggregationsDoubleTermsBucket>

export const AggregationsFiltersBucket = z.object({
  doc_count: long,
  key: z.string().optional()
}).catchall(z.any()).meta({ id: 'AggregationsFiltersBucket' })
export type AggregationsFiltersBucket = z.infer<typeof AggregationsFiltersBucket>

export const AggregationsFrequentItemSetsBucket = z.object({
  doc_count: long,
  key: z.record(Field, z.array(z.string())),
  support: double
}).catchall(z.any()).meta({ id: 'AggregationsFrequentItemSetsBucket' })
export type AggregationsFrequentItemSetsBucket = z.infer<typeof AggregationsFrequentItemSetsBucket>

export const AggregationsGeoHashGridBucket = z.object({
  doc_count: long,
  key: GeoHash
}).catchall(z.any()).meta({ id: 'AggregationsGeoHashGridBucket' })
export type AggregationsGeoHashGridBucket = z.infer<typeof AggregationsGeoHashGridBucket>

export const AggregationsGeoHexGridBucket = z.object({
  doc_count: long,
  key: GeoHexCell
}).catchall(z.any()).meta({ id: 'AggregationsGeoHexGridBucket' })
export type AggregationsGeoHexGridBucket = z.infer<typeof AggregationsGeoHexGridBucket>

export const AggregationsGeoTileGridBucket = z.object({
  doc_count: long,
  key: GeoTile
}).catchall(z.any()).meta({ id: 'AggregationsGeoTileGridBucket' })
export type AggregationsGeoTileGridBucket = z.infer<typeof AggregationsGeoTileGridBucket>

export const AggregationsHistogramBucket = z.object({
  doc_count: long,
  key_as_string: z.string().optional(),
  key: double
}).catchall(z.any()).meta({ id: 'AggregationsHistogramBucket' })
export type AggregationsHistogramBucket = z.infer<typeof AggregationsHistogramBucket>

export const AggregationsIpPrefixBucket = z.object({
  doc_count: long,
  is_ipv6: z.boolean(),
  key: z.string(),
  prefix_length: integer,
  netmask: z.string().optional()
}).catchall(z.any()).meta({ id: 'AggregationsIpPrefixBucket' })
export type AggregationsIpPrefixBucket = z.infer<typeof AggregationsIpPrefixBucket>

export const AggregationsIpRangeBucket = z.object({
  doc_count: long,
  key: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional()
}).catchall(z.any()).meta({ id: 'AggregationsIpRangeBucket' })
export type AggregationsIpRangeBucket = z.infer<typeof AggregationsIpRangeBucket>

export const AggregationsLongRareTermsBucket = z.object({
  doc_count: long,
  key: long,
  key_as_string: z.string().optional()
}).catchall(z.any()).meta({ id: 'AggregationsLongRareTermsBucket' })
export type AggregationsLongRareTermsBucket = z.infer<typeof AggregationsLongRareTermsBucket>

export const AggregationsLongTermsBucket = z.object({
  doc_count: long,
  doc_count_error_upper_bound: long.optional(),
  key: long,
  key_as_string: z.string().optional()
}).catchall(z.any()).meta({ id: 'AggregationsLongTermsBucket' })
export type AggregationsLongTermsBucket = z.infer<typeof AggregationsLongTermsBucket>

export const AggregationsMultiTermsBucket = z.object({
  doc_count: long,
  key: z.array(FieldValue),
  key_as_string: z.string().optional(),
  doc_count_error_upper_bound: long.optional()
}).catchall(z.any()).meta({ id: 'AggregationsMultiTermsBucket' })
export type AggregationsMultiTermsBucket = z.infer<typeof AggregationsMultiTermsBucket>

export const AggregationsRangeBucket = z.object({
  doc_count: long,
  from: double.optional(),
  to: double.optional(),
  from_as_string: z.string().optional(),
  to_as_string: z.string().optional(),
  key: z.string().describe('The bucket key. Present if the aggregation is _not_ keyed').optional()
}).catchall(z.any()).meta({ id: 'AggregationsRangeBucket' })
export type AggregationsRangeBucket = z.infer<typeof AggregationsRangeBucket>

export const AggregationsSignificantTermsBucketBase = z.object({
  ...AggregationsMultiBucketBase.shape,
  score: double,
  bg_count: long
}).meta({ id: 'AggregationsSignificantTermsBucketBase' })
export type AggregationsSignificantTermsBucketBase = z.infer<typeof AggregationsSignificantTermsBucketBase>

export const AggregationsSignificantLongTermsBucket = z.object({
  doc_count: long,
  score: double,
  bg_count: long,
  key: long,
  key_as_string: z.string().optional()
}).catchall(z.any()).meta({ id: 'AggregationsSignificantLongTermsBucket' })
export type AggregationsSignificantLongTermsBucket = z.infer<typeof AggregationsSignificantLongTermsBucket>

export const AggregationsSignificantStringTermsBucket = z.object({
  doc_count: long,
  score: double,
  bg_count: long,
  key: z.string()
}).catchall(z.any()).meta({ id: 'AggregationsSignificantStringTermsBucket' })
export type AggregationsSignificantStringTermsBucket = z.infer<typeof AggregationsSignificantStringTermsBucket>

export const AggregationsStringRareTermsBucket = z.object({
  doc_count: long,
  key: z.string()
}).catchall(z.any()).meta({ id: 'AggregationsStringRareTermsBucket' })
export type AggregationsStringRareTermsBucket = z.infer<typeof AggregationsStringRareTermsBucket>

export const AggregationsStringTermsBucket = z.object({
  doc_count: long,
  doc_count_error_upper_bound: long.optional(),
  key: FieldValue
}).catchall(z.any()).meta({ id: 'AggregationsStringTermsBucket' })
export type AggregationsStringTermsBucket = z.infer<typeof AggregationsStringTermsBucket>

export const AggregationsTimeSeriesBucket = z.object({
  doc_count: long,
  key: z.record(Field, FieldValue)
}).catchall(z.any()).meta({ id: 'AggregationsTimeSeriesBucket' })
export type AggregationsTimeSeriesBucket = z.infer<typeof AggregationsTimeSeriesBucket>

export const AggregationsVariableWidthHistogramBucket = z.object({
  doc_count: long,
  min: double,
  key: double,
  max: double,
  min_as_string: z.string().optional(),
  key_as_string: z.string().optional(),
  max_as_string: z.string().optional()
}).catchall(z.any()).meta({ id: 'AggregationsVariableWidthHistogramBucket' })
export type AggregationsVariableWidthHistogramBucket = z.infer<typeof AggregationsVariableWidthHistogramBucket>
