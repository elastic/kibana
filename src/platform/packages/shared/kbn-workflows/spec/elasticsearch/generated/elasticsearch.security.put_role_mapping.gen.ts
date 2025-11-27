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
 * Generated at: 2025-11-27T07:43:24.916Z
 * Source: elasticsearch-specification repository, operations: security-put-role-mapping, security-put-role-mapping-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_put_role_mapping1_request,
  security_put_role_mapping1_response,
  security_put_role_mapping_request,
  security_put_role_mapping_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_PUT_ROLE_MAPPING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.put_role_mapping',
  connectorGroup: 'internal',
  summary: `Create or update role mappings`,
  description: `Create or update role mappings.

Role mappings define which roles are assigned to each user.
Each mapping has rules that identify users and a list of roles that are granted to those users.
The role mapping APIs are generally the preferred way to manage role mappings rather than using role mapping files. The create or update role mappings API cannot update role mappings that are defined in role mapping files.

NOTE: This API does not create roles. Rather, it maps users to existing roles.
Roles can be created by using the create or update roles API or roles files.

**Role templates**

The most common use for role mappings is to create a mapping from a known value on the user to a fixed role name.
For example, all users in the \`cn=admin,dc=example,dc=com\` LDAP group should be given the superuser role in Elasticsearch.
The \`roles\` field is used for this purpose.

For more complex needs, it is possible to use Mustache templates to dynamically determine the names of the roles that should be granted to the user.
The \`role_templates\` field is used for this purpose.

NOTE: To use role templates successfully, the relevant scripting feature must be enabled.
Otherwise, all attempts to create a role mapping with role templates fail.

All of the user fields that are available in the role mapping rules are also available in the role templates.
Thus it is possible to assign a user to a role that reflects their username, their groups, or the name of the realm to which they authenticated.

By default a template is evaluated to produce a single string that is the name of the role which should be assigned to the user.
If the format of the template is set to "json" then the template is expected to produce a JSON string or an array of JSON strings for the role names.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-role-mapping`,
  methods: ['PUT', 'POST'],
  patterns: ['_security/role_mapping/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-role-mapping',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['refresh'],
    bodyParams: ['enabled', 'metadata', 'roles', 'role_templates', 'rules', 'run_as'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(security_put_role_mapping_request, 'body'),
      ...getShapeAt(security_put_role_mapping_request, 'path'),
      ...getShapeAt(security_put_role_mapping_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_put_role_mapping1_request, 'body'),
      ...getShapeAt(security_put_role_mapping1_request, 'path'),
      ...getShapeAt(security_put_role_mapping1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([security_put_role_mapping_response, security_put_role_mapping1_response]),
};
