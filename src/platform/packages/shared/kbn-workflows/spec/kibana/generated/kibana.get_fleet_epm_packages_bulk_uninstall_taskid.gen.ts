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
 * Source: /oas_docs/output/kibana.yaml, operations: get-fleet-epm-packages-bulk-uninstall-taskid
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  get_fleet_epm_packages_bulk_uninstall_taskid_request,
  get_fleet_epm_packages_bulk_uninstall_taskid_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const GET_FLEET_EPM_PACKAGES_BULK_UNINSTALL_TASKID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_fleet_epm_packages_bulk_uninstall_taskid',
  summary: `Get Bulk uninstall packages details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/epm/packages/_bulk_uninstall/{taskId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: integrations-all AND fleet-agent-policies-all.`,
  methods: ['GET'],
  patterns: ['/api/fleet/epm/packages/_bulk_uninstall/{taskId}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get-fleet-epm-packages-bulk-uninstall-taskid',
  parameterTypes: {
    headerParams: [],
    pathParams: ['taskId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(get_fleet_epm_packages_bulk_uninstall_taskid_request, 'body'),
    ...getShapeAt(get_fleet_epm_packages_bulk_uninstall_taskid_request, 'path'),
    ...getShapeAt(get_fleet_epm_packages_bulk_uninstall_taskid_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: get_fleet_epm_packages_bulk_uninstall_taskid_response,
};
