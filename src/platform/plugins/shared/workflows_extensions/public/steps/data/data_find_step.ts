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
import { dataFindStepCommonDefinition, DataFindStepTypeId } from '../../../common/steps/data';
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
    details: i18n.translate('workflowsExtensions.dataFindStep.documentation.details', {
      defaultMessage: `The ${DataFindStepTypeId} step finds the first item in an array matching a KQL condition. Use {itemSyntax} to reference item properties and {indexSyntax} to access the item's position. Always returns {outputShape}. Use {errorIfEmptySyntax} to return an error instead of null when no match is found.`,
      values: {
        itemSyntax: '`item.field`',
        indexSyntax: '`index`',
        outputShape: '`{ item, index }`',
        errorIfEmptySyntax: '`errorIfEmpty: true`',
      },
    }),
    examples: [
      i18n.translate('workflowsExtensions.dataFindStep.documentation.example1', {
        defaultMessage: `## Find first matching item
\`\`\`yaml
- name: find-primary-owner
  type: ${DataFindStepTypeId}
  items: "\${{ steps.fetch_users.output }}"
  with:
    condition: "item.role: primary_owner"

# Output: { item: { role: "primary_owner", ... }, index: 2 }
# Or if no match: { item: null, index: null }
\`\`\``,
      }),

      i18n.translate('workflowsExtensions.dataFindStep.documentation.example2', {
        defaultMessage: `## Find with complex condition
\`\`\`yaml
- name: find-critical-alert
  type: ${DataFindStepTypeId}
  items: "\${{ steps.fetch_alerts.output }}"
  with:
    condition: "item.status: active AND item.severity >= 4"

# Output: First active alert with severity 4 or higher
\`\`\``,
      }),

      i18n.translate('workflowsExtensions.dataFindStep.documentation.example3', {
        defaultMessage: `## Error if no match found
\`\`\`yaml
- name: find-required-config
  type: ${DataFindStepTypeId}
  items: "\${{ steps.fetch_configs.output }}"
  with:
    condition: "item.name: production"
    errorIfEmpty: true

# Returns error if no config with name "production" is found
\`\`\``,
      }),

      i18n.translate('workflowsExtensions.dataFindStep.documentation.example4', {
        defaultMessage: `## Access the matched item and its index
\`\`\`yaml
- name: find-enabled
  type: ${DataFindStepTypeId}
  items: "\${{ steps.fetch_data.output }}"
  with:
    condition: "item.enabled: true"

- name: log-result
  type: console
  with:
    message: "Found item at index {{steps.find-enabled.output.index}}: {{steps.find-enabled.output.item | json}}"
\`\`\``,
      }),

      i18n.translate('workflowsExtensions.dataFindStep.documentation.example5', {
        defaultMessage: `## Find using index
\`\`\`yaml
- name: find-after-index
  type: ${DataFindStepTypeId}
  items: "\${{ steps.fetch_items.output }}"
  with:
    condition: "index >= 10 AND item.status: pending"

# Output: First pending item at index 10 or later
\`\`\``,
      }),

      i18n.translate('workflowsExtensions.dataFindStep.documentation.example6', {
        defaultMessage: `## Find with wildcards
\`\`\`yaml
- name: find-error-log
  type: ${DataFindStepTypeId}
  items: "\${{ steps.fetch_logs.output }}"
  with:
    condition: "item.level: error AND item.message: *timeout*"

# Output: First error log containing "timeout" in the message
\`\`\``,
      }),
    ],
  },
};
