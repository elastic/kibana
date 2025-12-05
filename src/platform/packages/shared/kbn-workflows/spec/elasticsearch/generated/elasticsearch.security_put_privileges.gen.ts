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
 * Source: elasticsearch-specification repository, operations: security-put-privileges, security-put-privileges-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_put_privileges1_request,
  security_put_privileges1_response,
  security_put_privileges_request,
  security_put_privileges_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_PUT_PRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.put_privileges',
  summary: `Create or update application privileges`,
  description: `Create or update application privileges.

To use this API, you must have one of the following privileges:

* The \`manage_security\` cluster privilege (or a greater privilege such as \`all\`).
* The "Manage Application Privileges" global privilege for the application being referenced in the request.

Application names are formed from a prefix, with an optional suffix that conform to the following rules:

* The prefix must begin with a lowercase ASCII letter.
* The prefix must contain only ASCII letters or digits.
* The prefix must be at least 3 characters long.
* If the suffix exists, it must begin with either a dash \`-\` or \`_\`.
* The suffix cannot contain any of the following characters: \`\\\`, \`/\`, \`*\`, \`?\`, \`"\`, \`<\`, \`>\`, \`|\`, \`,\`, \`*\`.
* No part of the name can contain whitespace.

Privilege names must begin with a lowercase ASCII letter and must contain only ASCII letters and digits along with the characters \`_\`, \`-\`, and \`.\`.

Action names can contain any number of printable ASCII characters and must contain at least one of the following characters: \`/\`, \`*\`, \`:\`.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-privileges`,
  methods: ['PUT', 'POST'],
  patterns: ['_security/privilege'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-privileges',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(security_put_privileges_request, 'body'),
      ...getShapeAt(security_put_privileges_request, 'path'),
      ...getShapeAt(security_put_privileges_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_put_privileges1_request, 'body'),
      ...getShapeAt(security_put_privileges1_request, 'path'),
      ...getShapeAt(security_put_privileges1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([security_put_privileges_response, security_put_privileges1_response]),
};
