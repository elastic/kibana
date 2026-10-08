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
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z } from '@kbn/zod/v4';

export const CPU_SPIN_STEP_ID = 'test.cpuSpin';
export const MAX_CPU_SPIN_DURATION_MS = 10_000;

const inputSchema = z.object({
  durationMs: z.number().int().min(1).max(MAX_CPU_SPIN_DURATION_MS),
});

const outputSchema = z.object({
  blockedMs: z.number().int(),
  iterations: z.number().int().nonnegative(),
});

export const cpuSpinStepCommonDefinition = {
  id: CPU_SPIN_STEP_ID,
  category: StepCategory.Data,
  label: i18n.translate('workflowsManagement.testCpuSpinStep.label', {
    defaultMessage: 'Test CPU spin',
  }),
  description: i18n.translate('workflowsManagement.testCpuSpinStep.description', {
    defaultMessage: 'Synchronously occupies the workflow execution thread for a bounded duration.',
  }),
  inputSchema,
  outputSchema,
} satisfies CommonStepDefinition<typeof inputSchema, typeof outputSchema>;
