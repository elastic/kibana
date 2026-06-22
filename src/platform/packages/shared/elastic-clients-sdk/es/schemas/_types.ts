/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const SequenceNumber = long.meta({ id: 'SequenceNumber' })
export type SequenceNumber = z.infer<typeof SequenceNumber>

export const VersionNumber = long.meta({ id: 'VersionNumber' })
export type VersionNumber = z.infer<typeof VersionNumber>

export const VersionType = z.enum(['internal', 'external', 'external_gte']).meta({ id: 'VersionType' })
export type VersionType = z.infer<typeof VersionType>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Refresh = z.union([z.boolean(), z.enum(['true', 'false', 'wait_for'])]).meta({ id: 'Refresh' })
export type Refresh = z.infer<typeof Refresh>

/** Only to be used in query and path parameters, as the array form is actually a csv */
export const Routing = z.union([z.string(), z.array(z.string())]).meta({ id: 'Routing' })
export type Routing = z.infer<typeof Routing>

/** Path to field or array of paths. Some API's support wildcards in the path to select multiple fields. */
export const Field = z.string().meta({ id: 'Field' })
export type Field = z.infer<typeof Field>

export const Fields = z.union([Field, z.array(Field)]).meta({ id: 'Fields' })
export type Fields = z.infer<typeof Fields>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const WaitForActiveShardOptions = z.enum(['all', 'index-setting']).meta({ id: 'WaitForActiveShardOptions' })
export type WaitForActiveShardOptions = z.infer<typeof WaitForActiveShardOptions>

export const WaitForActiveShards = z.union([integer, WaitForActiveShardOptions]).meta({ id: 'WaitForActiveShards' })
export type WaitForActiveShards = z.infer<typeof WaitForActiveShards>

export const Metadata = z.record(z.string(), z.any()).meta({ id: 'Metadata' })
export type Metadata = z.infer<typeof Metadata>

export const float = z.number().meta({ id: 'float' })
export type float = z.infer<typeof float>

/** The minimum number of terms that should match as integer, percentage or range */
export const MinimumShouldMatch = z.union([integer, z.string()]).meta({ id: 'MinimumShouldMatch' })
export type MinimumShouldMatch = z.infer<typeof MinimumShouldMatch>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

export const MultiTermQueryRewrite = z.string().meta({ id: 'MultiTermQueryRewrite' })
export type MultiTermQueryRewrite = z.infer<typeof MultiTermQueryRewrite>

export const Fuzziness = z.union([z.string(), integer]).meta({ id: 'Fuzziness' })
export type Fuzziness = z.infer<typeof Fuzziness>

export const Distance = z.string().meta({ id: 'Distance' })
export type Distance = z.infer<typeof Distance>

export const GeoDistanceType = z.enum(['arc', 'plane']).meta({ id: 'GeoDistanceType' })
export type GeoDistanceType = z.infer<typeof GeoDistanceType>

/** A map tile reference, represented as `{zoom}/{x}/{y}` */
export const GeoTile = z.string().meta({ id: 'GeoTile' })
export type GeoTile = z.infer<typeof GeoTile>

export const GeoHash = z.string().meta({ id: 'GeoHash' })
export type GeoHash = z.infer<typeof GeoHash>

/** A map hex cell (H3) reference */
export const GeoHexCell = z.string().meta({ id: 'GeoHexCell' })
export type GeoHexCell = z.infer<typeof GeoHexCell>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const SortOrder = z.enum(['asc', 'desc']).meta({ id: 'SortOrder' })
export type SortOrder = z.infer<typeof SortOrder>

export const ScoreSort = z.object({
  order: SortOrder.optional()
}).meta({ id: 'ScoreSort' })
export type ScoreSort = z.infer<typeof ScoreSort>

export const SortMode = z.enum(['min', 'max', 'sum', 'avg', 'median']).meta({ id: 'SortMode' })
export type SortMode = z.infer<typeof SortMode>

export const DistanceUnit = z.enum(['in', 'ft', 'yd', 'mi', 'nmi', 'km', 'm', 'cm', 'mm']).meta({ id: 'DistanceUnit' })
export type DistanceUnit = z.infer<typeof DistanceUnit>

export const ScriptSortType = z.enum(['string', 'number', 'version']).meta({ id: 'ScriptSortType' })
export type ScriptSortType = z.infer<typeof ScriptSortType>

export const RelationName = z.string().meta({ id: 'RelationName' })
export type RelationName = z.infer<typeof RelationName>

export const Ids = z.union([Id, z.array(Id)]).meta({ id: 'Ids' })
export type Ids = z.infer<typeof Ids>

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

export const TimeZone = z.string().meta({ id: 'TimeZone' })
export type TimeZone = z.infer<typeof TimeZone>

export const DateFormat = z.string().meta({ id: 'DateFormat' })
export type DateFormat = z.infer<typeof DateFormat>

/** A field value. */
export const FieldValue = z.union([long, double, z.string(), z.boolean(), z.null()]).meta({ id: 'FieldValue' })
export type FieldValue = z.infer<typeof FieldValue>

export const TokenPruningConfig = z.object({
  tokens_freq_ratio_threshold: integer.describe('Tokens whose frequency is more than this threshold times the average frequency of all tokens in the specified field are considered outliers and pruned.').optional(),
  tokens_weight_threshold: float.describe('Tokens whose weight is less than this threshold are considered nonsignificant and pruned.').optional(),
  only_score_pruned_tokens: z.boolean().describe('Whether to only score pruned tokens, vs only scoring kept tokens.').optional()
}).meta({ id: 'TokenPruningConfig' })
export type TokenPruningConfig = z.infer<typeof TokenPruningConfig>

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

/**
 * A date and time, either as a string whose format can depend on the context (defaulting to ISO 8601), or a
 * number of milliseconds since the Epoch. Elasticsearch accepts both as input, but will generally output a string
 * representation.
 */
export const DateTime = z.union([z.string(), EpochTime]).meta({ id: 'DateTime' })
export type DateTime = z.infer<typeof DateTime>

/**
 * A date histogram interval. Similar to `Duration` with additional units: `w` (week), `M` (month), `q` (quarter) and
 * `y` (year)
 */
export const DurationLarge = z.string().meta({ id: 'DurationLarge' })
export type DurationLarge = z.infer<typeof DurationLarge>

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

export const DateMath = z.string().meta({ id: 'DateMath' })
export type DateMath = z.infer<typeof DateMath>

/** A precision that can be expressed as a geohash length between 1 and 12, or a distance measure like "1km", "10m". */
export const GeoHashPrecision = z.union([integer, z.string()]).meta({ id: 'GeoHashPrecision' })
export type GeoHashPrecision = z.infer<typeof GeoHashPrecision>

export const GeoTilePrecision = integer.meta({ id: 'GeoTilePrecision' })
export type GeoTilePrecision = z.infer<typeof GeoTilePrecision>

/** For empty Class assignments */
export const EmptyObject = z.object({
}).meta({ id: 'EmptyObject' })
export type EmptyObject = z.infer<typeof EmptyObject>

export const RankBase = z.object({
}).meta({ id: 'RankBase' })
export type RankBase = z.infer<typeof RankBase>

export const RrfRank = z.object({
  rank_constant: long.describe('How much influence documents in individual result sets per query have over the final ranked result set').optional(),
  rank_window_size: long.describe('Size of the individual result sets per query').optional()
}).meta({ id: 'RrfRank' })
export type RrfRank = z.infer<typeof RrfRank>

const RankContainerExclusiveProps = z.union([z.object({ rrf: RrfRank })])

export const RankContainer = RankContainerExclusiveProps.meta({ id: 'RankContainer' })
export type RankContainer = z.infer<typeof RankContainer>

export const SortResults = z.array(FieldValue).meta({ id: 'SortResults' })
export type SortResults = z.infer<typeof SortResults>

export const ScoreNormalizer = z.enum(['none', 'minmax', 'l2_norm']).meta({ id: 'ScoreNormalizer' })
export type ScoreNormalizer = z.infer<typeof ScoreNormalizer>

export const SpecifiedDocument = z.object({
  index: IndexName.optional(),
  id: Id
}).meta({ id: 'SpecifiedDocument' })
export type SpecifiedDocument = z.infer<typeof SpecifiedDocument>

export const DiversifyRetrieverTypes = z.enum(['mmr']).meta({ id: 'DiversifyRetrieverTypes' })
export type DiversifyRetrieverTypes = z.infer<typeof DiversifyRetrieverTypes>

export const SlicedScroll = z.object({
  field: Field.optional(),
  id: Id,
  max: integer
}).meta({ id: 'SlicedScroll' })
export type SlicedScroll = z.infer<typeof SlicedScroll>

export const ScriptLanguage = z.union([z.enum(['painless', 'expression', 'mustache', 'java']), z.string()]).meta({ id: 'ScriptLanguage' })
export type ScriptLanguage = z.infer<typeof ScriptLanguage>

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

export const uint = z.number().meta({ id: 'uint' })
export type uint = z.infer<typeof uint>

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

export const InlineGet = z.object({
  fields: z.record(z.string(), z.any()).optional(),
  found: z.boolean(),
  _seq_no: SequenceNumber.optional(),
  _primary_term: long.optional(),
  _routing: Routing.optional(),
  _source: z.any().optional()
}).catchall(z.any()).meta({ id: 'InlineGet' })
export type InlineGet = z.infer<typeof InlineGet>

export const TaskId = z.string().meta({ id: 'TaskId' })
export type TaskId = z.infer<typeof TaskId>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export const Retries = z.object({
  bulk: long.describe('The number of bulk actions retried.'),
  search: long.describe('The number of search actions retried.')
}).meta({ id: 'Retries' })
export type Retries = z.infer<typeof Retries>

export const ReindexStatus = z.object({
  slice_id: integer.describe('The slice ID').optional(),
  batches: long.describe('The number of scroll responses pulled back by the reindex.'),
  created: long.describe('The number of documents that were successfully created.').optional(),
  deleted: long.describe('The number of documents that were successfully deleted.'),
  noops: long.describe('The number of documents that were ignored because the script used for the reindex returned a `noop` value for `ctx.op`.'),
  requests_per_second: float.describe('The number of requests per second effectively executed during the reindex.'),
  retries: Retries.describe('The number of retries attempted by reindex. `bulk` is the number of bulk actions retried and `search` is the number of search actions retried.'),
  throttled: Duration.optional(),
  throttled_millis: DurationValue.describe('Number of milliseconds the request slept to conform to `requests_per_second`.'),
  throttled_until: Duration.optional(),
  throttled_until_millis: DurationValue.describe('This field should always be equal to zero in a `_reindex` response. It only has meaning when using the Task API, where it indicates the next time (in milliseconds since epoch) a throttled request will be executed again in order to conform to `requests_per_second`.'),
  total: long.describe('The number of documents that were successfully processed.'),
  updated: long.describe('The number of documents that were successfully updated, for example, a document with same ID already existed prior to reindex updating it.').optional(),
  version_conflicts: long.describe('The number of version conflicts that reindex hits.'),
  cancelled: z.string().describe('The reason for cancellation if the slice was canceled').optional()
}).meta({ id: 'ReindexStatus' })
export type ReindexStatus = z.infer<typeof ReindexStatus>

export const BulkIndexByScrollFailure = z.object({
  cause: z.lazy(() => ErrorCause),
  id: Id,
  index: IndexName,
  status: integer
}).meta({ id: 'BulkIndexByScrollFailure' })
export type BulkIndexByScrollFailure = z.infer<typeof BulkIndexByScrollFailure>

/**
 * The final result of a completed reindex operation, as stored in the task result.
 * This is the serialized form of `BulkByScrollResponse`.
 */
export const ReindexTaskResult = z.object({
  batches: long.describe('The number of scroll responses pulled back by the reindex.').optional(),
  created: long.describe('The number of documents that were successfully created.').optional(),
  deleted: long.describe('The number of documents that were successfully deleted.').optional(),
  failures: z.array(BulkIndexByScrollFailure).describe('Any failures encountered during the reindex. If non-empty, the reindex ended because of these failures.').optional(),
  noops: long.describe('The number of documents that were ignored because the script returned a `noop` value for `ctx.op`.').optional(),
  requests_per_second: float.describe('The number of requests per second effectively executed during the reindex.').optional(),
  retries: Retries.describe('The number of retries attempted by reindex.').optional(),
  throttled_millis: DurationValue.describe('Number of milliseconds the request slept to conform to `requests_per_second`.').optional(),
  throttled_until_millis: DurationValue.describe('This field should always be equal to zero in a completed reindex result.').optional(),
  timed_out: z.boolean().describe('Whether any of the requests executed during the reindex timed out.').optional(),
  took: DurationValue.describe('The total milliseconds the entire operation took.').optional(),
  total: long.describe('The number of documents that were successfully processed.').optional(),
  updated: long.describe('The number of documents that were successfully updated.').optional(),
  version_conflicts: long.describe('The number of version conflicts that occurred.').optional()
}).meta({ id: 'ReindexTaskResult' })
export type ReindexTaskResult = z.infer<typeof ReindexTaskResult>

/** Contains statistics about the number of nodes selected by the request. */
export const NodeStatistics = z.object({
  failures: z.array(z.lazy(() => ErrorCause)).optional(),
  total: integer.describe('Total number of nodes selected by the request.'),
  successful: integer.describe('Number of nodes that responded successfully to the request.'),
  failed: integer.describe('Number of nodes that rejected the request or failed to respond. If this value is not 0, a reason for the rejection or failure is included in the response.')
}).meta({ id: 'NodeStatistics' })
export type NodeStatistics = z.infer<typeof NodeStatistics>

export const ScrollId = z.string().meta({ id: 'ScrollId' })
export type ScrollId = z.infer<typeof ScrollId>

export const ScrollIds = z.union([ScrollId, z.array(ScrollId)]).meta({ id: 'ScrollIds' })
export type ScrollIds = z.infer<typeof ScrollIds>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const ExpandWildcard = z.enum(['all', 'open', 'closed', 'hidden', 'none']).meta({ id: 'ExpandWildcard' })
export type ExpandWildcard = z.infer<typeof ExpandWildcard>

export const ExpandWildcards = z.union([ExpandWildcard, z.array(ExpandWildcard)]).meta({ id: 'ExpandWildcards' })
export type ExpandWildcards = z.infer<typeof ExpandWildcards>

export const ProjectRouting = z.string().meta({ id: 'ProjectRouting' })
export type ProjectRouting = z.infer<typeof ProjectRouting>

export const Result = z.enum(['created', 'updated', 'deleted', 'not_found', 'noop']).meta({ id: 'Result' })
export type Result = z.infer<typeof Result>

export const Conflicts = z.enum(['abort', 'proceed']).meta({ id: 'Conflicts' })
export type Conflicts = z.infer<typeof Conflicts>

export const SearchType = z.enum(['query_then_fetch', 'dfs_query_then_fetch']).meta({ id: 'SearchType' })
export type SearchType = z.infer<typeof SearchType>

export const SlicesCalculation = z.enum(['auto']).meta({ id: 'SlicesCalculation' })
export type SlicesCalculation = z.infer<typeof SlicesCalculation>

/** Slices configuration used to parallelize a process. */
export const Slices = z.union([integer, SlicesCalculation]).meta({ id: 'Slices' })
export type Slices = z.infer<typeof Slices>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const TaskFailure = z.object({
  task_id: long,
  node_id: NodeId,
  status: z.string(),
  reason: z.lazy(() => ErrorCause)
}).meta({ id: 'TaskFailure' })
export type TaskFailure = z.infer<typeof TaskFailure>

export const TransportAddress = z.string().meta({ id: 'TransportAddress' })
export type TransportAddress = z.infer<typeof TransportAddress>

export const Host = z.string().meta({ id: 'Host' })
export type Host = z.infer<typeof Host>

export const Ip = z.string().meta({ id: 'Ip' })
export type Ip = z.infer<typeof Ip>

export const AcknowledgedResponseBase = z.object({
  acknowledged: z.boolean().describe('For a successful response, this value is always true. On failure, an exception is returned instead.')
}).meta({ id: 'AcknowledgedResponseBase' })
export type AcknowledgedResponseBase = z.infer<typeof AcknowledgedResponseBase>

export const LifecycleOperationMode = z.enum(['RUNNING', 'STOPPING', 'STOPPED']).meta({ id: 'LifecycleOperationMode' })
export type LifecycleOperationMode = z.infer<typeof LifecycleOperationMode>

export const OpType = z.enum(['index', 'create']).meta({ id: 'OpType' })
export type OpType = z.infer<typeof OpType>

export const Uuid = z.string().meta({ id: 'Uuid' })
export type Uuid = z.infer<typeof Uuid>

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

export const ElasticsearchVersionInfo = z.object({
  build_date: DateTime.describe('The Elasticsearch Git commit\'s date.'),
  build_flavor: z.string().describe('The build flavor. For example, `default`.'),
  build_hash: z.string().describe('The Elasticsearch Git commit\'s SHA hash.'),
  build_snapshot: z.boolean().describe('Indicates whether the Elasticsearch build was a snapshot.'),
  build_type: z.string().describe('The build type that corresponds to how Elasticsearch was installed. For example, `docker`, `rpm`, or `tar`.'),
  lucene_version: VersionString.describe('The version number of Elasticsearch\'s underlying Lucene software.'),
  minimum_index_compatibility_version: VersionString.describe('The minimum index version with which the responding node can read from disk.'),
  minimum_wire_compatibility_version: VersionString.describe('The minimum node version with which the responding node can communicate. Also the minimum version from which you can perform a rolling upgrade.'),
  number: z.string().describe('The Elasticsearch version number. ::: IMPORTANT: For Serverless deployments, this static value is always `8.11.0` and is used solely for backward compatibility with legacy clients.  Serverless environments are versionless and automatically upgraded, so this value can be safely ignored.')
}).meta({ id: 'ElasticsearchVersionInfo' })
export type ElasticsearchVersionInfo = z.infer<typeof ElasticsearchVersionInfo>

/** Information about a single reindex task, as returned by the reindex management APIs. */
export const ReindexTaskInfo = z.object({
  id: TaskId.describe('The ID of the reindex task, in `nodeId:taskNum` format.'),
  description: z.string().describe('A sanitized description of the reindex operation (source and destination indices, and optionally remote host info).').optional(),
  start_time_in_millis: EpochTime.describe('The time at which the reindex task started, in milliseconds since the Unix epoch.'),
  start_time: z.string().describe('The time at which the reindex task started, as an ISO 8601 formatted string. Only present when the request includes the `?human=true` query parameter.').optional(),
  running_time: Duration.describe('The elapsed running time of the reindex task, in a human-readable format. Only present when the request includes the `?human=true` query parameter.').optional(),
  running_time_in_nanos: DurationValue.describe('The elapsed running time of the reindex task, in nanoseconds.'),
  cancelled: z.boolean().describe('Whether the reindex task has been cancelled.'),
  status: ReindexStatus.describe('The current progress of the reindex operation.').optional()
}).meta({ id: 'ReindexTaskInfo' })
export type ReindexTaskInfo = z.infer<typeof ReindexTaskInfo>

export const ClusterAlias = z.string().meta({ id: 'ClusterAlias' })
export type ClusterAlias = z.infer<typeof ClusterAlias>

export const ClusterSearchStatus = z.enum(['running', 'successful', 'partial', 'skipped', 'failed']).meta({ id: 'ClusterSearchStatus' })
export type ClusterSearchStatus = z.infer<typeof ClusterSearchStatus>

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

/**
 * The suggestion name as returned from the server. Depending whether typed_keys is specified this could come back
 * in the form of `name#type` instead of simply `name`
 */
export const SuggestionName = z.string().meta({ id: 'SuggestionName' })
export type SuggestionName = z.infer<typeof SuggestionName>

/** The response returned by Elasticsearch when request execution did not succeed. */
export const ErrorResponseBase = z.object({
  error: z.lazy(() => ErrorCause),
  status: integer
}).meta({ id: 'ErrorResponseBase' })
export type ErrorResponseBase = z.infer<typeof ErrorResponseBase>

export const Username = z.string().meta({ id: 'Username' })
export type Username = z.infer<typeof Username>

export const Password = z.string().meta({ id: 'Password' })
export type Password = z.infer<typeof Password>

export const HttpHeaders = z.record(z.string(), z.union([z.string(), z.array(z.string())])).meta({ id: 'HttpHeaders' })
export type HttpHeaders = z.infer<typeof HttpHeaders>

export const NodeRole = z.enum(['master', 'data', 'data_cold', 'data_content', 'data_frozen', 'data_hot', 'data_warm', 'client', 'ingest', 'ml', 'voting_only', 'transform', 'remote_cluster_client', 'coordinating_only']).meta({ id: 'NodeRole' })
export type NodeRole = z.infer<typeof NodeRole>

export const NodeRoles = z.array(NodeRole).meta({ id: 'NodeRoles' })
export type NodeRoles = z.infer<typeof NodeRoles>

export const SuggestMode = z.enum(['missing', 'popular', 'always']).meta({ id: 'SuggestMode' })
export type SuggestMode = z.infer<typeof SuggestMode>

export const MapboxVectorTiles = z.instanceof(ArrayBuffer).meta({ id: 'MapboxVectorTiles' })
export type MapboxVectorTiles = z.infer<typeof MapboxVectorTiles>

export const NodeName = z.string().meta({ id: 'NodeName' })
export type NodeName = z.infer<typeof NodeName>

export const RelocationFailureInfo = z.object({
  failed_attempts: integer
}).meta({ id: 'RelocationFailureInfo' })
export type RelocationFailureInfo = z.infer<typeof RelocationFailureInfo>

/**
 * The aggregation name as returned from the server. Depending whether typed_keys is specified this could come back
 * in the form of `name#type` instead of simply `name`
 */
export const AggregateName = z.string().meta({ id: 'AggregateName' })
export type AggregateName = z.infer<typeof AggregateName>

export const CartesianPoint = z.object({
  x: double,
  y: double
}).meta({ id: 'CartesianPoint' })
export type CartesianPoint = z.infer<typeof CartesianPoint>

/** A GeoJson GeoLine. */
export const GeoLine = z.object({
  type: z.string().describe('Always `"LineString"`'),
  coordinates: z.array(z.array(double)).describe('Array of `[lon, lat]` coordinates')
}).meta({ id: 'GeoLine' })
export type GeoLine = z.infer<typeof GeoLine>

export const ByteSize = z.union([long, z.string()]).meta({ id: 'ByteSize' })
export type ByteSize = z.infer<typeof ByteSize>

export const BulkStats = z.object({
  total_operations: long,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue,
  total_size: ByteSize.optional(),
  total_size_in_bytes: long,
  avg_time: Duration.optional(),
  avg_time_in_millis: DurationValue,
  avg_size: ByteSize.optional(),
  avg_size_in_bytes: long
}).meta({ id: 'BulkStats' })
export type BulkStats = z.infer<typeof BulkStats>

export const Bytes = z.enum(['b', 'kb', 'mb', 'gb', 'tb', 'pb']).meta({ id: 'Bytes' })
export type Bytes = z.infer<typeof Bytes>

export const CategoryId = long.meta({ id: 'CategoryId' })
export type CategoryId = z.infer<typeof CategoryId>

export const ClusterInfoTarget = z.enum(['_all', 'http', 'ingest', 'thread_pool', 'script']).meta({ id: 'ClusterInfoTarget' })
export type ClusterInfoTarget = z.infer<typeof ClusterInfoTarget>

export const ClusterInfoTargets = z.union([ClusterInfoTarget, z.array(ClusterInfoTarget)]).meta({ id: 'ClusterInfoTargets' })
export type ClusterInfoTargets = z.infer<typeof ClusterInfoTargets>

export const CommonStatsFlag = z.enum(['_all', 'store', 'indexing', 'get', 'search', 'merge', 'flush', 'refresh', 'query_cache', 'fielddata', 'docs', 'warmer', 'completion', 'segments', 'translog', 'request_cache', 'recovery', 'bulk', 'shard_stats', 'mappings', 'dense_vector', 'sparse_vector']).meta({ id: 'CommonStatsFlag' })
export type CommonStatsFlag = z.infer<typeof CommonStatsFlag>

export const CommonStatsFlags = z.union([CommonStatsFlag, z.array(CommonStatsFlag)]).meta({ id: 'CommonStatsFlags' })
export type CommonStatsFlags = z.infer<typeof CommonStatsFlags>

export const FieldSizeUsage = z.object({
  size: ByteSize.optional(),
  size_in_bytes: long
}).meta({ id: 'FieldSizeUsage' })
export type FieldSizeUsage = z.infer<typeof FieldSizeUsage>

export const CompletionStats = z.object({
  size_in_bytes: long.describe('Total amount, in bytes, of memory used for completion across all shards assigned to selected nodes.'),
  size: ByteSize.describe('Total amount of memory used for completion across all shards assigned to selected nodes.').optional(),
  fields: z.record(Field, FieldSizeUsage).optional()
}).meta({ id: 'CompletionStats' })
export type CompletionStats = z.infer<typeof CompletionStats>

export const DFIIndependenceMeasure = z.enum(['standardized', 'saturated', 'chisquared']).meta({ id: 'DFIIndependenceMeasure' })
export type DFIIndependenceMeasure = z.infer<typeof DFIIndependenceMeasure>

export const DFRAfterEffect = z.enum(['no', 'b', 'l']).meta({ id: 'DFRAfterEffect' })
export type DFRAfterEffect = z.infer<typeof DFRAfterEffect>

export const DFRBasicModel = z.enum(['be', 'd', 'g', 'if', 'in', 'ine', 'p']).meta({ id: 'DFRBasicModel' })
export type DFRBasicModel = z.infer<typeof DFRBasicModel>

export const DataStreamName = z.string().meta({ id: 'DataStreamName' })
export type DataStreamName = z.infer<typeof DataStreamName>

export const DataStreamNames = z.union([DataStreamName, z.array(DataStreamName)]).meta({ id: 'DataStreamNames' })
export type DataStreamNames = z.infer<typeof DataStreamNames>

export const DocStats = z.object({
  count: long.describe('Total number of non-deleted documents across all primary shards assigned to selected nodes. This number is based on documents in Lucene segments and may include documents from nested fields.'),
  deleted: long.describe('Total number of deleted documents across all primary shards assigned to selected nodes. This number is based on documents in Lucene segments. Elasticsearch reclaims the disk space of deleted Lucene documents when a segment is merged.').optional(),
  total_size_in_bytes: long.describe('Returns the total size in bytes of all documents in this stats. This value may be more reliable than store_stats.size_in_bytes in estimating the index size.'),
  total_size: ByteSize.describe('Human readable total_size_in_bytes').optional()
}).meta({ id: 'DocStats' })
export type DocStats = z.infer<typeof DocStats>

/** Reduced (minimal) info ElasticsearchVersion */
export const ElasticsearchVersionMinInfo = z.object({
  build_flavor: z.string(),
  minimum_index_compatibility_version: VersionString,
  minimum_wire_compatibility_version: VersionString,
  number: z.string()
}).meta({ id: 'ElasticsearchVersionMinInfo' })
export type ElasticsearchVersionMinInfo = z.infer<typeof ElasticsearchVersionMinInfo>

export const FieldMemoryUsage = z.object({
  memory_size: ByteSize.optional(),
  memory_size_in_bytes: long
}).meta({ id: 'FieldMemoryUsage' })
export type FieldMemoryUsage = z.infer<typeof FieldMemoryUsage>

export const FieldSortNumericType = z.enum(['long', 'double', 'date', 'date_nanos']).meta({ id: 'FieldSortNumericType' })
export type FieldSortNumericType = z.infer<typeof FieldSortNumericType>

/** Time unit for milliseconds */
export const UnitMillis = long.meta({ id: 'UnitMillis' })
export type UnitMillis = z.infer<typeof UnitMillis>

export const GlobalOrdinalFieldStats = z.object({
  build_time_in_millis: UnitMillis,
  build_time: z.string().optional(),
  shard_max_value_count: long
}).meta({ id: 'GlobalOrdinalFieldStats' })
export type GlobalOrdinalFieldStats = z.infer<typeof GlobalOrdinalFieldStats>

export const GlobalOrdinalsStats = z.object({
  build_time_in_millis: UnitMillis,
  build_time: z.string().optional(),
  fields: z.record(Name, GlobalOrdinalFieldStats).optional()
}).meta({ id: 'GlobalOrdinalsStats' })
export type GlobalOrdinalsStats = z.infer<typeof GlobalOrdinalsStats>

export const FielddataStats = z.object({
  evictions: long.optional(),
  memory_size: ByteSize.optional(),
  memory_size_in_bytes: long,
  fields: z.record(Field, FieldMemoryUsage).optional(),
  global_ordinals: GlobalOrdinalsStats
}).meta({ id: 'FielddataStats' })
export type FielddataStats = z.infer<typeof FielddataStats>

export const FlushStats = z.object({
  periodic: long,
  total: long,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue
}).meta({ id: 'FlushStats' })
export type FlushStats = z.infer<typeof FlushStats>

/** A GeoJson shape, that can also use Elasticsearch's `envelope` extension. */
export const GeoShape = z.any().meta({ id: 'GeoShape' })
export type GeoShape = z.infer<typeof GeoShape>

export const GeoShapeRelation = z.enum(['intersects', 'disjoint', 'within', 'contains']).meta({ id: 'GeoShapeRelation' })
export type GeoShapeRelation = z.infer<typeof GeoShapeRelation>

export const GetStats = z.object({
  current: long,
  exists_time: Duration.optional(),
  exists_time_in_millis: DurationValue,
  exists_total: long,
  missing_time: Duration.optional(),
  missing_time_in_millis: DurationValue,
  missing_total: long,
  time: Duration.optional(),
  time_in_millis: DurationValue,
  total: long
}).meta({ id: 'GetStats' })
export type GetStats = z.infer<typeof GetStats>

export const GrokPattern = z.string().meta({ id: 'GrokPattern' })
export type GrokPattern = z.infer<typeof GrokPattern>

export const HealthStatus = z.enum(['green', 'GREEN', 'yellow', 'YELLOW', 'red', 'RED', 'unknown', 'unavailable']).meta({ id: 'HealthStatus' })
export type HealthStatus = z.infer<typeof HealthStatus>

export const IBDistribution = z.enum(['ll', 'spl']).meta({ id: 'IBDistribution' })
export type IBDistribution = z.infer<typeof IBDistribution>

export const IBLambda = z.enum(['df', 'ttf']).meta({ id: 'IBLambda' })
export type IBLambda = z.infer<typeof IBLambda>

export const IndexAlias = z.string().meta({ id: 'IndexAlias' })
export type IndexAlias = z.infer<typeof IndexAlias>

export const IndexPattern = z.string().meta({ id: 'IndexPattern' })
export type IndexPattern = z.infer<typeof IndexPattern>

export const IndexPatterns = z.array(IndexPattern).meta({ id: 'IndexPatterns' })
export type IndexPatterns = z.infer<typeof IndexPatterns>

export interface IndexingStatsShape {
  index_current: long
  delete_current: long
  delete_time?: Duration | undefined
  delete_time_in_millis: DurationValue
  delete_total: long
  is_throttled: boolean
  noop_update_total: long
  throttle_time?: Duration | undefined
  throttle_time_in_millis: DurationValue
  index_time?: Duration | undefined
  index_time_in_millis: DurationValue
  index_total: long
  index_failed: long
  types?: Record<string, IndexingStatsShape> | undefined
  write_load?: double | undefined
  recent_write_load?: double | undefined
  peak_write_load?: double | undefined
}
export const IndexingStats = z.object({
  index_current: long,
  delete_current: long,
  delete_time: Duration.optional(),
  delete_time_in_millis: DurationValue,
  delete_total: long,
  is_throttled: z.boolean(),
  noop_update_total: long,
  throttle_time: Duration.optional(),
  throttle_time_in_millis: DurationValue,
  index_time: Duration.optional(),
  index_time_in_millis: DurationValue,
  index_total: long,
  index_failed: long,
  get types (): z.ZodOptional<z.ZodRecord<z.ZodString, typeof IndexingStats>> { return z.record(z.string(), IndexingStats).optional() },
  write_load: double.optional(),
  recent_write_load: double.optional(),
  peak_write_load: double.optional()
}).meta({ id: 'IndexingStats' })
export type IndexingStats = z.infer<typeof IndexingStats>

/**
 * Controls how to deal with unavailable concrete indices (closed or missing), how wildcard expressions are expanded
 * to actual indices (all, closed or open indices) and how to deal with wildcard expressions that resolve to no indices.
 */
export const IndicesOptions = z.object({
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional(),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional(),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional(),
  ignore_throttled: z.boolean().describe('If true, concrete, expanded or aliased indices are ignored when frozen.').optional()
}).meta({ id: 'IndicesOptions' })
export type IndicesOptions = z.infer<typeof IndicesOptions>

export const IndicesResponseBase = z.object({
  ...AcknowledgedResponseBase.shape,
  _shards: ShardStatistics.optional()
}).meta({ id: 'IndicesResponseBase' })
export type IndicesResponseBase = z.infer<typeof IndicesResponseBase>

export const Level = z.enum(['cluster', 'indices', 'shards']).meta({ id: 'Level' })
export type Level = z.infer<typeof Level>

export const MergesStats = z.object({
  current: long,
  current_docs: long,
  current_size: z.string().optional(),
  current_size_in_bytes: long,
  total: long,
  total_auto_throttle: z.string().optional(),
  total_auto_throttle_in_bytes: long,
  total_docs: long,
  total_size: z.string().optional(),
  total_size_in_bytes: long,
  total_stopped_time: Duration.optional(),
  total_stopped_time_in_millis: DurationValue,
  total_throttled_time: Duration.optional(),
  total_throttled_time_in_millis: DurationValue,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue
}).meta({ id: 'MergesStats' })
export type MergesStats = z.infer<typeof MergesStats>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const Namespace = z.string().meta({ id: 'Namespace' })
export type Namespace = z.infer<typeof Namespace>

export const NodeAttributes = z.object({
  attributes: z.record(z.string(), z.string()).describe('Lists node attributes.'),
  ephemeral_id: Id.describe('The ephemeral ID of the node.'),
  id: NodeId.describe('The unique identifier of the node.').optional(),
  name: NodeName.describe('The unique identifier of the node.'),
  transport_address: TransportAddress.describe('The host and port where transport HTTP connections are accepted.')
}).meta({ id: 'NodeAttributes' })
export type NodeAttributes = z.infer<typeof NodeAttributes>

export const NodeIds = z.union([NodeId, z.array(NodeId)]).meta({ id: 'NodeIds' })
export type NodeIds = z.infer<typeof NodeIds>

export const NodeStatsLevel = z.enum(['node', 'indices', 'shards']).meta({ id: 'NodeStatsLevel' })
export type NodeStatsLevel = z.infer<typeof NodeStatsLevel>

export const Normalization = z.enum(['no', 'h1', 'h2', 'h3', 'z']).meta({ id: 'Normalization' })
export type Normalization = z.infer<typeof Normalization>

export const Percentage = z.union([z.string(), float]).meta({ id: 'Percentage' })
export type Percentage = z.infer<typeof Percentage>

export const PipelineName = z.string().meta({ id: 'PipelineName' })
export type PipelineName = z.infer<typeof PipelineName>

export const PluginStats = z.object({
  classname: z.string(),
  description: z.string(),
  elasticsearch_version: VersionString,
  extended_plugins: z.array(z.string()),
  has_native_controller: z.boolean(),
  java_version: VersionString,
  name: Name,
  version: VersionString,
  licensed: z.boolean()
}).meta({ id: 'PluginStats' })
export type PluginStats = z.infer<typeof PluginStats>

export const PropertyName = z.string().meta({ id: 'PropertyName' })
export type PropertyName = z.infer<typeof PropertyName>

export const QueryCacheStats = z.object({
  cache_count: long.describe('Total number of entries added to the query cache across all shards assigned to selected nodes. This number includes current and evicted entries.'),
  cache_size: long.describe('Total number of entries currently in the query cache across all shards assigned to selected nodes.'),
  evictions: long.describe('Total number of query cache evictions across all shards assigned to selected nodes.'),
  hit_count: long.describe('Total count of query cache hits across all shards assigned to selected nodes.'),
  memory_size: ByteSize.describe('Total amount of memory used for the query cache across all shards assigned to selected nodes.').optional(),
  memory_size_in_bytes: long.describe('Total amount, in bytes, of memory used for the query cache across all shards assigned to selected nodes.'),
  miss_count: long.describe('Total count of query cache misses across all shards assigned to selected nodes.'),
  total_count: long.describe('Total count of hits and misses in the query cache across all shards assigned to selected nodes.')
}).meta({ id: 'QueryCacheStats' })
export type QueryCacheStats = z.infer<typeof QueryCacheStats>

export const RecoveryStats = z.object({
  current_as_source: long,
  current_as_target: long,
  throttle_time: Duration.optional(),
  throttle_time_in_millis: DurationValue
}).meta({ id: 'RecoveryStats' })
export type RecoveryStats = z.infer<typeof RecoveryStats>

export const RefreshStats = z.object({
  external_total: long,
  external_total_time_in_millis: DurationValue,
  listeners: long,
  total: long,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue
}).meta({ id: 'RefreshStats' })
export type RefreshStats = z.infer<typeof RefreshStats>

export const RequestCacheStats = z.object({
  evictions: long,
  hit_count: long,
  memory_size: z.string().optional(),
  memory_size_in_bytes: long,
  miss_count: long
}).meta({ id: 'RequestCacheStats' })
export type RequestCacheStats = z.infer<typeof RequestCacheStats>

/** A scalar value. */
export const ScalarValue = z.union([long, double, z.string(), z.boolean(), z.null()]).meta({ id: 'ScalarValue' })
export type ScalarValue = z.infer<typeof ScalarValue>

export interface SearchStatsShape {
  fetch_current: long
  fetch_time?: Duration | undefined
  fetch_time_in_millis: DurationValue
  fetch_total: long
  open_contexts?: long | undefined
  query_current: long
  query_time?: Duration | undefined
  query_time_in_millis: DurationValue
  query_total: long
  scroll_current: long
  scroll_time?: Duration | undefined
  scroll_time_in_millis: DurationValue
  scroll_total: long
  suggest_current: long
  suggest_time?: Duration | undefined
  suggest_time_in_millis: DurationValue
  suggest_total: long
  recent_search_load?: double | undefined
  groups?: Record<string, SearchStatsShape> | undefined
}
export const SearchStats = z.object({
  fetch_current: long,
  fetch_time: Duration.optional(),
  fetch_time_in_millis: DurationValue,
  fetch_total: long,
  open_contexts: long.optional(),
  query_current: long,
  query_time: Duration.optional(),
  query_time_in_millis: DurationValue,
  query_total: long,
  scroll_current: long,
  scroll_time: Duration.optional(),
  scroll_time_in_millis: DurationValue,
  scroll_total: long,
  suggest_current: long,
  suggest_time: Duration.optional(),
  suggest_time_in_millis: DurationValue,
  suggest_total: long,
  recent_search_load: double.optional(),
  get groups (): z.ZodOptional<z.ZodRecord<z.ZodString, typeof SearchStats>> { return z.record(z.string(), SearchStats).optional() }
}).meta({ id: 'SearchStats' })
export type SearchStats = z.infer<typeof SearchStats>

export const Service = z.string().meta({ id: 'Service' })
export type Service = z.infer<typeof Service>

export const ShardsOperationResponseBase = z.object({
  _shards: ShardStatistics.optional()
}).meta({ id: 'ShardsOperationResponseBase' })
export type ShardsOperationResponseBase = z.infer<typeof ShardsOperationResponseBase>

export const StoreStats = z.object({
  size: ByteSize.describe('Total size of all shards assigned to selected nodes.').optional(),
  size_in_bytes: long.describe('Total size, in bytes, of all shards assigned to selected nodes.'),
  reserved: ByteSize.describe('A prediction of how much larger the shard stores will eventually grow due to ongoing peer recoveries, restoring snapshots, and similar activities.').optional(),
  reserved_in_bytes: long.describe('A prediction, in bytes, of how much larger the shard stores will eventually grow due to ongoing peer recoveries, restoring snapshots, and similar activities.'),
  total_data_set_size: ByteSize.describe('Total data set size of all shards assigned to selected nodes. This includes the size of shards not stored fully on the nodes, such as the cache for partially mounted indices.').optional(),
  total_data_set_size_in_bytes: long.describe('Total data set size, in bytes, of all shards assigned to selected nodes. This includes the size of shards not stored fully on the nodes, such as the cache for partially mounted indices.').optional()
}).meta({ id: 'StoreStats' })
export type StoreStats = z.infer<typeof StoreStats>

export const StreamResult = z.instanceof(ArrayBuffer).meta({ id: 'StreamResult' })
export type StreamResult = z.infer<typeof StreamResult>

export const ThreadType = z.enum(['cpu', 'wait', 'block', 'gpu', 'mem']).meta({ id: 'ThreadType' })
export type ThreadType = z.infer<typeof ThreadType>

/** Time of day, expressed as HH:MM:SS */
export const TimeOfDay = z.string().meta({ id: 'TimeOfDay' })
export type TimeOfDay = z.infer<typeof TimeOfDay>

export const TimeUnit = z.enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd']).meta({ id: 'TimeUnit' })
export type TimeUnit = z.infer<typeof TimeUnit>

export const TranslogStats = z.object({
  earliest_last_modified_age: long,
  operations: long,
  size: z.string().optional(),
  size_in_bytes: long,
  uncommitted_operations: integer,
  uncommitted_size: z.string().optional(),
  uncommitted_size_in_bytes: long
}).meta({ id: 'TranslogStats' })
export type TranslogStats = z.infer<typeof TranslogStats>

/** Time unit for fractional milliseconds */
export const UnitFloatMillis = double.meta({ id: 'UnitFloatMillis' })
export type UnitFloatMillis = z.infer<typeof UnitFloatMillis>

/** Time unit for nanoseconds */
export const UnitNanos = long.meta({ id: 'UnitNanos' })
export type UnitNanos = z.infer<typeof UnitNanos>

/** Time unit for seconds */
export const UnitSeconds = long.meta({ id: 'UnitSeconds' })
export type UnitSeconds = z.infer<typeof UnitSeconds>

export const WaitForEvents = z.enum(['immediate', 'urgent', 'high', 'normal', 'low', 'languid']).meta({ id: 'WaitForEvents' })
export type WaitForEvents = z.infer<typeof WaitForEvents>

export const WarmerStats = z.object({
  current: long,
  total: long,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue
}).meta({ id: 'WarmerStats' })
export type WarmerStats = z.infer<typeof WarmerStats>

export const byte = z.number().meta({ id: 'byte' })
export type byte = z.infer<typeof byte>

export const short = z.number().meta({ id: 'short' })
export type short = z.infer<typeof short>

export const ulong = z.number().meta({ id: 'ulong' })
export type ulong = z.infer<typeof ulong>
