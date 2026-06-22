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

export const float = z.number().meta({ id: 'float' })
export type float = z.infer<typeof float>

export interface ExplainExplanationDetailShape {
  description: string
  details?: ExplainExplanationDetailShape[] | undefined
  value: float
}
export const ExplainExplanationDetail = z.object({
  description: z.string(),
  get details () { return ExplainExplanationDetail.array().optional() },
  value: float
}).meta({ id: 'ExplainExplanationDetail' })
export type ExplainExplanationDetail = z.infer<typeof ExplainExplanationDetail>

export const ExplainExplanation = z.object({
  description: z.string(),
  details: z.array(z.lazy(() => ExplainExplanationDetail)),
  value: float
}).meta({ id: 'ExplainExplanation' })
export type ExplainExplanation = z.infer<typeof ExplainExplanation>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const SearchAggregationBreakdown = z.object({
  build_aggregation: long,
  build_aggregation_count: long,
  build_leaf_collector: long,
  build_leaf_collector_count: long,
  collect: long,
  collect_count: long,
  initialize: long,
  initialize_count: long,
  post_collection: long.optional(),
  post_collection_count: long.optional(),
  reduce: long,
  reduce_count: long
}).meta({ id: 'SearchAggregationBreakdown' })
export type SearchAggregationBreakdown = z.infer<typeof SearchAggregationBreakdown>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const SearchAggregationProfileDelegateDebugFilter = z.object({
  results_from_metadata: integer.optional(),
  query: z.string().optional(),
  specialized_for: z.string().optional(),
  segments_counted_in_constant_time: integer.optional()
}).meta({ id: 'SearchAggregationProfileDelegateDebugFilter' })
export type SearchAggregationProfileDelegateDebugFilter = z.infer<typeof SearchAggregationProfileDelegateDebugFilter>

export interface SearchAggregationProfileDebugShape {
  segments_with_multi_valued_ords?: integer | undefined
  collection_strategy?: string | undefined
  segments_with_single_valued_ords?: integer | undefined
  total_buckets?: integer | undefined
  built_buckets?: integer | undefined
  result_strategy?: string | undefined
  has_filter?: boolean | undefined
  delegate?: string | undefined
  delegate_debug?: SearchAggregationProfileDebugShape | undefined
  chars_fetched?: integer | undefined
  extract_count?: integer | undefined
  extract_ns?: integer | undefined
  values_fetched?: integer | undefined
  collect_analyzed_ns?: integer | undefined
  collect_analyzed_count?: integer | undefined
  surviving_buckets?: integer | undefined
  ordinals_collectors_used?: integer | undefined
  ordinals_collectors_overhead_too_high?: integer | undefined
  string_hashing_collectors_used?: integer | undefined
  numeric_collectors_used?: integer | undefined
  empty_collectors_used?: integer | undefined
  deferred_aggregators?: string[] | undefined
  segments_with_doc_count_field?: integer | undefined
  segments_with_deleted_docs?: integer | undefined
  filters?: SearchAggregationProfileDelegateDebugFilter[] | undefined
  segments_counted?: integer | undefined
  segments_collected?: integer | undefined
  map_reducer?: string | undefined
  brute_force_used?: integer | undefined
  dynamic_pruning_attempted?: integer | undefined
  dynamic_pruning_used?: integer | undefined
  skipped_due_to_no_data?: integer | undefined
}
export const SearchAggregationProfileDebug = z.object({
  segments_with_multi_valued_ords: integer.optional(),
  collection_strategy: z.string().optional(),
  segments_with_single_valued_ords: integer.optional(),
  total_buckets: integer.optional(),
  built_buckets: integer.optional(),
  result_strategy: z.string().optional(),
  has_filter: z.boolean().optional(),
  delegate: z.string().optional(),
  get delegate_debug () { return SearchAggregationProfileDebug.optional() },
  chars_fetched: integer.optional(),
  extract_count: integer.optional(),
  extract_ns: integer.optional(),
  values_fetched: integer.optional(),
  collect_analyzed_ns: integer.optional(),
  collect_analyzed_count: integer.optional(),
  surviving_buckets: integer.optional(),
  ordinals_collectors_used: integer.optional(),
  ordinals_collectors_overhead_too_high: integer.optional(),
  string_hashing_collectors_used: integer.optional(),
  numeric_collectors_used: integer.optional(),
  empty_collectors_used: integer.optional(),
  deferred_aggregators: z.array(z.string()).optional(),
  segments_with_doc_count_field: integer.optional(),
  segments_with_deleted_docs: integer.optional(),
  filters: z.array(SearchAggregationProfileDelegateDebugFilter).optional(),
  segments_counted: integer.optional(),
  segments_collected: integer.optional(),
  map_reducer: z.string().optional(),
  brute_force_used: integer.optional(),
  dynamic_pruning_attempted: integer.optional(),
  dynamic_pruning_used: integer.optional(),
  skipped_due_to_no_data: integer.optional()
}).meta({ id: 'SearchAggregationProfileDebug' })
export type SearchAggregationProfileDebug = z.infer<typeof SearchAggregationProfileDebug>

export interface SearchAggregationProfileShape {
  breakdown: SearchAggregationBreakdown
  description: string
  time_in_nanos: DurationValue
  type: string
  debug?: SearchAggregationProfileDebugShape | undefined
  children?: SearchAggregationProfileShape[] | undefined
}
export const SearchAggregationProfile = z.object({
  breakdown: SearchAggregationBreakdown,
  description: z.string(),
  time_in_nanos: DurationValue,
  type: z.string(),
  get debug () { return SearchAggregationProfileDebug.optional() },
  get children () { return SearchAggregationProfile.array().optional() }
}).meta({ id: 'SearchAggregationProfile' })
export type SearchAggregationProfile = z.infer<typeof SearchAggregationProfile>

export interface SearchCollectorShape {
  name: string
  reason: string
  time_in_nanos: DurationValue
  children?: SearchCollectorShape[] | undefined
}
export const SearchCollector = z.object({
  name: z.string(),
  reason: z.string(),
  time_in_nanos: DurationValue,
  get children () { return SearchCollector.array().optional() }
}).meta({ id: 'SearchCollector' })
export type SearchCollector = z.infer<typeof SearchCollector>

export const SearchSuggestBase = z.object({
  length: integer,
  offset: integer,
  text: z.string()
}).meta({ id: 'SearchSuggestBase' })
export type SearchSuggestBase = z.infer<typeof SearchSuggestBase>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

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

/** Text or location that we want similar documents for or a lookup to a document's field for the text. */
export const SearchContext = z.union([z.string(), GeoLocation]).meta({ id: 'SearchContext' })
export type SearchContext = z.infer<typeof SearchContext>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const SearchCompletionSuggestOption = z.object({
  collate_match: z.boolean().optional(),
  contexts: z.record(z.string(), z.array(SearchContext)).optional(),
  fields: z.record(z.string(), z.any()).optional(),
  _id: z.string().optional(),
  _index: IndexName.optional(),
  _routing: z.string().optional(),
  _score: double.optional(),
  _source: z.any().optional(),
  text: z.string(),
  score: double.optional()
}).meta({ id: 'SearchCompletionSuggestOption' })
export type SearchCompletionSuggestOption = z.infer<typeof SearchCompletionSuggestOption>

export const SearchCompletionSuggest = z.object({
  ...SearchSuggestBase.shape,
  options: z.union([SearchCompletionSuggestOption, z.array(SearchCompletionSuggestOption)])
}).meta({ id: 'SearchCompletionSuggest' })
export type SearchCompletionSuggest = z.infer<typeof SearchCompletionSuggest>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const SearchKnnQueryProfileBreakdown = z.object({
  advance: long,
  advance_count: long,
  build_scorer: long,
  build_scorer_count: long,
  compute_max_score: long,
  compute_max_score_count: long,
  count_weight: long,
  count_weight_count: long,
  create_weight: long,
  create_weight_count: long,
  match: long,
  match_count: long,
  next_doc: long,
  next_doc_count: long,
  score: long,
  score_count: long,
  set_min_competitive_score: long,
  set_min_competitive_score_count: long,
  shallow_advance: long,
  shallow_advance_count: long
}).meta({ id: 'SearchKnnQueryProfileBreakdown' })
export type SearchKnnQueryProfileBreakdown = z.infer<typeof SearchKnnQueryProfileBreakdown>

export interface SearchKnnQueryProfileResultShape {
  type: string
  description: string
  time?: Duration | undefined
  time_in_nanos: DurationValue
  breakdown: SearchKnnQueryProfileBreakdown
  debug?: Record<string, unknown> | undefined
  children?: SearchKnnQueryProfileResultShape[] | undefined
}
export const SearchKnnQueryProfileResult = z.object({
  type: z.string(),
  description: z.string(),
  time: Duration.optional(),
  time_in_nanos: DurationValue,
  breakdown: SearchKnnQueryProfileBreakdown,
  debug: z.record(z.string(), z.any()).optional(),
  get children () { return SearchKnnQueryProfileResult.array().optional() }
}).meta({ id: 'SearchKnnQueryProfileResult' })
export type SearchKnnQueryProfileResult = z.infer<typeof SearchKnnQueryProfileResult>

export interface SearchKnnCollectorResultShape {
  name: string
  reason: string
  time?: Duration | undefined
  time_in_nanos: DurationValue
  children?: SearchKnnCollectorResultShape[] | undefined
}
export const SearchKnnCollectorResult = z.object({
  name: z.string(),
  reason: z.string(),
  time: Duration.optional(),
  time_in_nanos: DurationValue,
  get children () { return SearchKnnCollectorResult.array().optional() }
}).meta({ id: 'SearchKnnCollectorResult' })
export type SearchKnnCollectorResult = z.infer<typeof SearchKnnCollectorResult>

export const SearchDfsKnnProfile = z.object({
  vector_operations_count: long.optional(),
  query: z.array(z.lazy(() => SearchKnnQueryProfileResult)),
  rewrite_time: long,
  collector: z.array(z.lazy(() => SearchKnnCollectorResult))
}).meta({ id: 'SearchDfsKnnProfile' })
export type SearchDfsKnnProfile = z.infer<typeof SearchDfsKnnProfile>

export const SearchDfsStatisticsBreakdown = z.object({
  collection_statistics: long,
  collection_statistics_count: long,
  create_weight: long,
  create_weight_count: long,
  rewrite: long,
  rewrite_count: long,
  term_statistics: long,
  term_statistics_count: long
}).meta({ id: 'SearchDfsStatisticsBreakdown' })
export type SearchDfsStatisticsBreakdown = z.infer<typeof SearchDfsStatisticsBreakdown>

export interface SearchDfsStatisticsProfileShape {
  type: string
  description: string
  time?: Duration | undefined
  time_in_nanos: DurationValue
  breakdown: SearchDfsStatisticsBreakdown
  debug?: Record<string, unknown> | undefined
  children?: SearchDfsStatisticsProfileShape[] | undefined
}
export const SearchDfsStatisticsProfile = z.object({
  type: z.string(),
  description: z.string(),
  time: Duration.optional(),
  time_in_nanos: DurationValue,
  breakdown: SearchDfsStatisticsBreakdown,
  debug: z.record(z.string(), z.any()).optional(),
  get children () { return SearchDfsStatisticsProfile.array().optional() }
}).meta({ id: 'SearchDfsStatisticsProfile' })
export type SearchDfsStatisticsProfile = z.infer<typeof SearchDfsStatisticsProfile>

export const SearchDfsProfile = z.object({
  statistics: z.lazy(() => SearchDfsStatisticsProfile).optional(),
  knn: z.array(SearchDfsKnnProfile).optional()
}).meta({ id: 'SearchDfsProfile' })
export type SearchDfsProfile = z.infer<typeof SearchDfsProfile>

export const SearchFetchProfileBreakdown = z.object({
  load_source: integer.optional(),
  load_source_count: integer.optional(),
  load_stored_fields: integer.optional(),
  load_stored_fields_count: integer.optional(),
  next_reader: integer.optional(),
  next_reader_count: integer.optional(),
  process_count: integer.optional(),
  process: integer.optional()
}).meta({ id: 'SearchFetchProfileBreakdown' })
export type SearchFetchProfileBreakdown = z.infer<typeof SearchFetchProfileBreakdown>

export const SearchFetchProfileDebug = z.object({
  stored_fields: z.array(z.string()).optional(),
  fast_path: integer.optional()
}).meta({ id: 'SearchFetchProfileDebug' })
export type SearchFetchProfileDebug = z.infer<typeof SearchFetchProfileDebug>

export interface SearchFetchProfileShape {
  type: string
  description: string
  time_in_nanos: DurationValue
  breakdown: SearchFetchProfileBreakdown
  debug?: SearchFetchProfileDebug | undefined
  children?: SearchFetchProfileShape[] | undefined
}
export const SearchFetchProfile = z.object({
  type: z.string(),
  description: z.string(),
  time_in_nanos: DurationValue,
  breakdown: SearchFetchProfileBreakdown,
  debug: SearchFetchProfileDebug.optional(),
  get children () { return SearchFetchProfile.array().optional() }
}).meta({ id: 'SearchFetchProfile' })
export type SearchFetchProfile = z.infer<typeof SearchFetchProfile>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const SearchTotalHitsRelation = z.enum(['eq', 'gte']).meta({ id: 'SearchTotalHitsRelation' })
export type SearchTotalHitsRelation = z.infer<typeof SearchTotalHitsRelation>

export const SearchTotalHits = z.object({
  relation: SearchTotalHitsRelation,
  value: long
}).meta({ id: 'SearchTotalHits' })
export type SearchTotalHits = z.infer<typeof SearchTotalHits>

export interface SearchHitsMetadataShape {
  total?: SearchTotalHits | long | undefined
  hits: SearchHitShape[]
  max_score?: double | null | undefined
}
export const SearchHitsMetadata = z.object({
  total: z.union([SearchTotalHits, long]).describe('Total hit count information, present only if `track_total_hits` wasn\'t `false` in the search request.').optional(),
  get hits () { return SearchHit.array() },
  max_score: z.union([double, z.null()]).optional()
}).meta({ id: 'SearchHitsMetadata' })
export type SearchHitsMetadata = z.infer<typeof SearchHitsMetadata>

export interface SearchInnerHitsResultShape {
  hits: SearchHitsMetadataShape
}
export const SearchInnerHitsResult = z.object({
  get hits () { return SearchHitsMetadata }
}).meta({ id: 'SearchInnerHitsResult' })
export type SearchInnerHitsResult = z.infer<typeof SearchInnerHitsResult>

/** Path to field or array of paths. Some API's support wildcards in the path to select multiple fields. */
export const Field = z.string().meta({ id: 'Field' })
export type Field = z.infer<typeof Field>

export interface SearchNestedIdentityShape {
  field: Field
  offset: integer
  _nested?: SearchNestedIdentityShape | undefined
}
export const SearchNestedIdentity = z.object({
  field: Field,
  offset: integer,
  get _nested () { return SearchNestedIdentity.optional() }
}).meta({ id: 'SearchNestedIdentity' })
export type SearchNestedIdentity = z.infer<typeof SearchNestedIdentity>

export const SequenceNumber = long.meta({ id: 'SequenceNumber' })
export type SequenceNumber = z.infer<typeof SequenceNumber>

export const VersionNumber = long.meta({ id: 'VersionNumber' })
export type VersionNumber = z.infer<typeof VersionNumber>

/** A field value. */
export const FieldValue = z.union([long, double, z.string(), z.boolean(), z.null()]).meta({ id: 'FieldValue' })
export type FieldValue = z.infer<typeof FieldValue>

export const SortResults = z.array(FieldValue).meta({ id: 'SortResults' })
export type SortResults = z.infer<typeof SortResults>

export interface SearchHitShape {
  _index: IndexName
  _id?: Id | undefined
  _score?: double | null | undefined
  _explanation?: ExplainExplanation | undefined
  fields?: Record<string, unknown> | undefined
  highlight?: Record<string, string[]> | undefined
  inner_hits?: Record<string, SearchInnerHitsResultShape> | undefined
  matched_queries?: string[] | Record<string, double> | undefined
  _nested?: SearchNestedIdentityShape | undefined
  _ignored?: string[] | undefined
  ignored_field_values?: Record<string, unknown[]> | undefined
  _shard?: string | undefined
  _node?: string | undefined
  _routing?: string | undefined
  _source?: unknown | undefined
  _rank?: integer | undefined
  _seq_no?: SequenceNumber | undefined
  _primary_term?: long | undefined
  _version?: VersionNumber | undefined
  sort?: SortResults | undefined
}
export const SearchHit = z.object({
  _index: IndexName,
  _id: Id.optional(),
  _score: z.union([double, z.null()]).optional(),
  _explanation: ExplainExplanation.optional(),
  fields: z.record(z.string(), z.any()).optional(),
  highlight: z.record(z.string(), z.array(z.string())).optional(),
  get inner_hits (): z.ZodOptional<z.ZodRecord<z.ZodString, typeof SearchInnerHitsResult>> { return z.record(z.string(), SearchInnerHitsResult).optional() },
  matched_queries: z.union([z.array(z.string()), z.record(z.string(), double)]).optional(),
  get _nested () { return SearchNestedIdentity.optional() },
  _ignored: z.array(z.string()).optional(),
  ignored_field_values: z.record(z.string(), z.array(z.any())).optional(),
  _shard: z.string().optional(),
  _node: z.string().optional(),
  _routing: z.string().optional(),
  _source: z.any().optional(),
  _rank: integer.optional(),
  _seq_no: SequenceNumber.optional(),
  _primary_term: long.optional(),
  _version: VersionNumber.optional(),
  sort: SortResults.optional()
}).meta({ id: 'SearchHit' })
export type SearchHit = z.infer<typeof SearchHit>

export const SearchPhraseSuggestOption = z.object({
  text: z.string(),
  score: double,
  highlighted: z.string().optional(),
  collate_match: z.boolean().optional()
}).meta({ id: 'SearchPhraseSuggestOption' })
export type SearchPhraseSuggestOption = z.infer<typeof SearchPhraseSuggestOption>

export const SearchPhraseSuggest = z.object({
  ...SearchSuggestBase.shape,
  options: z.union([SearchPhraseSuggestOption, z.array(SearchPhraseSuggestOption)])
}).meta({ id: 'SearchPhraseSuggest' })
export type SearchPhraseSuggest = z.infer<typeof SearchPhraseSuggest>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const SearchQueryBreakdown = z.object({
  advance: long,
  advance_count: long,
  build_scorer: long,
  build_scorer_count: long,
  create_weight: long,
  create_weight_count: long,
  match: long,
  match_count: long,
  shallow_advance: long,
  shallow_advance_count: long,
  next_doc: long,
  next_doc_count: long,
  score: long,
  score_count: long,
  compute_max_score: long,
  compute_max_score_count: long,
  count_weight: long,
  count_weight_count: long,
  set_min_competitive_score: long,
  set_min_competitive_score_count: long
}).meta({ id: 'SearchQueryBreakdown' })
export type SearchQueryBreakdown = z.infer<typeof SearchQueryBreakdown>

export interface SearchQueryProfileShape {
  breakdown: SearchQueryBreakdown
  description: string
  time_in_nanos: DurationValue
  type: string
  children?: SearchQueryProfileShape[] | undefined
}
export const SearchQueryProfile = z.object({
  breakdown: SearchQueryBreakdown,
  description: z.string(),
  time_in_nanos: DurationValue,
  type: z.string(),
  get children () { return SearchQueryProfile.array().optional() }
}).meta({ id: 'SearchQueryProfile' })
export type SearchQueryProfile = z.infer<typeof SearchQueryProfile>

export const SearchSearchProfile = z.object({
  collector: z.array(z.lazy(() => SearchCollector)),
  query: z.array(z.lazy(() => SearchQueryProfile)),
  rewrite_time: long
}).meta({ id: 'SearchSearchProfile' })
export type SearchSearchProfile = z.infer<typeof SearchSearchProfile>

export const SearchShardProfile = z.object({
  aggregations: z.array(z.lazy(() => SearchAggregationProfile)),
  cluster: z.string(),
  dfs: SearchDfsProfile.optional(),
  fetch: z.lazy(() => SearchFetchProfile).optional(),
  id: z.string(),
  index: IndexName,
  node_id: NodeId,
  searches: z.array(SearchSearchProfile),
  shard_id: integer
}).meta({ id: 'SearchShardProfile' })
export type SearchShardProfile = z.infer<typeof SearchShardProfile>

export const SearchProfile = z.object({
  shards: z.array(SearchShardProfile)
}).meta({ id: 'SearchProfile' })
export type SearchProfile = z.infer<typeof SearchProfile>

export const SearchTermSuggestOption = z.object({
  text: z.string(),
  score: double,
  freq: long,
  highlighted: z.string().optional(),
  collate_match: z.boolean().optional()
}).meta({ id: 'SearchTermSuggestOption' })
export type SearchTermSuggestOption = z.infer<typeof SearchTermSuggestOption>

export const SearchTermSuggest = z.object({
  ...SearchSuggestBase.shape,
  options: z.union([SearchTermSuggestOption, z.array(SearchTermSuggestOption)])
}).meta({ id: 'SearchTermSuggest' })
export type SearchTermSuggest = z.infer<typeof SearchTermSuggest>

export const SearchSuggest = z.union([SearchCompletionSuggest, SearchPhraseSuggest, SearchTermSuggest]).meta({ id: 'SearchSuggest' })
export type SearchSuggest = z.infer<typeof SearchSuggest>

export const ClusterAlias = z.string().meta({ id: 'ClusterAlias' })
export type ClusterAlias = z.infer<typeof ClusterAlias>

export const ClusterSearchStatus = z.enum(['running', 'successful', 'partial', 'skipped', 'failed']).meta({ id: 'ClusterSearchStatus' })
export type ClusterSearchStatus = z.infer<typeof ClusterSearchStatus>

export const uint = z.number().meta({ id: 'uint' })
export type uint = z.infer<typeof uint>

export interface ErrorCauseShape {
  type: string
  reason?: string | null | undefined
  stack_trace?: string | undefined
  caused_by?: ErrorCauseShape | undefined
  root_cause?: ErrorCauseShape[] | undefined
  suppressed?: ErrorCauseShape[] | undefined
}
/**
 * Cause and details about a request failure. This class defines the properties common to all error types.
 * Additional details are also provided, that depend on the error type.
 */
export const ErrorCause = z.looseObject({
  type: z.string().describe('The type of error'),
  reason: z.union([z.string(), z.null()]).describe('A human-readable explanation of the error, in English.').optional(),
  stack_trace: z.string().describe('The server stack trace. Present only if the `error_trace=true` parameter was sent with the request.').optional(),
  get caused_by () { return ErrorCause.optional() },
  get root_cause () { return ErrorCause.array().optional() },
  get suppressed () { return ErrorCause.array().optional() }
}).meta({ id: 'ErrorCause' })
export type ErrorCause = z.infer<typeof ErrorCause>

export const ShardFailure = z.object({
  index: IndexName.optional(),
  _index: IndexName.optional(),
  node: z.string().optional(),
  _node: z.string().optional(),
  reason: z.lazy(() => ErrorCause),
  shard: integer.optional(),
  _shard: integer.optional(),
  status: z.string().optional(),
  primary: z.boolean().optional()
}).meta({ id: 'ShardFailure' })
export type ShardFailure = z.infer<typeof ShardFailure>

export const ShardStatistics = z.object({
  failed: uint.describe('The number of shards the operation or search attempted to run on but failed.'),
  successful: uint.describe('The number of shards the operation or search succeeded on.'),
  total: uint.describe('The number of shards the operation or search will run on overall.'),
  failures: z.array(ShardFailure).optional(),
  skipped: uint.optional()
}).meta({ id: 'ShardStatistics' })
export type ShardStatistics = z.infer<typeof ShardStatistics>

export const ClusterDetails = z.object({
  status: ClusterSearchStatus,
  indices: z.string(),
  took: DurationValue.optional(),
  timed_out: z.boolean(),
  _shards: ShardStatistics.optional(),
  failures: z.array(ShardFailure).optional()
}).meta({ id: 'ClusterDetails' })
export type ClusterDetails = z.infer<typeof ClusterDetails>

export const ClusterStatistics = z.object({
  skipped: integer,
  successful: integer,
  total: integer,
  running: integer,
  partial: integer,
  failed: integer,
  details: z.record(ClusterAlias, ClusterDetails).optional()
}).meta({ id: 'ClusterStatistics' })
export type ClusterStatistics = z.infer<typeof ClusterStatistics>

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

/**
 * A date and time, either as a string whose format can depend on the context (defaulting to ISO 8601), or a
 * number of milliseconds since the Epoch. Elasticsearch accepts both as input, but will generally output a string
 * representation.
 */
export const DateTime = z.union([z.string(), EpochTime]).meta({ id: 'DateTime' })
export type DateTime = z.infer<typeof DateTime>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const ScrollId = z.string().meta({ id: 'ScrollId' })
export type ScrollId = z.infer<typeof ScrollId>

/**
 * The suggestion name as returned from the server. Depending whether typed_keys is specified this could come back
 * in the form of `name#type` instead of simply `name`
 */
export const SuggestionName = z.string().meta({ id: 'SuggestionName' })
export type SuggestionName = z.infer<typeof SuggestionName>

export const AsyncSearchAsyncSearch = z.object({
  aggregations: z.any().describe('Partial aggregations results, coming from the shards that have already completed running the query.').optional(),
  _clusters: ClusterStatistics.optional(),
  fields: z.record(z.string(), z.any()).optional(),
  hits: z.lazy(() => SearchHitsMetadata),
  max_score: double.optional(),
  num_reduce_phases: long.describe('Indicates how many reductions of the results have been performed. If this number increases compared to the last retrieved results for a get asynch search request, you can expect additional results included in the search response.').optional(),
  profile: SearchProfile.optional(),
  pit_id: Id.optional(),
  _scroll_id: ScrollId.optional(),
  _shards: ShardStatistics.describe('Indicates how many shards have run the query. Note that in order for shard results to be included in the search response, they need to be reduced first.'),
  suggest: z.record(SuggestionName, z.array(SearchSuggest)).optional(),
  terminated_early: z.boolean().optional(),
  timed_out: z.boolean(),
  took: long
}).meta({ id: 'AsyncSearchAsyncSearch' })
export type AsyncSearchAsyncSearch = z.infer<typeof AsyncSearchAsyncSearch>

export const AsyncSearchAsyncSearchResponseBase = z.object({
  id: Id.optional(),
  is_partial: z.boolean().describe('When the query is no longer running, this property indicates whether the search failed or was successfully completed on all shards. While the query is running, `is_partial` is always set to `true`.'),
  is_running: z.boolean().describe('Indicates whether the search is still running or has completed. > info > If the search failed after some shards returned their results or the node that is coordinating the async search dies, results may be partial even though `is_running` is `false`.'),
  expiration_time: DateTime.describe('Indicates when the async search will expire.').optional(),
  expiration_time_in_millis: EpochTime,
  start_time: DateTime.optional(),
  start_time_in_millis: EpochTime,
  completion_time: DateTime.describe('Indicates when the async search completed. It is present only when the search has completed.').optional(),
  completion_time_in_millis: EpochTime.optional(),
  error: z.lazy(() => ErrorCause).optional()
}).meta({ id: 'AsyncSearchAsyncSearchResponseBase' })
export type AsyncSearchAsyncSearchResponseBase = z.infer<typeof AsyncSearchAsyncSearchResponseBase>

export const AsyncSearchAsyncSearchDocumentResponseBase = z.object({
  ...AsyncSearchAsyncSearchResponseBase.shape,
  response: AsyncSearchAsyncSearch
}).meta({ id: 'AsyncSearchAsyncSearchDocumentResponseBase' })
export type AsyncSearchAsyncSearchDocumentResponseBase = z.infer<typeof AsyncSearchAsyncSearchDocumentResponseBase>

/**
 * Get async search results.
 *
 * Retrieve the results of a previously submitted asynchronous search request.
 * If the Elasticsearch security features are enabled, access to the results of a specific async search is restricted to the user or API key that submitted it.
 */
export const AsyncSearchGetRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('A unique identifier for the async search.').meta({ found_in: 'path' }),
  keep_alive: Duration.describe('The length of time that the async search should be available in the cluster. When not specified, the `keep_alive` set with the corresponding submit async request will be used. Otherwise, it is possible to override the value and extend the validity of the request. When this period expires, the search, if still running, is cancelled. If the search is completed, its saved results are deleted.').optional().meta({ found_in: 'query' }),
  typed_keys: z.boolean().describe('Specify whether aggregation and suggester names should be prefixed by their respective types in the response').optional().meta({ found_in: 'query' }),
  wait_for_completion_timeout: Duration.describe('Specifies to wait for the search to be completed up until the provided timeout. Final results will be returned if available before the timeout expires, otherwise the currently available results will be returned once the timeout expires. By default no timeout is set meaning that the currently available results will be returned without any additional wait.').optional().meta({ found_in: 'query' }),
  return_intermediate_results: z.boolean().describe('Specifies whether the response should contain intermediate results if the query is still running when the wait_for_completion_timeout expires or if no wait_for_completion_timeout is specified. If true and the search is still running, the search response will include any hits and partial aggregations that are available. If false and the search is still running, the search response will not include any hits (but possibly include total hits) nor will include any partial aggregations. When not specified, the intermediate results are returned for running queries.').optional().meta({ found_in: 'query' })
}).meta({ id: 'AsyncSearchGetRequest' })
export type AsyncSearchGetRequest = z.infer<typeof AsyncSearchGetRequest>

export const AsyncSearchGetResponse = AsyncSearchAsyncSearchDocumentResponseBase.meta({ id: 'AsyncSearchGetResponse' })
export type AsyncSearchGetResponse = z.infer<typeof AsyncSearchGetResponse>
