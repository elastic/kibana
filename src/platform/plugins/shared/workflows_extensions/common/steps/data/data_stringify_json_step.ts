/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';

export const DataStringifyJsonStepTypeId = 'data.stringifyJson' as const;

export const ConfigSchema = z.object({
  source: z.unknown(),
});

export const InputSchema = z.object({
  pretty: z.boolean().optional().default(false),
});

export const OutputSchema = z.string();

export type DataStringifyJsonStepConfigSchema = typeof ConfigSchema;
export type DataStringifyJsonStepInputSchema = typeof InputSchema;
export type DataStringifyJsonStepOutputSchema = typeof OutputSchema;

export const dataStringifyJsonStepCommonDefinition: CommonStepDefinition<
  DataStringifyJsonStepInputSchema,
  DataStringifyJsonStepOutputSchema,
  DataStringifyJsonStepConfigSchema
> = {
  id: DataStringifyJsonStepTypeId,
  category: StepCategory.Data,
  label: i18n.translate('workflowsExtensions.dataStringifyJsonStep.label', {
    defaultMessage: 'Stringify JSON',
  }),
  description: i18n.translate('workflowsExtensions.dataStringifyJsonStep.description', {
    defaultMessage: 'Convert a structured object or array to a JSON string',
  }),
  documentation: {
    details: `# Stringify JSON

Convert a structured value (object, array, etc.) into a JSON string for transport or presentation.

## Basic Usage

\`\`\`yaml
- name: stringify-payload
  type: data.stringifyJson
  source: "\${{ steps.build_payload.output }}"
  with:
    pretty: false
\`\`\`

## Pretty Print

\`\`\`yaml
- name: debug-output
  type: data.stringifyJson
  source: "\${{ steps.build_payload.output }}"
  with:
    pretty: true
\`\`\`

## Configuration

- **source** (required): The value to stringify. Can be any structured type.
- **pretty** (optional, default: false): When true, outputs indented JSON with 2-space indentation.

## Output

Returns a JSON string representation of the source value.

## Error Handling

- Circular references produce a clear error message.
- Non-serializable values (e.g., functions) return an error.
`,
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
