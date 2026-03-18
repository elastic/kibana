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
import { WaitForInputStepInputSchema } from '@kbn/workflows/spec/schema';
import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';

export const WaitForInputStepTypeId = 'waitForInput';

export type WaitForInputInputSchema = typeof WaitForInputStepInputSchema;
export type WaitForInputOutputSchema = typeof OutputSchema;

const OutputSchema = z.record(z.string(), z.unknown());

export const WaitForInputStepCommonDefinition: CommonStepDefinition<
  WaitForInputInputSchema,
  WaitForInputOutputSchema
> = {
  id: WaitForInputStepTypeId,
  category: StepCategory.FlowControl,
  label: i18n.translate('workflowsExtensions.waitForInputStep.label', {
    defaultMessage: 'Wait For Input',
  }),
  description: i18n.translate('workflowsExtensions.waitForInputStep.description', {
    defaultMessage: 'Pause execution until external input is provided (human-in-the-loop)',
  }),
  documentation: {
    examples: [
      `## Basic wait for input
\`\`\`yaml
- name: wait_for_approval
  type: waitForInput
  with:
    message: "Please approve before continuing"
\`\`\``,
      `## Wait for input with typed schema
\`\`\`yaml
- name: collect_reason
  type: waitForInput
  with:
    message: "Provide a reason for escalation"
    schema:
      properties:
        reason:
          type: string
        severity:
          type: string
          enum: [low, medium, high]
          default: medium
      required:
        - reason
\`\`\``,
    ],
  },
  inputSchema: WaitForInputStepInputSchema,
  outputSchema: OutputSchema,
};
