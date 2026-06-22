/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Script } from './_global.search'
import type { ScriptShape } from './_global.search'
import { DateTime, Field, FieldValue, Fields, GeoLocation, Id, IndexName, Metadata, Name, PropertyName, RelationName, TokenPruningConfig, byte, double, float, integer, long, short, ulong } from './_types'
import { AnalysisIcuCollationAlternate, AnalysisIcuCollationCaseFirst, AnalysisIcuCollationDecomposition, AnalysisIcuCollationStrength } from './_types.analysis'
import { IndicesFielddataFrequencyFilter, IndicesNumericFielddata } from './indices'

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

export const MappingTimeSeriesMetricType = z.enum(['gauge', 'counter', 'summary', 'histogram', 'position']).meta({ id: 'MappingTimeSeriesMetricType' })
export type MappingTimeSeriesMetricType = z.infer<typeof MappingTimeSeriesMetricType>

export const MappingFieldType = z.enum(['none', 'geo_point', 'geo_shape', 'ip', 'binary', 'keyword', 'text', 'search_as_you_type', 'wildcard', 'date', 'date_nanos', 'boolean', 'completion', 'nested', 'object', 'passthrough', 'version', 'murmur3', 'token_count', 'percolator', 'integer', 'long', 'short', 'byte', 'float', 'half_float', 'scaled_float', 'double', 'integer_range', 'float_range', 'long_range', 'double_range', 'date_range', 'ip_range', 'alias', 'join', 'rank_feature', 'rank_features', 'flattened', 'shape', 'histogram', 'constant_keyword', 'counted_keyword', 'aggregate_metric_double', 'dense_vector', 'semantic_text', 'sparse_vector', 'match_only_text', 'icu_collation_keyword']).meta({ id: 'MappingFieldType' })
export type MappingFieldType = z.infer<typeof MappingFieldType>

export const MappingOnScriptError = z.enum(['fail', 'continue']).meta({ id: 'MappingOnScriptError' })
export type MappingOnScriptError = z.infer<typeof MappingOnScriptError>

export const MappingIndexOptions = z.enum(['docs', 'freqs', 'positions', 'offsets']).meta({ id: 'MappingIndexOptions' })
export type MappingIndexOptions = z.infer<typeof MappingIndexOptions>

export const MappingTextIndexPrefixes = z.object({
  max_chars: integer,
  min_chars: integer
}).meta({ id: 'MappingTextIndexPrefixes' })
export type MappingTextIndexPrefixes = z.infer<typeof MappingTextIndexPrefixes>

export const MappingTermVectorOption = z.enum(['no', 'yes', 'with_offsets', 'with_positions', 'with_positions_offsets', 'with_positions_offsets_payloads', 'with_positions_payloads']).meta({ id: 'MappingTermVectorOption' })
export type MappingTermVectorOption = z.infer<typeof MappingTermVectorOption>

export interface MappingMatchOnlyTextPropertyShape {
  type: 'match_only_text'
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  meta?: Record<string, string> | undefined
  copy_to?: Fields | undefined
}
/**
 * A variant of text that trades scoring and efficiency of positional queries for space efficiency. This field
 * effectively stores data the same way as a text field that only indexes documents (index_options: docs) and
 * disables norms (norms: false). Term queries perform as fast if not faster as on text fields, however queries
 * that need positions such as the match_phrase query perform slower as they need to look at the _source document
 * to verify whether a phrase matches. All queries return constant scores that are equal to 1.0.
 */
export const MappingMatchOnlyTextProperty = z.object({
  type: z.literal('match_only_text'),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).describe('Multi-fields allow the same string value to be indexed in multiple ways for different purposes, such as one field for search and a multi-field for sorting and aggregations, or the same string value analyzed by different analyzers.').optional() },
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  copy_to: Fields.describe('Allows you to copy the values of multiple fields into a group field, which can then be queried as a single field.').optional()
}).meta({ id: 'MappingMatchOnlyTextProperty' })
export type MappingMatchOnlyTextProperty = z.infer<typeof MappingMatchOnlyTextProperty>

export const MappingDenseVectorElementType = z.enum(['bit', 'byte', 'float', 'bfloat16']).meta({ id: 'MappingDenseVectorElementType' })
export type MappingDenseVectorElementType = z.infer<typeof MappingDenseVectorElementType>

export const MappingDenseVectorIndexOptionsType = z.enum(['bbq_flat', 'bbq_hnsw', 'bbq_disk', 'flat', 'hnsw', 'int4_flat', 'int4_hnsw', 'int8_flat', 'int8_hnsw']).meta({ id: 'MappingDenseVectorIndexOptionsType' })
export type MappingDenseVectorIndexOptionsType = z.infer<typeof MappingDenseVectorIndexOptionsType>

export const MappingDenseVectorIndexOptionsRescoreVector = z.object({
  oversample: float.describe('The oversampling factor to use when searching for the nearest neighbor. This is only applicable to the quantized formats: `bbq_*`, `int4_*`, and `int8_*`. When provided, `oversample * k` vectors will be gathered and then their scores will be re-computed with the original vectors. valid values are between `1.0` and `10.0` (inclusive), or `0` exactly to disable oversampling.')
}).meta({ id: 'MappingDenseVectorIndexOptionsRescoreVector' })
export type MappingDenseVectorIndexOptionsRescoreVector = z.infer<typeof MappingDenseVectorIndexOptionsRescoreVector>

export const MappingDenseVectorIndexOptions = z.object({
  confidence_interval: float.describe('The confidence interval to use when quantizing the vectors. Can be any value between and including `0.90` and `1.0` or exactly `0`. When the value is `0`, this indicates that dynamic quantiles should be calculated for optimized quantization. When between `0.90` and `1.0`, this value restricts the values used when calculating the quantization thresholds. For example, a value of `0.95` will only use the middle `95%` of the values when calculating the quantization thresholds (e.g. the highest and lowest `2.5%` of values will be ignored). Defaults to `1/(dims + 1)` for `int8` quantized vectors and `0` for `int4` for dynamic quantile calculation. Only applicable to `int8_hnsw`, `int4_hnsw`, `int8_flat`, and `int4_flat` index types.').optional(),
  ef_construction: integer.describe('The number of candidates to track while assembling the list of nearest neighbors for each new node. Only applicable to `hnsw`, `int8_hnsw`, `bbq_hnsw`, and `int4_hnsw` index types.').optional(),
  m: integer.describe('The number of neighbors each node will be connected to in the HNSW graph. Only applicable to `hnsw`, `int8_hnsw`, `bbq_hnsw`, and `int4_hnsw` index types.').optional(),
  type: MappingDenseVectorIndexOptionsType.describe('The type of kNN algorithm to use.'),
  rescore_vector: MappingDenseVectorIndexOptionsRescoreVector.describe('The rescore vector options. This is only applicable to `bbq_disk`, `bbq_hnsw`, `int4_hnsw`, `int8_hnsw`, `bbq_flat`, `int4_flat`, and `int8_flat` index types.').optional()
}).meta({ id: 'MappingDenseVectorIndexOptions' })
export type MappingDenseVectorIndexOptions = z.infer<typeof MappingDenseVectorIndexOptions>

export const MappingDenseVectorSimilarity = z.enum(['cosine', 'dot_product', 'l2_norm', 'max_inner_product']).meta({ id: 'MappingDenseVectorSimilarity' })
export type MappingDenseVectorSimilarity = z.infer<typeof MappingDenseVectorSimilarity>

export const MappingSubobjects = z.union([z.boolean(), z.enum(['true', 'false', 'auto'])]).meta({ id: 'MappingSubobjects' })
export type MappingSubobjects = z.infer<typeof MappingSubobjects>

export const MappingRankVectorElementType = z.enum(['byte', 'float', 'bit']).meta({ id: 'MappingRankVectorElementType' })
export type MappingRankVectorElementType = z.infer<typeof MappingRankVectorElementType>

export const MappingSparseVectorIndexOptions = z.object({
  prune: z.boolean().describe('Whether to perform pruning, omitting the non-significant tokens from the query to improve query performance. If prune is true but the pruning_config is not specified, pruning will occur but default values will be used. Default: false').optional(),
  pruning_config: TokenPruningConfig.describe('Optional pruning configuration. If enabled, this will omit non-significant tokens from the query in order to improve query performance. This is only used if prune is set to true. If prune is set to true but pruning_config is not specified, default values will be used.').optional()
}).meta({ id: 'MappingSparseVectorIndexOptions' })
export type MappingSparseVectorIndexOptions = z.infer<typeof MappingSparseVectorIndexOptions>

export const MappingSemanticTextIndexOptions = z.object({
  dense_vector: MappingDenseVectorIndexOptions.optional(),
  sparse_vector: MappingSparseVectorIndexOptions.optional()
}).meta({ id: 'MappingSemanticTextIndexOptions' })
export type MappingSemanticTextIndexOptions = z.infer<typeof MappingSemanticTextIndexOptions>

export const MappingChunkingSettings = z.object({
  strategy: z.string().describe('The chunking strategy: `sentence`, `word`, `none` or `recursive`.  * If `strategy` is set to `recursive`, you must also specify: - `max_chunk_size` - either `separators` or`separator_group` Learn more about different chunking strategies in the linked documentation.'),
  max_chunk_size: integer.describe('The maximum size of a chunk in words. This value cannot be lower than `20` (for `sentence` strategy) or `10` (for `word` strategy). This value should not exceed the window size for the associated model.'),
  overlap: integer.describe('The number of overlapping words for chunks. It is applicable only to a `word` chunking strategy. This value cannot be higher than half the `max_chunk_size` value.').optional(),
  sentence_overlap: integer.describe('The number of overlapping sentences for chunks. It is applicable only for a `sentence` chunking strategy. It can be either `1` or `0`.').optional(),
  separator_group: z.string().describe('Only applicable to the `recursive` strategy and required when using it. Sets a predefined list of separators in the saved chunking settings based on the selected text type. Values can be `markdown` or `plaintext`. Using this parameter is an alternative to manually specifying a custom `separators` list.').optional(),
  separators: z.array(z.string()).describe('Only applicable to the `recursive` strategy and required when using it. A list of strings used as possible split points when chunking text. Each string can be a plain string or a regular expression (regex) pattern. The system tries each separator in order to split the text, starting from the first item in the list. After splitting, it attempts to recombine smaller pieces into larger chunks that stay within the `max_chunk_size` limit, to reduce the total number of chunks generated.').optional()
}).meta({ id: 'MappingChunkingSettings' })
export type MappingChunkingSettings = z.infer<typeof MappingChunkingSettings>

export interface MappingSemanticTextPropertyShape {
  type: 'semantic_text'
  meta?: Record<string, string> | undefined
  inference_id?: Id | undefined
  search_inference_id?: Id | undefined
  index_options?: MappingSemanticTextIndexOptions | undefined
  chunking_settings?: MappingChunkingSettings | null | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
}
export const MappingSemanticTextProperty = z.object({
  type: z.literal('semantic_text'),
  meta: z.record(z.string(), z.string()).optional(),
  inference_id: Id.describe('Inference endpoint that will be used to generate embeddings for the field. This parameter cannot be updated. Use the Create inference API to create the endpoint. If `search_inference_id` is specified, the inference endpoint will only be used at index time.').optional(),
  search_inference_id: Id.describe('Inference endpoint that will be used to generate embeddings at query time. You can update this parameter by using the Update mapping API. Use the Create inference API to create the endpoint. If not specified, the inference endpoint defined by inference_id will be used at both index and query time.').optional(),
  index_options: MappingSemanticTextIndexOptions.describe('Settings for index_options that override any defaults used by semantic_text, for example specific quantization settings.').optional(),
  chunking_settings: z.union([MappingChunkingSettings, z.null()]).describe('Settings for chunking text into smaller passages. If specified, these will override the chunking settings sent in the inference endpoint associated with inference_id. If chunking settings are updated, they will not be applied to existing documents until they are reindexed.').optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).describe('Multi-fields allow the same string value to be indexed in multiple ways for different purposes, such as one field for search and a multi-field for sorting and aggregations, or the same string value analyzed by different analyzers.').optional() }
}).meta({ id: 'MappingSemanticTextProperty' })
export type MappingSemanticTextProperty = z.infer<typeof MappingSemanticTextProperty>

export const MappingSuggestContext = z.object({
  name: Name,
  path: Field.optional(),
  type: z.string(),
  precision: z.union([integer, z.string()]).optional()
}).meta({ id: 'MappingSuggestContext' })
export type MappingSuggestContext = z.infer<typeof MappingSuggestContext>

export const MappingGeoPointMetricType = z.enum(['gauge', 'counter', 'position']).meta({ id: 'MappingGeoPointMetricType' })
export type MappingGeoPointMetricType = z.infer<typeof MappingGeoPointMetricType>

export const MappingGeoOrientation = z.enum(['right', 'RIGHT', 'counterclockwise', 'ccw', 'left', 'LEFT', 'clockwise', 'cw']).meta({ id: 'MappingGeoOrientation' })
export type MappingGeoOrientation = z.infer<typeof MappingGeoOrientation>

export const MappingGeoStrategy = z.enum(['recursive', 'term']).meta({ id: 'MappingGeoStrategy' })
export type MappingGeoStrategy = z.infer<typeof MappingGeoStrategy>

export type MappingPropertyShape = MappingBinaryPropertyShape | MappingBooleanPropertyShape | MappingDynamicPropertyShape | MappingJoinPropertyShape | MappingKeywordPropertyShape | MappingMatchOnlyTextPropertyShape | MappingPercolatorPropertyShape | MappingRankFeaturePropertyShape | MappingRankFeaturesPropertyShape | MappingSearchAsYouTypePropertyShape | MappingTextPropertyShape | MappingVersionPropertyShape | MappingWildcardPropertyShape | MappingDateNanosPropertyShape | MappingDatePropertyShape | MappingAggregateMetricDoublePropertyShape | MappingDenseVectorPropertyShape | MappingFlattenedPropertyShape | MappingNestedPropertyShape | MappingObjectPropertyShape | MappingPassthroughObjectPropertyShape | MappingRankVectorPropertyShape | MappingSemanticTextPropertyShape | MappingSparseVectorPropertyShape | MappingCompletionPropertyShape | MappingConstantKeywordPropertyShape | MappingCountedKeywordPropertyShape | MappingFieldAliasPropertyShape | MappingHistogramPropertyShape | MappingExponentialHistogramPropertyShape | MappingIpPropertyShape | MappingMurmur3HashPropertyShape | MappingTokenCountPropertyShape | MappingGeoPointPropertyShape | MappingGeoShapePropertyShape | MappingPointPropertyShape | MappingShapePropertyShape | MappingByteNumberPropertyShape | MappingDoubleNumberPropertyShape | MappingFloatNumberPropertyShape | MappingHalfFloatNumberPropertyShape | MappingIntegerNumberPropertyShape | MappingLongNumberPropertyShape | MappingScaledFloatNumberPropertyShape | MappingShortNumberPropertyShape | MappingUnsignedLongNumberPropertyShape | MappingDateRangePropertyShape | MappingDoubleRangePropertyShape | MappingFloatRangePropertyShape | MappingIntegerRangePropertyShape | MappingIpRangePropertyShape | MappingLongRangePropertyShape | MappingIcuCollationPropertyShape
export const MappingProperty: z.ZodType<MappingPropertyShape> = z.union([z.lazy(() => MappingBinaryProperty), z.lazy(() => MappingBooleanProperty), z.lazy(() => MappingDynamicProperty), z.lazy(() => MappingJoinProperty), z.lazy(() => MappingKeywordProperty), z.lazy(() => MappingMatchOnlyTextProperty), z.lazy(() => MappingPercolatorProperty), z.lazy(() => MappingRankFeatureProperty), z.lazy(() => MappingRankFeaturesProperty), z.lazy(() => MappingSearchAsYouTypeProperty), z.lazy(() => MappingTextProperty), z.lazy(() => MappingVersionProperty), z.lazy(() => MappingWildcardProperty), z.lazy(() => MappingDateNanosProperty), z.lazy(() => MappingDateProperty), z.lazy(() => MappingAggregateMetricDoubleProperty), z.lazy(() => MappingDenseVectorProperty), z.lazy(() => MappingFlattenedProperty), z.lazy(() => MappingNestedProperty), z.lazy(() => MappingObjectProperty), z.lazy(() => MappingPassthroughObjectProperty), z.lazy(() => MappingRankVectorProperty), z.lazy(() => MappingSemanticTextProperty), z.lazy(() => MappingSparseVectorProperty), z.lazy(() => MappingCompletionProperty), z.lazy(() => MappingConstantKeywordProperty), z.lazy(() => MappingCountedKeywordProperty), z.lazy(() => MappingFieldAliasProperty), z.lazy(() => MappingHistogramProperty), z.lazy(() => MappingExponentialHistogramProperty), z.lazy(() => MappingIpProperty), z.lazy(() => MappingMurmur3HashProperty), z.lazy(() => MappingTokenCountProperty), z.lazy(() => MappingGeoPointProperty), z.lazy(() => MappingGeoShapeProperty), z.lazy(() => MappingPointProperty), z.lazy(() => MappingShapeProperty), z.lazy(() => MappingByteNumberProperty), z.lazy(() => MappingDoubleNumberProperty), z.lazy(() => MappingFloatNumberProperty), z.lazy(() => MappingHalfFloatNumberProperty), z.lazy(() => MappingIntegerNumberProperty), z.lazy(() => MappingLongNumberProperty), z.lazy(() => MappingScaledFloatNumberProperty), z.lazy(() => MappingShortNumberProperty), z.lazy(() => MappingUnsignedLongNumberProperty), z.lazy(() => MappingDateRangeProperty), z.lazy(() => MappingDoubleRangeProperty), z.lazy(() => MappingFloatRangeProperty), z.lazy(() => MappingIntegerRangeProperty), z.lazy(() => MappingIpRangeProperty), z.lazy(() => MappingLongRangeProperty), z.lazy(() => MappingIcuCollationProperty)]).meta({ id: 'MappingProperty' })
export type MappingProperty = z.infer<typeof MappingProperty>

export const MappingDynamicMapping = z.union([z.boolean(), z.enum(['strict', 'runtime', 'true', 'false'])]).meta({ id: 'MappingDynamicMapping' })
export type MappingDynamicMapping = z.infer<typeof MappingDynamicMapping>

export const MappingSyntheticSourceKeepEnum = z.enum(['none', 'arrays', 'all']).meta({ id: 'MappingSyntheticSourceKeepEnum' })
export type MappingSyntheticSourceKeepEnum = z.infer<typeof MappingSyntheticSourceKeepEnum>

export interface MappingPropertyBaseShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
}
export const MappingPropertyBase = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional()
}).meta({ id: 'MappingPropertyBase' })
export type MappingPropertyBase = z.infer<typeof MappingPropertyBase>

export interface MappingAggregateMetricDoublePropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  type: 'aggregate_metric_double'
  default_metric: string
  ignore_malformed?: boolean | undefined
  metrics: string[]
  time_series_metric?: MappingTimeSeriesMetricType | undefined
}
export const MappingAggregateMetricDoubleProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  type: z.literal('aggregate_metric_double'),
  default_metric: z.string(),
  ignore_malformed: z.boolean().optional(),
  metrics: z.array(z.string()),
  time_series_metric: MappingTimeSeriesMetricType.optional()
}).meta({ id: 'MappingAggregateMetricDoubleProperty' })
export type MappingAggregateMetricDoubleProperty = z.infer<typeof MappingAggregateMetricDoubleProperty>

export const MappingAllField = z.object({
  analyzer: z.string(),
  enabled: z.boolean(),
  omit_norms: z.boolean(),
  search_analyzer: z.string(),
  similarity: z.string(),
  store: z.boolean(),
  store_term_vector_offsets: z.boolean(),
  store_term_vector_payloads: z.boolean(),
  store_term_vector_positions: z.boolean(),
  store_term_vectors: z.boolean()
}).meta({ id: 'MappingAllField' })
export type MappingAllField = z.infer<typeof MappingAllField>

export interface MappingCorePropertyBaseShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
}
export const MappingCorePropertyBase = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional()
}).meta({ id: 'MappingCorePropertyBase' })
export type MappingCorePropertyBase = z.infer<typeof MappingCorePropertyBase>

export interface MappingDocValuesPropertyBaseShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
}
export const MappingDocValuesPropertyBase = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional()
}).meta({ id: 'MappingDocValuesPropertyBase' })
export type MappingDocValuesPropertyBase = z.infer<typeof MappingDocValuesPropertyBase>

export interface MappingBinaryPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  type: 'binary'
}
export const MappingBinaryProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  type: z.literal('binary')
}).meta({ id: 'MappingBinaryProperty' })
export type MappingBinaryProperty = z.infer<typeof MappingBinaryProperty>

export interface MappingBooleanPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  fielddata?: IndicesNumericFielddata | undefined
  index?: boolean | undefined
  null_value?: boolean | undefined
  ignore_malformed?: boolean | undefined
  script?: ScriptShape | undefined
  on_script_error?: MappingOnScriptError | undefined
  time_series_dimension?: boolean | undefined
  type: 'boolean'
}
export const MappingBooleanProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  fielddata: z.lazy(() => IndicesNumericFielddata).optional(),
  index: z.boolean().optional(),
  null_value: z.boolean().optional(),
  ignore_malformed: z.boolean().optional(),
  get script () { return Script.optional() },
  on_script_error: MappingOnScriptError.optional(),
  time_series_dimension: z.boolean().describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  type: z.literal('boolean')
}).meta({ id: 'MappingBooleanProperty' })
export type MappingBooleanProperty = z.infer<typeof MappingBooleanProperty>

export interface MappingNumberPropertyBaseShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  coerce?: boolean | undefined
  ignore_malformed?: boolean | undefined
  index?: boolean | undefined
  on_script_error?: MappingOnScriptError | undefined
  script?: ScriptShape | undefined
  time_series_metric?: MappingTimeSeriesMetricType | undefined
  time_series_dimension?: boolean | undefined
}
export const MappingNumberPropertyBase = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  coerce: z.boolean().optional(),
  ignore_malformed: z.boolean().optional(),
  index: z.boolean().optional(),
  on_script_error: MappingOnScriptError.optional(),
  get script () { return Script.optional() },
  time_series_metric: MappingTimeSeriesMetricType.describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  time_series_dimension: z.boolean().describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional()
}).meta({ id: 'MappingNumberPropertyBase' })
export type MappingNumberPropertyBase = z.infer<typeof MappingNumberPropertyBase>

export interface MappingByteNumberPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  coerce?: boolean | undefined
  ignore_malformed?: boolean | undefined
  index?: boolean | undefined
  on_script_error?: MappingOnScriptError | undefined
  script?: ScriptShape | undefined
  time_series_metric?: MappingTimeSeriesMetricType | undefined
  time_series_dimension?: boolean | undefined
  type: 'byte'
  null_value?: byte | undefined
}
export const MappingByteNumberProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  coerce: z.boolean().optional(),
  ignore_malformed: z.boolean().optional(),
  index: z.boolean().optional(),
  on_script_error: MappingOnScriptError.optional(),
  get script () { return Script.optional() },
  time_series_metric: MappingTimeSeriesMetricType.describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  time_series_dimension: z.boolean().describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  type: z.literal('byte'),
  null_value: byte.optional()
}).meta({ id: 'MappingByteNumberProperty' })
export type MappingByteNumberProperty = z.infer<typeof MappingByteNumberProperty>

export interface MappingCompletionPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  analyzer?: string | undefined
  contexts?: MappingSuggestContext[] | undefined
  max_input_length?: integer | undefined
  preserve_position_increments?: boolean | undefined
  preserve_separators?: boolean | undefined
  search_analyzer?: string | undefined
  type: 'completion'
}
export const MappingCompletionProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  analyzer: z.string().optional(),
  contexts: z.array(MappingSuggestContext).optional(),
  max_input_length: integer.optional(),
  preserve_position_increments: z.boolean().optional(),
  preserve_separators: z.boolean().optional(),
  search_analyzer: z.string().optional(),
  type: z.literal('completion')
}).meta({ id: 'MappingCompletionProperty' })
export type MappingCompletionProperty = z.infer<typeof MappingCompletionProperty>

export interface MappingConstantKeywordPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  value?: unknown | undefined
  type: 'constant_keyword'
}
export const MappingConstantKeywordProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  value: z.any().optional(),
  type: z.literal('constant_keyword')
}).meta({ id: 'MappingConstantKeywordProperty' })
export type MappingConstantKeywordProperty = z.infer<typeof MappingConstantKeywordProperty>

export interface MappingCountedKeywordPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  type: 'counted_keyword'
  index?: boolean | undefined
}
export const MappingCountedKeywordProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  type: z.literal('counted_keyword'),
  index: z.boolean().optional()
}).meta({ id: 'MappingCountedKeywordProperty' })
export type MappingCountedKeywordProperty = z.infer<typeof MappingCountedKeywordProperty>

export const MappingDataStreamTimestamp = z.object({
  enabled: z.boolean()
}).meta({ id: 'MappingDataStreamTimestamp' })
export type MappingDataStreamTimestamp = z.infer<typeof MappingDataStreamTimestamp>

export interface MappingDateNanosPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  format?: string | undefined
  ignore_malformed?: boolean | undefined
  index?: boolean | undefined
  script?: ScriptShape | undefined
  on_script_error?: MappingOnScriptError | undefined
  null_value?: DateTime | undefined
  precision_step?: integer | undefined
  type: 'date_nanos'
}
export const MappingDateNanosProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  format: z.string().optional(),
  ignore_malformed: z.boolean().optional(),
  index: z.boolean().optional(),
  get script () { return Script.optional() },
  on_script_error: MappingOnScriptError.optional(),
  null_value: DateTime.optional(),
  precision_step: integer.optional(),
  type: z.literal('date_nanos')
}).meta({ id: 'MappingDateNanosProperty' })
export type MappingDateNanosProperty = z.infer<typeof MappingDateNanosProperty>

export interface MappingDatePropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  fielddata?: IndicesNumericFielddata | undefined
  format?: string | undefined
  ignore_malformed?: boolean | undefined
  index?: boolean | undefined
  script?: ScriptShape | undefined
  on_script_error?: MappingOnScriptError | undefined
  null_value?: DateTime | undefined
  precision_step?: integer | undefined
  locale?: string | undefined
  type: 'date'
}
export const MappingDateProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  fielddata: z.lazy(() => IndicesNumericFielddata).optional(),
  format: z.string().optional(),
  ignore_malformed: z.boolean().optional(),
  index: z.boolean().optional(),
  get script () { return Script.optional() },
  on_script_error: MappingOnScriptError.optional(),
  null_value: DateTime.optional(),
  precision_step: integer.optional(),
  locale: z.string().optional(),
  type: z.literal('date')
}).meta({ id: 'MappingDateProperty' })
export type MappingDateProperty = z.infer<typeof MappingDateProperty>

export interface MappingRangePropertyBaseShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  coerce?: boolean | undefined
  index?: boolean | undefined
}
export const MappingRangePropertyBase = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  coerce: z.boolean().optional(),
  index: z.boolean().optional()
}).meta({ id: 'MappingRangePropertyBase' })
export type MappingRangePropertyBase = z.infer<typeof MappingRangePropertyBase>

export interface MappingDateRangePropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  coerce?: boolean | undefined
  index?: boolean | undefined
  format?: string | undefined
  type: 'date_range'
}
export const MappingDateRangeProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  coerce: z.boolean().optional(),
  index: z.boolean().optional(),
  format: z.string().optional(),
  type: z.literal('date_range')
}).meta({ id: 'MappingDateRangeProperty' })
export type MappingDateRangeProperty = z.infer<typeof MappingDateRangeProperty>

export interface MappingDenseVectorPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  type: 'dense_vector'
  dims?: integer | undefined
  element_type?: MappingDenseVectorElementType | undefined
  index?: boolean | undefined
  index_options?: MappingDenseVectorIndexOptions | undefined
  similarity?: MappingDenseVectorSimilarity | undefined
}
export const MappingDenseVectorProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  type: z.literal('dense_vector'),
  dims: integer.describe('Number of vector dimensions. Can\'t exceed `4096`. If `dims` is not specified, it will be set to the length of the first vector added to the field.').optional(),
  element_type: MappingDenseVectorElementType.describe('The data type used to encode vectors. The supported data types are `float` (default), `byte`, and `bit`.').optional(),
  index: z.boolean().describe('If `true`, you can search this field using the kNN search API.').optional(),
  index_options: MappingDenseVectorIndexOptions.describe('An optional section that configures the kNN indexing algorithm. The HNSW algorithm has two internal parameters that influence how the data structure is built. These can be adjusted to improve the accuracy of results, at the expense of slower indexing speed. This parameter can only be specified when `index` is `true`.').optional(),
  similarity: MappingDenseVectorSimilarity.describe('The vector similarity metric to use in kNN search. Documents are ranked by their vector field\'s similarity to the query vector. The `_score` of each document will be derived from the similarity, in a way that ensures scores are positive and that a larger score corresponds to a higher ranking. Defaults to `l2_norm` when `element_type` is `bit` otherwise defaults to `cosine`. `bit` vectors only support `l2_norm` as their similarity metric. This parameter can only be specified when `index` is `true`.').optional()
}).meta({ id: 'MappingDenseVectorProperty' })
export type MappingDenseVectorProperty = z.infer<typeof MappingDenseVectorProperty>

export interface MappingDoubleNumberPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  coerce?: boolean | undefined
  ignore_malformed?: boolean | undefined
  index?: boolean | undefined
  on_script_error?: MappingOnScriptError | undefined
  script?: ScriptShape | undefined
  time_series_metric?: MappingTimeSeriesMetricType | undefined
  time_series_dimension?: boolean | undefined
  type: 'double'
  null_value?: double | undefined
}
export const MappingDoubleNumberProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  coerce: z.boolean().optional(),
  ignore_malformed: z.boolean().optional(),
  index: z.boolean().optional(),
  on_script_error: MappingOnScriptError.optional(),
  get script () { return Script.optional() },
  time_series_metric: MappingTimeSeriesMetricType.describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  time_series_dimension: z.boolean().describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  type: z.literal('double'),
  null_value: double.optional()
}).meta({ id: 'MappingDoubleNumberProperty' })
export type MappingDoubleNumberProperty = z.infer<typeof MappingDoubleNumberProperty>

export interface MappingDoubleRangePropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  coerce?: boolean | undefined
  index?: boolean | undefined
  type: 'double_range'
}
export const MappingDoubleRangeProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  coerce: z.boolean().optional(),
  index: z.boolean().optional(),
  type: z.literal('double_range')
}).meta({ id: 'MappingDoubleRangeProperty' })
export type MappingDoubleRangeProperty = z.infer<typeof MappingDoubleRangeProperty>

export interface MappingDynamicPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  type: '{dynamic_type}'
  enabled?: boolean | undefined
  null_value?: FieldValue | undefined
  boost?: double | undefined
  coerce?: boolean | undefined
  script?: ScriptShape | undefined
  on_script_error?: MappingOnScriptError | undefined
  ignore_malformed?: boolean | undefined
  time_series_metric?: MappingTimeSeriesMetricType | undefined
  analyzer?: string | undefined
  eager_global_ordinals?: boolean | undefined
  index?: boolean | undefined
  index_options?: MappingIndexOptions | undefined
  index_phrases?: boolean | undefined
  index_prefixes?: MappingTextIndexPrefixes | null | undefined
  norms?: boolean | undefined
  position_increment_gap?: integer | undefined
  search_analyzer?: string | undefined
  search_quote_analyzer?: string | undefined
  term_vector?: MappingTermVectorOption | undefined
  format?: string | undefined
  precision_step?: integer | undefined
  locale?: string | undefined
}
export const MappingDynamicProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  type: z.literal('{dynamic_type}'),
  enabled: z.boolean().optional(),
  null_value: FieldValue.optional(),
  boost: double.optional(),
  coerce: z.boolean().optional(),
  get script () { return Script.optional() },
  on_script_error: MappingOnScriptError.optional(),
  ignore_malformed: z.boolean().optional(),
  time_series_metric: MappingTimeSeriesMetricType.optional(),
  analyzer: z.string().optional(),
  eager_global_ordinals: z.boolean().optional(),
  index: z.boolean().optional(),
  index_options: MappingIndexOptions.optional(),
  index_phrases: z.boolean().optional(),
  index_prefixes: z.union([MappingTextIndexPrefixes, z.null()]).optional(),
  norms: z.boolean().optional(),
  position_increment_gap: integer.optional(),
  search_analyzer: z.string().optional(),
  search_quote_analyzer: z.string().optional(),
  term_vector: MappingTermVectorOption.optional(),
  format: z.string().optional(),
  precision_step: integer.optional(),
  locale: z.string().optional()
}).meta({ id: 'MappingDynamicProperty' })
export type MappingDynamicProperty = z.infer<typeof MappingDynamicProperty>

export const MappingMatchType = z.enum(['simple', 'regex']).meta({ id: 'MappingMatchType' })
export type MappingMatchType = z.infer<typeof MappingMatchType>

const MappingDynamicTemplateCommonProps = z.object({
  match: z.union([z.string(), z.array(z.string())]).optional(),
  path_match: z.union([z.string(), z.array(z.string())]).optional(),
  unmatch: z.union([z.string(), z.array(z.string())]).optional(),
  path_unmatch: z.union([z.string(), z.array(z.string())]).optional(),
  match_mapping_type: z.union([z.string(), z.array(z.string())]).optional(),
  unmatch_mapping_type: z.union([z.string(), z.array(z.string())]).optional(),
  match_pattern: MappingMatchType.optional()
})

const MappingDynamicTemplateExclusiveProps = z.union([z.object({ mapping: z.lazy(() => MappingProperty) }), z.object({ runtime: z.lazy(() => MappingRuntimeField) })])

export const MappingDynamicTemplate = MappingDynamicTemplateCommonProps.and(MappingDynamicTemplateExclusiveProps).meta({ id: 'MappingDynamicTemplate' })
export type MappingDynamicTemplate = z.infer<typeof MappingDynamicTemplate>

export interface MappingExponentialHistogramPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  time_series_metric?: MappingTimeSeriesMetricType | undefined
  type: 'exponential_histogram'
}
export const MappingExponentialHistogramProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  time_series_metric: MappingTimeSeriesMetricType.optional(),
  type: z.literal('exponential_histogram')
}).meta({ id: 'MappingExponentialHistogramProperty' })
export type MappingExponentialHistogramProperty = z.infer<typeof MappingExponentialHistogramProperty>

export interface MappingFieldAliasPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  path?: Field | undefined
  type: 'alias'
}
export const MappingFieldAliasProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  path: Field.optional(),
  type: z.literal('alias')
}).meta({ id: 'MappingFieldAliasProperty' })
export type MappingFieldAliasProperty = z.infer<typeof MappingFieldAliasProperty>

export const MappingFieldMapping = z.object({
  full_name: z.string(),
  mapping: z.record(Field, z.lazy(() => MappingProperty))
}).meta({ id: 'MappingFieldMapping' })
export type MappingFieldMapping = z.infer<typeof MappingFieldMapping>

export const MappingFieldNamesField = z.object({
  enabled: z.boolean()
}).meta({ id: 'MappingFieldNamesField' })
export type MappingFieldNamesField = z.infer<typeof MappingFieldNamesField>

export interface MappingFlattenedPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  boost?: double | undefined
  depth_limit?: integer | undefined
  doc_values?: boolean | undefined
  eager_global_ordinals?: boolean | undefined
  index?: boolean | undefined
  index_options?: MappingIndexOptions | undefined
  null_value?: string | undefined
  similarity?: string | undefined
  split_queries_on_whitespace?: boolean | undefined
  time_series_dimensions?: string[] | undefined
  type: 'flattened'
}
export const MappingFlattenedProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  boost: double.optional(),
  depth_limit: integer.optional(),
  doc_values: z.boolean().optional(),
  eager_global_ordinals: z.boolean().optional(),
  index: z.boolean().optional(),
  index_options: MappingIndexOptions.optional(),
  null_value: z.string().optional(),
  similarity: z.string().optional(),
  split_queries_on_whitespace: z.boolean().optional(),
  time_series_dimensions: z.array(z.string()).optional(),
  type: z.literal('flattened')
}).meta({ id: 'MappingFlattenedProperty' })
export type MappingFlattenedProperty = z.infer<typeof MappingFlattenedProperty>

export interface MappingFloatNumberPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  coerce?: boolean | undefined
  ignore_malformed?: boolean | undefined
  index?: boolean | undefined
  on_script_error?: MappingOnScriptError | undefined
  script?: ScriptShape | undefined
  time_series_metric?: MappingTimeSeriesMetricType | undefined
  time_series_dimension?: boolean | undefined
  type: 'float'
  null_value?: float | undefined
}
export const MappingFloatNumberProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  coerce: z.boolean().optional(),
  ignore_malformed: z.boolean().optional(),
  index: z.boolean().optional(),
  on_script_error: MappingOnScriptError.optional(),
  get script () { return Script.optional() },
  time_series_metric: MappingTimeSeriesMetricType.describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  time_series_dimension: z.boolean().describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  type: z.literal('float'),
  null_value: float.optional()
}).meta({ id: 'MappingFloatNumberProperty' })
export type MappingFloatNumberProperty = z.infer<typeof MappingFloatNumberProperty>

export interface MappingFloatRangePropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  coerce?: boolean | undefined
  index?: boolean | undefined
  type: 'float_range'
}
export const MappingFloatRangeProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  coerce: z.boolean().optional(),
  index: z.boolean().optional(),
  type: z.literal('float_range')
}).meta({ id: 'MappingFloatRangeProperty' })
export type MappingFloatRangeProperty = z.infer<typeof MappingFloatRangeProperty>

export interface MappingGeoPointPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  ignore_malformed?: boolean | undefined
  ignore_z_value?: boolean | undefined
  null_value?: GeoLocation | undefined
  index?: boolean | undefined
  on_script_error?: MappingOnScriptError | undefined
  script?: ScriptShape | undefined
  type: 'geo_point'
  time_series_metric?: MappingGeoPointMetricType | undefined
}
export const MappingGeoPointProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  ignore_malformed: z.boolean().optional(),
  ignore_z_value: z.boolean().optional(),
  null_value: GeoLocation.optional(),
  index: z.boolean().optional(),
  on_script_error: MappingOnScriptError.optional(),
  get script () { return Script.optional() },
  type: z.literal('geo_point'),
  time_series_metric: MappingGeoPointMetricType.optional()
}).meta({ id: 'MappingGeoPointProperty' })
export type MappingGeoPointProperty = z.infer<typeof MappingGeoPointProperty>

export interface MappingGeoShapePropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  coerce?: boolean | undefined
  ignore_malformed?: boolean | undefined
  ignore_z_value?: boolean | undefined
  index?: boolean | undefined
  orientation?: MappingGeoOrientation | undefined
  strategy?: MappingGeoStrategy | undefined
  type: 'geo_shape'
}
/**
 * The `geo_shape` data type facilitates the indexing of and searching with arbitrary geo shapes such as rectangles
 * and polygons.
 */
export const MappingGeoShapeProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  coerce: z.boolean().optional(),
  ignore_malformed: z.boolean().optional(),
  ignore_z_value: z.boolean().optional(),
  index: z.boolean().optional(),
  orientation: MappingGeoOrientation.optional(),
  strategy: MappingGeoStrategy.optional(),
  type: z.literal('geo_shape')
}).meta({ id: 'MappingGeoShapeProperty' })
export type MappingGeoShapeProperty = z.infer<typeof MappingGeoShapeProperty>

export interface MappingHalfFloatNumberPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  coerce?: boolean | undefined
  ignore_malformed?: boolean | undefined
  index?: boolean | undefined
  on_script_error?: MappingOnScriptError | undefined
  script?: ScriptShape | undefined
  time_series_metric?: MappingTimeSeriesMetricType | undefined
  time_series_dimension?: boolean | undefined
  type: 'half_float'
  null_value?: float | undefined
}
export const MappingHalfFloatNumberProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  coerce: z.boolean().optional(),
  ignore_malformed: z.boolean().optional(),
  index: z.boolean().optional(),
  on_script_error: MappingOnScriptError.optional(),
  get script () { return Script.optional() },
  time_series_metric: MappingTimeSeriesMetricType.describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  time_series_dimension: z.boolean().describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  type: z.literal('half_float'),
  null_value: float.optional()
}).meta({ id: 'MappingHalfFloatNumberProperty' })
export type MappingHalfFloatNumberProperty = z.infer<typeof MappingHalfFloatNumberProperty>

export interface MappingHistogramPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  ignore_malformed?: boolean | undefined
  time_series_metric?: MappingTimeSeriesMetricType | undefined
  type: 'histogram'
}
export const MappingHistogramProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  ignore_malformed: z.boolean().optional(),
  time_series_metric: MappingTimeSeriesMetricType.optional(),
  type: z.literal('histogram')
}).meta({ id: 'MappingHistogramProperty' })
export type MappingHistogramProperty = z.infer<typeof MappingHistogramProperty>

export interface MappingIcuCollationPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  type: 'icu_collation_keyword'
  norms?: boolean | undefined
  index_options?: MappingIndexOptions | undefined
  index?: boolean | undefined
  null_value?: string | undefined
  rules?: string | undefined
  language?: string | undefined
  country?: string | undefined
  variant?: string | undefined
  strength?: AnalysisIcuCollationStrength | undefined
  decomposition?: AnalysisIcuCollationDecomposition | undefined
  alternate?: AnalysisIcuCollationAlternate | undefined
  case_level?: boolean | undefined
  case_first?: AnalysisIcuCollationCaseFirst | undefined
  numeric?: boolean | undefined
  variable_top?: string | undefined
  hiragana_quaternary_mode?: boolean | undefined
}
export const MappingIcuCollationProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  type: z.literal('icu_collation_keyword'),
  norms: z.boolean().optional(),
  index_options: MappingIndexOptions.optional(),
  index: z.boolean().describe('Should the field be searchable?').optional(),
  null_value: z.string().describe('Accepts a string value which is substituted for any explicit null values. Defaults to null, which means the field is treated as missing.').optional(),
  rules: z.string().optional(),
  language: z.string().optional(),
  country: z.string().optional(),
  variant: z.string().optional(),
  strength: z.lazy(() => AnalysisIcuCollationStrength).optional(),
  decomposition: z.lazy(() => AnalysisIcuCollationDecomposition).optional(),
  alternate: z.lazy(() => AnalysisIcuCollationAlternate).optional(),
  case_level: z.boolean().optional(),
  case_first: z.lazy(() => AnalysisIcuCollationCaseFirst).optional(),
  numeric: z.boolean().optional(),
  variable_top: z.string().optional(),
  hiragana_quaternary_mode: z.boolean().optional()
}).meta({ id: 'MappingIcuCollationProperty' })
export type MappingIcuCollationProperty = z.infer<typeof MappingIcuCollationProperty>

export const MappingIndexField = z.object({
  enabled: z.boolean()
}).meta({ id: 'MappingIndexField' })
export type MappingIndexField = z.infer<typeof MappingIndexField>

export interface MappingIntegerNumberPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  coerce?: boolean | undefined
  ignore_malformed?: boolean | undefined
  index?: boolean | undefined
  on_script_error?: MappingOnScriptError | undefined
  script?: ScriptShape | undefined
  time_series_metric?: MappingTimeSeriesMetricType | undefined
  time_series_dimension?: boolean | undefined
  type: 'integer'
  null_value?: integer | undefined
}
export const MappingIntegerNumberProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  coerce: z.boolean().optional(),
  ignore_malformed: z.boolean().optional(),
  index: z.boolean().optional(),
  on_script_error: MappingOnScriptError.optional(),
  get script () { return Script.optional() },
  time_series_metric: MappingTimeSeriesMetricType.describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  time_series_dimension: z.boolean().describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  type: z.literal('integer'),
  null_value: integer.optional()
}).meta({ id: 'MappingIntegerNumberProperty' })
export type MappingIntegerNumberProperty = z.infer<typeof MappingIntegerNumberProperty>

export interface MappingIntegerRangePropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  coerce?: boolean | undefined
  index?: boolean | undefined
  type: 'integer_range'
}
export const MappingIntegerRangeProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  coerce: z.boolean().optional(),
  index: z.boolean().optional(),
  type: z.literal('integer_range')
}).meta({ id: 'MappingIntegerRangeProperty' })
export type MappingIntegerRangeProperty = z.infer<typeof MappingIntegerRangeProperty>

export interface MappingIpPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  index?: boolean | undefined
  ignore_malformed?: boolean | undefined
  null_value?: string | undefined
  on_script_error?: MappingOnScriptError | undefined
  script?: ScriptShape | undefined
  time_series_dimension?: boolean | undefined
  type: 'ip'
}
export const MappingIpProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  index: z.boolean().optional(),
  ignore_malformed: z.boolean().optional(),
  null_value: z.string().optional(),
  on_script_error: MappingOnScriptError.optional(),
  get script () { return Script.optional() },
  time_series_dimension: z.boolean().describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  type: z.literal('ip')
}).meta({ id: 'MappingIpProperty' })
export type MappingIpProperty = z.infer<typeof MappingIpProperty>

export interface MappingIpRangePropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  coerce?: boolean | undefined
  index?: boolean | undefined
  type: 'ip_range'
}
export const MappingIpRangeProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  coerce: z.boolean().optional(),
  index: z.boolean().optional(),
  type: z.literal('ip_range')
}).meta({ id: 'MappingIpRangeProperty' })
export type MappingIpRangeProperty = z.infer<typeof MappingIpRangeProperty>

export interface MappingJoinPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  relations?: Record<RelationName, RelationName | RelationName[]> | undefined
  eager_global_ordinals?: boolean | undefined
  type: 'join'
}
export const MappingJoinProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  relations: z.record(RelationName, z.union([RelationName, z.array(RelationName)])).optional(),
  eager_global_ordinals: z.boolean().optional(),
  type: z.literal('join')
}).meta({ id: 'MappingJoinProperty' })
export type MappingJoinProperty = z.infer<typeof MappingJoinProperty>

export interface MappingKeywordPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  eager_global_ordinals?: boolean | undefined
  index?: boolean | undefined
  index_options?: MappingIndexOptions | undefined
  script?: ScriptShape | undefined
  on_script_error?: MappingOnScriptError | undefined
  normalizer?: string | undefined
  norms?: boolean | undefined
  null_value?: string | undefined
  similarity?: string | null | undefined
  split_queries_on_whitespace?: boolean | undefined
  time_series_dimension?: boolean | undefined
  type: 'keyword'
}
export const MappingKeywordProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  eager_global_ordinals: z.boolean().optional(),
  index: z.boolean().optional(),
  index_options: MappingIndexOptions.optional(),
  get script () { return Script.optional() },
  on_script_error: MappingOnScriptError.optional(),
  normalizer: z.string().optional(),
  norms: z.boolean().optional(),
  null_value: z.string().optional(),
  similarity: z.union([z.string(), z.null()]).optional(),
  split_queries_on_whitespace: z.boolean().optional(),
  time_series_dimension: z.boolean().describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  type: z.literal('keyword')
}).meta({ id: 'MappingKeywordProperty' })
export type MappingKeywordProperty = z.infer<typeof MappingKeywordProperty>

export interface MappingLongNumberPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  coerce?: boolean | undefined
  ignore_malformed?: boolean | undefined
  index?: boolean | undefined
  on_script_error?: MappingOnScriptError | undefined
  script?: ScriptShape | undefined
  time_series_metric?: MappingTimeSeriesMetricType | undefined
  time_series_dimension?: boolean | undefined
  type: 'long'
  null_value?: long | undefined
}
export const MappingLongNumberProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  coerce: z.boolean().optional(),
  ignore_malformed: z.boolean().optional(),
  index: z.boolean().optional(),
  on_script_error: MappingOnScriptError.optional(),
  get script () { return Script.optional() },
  time_series_metric: MappingTimeSeriesMetricType.describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  time_series_dimension: z.boolean().describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  type: z.literal('long'),
  null_value: long.optional()
}).meta({ id: 'MappingLongNumberProperty' })
export type MappingLongNumberProperty = z.infer<typeof MappingLongNumberProperty>

export interface MappingLongRangePropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  coerce?: boolean | undefined
  index?: boolean | undefined
  type: 'long_range'
}
export const MappingLongRangeProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  coerce: z.boolean().optional(),
  index: z.boolean().optional(),
  type: z.literal('long_range')
}).meta({ id: 'MappingLongRangeProperty' })
export type MappingLongRangeProperty = z.infer<typeof MappingLongRangeProperty>

export interface MappingMurmur3HashPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  type: 'murmur3'
}
export const MappingMurmur3HashProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  type: z.literal('murmur3')
}).meta({ id: 'MappingMurmur3HashProperty' })
export type MappingMurmur3HashProperty = z.infer<typeof MappingMurmur3HashProperty>

export interface MappingNestedPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  enabled?: boolean | undefined
  include_in_parent?: boolean | undefined
  include_in_root?: boolean | undefined
  type: 'nested'
}
export const MappingNestedProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  enabled: z.boolean().optional(),
  include_in_parent: z.boolean().optional(),
  include_in_root: z.boolean().optional(),
  type: z.literal('nested')
}).meta({ id: 'MappingNestedProperty' })
export type MappingNestedProperty = z.infer<typeof MappingNestedProperty>

export interface MappingObjectPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  enabled?: boolean | undefined
  subobjects?: MappingSubobjects | undefined
  type?: 'object' | undefined
}
export const MappingObjectProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  enabled: z.boolean().optional(),
  subobjects: MappingSubobjects.optional(),
  type: z.literal('object').optional()
}).meta({ id: 'MappingObjectProperty' })
export type MappingObjectProperty = z.infer<typeof MappingObjectProperty>

export interface MappingPassthroughObjectPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  type?: 'passthrough' | undefined
  enabled?: boolean | undefined
  priority?: integer | undefined
  time_series_dimension?: boolean | undefined
}
export const MappingPassthroughObjectProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  type: z.literal('passthrough').optional(),
  enabled: z.boolean().optional(),
  priority: integer.optional(),
  time_series_dimension: z.boolean().optional()
}).meta({ id: 'MappingPassthroughObjectProperty' })
export type MappingPassthroughObjectProperty = z.infer<typeof MappingPassthroughObjectProperty>

export interface MappingPercolatorPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  type: 'percolator'
}
export const MappingPercolatorProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  type: z.literal('percolator')
}).meta({ id: 'MappingPercolatorProperty' })
export type MappingPercolatorProperty = z.infer<typeof MappingPercolatorProperty>

export interface MappingPointPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  ignore_malformed?: boolean | undefined
  ignore_z_value?: boolean | undefined
  null_value?: string | undefined
  type: 'point'
}
export const MappingPointProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  ignore_malformed: z.boolean().optional(),
  ignore_z_value: z.boolean().optional(),
  null_value: z.string().optional(),
  type: z.literal('point')
}).meta({ id: 'MappingPointProperty' })
export type MappingPointProperty = z.infer<typeof MappingPointProperty>

export interface MappingRankFeaturePropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  positive_score_impact?: boolean | undefined
  type: 'rank_feature'
}
export const MappingRankFeatureProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  positive_score_impact: z.boolean().optional(),
  type: z.literal('rank_feature')
}).meta({ id: 'MappingRankFeatureProperty' })
export type MappingRankFeatureProperty = z.infer<typeof MappingRankFeatureProperty>

export interface MappingRankFeaturesPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  positive_score_impact?: boolean | undefined
  type: 'rank_features'
}
export const MappingRankFeaturesProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  positive_score_impact: z.boolean().optional(),
  type: z.literal('rank_features')
}).meta({ id: 'MappingRankFeaturesProperty' })
export type MappingRankFeaturesProperty = z.infer<typeof MappingRankFeaturesProperty>

export interface MappingRankVectorPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  type: 'rank_vectors'
  element_type?: MappingRankVectorElementType | undefined
  dims?: integer | undefined
}
/** Technical preview */
export const MappingRankVectorProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  type: z.literal('rank_vectors'),
  element_type: MappingRankVectorElementType.optional(),
  dims: integer.optional()
}).meta({ id: 'MappingRankVectorProperty' })
export type MappingRankVectorProperty = z.infer<typeof MappingRankVectorProperty>

export const MappingRoutingField = z.object({
  required: z.boolean()
}).meta({ id: 'MappingRoutingField' })
export type MappingRoutingField = z.infer<typeof MappingRoutingField>

export interface MappingScaledFloatNumberPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  coerce?: boolean | undefined
  ignore_malformed?: boolean | undefined
  index?: boolean | undefined
  on_script_error?: MappingOnScriptError | undefined
  script?: ScriptShape | undefined
  time_series_metric?: MappingTimeSeriesMetricType | undefined
  time_series_dimension?: boolean | undefined
  type: 'scaled_float'
  null_value?: double | undefined
  scaling_factor?: double | undefined
}
export const MappingScaledFloatNumberProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  coerce: z.boolean().optional(),
  ignore_malformed: z.boolean().optional(),
  index: z.boolean().optional(),
  on_script_error: MappingOnScriptError.optional(),
  get script () { return Script.optional() },
  time_series_metric: MappingTimeSeriesMetricType.describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  time_series_dimension: z.boolean().describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  type: z.literal('scaled_float'),
  null_value: double.optional(),
  scaling_factor: double.optional()
}).meta({ id: 'MappingScaledFloatNumberProperty' })
export type MappingScaledFloatNumberProperty = z.infer<typeof MappingScaledFloatNumberProperty>

export interface MappingSearchAsYouTypePropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  analyzer?: string | undefined
  index?: boolean | undefined
  index_options?: MappingIndexOptions | undefined
  max_shingle_size?: integer | undefined
  norms?: boolean | undefined
  search_analyzer?: string | undefined
  search_quote_analyzer?: string | undefined
  similarity?: string | null | undefined
  term_vector?: MappingTermVectorOption | undefined
  type: 'search_as_you_type'
}
export const MappingSearchAsYouTypeProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  analyzer: z.string().optional(),
  index: z.boolean().optional(),
  index_options: MappingIndexOptions.optional(),
  max_shingle_size: integer.optional(),
  norms: z.boolean().optional(),
  search_analyzer: z.string().optional(),
  search_quote_analyzer: z.string().optional(),
  similarity: z.union([z.string(), z.null()]).optional(),
  term_vector: MappingTermVectorOption.optional(),
  type: z.literal('search_as_you_type')
}).meta({ id: 'MappingSearchAsYouTypeProperty' })
export type MappingSearchAsYouTypeProperty = z.infer<typeof MappingSearchAsYouTypeProperty>

export interface MappingShapePropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  coerce?: boolean | undefined
  ignore_malformed?: boolean | undefined
  ignore_z_value?: boolean | undefined
  orientation?: MappingGeoOrientation | undefined
  type: 'shape'
}
/**
 * The `shape` data type facilitates the indexing of and searching with arbitrary `x, y` cartesian shapes such as
 * rectangles and polygons.
 */
export const MappingShapeProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  coerce: z.boolean().optional(),
  ignore_malformed: z.boolean().optional(),
  ignore_z_value: z.boolean().optional(),
  orientation: MappingGeoOrientation.optional(),
  type: z.literal('shape')
}).meta({ id: 'MappingShapeProperty' })
export type MappingShapeProperty = z.infer<typeof MappingShapeProperty>

export interface MappingShortNumberPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  coerce?: boolean | undefined
  ignore_malformed?: boolean | undefined
  index?: boolean | undefined
  on_script_error?: MappingOnScriptError | undefined
  script?: ScriptShape | undefined
  time_series_metric?: MappingTimeSeriesMetricType | undefined
  time_series_dimension?: boolean | undefined
  type: 'short'
  null_value?: short | undefined
}
export const MappingShortNumberProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  coerce: z.boolean().optional(),
  ignore_malformed: z.boolean().optional(),
  index: z.boolean().optional(),
  on_script_error: MappingOnScriptError.optional(),
  get script () { return Script.optional() },
  time_series_metric: MappingTimeSeriesMetricType.describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  time_series_dimension: z.boolean().describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  type: z.literal('short'),
  null_value: short.optional()
}).meta({ id: 'MappingShortNumberProperty' })
export type MappingShortNumberProperty = z.infer<typeof MappingShortNumberProperty>

export const MappingSizeField = z.object({
  enabled: z.boolean()
}).meta({ id: 'MappingSizeField' })
export type MappingSizeField = z.infer<typeof MappingSizeField>

export const MappingSourceFieldMode = z.enum(['disabled', 'stored', 'synthetic']).meta({ id: 'MappingSourceFieldMode' })
export type MappingSourceFieldMode = z.infer<typeof MappingSourceFieldMode>

export const MappingSourceField = z.object({
  compress: z.boolean().optional(),
  compress_threshold: z.string().optional(),
  enabled: z.boolean().optional(),
  excludes: z.array(z.string()).optional(),
  includes: z.array(z.string()).optional(),
  mode: MappingSourceFieldMode.optional()
}).meta({ id: 'MappingSourceField' })
export type MappingSourceField = z.infer<typeof MappingSourceField>

export interface MappingSparseVectorPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  store?: boolean | undefined
  type: 'sparse_vector'
  index_options?: MappingSparseVectorIndexOptions | undefined
}
export const MappingSparseVectorProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  store: z.boolean().optional(),
  type: z.literal('sparse_vector'),
  index_options: MappingSparseVectorIndexOptions.describe('Additional index options for the sparse vector field that controls the token pruning behavior of the sparse vector field.').optional()
}).meta({ id: 'MappingSparseVectorProperty' })
export type MappingSparseVectorProperty = z.infer<typeof MappingSparseVectorProperty>

export interface MappingTextPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  analyzer?: string | undefined
  boost?: double | undefined
  eager_global_ordinals?: boolean | undefined
  fielddata?: boolean | undefined
  fielddata_frequency_filter?: IndicesFielddataFrequencyFilter | undefined
  index?: boolean | undefined
  index_options?: MappingIndexOptions | undefined
  index_phrases?: boolean | undefined
  index_prefixes?: MappingTextIndexPrefixes | null | undefined
  norms?: boolean | undefined
  position_increment_gap?: integer | undefined
  search_analyzer?: string | undefined
  search_quote_analyzer?: string | undefined
  similarity?: string | null | undefined
  term_vector?: MappingTermVectorOption | undefined
  type: 'text'
}
export const MappingTextProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  analyzer: z.string().optional(),
  boost: double.optional(),
  eager_global_ordinals: z.boolean().optional(),
  fielddata: z.boolean().optional(),
  fielddata_frequency_filter: z.lazy(() => IndicesFielddataFrequencyFilter).optional(),
  index: z.boolean().optional(),
  index_options: MappingIndexOptions.optional(),
  index_phrases: z.boolean().optional(),
  index_prefixes: z.union([MappingTextIndexPrefixes, z.null()]).optional(),
  norms: z.boolean().optional(),
  position_increment_gap: integer.optional(),
  search_analyzer: z.string().optional(),
  search_quote_analyzer: z.string().optional(),
  similarity: z.union([z.string(), z.null()]).optional(),
  term_vector: MappingTermVectorOption.optional(),
  type: z.literal('text')
}).meta({ id: 'MappingTextProperty' })
export type MappingTextProperty = z.infer<typeof MappingTextProperty>

export interface MappingTokenCountPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  analyzer?: string | undefined
  boost?: double | undefined
  index?: boolean | undefined
  null_value?: double | undefined
  enable_position_increments?: boolean | undefined
  type: 'token_count'
}
export const MappingTokenCountProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  analyzer: z.string().optional(),
  boost: double.optional(),
  index: z.boolean().optional(),
  null_value: double.optional(),
  enable_position_increments: z.boolean().optional(),
  type: z.literal('token_count')
}).meta({ id: 'MappingTokenCountProperty' })
export type MappingTokenCountProperty = z.infer<typeof MappingTokenCountProperty>

export const MappingTypeMapping = z.object({
  all_field: MappingAllField.optional(),
  date_detection: z.boolean().optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  dynamic_date_formats: z.array(z.string()).optional(),
  dynamic_templates: z.array(z.record(z.string(), z.lazy(() => MappingDynamicTemplate))).optional(),
  _field_names: z.lazy(() => MappingFieldNamesField).optional(),
  index_field: MappingIndexField.optional(),
  _meta: Metadata.optional(),
  numeric_detection: z.boolean().optional(),
  properties: z.record(PropertyName, z.lazy(() => MappingProperty)).optional(),
  _routing: z.lazy(() => MappingRoutingField).optional(),
  _size: MappingSizeField.optional(),
  _source: z.lazy(() => MappingSourceField).optional(),
  runtime: z.record(z.string(), z.lazy(() => MappingRuntimeField)).optional(),
  enabled: z.boolean().optional(),
  subobjects: MappingSubobjects.optional(),
  _data_stream_timestamp: MappingDataStreamTimestamp.optional()
}).meta({ id: 'MappingTypeMapping' })
export type MappingTypeMapping = z.infer<typeof MappingTypeMapping>

export interface MappingUnsignedLongNumberPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  boost?: double | undefined
  coerce?: boolean | undefined
  ignore_malformed?: boolean | undefined
  index?: boolean | undefined
  on_script_error?: MappingOnScriptError | undefined
  script?: ScriptShape | undefined
  time_series_metric?: MappingTimeSeriesMetricType | undefined
  time_series_dimension?: boolean | undefined
  type: 'unsigned_long'
  null_value?: ulong | undefined
}
export const MappingUnsignedLongNumberProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  boost: double.optional(),
  coerce: z.boolean().optional(),
  ignore_malformed: z.boolean().optional(),
  index: z.boolean().optional(),
  on_script_error: MappingOnScriptError.optional(),
  get script () { return Script.optional() },
  time_series_metric: MappingTimeSeriesMetricType.describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  time_series_dimension: z.boolean().describe('For internal use by Elastic only. Marks the field as a time series dimension. Defaults to false.').optional(),
  type: z.literal('unsigned_long'),
  null_value: ulong.optional()
}).meta({ id: 'MappingUnsignedLongNumberProperty' })
export type MappingUnsignedLongNumberProperty = z.infer<typeof MappingUnsignedLongNumberProperty>

export interface MappingVersionPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  type: 'version'
}
export const MappingVersionProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  type: z.literal('version')
}).meta({ id: 'MappingVersionProperty' })
export type MappingVersionProperty = z.infer<typeof MappingVersionProperty>

export interface MappingWildcardPropertyShape {
  meta?: Record<string, string> | undefined
  properties?: Record<PropertyName, MappingPropertyShape> | undefined
  ignore_above?: integer | undefined
  dynamic?: MappingDynamicMapping | undefined
  fields?: Record<PropertyName, MappingPropertyShape> | undefined
  synthetic_source_keep?: MappingSyntheticSourceKeepEnum | undefined
  copy_to?: Fields | undefined
  store?: boolean | undefined
  doc_values?: boolean | undefined
  type: 'wildcard'
  null_value?: string | undefined
}
export const MappingWildcardProperty = z.object({
  meta: z.record(z.string(), z.string()).describe('Metadata about the field.').optional(),
  get properties (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  ignore_above: integer.optional(),
  dynamic: z.lazy(() => MappingDynamicMapping).optional(),
  get fields (): z.ZodOptional<z.ZodRecord<typeof PropertyName, typeof MappingProperty>> { return z.record(PropertyName, MappingProperty).optional() },
  synthetic_source_keep: MappingSyntheticSourceKeepEnum.optional(),
  copy_to: Fields.optional(),
  store: z.boolean().optional(),
  doc_values: z.boolean().optional(),
  type: z.literal('wildcard'),
  null_value: z.string().optional()
}).meta({ id: 'MappingWildcardProperty' })
export type MappingWildcardProperty = z.infer<typeof MappingWildcardProperty>
