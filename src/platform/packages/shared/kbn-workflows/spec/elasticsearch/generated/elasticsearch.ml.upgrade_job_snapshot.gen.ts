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
 * Generated at: 2025-11-27T07:43:24.903Z
 * Source: elasticsearch-specification repository, operations: ml-upgrade-job-snapshot
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_upgrade_job_snapshot_request,
  ml_upgrade_job_snapshot_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_UPGRADE_JOB_SNAPSHOT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.upgrade_job_snapshot',
  connectorGroup: 'internal',
  summary: `Upgrade a snapshot`,
  description: `Upgrade a snapshot.

Upgrade an anomaly detection model snapshot to the latest major version.
Over time, older snapshot formats are deprecated and removed. Anomaly
detection jobs support only snapshots that are from the current or previous
major version.
This API provides a means to upgrade a snapshot to the current major version.
This aids in preparing the cluster for an upgrade to the next major version.
Only one snapshot per anomaly detection job can be upgraded at a time and the
upgraded snapshot cannot be the current snapshot of the anomaly detection
job.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-upgrade-job-snapshot`,
  methods: ['POST'],
  patterns: ['_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_upgrade'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-upgrade-job-snapshot',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id', 'snapshot_id'],
    urlParams: ['wait_for_completion', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_upgrade_job_snapshot_request, 'body'),
    ...getShapeAt(ml_upgrade_job_snapshot_request, 'path'),
    ...getShapeAt(ml_upgrade_job_snapshot_request, 'query'),
  }),
  outputSchema: ml_upgrade_job_snapshot_response,
};
