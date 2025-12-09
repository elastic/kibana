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
import { dataSetStepCommonDefinition, DataSetStepTypeId } from '../../common/step_types';
import type { PublicStepDefinition } from '../step_registry/types';

export const dataSetStepDefinition: PublicStepDefinition = {
  ...dataSetStepCommonDefinition,
  icon: tableOfContentsIcon,
  label: i18n.translate('workflowsExtensions.dataSetStep.label', {
    defaultMessage: 'Set Variables',
  }),
  description: i18n.translate('workflowsExtensions.dataSetStep.description', {
    defaultMessage:
      'Define, rename, or calculate specific variables to create a clean context object for downstream use',
  }),
  documentation: {
    details: i18n.translate('workflowsExtensions.dataSetStep.documentation.details', {
      defaultMessage: `The ${DataSetStepTypeId} step allows you to define multiple variables with key-value pairs that can be referenced in later steps using template syntax like {templateSyntax}. This step is useful for creating a clean context object, computing derived values, and simplifying complex expressions.`,
      values: { templateSyntax: '`{{ steps.stepName.output.variableName }}`' },
    }),
    examples: [
      `## Define multiple variables
\`\`\`yaml
- name: build-user-context
  type: ${DataSetStepTypeId}
  with:
    user_id: "\${{ steps.fetch_user.output.id }}"
    full_name: "\${{ steps.fetch_user.output.first_name }} \${{ steps.fetch_user.output.last_name }}"
    email: "\${{ steps.fetch_user.output.email }}"
    is_active: true
\`\`\``,

      `## Construct nested objects
\`\`\`yaml
- name: build-profile
  type: ${DataSetStepTypeId}
  with:
    profile:
      name: "\${{ steps.fetch_user.output.name }}"
      age: 25
      address:
        city: "San Francisco"
        country: "USA"
\`\`\``,

      `## Compute derived values
\`\`\`yaml
- name: calculate-metrics
  type: ${DataSetStepTypeId}
  with:
    total: "\${{ steps.fetch_orders.output.price * steps.fetch_orders.output.quantity }}"
    discount: "\${{ steps.fetch_orders.output.price * 0.1 }}"
    status: "processed"
\`\`\``,

      `## Use variables in subsequent steps
\`\`\`yaml
- name: set-context
  type: ${DataSetStepTypeId}
  with:
    api_url: "https://api.example.com"
    timeout: 5000
    user_id: "\${{ context.trigger.body.userId }}"

- name: call-api
  type: http
  with:
    # Option 1: Standard step reference
    url: "\${{ steps.set-context.output.api_url }}/users/\${{ steps.set-context.output.user_id }}"
    # Option 2: Simplified variables reference (sugar syntax)
    url: "\${{ variables.api_url }}/users/\${{ variables.user_id }}"
    timeout: "\${{ variables.timeout }}"
\`\`\``,

      `## Pass through and transform data
\`\`\`yaml
- name: transform-data
  type: ${DataSetStepTypeId}
  with:
    user_id: "\${{ steps.fetch_user.output.id }}"
    original_payload: "\${{ context.trigger.body }}"
    processed_at: "\${{ workflow.startedAt }}"
\`\`\``,
    ],
  },
};
