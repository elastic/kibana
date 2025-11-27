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
 * Source: elasticsearch-specification repository, operations: features-get-features
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  features_get_features_request,
  features_get_features_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const FEATURES_GET_FEATURES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.features.get_features',
  connectorGroup: 'internal',
  summary: `Get the features`,
  description: `Get the features.

Get a list of features that can be included in snapshots using the \`feature_states\` field when creating a snapshot.
You can use this API to determine which feature states to include when taking a snapshot.
By default, all feature states are included in a snapshot if that snapshot includes the global state, or none if it does not.

A feature state includes one or more system indices necessary for a given feature to function.
In order to ensure data integrity, all system indices that comprise a feature state are snapshotted and restored together.

The features listed by this API are a combination of built-in features and features defined by plugins.
In order for a feature state to be listed in this API and recognized as a valid feature state by the create snapshot API, the plugin that defines that feature must be installed on the master node.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-features-get-features`,
  methods: ['GET'],
  patterns: ['_features'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-features-get-features',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(features_get_features_request, 'body'),
    ...getShapeAt(features_get_features_request, 'path'),
    ...getShapeAt(features_get_features_request, 'query'),
  }),
  outputSchema: features_get_features_response,
};
