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
import { commandIdSchema, instanceIdSchema } from './shared';

const PLUGIN_NAME_MIN_LENGTH = 4;
// SSM documents no maximum for PluginName; this only guards against unbounded input.
const PLUGIN_NAME_MAX_LENGTH = 128;

const GetCommandInvocationInputSchema = lazySchema(() =>
  z.object({
    commandId: commandIdSchema().describe(
      'The commandId returned by sendCommand, e.g. 2b8e7fd1-8a2e-4b8f-9d6a-0123456789ab.'
    ),
    instanceId: instanceIdSchema().describe(
      'One of the instance IDs the command was sent to. Call once per node to get each result.'
    ),
    pluginName: z
      .string()
      .min(PLUGIN_NAME_MIN_LENGTH)
      .max(PLUGIN_NAME_MAX_LENGTH)
      .optional()
      .describe(
        "The name of the document step to read the result of. Omit it for documents with a single step, such as AWS-RunShellScript. For a document with more than one step (read their names with getDocument), pass it to get that step's output and exit code: without it, only the overall status is returned."
      ),
  })
);
type GetCommandInvocationInput = z.infer<typeof GetCommandInvocationInputSchema>;

// Any status not listed here, including ones AWS adds later, keeps the agent polling.
const FINAL_INVOCATION_STATUSES: ReadonlySet<string> = new Set([
  'Success',
  'Failed',
  'TimedOut',
  'Cancelled',
]);

const GetCommandInvocationResponseSchema = lazySchema(() =>
  z.object({
    CommandId: z.string().optional(),
    InstanceId: z.string().optional(),
    DocumentName: z.string().optional(),
    Status: z.string().optional(),
    StatusDetails: z.string().optional(),
    ResponseCode: z.number().optional(),
    ExecutionStartDateTime: z.string().optional(),
    ExecutionEndDateTime: z.string().optional(),
    StandardOutputContent: z.string().optional(),
    StandardErrorContent: z.string().optional(),
  })
);

export const getCommandInvocation: ActionDefinition<GetCommandInvocationInput> = {
  isTool: true,
  scope: 'read',
  description:
    'Get the result of a command sent with sendCommand on one node: its status (Pending, InProgress, Delayed, Success, Failed, TimedOut, Cancelled, Cancelling), the exit code, standard output and standard error (up to 24,000 characters each), and when it started and ended. Call again after a few seconds while isFinished is false. Right after sendCommand this can fail with InvocationDoesNotExist for a few seconds; wait and retry.',
  input: GetCommandInvocationInputSchema,
  handler: async (ctx, { commandId, instanceId, pluginName }) => {
    const data = await callSsmApi({
      ctx,
      operation: 'GetCommandInvocation',
      body: { CommandId: commandId, InstanceId: instanceId, PluginName: pluginName },
    });
    const {
      CommandId,
      InstanceId,
      DocumentName,
      Status,
      StatusDetails,
      ResponseCode,
      ExecutionStartDateTime,
      ExecutionEndDateTime,
      StandardOutputContent,
      StandardErrorContent,
    } = GetCommandInvocationResponseSchema.parse(data);
    return {
      commandId: CommandId,
      instanceId: InstanceId,
      documentName: DocumentName,
      status: Status,
      isFinished: Status !== undefined && FINAL_INVOCATION_STATUSES.has(Status),
      statusDetails: StatusDetails,
      // -1 until the command has finished on the node.
      responseCode: ResponseCode,
      // SSM answers an empty string for a time that hasn't happened yet.
      executionStartDateTime: ExecutionStartDateTime || null,
      executionEndDateTime: ExecutionEndDateTime || null,
      standardOutput: StandardOutputContent,
      standardError: StandardErrorContent,
    };
  },
};
