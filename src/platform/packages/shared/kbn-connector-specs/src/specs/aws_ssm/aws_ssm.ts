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
import type { DescribeInstanceInformationInput } from './types';
import {
  DescribeInstanceInformationInputSchema,
  DescribeInstanceInformationResponseSchema,
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
      defaultMessage: 'Find and inspect the managed nodes registered with AWS Systems Manager',
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
  },

  skill: [
    '## AWS Systems Manager Connector',
    '',
    'Use this connector to find and inspect the managed nodes (EC2 instances and hybrid servers running SSM Agent) registered with Systems Manager in the region configured on the connector.',
    '',
    '### Common patterns',
    '- To find unreachable nodes, call `describeInstanceInformation` with `pingStatus: ["ConnectionLost"]`.',
    '- To find nodes running an outdated SSM Agent, list the nodes and keep those with `isLatestAgentVersion: false`.',
    '- To scope to a team or environment, filter by `tags`, e.g. `[{ key: "Environment", values: ["Production"] }]`. Tags cannot be combined with `instanceIds`, `pingStatus` or `platformType` in the same call; filter the returned list yourself for the rest.',
    '',
    '### Gotchas',
    '- Results are paged (10 nodes by default, `maxResults` 5-50). While `nextToken` is not null, call again with it and the same filters. Do not report a fleet-wide count from a single page.',
    '- Stopped and terminated EC2 instances are never returned, so a missing node may simply be stopped.',
    '- Passing an `instanceIds` value that is not a managed node, or that the credentials cannot see, fails with an `InvalidInstanceId` error rather than returning an empty list.',
    '- Only the connector region is searched; nodes in other regions need a connector configured for that region.',
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
