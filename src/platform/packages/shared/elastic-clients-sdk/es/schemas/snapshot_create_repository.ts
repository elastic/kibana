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

export const AcknowledgedResponseBase = z.object({
  acknowledged: z.boolean().describe('For a successful response, this value is always true. On failure, an exception is returned instead.')
}).meta({ id: 'AcknowledgedResponseBase' })
export type AcknowledgedResponseBase = z.infer<typeof AcknowledgedResponseBase>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const ByteSize = z.union([long, z.string()]).meta({ id: 'ByteSize' })
export type ByteSize = z.infer<typeof ByteSize>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Uuid = z.string().meta({ id: 'Uuid' })
export type Uuid = z.infer<typeof Uuid>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

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
  repository: SnapshotRepository.meta({ found_in: 'body' })
}).meta({ id: 'SnapshotCreateRepositoryRequest' })
export type SnapshotCreateRepositoryRequest = z.infer<typeof SnapshotCreateRepositoryRequest>

export const SnapshotCreateRepositoryResponse = AcknowledgedResponseBase.meta({ id: 'SnapshotCreateRepositoryResponse' })
export type SnapshotCreateRepositoryResponse = z.infer<typeof SnapshotCreateRepositoryResponse>
