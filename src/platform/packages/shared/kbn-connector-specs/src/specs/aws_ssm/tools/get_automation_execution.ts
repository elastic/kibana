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
import { automationExecutionIdSchema, isAutomationFinished, toIsoDate } from './shared';

const GetAutomationExecutionInputSchema = lazySchema(() =>
  z.object({
    automationExecutionId: automationExecutionIdSchema().describe(
      'The automationExecutionId returned by startAutomationExecution.'
    ),
  })
);
type GetAutomationExecutionInput = z.infer<typeof GetAutomationExecutionInputSchema>;

const automationOutputsSchema = () => z.record(z.string(), z.array(z.string())).optional();

const GetAutomationExecutionResponseSchema = lazySchema(() =>
  z.object({
    AutomationExecution: z
      .object({
        AutomationExecutionId: z.string().optional(),
        DocumentName: z.string().optional(),
        AutomationExecutionStatus: z.string().optional(),
        CurrentStepName: z.string().optional(),
        FailureMessage: z.string().optional(),
        Outputs: automationOutputsSchema(),
        ExecutionStartTime: z.number().optional(),
        ExecutionEndTime: z.number().optional(),
        StepExecutions: z
          .array(
            z.object({
              StepName: z.string().optional(),
              Action: z.string().optional(),
              StepStatus: z.string().optional(),
              ExecutionStartTime: z.number().optional(),
              ExecutionEndTime: z.number().optional(),
              FailureMessage: z.string().optional(),
              FailureDetails: z
                .object({
                  FailureStage: z.string().optional(),
                  FailureType: z.string().optional(),
                  Details: z.record(z.string(), z.array(z.string())).optional(),
                })
                .optional(),
              Outputs: automationOutputsSchema(),
            })
          )
          .optional(),
        StepExecutionsTruncated: z.boolean().optional(),
      })
      .optional(),
  })
);

export const getAutomationExecution: ActionDefinition<GetAutomationExecutionInput> = {
  isTool: true,
  scope: 'read',
  description:
    'Get the progress of an Automation runbook started with startAutomationExecution: its status (e.g. Pending, InProgress, Waiting, Success, Failed, TimedOut, Cancelled), the step it is on, the failure message, the outputs it declares, and each step with its action, status, failure message, failure details (stage, type and error messages, which sometimes are the only reason given) and outputs (when stepsTruncated is true, only part of the steps are listed). Call again after a few seconds while isFinished is false.',
  input: GetAutomationExecutionInputSchema,
  handler: async (ctx, { automationExecutionId }) => {
    const data = await callSsmApi({
      ctx,
      operation: 'GetAutomationExecution',
      body: { AutomationExecutionId: automationExecutionId },
    });
    const { AutomationExecution = {} } = GetAutomationExecutionResponseSchema.parse(data);
    const {
      AutomationExecutionId,
      DocumentName,
      AutomationExecutionStatus,
      CurrentStepName,
      FailureMessage,
      Outputs,
      ExecutionStartTime,
      ExecutionEndTime,
      StepExecutions = [],
      StepExecutionsTruncated,
    } = AutomationExecution;
    return {
      automationExecutionId: AutomationExecutionId,
      documentName: DocumentName,
      status: AutomationExecutionStatus,
      isFinished: isAutomationFinished(AutomationExecutionStatus),
      currentStepName: CurrentStepName,
      failureMessage: FailureMessage,
      outputs: Outputs,
      executionStartTime: toIsoDate(ExecutionStartTime) ?? null,
      executionEndTime: toIsoDate(ExecutionEndTime) ?? null,
      steps: StepExecutions.map(
        ({
          StepName,
          Action,
          StepStatus,
          ExecutionStartTime: stepStartTime,
          ExecutionEndTime: stepEndTime,
          FailureMessage: stepFailureMessage,
          FailureDetails,
          Outputs: stepOutputs,
        }) => ({
          stepName: StepName,
          action: Action,
          stepStatus: StepStatus,
          executionStartTime: toIsoDate(stepStartTime) ?? null,
          executionEndTime: toIsoDate(stepEndTime) ?? null,
          failureMessage: stepFailureMessage,
          failureDetails: FailureDetails && {
            failureStage: FailureDetails.FailureStage,
            failureType: FailureDetails.FailureType,
            details: FailureDetails.Details,
          },
          outputs: stepOutputs,
        })
      ),
      stepsTruncated: StepExecutionsTruncated ?? false,
    };
  },
};
