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
 * Source: /oas_docs/output/kibana.yaml, operations: CreateRule
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { create_rule_request, create_rule_response } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const CREATE_RULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateRule',
  summary: `Create a detection rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new detection rule.
> warn
> When used with [API key](https://www.elastic.co/docs/deploy-manage/api-keys) authentication, the user's key gets assigned to the affected rules. If the user's key gets deleted or the user becomes inactive, the rules will stop running.

> If the API key that is used for authorization has different privileges than the key that created or most recently updated the rule, the rule behavior might change.

You can create the following types of rules:

* **Custom query**: Searches the defined indices and creates an alert when a document matches the rule's KQL query.
* **Event correlation**: Searches the defined indices and creates an alert when results match an [Event Query Language (EQL)](https://www.elastic.co/guide/en/elasticsearch/reference/current/eql.html) query.
* **Threshold**: Searches the defined indices and creates an alert when the number of times the specified field's value meets the threshold during a single execution. When there are multiple values that meet the threshold, an alert is generated for each value.
  For example, if the threshold \`field\` is \`source.ip\` and its \`value\` is \`10\`, an alert is generated for every source IP address that appears in at least 10 of the rule's search results. If you're interested, see [Terms Aggregation](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-terms-aggregation.html) for more information.
* **Indicator match**: Creates an alert when fields match values defined in the specified [Elasticsearch index](https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-create-index.html). For example, you can create an index for IP addresses and use this index to create an alert whenever an event's \`destination.ip\` equals a value in the index. The index's field mappings should be [ECS-compliant](https://www.elastic.co/guide/en/ecs/current/ecs-reference.html).
* **New terms**: Generates an alert for each new term detected in source documents within a specified time range.
* **ES|QL**: Uses [Elasticsearch Query Language (ES|QL)](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html) to find events and aggregate search results.
* **Machine learning rules**: Creates an alert when a machine learning job discovers an anomaly above the defined threshold.
> info
> To create machine learning rules, you must have the [appropriate license](https://www.elastic.co/subscriptions) or use a [cloud deployment](https://cloud.elastic.co/registration). Additionally, for the machine learning rule to function correctly, the associated machine learning job must be running.

To retrieve machine learning job IDs, which are required to create machine learning jobs, call the [Elasticsearch Get jobs API](https://www.elastic.co/guide/en/elasticsearch/reference/current/ml-get-job.html). Machine learning jobs that contain \`siem\` in the \`groups\` field can be used to create rules:

\`\`\`json
...
"job_id": "linux_anomalous_network_activity_ecs",
"job_type": "anomaly_detector",
"job_version": "7.7.0",
"groups": [
  "auditbeat",
  "process",
  "siem"
],
...
\`\`\`

Additionally, you can set up notifications for when rules create alerts. The notifications use the [Alerting and Actions framework](https://www.elastic.co/guide/en/kibana/current/alerting-getting-started.html). Each action type requires a connector. Connectors store the information required to send notifications via external systems. The following connector types are supported for rule notifications:

* Slack
* Email
* PagerDuty
* Webhook
* Microsoft Teams
* IBM Resilient
* Jira
* ServiceNow ITSM
> info
> For more information on PagerDuty fields, see [Send a v2 Event](https://developer.pagerduty.com/docs/events-api-v2/trigger-events/).

To retrieve connector IDs, which are required to configure rule notifications, call the [Find objects API](https://www.elastic.co/guide/en/kibana/current/saved-objects-api-find.html) with \`"type": "action"\` in the request payload.

For detailed information on Kibana actions and alerting, and additional API calls, see:

* [Alerting API](https://www.elastic.co/docs/api/doc/kibana/group/endpoint-alerting)
* [Alerting and Actions framework](https://www.elastic.co/guide/en/kibana/current/alerting-getting-started.html)
* [Connectors API](https://www.elastic.co/docs/api/doc/kibana/group/endpoint-connectors)
`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/rules'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createrule',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(create_rule_request, 'body'),
    ...getShapeAt(create_rule_request, 'path'),
    ...getShapeAt(create_rule_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: create_rule_response,
};
