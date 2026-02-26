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
import { dataFilterStepCommonDefinition, DataFilterStepTypeId } from '../../../common/steps/data';
import { ActionsMenuGroup, type PublicStepDefinition } from '../../step_registry/types';

export const dataFilterStepDefinition: PublicStepDefinition = {
  ...dataFilterStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/filter').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.translate('workflowsExtensions.dataFilterStep.label', {
    defaultMessage: 'Filter Collection',
  }),
  description: i18n.translate('workflowsExtensions.dataFilterStep.description', {
    defaultMessage: 'Filter arrays using KQL conditions to return only matching items',
  }),
  actionsMenuGroup: ActionsMenuGroup.data,
  documentation: {
    details: i18n.translate('workflowsExtensions.dataFilterStep.documentation.details', {
      defaultMessage: `The ${DataFilterStepTypeId} step filters arrays using Kibana Query Language (KQL) conditions. Use {itemSyntax} to reference item properties and {indexSyntax} to access the item's position. Always returns an array of matching items. Use {limitSyntax} to cap the number of matches returned.`,
      values: {
        itemSyntax: '`item.field`',
        indexSyntax: '`index`',
        limitSyntax: '`limit`',
      },
    }),
    examples: [
      i18n.translate('workflowsExtensions.dataFilterStep.documentation.example1', {
        defaultMessage: `## Filter by single field
\`\`\`yaml
- name: get-active-incidents
  type: ${DataFilterStepTypeId}
  items: "\${{ steps.fetch_incidents.output }}"
  with:
    condition: "item.state: active"

# Output: Array of items where state equals "active"
\`\`\``,
      }),

      i18n.translate('workflowsExtensions.dataFilterStep.documentation.example2', {
        defaultMessage: `## Filter with complex KQL condition
\`\`\`yaml
- name: filter-critical-alerts
  type: ${DataFilterStepTypeId}
  items: "\${{ steps.fetch_alerts.output }}"
  with:
    condition: "item.status: active AND item.severity > 2"

# Output: Array of active alerts with severity greater than 2
\`\`\``,
      }),

      i18n.translate('workflowsExtensions.dataFilterStep.documentation.example3', {
        defaultMessage: `## Filter with limit for performance
\`\`\`yaml
- name: get-recent-errors
  type: ${DataFilterStepTypeId}
  items: "\${{ steps.fetch_logs.output }}"
  with:
    condition: "item.level: error"
    limit: 10

# Output: First 10 matching items (early exit optimization)
\`\`\``,
      }),

      i18n.translate('workflowsExtensions.dataFilterStep.documentation.example4', {
        defaultMessage: `## Chain filter with count using Liquid
\`\`\`yaml
- name: filter-enabled
  type: ${DataFilterStepTypeId}
  items: "\${{ steps.fetch_data.output }}"
  with:
    condition: "item.enabled: true"

- name: log-count
  type: console
  with:
    message: "Matched {{steps.filter-enabled.output | size}} out of {{steps.fetch_data.output | size}} items"
\`\`\``,
      }),

      i18n.translate('workflowsExtensions.dataFilterStep.documentation.example5', {
        defaultMessage: `## Filter using index
\`\`\`yaml
- name: get-first-ten
  type: ${DataFilterStepTypeId}
  items: "\${{ steps.fetch_items.output }}"
  with:
    condition: "index < 10"

# Output: First 10 items from the array
\`\`\``,
      }),

      i18n.translate('workflowsExtensions.dataFilterStep.documentation.example6', {
        defaultMessage: `## Filter with wildcards
\`\`\`yaml
- name: find-error-messages
  type: ${DataFilterStepTypeId}
  items: "\${{ steps.fetch_logs.output }}"
  with:
    condition: "item.message: *error* OR item.message: *failed*"

# Output: Items where message contains "error" or "failed"
\`\`\``,
      }),
    ],
  },
};
