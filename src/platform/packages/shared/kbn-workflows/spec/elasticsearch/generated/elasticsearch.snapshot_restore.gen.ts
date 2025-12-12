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
 * Source: elasticsearch-specification repository, operations: snapshot-restore
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { snapshot_restore_request, snapshot_restore_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SNAPSHOT_RESTORE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.restore',
  summary: `Restore a snapshot`,
  description: `Restore a snapshot.

Restore a snapshot of a cluster or data streams and indices.

You can restore a snapshot only to a running cluster with an elected master node.
The snapshot repository must be registered and available to the cluster.
The snapshot and cluster versions must be compatible.

To restore a snapshot, the cluster's global metadata must be writable. Ensure there are't any cluster blocks that prevent writes. The restore operation ignores index blocks.

Before you restore a data stream, ensure the cluster contains a matching index template with data streams enabled. To check, use the index management feature in Kibana or the get index template API:

\`\`\`
GET _index_template/*?filter_path=index_templates.name,index_templates.index_template.index_patterns,index_templates.index_template.data_stream
\`\`\`

If no such template exists, you can create one or restore a cluster state that contains one. Without a matching index template, a data stream can't roll over or create backing indices.

If your snapshot contains data from App Search or Workplace Search, you must restore the Enterprise Search encryption key before you restore the snapshot.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-restore`,
  methods: ['POST'],
  patterns: ['_snapshot/{repository}/{snapshot}/_restore'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-restore',
  parameterTypes: {
    headerParams: [],
    pathParams: ['repository', 'snapshot'],
    urlParams: ['master_timeout', 'wait_for_completion'],
    bodyParams: [
      'feature_states',
      'ignore_index_settings',
      'ignore_unavailable',
      'include_aliases',
      'include_global_state',
      'index_settings',
      'indices',
      'partial',
      'rename_pattern',
      'rename_replacement',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(snapshot_restore_request, 'body'),
    ...getShapeAt(snapshot_restore_request, 'path'),
    ...getShapeAt(snapshot_restore_request, 'query'),
  }),
  outputSchema: snapshot_restore_response,
};
