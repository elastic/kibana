/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 *
 * Source: elasticsearch-specification repository, operations: snapshot-repository-analyze
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  snapshot_repository_analyze_request,
  snapshot_repository_analyze_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SNAPSHOT_REPOSITORY_ANALYZE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.repository_analyze',
  summary: `Analyze a snapshot repository`,
  description: `Analyze a snapshot repository.

Performs operations on a snapshot repository in order to check for incorrect behaviour.

There are a large number of third-party storage systems available, not all of which are suitable for use as a snapshot repository by Elasticsearch.
Some storage systems behave incorrectly, or perform poorly, especially when accessed concurrently by multiple clients as the nodes of an Elasticsearch cluster do.
This API performs a collection of read and write operations on your repository which are designed to detect incorrect behaviour and to measure the performance characteristics of your storage system.

The default values for the parameters are deliberately low to reduce the impact of running an analysis inadvertently and to provide a sensible starting point for your investigations.
Run your first analysis with the default parameter values to check for simple problems.
Some repositories may behave correctly when lightly loaded but incorrectly under production-like workloads.
If the first analysis is successful, run a sequence of increasingly large analyses until you encounter a failure or you reach a \`blob_count\` of at least \`2000\`, a \`max_blob_size\` of at least \`2gb\`, a \`max_total_data_size\` of at least \`1tb\`, and a \`register_operation_count\` of at least \`100\`.
Always specify a generous timeout, possibly \`1h\` or longer, to allow time for each analysis to run to completion.
Some repositories may behave correctly when accessed by a small number of Elasticsearch nodes but incorrectly when accessed concurrently by a production-scale cluster.
Perform the analyses using a multi-node cluster of a similar size to your production cluster so that it can detect any problems that only arise when the repository is accessed by many nodes at once.

If the analysis fails, Elasticsearch detected that your repository behaved unexpectedly.
This usually means you are using a third-party storage system with an incorrect or incompatible implementation of the API it claims to support.
If so, this storage system is not suitable for use as a snapshot repository.
Repository analysis triggers conditions that occur only rarely when taking snapshots in a production system.
Snapshotting to unsuitable storage may appear to work correctly most of the time despite repository analysis failures.
However your snapshot data is at risk if you store it in a snapshot repository that does not reliably pass repository analysis.
You can demonstrate that the analysis failure is due to an incompatible storage implementation by verifying that Elasticsearch does not detect the same problem when analysing the reference implementation of the storage protocol you are using.
For instance, if you are using storage that offers an API which the supplier claims to be compatible with AWS S3, verify that repositories in AWS S3 do not fail repository analysis.
This allows you to demonstrate to your storage supplier that a repository analysis failure must only be caused by an incompatibility with AWS S3 and cannot be attributed to a problem in Elasticsearch.
Please do not report Elasticsearch issues involving third-party storage systems unless you can demonstrate that the same issue exists when analysing a repository that uses the reference implementation of the same storage protocol.
You will need to work with the supplier of your storage system to address the incompatibilities that Elasticsearch detects.

If the analysis is successful, the API returns details of the testing process, optionally including how long each operation took.
You can use this information to determine the performance of your storage system.
If any operation fails or returns an incorrect result, the API returns an error.
If the API returns an error, it may not have removed all the data it wrote to the repository.
The error will indicate the location of any leftover data and this path is also recorded in the Elasticsearch logs.
You should verify that this location has been cleaned up correctly.
If there is still leftover data at the specified location, you should manually remove it.

If the connection from your client to Elasticsearch is closed while the client is waiting for the result of the analysis, the test is cancelled.
Some clients are configured to close their connection if no response is received within a certain timeout.
An analysis takes a long time to complete so you might need to relax any such client-side timeouts.
On cancellation the analysis attempts to clean up the data it was writing, but it may not be able to remove it all.
The path to the leftover data is recorded in the Elasticsearch logs.
You should verify that this location has been cleaned up correctly.
If there is still leftover data at the specified location, you should manually remove it.

If the analysis is successful then it detected no incorrect behaviour, but this does not mean that correct behaviour is guaranteed.
The analysis attempts to detect common bugs but it does not offer 100% coverage.
Additionally, it does not test the following:

* Your repository must perform durable writes. Once a blob has been written it must remain in place until it is deleted, even after a power loss or similar disaster.
* Your repository must not suffer from silent data corruption. Once a blob has been written, its contents must remain unchanged until it is deliberately modified or deleted.
* Your repository must behave correctly even if connectivity from the cluster is disrupted. Reads and writes may fail in this case, but they must not return incorrect results.

IMPORTANT: An analysis writes a substantial amount of data to your repository and then reads it back again.
This consumes bandwidth on the network between the cluster and the repository, and storage space and I/O bandwidth on the repository itself.
You must ensure this load does not affect other users of these systems.
Analyses respect the repository settings \`max_snapshot_bytes_per_sec\` and \`max_restore_bytes_per_sec\` if available and the cluster setting \`indices.recovery.max_bytes_per_sec\` which you can use to limit the bandwidth they consume.

NOTE: This API is intended for exploratory use by humans.
You should expect the request parameters and the response format to vary in future versions.
The response exposes immplementation details of the analysis which may change from version to version.

NOTE: Different versions of Elasticsearch may perform different checks for repository compatibility, with newer versions typically being stricter than older ones.
A storage system that passes repository analysis with one version of Elasticsearch may fail with a different version.
This indicates it behaves incorrectly in ways that the former version did not detect.
You must work with the supplier of your storage system to address the incompatibilities detected by the repository analysis API in any version of Elasticsearch.

NOTE: This API may not work correctly in a mixed-version cluster.

*Implementation details*

NOTE: This section of documentation describes how the repository analysis API works in this version of Elasticsearch, but you should expect the implementation to vary between versions.
The request parameters and response format depend on details of the implementation so may also be different in newer versions.

The analysis comprises a number of blob-level tasks, as set by the \`blob_count\` parameter and a number of compare-and-exchange operations on linearizable registers, as set by the \`register_operation_count\` parameter.
These tasks are distributed over the data and master-eligible nodes in the cluster for execution.

For most blob-level tasks, the executing node first writes a blob to the repository and then instructs some of the other nodes in the cluster to attempt to read the data it just wrote.
The size of the blob is chosen randomly, according to the \`max_blob_size\` and \`max_total_data_size\` parameters.
If any of these reads fails then the repository does not implement the necessary read-after-write semantics that Elasticsearch requires.

For some blob-level tasks, the executing node will instruct some of its peers to attempt to read the data before the writing process completes.
These reads are permitted to fail, but must not return partial data.
If any read returns partial data then the repository does not implement the necessary atomicity semantics that Elasticsearch requires.

For some blob-level tasks, the executing node will overwrite the blob while its peers are reading it.
In this case the data read may come from either the original or the overwritten blob, but the read operation must not return partial data or a mix of data from the two blobs.
If any of these reads returns partial data or a mix of the two blobs then the repository does not implement the necessary atomicity semantics that Elasticsearch requires for overwrites.

The executing node will use a variety of different methods to write the blob.
For instance, where applicable, it will use both single-part and multi-part uploads.
Similarly, the reading nodes will use a variety of different methods to read the data back again.
For instance they may read the entire blob from start to end or may read only a subset of the data.

For some blob-level tasks, the executing node will cancel the write before it is complete.
In this case, it still instructs some of the other nodes in the cluster to attempt to read the blob but all of these reads must fail to find the blob.

Linearizable registers are special blobs that Elasticsearch manipulates using an atomic compare-and-exchange operation.
This operation ensures correct and strongly-consistent behavior even when the blob is accessed by multiple nodes at the same time.
The detailed implementation of the compare-and-exchange operation on linearizable registers varies by repository type.
Repository analysis verifies that that uncontended compare-and-exchange operations on a linearizable register blob always succeed.
Repository analysis also verifies that contended operations either succeed or report the contention but do not return incorrect results.
If an operation fails due to contention, Elasticsearch retries the operation until it succeeds.
Most of the compare-and-exchange operations performed by repository analysis atomically increment a counter which is represented as an 8-byte blob.
Some operations also verify the behavior on small blobs with sizes other than 8 bytes.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-repository-analyze`,
  methods: ['POST'],
  patterns: ['_snapshot/{repository}/_analyze'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-repository-analyze',
  parameterTypes: {
    headerParams: [],
    pathParams: ['repository'],
    urlParams: [
      'blob_count',
      'concurrency',
      'detailed',
      'early_read_node_count',
      'max_blob_size',
      'max_total_data_size',
      'rare_action_probability',
      'rarely_abort_writes',
      'read_node_count',
      'register_operation_count',
      'seed',
      'timeout',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(snapshot_repository_analyze_request, 'body'),
    ...getShapeAt(snapshot_repository_analyze_request, 'path'),
    ...getShapeAt(snapshot_repository_analyze_request, 'query'),
  }),
  outputSchema: snapshot_repository_analyze_response,
};
