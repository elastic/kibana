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
 * Source: /oas_docs/output/kibana.yaml, operations: PersistNoteRoute
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  persist_note_route_request,
  persist_note_route_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const PERSIST_NOTE_ROUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PersistNoteRoute',
  summary: `Add or update a note`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/note</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Add a note to a Timeline or update an existing note.`,
  methods: ['PATCH'],
  patterns: ['/api/note'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-persistnoteroute',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['note', 'noteId', 'version'],
  },
  paramsSchema: z.object({
    ...getShapeAt(persist_note_route_request, 'body'),
    ...getShapeAt(persist_note_route_request, 'path'),
    ...getShapeAt(persist_note_route_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: persist_note_route_response,
};
