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
import { COMMAND_INSTANCE_IDS_MAX, commandIdSchema, instanceIdSchema } from './shared';

const CancelCommandInputSchema = lazySchema(() =>
  z.object({
    commandId: commandIdSchema().describe('The commandId returned by sendCommand.'),
    instanceIds: z
      .array(instanceIdSchema())
      .min(1)
      .max(COMMAND_INSTANCE_IDS_MAX)
      .optional()
      .describe(
        'Only cancel the command on these nodes. Omit to cancel it on every node it was sent to.'
      ),
  })
);
type CancelCommandInput = z.infer<typeof CancelCommandInputSchema>;

export const cancelCommand: ActionDefinition<CancelCommandInput> = {
  isTool: true,
  scope: 'destroy',
  description:
    'Cancel a command sent with sendCommand, on every node it was sent to or only on the given instanceIds. Cancelling is best effort: a node that already finished keeps its result, and one that is running the command may not stop it. Call getCommandInvocation afterwards to see whether each node reached Cancelled.',
  input: CancelCommandInputSchema,
  handler: async (ctx, { commandId, instanceIds }) => {
    await callSsmApi({
      ctx,
      operation: 'CancelCommand',
      body: { CommandId: commandId, InstanceIds: instanceIds },
    });
    return { success: true };
  },
};
