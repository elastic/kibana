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
 * Source: elasticsearch-specification repository, operations: ml-set-upgrade-mode
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_set_upgrade_mode_request,
  ml_set_upgrade_mode_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_SET_UPGRADE_MODE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.set_upgrade_mode',
  summary: `Set upgrade_mode for ML indices`,
  description: `Set upgrade_mode for ML indices.

Sets a cluster wide upgrade_mode setting that prepares machine learning
indices for an upgrade.
When upgrading your cluster, in some circumstances you must restart your
nodes and reindex your machine learning indices. In those circumstances,
there must be no machine learning jobs running. You can close the machine
learning jobs, do the upgrade, then open all the jobs again. Alternatively,
you can use this API to temporarily halt tasks associated with the jobs and
datafeeds and prevent new jobs from opening. You can also use this API
during upgrades that do not require you to reindex your machine learning
indices, though stopping jobs is not a requirement in that case.
You can see the current value for the upgrade_mode setting by using the get
machine learning info API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-set-upgrade-mode`,
  methods: ['POST'],
  patterns: ['_ml/set_upgrade_mode'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-set-upgrade-mode',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['enabled', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_set_upgrade_mode_request, 'body'),
    ...getShapeAt(ml_set_upgrade_mode_request, 'path'),
    ...getShapeAt(ml_set_upgrade_mode_request, 'query'),
  }),
  outputSchema: ml_set_upgrade_mode_response,
};
