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
 * Source: elasticsearch-specification repository, operations: security-create-api-key
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';
import type { InternalConnectorContract } from '../../../types/latest';

export const SECURITY_CREATE_API_KEY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.create_api_key',
  summary: `Create an API key`,
  description: `Create an API key for access without requiring basic authentication.

Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-api-key`,
  methods: ['POST', 'PUT'],
  patterns: ['_security/api_key'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-api-key',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['refresh'],
    bodyParams: ['expiration', 'metadata', 'name', 'role_descriptors'],
  },
  paramsSchema: z.object({
    expiration: z.optional(z.string()),
    metadata: z.optional(z.record(z.string(), z.unknown())),
    name: z.string(),
    refresh: z.optional(z.enum(['true', 'false', 'wait_for'])),
    role_descriptors: z.optional(z.record(z.string(), z.unknown())),
  }),
  outputSchema: z.object({
    api_key: z.string(),
    encoded: z.string(),
    expiration: z.optional(z.number()),
    id: z.string(),
    name: z.string(),
  }),
};
