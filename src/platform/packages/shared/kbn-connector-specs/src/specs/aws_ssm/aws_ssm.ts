/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import { callSsmApi } from './aws_ssm_api';
import type {
  AutomationExecutionIdInput,
  CancelCommandInput,
  DescribeInstanceInformationInput,
  GetCommandInvocationInput,
  SendCommandInput,
  StartAutomationExecutionInput,
} from './types';
import {
  AutomationExecutionIdInputSchema,
  CancelCommandInputSchema,
  DescribeInstanceInformationInputSchema,
  DescribeInstanceInformationResponseSchema,
  GetAutomationExecutionResponseSchema,
  GetCommandInvocationInputSchema,
  GetCommandInvocationResponseSchema,
  SendCommandInputSchema,
  SendCommandResponseSchema,
  StartAutomationExecutionInputSchema,
  StartAutomationExecutionResponseSchema,
} from './types';

interface SsmFilter {
  Key: string;
  Values: string[];
}

const toInstanceFilters = ({
  instanceIds,
  pingStatus,
  platformType,
  tags = [],
}: DescribeInstanceInformationInput): SsmFilter[] => [
  ...(instanceIds ? [{ Key: 'InstanceIds', Values: instanceIds }] : []),
  ...(pingStatus ? [{ Key: 'PingStatus', Values: pingStatus }] : []),
  ...(platformType ? [{ Key: 'PlatformTypes', Values: platformType }] : []),
  ...tags.map(({ key, values }) => ({ Key: `tag:${key}`, Values: values })),
];

// SSM returns timestamps as epoch seconds.
const toIsoDate = (epochSeconds: number | undefined): string | undefined =>
  epochSeconds === undefined ? undefined : new Date(epochSeconds * 1000).toISOString();

/** AWS Systems Manager connector, authenticated with SigV4-signed AWS credentials. */
export const AwsSsmConnector: ConnectorSpec = {
  metadata: {
    id: '.aws_ssm',
    displayName: 'AWS Systems Manager',
    description: i18n.translate('connectorSpecs.awsSsm.metadata.description', {
      defaultMessage:
        'Find and inspect the managed nodes registered with AWS Systems Manager, run commands on them, and run Automation runbooks',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    // A new connector type must reach Production-NonCanary before it can declare
    // user-facing features. Ship ['agentBuilder'] first, then add 'workflows'
    // in a follow-up PR once this connector type exists on every Production-NonCanary node.
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: ['aws_credentials'],
  },

  schema: lazySchema(() =>
    z.object({
      region: z
        .string()
        .min(1)
        .max(30)
        .regex(/^[a-z0-9-]+$/, 'Must be a valid AWS region identifier, e.g. us-east-1.')
        .describe(
          i18n.translate('connectorSpecs.awsSsm.config.region', {
            defaultMessage: 'AWS Region (e.g., us-east-1, eu-west-1)',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.awsSsm.config.region.label', {
            defaultMessage: 'AWS Region',
          }),
          placeholder: 'us-east-1',
        }),
    })
  ),

  actions: {
    describeInstanceInformation: {
      isTool: true,
      scope: 'read',
      description:
        'List the nodes managed by AWS Systems Manager (EC2 instances and hybrid servers) with their instance ID, SSM Agent ping status and version (and whether it is the latest), association status, resource type, platform, host name and IP address. Use it to find instance IDs, to check which nodes are reachable, and to find nodes running an outdated SSM Agent: filter by pingStatus ["Online"], by platformType, by instanceIds, or by tags (tags cannot be combined with the other filters). Pass nextToken from the response as nextToken to fetch the next page.',
      input: DescribeInstanceInformationInputSchema,
      handler: async (ctx, input: DescribeInstanceInformationInput) => {
        const { maxResults, nextToken } = input;
        const filters = toInstanceFilters(input);
        const data = await callSsmApi({
          ctx,
          operation: 'DescribeInstanceInformation',
          body: {
            Filters: filters.length > 0 ? filters : undefined,
            MaxResults: maxResults,
            NextToken: nextToken,
          },
        });
        const { InstanceInformationList = [], NextToken } =
          DescribeInstanceInformationResponseSchema.parse(data);
        return {
          instances: InstanceInformationList.map(
            ({
              InstanceId,
              PingStatus,
              LastPingDateTime,
              PlatformType,
              PlatformName,
              AgentVersion,
              IsLatestVersion,
              AssociationStatus,
              ResourceType,
              ComputerName,
              IPAddress,
            }) => ({
              instanceId: InstanceId,
              pingStatus: PingStatus,
              lastPingDateTime: toIsoDate(LastPingDateTime),
              platformType: PlatformType,
              platformName: PlatformName,
              agentVersion: AgentVersion,
              isLatestAgentVersion: IsLatestVersion,
              associationStatus: AssociationStatus,
              resourceType: ResourceType,
              computerName: ComputerName,
              ipAddress: IPAddress,
            })
          ),
          // SSM answers an empty string on the last page.
          nextToken: NextToken || null,
        };
      },
    },

    sendCommand: {
      // Runs arbitrary commands on the given nodes. Agent Builder does not ask for confirmation
      // per call (`scope` is not consulted there), so the only guards are the IAM policy on the
      // connector's credentials and which agents the connector is assigned to. Targeting is
      // limited to explicit instance IDs so every call names the nodes it affects.
      isTool: true,
      scope: 'destroy',
      description:
        'Run an SSM document, typically shell commands, on up to 50 managed nodes. Use "AWS-RunShellScript" with parameters { "commands": [...] } for Linux and macOS, or "AWS-RunPowerShellScript" for Windows; get the instance IDs from describeInstanceInformation and check the nodes are Online first. Returns immediately with a commandId and status Pending: the command runs asynchronously, so call getCommandInvocation with the commandId and each instance ID to read the result. The commands run with the privileges of SSM Agent on the node (root or SYSTEM).',
      input: SendCommandInputSchema,
      handler: async (
        ctx,
        {
          instanceIds,
          documentName,
          parameters,
          documentVersion,
          comment,
          timeoutSeconds,
        }: SendCommandInput
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
        return {
          commandId: Command.CommandId,
          documentName: Command.DocumentName,
          instanceIds: Command.InstanceIds,
          status: Command.Status,
          requestedDateTime: toIsoDate(Command.RequestedDateTime),
        };
      },
    },

    getCommandInvocation: {
      isTool: true,
      scope: 'read',
      description:
        'Get the result of a command sent with sendCommand on one node: its status (Pending, InProgress, Delayed, Success, Failed, TimedOut, Cancelled, Cancelling), the exit code, standard output (up to 24,000 characters) and standard error (up to 8,000 characters), and when it started and ended. Call again after a few seconds while the status is Pending, InProgress or Delayed. Right after sendCommand this can fail with InvocationDoesNotExist for a few seconds; wait and retry.',
      input: GetCommandInvocationInputSchema,
      handler: async (ctx, { commandId, instanceId }: GetCommandInvocationInput) => {
        const data = await callSsmApi({
          ctx,
          operation: 'GetCommandInvocation',
          body: { CommandId: commandId, InstanceId: instanceId },
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
    },

    cancelCommand: {
      isTool: true,
      scope: 'destroy',
      description:
        'Cancel a command sent with sendCommand, on every node it was sent to or only on the given instanceIds. Cancelling is best effort: a node that already finished keeps its result, and one that is running the command may not stop it. Call getCommandInvocation afterwards to see whether each node reached Cancelled.',
      input: CancelCommandInputSchema,
      handler: async (ctx, { commandId, instanceIds }: CancelCommandInput) => {
        await callSsmApi({
          ctx,
          operation: 'CancelCommand',
          body: { CommandId: commandId, InstanceIds: instanceIds },
        });
        return { success: true };
      },
    },

    startAutomationExecution: {
      // Runs an Automation runbook, which calls AWS APIs with the role passed as
      // AutomationAssumeRole or with the connector's credentials. As with sendCommand, Agent Builder
      // does not ask for confirmation per call, so IAM is the guard. Rate-controlled targeting
      // (Targets, TargetMaps), multi-account TargetLocations and Interactive mode are left out.
      isTool: true,
      scope: 'destroy',
      description:
        'Start an SSM Automation runbook, such as AWS-RestartEC2Instance or AWS-StopEC2Instance, which runs a sequence of AWS API calls and scripts. Pass the runbook inputs in parameters, e.g. { "InstanceId": ["i-0123456789abcdef0"] }. Returns immediately with an automationExecutionId: the runbook runs asynchronously, so call getAutomationExecution with it to follow its progress and read its outputs.',
      input: StartAutomationExecutionInputSchema,
      handler: async (
        ctx,
        { documentName, parameters, documentVersion, clientToken }: StartAutomationExecutionInput
      ) => {
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
    },

    getAutomationExecution: {
      isTool: true,
      scope: 'read',
      description:
        'Get the progress of an Automation runbook started with startAutomationExecution: its status (e.g. Pending, InProgress, Waiting, Success, Failed, TimedOut, Cancelled), the step it is on, the failure message, the outputs it declares, and each step with its action, status, failure message and outputs. Call again after a few seconds while the status is Pending, InProgress, Waiting or Cancelling.',
      input: AutomationExecutionIdInputSchema,
      handler: async (ctx, { automationExecutionId }: AutomationExecutionIdInput) => {
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
              Outputs: stepOutputs,
            }) => ({
              stepName: StepName,
              action: Action,
              stepStatus: StepStatus,
              executionStartTime: toIsoDate(stepStartTime) ?? null,
              executionEndTime: toIsoDate(stepEndTime) ?? null,
              failureMessage: stepFailureMessage,
              outputs: stepOutputs,
            })
          ),
          stepsTruncated: StepExecutionsTruncated ?? false,
        };
      },
    },

    stopAutomationExecution: {
      isTool: true,
      scope: 'destroy',
      description:
        'Cancel an Automation runbook started with startAutomationExecution. Steps that already ran are not undone. Call getAutomationExecution afterwards to confirm the status reached Cancelled.',
      input: AutomationExecutionIdInputSchema,
      handler: async (ctx, { automationExecutionId }: AutomationExecutionIdInput) => {
        await callSsmApi({
          ctx,
          operation: 'StopAutomationExecution',
          body: { AutomationExecutionId: automationExecutionId },
        });
        return { success: true };
      },
    },
  },

  skill: [
    '## AWS Systems Manager Connector',
    '',
    'Use this connector to find and inspect the managed nodes (EC2 instances and hybrid servers running SSM Agent) registered with Systems Manager in the region configured on the connector, to run commands on them, and to run Automation runbooks.',
    '',
    '### Common patterns',
    '- To find unreachable nodes, call `describeInstanceInformation` with `pingStatus: ["ConnectionLost"]`.',
    '- To run a shell command: find the nodes with `describeInstanceInformation` (they must be `Online`), call `sendCommand` with `documentName: "AWS-RunShellScript"` (or `"AWS-RunPowerShellScript"` on Windows) and `parameters: { "commands": [...] }`, then call `getCommandInvocation` with the returned `commandId` and each instance ID until `status` is no longer `Pending`, `InProgress` or `Delayed`.',
    '- To run an Automation runbook (e.g. `AWS-RestartEC2Instance` with `parameters: { "InstanceId": ["i-..."] }`): call `startAutomationExecution`, then call `getAutomationExecution` with the returned `automationExecutionId` until `status` is no longer `Pending`, `InProgress`, `Waiting` or `Cancelling`. On `Failed`, the failed step\'s `failureMessage` says why.',
    '- To stop something you started, call `cancelCommand` for a command or `stopAutomationExecution` for a runbook, then read its status again to confirm it was cancelled.',
    '- To find nodes running an outdated SSM Agent, list the nodes and keep those with `isLatestAgentVersion: false`.',
    '- To scope to a team or environment, filter by `tags`, e.g. `[{ key: "Environment", values: ["Production"] }]`. Tags cannot be combined with `instanceIds`, `pingStatus` or `platformType` in the same call; filter the returned list yourself for the rest.',
    '',
    '### Gotchas',
    '- Results are paged (10 nodes by default, `maxResults` 5-50). While `nextToken` is not null, call again with it and the same filters. Do not report a fleet-wide count from a single page.',
    '- Stopped and terminated EC2 instances are never returned, so a missing node may simply be stopped.',
    '- Passing an `instanceIds` value that is not a managed node, or that the credentials cannot see, fails with an `InvalidInstanceId` error rather than returning an empty list.',
    '- Only the connector region is searched; nodes in other regions need a connector configured for that region.',
    '- `sendCommand` runs commands as root (or SYSTEM on Windows). Only run what the user asked for, and confirm the target nodes with the user before changing anything on them.',
    '- `getCommandInvocation` can fail with `InvocationDoesNotExist` for a few seconds after `sendCommand`; wait and retry. If it keeps failing, the `commandId` and instance ID do not belong together.',
    '- A node that is not `Online` does not run the command until it reconnects, within `timeoutSeconds`.',
    '- Runbooks change AWS resources (restart, stop or patch instances, and more). Confirm the runbook and its parameters with the user before starting one. Cancelling a command or runbook does not undo what already ran.',
    '- A runbook without an `AutomationAssumeRole` parameter runs with the connector credentials, and fails with an access error if they lack the permissions the runbook needs.',
    "- When `stepsTruncated` is true, `steps` lists only part of the runbook's steps.",
  ].join('\n'),

  test: {
    handler: async (ctx) => {
      await callSsmApi({
        ctx,
        operation: 'DescribeInstanceInformation',
        body: { MaxResults: 5 },
      });
      return {};
    },
    description: i18n.translate('connectorSpecs.awsSsm.test.description', {
      defaultMessage: 'Verifies AWS Systems Manager API credentials',
    }),
    enabled: true,
  },
};
