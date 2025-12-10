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
 * Source: elasticsearch-specification repository, operations: ccr-put-auto-follow-pattern
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ccr_put_auto_follow_pattern_request,
  ccr_put_auto_follow_pattern_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CCR_PUT_AUTO_FOLLOW_PATTERN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.put_auto_follow_pattern',
  summary: `Create or update auto-follow patterns`,
  description: `Create or update auto-follow patterns.

Create a collection of cross-cluster replication auto-follow patterns for a remote cluster.
Newly created indices on the remote cluster that match any of the patterns are automatically configured as follower indices.
Indices on the remote cluster that were created before the auto-follow pattern was created will not be auto-followed even if they match the pattern.

This API can also be used to update auto-follow patterns.
NOTE: Follower indices that were configured automatically before updating an auto-follow pattern will remain unchanged even if they do not match against the new patterns.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-put-auto-follow-pattern`,
  methods: ['PUT'],
  patterns: ['_ccr/auto_follow/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-put-auto-follow-pattern',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['master_timeout'],
    bodyParams: [
      'remote_cluster',
      'follow_index_pattern',
      'leader_index_patterns',
      'leader_index_exclusion_patterns',
      'max_outstanding_read_requests',
      'settings',
      'max_outstanding_write_requests',
      'read_poll_timeout',
      'max_read_request_operation_count',
      'max_read_request_size',
      'max_retry_delay',
      'max_write_buffer_count',
      'max_write_buffer_size',
      'max_write_request_operation_count',
      'max_write_request_size',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(ccr_put_auto_follow_pattern_request, 'body'),
    ...getShapeAt(ccr_put_auto_follow_pattern_request, 'path'),
    ...getShapeAt(ccr_put_auto_follow_pattern_request, 'query'),
  }),
  outputSchema: ccr_put_auto_follow_pattern_response,
};
