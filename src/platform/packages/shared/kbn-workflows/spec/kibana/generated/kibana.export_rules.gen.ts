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
 * Source: /oas_docs/output/kibana.yaml, operations: ExportRules
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { export_rules_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const EXPORT_RULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ExportRules',
  summary: `Export detection rules`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/_export</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Export detection rules to an \`.ndjson\` file. The following configuration items are also included in the \`.ndjson\` file:
- Actions
- Exception lists
> info
> Rule actions and connectors are included in the exported file, but sensitive information about the connector (such as authentication credentials) is not included. You must re-add missing connector details after importing detection rules.

> You can use Kibana’s [Saved Objects](https://www.elastic.co/guide/en/kibana/current/managing-saved-objects.html) UI (Stack Management → Kibana → Saved Objects) or the Saved Objects APIs (experimental) to [export](https://www.elastic.co/docs/api/doc/kibana/operation/operation-exportsavedobjectsdefault) and [import](https://www.elastic.co/docs/api/doc/kibana/operation/operation-importsavedobjectsdefault) any necessary connectors before importing detection rules.

> Similarly, any value lists used for rule exceptions are not included in rule exports or imports. Use the [Manage value lists](https://www.elastic.co/guide/en/security/current/value-lists-exceptions.html#manage-value-lists) UI (Rules → Detection rules (SIEM) → Manage value lists) to export and import value lists separately.
`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/rules/_export'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-exportrules',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['exclude_export_details', 'file_name'],
    bodyParams: ['objects'],
  },
  paramsSchema: z.object({
    ...getShapeAt(export_rules_request, 'body'),
    ...getShapeAt(export_rules_request, 'path'),
    ...getShapeAt(export_rules_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
