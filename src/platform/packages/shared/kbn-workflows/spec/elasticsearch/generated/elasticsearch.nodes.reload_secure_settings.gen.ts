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
 * Generated at: 2025-11-27T07:43:24.904Z
 * Source: elasticsearch-specification repository, operations: nodes-reload-secure-settings, nodes-reload-secure-settings-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  nodes_reload_secure_settings1_request,
  nodes_reload_secure_settings1_response,
  nodes_reload_secure_settings_request,
  nodes_reload_secure_settings_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const NODES_RELOAD_SECURE_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.nodes.reload_secure_settings',
  connectorGroup: 'internal',
  summary: `Reload the keystore on nodes in the cluster`,
  description: `Reload the keystore on nodes in the cluster.

Secure settings are stored in an on-disk keystore. Certain of these settings are reloadable.
That is, you can change them on disk and reload them without restarting any nodes in the cluster.
When you have updated reloadable secure settings in your keystore, you can use this API to reload those settings on each node.

When the Elasticsearch keystore is password protected and not simply obfuscated, you must provide the password for the keystore when you reload the secure settings.
Reloading the settings for the whole cluster assumes that the keystores for all nodes are protected with the same password; this method is allowed only when inter-node communications are encrypted.
Alternatively, you can reload the secure settings on each node by locally accessing the API and passing the node-specific Elasticsearch keystore password.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-reload-secure-settings`,
  methods: ['POST'],
  patterns: ['_nodes/reload_secure_settings', '_nodes/{node_id}/reload_secure_settings'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-reload-secure-settings',
  parameterTypes: {
    headerParams: [],
    pathParams: ['node_id'],
    urlParams: ['timeout'],
    bodyParams: ['secure_settings_password'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(nodes_reload_secure_settings_request, 'body'),
      ...getShapeAt(nodes_reload_secure_settings_request, 'path'),
      ...getShapeAt(nodes_reload_secure_settings_request, 'query'),
    }),
    z.object({
      ...getShapeAt(nodes_reload_secure_settings1_request, 'body'),
      ...getShapeAt(nodes_reload_secure_settings1_request, 'path'),
      ...getShapeAt(nodes_reload_secure_settings1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    nodes_reload_secure_settings_response,
    nodes_reload_secure_settings1_response,
  ]),
};
