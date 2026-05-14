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
 * Step type ID for the durable poll demonstration step.
 */
export const DurablePollStepTypeId = 'example.durablePollDemo';

export const InputSchema = z.object({
  /**
   * How many poll invocations must complete before the step returns output.
   * Kept small so ad-hoc runs finish quickly.
   */
  pollsBeforeDone: z.coerce.number().int().min(1).max(20).default(2),
});

export const OutputSchema = z.object({
  message: z.string(),
  completedAfterPolls: z.number().int(),
});

export type DurablePollStepInputSchema = typeof InputSchema;
export type DurablePollStepOutputSchema = typeof OutputSchema;

export const durablePollStepCommonDefinition: CommonStepDefinition<
  DurablePollStepInputSchema,
  DurablePollStepOutputSchema
> = {
  id: DurablePollStepTypeId,
  category: StepCategory.Data,
  label: i18n.translate('workflowsExtensionsExample.durablePollStep.label', {
    defaultMessage: 'Durable poll (demo)',
  }),
  description: i18n.translate('workflowsExtensionsExample.durablePollStep.description', {
    defaultMessage:
      'Example of a poll-only step that waits between invocations until a condition is met',
  }),
  documentation: {
    details: i18n.translate('workflowsExtensionsExample.durablePollStep.documentation.details', {
      defaultMessage:
        'Demonstrates poll-only mode: no run phase. The workflow enters WAITING between polls according to poll.policy. See workflows_extensions dev_docs/STEPS.md for durable steps.',
    }),
    examples: [
      `## Poll until done (demo)
\`\`\`yaml
- name: demo_durable_poll
  type: ${DurablePollStepTypeId}
  with:
    pollsBeforeDone: 3
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
