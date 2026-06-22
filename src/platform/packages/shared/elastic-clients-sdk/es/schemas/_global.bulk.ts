/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Script, SearchSourceConfig, SearchSourceConfigParam } from './_global.search'
import { Duration, ErrorCause, Fields, Id, IndexName, InlineGet, Refresh, RequestBase, Result, Routing, SequenceNumber, ShardStatistics, VersionNumber, VersionType, WaitForActiveShards, integer, long } from './_types'

export const BulkOperationBase = z.object({
  _id: Id.describe('The document ID.').optional(),
  _index: IndexName.describe('The name of the index or index alias to perform the action on.').optional(),
  routing: z.string().describe('A custom value used to route operations to a specific shard, or multiple comma separated values.').optional(),
  if_primary_term: long.optional(),
  if_seq_no: SequenceNumber.optional(),
  version: VersionNumber.optional(),
  version_type: VersionType.optional()
}).meta({ id: 'BulkOperationBase' })
export type BulkOperationBase = z.infer<typeof BulkOperationBase>

export const BulkWriteOperation = z.object({
  ...BulkOperationBase.shape,
  dynamic_templates: z.record(z.string(), z.string()).describe('A map from the full name of fields to the name of dynamic templates. It defaults to an empty map. If a name matches a dynamic template, that template will be applied regardless of other match predicates defined in the template. If a field is already defined in the mapping, then this parameter won\'t be used.').optional(),
  pipeline: z.string().describe('The ID of the pipeline to use to preprocess incoming documents. If the index has a default ingest pipeline specified, setting the value to `_none` turns off the default ingest pipeline for this request. If a final pipeline is configured, it will always run regardless of the value of this parameter.').optional(),
  require_alias: z.boolean().describe('If `true`, the request\'s actions must target an index alias.').optional()
}).meta({ id: 'BulkWriteOperation' })
export type BulkWriteOperation = z.infer<typeof BulkWriteOperation>

export const BulkCreateOperation = z.object({
  ...BulkWriteOperation.shape
}).meta({ id: 'BulkCreateOperation' })
export type BulkCreateOperation = z.infer<typeof BulkCreateOperation>

export const BulkDeleteOperation = z.object({
  ...BulkOperationBase.shape
}).meta({ id: 'BulkDeleteOperation' })
export type BulkDeleteOperation = z.infer<typeof BulkDeleteOperation>

export const BulkFailureStoreStatus = z.enum(['not_applicable_or_unknown', 'used', 'not_enabled', 'failed']).meta({ id: 'BulkFailureStoreStatus' })
export type BulkFailureStoreStatus = z.infer<typeof BulkFailureStoreStatus>

export const BulkIndexOperation = z.object({
  ...BulkWriteOperation.shape
}).meta({ id: 'BulkIndexOperation' })
export type BulkIndexOperation = z.infer<typeof BulkIndexOperation>

export const BulkUpdateOperation = z.object({
  ...BulkOperationBase.shape,
  require_alias: z.boolean().describe('If `true`, the request\'s actions must target an index alias.').optional(),
  retry_on_conflict: integer.describe('The number of times an update should be retried in the case of a version conflict.').optional()
}).meta({ id: 'BulkUpdateOperation' })
export type BulkUpdateOperation = z.infer<typeof BulkUpdateOperation>

const BulkOperationContainerExclusiveProps = z.union([z.object({ index: BulkIndexOperation }), z.object({ create: BulkCreateOperation }), z.object({ update: BulkUpdateOperation }), z.object({ delete: BulkDeleteOperation })])

export const BulkOperationContainer = BulkOperationContainerExclusiveProps.meta({ id: 'BulkOperationContainer' })
export type BulkOperationContainer = z.infer<typeof BulkOperationContainer>

export const BulkOperationType = z.enum(['index', 'create', 'update', 'delete']).meta({ id: 'BulkOperationType' })
export type BulkOperationType = z.infer<typeof BulkOperationType>

export const BulkUpdateAction = z.object({
  detect_noop: z.boolean().describe('If true, the `result` in the response is set to \'noop\' when no changes to the document occur.').optional(),
  doc: z.any().describe('A partial update to an existing document.').optional(),
  doc_as_upsert: z.boolean().describe('Set to `true` to use the contents of `doc` as the value of `upsert`.').optional(),
  script: z.lazy(() => Script).describe('The script to run to update the document.').optional(),
  scripted_upsert: z.boolean().describe('Set to `true` to run the script whether or not the document exists.').optional(),
  _source: z.lazy(() => SearchSourceConfig).describe('If `false`, source retrieval is turned off. You can also specify a comma-separated list of the fields you want to retrieve.').optional(),
  upsert: z.any().describe('If the document does not already exist, the contents of `upsert` are inserted as a new document. If the document exists, the `script` is run.').optional()
}).meta({ id: 'BulkUpdateAction' })
export type BulkUpdateAction = z.infer<typeof BulkUpdateAction>

/**
 * Bulk index or delete documents.
 *
 * Perform multiple `index`, `create`, `delete`, and `update` actions in a single request.
 * This reduces overhead and can greatly increase indexing speed.
 *
 * If the Elasticsearch security features are enabled, you must have the following index privileges for the target data stream, index, or index alias:
 *
 * * To use the `create` action, you must have the `create_doc`, `create`, `index`, or `write` index privilege. Data streams support only the `create` action.
 * * To use the `index` action, you must have the `create`, `index`, or `write` index privilege.
 * * To use the `delete` action, you must have the `delete` or `write` index privilege.
 * * To use the `update` action, you must have the `index` or `write` index privilege.
 * * To automatically create a data stream or index with a bulk API request, you must have the `auto_configure`, `create_index`, or `manage` index privilege.
 * * To make the result of a bulk operation visible to search using the `refresh` parameter, you must have the `maintenance` or `manage` index privilege.
 *
 * Automatic data stream creation requires a matching index template with data stream enabled.
 *
 * The actions are specified in the request body using a newline delimited JSON (NDJSON) structure:
 *
 * ```
 * action_and_meta_data\n
 * optional_source\n
 * action_and_meta_data\n
 * optional_source\n
 * ....
 * action_and_meta_data\n
 * optional_source\n
 * ```
 *
 * The `index` and `create` actions expect a source on the next line and have the same semantics as the `op_type` parameter in the standard index API.
 * A `create` action fails if a document with the same ID already exists in the target
 * An `index` action adds or replaces a document as necessary.
 *
 * NOTE: Data streams support only the `create` action.
 * To update or delete a document in a data stream, you must target the backing index containing the document.
 *
 * An `update` action expects that the partial doc, upsert, and script and its options are specified on the next line.
 *
 * A `delete` action does not expect a source on the next line and has the same semantics as the standard delete API.
 *
 * NOTE: The final line of data must end with a newline character (`\n`).
 * Each newline character may be preceded by a carriage return (`\r`).
 * When sending NDJSON data to the `_bulk` endpoint, use a `Content-Type` header of `application/json` or `application/x-ndjson`.
 * Because this format uses literal newline characters (`\n`) as delimiters, make sure that the JSON actions and sources are not pretty printed.
 *
 * If you provide a target in the request path, it is used for any actions that don't explicitly specify an `_index` argument.
 *
 * A note on the format: the idea here is to make processing as fast as possible.
 * As some of the actions are redirected to other shards on other nodes, only `action_meta_data` is parsed on the receiving node side.
 *
 * Client libraries using this protocol should try and strive to do something similar on the client side, and reduce buffering as much as possible.
 *
 * There is no "correct" number of actions to perform in a single bulk request.
 * Experiment with different settings to find the optimal size for your particular workload.
 * Note that Elasticsearch limits the maximum size of a HTTP request to 100mb by default so clients must ensure that no request exceeds this size.
 * It is not possible to index a single document that exceeds the size limit, so you must pre-process any such documents into smaller pieces before sending them to Elasticsearch.
 * For instance, split documents into pages or chapters before indexing them, or store raw binary data in a system outside Elasticsearch and replace the raw data with a link to the external system in the documents that you send to Elasticsearch.
 *
 * **Client suppport for bulk requests**
 *
 * Some of the officially supported clients provide helpers to assist with bulk requests and reindexing:
 *
 * * Go: Check out `esutil.BulkIndexer`
 * * Perl: Check out `Search::Elasticsearch::Client::5_0::Bulk` and `Search::Elasticsearch::Client::5_0::Scroll`
 * * Python: Check out `elasticsearch.helpers.*`
 * * JavaScript: Check out `client.helpers.*`
 * * Java: Check out `co.elastic.clients.elasticsearch._helpers.bulk.BulkIngester`
 * * .NET: Check out `BulkAllObservable`
 * * PHP: Check out bulk indexing.
 * * Ruby: Check out `Elasticsearch::Helpers::BulkHelper`
 *
 * **Submitting bulk requests with cURL**
 *
 * If you're providing text file input to `curl`, you must use the `--data-binary` flag instead of plain `-d`.
 * The latter doesn't preserve newlines. For example:
 *
 * ```
 * $ cat requests
 * { "index" : { "_index" : "test", "_id" : "1" } }
 * { "field1" : "value1" }
 * $ curl -s -H "Content-Type: application/x-ndjson" -XPOST localhost:9200/_bulk --data-binary "@requests"; echo
 * {"took":7, "errors": false, "items":[{"index":{"_index":"test","_id":"1","_version":1,"result":"created","forced_refresh":false}}]}
 * ```
 *
 * **Optimistic concurrency control**
 *
 * Each `index` and `delete` action within a bulk API call may include the `if_seq_no` and `if_primary_term` parameters in their respective action and meta data lines.
 * The `if_seq_no` and `if_primary_term` parameters control how operations are run, based on the last modification to existing documents. See Optimistic concurrency control for more details.
 *
 * **Versioning**
 *
 * Each bulk item can include the version value using the `version` field.
 * It automatically follows the behavior of the index or delete operation based on the `_version` mapping.
 * It also support the `version_type`.
 *
 * **Routing**
 *
 * Each bulk item can include the routing value using the `routing` field.
 * It automatically follows the behavior of the index or delete operation based on the `_routing` mapping.
 *
 * NOTE: Data streams do not support custom routing unless they were created with the `allow_custom_routing` setting enabled in the template.
 *
 * **Wait for active shards**
 *
 * When making bulk calls, you can set the `wait_for_active_shards` parameter to require a minimum number of shard copies to be active before starting to process the bulk request.
 *
 * **Refresh**
 *
 * Control when the changes made by this request are visible to search.
 *
 * NOTE: Only the shards that receive the bulk request will be affected by refresh.
 * Imagine a `_bulk?refresh=wait_for` request with three documents in it that happen to be routed to different shards in an index with five shards.
 * The request will only wait for those three shards to refresh.
 * The other two shards that make up the index do not participate in the `_bulk` request at all.
 *
 * You might want to disable the refresh interval temporarily to improve indexing throughput for large bulk requests.
 * Refer to the linked documentation for step-by-step instructions using the index settings API.
 */
export const BulkRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('The name of the data stream, index, or index alias to perform bulk actions on.').optional().meta({ found_in: 'path' }),
  include_source_on_error: z.boolean().describe('True or false if to include the document source in the error message in case of parsing errors.').optional().meta({ found_in: 'query' }),
  list_executed_pipelines: z.boolean().describe('If `true`, the response will include the ingest pipelines that were run for each index or create.').optional().meta({ found_in: 'query' }),
  pipeline: z.string().describe('The pipeline identifier to use to preprocess incoming documents. If the index has a default ingest pipeline specified, setting the value to `_none` turns off the default ingest pipeline for this request. If a final pipeline is configured, it will always run regardless of the value of this parameter.').optional().meta({ found_in: 'query' }),
  refresh: Refresh.describe('If `true`, Elasticsearch refreshes the affected shards to make this operation visible to search. If `wait_for`, wait for a refresh to make this operation visible to search. If `false`, do nothing with refreshes. Valid values: `true`, `false`, `wait_for`.').optional().meta({ found_in: 'query' }),
  routing: Routing.describe('A custom value that is used to route operations to a specific shard.').optional().meta({ found_in: 'query' }),
  _source: z.lazy(() => SearchSourceConfigParam).describe('Indicates whether to return the `_source` field (`true` or `false`) or contains a list of fields to return.').optional().meta({ found_in: 'query' }),
  _source_excludes: Fields.describe('A comma-separated list of source fields to exclude from the response. You can also use this parameter to exclude fields from the subset specified in `_source_includes` query parameter. If the `_source` parameter is `false`, this parameter is ignored.').optional().meta({ found_in: 'query' }),
  _source_includes: Fields.describe('A comma-separated list of source fields to include in the response. If this parameter is specified, only these source fields are returned. You can exclude fields from this subset using the `_source_excludes` query parameter. If the `_source` parameter is `false`, this parameter is ignored.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period each action waits for the following operations: automatic index creation, dynamic mapping updates, and waiting for active shards. The default is `1m` (one minute), which guarantees Elasticsearch waits for at least the timeout before failing. The actual wait time could be longer, particularly when multiple waits occur.').optional().meta({ found_in: 'query' }),
  wait_for_active_shards: WaitForActiveShards.describe('The number of shard copies that must be active before proceeding with the operation. Set to `all` or any positive integer up to the total number of shards in the index (`number_of_replicas+1`). The default is `1`, which waits for each primary shard to be active.').optional().meta({ found_in: 'query' }),
  require_alias: z.boolean().describe('If `true`, the request\'s actions must target an index alias.').optional().meta({ found_in: 'query' }),
  require_data_stream: z.boolean().describe('If `true`, the request\'s actions must target a data stream (existing or to be created).').optional().meta({ found_in: 'query' }),
  operations: z.array(z.union([BulkOperationContainer, BulkUpdateAction, z.any()])).optional().meta({ found_in: 'body' })
}).meta({ id: 'BulkRequest' })
export type BulkRequest = z.infer<typeof BulkRequest>

export const BulkResponseItem = z.object({
  _id: z.union([z.string(), z.null()]).describe('The document ID associated with the operation.').optional(),
  _index: z.string().describe('The name of the index associated with the operation. If the operation targeted a data stream, this is the backing index into which the document was written.'),
  status: integer.describe('The HTTP status code returned for the operation.'),
  failure_store: BulkFailureStoreStatus.optional(),
  error: z.lazy(() => ErrorCause).describe('Additional information about the failed operation. The property is returned only for failed operations.').optional(),
  _primary_term: long.describe('The primary term assigned to the document for the operation. This property is returned only for successful operations.').optional(),
  result: z.string().describe('The result of the operation. Possible values are `created`, `updated`, `deleted`, `noop`, and `not_found`.').optional(),
  _seq_no: SequenceNumber.describe('The sequence number assigned to the document for the operation. Sequence numbers are used to ensure an older version of a document doesn\'t overwrite a newer version.').optional(),
  _shards: ShardStatistics.describe('Shard information for the operation.').optional(),
  _version: VersionNumber.describe('The document version associated with the operation. The document version is incremented each time the document is updated. This property is returned only for successful actions.').optional(),
  forced_refresh: z.boolean().optional(),
  get: InlineGet.optional()
}).meta({ id: 'BulkResponseItem' })
export type BulkResponseItem = z.infer<typeof BulkResponseItem>

export const BulkResponse = z.object({
  errors: z.boolean().describe('If `true`, one or more of the operations in the bulk request did not complete successfully.'),
  items: z.array(z.record(BulkOperationType, BulkResponseItem)).describe('The result of each operation in the bulk request, in the order they were submitted.'),
  took: long.describe('The length of time, in milliseconds, it took to process the bulk request.'),
  ingest_took: long.optional()
}).meta({ id: 'BulkResponse' })
export type BulkResponse = z.infer<typeof BulkResponse>

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
