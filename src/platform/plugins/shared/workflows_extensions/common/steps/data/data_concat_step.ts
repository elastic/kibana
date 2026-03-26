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

export const DataConcatStepTypeId = 'data.concat' as const;

const MAX_ARRAYS = 50;

export const ConfigSchema = z.object({
  arrays: z.array(z.unknown()).min(1).max(MAX_ARRAYS),
});

export const InputSchema = z.object({
  dedupe: z.boolean().optional().default(false),
  flatten: z
    .union([z.boolean(), z.number().int().min(1).max(10)])
    .optional()
    .default(false),
});

export const OutputSchema = z.array(z.unknown());

export type DataConcatStepConfigSchema = typeof ConfigSchema;
export type DataConcatStepInputSchema = typeof InputSchema;
export type DataConcatStepOutputSchema = typeof OutputSchema;

export const dataConcatStepCommonDefinition: CommonStepDefinition<
  DataConcatStepInputSchema,
  DataConcatStepOutputSchema,
  DataConcatStepConfigSchema
> = {
  id: DataConcatStepTypeId,
  category: StepCategory.Data,
  label: i18n.translate('workflowsExtensions.dataConcatStep.label', {
    defaultMessage: 'Concat Arrays',
  }),
  description: i18n.translate('workflowsExtensions.dataConcatStep.description', {
    defaultMessage: 'Combine multiple arrays into a single array',
  }),
  documentation: {
    details: `# Concat Arrays

Combine multiple arrays into a single array, preserving order.

## Basic Usage

\`\`\`yaml
- name: merge-tags
  type: data.concat
  arrays:
    - "\${{ inputs.user_tags }}"
    - ["policy:all", "automated"]
    - "\${{ steps.fetch_defaults.output }}"
\`\`\`

## With Deduplication

\`\`\`yaml
- name: unique-recipients
  type: data.concat
  arrays:
    - "\${{ steps.team_a.output.emails }}"
    - "\${{ steps.team_b.output.emails }}"
  with:
    dedupe: true
\`\`\`

## With Flattening

\`\`\`yaml
- name: flatten-nested
  type: data.concat
  arrays:
    - [["a", "b"], ["c"]]
    - [["d"]]
  with:
    flatten: true
\`\`\`

## Configuration

- **arrays** (required): Array of arrays to concatenate (max 50). Each entry must resolve to an array. Null/undefined entries are treated as empty arrays.
- **dedupe** (optional, default: false): Remove duplicate items, keeping first occurrence. Primitives are compared by value; objects by deep equality.
- **flatten** (optional, default: false): Flatten nested arrays. Use \`true\` for 1 level, or a number (1-10) for specific depth.

## Output

Returns a single array containing all items from the input arrays in order.

## Limits

- Maximum 50 input arrays
- Maximum 100,000 total items in the result
`,
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
