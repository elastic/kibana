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
import type { SsmFilter } from './shared';
import { isAutomationFinished, nextTokenSchema, toIsoDate, toNextToken } from './shared';

const MAX_RESULTS_MAX = 50;
const FILTER_VALUE_MAX_LENGTH = 150;
const FILTER_VALUES_MAX = 10;
const TIMESTAMP_MAX_LENGTH = 64;

const AUTOMATION_STATUSES = [
  'Pending',
  'InProgress',
  'Waiting',
  'Success',
  'TimedOut',
  'Cancelling',
  'Cancelled',
  'Failed',
  'PendingApproval',
  'Approved',
  'Rejected',
  'Scheduled',
  'RunbookInProgress',
  'PendingChangeCalendarOverride',
  'ChangeCalendarOverrideApproved',
  'ChangeCalendarOverrideRejected',
  'CompletedWithSuccess',
  'CompletedWithFailure',
  'Exited',
] as const;

const timestampSchema = () => z.string().max(TIMESTAMP_MAX_LENGTH).datetime({ offset: true });

const ListAutomationExecutionsInputSchema = lazySchema(() =>
  z.object({
    documentNamePrefix: z
      .string()
      .min(1)
      .max(FILTER_VALUE_MAX_LENGTH)
      .optional()
      .describe(
        'Only return executions of runbooks whose name starts with this, e.g. "AWS-Restart".'
      ),
    status: z
      .array(z.enum(AUTOMATION_STATUSES))
      .min(1)
      .max(FILTER_VALUES_MAX)
      .optional()
      .describe('Only return executions in one of these statuses, e.g. ["InProgress", "Pending"].'),
    startTimeAfter: timestampSchema()
      .optional()
      .describe(
        'Only return executions started after this ISO 8601 time, e.g. 2026-11-01T00:00:00Z.'
      ),
    startTimeBefore: timestampSchema()
      .optional()
      .describe('Only return executions started before this ISO 8601 time.'),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_MAX)
      .optional()
      .describe(`Maximum number of executions to return (1-${MAX_RESULTS_MAX}).`),
    nextToken: nextTokenSchema(),
  })
);
type ListAutomationExecutionsInput = z.infer<typeof ListAutomationExecutionsInputSchema>;

const ListAutomationExecutionsResponseSchema = lazySchema(() =>
  z.object({
    AutomationExecutionMetadataList: z
      .array(
        z.object({
          AutomationExecutionId: z.string().optional(),
          DocumentName: z.string().optional(),
          DocumentVersion: z.string().optional(),
          AutomationExecutionStatus: z.string().optional(),
          ExecutionStartTime: z.number().optional(),
          ExecutionEndTime: z.number().optional(),
          ExecutedBy: z.string().optional(),
          Mode: z.string().optional(),
          ParentAutomationExecutionId: z.string().optional(),
          CurrentStepName: z.string().optional(),
          FailureMessage: z.string().optional(),
        })
      )
      .optional(),
    NextToken: z.string().optional(),
  })
);

const toAutomationFilters = ({
  documentNamePrefix,
  status,
  startTimeAfter,
  startTimeBefore,
}: ListAutomationExecutionsInput): SsmFilter[] => [
  ...(documentNamePrefix ? [{ Key: 'DocumentNamePrefix', Values: [documentNamePrefix] }] : []),
  ...(status ? [{ Key: 'ExecutionStatus', Values: status }] : []),
  ...(startTimeAfter ? [{ Key: 'StartTimeAfter', Values: [startTimeAfter] }] : []),
  ...(startTimeBefore ? [{ Key: 'StartTimeBefore', Values: [startTimeBefore] }] : []),
];

export const listAutomationExecutions: ActionDefinition<ListAutomationExecutionsInput> = {
  isTool: true,
  scope: 'read',
  description:
    'List Automation runbook executions, running and finished, with their runbook, status, isFinished, who started them, when they started and ended, the step they are on and the failure message. Filter by documentNamePrefix, status, startTimeAfter or startTimeBefore, for example to check whether a runbook is already running before starting it again. Pass nextToken from the response as nextToken to fetch the next page. Use getAutomationExecution for the steps and outputs of one execution.',
  input: ListAutomationExecutionsInputSchema,
  handler: async (ctx, input) => {
    const { maxResults, nextToken } = input;
    const filters = toAutomationFilters(input);
    const data = await callSsmApi({
      ctx,
      operation: 'DescribeAutomationExecutions',
      body: {
        Filters: filters.length > 0 ? filters : undefined,
        MaxResults: maxResults,
        NextToken: nextToken,
      },
    });
    const { AutomationExecutionMetadataList = [], NextToken } =
      ListAutomationExecutionsResponseSchema.parse(data);
    return {
      automationExecutions: AutomationExecutionMetadataList.map(
        ({
          AutomationExecutionId,
          DocumentName,
          DocumentVersion,
          AutomationExecutionStatus,
          ExecutionStartTime,
          ExecutionEndTime,
          ExecutedBy,
          Mode,
          ParentAutomationExecutionId,
          CurrentStepName,
          FailureMessage,
        }) => ({
          automationExecutionId: AutomationExecutionId,
          documentName: DocumentName,
          documentVersion: DocumentVersion,
          status: AutomationExecutionStatus,
          isFinished: isAutomationFinished(AutomationExecutionStatus),
          executedBy: ExecutedBy,
          mode: Mode,
          parentAutomationExecutionId: ParentAutomationExecutionId,
          currentStepName: CurrentStepName,
          failureMessage: FailureMessage,
          executionStartTime: toIsoDate(ExecutionStartTime) ?? null,
          executionEndTime: toIsoDate(ExecutionEndTime) ?? null,
        })
      ),
      nextToken: toNextToken(NextToken),
    };
  },
};
