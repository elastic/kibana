/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { i18n } from '@kbn/i18n';
import { SetVarStepTypeId, setVarStepCommonDefinition } from '../../common/step_types/setvat_step';

export const setVarStepDefinition: PublicStepDefinition = {
  ...setVarStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/pencil').then(({ icon }) => ({ default: icon }))
  ),
  label: i18n.translate('workflowsExtensionsExample.setVarStep.label', {
    defaultMessage: 'Set Variable',
  }),
  description: i18n.translate('workflowsExtensionsExample.setVarStep.description', {
    defaultMessage: 'Sets a variable in the workflow context that can be used in subsequent steps',
  }),
  documentation: {
    details: i18n.translate('workflowsExtensionsExample.setVarStep.documentation.details', {
      defaultMessage: `The ${SetVarStepTypeId} step allows you to store values in the workflow context that can be referenced in later steps using template syntax like {templateSyntax}.`,
      values: { templateSyntax: '`{{ steps.stepName.output.variables.variableName }}`' }, // Needs to be extracted so it is not interpreted as a variable by the i18n plugin
    }),
    examples: [
      `## Set variables using key-value pairs
\`\`\`yaml
- name: set_vars
  type: ${SetVarStepTypeId}
  with:
    variables:
      myVar: "Hello World"
      count: 42
      enabled: true
\`\`\``,

      `## Set a single variable
\`\`\`yaml
- name: set_single_var
  type: ${SetVarStepTypeId}
  with:
    variables:
      message: "{{ workflow.name }}"
\`\`\``,

      `## Use variables in subsequent steps
\`\`\`yaml
- name: vars
  type: ${SetVarStepTypeId}
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
