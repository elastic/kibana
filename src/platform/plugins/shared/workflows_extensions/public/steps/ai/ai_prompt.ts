/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { icon as plugs } from '@elastic/eui/es/components/icon/assets/plugs';
import { i18n } from '@kbn/i18n';
import { AiPromptStepCommonDefinition, AiPromptStepTypeId } from '../../../common/steps/ai';
import type { PublicStepDefinition } from '../../step_registry/types';

export const AiPromptStepDefinition: PublicStepDefinition = {
  ...AiPromptStepCommonDefinition,
  icon: plugs,
  label: i18n.translate('workflowsExtensionsExample.AiPromptStep.label', {
    defaultMessage: 'AI Prompt',
  }),
  description: i18n.translate('workflowsExtensionsExample.AiPromptStep.description', {
    defaultMessage: 'Prompts the user for input and sets the result as a variable',
  }),
  documentation: {
    details: i18n.translate('workflowsExtensionsExample.AiPromptStep.documentation.details', {
      defaultMessage: `The ${AiPromptStepTypeId} step allows you to store values in the workflow context that can be referenced in later steps using template syntax like {templateSyntax}.`,
      values: { templateSyntax: '`{{ steps.stepName.output.variables.variableName }}`' }, // Needs to be extracted so it is not interpreted as a variable by the i18n plugin
    }),
    examples: [
      `## Set variables using key-value pairs
\`\`\`yaml
- name: set_vars
  type: ${AiPromptStepTypeId}
  with:
    variables:
      myVar: "Hello World"
      count: 42
      enabled: true
\`\`\``,

      `## Set a single variable
\`\`\`yaml
- name: set_single_var
  type: ${AiPromptStepTypeId}
  with:
    variables:
      message: "{{ workflow.name }}"
\`\`\``,

      `## Use variables in subsequent steps
\`\`\`yaml
- name: vars
  type: ${AiPromptStepTypeId}
  with:
    variables:
      apiUrl: "https://api.example.com"
      timeout: 5000
- name: use_vars
  type: http
  with:
    url: "{{ steps.vars.output.variables.apiUrl }}"
    timeout: "{{ steps.vars.timeout }}" # can also be accessed as step state
\`\`\``,
    ],
  },
};
