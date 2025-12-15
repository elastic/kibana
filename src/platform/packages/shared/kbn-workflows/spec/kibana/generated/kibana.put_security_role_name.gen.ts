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
 * Source: /oas_docs/output/kibana.yaml, operations: put-security-role-name
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { put_security_role_name_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const PUT_SECURITY_ROLE_NAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_security_role_name',
  summary: `Create or update a role`,
  description: `Create a new Kibana role or update the attributes of an existing role. Kibana roles are stored in the Elasticsearch native realm.`,
  methods: ['PUT'],
  patterns: ['/api/security/role/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put-security-role-name',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name'],
    urlParams: ['createOnly'],
    bodyParams: ['description', 'elasticsearch', 'kibana', 'metadata'],
  },
  paramsSchema: z.object({
    ...getShapeAt(put_security_role_name_request, 'body'),
    ...getShapeAt(put_security_role_name_request, 'path'),
    ...getShapeAt(put_security_role_name_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
