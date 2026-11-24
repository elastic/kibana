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
import { documentNameOrArnSchema, documentVersionSchema, uuidSchema } from './shared';

// StartAutomationExecution's limits for runbook parameters.
const AUTOMATION_PARAMETER_NAME_MAX_LENGTH = 50;
const AUTOMATION_PARAMETERS_MAX = 200;
const AUTOMATION_PARAMETER_VALUES_MAX = 50;
const AUTOMATION_PARAMETER_VALUE_MAX_LENGTH = 512;

const StartAutomationExecutionInputSchema = lazySchema(() =>
  z.object({
    documentName: documentNameOrArnSchema().describe(
      'The Automation runbook to run, e.g. "AWS-RestartEC2Instance". AWS-owned runbooks start with "AWS-"; custom runbook names and runbook ARNs shared from another account also work.'
    ),
    parameters: z
      .record(
        z.string().min(1).max(AUTOMATION_PARAMETER_NAME_MAX_LENGTH),
        z
          .array(z.string().min(1).max(AUTOMATION_PARAMETER_VALUE_MAX_LENGTH))
          .max(AUTOMATION_PARAMETER_VALUES_MAX)
      )
      .refine(
        (parameters) => {
          const { length } = Object.keys(parameters);
          return length >= 1 && length <= AUTOMATION_PARAMETERS_MAX;
        },
        {
          message: `Pass between 1 and ${AUTOMATION_PARAMETERS_MAX} parameters, or omit parameters.`,
        }
      )
      .optional()
      .describe(
        'The parameters the runbook takes, each as a list of strings, e.g. { "InstanceId": ["i-0123456789abcdef0"] } for AWS-RestartEC2Instance. Many runbooks also take "AutomationAssumeRole": the ARN of the IAM role the runbook runs as; without it, it runs as the connector credentials.'
      ),
    documentVersion: documentVersionSchema()
      .optional()
      .describe('The runbook version to run: "$DEFAULT" (the default), "$LATEST", or a number.'),
    clientToken: uuidSchema('Must be a UUID.')
      .optional()
      .describe(
        'A UUID that identifies this start request. Retrying with the same clientToken does not start the runbook a second time.'
      ),
  })
);
type StartAutomationExecutionInput = z.infer<typeof StartAutomationExecutionInputSchema>;

const StartAutomationExecutionResponseSchema = lazySchema(() =>
  z.object({
    AutomationExecutionId: z.string().optional(),
  })
);

export const startAutomationExecution: ActionDefinition<StartAutomationExecutionInput> = {
  // Agent Builder does not ask for confirmation per call (`scope` is not consulted there), so the
  // IAM policy on the connector's credentials, or on the AutomationAssumeRole, is the only guard.
  isTool: true,
  scope: 'destroy',
  description:
    'Start an SSM Automation runbook, such as AWS-RestartEC2Instance or AWS-StopEC2Instance, which runs a sequence of AWS API calls and scripts. Pass the runbook inputs in parameters, e.g. { "InstanceId": ["i-0123456789abcdef0"] }. Returns immediately with an automationExecutionId: the runbook runs asynchronously, so call getAutomationExecution with it to follow its progress and read its outputs.',
  input: StartAutomationExecutionInputSchema,
  handler: async (ctx, { documentName, parameters, documentVersion, clientToken }) => {
    const data = await callSsmApi({
      ctx,
      operation: 'StartAutomationExecution',
      body: {
        DocumentName: documentName,
        Parameters: parameters,
        DocumentVersion: documentVersion,
        ClientToken: clientToken,
      },
    });
    const { AutomationExecutionId } = StartAutomationExecutionResponseSchema.parse(data);
    return { automationExecutionId: AutomationExecutionId };
  },
};
