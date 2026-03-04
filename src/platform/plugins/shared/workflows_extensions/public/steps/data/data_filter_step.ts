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
import { dataFilterStepCommonDefinition } from '../../../common/steps/data';
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
    details: `The data.filter step filters arrays using Kibana Query Language (KQL) conditions. Use \`item.field\` to reference item properties and \`index\` to access the item's position. Always returns an array of matching items. Use \`limit\` to cap the number of matches returned.`,
    examples: [
      `## Filter by single field
\`\`\`yaml
- name: get-active-incidents
  type: data.filter
  items: "\${{ steps.fetch_incidents.output }}"
  with:
    condition: "item.state: active"

# Output: Array of items where state equals "active"
\`\`\``,

      `## Filter with complex KQL condition
\`\`\`yaml
- name: filter-critical-alerts
  type: data.filter
  items: "\${{ steps.fetch_alerts.output }}"
  with:
    condition: "item.status: active AND item.severity > 2"

# Output: Array of active alerts with severity greater than 2
\`\`\``,

      `## Filter with limit for performance
\`\`\`yaml
- name: get-recent-errors
  type: data.filter
  items: "\${{ steps.fetch_logs.output }}"
  with:
    condition: "item.level: error"
    limit: 10

# Output: First 10 matching items (early exit optimization)
\`\`\``,

      `## Chain filter with count using Liquid
\`\`\`yaml
- name: filter-enabled
  type: data.filter
  items: "\${{ steps.fetch_data.output }}"
  with:
    condition: "item.enabled: true"

- name: log-count
  type: console
  with:
    message: "Matched {{steps.filter-enabled.output | size}} out of {{steps.fetch_data.output | size}} items"
\`\`\``,

      `## Filter using index
\`\`\`yaml
- name: get-first-ten
  type: data.filter
  items: "\${{ steps.fetch_items.output }}"
  with:
    condition: "index < 10"

# Output: First 10 items from the array
\`\`\``,

      `## Filter with wildcards
\`\`\`yaml
- name: find-error-messages
  type: data.filter
  items: "\${{ steps.fetch_logs.output }}"
  with:
    condition: "item.message: *error* OR item.message: *failed*"

# Output: Items where message contains "error" or "failed"
\`\`\``,
    ],
  },
};
