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

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

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
