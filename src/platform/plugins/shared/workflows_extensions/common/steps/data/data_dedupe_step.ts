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

export const DataDedupeStepTypeId = 'data.dedupe' as const;

export const ConfigSchema = z.object({
  items: z.array(z.unknown()).describe(
    i18n.translate('workflowsExtensions.dataDedupeStep.schema.items', {
      defaultMessage: 'Source array.',
    })
  ),
  strategy: z
    .enum(['keep_first', 'keep_last'])
    .optional()
    .default('keep_first')
    .describe(
      i18n.translate('workflowsExtensions.dataDedupeStep.schema.strategy', {
        defaultMessage:
          'keep_first (default) keeps the first occurrence of each unique combination. keep_last keeps the last occurrence of each unique combination.',
      })
    ),
});

export const InputSchema = z.object({
  keys: z.array(z.string()).describe(
    i18n.translate('workflowsExtensions.dataDedupeStep.schema.keys', {
      defaultMessage: 'Fields that determine uniqueness.',
    })
  ),
});

export const OutputSchema = z.array(z.unknown()).describe(
  i18n.translate('workflowsExtensions.dataDedupeStep.schema.output', {
    defaultMessage: 'Array with duplicate items removed based on the specified keys.',
  })
);

export type DataDedupeStepConfigSchema = typeof ConfigSchema;
export type DataDedupeStepInputSchema = typeof InputSchema;
export type DataDedupeStepOutputSchema = typeof OutputSchema;

export const dataDedupeStepCommonDefinition: CommonStepDefinition<
  DataDedupeStepInputSchema,
  DataDedupeStepOutputSchema,
  DataDedupeStepConfigSchema
> = {
  id: DataDedupeStepTypeId,
  category: StepCategory.Data,
  label: i18n.translate('workflowsExtensions.dataDedupeStep.label', {
    defaultMessage: 'Deduplicate Collection',
  }),
  description: i18n.translate('workflowsExtensions.dataDedupeStep.description', {
    defaultMessage: 'Remove duplicate items from a collection based on unique keys',
  }),
  documentation: {
    details: i18n.translate('workflowsExtensions.dataDedupeStep.documentation.details', {
      defaultMessage:
        'Remove duplicates from an array. The uniqueness fields go in with.keys. Missing keys are treated as undefined for comparison. Empty arrays are returned as-is. Order is preserved relative to the chosen strategy.',
    }),
    examples: [
      `## Unique hosts
\`\`\`yaml
- name: unique_hosts
  type: data.dedupe
  items: "\${{ event.alerts }}"
  strategy: "keep_first"
  with:
    keys: ["host.name"]
\`\`\``,
      `## Single key
\`\`\`yaml
- name: unique-emails
  type: data.dedupe
  items: "\${{ steps.get_recipients.output }}"
  with:
    keys:
      - "email"
\`\`\``,
      `## Multiple keys
\`\`\`yaml
- name: unique-user-events
  type: data.dedupe
  items: "\${{ steps.fetch_events.output }}"
  strategy: "keep_first"
  with:
    keys:
      - "user_id"
      - "event_type"
\`\`\``,
      `## Keep last occurrence
\`\`\`yaml
- name: latest-status-per-user
  type: data.dedupe
  items: "\${{ steps.fetch_status_updates.output }}"
  strategy: "keep_last"
  with:
    keys:
      - "user_id"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
