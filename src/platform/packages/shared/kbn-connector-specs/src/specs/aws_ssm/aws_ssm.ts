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
import { cancelCommand } from './tools/cancel_command';
import { describeInstanceInformation } from './tools/describe_instance_information';
import { getAutomationExecution } from './tools/get_automation_execution';
import { getCommandInvocation } from './tools/get_command_invocation';
import { getDocument } from './tools/get_document';
import { listCommands } from './tools/list_commands';
import { listDocuments } from './tools/list_documents';
import { sendCommand } from './tools/send_command';
import { startAutomationExecution } from './tools/start_automation_execution';
import { stopAutomationExecution } from './tools/stop_automation_execution';

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
    describeInstanceInformation,
    listDocuments,
    getDocument,
    sendCommand,
    getCommandInvocation,
    listCommands,
    cancelCommand,
    startAutomationExecution,
    getAutomationExecution,
    stopAutomationExecution,
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
    '- To find what you can run, call `listDocuments` with `documentType` (`"Command"` or `"Automation"`) and `owner: "Self"` for the account\'s own documents or a `namePrefix` such as `"AWS-"`; then call `getDocument` to read the parameters it takes and what it does, and tell the user before running it.',
    '- To see what ran on a node, call `listCommands` with its `instanceId` (and `invokedAfter` to narrow the window); `parameters` shows the commands that ran, and `getCommandInvocation` gives the output.',
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
    '- `listDocuments` without filters returns hundreds of AWS-owned documents; always filter it.',
    '- `listCommands` only covers the last 30 days, and runbook executions are not commands: they do not appear there.',
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
