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
 * Source: /oas_docs/output/kibana.yaml, operations: SetAlertTags
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { set_alert_tags_request, set_alert_tags_response } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema, KibanaStepMetaSchema } from '../../schema';

// export contract
export const SET_ALERT_TAGS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.SetAlertTags',
  summary: `Add and remove detection alert tags`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/tags</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

And tags to detection alerts, and remove them from alerts.
> info
> You cannot add and remove the same alert tag in the same request.
`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/signals/tags'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-setalerttags',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['ids', 'tags'],
  },
  paramsSchema: z.object({
    ...getShapeAt(set_alert_tags_request, 'body'),
    ...getShapeAt(set_alert_tags_request, 'path'),
    ...getShapeAt(set_alert_tags_request, 'query'),
    fetcher: FetcherConfigSchema,
    ...KibanaStepMetaSchema,
  }),
  outputSchema: set_alert_tags_response,
};
