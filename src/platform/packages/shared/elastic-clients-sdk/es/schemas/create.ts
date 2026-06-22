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

export const BulkFailureStoreStatus = z.enum(['not_applicable_or_unknown', 'used', 'not_enabled', 'failed']).meta({ id: 'BulkFailureStoreStatus' })
export type BulkFailureStoreStatus = z.infer<typeof BulkFailureStoreStatus>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Refresh = z.union([z.boolean(), z.enum(['true', 'false', 'wait_for'])]).meta({ id: 'Refresh' })
export type Refresh = z.infer<typeof Refresh>

/** Only to be used in query and path parameters, as the array form is actually a csv */
export const Routing = z.union([z.string(), z.array(z.string())]).meta({ id: 'Routing' })
export type Routing = z.infer<typeof Routing>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const VersionNumber = long.meta({ id: 'VersionNumber' })
export type VersionNumber = z.infer<typeof VersionNumber>

export const VersionType = z.enum(['internal', 'external', 'external_gte']).meta({ id: 'VersionType' })
export type VersionType = z.infer<typeof VersionType>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const WaitForActiveShardOptions = z.enum(['all', 'index-setting']).meta({ id: 'WaitForActiveShardOptions' })
export type WaitForActiveShardOptions = z.infer<typeof WaitForActiveShardOptions>

export const WaitForActiveShards = z.union([integer, WaitForActiveShardOptions]).meta({ id: 'WaitForActiveShards' })
export type WaitForActiveShards = z.infer<typeof WaitForActiveShards>

/**
 * Create a new document in the index.
 *
 * You can index a new JSON document with the `/<target>/_doc/` or `/<target>/_create/<_id>` APIs
 * Using `_create` guarantees that the document is indexed only if it does not already exist.
 * It returns a 409 response when a document with a same ID already exists in the index.
 * To update an existing document, you must use the `/<target>/_doc/` API.
 *
 * If the Elasticsearch security features are enabled, you must have the following index privileges for the target data stream, index, or index alias:
 *
 * * To add a document using the `PUT /<target>/_create/<_id>` or `POST /<target>/_create/<_id>` request formats, you must have the `create_doc`, `create`, `index`, or `write` index privilege.
 * * To automatically create a data stream or index with this API request, you must have the `auto_configure`, `create_index`, or `manage` index privilege.
 *
 * Automatic data stream creation requires a matching index template with data stream enabled.
 *
 * **Automatically create data streams and indices**
 *
 * If the request's target doesn't exist and matches an index template with a `data_stream` definition, the index operation automatically creates the data stream.
 *
 * If the target doesn't exist and doesn't match a data stream template, the operation automatically creates the index and applies any matching index templates.
 *
 * NOTE: Elasticsearch includes several built-in index templates. To avoid naming collisions with these templates, refer to index pattern documentation.
 *
 * If no mapping exists, the index operation creates a dynamic mapping.
 * By default, new fields and objects are automatically added to the mapping if needed.
 *
 * Automatic index creation is controlled by the `action.auto_create_index` setting.
 * If it is `true`, any index can be created automatically.
 * You can modify this setting to explicitly allow or block automatic creation of indices that match specified patterns or set it to `false` to turn off automatic index creation entirely.
 * Specify a comma-separated list of patterns you want to allow or prefix each pattern with `+` or `-` to indicate whether it should be allowed or blocked.
 * When a list is specified, the default behaviour is to disallow.
 *
 * NOTE: The `action.auto_create_index` setting affects the automatic creation of indices only.
 * It does not affect the creation of data streams.
 *
 * **Routing**
 *
 * By default, shard placement—or routing—is controlled by using a hash of the document's ID value.
 * For more explicit control, the value fed into the hash function used by the router can be directly specified on a per-operation basis using the `routing` parameter.
 *
 * When setting up explicit mapping, you can also use the `_routing` field to direct the index operation to extract the routing value from the document itself.
 * This does come at the (very minimal) cost of an additional document parsing pass.
 * If the `_routing` mapping is defined and set to be required, the index operation will fail if no routing value is provided or extracted.
 *
 * NOTE: Data streams do not support custom routing unless they were created with the `allow_custom_routing` setting enabled in the template.
 *
 * **Distributed**
 *
 * The index operation is directed to the primary shard based on its route and performed on the actual node containing this shard.
 * After the primary shard completes the operation, if needed, the update is distributed to applicable replicas.
 *
 * **Active shards**
 *
 * To improve the resiliency of writes to the system, indexing operations can be configured to wait for a certain number of active shard copies before proceeding with the operation.
 * If the requisite number of active shard copies are not available, then the write operation must wait and retry, until either the requisite shard copies have started or a timeout occurs.
 * By default, write operations only wait for the primary shards to be active before proceeding (that is to say `wait_for_active_shards` is `1`).
 * This default can be overridden in the index settings dynamically by setting `index.write.wait_for_active_shards`.
 * To alter this behavior per operation, use the `wait_for_active_shards request` parameter.
 *
 * Valid values are all or any positive integer up to the total number of configured copies per shard in the index (which is `number_of_replicas`+1).
 * Specifying a negative value or a number greater than the number of shard copies will throw an error.
 *
 * For example, suppose you have a cluster of three nodes, A, B, and C and you create an index index with the number of replicas set to 3 (resulting in 4 shard copies, one more copy than there are nodes).
 * If you attempt an indexing operation, by default the operation will only ensure the primary copy of each shard is available before proceeding.
 * This means that even if B and C went down and A hosted the primary shard copies, the indexing operation would still proceed with only one copy of the data.
 * If `wait_for_active_shards` is set on the request to `3` (and all three nodes are up), the indexing operation will require 3 active shard copies before proceeding.
 * This requirement should be met because there are 3 active nodes in the cluster, each one holding a copy of the shard.
 * However, if you set `wait_for_active_shards` to `all` (or to `4`, which is the same in this situation), the indexing operation will not proceed as you do not have all 4 copies of each shard active in the index.
 * The operation will timeout unless a new node is brought up in the cluster to host the fourth copy of the shard.
 *
 * It is important to note that this setting greatly reduces the chances of the write operation not writing to the requisite number of shard copies, but it does not completely eliminate the possibility, because this check occurs before the write operation starts.
 * After the write operation is underway, it is still possible for replication to fail on any number of shard copies but still succeed on the primary.
 * The `_shards` section of the API response reveals the number of shard copies on which replication succeeded and failed.
 */
export const CreateRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('A unique identifier for the document. To automatically generate a document ID, use the `POST /<target>/_doc/` request format.').meta({ found_in: 'path' }),
  index: IndexName.describe('The name of the data stream or index to target. If the target doesn\'t exist and matches the name or wildcard (`*`) pattern of an index template with a `data_stream` definition, this request creates the data stream. If the target doesn\'t exist and doesn’t match a data stream template, this request creates the index.').meta({ found_in: 'path' }),
  include_source_on_error: z.boolean().describe('True or false if to include the document source in the error message in case of parsing errors.').optional().meta({ found_in: 'query' }),
  pipeline: z.string().describe('The ID of the pipeline to use to preprocess incoming documents. If the index has a default ingest pipeline specified, setting the value to `_none` turns off the default ingest pipeline for this request. If a final pipeline is configured, it will always run regardless of the value of this parameter.').optional().meta({ found_in: 'query' }),
  refresh: Refresh.describe('If `true`, Elasticsearch refreshes the affected shards to make this operation visible to search. If `wait_for`, it waits for a refresh to make this operation visible to search. If `false`, it does nothing with refreshes.').optional().meta({ found_in: 'query' }),
  require_alias: z.boolean().describe('If `true`, the destination must be an index alias.').optional().meta({ found_in: 'query' }),
  require_data_stream: z.boolean().describe('If `true`, the request\'s actions must target a data stream (existing or to be created).').optional().meta({ found_in: 'query' }),
  routing: Routing.describe('A custom value that is used to route operations to a specific shard.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period the request waits for the following operations: automatic index creation, dynamic mapping updates, waiting for active shards. Elasticsearch waits for at least the specified timeout period before failing. The actual wait time could be longer, particularly when multiple waits occur. This parameter is useful for situations where the primary shard assigned to perform the operation might not be available when the operation runs. Some reasons for this might be that the primary shard is currently recovering from a gateway or undergoing relocation. By default, the operation will wait on the primary shard to become available for at least 1 minute before failing and responding with an error. The actual wait time could be longer, particularly when multiple waits occur.').optional().meta({ found_in: 'query' }),
  version: VersionNumber.describe('The explicit version number for concurrency control. It must be a non-negative long number.').optional().meta({ found_in: 'query' }),
  version_type: VersionType.describe('The version type.').optional().meta({ found_in: 'query' }),
  wait_for_active_shards: WaitForActiveShards.describe('The number of shard copies that must be active before proceeding with the operation. You can set it to `all` or any positive integer up to the total number of shards in the index (`number_of_replicas+1`). The default value of `1` means it waits for each primary shard to be active.').optional().meta({ found_in: 'query' }),
  document: z.any().meta({ found_in: 'body' })
}).meta({ id: 'CreateRequest' })
export type CreateRequest = z.infer<typeof CreateRequest>

export const Result = z.enum(['created', 'updated', 'deleted', 'not_found', 'noop']).meta({ id: 'Result' })
export type Result = z.infer<typeof Result>

export const SequenceNumber = long.meta({ id: 'SequenceNumber' })
export type SequenceNumber = z.infer<typeof SequenceNumber>

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

export const WriteResponseBase = z.object({
  _id: Id.describe('The unique identifier for the added document.'),
  _index: IndexName.describe('The name of the index the document was added to.'),
  _primary_term: long.describe('The primary term assigned to the document for the indexing operation.').optional(),
  result: Result.describe('The result of the indexing operation: `created` or `updated`.'),
  _seq_no: SequenceNumber.describe('The sequence number assigned to the document for the indexing operation. Sequence numbers are used to ensure an older version of a document doesn\'t overwrite a newer version.').optional(),
  _shards: ShardStatistics.describe('Information about the replication process of the operation.'),
  _version: VersionNumber.describe('The document version, which is incremented each time the document is updated.'),
  failure_store: BulkFailureStoreStatus.describe('The role of the failure store in this document response').optional(),
  forced_refresh: z.boolean().optional()
}).meta({ id: 'WriteResponseBase' })
export type WriteResponseBase = z.infer<typeof WriteResponseBase>

export const CreateResponse = WriteResponseBase.meta({ id: 'CreateResponse' })
export type CreateResponse = z.infer<typeof CreateResponse>
