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
import {
  COMMAND_INSTANCE_IDS_MAX,
  documentNameSchema,
  documentVersionSchema,
  instanceIdSchema,
  toIsoDate,
} from './shared';

const COMMENT_MAX_LENGTH = 100;
const TIMEOUT_SECONDS_MIN = 30;
const TIMEOUT_SECONDS_MAX = 2592000;
// SSM documents no limits for document parameters; these only guard against unbounded input.
const COMMAND_PARAMETER_NAME_MAX_LENGTH = 255;
const COMMAND_PARAMETERS_MAX = 50;
const COMMAND_PARAMETER_VALUES_MAX = 100;
const COMMAND_PARAMETER_VALUE_MAX_LENGTH = 65536;

const SendCommandInputSchema = lazySchema(() =>
  z.object({
    instanceIds: z
      .array(instanceIdSchema())
      .min(1)
      .max(COMMAND_INSTANCE_IDS_MAX)
      .describe(
        `The managed nodes to run the command on (1-${COMMAND_INSTANCE_IDS_MAX}), by EC2 instance ID (e.g. i-0123456789abcdef0) or hybrid managed node ID (e.g. mi-0123456789abcdef0). Find them with describeInstanceInformation.`
      ),
    documentName: documentNameSchema().describe(
      'The SSM document to run. Use "AWS-RunShellScript" for shell commands on Linux and macOS nodes, or "AWS-RunPowerShellScript" for PowerShell on Windows nodes. Other AWS-owned or custom document names, and document ARNs shared from another account, also work.'
    ),
    parameters: z
      .record(
        z.string().min(1).max(COMMAND_PARAMETER_NAME_MAX_LENGTH),
        z
          .array(z.string().max(COMMAND_PARAMETER_VALUE_MAX_LENGTH))
          .max(COMMAND_PARAMETER_VALUES_MAX)
      )
      .refine((parameters) => Object.keys(parameters).length <= COMMAND_PARAMETERS_MAX, {
        message: `At most ${COMMAND_PARAMETERS_MAX} parameters are allowed.`,
      })
      .optional()
      .describe(
        'The parameters the document takes, each as a list of strings. For AWS-RunShellScript and AWS-RunPowerShellScript: { "commands": ["uptime", "df -h"] }, optionally with "workingDirectory": ["/tmp"] and "executionTimeout": ["600"] (seconds the commands may run; defaults to 3600).'
      ),
    documentVersion: documentVersionSchema()
      .optional()
      .describe('The document version to run: "$DEFAULT" (the default), "$LATEST", or a number.'),
    comment: z
      .string()
      .max(COMMENT_MAX_LENGTH)
      .optional()
      .describe(
        `A short note stored with the command (at most ${COMMENT_MAX_LENGTH} characters), e.g. why it was run.`
      ),
    timeoutSeconds: z
      .number()
      .int()
      .min(TIMEOUT_SECONDS_MIN)
      .max(TIMEOUT_SECONDS_MAX)
      .optional()
      .describe(
        `Seconds (${TIMEOUT_SECONDS_MIN}-${TIMEOUT_SECONDS_MAX}) a node may take to start the command; a node that has not started it by then never runs it. This does not limit how long the command runs: use the document's executionTimeout parameter for that.`
      ),
  })
);
type SendCommandInput = z.infer<typeof SendCommandInputSchema>;

const SendCommandResponseSchema = lazySchema(() =>
  z.object({
    Command: z
      .object({
        CommandId: z.string().optional(),
        DocumentName: z.string().optional(),
        InstanceIds: z.array(z.string()).optional(),
        RequestedDateTime: z.number().optional(),
        Status: z.string().optional(),
      })
      .optional(),
  })
);

export const sendCommand: ActionDefinition<SendCommandInput> = {
  // Agent Builder only labels `destroy` actions for the agent and never asks the user to confirm,
  // so the IAM policy on the connector's credentials is the only guard on what this runs.
  isTool: true,
  scope: 'destroy',
  description:
    'Run an SSM document, typically shell commands, on up to 50 managed nodes. Use "AWS-RunShellScript" with parameters { "commands": [...] } for Linux and macOS, or "AWS-RunPowerShellScript" for Windows; get the instance IDs from describeInstanceInformation and check the nodes are Online first. Returns immediately with a commandId and status Pending: the command runs asynchronously, so call getCommandInvocation with the commandId and each instance ID to read the result. The commands run with the privileges of SSM Agent on the node (root or SYSTEM).',
  input: SendCommandInputSchema,
  handler: async (
    ctx,
    { instanceIds, documentName, parameters, documentVersion, comment, timeoutSeconds }
  ) => {
    const data = await callSsmApi({
      ctx,
      operation: 'SendCommand',
      body: {
        InstanceIds: instanceIds,
        DocumentName: documentName,
        Parameters: parameters,
        DocumentVersion: documentVersion,
        Comment: comment,
        TimeoutSeconds: timeoutSeconds,
      },
    });
    const { Command = {} } = SendCommandResponseSchema.parse(data);
    const { CommandId, DocumentName, InstanceIds, Status, RequestedDateTime } = Command;
    return {
      commandId: CommandId,
      documentName: DocumentName,
      instanceIds: InstanceIds,
      status: Status,
      requestedDateTime: toIsoDate(RequestedDateTime),
    };
  },
};
