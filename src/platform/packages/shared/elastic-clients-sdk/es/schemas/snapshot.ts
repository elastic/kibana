/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { AcknowledgedResponseBase, ByteSize, DateTime, Duration, DurationValue, EpochTime, ErrorCause, ExpandWildcards, Id, IndexName, Indices, Metadata, Name, Names, RequestBase, ShardStatistics, SortOrder, Uuid, VersionNumber, VersionString, double, integer, long } from './_types'
import { IndicesIndexSettings } from './indices'

export const SnapshotRepositoryBase = z.object({
  uuid: Uuid.optional()
}).meta({ id: 'SnapshotRepositoryBase' })
export type SnapshotRepositoryBase = z.infer<typeof SnapshotRepositoryBase>

export const SnapshotRepositorySettingsBase = z.object({
  chunk_size: ByteSize.describe('Big files can be broken down into multiple smaller blobs in the blob store during snapshotting. It is not recommended to change this value from its default unless there is an explicit reason for limiting the size of blobs in the repository. Setting a value lower than the default can result in an increased number of API calls to the blob store during snapshot create and restore operations compared to using the default value and thus make both operations slower and more costly. Specify the chunk size as a byte unit, for example: `10MB`, `5KB`, 500B. The default varies by repository type.').optional(),
  compress: z.boolean().describe('When set to `true`, metadata files are stored in compressed format. This setting doesn\'t affect index files that are already compressed by default.').optional(),
  max_restore_bytes_per_sec: ByteSize.describe('The maximum snapshot restore rate per node. It defaults to unlimited. Note that restores are also throttled through recovery settings.').optional(),
  max_snapshot_bytes_per_sec: ByteSize.describe('The maximum snapshot creation rate per node. It defaults to 40mb per second. Note that if the recovery settings for managed services are set, then it defaults to unlimited, and the rate is additionally throttled through recovery settings.').optional()
}).meta({ id: 'SnapshotRepositorySettingsBase' })
export type SnapshotRepositorySettingsBase = z.infer<typeof SnapshotRepositorySettingsBase>

export const SnapshotAzureRepositorySettings = z.object({
  ...SnapshotRepositorySettingsBase.shape,
  base_path: z.string().describe('The path to the repository data within the container. It defaults to the root directory. NOTE: Don\'t set `base_path` when configuring a snapshot repository for Elastic Cloud Enterprise. Elastic Cloud Enterprise automatically generates the `base_path` for each deployment so that multiple deployments can share the same bucket.').optional(),
  client: z.string().describe('The name of the Azure repository client to use.').optional(),
  container: z.string().describe('The Azure container.').optional(),
  delete_objects_max_size: integer.describe('The maxmimum batch size, between 1 and 256, used for `BlobBatch` requests. Defaults to 256 which is the maximum number supported by the Azure blob batch API.').optional(),
  location_mode: z.string().describe('Either `primary_only` or `secondary_only`. Note that if you set it to `secondary_only`, it will force `readonly` to `true`.').optional(),
  max_concurrent_batch_deletes: integer.describe('The maximum number of concurrent batch delete requests that will be submitted for any individual bulk delete with `BlobBatch`. Note that the effective number of concurrent deletes is further limited by the Azure client connection and event loop thread limits. Defaults to 10, minimum is 1, maximum is 100.').optional(),
  readonly: z.boolean().describe('If `true`, the repository is read-only. The cluster can retrieve and restore snapshots from the repository but not write to the repository or create snapshots in it. Only a cluster with write access can create snapshots in the repository. All other clusters connected to the repository should have the `readonly` parameter set to `true`. If `false`, the cluster can write to the repository and create snapshots in it. IMPORTANT: If you register the same snapshot repository with multiple clusters, only one cluster should have write access to the repository. Having multiple clusters write to the repository at the same time risks corrupting the contents of the repository.').optional()
}).meta({ id: 'SnapshotAzureRepositorySettings' })
export type SnapshotAzureRepositorySettings = z.infer<typeof SnapshotAzureRepositorySettings>

export const SnapshotAzureRepository = z.object({
  ...SnapshotRepositoryBase.shape,
  type: z.literal('azure').describe('The Azure repository type.'),
  settings: SnapshotAzureRepositorySettings.describe('The repository settings.').optional()
}).meta({ id: 'SnapshotAzureRepository' })
export type SnapshotAzureRepository = z.infer<typeof SnapshotAzureRepository>

export const SnapshotFileCountSnapshotStats = z.object({
  file_count: integer,
  size_in_bytes: long
}).meta({ id: 'SnapshotFileCountSnapshotStats' })
export type SnapshotFileCountSnapshotStats = z.infer<typeof SnapshotFileCountSnapshotStats>

export const SnapshotGcsRepositorySettings = z.object({
  ...SnapshotRepositorySettingsBase.shape,
  bucket: z.string().describe('The name of the bucket to be used for snapshots.'),
  application_name: z.string().describe('The name used by the client when it uses the Google Cloud Storage service.').optional(),
  base_path: z.string().describe('The path to the repository data within the bucket. It defaults to the root of the bucket. NOTE: Don\'t set `base_path` when configuring a snapshot repository for Elastic Cloud Enterprise. Elastic Cloud Enterprise automatically generates the `base_path` for each deployment so that multiple deployments can share the same bucket.').optional(),
  client: z.string().describe('The name of the client to use to connect to Google Cloud Storage.').optional(),
  readonly: z.boolean().describe('If `true`, the repository is read-only. The cluster can retrieve and restore snapshots from the repository but not write to the repository or create snapshots in it. Only a cluster with write access can create snapshots in the repository. All other clusters connected to the repository should have the `readonly` parameter set to `true`. If `false`, the cluster can write to the repository and create snapshots in it. IMPORTANT: If you register the same snapshot repository with multiple clusters, only one cluster should have write access to the repository. Having multiple clusters write to the repository at the same time risks corrupting the contents of the repository.').optional()
}).meta({ id: 'SnapshotGcsRepositorySettings' })
export type SnapshotGcsRepositorySettings = z.infer<typeof SnapshotGcsRepositorySettings>

export const SnapshotGcsRepository = z.object({
  ...SnapshotRepositoryBase.shape,
  type: z.literal('gcs').describe('The Google Cloud Storage repository type.'),
  settings: SnapshotGcsRepositorySettings.describe('The repository settings.')
}).meta({ id: 'SnapshotGcsRepository' })
export type SnapshotGcsRepository = z.infer<typeof SnapshotGcsRepository>

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

export const SnapshotReadOnlyUrlRepositorySettings = z.object({
  ...SnapshotRepositorySettingsBase.shape,
  http_max_retries: integer.describe('The maximum number of retries for HTTP and HTTPS URLs.').optional(),
  http_socket_timeout: Duration.describe('The maximum wait time for data transfers over a connection.').optional(),
  max_number_of_snapshots: integer.describe('The maximum number of snapshots the repository can contain. The default is `Integer.MAX_VALUE`, which is 2^31-1 or `2147483647`.').optional(),
  url: z.string().describe('The URL location of the root of the shared filesystem repository. The following protocols are supported: * `file` * `ftp` * `http` * `https` * `jar` URLs using the HTTP, HTTPS, or FTP protocols must be explicitly allowed with the `repositories.url.allowed_urls` cluster setting. This setting supports wildcards in the place of a host, path, query, or fragment in the URL. URLs using the file protocol must point to the location of a shared filesystem accessible to all master and data nodes in the cluster. This location must be registered in the `path.repo` setting. You don\'t need to register URLs using the FTP, HTTP, HTTPS, or JAR protocols in the `path.repo` setting.')
}).meta({ id: 'SnapshotReadOnlyUrlRepositorySettings' })
export type SnapshotReadOnlyUrlRepositorySettings = z.infer<typeof SnapshotReadOnlyUrlRepositorySettings>

export const SnapshotReadOnlyUrlRepository = z.object({
  ...SnapshotRepositoryBase.shape,
  type: z.literal('url').describe('The read-only URL repository type.'),
  settings: SnapshotReadOnlyUrlRepositorySettings.describe('The repository settings.')
}).meta({ id: 'SnapshotReadOnlyUrlRepository' })
export type SnapshotReadOnlyUrlRepository = z.infer<typeof SnapshotReadOnlyUrlRepository>

export const SnapshotS3RepositorySettings = z.object({
  ...SnapshotRepositorySettingsBase.shape,
  bucket: z.string().describe('The name of the S3 bucket to use for snapshots. The bucket name must adhere to Amazon\'s S3 bucket naming rules.'),
  base_path: z.string().describe('The path to the repository data within its bucket. It defaults to an empty string, meaning that the repository is at the root of the bucket. The value of this setting should not start or end with a forward slash (`/`). NOTE: Don\'t set base_path when configuring a snapshot repository for Elastic Cloud Enterprise. Elastic Cloud Enterprise automatically generates the `base_path` for each deployment so that multiple deployments may share the same bucket.').optional(),
  buffer_size: ByteSize.describe('The minimum threshold below which the chunk is uploaded using a single request. Beyond this threshold, the S3 repository will use the AWS Multipart Upload API to split the chunk into several parts, each of `buffer_size` length, and to upload each part in its own request. Note that setting a buffer size lower than 5mb is not allowed since it will prevent the use of the Multipart API and may result in upload errors. It is also not possible to set a buffer size greater than 5gb as it is the maximum upload size allowed by S3. Defaults to `100mb` or 5% of JVM heap, whichever is smaller.').optional(),
  canned_acl: z.string().describe('The S3 repository supports all S3 canned ACLs: `private`, `public-read`, `public-read-write`, `authenticated-read`, `log-delivery-write`, `bucket-owner-read`, `bucket-owner-full-control`. You could specify a canned ACL using the `canned_acl` setting. When the S3 repository creates buckets and objects, it adds the canned ACL into the buckets and objects.').optional(),
  client: z.string().describe('The name of the S3 client to use to connect to S3.').optional(),
  delete_objects_max_size: integer.describe('The maxmimum batch size, between 1 and 1000, used for `DeleteObjects` requests. Defaults to 1000 which is the maximum number supported by the  AWS DeleteObjects API.').optional(),
  get_register_retry_delay: Duration.describe('The time to wait before trying again if an attempt to read a linearizable register fails.').optional(),
  max_multipart_parts: integer.describe('The maximum number of parts that Elasticsearch will write during a multipart upload of a single object. Files which are larger than `buffer_size × max_multipart_parts` will be chunked into several smaller objects. Elasticsearch may also split a file across multiple objects to satisfy other constraints such as the `chunk_size` limit. Defaults to `10000` which is the maximum number of parts in a multipart upload in AWS S3.').optional(),
  max_multipart_upload_cleanup_size: integer.describe('The maximum number of possibly-dangling multipart uploads to clean up in each batch of snapshot deletions. Defaults to 1000 which is the maximum number supported by the AWS ListMultipartUploads API. If set to `0`, Elasticsearch will not attempt to clean up dangling multipart uploads.').optional(),
  readonly: z.boolean().describe('If true, the repository is read-only. The cluster can retrieve and restore snapshots from the repository but not write to the repository or create snapshots in it. Only a cluster with write access can create snapshots in the repository. All other clusters connected to the repository should have the `readonly` parameter set to `true`. If `false`, the cluster can write to the repository and create snapshots in it. IMPORTANT: If you register the same snapshot repository with multiple clusters, only one cluster should have write access to the repository. Having multiple clusters write to the repository at the same time risks corrupting the contents of the repository.').optional(),
  server_side_encryption: z.boolean().describe('When set to `true`, files are encrypted on server side using an AES256 algorithm.').optional(),
  storage_class: z.string().describe('The S3 storage class for objects written to the repository. Values may be `standard`, `reduced_redundancy`, `standard_ia`, `onezone_ia`, and `intelligent_tiering`.').optional(),
  'throttled_delete_retry.delay_increment': Duration.describe('The delay before the first retry and the amount the delay is incremented by on each subsequent retry. The default is 50ms and the minimum is 0ms.').optional(),
  'throttled_delete_retry.maximum_delay': Duration.describe('The upper bound on how long the delays between retries will grow to. The default is 5s and the minimum is 0ms.').optional(),
  'throttled_delete_retry.maximum_number_of_retries': integer.describe('The number times to retry a throttled snapshot deletion. The default is 10 and the minimum value is 0 which will disable retries altogether. Note that if retries are enabled in the Azure client, each of these retries comprises that many client-level retries.').optional()
}).meta({ id: 'SnapshotS3RepositorySettings' })
export type SnapshotS3RepositorySettings = z.infer<typeof SnapshotS3RepositorySettings>

export const SnapshotS3Repository = z.object({
  ...SnapshotRepositoryBase.shape,
  type: z.literal('s3').describe('The S3 repository type.'),
  settings: SnapshotS3RepositorySettings.describe('The repository settings. NOTE: In addition to the specified settings, you can also use all non-secure client settings in the repository settings. In this case, the client settings found in the repository settings will be merged with those of the named client used by the repository. Conflicts between client and repository settings are resolved by the repository settings taking precedence over client settings.')
}).meta({ id: 'SnapshotS3Repository' })
export type SnapshotS3Repository = z.infer<typeof SnapshotS3Repository>

export const SnapshotSharedFileSystemRepositorySettings = z.object({
  ...SnapshotRepositorySettingsBase.shape,
  location: z.string().describe('The location of the shared filesystem used to store and retrieve snapshots. This location must be registered in the `path.repo` setting on all master and data nodes in the cluster. Unlike `path.repo`, this setting supports only a single file path.'),
  max_number_of_snapshots: integer.describe('The maximum number of snapshots the repository can contain. The default is `Integer.MAX_VALUE`, which is 2^31-1 or `2147483647`.').optional(),
  readonly: z.boolean().describe('If `true`, the repository is read-only. The cluster can retrieve and restore snapshots from the repository but not write to the repository or create snapshots in it. Only a cluster with write access can create snapshots in the repository. All other clusters connected to the repository should have the `readonly` parameter set to `true`. If `false`, the cluster can write to the repository and create snapshots in it. IMPORTANT: If you register the same snapshot repository with multiple clusters, only one cluster should have write access to the repository. Having multiple clusters write to the repository at the same time risks corrupting the contents of the repository.').optional()
}).meta({ id: 'SnapshotSharedFileSystemRepositorySettings' })
export type SnapshotSharedFileSystemRepositorySettings = z.infer<typeof SnapshotSharedFileSystemRepositorySettings>

export const SnapshotSharedFileSystemRepository = z.object({
  ...SnapshotRepositoryBase.shape,
  type: z.literal('fs').describe('The shared file system repository type.'),
  settings: SnapshotSharedFileSystemRepositorySettings.describe('The repository settings.')
}).meta({ id: 'SnapshotSharedFileSystemRepository' })
export type SnapshotSharedFileSystemRepository = z.infer<typeof SnapshotSharedFileSystemRepository>

export const SnapshotSourceOnlyRepositorySettings = z.object({
  ...SnapshotRepositorySettingsBase.shape,
  delegate_type: z.string().describe('The delegated repository type. For valid values, refer to the `type` parameter. Source repositories can use `settings` properties for its delegated repository type.').optional(),
  max_number_of_snapshots: integer.describe('The maximum number of snapshots the repository can contain. The default is `Integer.MAX_VALUE`, which is 2^31-1 or `2147483647`.').optional(),
  read_only: z.boolean().describe('If `true`, the repository is read-only. The cluster can retrieve and restore snapshots from the repository but not write to the repository or create snapshots in it. Only a cluster with write access can create snapshots in the repository. All other clusters connected to the repository should have the `readonly` parameter set to `true`. If `false`, the cluster can write to the repository and create snapshots in it. IMPORTANT: If you register the same snapshot repository with multiple clusters, only one cluster should have write access to the repository. Having multiple clusters write to the repository at the same time risks corrupting the contents of the repository.').optional(),
  readonly: z.boolean().describe('If `true`, the repository is read-only. The cluster can retrieve and restore snapshots from the repository but not write to the repository or create snapshots in it. Only a cluster with write access can create snapshots in the repository. All other clusters connected to the repository should have the `readonly` parameter set to `true`. If `false`, the cluster can write to the repository and create snapshots in it. IMPORTANT: If you register the same snapshot repository with multiple clusters, only one cluster should have write access to the repository. Having multiple clusters write to the repository at the same time risks corrupting the contents of the repository.').optional()
}).meta({ id: 'SnapshotSourceOnlyRepositorySettings' })
export type SnapshotSourceOnlyRepositorySettings = z.infer<typeof SnapshotSourceOnlyRepositorySettings>

export const SnapshotSourceOnlyRepository = z.object({
  ...SnapshotRepositoryBase.shape,
  type: z.literal('source').describe('The source-only repository type.'),
  settings: SnapshotSourceOnlyRepositorySettings.describe('The repository settings.')
}).meta({ id: 'SnapshotSourceOnlyRepository' })
export type SnapshotSourceOnlyRepository = z.infer<typeof SnapshotSourceOnlyRepository>

export const SnapshotRepository = z.union([SnapshotAzureRepository, SnapshotGcsRepository, SnapshotS3Repository, SnapshotSharedFileSystemRepository, SnapshotReadOnlyUrlRepository, SnapshotSourceOnlyRepository]).meta({ id: 'SnapshotRepository' })
export type SnapshotRepository = z.infer<typeof SnapshotRepository>

export const SnapshotShardsStats = z.object({
  done: long.describe('The number of shards that initialized, started, and finalized successfully.'),
  failed: long.describe('The number of shards that failed to be included in the snapshot.'),
  finalizing: long.describe('The number of shards that are finalizing but are not done.'),
  initializing: long.describe('The number of shards that are still initializing.'),
  started: long.describe('The number of shards that have started but are not finalized.'),
  total: long.describe('The total number of shards included in the snapshot.')
}).meta({ id: 'SnapshotShardsStats' })
export type SnapshotShardsStats = z.infer<typeof SnapshotShardsStats>

export const SnapshotShardsStatsStage = z.enum(['DONE', 'FAILURE', 'FINALIZE', 'INIT', 'STARTED']).meta({ id: 'SnapshotShardsStatsStage' })
export type SnapshotShardsStatsStage = z.infer<typeof SnapshotShardsStatsStage>

export const SnapshotShardsStatsSummaryItem = z.object({
  file_count: long,
  size_in_bytes: long
}).meta({ id: 'SnapshotShardsStatsSummaryItem' })
export type SnapshotShardsStatsSummaryItem = z.infer<typeof SnapshotShardsStatsSummaryItem>

export const SnapshotShardsStatsSummary = z.object({
  incremental: SnapshotShardsStatsSummaryItem,
  total: SnapshotShardsStatsSummaryItem,
  start_time_in_millis: EpochTime,
  time: Duration.optional(),
  time_in_millis: DurationValue
}).meta({ id: 'SnapshotShardsStatsSummary' })
export type SnapshotShardsStatsSummary = z.infer<typeof SnapshotShardsStatsSummary>

export const SnapshotSnapshotShardsStatus = z.object({
  stage: SnapshotShardsStatsStage,
  stats: SnapshotShardsStatsSummary
}).meta({ id: 'SnapshotSnapshotShardsStatus' })
export type SnapshotSnapshotShardsStatus = z.infer<typeof SnapshotSnapshotShardsStatus>

export const SnapshotSnapshotStats = z.object({
  incremental: SnapshotFileCountSnapshotStats.describe('The number and size of files that still need to be copied as part of the incremental snapshot. For completed snapshots, this property indicates the number and size of files that were not already in the repository and were copied as part of the incremental snapshot.'),
  start_time_in_millis: EpochTime.describe('The time, in milliseconds, when the snapshot creation process started.'),
  time: Duration.optional(),
  time_in_millis: DurationValue.describe('The total time, in milliseconds, that it took for the snapshot process to complete.'),
  total: SnapshotFileCountSnapshotStats.describe('The total number and size of files that are referenced by the snapshot.')
}).meta({ id: 'SnapshotSnapshotStats' })
export type SnapshotSnapshotStats = z.infer<typeof SnapshotSnapshotStats>

export const SnapshotSnapshotIndexStats = z.object({
  shards: z.record(z.string(), SnapshotSnapshotShardsStatus),
  shards_stats: SnapshotShardsStats,
  stats: SnapshotSnapshotStats
}).meta({ id: 'SnapshotSnapshotIndexStats' })
export type SnapshotSnapshotIndexStats = z.infer<typeof SnapshotSnapshotIndexStats>

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

export const SnapshotStatus = z.object({
  include_global_state: z.boolean().describe('Indicates whether the current cluster state is included in the snapshot.'),
  indices: z.record(z.string(), SnapshotSnapshotIndexStats),
  repository: z.string().describe('The name of the repository that includes the snapshot.'),
  shards_stats: SnapshotShardsStats.describe('Statistics for the shards in the snapshot.'),
  snapshot: z.string().describe('The name of the snapshot.'),
  state: z.string().describe('The current snapshot state: * `FAILED`: The snapshot finished with an error and failed to store any data. * `STARTED`: The snapshot is currently running. * `SUCCESS`: The snapshot completed.'),
  stats: SnapshotSnapshotStats.describe('Details about the number (`file_count`) and size (`size_in_bytes`) of files included in the snapshot.'),
  uuid: Uuid.describe('The universally unique identifier (UUID) for the snapshot.')
}).meta({ id: 'SnapshotStatus' })
export type SnapshotStatus = z.infer<typeof SnapshotStatus>

export const SnapshotCleanupRepositoryCleanupRepositoryResults = z.object({
  deleted_blobs: long.describe('The number of binary large objects (blobs) removed from the snapshot repository during cleanup operations. A non-zero value indicates that unreferenced blobs were found and subsequently cleaned up.'),
  deleted_bytes: long.describe('The number of bytes freed by cleanup operations.')
}).meta({ id: 'SnapshotCleanupRepositoryCleanupRepositoryResults' })
export type SnapshotCleanupRepositoryCleanupRepositoryResults = z.infer<typeof SnapshotCleanupRepositoryCleanupRepositoryResults>

/**
 * Clean up the snapshot repository.
 *
 * Trigger the review of the contents of a snapshot repository and delete any stale data not referenced by existing snapshots.
 */
export const SnapshotCleanupRepositoryRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the snapshot repository to clean up.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If the master node is not available before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response from all relevant nodes in the cluster after updating the cluster metadata. If no response is received before the timeout expires, the cluster metadata update still applies but the response will indicate that it was not completely acknowledged. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SnapshotCleanupRepositoryRequest' })
export type SnapshotCleanupRepositoryRequest = z.infer<typeof SnapshotCleanupRepositoryRequest>

export const SnapshotCleanupRepositoryResponse = z.object({
  results: SnapshotCleanupRepositoryCleanupRepositoryResults.describe('Statistics for cleanup operations.')
}).meta({ id: 'SnapshotCleanupRepositoryResponse' })
export type SnapshotCleanupRepositoryResponse = z.infer<typeof SnapshotCleanupRepositoryResponse>

/**
 * Clone a snapshot.
 *
 * Clone part of all of a snapshot into another snapshot in the same repository.
 */
export const SnapshotCloneRequest = z.object({
  ...RequestBase.shape,
  repository: Name.describe('The name of the snapshot repository that both source and target snapshot belong to.').meta({ found_in: 'path' }),
  snapshot: Name.describe('The source snapshot name.').meta({ found_in: 'path' }),
  target_snapshot: Name.describe('The target snapshot name.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for the master node. If the master node is not available before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' }),
  indices: z.string().describe('A comma-separated list of indices to include in the snapshot. Multi-target syntax is supported.').meta({ found_in: 'body' })
}).meta({ id: 'SnapshotCloneRequest' })
export type SnapshotCloneRequest = z.infer<typeof SnapshotCloneRequest>

export const SnapshotCloneResponse = AcknowledgedResponseBase.meta({ id: 'SnapshotCloneResponse' })
export type SnapshotCloneResponse = z.infer<typeof SnapshotCloneResponse>

/**
 * Create a snapshot.
 *
 * Take a snapshot of a cluster or of data streams and indices.
 */
export const SnapshotCreateRequest = z.object({
  ...RequestBase.shape,
  repository: Name.describe('The name of the repository for the snapshot.').meta({ found_in: 'path' }),
  snapshot: Name.describe('The name of the snapshot. It supportes date math. It must be unique in the repository.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('If `true`, the request returns a response when the snapshot is complete. If `false`, the request returns a response when the snapshot initializes.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Determines how wildcard patterns in the `indices` parameter match data streams and indices. It supports comma-separated values such as `open,hidden`.').optional().meta({ found_in: 'body' }),
  feature_states: z.array(z.string()).describe('The feature states to include in the snapshot. Each feature state includes one or more system indices containing related data. You can view a list of eligible features using the get features API. If `include_global_state` is `true`, all current feature states are included by default. If `include_global_state` is `false`, no feature states are included by default. Note that specifying an empty array will result in the default behavior. To exclude all feature states, regardless of the `include_global_state` value, specify an array with only the value `none` (`["none"]`).').optional().meta({ found_in: 'body' }),
  ignore_unavailable: z.boolean().describe('If `true`, the request ignores data streams and indices in `indices` that are missing or closed. If `false`, the request returns an error for any data stream or index that is missing or closed.').optional().meta({ found_in: 'body' }),
  include_global_state: z.boolean().describe('If `true`, the current cluster state is included in the snapshot. The cluster state includes persistent cluster settings, composable index templates, legacy index templates, ingest pipelines, and ILM policies. It also includes data stored in system indices, such as Watches and task records (configurable via `feature_states`).').optional().meta({ found_in: 'body' }),
  indices: Indices.describe('A comma-separated list of data streams and indices to include in the snapshot. It supports a multi-target syntax. The default is an empty array (`[]`), which includes all regular data streams and regular indices. To exclude all data streams and indices, use `-*`. You can\'t use this parameter to include or exclude system indices or system data streams from a snapshot. Use `feature_states` instead.').optional().meta({ found_in: 'body' }),
  metadata: Metadata.describe('Arbitrary metadata to the snapshot, such as a record of who took the snapshot, why it was taken, or any other useful data. It can have any contents but it must be less than 1024 bytes. This information is not automatically generated by Elasticsearch.').optional().meta({ found_in: 'body' }),
  partial: z.boolean().describe('If `true`, it enables you to restore a partial snapshot of indices with unavailable shards. Only shards that were successfully included in the snapshot will be restored. All missing shards will be recreated as empty. If `false`, the entire restore operation will fail if one or more indices included in the snapshot do not have all primary shards available.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SnapshotCreateRequest' })
export type SnapshotCreateRequest = z.infer<typeof SnapshotCreateRequest>

export const SnapshotCreateResponse = z.object({
  accepted: z.boolean().describe('Equals `true` if the snapshot was accepted. Present when the request had `wait_for_completion` set to `false`').optional(),
  snapshot: SnapshotSnapshotInfo.describe('Snapshot information. Present when the request had `wait_for_completion` set to `true`').optional()
}).meta({ id: 'SnapshotCreateResponse' })
export type SnapshotCreateResponse = z.infer<typeof SnapshotCreateResponse>

/**
 * Create or update a snapshot repository.
 *
 * IMPORTANT: If you are migrating searchable snapshots, the repository name must be identical in the source and destination clusters.
 * To register a snapshot repository, the cluster's global metadata must be writeable.
 * Ensure there are no cluster blocks (for example, `cluster.blocks.read_only` and `clsuter.blocks.read_only_allow_delete` settings) that prevent write access.
 *
 * Several options for this API can be specified using a query parameter or a request body parameter.
 * If both parameters are specified, only the query parameter is used.
 */
export const SnapshotCreateRepositoryRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the snapshot repository to register or update.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for the master node. If the master node is not available before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response from all relevant nodes in the cluster after updating the cluster metadata. If no response is received before the timeout expires, the cluster metadata update still applies but the response will indicate that it was not completely acknowledged. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' }),
  verify: z.boolean().describe('If `true`, the request verifies the repository is functional on all master and data nodes in the cluster. If `false`, this verification is skipped. You can also perform this verification with the verify snapshot repository API.').optional().meta({ found_in: 'query' }),
  repository: SnapshotRepository.optional().meta({ found_in: 'body' })
}).meta({ id: 'SnapshotCreateRepositoryRequest' })
export type SnapshotCreateRepositoryRequest = z.infer<typeof SnapshotCreateRepositoryRequest>

export const SnapshotCreateRepositoryResponse = AcknowledgedResponseBase.meta({ id: 'SnapshotCreateRepositoryResponse' })
export type SnapshotCreateRepositoryResponse = z.infer<typeof SnapshotCreateRepositoryResponse>

/** Delete snapshots. */
export const SnapshotDeleteRequest = z.object({
  ...RequestBase.shape,
  repository: Name.describe('The name of the repository to delete a snapshot from.').meta({ found_in: 'path' }),
  snapshot: Names.describe('A comma-separated list of snapshot names to delete. It also accepts wildcards (`*`).').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for the master node. If the master node is not available before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('If `true`, the request returns a response when the matching snapshots are all deleted. If `false`, the request returns a response as soon as the deletes are scheduled.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SnapshotDeleteRequest' })
export type SnapshotDeleteRequest = z.infer<typeof SnapshotDeleteRequest>

export const SnapshotDeleteResponse = AcknowledgedResponseBase.meta({ id: 'SnapshotDeleteResponse' })
export type SnapshotDeleteResponse = z.infer<typeof SnapshotDeleteResponse>

/**
 * Delete snapshot repositories.
 *
 * When a repository is unregistered, Elasticsearch removes only the reference to the location where the repository is storing the snapshots.
 * The snapshots themselves are left untouched and in place.
 */
export const SnapshotDeleteRepositoryRequest = z.object({
  ...RequestBase.shape,
  name: Names.describe('The ame of the snapshot repositories to unregister. Wildcard (`*`) patterns are supported.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for the master node. If the master node is not available before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response from all relevant nodes in the cluster after updating the cluster metadata. If no response is received before the timeout expires, the cluster metadata update still applies but the response will indicate that it was not completely acknowledged. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SnapshotDeleteRepositoryRequest' })
export type SnapshotDeleteRepositoryRequest = z.infer<typeof SnapshotDeleteRepositoryRequest>

export const SnapshotDeleteRepositoryResponse = AcknowledgedResponseBase.meta({ id: 'SnapshotDeleteRepositoryResponse' })
export type SnapshotDeleteRepositoryResponse = z.infer<typeof SnapshotDeleteRepositoryResponse>

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

/** Get snapshot repository information. */
export const SnapshotGetRepositoryRequest = z.object({
  ...RequestBase.shape,
  name: Names.describe('A comma-separated list of snapshot repository names used to limit the request. Wildcard (`*`) expressions are supported including combining wildcards with exclude patterns starting with `-`. To get information about all snapshot repositories registered in the cluster, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  local: z.boolean().describe('If `true`, the request gets information from the local node only. If `false`, the request gets information from the master node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for the master node. If the master node is not available before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SnapshotGetRepositoryRequest' })
export type SnapshotGetRepositoryRequest = z.infer<typeof SnapshotGetRepositoryRequest>

export const SnapshotGetRepositoryResponse = z.record(z.string(), SnapshotRepository).meta({ id: 'SnapshotGetRepositoryResponse' })
export type SnapshotGetRepositoryResponse = z.infer<typeof SnapshotGetRepositoryResponse>

export const SnapshotRepositoryAnalyzeSnapshotNodeInfo = z.object({
  id: Id,
  name: Name
}).meta({ id: 'SnapshotRepositoryAnalyzeSnapshotNodeInfo' })
export type SnapshotRepositoryAnalyzeSnapshotNodeInfo = z.infer<typeof SnapshotRepositoryAnalyzeSnapshotNodeInfo>

export const SnapshotRepositoryAnalyzeReadBlobDetails = z.object({
  before_write_complete: z.boolean().describe('Indicates whether the read operation may have started before the write operation was complete.').optional(),
  elapsed: Duration.describe('The length of time spent reading the blob. If the blob was not found, this detail is omitted.').optional(),
  elapsed_nanos: DurationValue.describe('The length of time spent reading the blob, in nanoseconds. If the blob was not found, this detail is omitted.').optional(),
  first_byte_time: Duration.describe('The length of time waiting for the first byte of the read operation to be received. If the blob was not found, this detail is omitted.').optional(),
  first_byte_time_nanos: DurationValue.describe('The length of time waiting for the first byte of the read operation to be received, in nanoseconds. If the blob was not found, this detail is omitted.'),
  found: z.boolean().describe('Indicates whether the blob was found by the read operation. If the read was started before the write completed or the write was ended before completion, it might be false.'),
  node: SnapshotRepositoryAnalyzeSnapshotNodeInfo.describe('The node that performed the read operation.'),
  throttled: Duration.describe('The length of time spent waiting due to the `max_restore_bytes_per_sec` or `indices.recovery.max_bytes_per_sec` throttles during the read of the blob. If the blob was not found, this detail is omitted.').optional(),
  throttled_nanos: DurationValue.describe('The length of time spent waiting due to the `max_restore_bytes_per_sec` or `indices.recovery.max_bytes_per_sec` throttles during the read of the blob, in nanoseconds. If the blob was not found, this detail is omitted.').optional()
}).meta({ id: 'SnapshotRepositoryAnalyzeReadBlobDetails' })
export type SnapshotRepositoryAnalyzeReadBlobDetails = z.infer<typeof SnapshotRepositoryAnalyzeReadBlobDetails>

export const SnapshotRepositoryAnalyzeBlobDetails = z.object({
  name: z.string().describe('The name of the blob.'),
  overwritten: z.boolean().describe('Indicates whether the blob was overwritten while the read operations were ongoing.   /**'),
  read_early: z.boolean(),
  read_end: long.describe('The position, in bytes, at which read operations completed.'),
  read_start: long.describe('The position, in bytes, at which read operations started.'),
  reads: SnapshotRepositoryAnalyzeReadBlobDetails.describe('A description of every read operation performed on the blob.'),
  size: ByteSize.describe('The size of the blob.'),
  size_bytes: long.describe('The size of the blob in bytes.')
}).meta({ id: 'SnapshotRepositoryAnalyzeBlobDetails' })
export type SnapshotRepositoryAnalyzeBlobDetails = z.infer<typeof SnapshotRepositoryAnalyzeBlobDetails>

export const SnapshotRepositoryAnalyzeDetailsInfo = z.object({
  blob: SnapshotRepositoryAnalyzeBlobDetails.describe('A description of the blob that was written and read.'),
  overwrite_elapsed: Duration.describe('The elapsed time spent overwriting the blob. If the blob was not overwritten, this information is omitted.').optional(),
  overwrite_elapsed_nanos: DurationValue.describe('The elapsed time spent overwriting the blob, in nanoseconds. If the blob was not overwritten, this information is omitted.').optional(),
  write_elapsed: Duration.describe('The elapsed time spent writing the blob.'),
  write_elapsed_nanos: DurationValue.describe('The elapsed time spent writing the blob, in nanoseconds.'),
  write_throttled: Duration.describe('The length of time spent waiting for the `max_snapshot_bytes_per_sec` (or `indices.recovery.max_bytes_per_sec` if the recovery settings for managed services are set) throttle while writing the blob.'),
  write_throttled_nanos: DurationValue.describe('The length of time spent waiting for the `max_snapshot_bytes_per_sec` (or `indices.recovery.max_bytes_per_sec` if the recovery settings for managed services are set) throttle while writing the blob, in nanoseconds.'),
  writer_node: SnapshotRepositoryAnalyzeSnapshotNodeInfo.describe('The node which wrote the blob and coordinated the read operations.')
}).meta({ id: 'SnapshotRepositoryAnalyzeDetailsInfo' })
export type SnapshotRepositoryAnalyzeDetailsInfo = z.infer<typeof SnapshotRepositoryAnalyzeDetailsInfo>

export const SnapshotRepositoryAnalyzeReadSummaryInfo = z.object({
  count: integer.describe('The number of read operations performed in the test.'),
  max_wait: Duration.describe('The maximum time spent waiting for the first byte of any read request to be received.'),
  max_wait_nanos: DurationValue.describe('The maximum time spent waiting for the first byte of any read request to be received, in nanoseconds.'),
  total_elapsed: Duration.describe('The total elapsed time spent on reading blobs in the test.'),
  total_elapsed_nanos: DurationValue.describe('The total elapsed time spent on reading blobs in the test, in nanoseconds.'),
  total_size: ByteSize.describe('The total size of all the blobs or partial blobs read in the test.'),
  total_size_bytes: long.describe('The total size of all the blobs or partial blobs read in the test, in bytes.'),
  total_throttled: Duration.describe('The total time spent waiting due to the `max_restore_bytes_per_sec` or `indices.recovery.max_bytes_per_sec` throttles.'),
  total_throttled_nanos: DurationValue.describe('The total time spent waiting due to the `max_restore_bytes_per_sec` or `indices.recovery.max_bytes_per_sec` throttles, in nanoseconds.'),
  total_wait: Duration.describe('The total time spent waiting for the first byte of each read request to be received.'),
  total_wait_nanos: DurationValue.describe('The total time spent waiting for the first byte of each read request to be received, in nanoseconds.')
}).meta({ id: 'SnapshotRepositoryAnalyzeReadSummaryInfo' })
export type SnapshotRepositoryAnalyzeReadSummaryInfo = z.infer<typeof SnapshotRepositoryAnalyzeReadSummaryInfo>

/**
 * Analyze a snapshot repository.
 *
 * Performs operations on a snapshot repository in order to check for incorrect behaviour.
 *
 * There are a large number of third-party storage systems available, not all of which are suitable for use as a snapshot repository by Elasticsearch.
 * Some storage systems behave incorrectly, or perform poorly, especially when accessed concurrently by multiple clients as the nodes of an Elasticsearch cluster do.
 * This API performs a collection of read and write operations on your repository which are designed to detect incorrect behaviour and to measure the performance characteristics of your storage system.
 *
 * The default values for the parameters are deliberately low to reduce the impact of running an analysis inadvertently and to provide a sensible starting point for your investigations.
 * Run your first analysis with the default parameter values to check for simple problems.
 * Some repositories may behave correctly when lightly loaded but incorrectly under production-like workloads.
 * If the first analysis is successful, run a sequence of increasingly large analyses until you encounter a failure or you reach a `blob_count` of at least `2000`, a `max_blob_size` of at least `2gb`, a `max_total_data_size` of at least `1tb`, and a `register_operation_count` of at least `100`.
 * Always specify a generous timeout, possibly `1h` or longer, to allow time for each analysis to run to completion.
 * Some repositories may behave correctly when accessed by a small number of Elasticsearch nodes but incorrectly when accessed concurrently by a production-scale cluster.
 * Perform the analyses using a multi-node cluster of a similar size to your production cluster so that it can detect any problems that only arise when the repository is accessed by many nodes at once.
 *
 * If the analysis fails, Elasticsearch detected that your repository behaved unexpectedly.
 * This usually means you are using a third-party storage system with an incorrect or incompatible implementation of the API it claims to support.
 * If so, this storage system is not suitable for use as a snapshot repository.
 * Repository analysis triggers conditions that occur only rarely when taking snapshots in a production system.
 * Snapshotting to unsuitable storage may appear to work correctly most of the time despite repository analysis failures.
 * However your snapshot data is at risk if you store it in a snapshot repository that does not reliably pass repository analysis.
 * You can demonstrate that the analysis failure is due to an incompatible storage implementation by verifying that Elasticsearch does not detect the same problem when analysing the reference implementation of the storage protocol you are using.
 * For instance, if you are using storage that offers an API which the supplier claims to be compatible with AWS S3, verify that repositories in AWS S3 do not fail repository analysis.
 * This allows you to demonstrate to your storage supplier that a repository analysis failure must only be caused by an incompatibility with AWS S3 and cannot be attributed to a problem in Elasticsearch.
 * Please do not report Elasticsearch issues involving third-party storage systems unless you can demonstrate that the same issue exists when analysing a repository that uses the reference implementation of the same storage protocol.
 * You will need to work with the supplier of your storage system to address the incompatibilities that Elasticsearch detects.
 *
 * The analysis may also report a failure if your repository experienced a service disruption while the analysis was running.
 * In practice, occasional service disruptions are inevitable, but the analysis cannot itself distinguish such disruptions from incorrect behavior so must report all deviations from the expected behavior as failures.
 * If you are certain that you can ascribe an analysis failure to such a service disruption, wait for your service provider to resolve the disruption and then re-run the analysis.
 * Elasticsearch will be unable to create or restore snapshots during repository service disruptions, so you must ensure that these events occur only very rarely.
 *
 * If the analysis is successful, the API returns details of the testing process, optionally including how long each operation took.
 * You can use this information to determine the performance of your storage system.
 * If any operation fails or returns an incorrect result, the API returns an error.
 * If the API returns an error, it may not have removed all the data it wrote to the repository.
 * The error will indicate the location of any leftover data and this path is also recorded in the Elasticsearch logs.
 * You should verify that this location has been cleaned up correctly.
 * If there is still leftover data at the specified location, you should manually remove it.
 *
 * If the connection from your client to Elasticsearch is closed while the client is waiting for the result of the analysis, the test is cancelled.
 * Some clients are configured to close their connection if no response is received within a certain timeout.
 * An analysis takes a long time to complete so you might need to relax any such client-side timeouts.
 * On cancellation the analysis attempts to clean up the data it was writing, but it may not be able to remove it all.
 * The path to the leftover data is recorded in the Elasticsearch logs.
 * You should verify that this location has been cleaned up correctly.
 * If there is still leftover data at the specified location, you should manually remove it.
 *
 * If the analysis is successful then it detected no incorrect behaviour, but this does not mean that correct behaviour is guaranteed.
 * The analysis attempts to detect common bugs but it does not offer 100% coverage.
 * Additionally, it does not test the following:
 *
 * * Your repository must perform durable writes. Once a blob has been written it must remain in place until it is deleted, even after a power loss or similar disaster.
 * * Your repository must not suffer from silent data corruption. Once a blob has been written, its contents must remain unchanged until it is deliberately modified or deleted.
 * * Your repository must behave correctly even if connectivity from the cluster is disrupted. Reads and writes may fail in this case, but they must not return incorrect results.
 *
 * IMPORTANT: An analysis writes a substantial amount of data to your repository and then reads it back again.
 * This consumes bandwidth on the network between the cluster and the repository, and storage space and I/O bandwidth on the repository itself.
 * You must ensure this load does not affect other users of these systems.
 * Analyses respect the repository settings `max_snapshot_bytes_per_sec` and `max_restore_bytes_per_sec` if available and the cluster setting `indices.recovery.max_bytes_per_sec` which you can use to limit the bandwidth they consume.
 *
 * NOTE: This API is intended for exploratory use by humans.
 * You should expect the request parameters and the response format to vary in future versions.
 * The response exposes immplementation details of the analysis which may change from version to version.
 *
 * NOTE: Different versions of Elasticsearch may perform different checks for repository compatibility, with newer versions typically being stricter than older ones.
 * A storage system that passes repository analysis with one version of Elasticsearch may fail with a different version.
 * This indicates it behaves incorrectly in ways that the former version did not detect.
 * You must work with the supplier of your storage system to address the incompatibilities detected by the repository analysis API in any version of Elasticsearch.
 *
 * NOTE: This API may not work correctly in a mixed-version cluster.
 *
 * *Implementation details*
 *
 * NOTE: This section of documentation describes how the repository analysis API works in this version of Elasticsearch, but you should expect the implementation to vary between versions.
 * The request parameters and response format depend on details of the implementation so may also be different in newer versions.
 *
 * The analysis comprises a number of blob-level tasks, as set by the `blob_count` parameter and a number of compare-and-exchange operations on linearizable registers, as set by the `register_operation_count` parameter.
 * These tasks are distributed over the data and master-eligible nodes in the cluster for execution.
 *
 * For most blob-level tasks, the executing node first writes a blob to the repository and then instructs some of the other nodes in the cluster to attempt to read the data it just wrote.
 * The size of the blob is chosen randomly, according to the `max_blob_size` and `max_total_data_size` parameters.
 * If any of these reads fails then the repository does not implement the necessary read-after-write semantics that Elasticsearch requires.
 *
 * For some blob-level tasks, the executing node will instruct some of its peers to attempt to read the data before the writing process completes.
 * These reads are permitted to fail, but must not return partial data.
 * If any read returns partial data then the repository does not implement the necessary atomicity semantics that Elasticsearch requires.
 *
 * For some blob-level tasks, the executing node will overwrite the blob while its peers are reading it.
 * In this case the data read may come from either the original or the overwritten blob, but the read operation must not return partial data or a mix of data from the two blobs.
 * If any of these reads returns partial data or a mix of the two blobs then the repository does not implement the necessary atomicity semantics that Elasticsearch requires for overwrites.
 *
 * The executing node will use a variety of different methods to write the blob.
 * For instance, where applicable, it will use both single-part and multi-part uploads.
 * Similarly, the reading nodes will use a variety of different methods to read the data back again.
 * For instance they may read the entire blob from start to end or may read only a subset of the data.
 *
 * For some blob-level tasks, the executing node will cancel the write before it is complete.
 * In this case, it still instructs some of the other nodes in the cluster to attempt to read the blob but all of these reads must fail to find the blob.
 *
 * Linearizable registers are special blobs that Elasticsearch manipulates using an atomic compare-and-exchange operation.
 * This operation ensures correct and strongly-consistent behavior even when the blob is accessed by multiple nodes at the same time.
 * The detailed implementation of the compare-and-exchange operation on linearizable registers varies by repository type.
 * Repository analysis verifies that that uncontended compare-and-exchange operations on a linearizable register blob always succeed.
 * Repository analysis also verifies that contended operations either succeed or report the contention but do not return incorrect results.
 * If an operation fails due to contention, Elasticsearch retries the operation until it succeeds.
 * Most of the compare-and-exchange operations performed by repository analysis atomically increment a counter which is represented as an 8-byte blob.
 * Some operations also verify the behavior on small blobs with sizes other than 8 bytes.
 */
export const SnapshotRepositoryAnalyzeRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the repository.').meta({ found_in: 'path' }),
  blob_count: integer.describe('The total number of blobs to write to the repository during the test. For realistic experiments, set this parameter to at least `2000`.').optional().meta({ found_in: 'query' }),
  concurrency: integer.describe('The number of operations to run concurrently during the test. For realistic experiments, leave this parameter unset.').optional().meta({ found_in: 'query' }),
  detailed: z.boolean().describe('Indicates whether to return detailed results, including timing information for every operation performed during the analysis. If false, it returns only a summary of the analysis.').optional().meta({ found_in: 'query' }),
  early_read_node_count: integer.describe('The number of nodes on which to perform an early read operation while writing each blob. Early read operations are only rarely performed. For realistic experiments, leave this parameter unset.').optional().meta({ found_in: 'query' }),
  max_blob_size: ByteSize.describe('The maximum size of a blob to be written during the test. For realistic experiments, set this parameter to at least `2gb`.').optional().meta({ found_in: 'query' }),
  max_total_data_size: ByteSize.describe('An upper limit on the total size of all the blobs written during the test. For realistic experiments, set this parameter to at least `1tb`.').optional().meta({ found_in: 'query' }),
  rare_action_probability: double.describe('The probability of performing a rare action such as an early read, an overwrite, or an aborted write on each blob. For realistic experiments, leave this parameter unset.').optional().meta({ found_in: 'query' }),
  rarely_abort_writes: z.boolean().describe('Indicates whether to rarely cancel writes before they complete. For realistic experiments, leave this parameter unset.').optional().meta({ found_in: 'query' }),
  read_node_count: integer.describe('The number of nodes on which to read a blob after writing. For realistic experiments, leave this parameter unset.').optional().meta({ found_in: 'query' }),
  register_operation_count: integer.describe('The minimum number of linearizable register operations to perform in total. For realistic experiments, set this parameter to at least `100`.').optional().meta({ found_in: 'query' }),
  seed: integer.describe('The seed for the pseudo-random number generator used to generate the list of operations performed during the test. To repeat the same set of operations in multiple experiments, use the same seed in each experiment. Note that the operations are performed concurrently so might not always happen in the same order on each run. For realistic experiments, leave this parameter unset.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period of time to wait for the test to complete. If no response is received before the timeout expires, the test is cancelled and returns an error. For realistic experiments, set this parameter sufficiently long to allow the test to complete.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SnapshotRepositoryAnalyzeRequest' })
export type SnapshotRepositoryAnalyzeRequest = z.infer<typeof SnapshotRepositoryAnalyzeRequest>

export const SnapshotRepositoryAnalyzeWriteSummaryInfo = z.object({
  count: integer.describe('The number of write operations performed in the test.'),
  total_elapsed: Duration.describe('The total elapsed time spent on writing blobs in the test.'),
  total_elapsed_nanos: DurationValue.describe('The total elapsed time spent on writing blobs in the test, in nanoseconds.'),
  total_size: ByteSize.describe('The total size of all the blobs written in the test.'),
  total_size_bytes: long.describe('The total size of all the blobs written in the test, in bytes.'),
  total_throttled: Duration.describe('The total time spent waiting due to the `max_snapshot_bytes_per_sec` throttle.'),
  total_throttled_nanos: long.describe('The total time spent waiting due to the `max_snapshot_bytes_per_sec` throttle, in nanoseconds.')
}).meta({ id: 'SnapshotRepositoryAnalyzeWriteSummaryInfo' })
export type SnapshotRepositoryAnalyzeWriteSummaryInfo = z.infer<typeof SnapshotRepositoryAnalyzeWriteSummaryInfo>

export const SnapshotRepositoryAnalyzeSummaryInfo = z.object({
  read: SnapshotRepositoryAnalyzeReadSummaryInfo.describe('A collection of statistics that summarise the results of the read operations in the test.'),
  write: SnapshotRepositoryAnalyzeWriteSummaryInfo.describe('A collection of statistics that summarise the results of the write operations in the test.')
}).meta({ id: 'SnapshotRepositoryAnalyzeSummaryInfo' })
export type SnapshotRepositoryAnalyzeSummaryInfo = z.infer<typeof SnapshotRepositoryAnalyzeSummaryInfo>

export const SnapshotRepositoryAnalyzeResponse = z.object({
  blob_count: integer.describe('The number of blobs written to the repository during the test.'),
  blob_path: z.string().describe('The path in the repository under which all the blobs were written during the test.'),
  concurrency: integer.describe('The number of write operations performed concurrently during the test.'),
  coordinating_node: SnapshotRepositoryAnalyzeSnapshotNodeInfo.describe('The node that coordinated the analysis and performed the final cleanup.'),
  delete_elapsed: Duration.describe('The time it took to delete all the blobs in the container.'),
  delete_elapsed_nanos: DurationValue.describe('The time it took to delete all the blobs in the container, in nanoseconds.'),
  details: SnapshotRepositoryAnalyzeDetailsInfo.describe('A description of every read and write operation performed during the test.'),
  early_read_node_count: integer.describe('The limit on the number of nodes on which early read operations were performed after writing each blob.'),
  issues_detected: z.array(z.string()).describe('A list of correctness issues detected, which is empty if the API succeeded. It is included to emphasize that a successful response does not guarantee correct behaviour in future.'),
  listing_elapsed: Duration.describe('The time it took to retrieve a list of all the blobs in the container.'),
  listing_elapsed_nanos: DurationValue.describe('The time it took to retrieve a list of all the blobs in the container, in nanoseconds.'),
  max_blob_size: ByteSize.describe('The limit on the size of a blob written during the test.'),
  max_blob_size_bytes: long.describe('The limit, in bytes, on the size of a blob written during the test.'),
  max_total_data_size: ByteSize.describe('The limit on the total size of all blob written during the test.'),
  max_total_data_size_bytes: long.describe('The limit, in bytes, on the total size of all blob written during the test.'),
  rare_action_probability: double.describe('The probability of performing rare actions during the test.'),
  read_node_count: integer.describe('The limit on the number of nodes on which read operations were performed after writing each blob.'),
  repository: z.string().describe('The name of the repository that was the subject of the analysis.'),
  seed: long.describe('The seed for the pseudo-random number generator used to generate the operations used during the test.'),
  summary: SnapshotRepositoryAnalyzeSummaryInfo.describe('A collection of statistics that summarize the results of the test.')
}).meta({ id: 'SnapshotRepositoryAnalyzeResponse' })
export type SnapshotRepositoryAnalyzeResponse = z.infer<typeof SnapshotRepositoryAnalyzeResponse>

/**
 * Verify the repository integrity.
 *
 * Verify the integrity of the contents of a snapshot repository.
 *
 * This API enables you to perform a comprehensive check of the contents of a repository, looking for any anomalies in its data or metadata which might prevent you from restoring snapshots from the repository or which might cause future snapshot create or delete operations to fail.
 *
 * If you suspect the integrity of the contents of one of your snapshot repositories, cease all write activity to this repository immediately, set its `read_only` option to `true`, and use this API to verify its integrity.
 * Until you do so:
 *
 * * It may not be possible to restore some snapshots from this repository.
 * * Searchable snapshots may report errors when searched or may have unassigned shards.
 * * Taking snapshots into this repository may fail or may appear to succeed but have created a snapshot which cannot be restored.
 * * Deleting snapshots from this repository may fail or may appear to succeed but leave the underlying data on disk.
 * * Continuing to write to the repository while it is in an invalid state may causing additional damage to its contents.
 *
 * If the API finds any problems with the integrity of the contents of your repository, Elasticsearch will not be able to repair the damage.
 * The only way to bring the repository back into a fully working state after its contents have been damaged is by restoring its contents from a repository backup which was taken before the damage occurred.
 * You must also identify what caused the damage and take action to prevent it from happening again.
 *
 * If you cannot restore a repository backup, register a new repository and use this for all future snapshot operations.
 * In some cases it may be possible to recover some of the contents of a damaged repository, either by restoring as many of its snapshots as needed and taking new snapshots of the restored data, or by using the reindex API to copy data from any searchable snapshots mounted from the damaged repository.
 *
 * Avoid all operations which write to the repository while the verify repository integrity API is running.
 * If something changes the repository contents while an integrity verification is running then Elasticsearch may incorrectly report having detected some anomalies in its contents due to the concurrent writes.
 * It may also incorrectly fail to report some anomalies that the concurrent writes prevented it from detecting.
 *
 * NOTE: This API is intended for exploratory use by humans. You should expect the request parameters and the response format to vary in future versions.
 *
 * NOTE: This API may not work correctly in a mixed-version cluster.
 *
 * The default values for the parameters of this API are designed to limit the impact of the integrity verification on other activities in your cluster.
 * For instance, by default it will only use at most half of the `snapshot_meta` threads to verify the integrity of each snapshot, allowing other snapshot operations to use the other half of this thread pool.
 * If you modify these parameters to speed up the verification process, you risk disrupting other snapshot-related operations in your cluster.
 * For large repositories, consider setting up a separate single-node Elasticsearch cluster just for running the integrity verification API.
 *
 * The response exposes implementation details of the analysis which may change from version to version.
 * The response body format is therefore not considered stable and may be different in newer versions.
 */
export const SnapshotRepositoryVerifyIntegrityRequest = z.object({
  ...RequestBase.shape,
  name: Names.describe('The name of the snapshot repository.').meta({ found_in: 'path' }),
  blob_thread_pool_concurrency: integer.describe('If `verify_blob_contents` is `true`, this parameter specifies how many blobs to verify at once.').optional().meta({ found_in: 'query' }),
  index_snapshot_verification_concurrency: integer.describe('The maximum number of index snapshots to verify concurrently within each index verification.').optional().meta({ found_in: 'query' }),
  index_verification_concurrency: integer.describe('The number of indices to verify concurrently. The default behavior is to use the entire `snapshot_meta` thread pool.').optional().meta({ found_in: 'query' }),
  max_bytes_per_sec: z.string().describe('If `verify_blob_contents` is `true`, this parameter specifies the maximum amount of data that Elasticsearch will read from the repository every second.').optional().meta({ found_in: 'query' }),
  max_failed_shard_snapshots: integer.describe('The number of shard snapshot failures to track during integrity verification, in order to avoid excessive resource usage. If your repository contains more than this number of shard snapshot failures, the verification will fail.').optional().meta({ found_in: 'query' }),
  meta_thread_pool_concurrency: integer.describe('The maximum number of snapshot metadata operations to run concurrently. The default behavior is to use at most half of the `snapshot_meta` thread pool at once.').optional().meta({ found_in: 'query' }),
  snapshot_verification_concurrency: integer.describe('The number of snapshots to verify concurrently. The default behavior is to use at most half of the `snapshot_meta` thread pool at once.').optional().meta({ found_in: 'query' }),
  verify_blob_contents: z.boolean().describe('Indicates whether to verify the checksum of every data blob in the repository. If this feature is enabled, Elasticsearch will read the entire repository contents, which may be extremely slow and expensive.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SnapshotRepositoryVerifyIntegrityRequest' })
export type SnapshotRepositoryVerifyIntegrityRequest = z.infer<typeof SnapshotRepositoryVerifyIntegrityRequest>

export const SnapshotRepositoryVerifyIntegrityResponse = z.any().meta({ id: 'SnapshotRepositoryVerifyIntegrityResponse' })
export type SnapshotRepositoryVerifyIntegrityResponse = z.infer<typeof SnapshotRepositoryVerifyIntegrityResponse>

/**
 * Restore a snapshot.
 *
 * Restore a snapshot of a cluster or data streams and indices.
 *
 * You can restore a snapshot only to a running cluster with an elected master node.
 * The snapshot repository must be registered and available to the cluster.
 * The snapshot and cluster versions must be compatible.
 *
 * To restore a snapshot, the cluster's global metadata must be writable. Ensure there are't any cluster blocks that prevent writes. The restore operation ignores index blocks.
 *
 * Before you restore a data stream, ensure the cluster contains a matching index template with data streams enabled. To check, use the index management feature in Kibana or the get index template API:
 *
 * ```
 * GET _index_template/*?filter_path=index_templates.name,index_templates.index_template.index_patterns,index_templates.index_template.data_stream
 * ```
 *
 * If no such template exists, you can create one or restore a cluster state that contains one. Without a matching index template, a data stream can't roll over or create backing indices.
 *
 * If your snapshot contains data from App Search or Workplace Search, you must restore the Enterprise Search encryption key before you restore the snapshot.
 */
export const SnapshotRestoreRequest = z.object({
  ...RequestBase.shape,
  repository: Name.describe('The name of the repository to restore a snapshot from.').meta({ found_in: 'path' }),
  snapshot: Name.describe('The name of the snapshot to restore.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for the master node. If the master node is not available before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('If `true`, the request returns a response when the restore operation completes. The operation is complete when it finishes all attempts to recover primary shards for restored indices. This applies even if one or more of the recovery attempts fail. If `false`, the request returns a response when the restore operation initializes.').optional().meta({ found_in: 'query' }),
  feature_states: z.array(z.string()).describe('The feature states to restore. If `include_global_state` is `true`, the request restores all feature states in the snapshot by default. If `include_global_state` is `false`, the request restores no feature states by default. Note that specifying an empty array will result in the default behavior. To restore no feature states, regardless of the `include_global_state` value, specify an array containing only the value `none` (`["none"]`).').optional().meta({ found_in: 'body' }),
  ignore_index_settings: z.array(z.string()).describe('The index settings to not restore from the snapshot. You can\'t use this option to ignore `index.number_of_shards`. For data streams, this option applies only to restored backing indices. New backing indices are configured using the data stream\'s matching index template.').optional().meta({ found_in: 'body' }),
  ignore_unavailable: z.boolean().describe('If `true`, the request ignores any index or data stream in indices that\'s missing from the snapshot. If `false`, the request returns an error for any missing index or data stream.').optional().meta({ found_in: 'body' }),
  include_aliases: z.boolean().describe('If `true`, the request restores aliases for any restored data streams and indices. If `false`, the request doesn’t restore aliases.').optional().meta({ found_in: 'body' }),
  include_global_state: z.boolean().describe('If `true`, restore the cluster state. The cluster state includes: * Persistent cluster settings * Index templates * Legacy index templates * Ingest pipelines * Index lifecycle management (ILM) policies * Stored scripts * For snapshots taken after 7.12.0, feature states If `include_global_state` is `true`, the restore operation merges the legacy index templates in your cluster with the templates contained in the snapshot, replacing any existing ones whose name matches one in the snapshot. It completely removes all persistent settings, non-legacy index templates, ingest pipelines, and ILM lifecycle policies that exist in your cluster and replaces them with the corresponding items from the snapshot. Use the `feature_states` parameter to configure how feature states are restored. If `include_global_state` is `true` and a snapshot was created without a global state then the restore request will fail.').optional().meta({ found_in: 'body' }),
  index_settings: z.lazy(() => IndicesIndexSettings).describe('Index settings to add or change in restored indices, including backing indices. You can\'t use this option to change `index.number_of_shards`. For data streams, this option applies only to restored backing indices. New backing indices are configured using the data stream\'s matching index template.').optional().meta({ found_in: 'body' }),
  indices: Indices.describe('A comma-separated list of indices and data streams to restore. It supports a multi-target syntax. The default behavior is all regular indices and regular data streams in the snapshot. You can\'t use this parameter to restore system indices or system data streams. Use `feature_states` instead.').optional().meta({ found_in: 'body' }),
  partial: z.boolean().describe('If `false`, the entire restore operation will fail if one or more indices included in the snapshot do not have all primary shards available. If true, it allows restoring a partial snapshot of indices with unavailable shards. Only shards that were successfully included in the snapshot will be restored. All missing shards will be recreated as empty.').optional().meta({ found_in: 'body' }),
  rename_pattern: z.string().describe('A rename pattern to apply to restored data streams and indices. Data streams and indices matching the rename pattern will be renamed according to `rename_replacement`. The rename pattern is applied as defined by the regular expression that supports referencing the original text, according to the `appendReplacement` logic.').optional().meta({ found_in: 'body' }),
  rename_replacement: z.string().describe('The rename replacement string that is used with the `rename_pattern`.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SnapshotRestoreRequest' })
export type SnapshotRestoreRequest = z.infer<typeof SnapshotRestoreRequest>

export const SnapshotRestoreSnapshotRestore = z.object({
  indices: z.array(IndexName),
  snapshot: z.string(),
  shards: ShardStatistics
}).meta({ id: 'SnapshotRestoreSnapshotRestore' })
export type SnapshotRestoreSnapshotRestore = z.infer<typeof SnapshotRestoreSnapshotRestore>

export const SnapshotRestoreResponse = z.object({
  accepted: z.boolean().optional(),
  snapshot: SnapshotRestoreSnapshotRestore.optional()
}).meta({ id: 'SnapshotRestoreResponse' })
export type SnapshotRestoreResponse = z.infer<typeof SnapshotRestoreResponse>

/**
 * Get the snapshot status.
 *
 * Get a detailed description of the current state for each shard participating in the snapshot.
 *
 * Note that this API should be used only to obtain detailed shard-level information for ongoing snapshots.
 * If this detail is not needed or you want to obtain information about one or more existing snapshots, use the get snapshot API.
 *
 * If you omit the `<snapshot>` request path parameter, the request retrieves information only for currently running snapshots.
 * This usage is preferred.
 * If needed, you can specify `<repository>` and `<snapshot>` to retrieve information for specific snapshots, even if they're not currently running.
 *
 * Note that the stats will not be available for any shard snapshots in an ongoing snapshot completed by a node that (even momentarily) left the cluster.
 * Loading the stats from the repository is an expensive operation (see the WARNING below).
 * Therefore the stats values for such shards will be -1 even though the "stage" value will be "DONE", in order to minimize latency.
 * A "description" field will be present for a shard snapshot completed by a departed node explaining why the shard snapshot's stats results are invalid.
 * Consequently, the total stats for the index will be less than expected due to the missing values from these shards.
 *
 * WARNING: Using the API to return the status of any snapshots other than currently running snapshots can be expensive.
 * The API requires a read from the repository for each shard in each snapshot.
 * For example, if you have 100 snapshots with 1,000 shards each, an API request that includes all snapshots will require 100,000 reads (100 snapshots x 1,000 shards).
 *
 * Depending on the latency of your storage, such requests can take an extremely long time to return results.
 * These requests can also tax machine resources and, when using cloud storage, incur high processing costs.
 */
export const SnapshotStatusRequest = z.object({
  ...RequestBase.shape,
  repository: Name.describe('The snapshot repository name used to limit the request. It supports wildcards (`*`) if `<snapshot>` isn\'t specified.').optional().meta({ found_in: 'path' }),
  snapshot: Names.describe('A comma-separated list of snapshots to retrieve status for. The default is currently running snapshots. Wildcards (`*`) are not supported.').optional().meta({ found_in: 'path' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error for any snapshots that are unavailable. If `true`, the request ignores snapshots that are unavailable, such as those that are corrupted or temporarily cannot be returned.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for the master node. If the master node is not available before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SnapshotStatusRequest' })
export type SnapshotStatusRequest = z.infer<typeof SnapshotStatusRequest>

export const SnapshotStatusResponse = z.object({
  snapshots: z.array(SnapshotStatus)
}).meta({ id: 'SnapshotStatusResponse' })
export type SnapshotStatusResponse = z.infer<typeof SnapshotStatusResponse>

export const SnapshotVerifyRepositoryCompactNodeInfo = z.object({
  name: Name.describe('A human-readable name for the node. You can set this name using the `node.name` property in `elasticsearch.yml`. The default value is the machine\'s hostname.')
}).meta({ id: 'SnapshotVerifyRepositoryCompactNodeInfo' })
export type SnapshotVerifyRepositoryCompactNodeInfo = z.infer<typeof SnapshotVerifyRepositoryCompactNodeInfo>

/**
 * Verify a snapshot repository.
 *
 * Check for common misconfigurations in a snapshot repository.
 */
export const SnapshotVerifyRepositoryRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the snapshot repository to verify.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for the master node. If the master node is not available before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response from all relevant nodes in the cluster after updating the cluster metadata. If no response is received before the timeout expires, the cluster metadata update still applies but the response will indicate that it was not completely acknowledged. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SnapshotVerifyRepositoryRequest' })
export type SnapshotVerifyRepositoryRequest = z.infer<typeof SnapshotVerifyRepositoryRequest>

export const SnapshotVerifyRepositoryResponse = z.object({
  nodes: z.record(z.string(), SnapshotVerifyRepositoryCompactNodeInfo).describe('Information about the nodes connected to the snapshot repository. The key is the ID of the node.')
}).meta({ id: 'SnapshotVerifyRepositoryResponse' })
export type SnapshotVerifyRepositoryResponse = z.infer<typeof SnapshotVerifyRepositoryResponse>
