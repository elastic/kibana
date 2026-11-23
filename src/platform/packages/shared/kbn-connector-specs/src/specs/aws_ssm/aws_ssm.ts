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
import { findNodesByInventory } from './tools/find_nodes_by_inventory';
import { getAutomationExecution } from './tools/get_automation_execution';
import { getCommandInvocation } from './tools/get_command_invocation';
import { getDocument } from './tools/get_document';
import { getInventory } from './tools/get_inventory';
import { getParameter } from './tools/get_parameter';
import { listAutomationExecutions } from './tools/list_automation_executions';
import { listCommands } from './tools/list_commands';
import { listDocuments } from './tools/list_documents';
import { putParameter } from './tools/put_parameter';
import { sendCommand } from './tools/send_command';
import { startAutomationExecution } from './tools/start_automation_execution';
import { stopAutomationExecution } from './tools/stop_automation_execution';

// Commercial and GovCloud Regions only: China (`cn-*`) and ISO (`*-iso*`) Regions serve SSM from
// other domains than the `amazonaws.com` one callSsmApi sends requests to.
const REGION_PATTERN = /^(?!cn-)(?![a-z]{2}-iso)[a-z]{2}(-[a-z]+)+-\d$/;

/** AWS Systems Manager connector, authenticated with SigV4-signed AWS credentials. */
export const AwsSsmConnector: ConnectorSpec = {
  metadata: {
    id: '.aws_ssm',
    displayName: 'AWS Systems Manager',
    description: i18n.translate('connectorSpecs.awsSsm.metadata.description', {
      defaultMessage:
        'Inspect AWS Systems Manager nodes and their inventory, run commands and runbooks, and read and write Parameter Store values',
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
        .regex(
          REGION_PATTERN,
          'Must be an AWS commercial or GovCloud Region such as us-east-1; China and ISO Regions are not supported.'
        )
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
    getInventory,
    findNodesByInventory,
    listDocuments,
    getDocument,
    sendCommand,
    getCommandInvocation,
    listCommands,
    cancelCommand,
    startAutomationExecution,
    getAutomationExecution,
    listAutomationExecutions,
    stopAutomationExecution,
    getParameter,
    putParameter,
  },

  skill: [
    '## AWS Systems Manager Connector',
    '',
    'Use this connector to find and inspect the managed nodes (EC2 instances and hybrid servers running SSM Agent) registered with Systems Manager in the region configured on the connector, to read their software inventory, to run commands on them, to run Automation runbooks, and to read and write Parameter Store values.',
    '',
    '### Common patterns',
    '- To run a shell command: pick the nodes with `describeInstanceInformation` and `pingStatus: ["Online"]`, call `sendCommand`, then call `getCommandInvocation` for each node until `isFinished` is true.',
    "- To run an Automation runbook: find it with `listDocuments`, read its parameters and steps with `getDocument`, confirm with the user, call `startAutomationExecution`, then call `getAutomationExecution` until `isFinished` is true. On failure, the failed step's `failureMessage` or `failureDetails` says why.",
    '- To stop something you started, call `cancelCommand` for a command or `stopAutomationExecution` for a runbook, then read its status again to confirm it was cancelled.',
    '- To see what ran on a node, call `listCommands` with its `instanceId`, then `getCommandInvocation` for the output.',
    '- To check installed software or patches: call `findNodesByInventory` to find the nodes with an application, then `getInventory` on a node for its version. Prefer inventory over running a command when it answers the question.',
    '',
    '### Gotchas',
    '- Every list action is paged: while `nextToken` is not null, call again with it and the same filters. Do not report a fleet-wide count from a single page.',
    '- Only the connector region is searched; nodes in other regions need a connector configured for that region.',
    '- Stopped and terminated EC2 instances are not managed nodes: they are never returned, and passing their ID fails with `InvalidInstanceId`.',
    '- `sendCommand` runs as root (or SYSTEM on Windows) and runbooks change AWS resources. Only run what the user asked for, and confirm the target nodes or runbook parameters with the user first. Cancelling does not undo what already ran.',
    '- Do not try to obtain `SecureString` values another way, such as with `sendCommand`.',
    '- Runbook executions are not commands: `listCommands` does not show them, `listAutomationExecutions` does.',
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
