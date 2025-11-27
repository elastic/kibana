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
 * Generated at: 2025-11-27T07:04:28.260Z
 * Source: elasticsearch-specification repository, operations: transform-set-upgrade-mode
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  transform_set_upgrade_mode_request,
  transform_set_upgrade_mode_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const TRANSFORM_SET_UPGRADE_MODE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.set_upgrade_mode',
  connectorGroup: 'internal',
  summary: `Set upgrade_mode for transform indices`,
  description: `Set upgrade_mode for transform indices.

Sets a cluster wide upgrade_mode setting that prepares transform
indices for an upgrade.
When upgrading your cluster, in some circumstances you must restart your
nodes and reindex your transform indices. In those circumstances,
there must be no transforms running. You can close the transforms,
do the upgrade, then open all the transforms again. Alternatively,
you can use this API to temporarily halt tasks associated with the transforms
and prevent new transforms from opening. You can also use this API
during upgrades that do not require you to reindex your transform
indices, though stopping transforms is not a requirement in that case.
You can see the current value for the upgrade_mode setting by using the get
transform info API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-set-upgrade-mode`,
  methods: ['POST'],
  patterns: ['_transform/set_upgrade_mode'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-set-upgrade-mode',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['enabled', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(transform_set_upgrade_mode_request, 'body'),
    ...getShapeAt(transform_set_upgrade_mode_request, 'path'),
    ...getShapeAt(transform_set_upgrade_mode_request, 'query'),
  }),
  outputSchema: transform_set_upgrade_mode_response,
};
