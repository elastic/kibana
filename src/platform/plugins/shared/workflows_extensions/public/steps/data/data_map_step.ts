/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { icon as listIcon } from '@elastic/eui/es/components/icon/assets/list';
import { i18n } from '@kbn/i18n';
import { dataMapStepCommonDefinition, DataMapStepTypeId } from '../../../common/steps/data';
import type { PublicStepDefinition } from '../../step_registry/types';

export const dataMapStepDefinition: PublicStepDefinition = {
  ...dataMapStepCommonDefinition,
  icon: listIcon,
  label: i18n.translate('workflowsExtensions.dataMapStep.label', {
    defaultMessage: 'Map Collection',
  }),
  description: i18n.translate('workflowsExtensions.dataMapStep.description', {
    defaultMessage:
      'Iterate over a collection and reshape each item by renaming fields, removing keys, or computing new values',
  }),
  documentation: {
    details: i18n.translate('workflowsExtensions.dataMapStep.documentation.details', {
      defaultMessage: `The ${DataMapStepTypeId} step transforms each item in an array by applying a mapping configuration. Use {itemSyntax} to reference the current item and {indexSyntax} to access the item's position. The output is accessible via {outputSyntax}.`,
      values: {
        itemSyntax: '`{{ item.field }}`',
        indexSyntax: '`{{ index }}`',
        outputSyntax: '`{{ steps.stepName.output }}`',
      },
    }),
    examples: [
      `## Rename and project fields
\`\`\`yaml
- name: normalize-users
  type: ${DataMapStepTypeId}
  with:
    items: "\${{ steps.fetch_users.output }}"
    fields:
      id: "\${{ item.objectId }}"
      email: "\${{ item.mail }}"
      display_name: "\${{ item.givenName }} \${{ item.surname }}"
\`\`\``,

      `## Compute conditional fields with Liquid
\`\`\`yaml
- name: enrich-orders
  type: ${DataMapStepTypeId}
  with:
    items: "\${{ steps.get_orders.output.value }}"
    fields:
      order_id: "\${{ item.id }}"
      total: "\${{ item.price * item.quantity }}"
      status: >-
        {% if item.paid == true %}paid{% else %}pending{% endif %}
      discount: "\${{ item.price * 0.1 }}"
\`\`\``,

      `## Add static fields and use index
\`\`\`yaml
- name: tag-items
  type: ${DataMapStepTypeId}
  with:
    items: "\${{ steps.fetch_data.output.items }}"
    fields:
      position: "\${{ index }}"
      name: "\${{ item.name }}"
      source: "api"
      processed_at: "\${{ workflow.startedAt }}"
\`\`\``,

      `## Complex transformation from Active Directory
\`\`\`yaml
- name: normalize-ad-users
  type: ${DataMapStepTypeId}
  with:
    items: "\${{ steps.fetch_ad_users.output.value }}"
    fields:
      id: "\${{ item.objectId }}"
      email: "\${{ item.mail }}"
      display_name: "\${{ item.givenName }} \${{ item.surname }}"
      department: "\${{ item.department }}"
      source: "active_directory"
      status: >-
        {% if item.accountEnabled == true %}active{% else %}suspended{% endif %}
      
# Access the mapped array in subsequent steps
- name: use-normalized-data
  type: log
  with:
    message: "Processed \${{ steps.normalize-ad-users.output | size }} users"
\`\`\``,

      `## Normalize API response structure
\`\`\`yaml
- name: reshape-github-issues
  type: ${DataMapStepTypeId}
  with:
    items: "\${{ steps.fetch_issues.output }}"
    fields:
      issue_id: "\${{ item.id }}"
      title: "\${{ item.title }}"
      author: "\${{ item.user.login }}"
      state: "\${{ item.state }}"
      created: "\${{ item.created_at }}"
      url: "\${{ item.html_url }}"
\`\`\``,
    ],
  },
};
