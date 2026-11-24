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
  commandIdSchema,
  documentNameSchema,
  instanceIdSchema,
  nextTokenSchema,
  timestampSchema,
  toIsoDate,
  toNextToken,
} from './shared';

const MAX_RESULTS_MAX = 50;

const COMMAND_STATUSES = [
  'Pending',
  'InProgress',
  'Success',
  'Cancelled',
  'Failed',
  'TimedOut',
  'Cancelling',
] as const;

const ListCommandsInputSchema = lazySchema(() =>
  z.object({
    commandId: commandIdSchema().optional().describe('Only return this command.'),
    instanceId: instanceIdSchema()
      .optional()
      .describe('Only return commands sent to this node, e.g. i-0123456789abcdef0.'),
    status: z.enum(COMMAND_STATUSES).optional().describe('Only return commands in this status.'),
    documentName: documentNameSchema()
      .optional()
      .describe('Only return commands that ran this document, e.g. "AWS-RunShellScript".'),
    invokedAfter: timestampSchema()
      .optional()
      .describe('Only return commands sent after this ISO 8601 time, e.g. 2026-11-01T00:00:00Z.'),
    invokedBefore: timestampSchema()
      .optional()
      .describe('Only return commands sent before this ISO 8601 time.'),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_MAX)
      .optional()
      .describe(`Maximum number of commands to return (1-${MAX_RESULTS_MAX}).`),
    nextToken: nextTokenSchema(),
  })
);
type ListCommandsInput = z.infer<typeof ListCommandsInputSchema>;

const ListCommandsResponseSchema = lazySchema(() =>
  z.object({
    Commands: z
      .array(
        z.object({
          CommandId: z.string().optional(),
          DocumentName: z.string().optional(),
          Comment: z.string().optional(),
          Parameters: z.record(z.string(), z.array(z.string())).optional(),
          InstanceIds: z.array(z.string()).optional(),
          RequestedDateTime: z.number().optional(),
          Status: z.string().optional(),
          TargetCount: z.number().optional(),
          CompletedCount: z.number().optional(),
          ErrorCount: z.number().optional(),
          DeliveryTimedOutCount: z.number().optional(),
        })
      )
      .optional(),
    NextToken: z.string().optional(),
  })
);

// Unlike the other list operations, ListCommands takes lowercase `key`/`value` filters with a
// single value each.
const toCommandFilters = ({
  status,
  documentName,
  invokedAfter,
  invokedBefore,
}: ListCommandsInput): Array<{ key: string; value: string }> => [
  ...(status ? [{ key: 'Status', value: status }] : []),
  ...(documentName ? [{ key: 'DocumentName', value: documentName }] : []),
  ...(invokedAfter ? [{ key: 'InvokedAfter', value: invokedAfter }] : []),
  ...(invokedBefore ? [{ key: 'InvokedBefore', value: invokedBefore }] : []),
];

export const listCommands: ActionDefinition<ListCommandsInput> = {
  isTool: true,
  scope: 'read',
  description:
    'List the commands sent with sendCommand in the last 30 days, with their document, parameters (for AWS-RunShellScript, the shell commands that ran), comment, target nodes, status, when they were sent and how many nodes completed, failed or timed out. Filter by commandId, instanceId, status, documentName, invokedAfter or invokedBefore. Pass nextToken from the response as nextToken to fetch the next page. Use getCommandInvocation for the output on a node.',
  input: ListCommandsInputSchema,
  handler: async (ctx, input) => {
    const { commandId, instanceId, maxResults, nextToken } = input;
    const filters = toCommandFilters(input);
    const data = await callSsmApi({
      ctx,
      operation: 'ListCommands',
      body: {
        CommandId: commandId,
        InstanceId: instanceId,
        Filters: filters.length > 0 ? filters : undefined,
        MaxResults: maxResults,
        NextToken: nextToken || undefined,
      },
    });
    const { Commands = [], NextToken } = ListCommandsResponseSchema.parse(data);
    return {
      commands: Commands.map(
        ({
          CommandId,
          DocumentName,
          Comment,
          Parameters,
          InstanceIds,
          RequestedDateTime,
          Status,
          TargetCount,
          CompletedCount,
          ErrorCount,
          DeliveryTimedOutCount,
        }) => ({
          commandId: CommandId,
          documentName: DocumentName,
          comment: Comment,
          parameters: Parameters,
          instanceIds: InstanceIds,
          status: Status,
          requestedDateTime: toIsoDate(RequestedDateTime),
          targetCount: TargetCount,
          completedCount: CompletedCount,
          errorCount: ErrorCount,
          deliveryTimedOutCount: DeliveryTimedOutCount,
        })
      ),
      nextToken: toNextToken(NextToken),
    };
  },
};
