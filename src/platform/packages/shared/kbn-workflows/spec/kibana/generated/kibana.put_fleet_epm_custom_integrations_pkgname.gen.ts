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
 * Source: /oas_docs/output/kibana.yaml, operations: put-fleet-epm-custom-integrations-pkgname
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { put_fleet_epm_custom_integrations_pkgname_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const PUT_FLEET_EPM_CUSTOM_INTEGRATIONS_PKGNAME_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_fleet_epm_custom_integrations_pkgname',
  summary: `Update a custom integration`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/custom_integrations/{pkgName}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: fleet-settings-all AND integrations-all.`,
  methods: ['PUT'],
  patterns: ['/api/fleet/epm/custom_integrations/{pkgName}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put-fleet-epm-custom-integrations-pkgname',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['pkgName'],
    urlParams: [],
    bodyParams: ['categories', 'readMeData'],
  },
  paramsSchema: z.object({
    ...getShapeAt(put_fleet_epm_custom_integrations_pkgname_request, 'body'),
    ...getShapeAt(put_fleet_epm_custom_integrations_pkgname_request, 'path'),
    ...getShapeAt(put_fleet_epm_custom_integrations_pkgname_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
