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

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

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
