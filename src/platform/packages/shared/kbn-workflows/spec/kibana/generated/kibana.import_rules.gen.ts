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
 * Source: /oas_docs/output/kibana.yaml, operations: ImportRules
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { import_rules_request, import_rules_response } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const IMPORT_RULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ImportRules',
  summary: `Import detection rules`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/_import</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Import detection rules from an \`.ndjson\` file, including actions and exception lists. The request must include:
- The \`Content-Type: multipart/form-data\` HTTP header.
- A link to the \`.ndjson\` file containing the rules.
> warn
> When used with [API key](https://www.elastic.co/docs/deploy-manage/api-keys) authentication, the user's key gets assigned to the affected rules. If the user's key gets deleted or the user becomes inactive, the rules will stop running.

> If the API key that is used for authorization has different privileges than the key that created or most recently updated the rule, the rule behavior might change.
> info
> To import rules with actions, you need at least Read privileges for the Action and Connectors feature. To overwrite or add new connectors, you need All privileges for the Actions and Connectors feature. To import rules without actions, you don’t need Actions and Connectors privileges. Refer to [Enable and access detections](https://www.elastic.co/guide/en/security/current/detections-permissions-section.html#enable-detections-ui) for more information.

> info
> Rule actions and connectors are included in the exported file, but sensitive information about the connector (such as authentication credentials) is not included. You must re-add missing connector details after importing detection rules.

> You can use Kibana’s [Saved Objects](https://www.elastic.co/guide/en/kibana/current/managing-saved-objects.html) UI (Stack Management → Kibana → Saved Objects) or the Saved Objects APIs (experimental) to [export](https://www.elastic.co/docs/api/doc/kibana/operation/operation-exportsavedobjectsdefault) and [import](https://www.elastic.co/docs/api/doc/kibana/operation/operation-importsavedobjectsdefault) any necessary connectors before importing detection rules.

> Similarly, any value lists used for rule exceptions are not included in rule exports or imports. Use the [Manage value lists](https://www.elastic.co/guide/en/security/current/value-lists-exceptions.html#manage-value-lists) UI (Rules → Detection rules (SIEM) → Manage value lists) to export and import value lists separately.
`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/rules/_import'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-importrules',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['overwrite', 'overwrite_exceptions', 'overwrite_action_connectors', 'as_new_list'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(import_rules_request, 'body'),
    ...getShapeAt(import_rules_request, 'path'),
    ...getShapeAt(import_rules_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: import_rules_response,
};
