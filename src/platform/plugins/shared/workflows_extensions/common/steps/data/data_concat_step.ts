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
export const MAX_CONCAT_ITEMS = 100_000;

export const ConfigSchema = z.object({
  arrays: z
    .array(z.unknown())
    .min(1)
    .max(MAX_ARRAYS)
    .describe(
      i18n.translate('workflowsExtensions.dataConcatStep.schema.arrays', {
        defaultMessage:
          'Array of arrays to concatenate (maximum {max}). Each entry must resolve to an array.',
        values: { max: MAX_ARRAYS },
      })
    ),
});

export const InputSchema = z.object({
  dedupe: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      i18n.translate('workflowsExtensions.dataConcatStep.schema.dedupe', {
        defaultMessage:
          'Remove duplicates after concatenation, keeping the first occurrence. Primitives are compared by value; objects by deep equality.',
      })
    ),
  flatten: z
    .union([z.boolean(), z.number().int().min(1).max(10)])
    .optional()
    .default(false)
    .describe(
      i18n.translate('workflowsExtensions.dataConcatStep.schema.flatten', {
        defaultMessage:
          'Flatten nested arrays. true flattens one level. A number (1–10) flattens to that depth.',
      })
    ),
});

export const OutputSchema = z.array(z.unknown()).describe(
  i18n.translate('workflowsExtensions.dataConcatStep.schema.output', {
    defaultMessage:
      'A single array of all items from the input arrays, in order. Maximum {max} items.',
    values: { max: MAX_CONCAT_ITEMS },
  })
);

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
    details: i18n.translate('workflowsExtensions.dataConcatStep.documentation.details', {
      defaultMessage:
        'Concatenate arrays. `arrays` is the top-level source field. Null or undefined entries are treated as empty arrays.',
    }),
    notes: [
      i18n.translate('workflowsExtensions.dataConcatStep.documentation.notes.limits', {
        defaultMessage:
          'At most {maxArrays} input arrays. The concatenated result cannot exceed {maxItems} items.',
        values: { maxArrays: MAX_ARRAYS, maxItems: MAX_CONCAT_ITEMS },
      }),
    ],
    examples: [
      `## Basic usage
\`\`\`yaml
- name: merge-tags
  type: data.concat
  arrays:
    - "\${{ inputs.user_tags }}"
    - ["policy:all", "automated"]
    - "\${{ steps.fetch_defaults.output }}"
\`\`\``,
      `## With deduplication
\`\`\`yaml
- name: unique-recipients
  type: data.concat
  arrays:
    - "\${{ steps.team_a.output.emails }}"
    - "\${{ steps.team_b.output.emails }}"
  with:
    dedupe: true
\`\`\``,
      `## With flattening
\`\`\`yaml
- name: flatten-nested
  type: data.concat
  arrays:
    - [["a", "b"], ["c"]]
    - [["d"]]
  with:
    flatten: true
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
