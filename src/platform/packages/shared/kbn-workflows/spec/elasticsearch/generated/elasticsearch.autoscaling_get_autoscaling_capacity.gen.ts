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
 * Source: elasticsearch-specification repository, operations:
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const AUTOSCALING_GET_AUTOSCALING_CAPACITY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.autoscaling.get_autoscaling_capacity',
  summary: null,
  description: `Get the autoscaling capacity.

NOTE: This feature is designed for indirect use by Elasticsearch Service, Elastic Cloud Enterprise, and Elastic Cloud on Kubernetes. Direct use is not supported.

This API gets the current autoscaling capacity based on the configured autoscaling policy.
It will return information to size the cluster appropriately to the current workload.

The \`required_capacity\` is calculated as the maximum of the \`required_capacity\` result of all individual deciders that are enabled for the policy.

The operator should verify that the \`current_nodes\` match the operator’s knowledge of the cluster to avoid making autoscaling decisions based on stale or incomplete information.

The response contains decider-specific information you can use to diagnose how and why autoscaling determined a certain capacity was required.
This information is provided for diagnosis only.
Do not use this information to make autoscaling decisions.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-autoscaling-get-autoscaling-capacity`,
  methods: ['GET'],
  patterns: ['_autoscaling/capacity'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-autoscaling-get-autoscaling-capacity',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.object({})),
  outputSchema: z.optional(z.looseObject({})),
};
