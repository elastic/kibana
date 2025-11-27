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
 * Generated at: 2025-11-27T07:04:28.256Z
 * Source: elasticsearch-specification repository, operations: snapshot-repository-verify-integrity
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  snapshot_repository_verify_integrity_request,
  snapshot_repository_verify_integrity_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SNAPSHOT_REPOSITORY_VERIFY_INTEGRITY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.repository_verify_integrity',
  connectorGroup: 'internal',
  summary: `Verify the repository integrity`,
  description: `Verify the repository integrity.

Verify the integrity of the contents of a snapshot repository.

This API enables you to perform a comprehensive check of the contents of a repository, looking for any anomalies in its data or metadata which might prevent you from restoring snapshots from the repository or which might cause future snapshot create or delete operations to fail.

If you suspect the integrity of the contents of one of your snapshot repositories, cease all write activity to this repository immediately, set its \`read_only\` option to \`true\`, and use this API to verify its integrity.
Until you do so:

* It may not be possible to restore some snapshots from this repository.
* Searchable snapshots may report errors when searched or may have unassigned shards.
* Taking snapshots into this repository may fail or may appear to succeed but have created a snapshot which cannot be restored.
* Deleting snapshots from this repository may fail or may appear to succeed but leave the underlying data on disk.
* Continuing to write to the repository while it is in an invalid state may causing additional damage to its contents.

If the API finds any problems with the integrity of the contents of your repository, Elasticsearch will not be able to repair the damage.
The only way to bring the repository back into a fully working state after its contents have been damaged is by restoring its contents from a repository backup which was taken before the damage occurred.
You must also identify what caused the damage and take action to prevent it from happening again.

If you cannot restore a repository backup, register a new repository and use this for all future snapshot operations.
In some cases it may be possible to recover some of the contents of a damaged repository, either by restoring as many of its snapshots as needed and taking new snapshots of the restored data, or by using the reindex API to copy data from any searchable snapshots mounted from the damaged repository.

Avoid all operations which write to the repository while the verify repository integrity API is running.
If something changes the repository contents while an integrity verification is running then Elasticsearch may incorrectly report having detected some anomalies in its contents due to the concurrent writes.
It may also incorrectly fail to report some anomalies that the concurrent writes prevented it from detecting.

NOTE: This API is intended for exploratory use by humans. You should expect the request parameters and the response format to vary in future versions.

NOTE: This API may not work correctly in a mixed-version cluster.

The default values for the parameters of this API are designed to limit the impact of the integrity verification on other activities in your cluster.
For instance, by default it will only use at most half of the \`snapshot_meta\` threads to verify the integrity of each snapshot, allowing other snapshot operations to use the other half of this thread pool.
If you modify these parameters to speed up the verification process, you risk disrupting other snapshot-related operations in your cluster.
For large repositories, consider setting up a separate single-node Elasticsearch cluster just for running the integrity verification API.

The response exposes implementation details of the analysis which may change from version to version.
The response body format is therefore not considered stable and may be different in newer versions.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-repository-verify-integrity`,
  methods: ['POST'],
  patterns: ['_snapshot/{repository}/_verify_integrity'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-repository-verify-integrity',
  parameterTypes: {
    headerParams: [],
    pathParams: ['repository'],
    urlParams: [
      'blob_thread_pool_concurrency',
      'index_snapshot_verification_concurrency',
      'index_verification_concurrency',
      'max_bytes_per_sec',
      'max_failed_shard_snapshots',
      'meta_thread_pool_concurrency',
      'snapshot_verification_concurrency',
      'verify_blob_contents',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(snapshot_repository_verify_integrity_request, 'body'),
    ...getShapeAt(snapshot_repository_verify_integrity_request, 'path'),
    ...getShapeAt(snapshot_repository_verify_integrity_request, 'query'),
  }),
  outputSchema: snapshot_repository_verify_integrity_response,
};
