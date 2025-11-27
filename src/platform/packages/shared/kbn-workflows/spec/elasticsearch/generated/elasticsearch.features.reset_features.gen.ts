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
 * Generated at: 2025-11-27T07:04:28.209Z
 * Source: elasticsearch-specification repository, operations: features-reset-features
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  features_reset_features_request,
  features_reset_features_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const FEATURES_RESET_FEATURES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.features.reset_features',
  connectorGroup: 'internal',
  summary: `Reset the features`,
  description: `Reset the features.

Clear all of the state information stored in system indices by Elasticsearch features, including the security and machine learning indices.

WARNING: Intended for development and testing use only. Do not reset features on a production cluster.

Return a cluster to the same state as a new installation by resetting the feature state for all Elasticsearch features.
This deletes all state information stored in system indices.

The response code is HTTP 200 if the state is successfully reset for all features.
It is HTTP 500 if the reset operation failed for any feature.

Note that select features might provide a way to reset particular system indices.
Using this API resets all features, both those that are built-in and implemented as plugins.

To list the features that will be affected, use the get features API.

IMPORTANT: The features installed on the node you submit this request to are the features that will be reset. Run on the master node if you have any doubts about which plugins are installed on individual nodes.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-features-reset-features`,
  methods: ['POST'],
  patterns: ['_features/_reset'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-features-reset-features',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(features_reset_features_request, 'body'),
    ...getShapeAt(features_reset_features_request, 'path'),
    ...getShapeAt(features_reset_features_request, 'query'),
  }),
  outputSchema: features_reset_features_response,
};
