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

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const ByteSize = z.union([long, z.string()]).meta({ id: 'ByteSize' })
export type ByteSize = z.infer<typeof ByteSize>

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
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const Metadata = z.record(z.string(), z.any()).meta({ id: 'Metadata' })
export type Metadata = z.infer<typeof Metadata>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

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

export const uint = z.number().meta({ id: 'uint' })
export type uint = z.infer<typeof uint>

export const ShardStatistics = z.object({
  failed: uint.describe('The number of shards the operation or search attempted to run on but failed.'),
  successful: uint.describe('The number of shards the operation or search succeeded on.'),
  total: uint.describe('The number of shards the operation or search will run on overall.'),
  failures: z.array(ShardFailure).optional(),
  skipped: uint.optional()
}).meta({ id: 'ShardStatistics' })
export type ShardStatistics = z.infer<typeof ShardStatistics>

export const SortOrder = z.enum(['asc', 'desc']).meta({ id: 'SortOrder' })
export type SortOrder = z.infer<typeof SortOrder>

export const Uuid = z.string().meta({ id: 'Uuid' })
export type Uuid = z.infer<typeof Uuid>

export const VersionNumber = long.meta({ id: 'VersionNumber' })
export type VersionNumber = z.infer<typeof VersionNumber>

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

export const SnapshotIndexDetails = z.object({
  shard_count: integer,
  size: ByteSize.optional(),
  size_in_bytes: long,
  max_segments_per_shard: long
}).meta({ id: 'SnapshotIndexDetails' })
export type SnapshotIndexDetails = z.infer<typeof SnapshotIndexDetails>

export const SnapshotInfoFeatureState = z.object({
  feature_name: z.string(),
  indices: Indices
}).meta({ id: 'SnapshotInfoFeatureState' })
export type SnapshotInfoFeatureState = z.infer<typeof SnapshotInfoFeatureState>

export const SnapshotSnapshotShardFailure = z.object({
  index: IndexName,
  node_id: Id.optional(),
  reason: z.string(),
  shard_id: integer,
  index_uuid: Id,
  status: z.string()
}).meta({ id: 'SnapshotSnapshotShardFailure' })
export type SnapshotSnapshotShardFailure = z.infer<typeof SnapshotSnapshotShardFailure>

export const SnapshotSnapshotInfo = z.object({
  data_streams: z.array(z.string()),
  duration: Duration.optional(),
  duration_in_millis: DurationValue.optional(),
  end_time: DateTime.optional(),
  end_time_in_millis: EpochTime.optional(),
  failures: z.array(SnapshotSnapshotShardFailure).optional(),
  include_global_state: z.boolean().optional(),
  indices: z.array(IndexName).optional(),
  index_details: z.record(IndexName, SnapshotIndexDetails).optional(),
  metadata: Metadata.optional(),
  reason: z.string().optional(),
  repository: Name.optional(),
  snapshot: Name,
  shards: ShardStatistics.optional(),
  start_time: DateTime.optional(),
  start_time_in_millis: EpochTime.optional(),
  state: z.string().optional(),
  uuid: Uuid,
  version: VersionString.optional(),
  version_id: VersionNumber.optional(),
  feature_states: z.array(SnapshotInfoFeatureState).optional()
}).meta({ id: 'SnapshotSnapshotInfo' })
export type SnapshotSnapshotInfo = z.infer<typeof SnapshotSnapshotInfo>

export const SnapshotSnapshotSort = z.enum(['start_time', 'duration', 'name', 'index_count', 'repository', 'shard_count', 'failed_shard_count']).meta({ id: 'SnapshotSnapshotSort' })
export type SnapshotSnapshotSort = z.infer<typeof SnapshotSnapshotSort>

export const SnapshotSnapshotState = z.enum(['IN_PROGRESS', 'SUCCESS', 'FAILED', 'PARTIAL', 'INCOMPATIBLE']).meta({ id: 'SnapshotSnapshotState' })
export type SnapshotSnapshotState = z.infer<typeof SnapshotSnapshotState>

/**
 * Get snapshot information.
 *
 * NOTE: The `after` parameter and `next` field enable you to iterate through snapshots with some consistency guarantees regarding concurrent creation or deletion of snapshots.
 * It is guaranteed that any snapshot that exists at the beginning of the iteration and is not concurrently deleted will be seen during the iteration.
 * Snapshots concurrently created may be seen during an iteration.
 */
export const SnapshotGetRequest = z.object({
  ...RequestBase.shape,
  repository: Name.describe('A comma-separated list of snapshot repository names used to limit the request. Wildcard (`*`) expressions are supported.').meta({ found_in: 'path' }),
  snapshot: Names.describe('A comma-separated list of snapshot names to retrieve Wildcards (`*`) are supported. * To get information about all snapshots in a registered repository, use a wildcard (`*`) or `_all`. * To get information about any snapshots that are currently running, use `_current`.').meta({ found_in: 'path' }),
  after: z.string().describe('An offset identifier to start pagination from as returned by the next field in the response body.').optional().meta({ found_in: 'query' }),
  from_sort_value: z.string().describe('The value of the current sort column at which to start retrieval. It can be a string `snapshot-` or a repository name when sorting by snapshot or repository name. It can be a millisecond time value or a number when sorting by `index-` or shard count.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error for any snapshots that are unavailable.').optional().meta({ found_in: 'query' }),
  index_details: z.boolean().describe('If `true`, the response includes additional information about each index in the snapshot comprising the number of shards in the index, the total size of the index in bytes, and the maximum number of segments per shard in the index. The default is `false`, meaning that this information is omitted.').optional().meta({ found_in: 'query' }),
  index_names: z.boolean().describe('If `true`, the response includes the name of each index in each snapshot.').optional().meta({ found_in: 'query' }),
  include_repository: z.boolean().describe('If `true`, the response includes the repository name in each snapshot.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  order: SortOrder.describe('The sort order. Valid values are `asc` for ascending and `desc` for descending order. The default behavior is ascending order.').optional().meta({ found_in: 'query' }),
  offset: integer.describe('Numeric offset to start pagination from based on the snapshots matching this request. Using a non-zero value for this parameter is mutually exclusive with using the after parameter. Defaults to 0.').optional().meta({ found_in: 'query' }),
  size: integer.describe('The maximum number of snapshots to return. The default is -1, which means to return all that match the request without limit.').optional().meta({ found_in: 'query' }),
  slm_policy_filter: Name.describe('Filter snapshots by a comma-separated list of snapshot lifecycle management (SLM) policy names that snapshots belong to. You can use wildcards (`*`) and combinations of wildcards followed by exclude patterns starting with `-`. For example, the pattern `*,-policy-a-*` will return all snapshots except for those that were created by an SLM policy with a name starting with `policy-a-`. Note that the wildcard pattern `*` matches all snapshots created by an SLM policy but not those snapshots that were not created by an SLM policy. To include snapshots that were not created by an SLM policy, you can use the special pattern `_none` that will match all snapshots without an SLM policy.').optional().meta({ found_in: 'query' }),
  sort: SnapshotSnapshotSort.describe('The sort order for the result. The default behavior is sorting by snapshot start time stamp.').optional().meta({ found_in: 'query' }),
  state: z.union([SnapshotSnapshotState, z.array(SnapshotSnapshotState)]).describe('Only return snapshots with a state found in the given comma-separated list of snapshot states. The default is all snapshot states.').optional().meta({ found_in: 'query' }),
  verbose: z.boolean().describe('If `true`, returns additional information about each snapshot such as the version of Elasticsearch which took the snapshot, the start and end times of the snapshot, and the number of shards snapshotted. NOTE: The parameters `size`, `order`, `after`, `from_sort_value`, `offset`, `slm_policy_filter`, and `sort` are not supported when you set `verbose=false` and the sort order for requests with `verbose=false` is undefined.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SnapshotGetRequest' })
export type SnapshotGetRequest = z.infer<typeof SnapshotGetRequest>

export const SnapshotGetSnapshotResponseItem = z.object({
  repository: Name,
  snapshots: z.array(SnapshotSnapshotInfo).optional(),
  error: z.lazy(() => ErrorCause).optional()
}).meta({ id: 'SnapshotGetSnapshotResponseItem' })
export type SnapshotGetSnapshotResponseItem = z.infer<typeof SnapshotGetSnapshotResponseItem>

export const SnapshotGetResponse = z.object({
  remaining: integer.describe('The number of remaining snapshots that were not returned due to size limits and that can be fetched by additional requests using the `next` field value.'),
  total: integer.describe('The total number of snapshots that match the request when ignoring the size limit or `after` query parameter.'),
  next: z.string().describe('If the request contained a size limit and there might be more results, a `next` field will be added to the response. It can be used as the `after` query parameter to fetch additional results.').optional(),
  responses: z.array(SnapshotGetSnapshotResponseItem).optional(),
  snapshots: z.array(SnapshotSnapshotInfo).optional()
}).meta({ id: 'SnapshotGetResponse' })
export type SnapshotGetResponse = z.infer<typeof SnapshotGetResponse>
