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
 * Source: /oas_docs/output/kibana.yaml, operations: delete-fleet-agents-files-fileid
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  delete_fleet_agents_files_fileid_request,
  delete_fleet_agents_files_fileid_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const DELETE_FLEET_AGENTS_FILES_FILEID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_agents_files_fileid',
  summary: `Delete an uploaded file`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/agents/files/{fileId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a file uploaded by an agent.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/agents/files/{fileId}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete-fleet-agents-files-fileid',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['fileId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(delete_fleet_agents_files_fileid_request, 'body'),
    ...getShapeAt(delete_fleet_agents_files_fileid_request, 'path'),
    ...getShapeAt(delete_fleet_agents_files_fileid_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: delete_fleet_agents_files_fileid_response,
};
