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
 * Source: elasticsearch-specification repository, operations: cluster-put-settings
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cluster_put_settings_request,
  cluster_put_settings_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CLUSTER_PUT_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.put_settings',
  summary: `Update the cluster settings`,
  description: `Update the cluster settings.

Configure and update dynamic settings on a running cluster.
You can also configure dynamic settings locally on an unstarted or shut down node in \`elasticsearch.yml\`.

Updates made with this API can be persistent, which apply across cluster restarts, or transient, which reset after a cluster restart.
You can also reset transient or persistent settings by assigning them a null value.

If you configure the same setting using multiple methods, Elasticsearch applies the settings in following order of precedence: 1) Transient setting; 2) Persistent setting; 3) \`elasticsearch.yml\` setting; 4) Default setting value.
For example, you can apply a transient setting to override a persistent setting or \`elasticsearch.yml\` setting.
However, a change to an \`elasticsearch.yml\` setting will not override a defined transient or persistent setting.

TIP: In Elastic Cloud, use the user settings feature to configure all cluster settings. This method automatically rejects unsafe settings that could break your cluster.
If you run Elasticsearch on your own hardware, use this API to configure dynamic cluster settings.
Only use \`elasticsearch.yml\` for static cluster settings and node settings.
The API doesn’t require a restart and ensures a setting’s value is the same on all nodes.

WARNING: Transient cluster settings are no longer recommended. Use persistent cluster settings instead.
If a cluster becomes unstable, transient settings can clear unexpectedly, resulting in a potentially undesired cluster configuration.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-settings`,
  methods: ['PUT'],
  patterns: ['_cluster/settings'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-settings',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['flat_settings', 'master_timeout', 'timeout'],
    bodyParams: ['persistent', 'transient'],
  },
  paramsSchema: z.object({
    ...getShapeAt(cluster_put_settings_request, 'body'),
    ...getShapeAt(cluster_put_settings_request, 'path'),
    ...getShapeAt(cluster_put_settings_request, 'query'),
  }),
  outputSchema: cluster_put_settings_response,
};
