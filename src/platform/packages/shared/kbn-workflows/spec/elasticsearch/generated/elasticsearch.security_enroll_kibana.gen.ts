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
 * Source: elasticsearch-specification repository, operations: security-enroll-kibana
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_enroll_kibana_request,
  security_enroll_kibana_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_ENROLL_KIBANA_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.enroll_kibana',
  summary: `Enroll Kibana`,
  description: `Enroll Kibana.

Enable a Kibana instance to configure itself for communication with a secured Elasticsearch cluster.

NOTE: This API is currently intended for internal use only by Kibana.
Kibana uses this API internally to configure itself for communications with an Elasticsearch cluster that already has security features enabled.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-enroll-kibana`,
  methods: ['GET'],
  patterns: ['_security/enroll/kibana'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-enroll-kibana',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_enroll_kibana_request, 'body'),
    ...getShapeAt(security_enroll_kibana_request, 'path'),
    ...getShapeAt(security_enroll_kibana_request, 'query'),
  }),
  outputSchema: security_enroll_kibana_response,
};
