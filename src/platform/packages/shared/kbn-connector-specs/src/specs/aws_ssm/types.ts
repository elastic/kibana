/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// DescribeInstanceInformation returns 5-50 nodes per page.
const MAX_RESULTS_MIN = 5;
const MAX_RESULTS_MAX = 50;
// SSM documents no length limit for NextToken; this only guards against unbounded input.
const NEXT_TOKEN_MAX_LENGTH = 4096;
// An SSM filter takes at most 100 values.
const FILTER_VALUES_MAX = 100;
// The pattern SSM's model gives InstanceId: an EC2 instance (i-) or a hybrid managed node (mi-).
const INSTANCE_ID_PATTERN = /^(i-(\w{8}|\w{17})|mi-\w{17})$/;
const INSTANCE_ID_MAX_LENGTH = 20;
const TAG_KEY_MAX_LENGTH = 128;
const TAG_VALUE_MAX_LENGTH = 256;
// SSM documents no limit on the number of tag filters; this only guards against unbounded input.
const TAG_FILTERS_MAX = 10;

const PING_STATUSES = ['Online', 'ConnectionLost', 'Inactive'] as const;
const PLATFORM_TYPES = ['Windows', 'Linux', 'MacOS'] as const;

// SendCommand and CancelCommand take at most 50 instance IDs.
const SEND_COMMAND_INSTANCE_IDS_MAX = 50;
// The patterns SSM's model gives the DocumentName and DocumentVersion of SendCommand and
// StartAutomationExecution.
const DOCUMENT_NAME_PATTERN = /^[a-zA-Z0-9_\-.:/]{3,128}$/;
const DOCUMENT_NAME_MAX_LENGTH = 128;
const DOCUMENT_VERSION_PATTERN = /^(\$LATEST|\$DEFAULT|[1-9][0-9]*)$/;
const DOCUMENT_VERSION_MAX_LENGTH = 16;
const COMMENT_MAX_LENGTH = 100;
const TIMEOUT_SECONDS_MIN = 30;
const TIMEOUT_SECONDS_MAX = 2592000;
// SSM documents no limits for document parameters; these only guard against unbounded input.
const PARAMETER_NAME_MAX_LENGTH = 255;
const PARAMETERS_MAX = 50;
const PARAMETER_VALUES_MAX = 100;
const PARAMETER_VALUE_MAX_LENGTH = 65536;
// StartAutomationExecution's limits for runbook parameters.
const AUTOMATION_PARAMETER_NAME_MAX_LENGTH = 50;
const AUTOMATION_PARAMETERS_MAX = 200;
const AUTOMATION_PARAMETER_VALUES_MAX = 50;
const AUTOMATION_PARAMETER_VALUE_MAX_LENGTH = 512;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_LENGTH = 36;
// SSM's model only fixes the length of an automation execution ID, not its format.
const AUTOMATION_EXECUTION_ID_LENGTH = 36;

const instanceIdSchema = () =>
  z
    .string()
    .max(INSTANCE_ID_MAX_LENGTH)
    .regex(
      INSTANCE_ID_PATTERN,
      'Must be an EC2 instance ID (i-...) or a managed node ID (mi-...).'
    );

const commandIdSchema = () =>
  z
    .string()
    .min(UUID_LENGTH)
    .max(UUID_LENGTH)
    .regex(UUID_PATTERN, 'Must be a command ID returned by sendCommand.');

const automationExecutionIdSchema = () =>
  z.string().min(AUTOMATION_EXECUTION_ID_LENGTH).max(AUTOMATION_EXECUTION_ID_LENGTH);

const documentNameSchema = () =>
  z
    .string()
    .max(DOCUMENT_NAME_MAX_LENGTH)
    .regex(DOCUMENT_NAME_PATTERN, 'Must be the name or ARN of an SSM document.');

const documentVersionSchema = () =>
  z
    .string()
    .max(DOCUMENT_VERSION_MAX_LENGTH)
    .regex(DOCUMENT_VERSION_PATTERN, 'Must be $DEFAULT, $LATEST, or a version number.');

export const DescribeInstanceInformationInputSchema = lazySchema(() =>
  z
    .object({
      instanceIds: z
        .array(instanceIdSchema())
        .min(1)
        .max(FILTER_VALUES_MAX)
        .optional()
        .describe(
          'Only return these nodes, by EC2 instance ID (e.g. i-0123456789abcdef0) or hybrid managed node ID (e.g. mi-0123456789abcdef0).'
        ),
      pingStatus: z
        .array(z.enum(PING_STATUSES))
        .min(1)
        .max(PING_STATUSES.length)
        .optional()
        .describe(
          'Only return nodes whose SSM Agent is in one of these states. Use ["Online"] for nodes that are reachable now.'
        ),
      platformType: z
        .array(z.enum(PLATFORM_TYPES))
        .min(1)
        .max(PLATFORM_TYPES.length)
        .optional()
        .describe('Only return nodes running one of these operating system families.'),
      tags: z
        .array(
          z.object({
            key: z.string().min(1).max(TAG_KEY_MAX_LENGTH).describe('Tag key, e.g. Environment.'),
            values: z
              .array(z.string().min(1).max(TAG_VALUE_MAX_LENGTH))
              .min(1)
              .max(FILTER_VALUES_MAX)
              .describe('Tag values to match; a node matches when its tag has any of them.'),
          })
        )
        .min(1)
        .max(TAG_FILTERS_MAX)
        .optional()
        .describe(
          'Only return nodes that have every one of these tags. Cannot be combined with instanceIds, pingStatus or platformType.'
        ),
      maxResults: z
        .number()
        .int()
        .min(MAX_RESULTS_MIN)
        .max(MAX_RESULTS_MAX)
        .optional()
        .describe(
          `Maximum number of nodes to return (${MAX_RESULTS_MIN}-${MAX_RESULTS_MAX}). Defaults to 10.`
        ),
      nextToken: z
        .string()
        .max(NEXT_TOKEN_MAX_LENGTH)
        .optional()
        .describe('Pagination token from a previous response. Omit to fetch the first page.'),
    })
    .refine(
      ({ tags, instanceIds, pingStatus, platformType }) =>
        tags === undefined ||
        (instanceIds === undefined && pingStatus === undefined && platformType === undefined),
      {
        message:
          'AWS Systems Manager cannot combine tag filters with other filters: use either "tags", or "instanceIds", "pingStatus" and "platformType".',
        path: ['tags'],
      }
    )
);
export type DescribeInstanceInformationInput = z.infer<
  typeof DescribeInstanceInformationInputSchema
>;

// The fields the connector returns; others are dropped by parsing. Enums stay plain strings so a
// value AWS adds later doesn't fail the action.
export const DescribeInstanceInformationResponseSchema = lazySchema(() =>
  z.object({
    InstanceInformationList: z
      .array(
        z.object({
          InstanceId: z.string().optional(),
          PingStatus: z.string().optional(),
          LastPingDateTime: z.number().optional(),
          PlatformType: z.string().optional(),
          PlatformName: z.string().optional(),
          AgentVersion: z.string().optional(),
          IsLatestVersion: z.boolean().optional(),
          AssociationStatus: z.string().optional(),
          ResourceType: z.string().optional(),
          ComputerName: z.string().optional(),
          IPAddress: z.string().optional(),
        })
      )
      .optional(),
    NextToken: z.string().optional(),
  })
);

export const SendCommandInputSchema = lazySchema(() =>
  z.object({
    instanceIds: z
      .array(instanceIdSchema())
      .min(1)
      .max(SEND_COMMAND_INSTANCE_IDS_MAX)
      .describe(
        `The managed nodes to run the command on (1-${SEND_COMMAND_INSTANCE_IDS_MAX}), by EC2 instance ID (e.g. i-0123456789abcdef0) or hybrid managed node ID (e.g. mi-0123456789abcdef0). Find them with describeInstanceInformation.`
      ),
    documentName: documentNameSchema().describe(
      'The SSM document to run. Use "AWS-RunShellScript" for shell commands on Linux and macOS nodes, or "AWS-RunPowerShellScript" for PowerShell on Windows nodes. Other AWS-owned or custom document names, and document ARNs shared from another account, also work.'
    ),
    parameters: z
      .record(
        z.string().min(1).max(PARAMETER_NAME_MAX_LENGTH),
        z.array(z.string().max(PARAMETER_VALUE_MAX_LENGTH)).max(PARAMETER_VALUES_MAX)
      )
      .refine((parameters) => Object.keys(parameters).length <= PARAMETERS_MAX, {
        message: `At most ${PARAMETERS_MAX} parameters are allowed.`,
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
export type SendCommandInput = z.infer<typeof SendCommandInputSchema>;

export const SendCommandResponseSchema = lazySchema(() =>
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

export const GetCommandInvocationInputSchema = lazySchema(() =>
  z.object({
    commandId: commandIdSchema().describe(
      'The commandId returned by sendCommand, e.g. 2b8e7fd1-8a2e-4b8f-9d6a-0123456789ab.'
    ),
    instanceId: instanceIdSchema().describe(
      'One of the instance IDs the command was sent to. Call once per node to get each result.'
    ),
  })
);
export type GetCommandInvocationInput = z.infer<typeof GetCommandInvocationInputSchema>;

export const GetCommandInvocationResponseSchema = lazySchema(() =>
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

export const CancelCommandInputSchema = lazySchema(() =>
  z.object({
    commandId: commandIdSchema().describe('The commandId returned by sendCommand.'),
    instanceIds: z
      .array(instanceIdSchema())
      .min(1)
      .max(SEND_COMMAND_INSTANCE_IDS_MAX)
      .optional()
      .describe(
        'Only cancel the command on these nodes. Omit to cancel it on every node it was sent to.'
      ),
  })
);
export type CancelCommandInput = z.infer<typeof CancelCommandInputSchema>;

export const StartAutomationExecutionInputSchema = lazySchema(() =>
  z.object({
    documentName: documentNameSchema().describe(
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
    clientToken: z
      .string()
      .min(UUID_LENGTH)
      .max(UUID_LENGTH)
      .regex(UUID_PATTERN, 'Must be a UUID.')
      .optional()
      .describe(
        'A UUID that identifies this start request. Retrying with the same clientToken does not start the runbook a second time.'
      ),
  })
);
export type StartAutomationExecutionInput = z.infer<typeof StartAutomationExecutionInputSchema>;

export const StartAutomationExecutionResponseSchema = lazySchema(() =>
  z.object({
    AutomationExecutionId: z.string().optional(),
  })
);

export const AutomationExecutionIdInputSchema = lazySchema(() =>
  z.object({
    automationExecutionId: automationExecutionIdSchema().describe(
      'The automationExecutionId returned by startAutomationExecution.'
    ),
  })
);
export type AutomationExecutionIdInput = z.infer<typeof AutomationExecutionIdInputSchema>;

const automationOutputsSchema = () => z.record(z.string(), z.array(z.string())).optional();

export const GetAutomationExecutionResponseSchema = lazySchema(() =>
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
              Outputs: automationOutputsSchema(),
            })
          )
          .optional(),
        StepExecutionsTruncated: z.boolean().optional(),
      })
      .optional(),
  })
);
