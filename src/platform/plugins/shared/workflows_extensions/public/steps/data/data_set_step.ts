/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { icon as tableOfContentsIcon } from '@elastic/eui/es/components/icon/assets/tableOfContents';
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { PublicStepDefinition } from '../../step_registry/types';

export const DataSetStepTypeId = 'data.set';

export const dataSetStepDefinition: PublicStepDefinition = {
  id: DataSetStepTypeId,
  inputSchema: z.record(z.string(), z.unknown()),
  outputSchema: z.record(z.string(), z.unknown()),
  icon: tableOfContentsIcon,
  label: i18n.translate('workflowsExtensions.dataSetStep.label', {
    defaultMessage: 'Set Variables',
  }),
  description: i18n.translate('workflowsExtensions.dataSetStep.description', {
    defaultMessage:
      'Define or compute variables that can be referenced throughout the workflow execution',
  }),
  documentation: {
    details: i18n.translate('workflowsExtensions.dataSetStep.documentation.details', {
      defaultMessage: `The ${DataSetStepTypeId} step defines variables with explicit values or expressions. Variables can be accessed via {standardSyntax} or the shorthand {variablesSyntax}. All data types are preserved (strings, numbers, booleans, objects, arrays).`,
      values: {
        standardSyntax: '`{{ steps.stepName.output.key }}`',
        variablesSyntax: '`{{ variables.key }}`',
      },
    }),
    examples: [
      `## Define simple variables
\`\`\`yaml
- name: build-user-context
  type: ${DataSetStepTypeId}
  with:
    user_id: "\${{ steps.fetch_user.output.id }}"
    email: "\${{ steps.fetch_user.output.email }}"
    is_active: true

# Access via standard syntax
- name: use-standard
  type: log
  with:
    message: "User \${{ steps.build-user-context.output.user_id }}"

# Access via variables shorthand
- name: use-shorthand
  type: log
  with:
    message: "User \${{ variables.user_id }}"
\`\`\``,

      `## Construct nested objects
\`\`\`yaml
- name: build-profile
  type: ${DataSetStepTypeId}
  with:
    profile:
      full_name: "\${{ steps.fetch_user.output.first_name }} \${{ steps.fetch_user.output.last_name }}"
      contact:
        email: "\${{ steps.fetch_user.output.email }}"
        phone: "\${{ steps.fetch_user.output.phone }}"
    preferences:
      theme: "dark"
      notifications: true
\`\`\``,

      `## Store computed values
\`\`\`yaml
- name: compute-metrics
  type: ${DataSetStepTypeId}
  with:
    total_orders: "\${{ steps.fetch_orders.output | size }}"
    total_revenue: "\${{ steps.fetch_orders.output | map: 'price' | sum }}"
    average_order: "\${{ steps.fetch_orders.output | map: 'price' | avg }}"
    timestamp: "\${{ workflow.startedAt }}"
\`\`\``,

      `## Pass through existing data
\`\`\`yaml
- name: enrich-context
  type: ${DataSetStepTypeId}
  with:
    # Original trigger data
    original_payload: "\${{ context.trigger.body }}"
    
    # Add computed fields
    processed_at: "\${{ workflow.startedAt }}"
    workflow_id: "\${{ workflow.id }}"
    
    # Reference other steps
    user_info: "\${{ steps.fetch_user.output }}"
\`\`\``,

      `## Type preservation
\`\`\`yaml
- name: typed-variables
  type: ${DataSetStepTypeId}
  with:
    # String
    name: "John Doe"
    
    # Number (not stringified)
    age: \${{ 30 }}
    
    # Boolean
    is_verified: \${{ true }}
    
    # Array
    tags: \${{ ["important", "urgent", "review"] }}
    
    # Object
    metadata: \${{ { created: "2024-01-01", source: "api" } }}
\`\`\``,
    ],
  },
};
