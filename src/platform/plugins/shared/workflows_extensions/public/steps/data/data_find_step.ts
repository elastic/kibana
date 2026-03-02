/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { dataFindStepCommonDefinition } from '../../../common/steps/data';
import { ActionsMenuGroup, type PublicStepDefinition } from '../../step_registry/types';

export const dataFindStepDefinition: PublicStepDefinition = {
  ...dataFindStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/search').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.translate('workflowsExtensions.dataFindStep.label', {
    defaultMessage: 'Find First Match',
  }),
  description: i18n.translate('workflowsExtensions.dataFindStep.description', {
    defaultMessage: 'Find the first item in an array matching a KQL condition',
  }),
  actionsMenuGroup: ActionsMenuGroup.data,
  documentation: {
    details: `The data.find step finds the first item in an array matching a KQL condition. Use \`item.field\` to reference item properties and \`index\` to access the item's position. Always returns \`{ item, matchIndex }\`. Use \`errorIfEmpty: true\` to return an error instead of null when no match is found.`,
    examples: [
      `## Find first matching item
\`\`\`yaml
- name: find-primary-owner
  type: data.find
  items: "\${{ steps.fetch_users.output }}"
  with:
    condition: "item.role: primary_owner"

# Output: { item: { role: "primary_owner", ... }, matchIndex: 2 }
# Or if no match: { item: null, matchIndex: null }
\`\`\``,

      `## Find with complex condition
\`\`\`yaml
- name: find-critical-alert
  type: data.find
  items: "\${{ steps.fetch_alerts.output }}"
  with:
    condition: "item.status: active AND item.severity >= 4"

# Output: First active alert with severity 4 or higher
\`\`\``,

      `## Error if no match found
\`\`\`yaml
- name: find-required-config
  type: data.find
  items: "\${{ steps.fetch_configs.output }}"
  with:
    condition: "item.name: production"
    errorIfEmpty: true

# Returns error if no config with name "production" is found
\`\`\``,

      `## Access the matched item and its index
\`\`\`yaml
- name: find-enabled
  type: data.find
  items: "\${{ steps.fetch_data.output }}"
  with:
    condition: "item.enabled: true"

- name: log-result
  type: console
  with:
    message: "Found item at index {{steps.find-enabled.output.matchIndex}}: {{steps.find-enabled.output.item | json}}"
\`\`\``,

      `## Find using index
\`\`\`yaml
- name: find-after-index
  type: data.find
  items: "\${{ steps.fetch_items.output }}"
  with:
    condition: "index >= 10 AND item.status: pending"

# Output: First pending item at index 10 or later
\`\`\``,

      `## Find with wildcards
\`\`\`yaml
- name: find-error-log
  type: data.find
  items: "\${{ steps.fetch_logs.output }}"
  with:
    condition: "item.level: error AND item.message: *timeout*"

# Output: First error log containing "timeout" in the message
\`\`\``,
    ],
  },
};
