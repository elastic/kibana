/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionDefinition } from '../../../connector_spec';
import { callSsmApi } from '../aws_ssm_api';
import { automationExecutionIdSchema } from './shared';

const StopAutomationExecutionInputSchema = lazySchema(() =>
  z.object({
    automationExecutionId: automationExecutionIdSchema().describe(
      'The automationExecutionId returned by startAutomationExecution.'
    ),
  })
);
type StopAutomationExecutionInput = z.infer<typeof StopAutomationExecutionInputSchema>;

export const stopAutomationExecution: ActionDefinition<StopAutomationExecutionInput> = {
  isTool: true,
  scope: 'destroy',
  description:
    'Cancel an Automation runbook started with startAutomationExecution. Steps that already ran are not undone. Call getAutomationExecution afterwards to confirm the status reached Cancelled.',
  input: StopAutomationExecutionInputSchema,
  handler: async (ctx, { automationExecutionId }) => {
    await callSsmApi({
      ctx,
      operation: 'StopAutomationExecution',
      body: { AutomationExecutionId: automationExecutionId },
    });
    return { success: true };
  },
};
