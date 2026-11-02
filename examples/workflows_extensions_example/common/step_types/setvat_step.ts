/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { StepCategory } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';

/**
 * Step type ID for the setvar step.
 */
export const SetVarStepTypeId = 'example.setVariable';

/**
 * Input schema for the setvar step.
 * Uses variables structure with key->value pairs.
 */
export const InputSchema = z.object({
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

/**
 * Output schema for the setvar step.
 * Uses variables structure with key->value pairs.
 */
export const OutputSchema = z.object({
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export type SetVarStepInputSchema = typeof InputSchema;
export type SetVarStepOutputSchema = typeof OutputSchema;

/**
 * Common step definition for SetVar step.
 * This is shared between server and public implementations.
 * Input and output types are automatically inferred from the schemas.
 */
export const setVarStepCommonDefinition: CommonStepDefinition<
  SetVarStepInputSchema,
  SetVarStepOutputSchema
> = {
  id: SetVarStepTypeId,
  category: StepCategory.Data,
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
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
