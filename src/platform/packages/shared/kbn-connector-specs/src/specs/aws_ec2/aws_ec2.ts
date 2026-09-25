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
import {
  callEc2Api,
  filterParams,
  ipPermissionParams,
  listParams,
  readXmlBoolean,
  readXmlNumber,
  tagParams,
  toArray,
  trimInstance,
  trimSecurityGroup,
  trimSecurityGroupRule,
  trimStateChange,
} from './aws_ec2_api';
import {
  CreateSecurityGroupInputSchema,
  CreateSnapshotInputSchema,
  CreateTagsInputSchema,
  DeleteSecurityGroupInputSchema,
  DeleteTagsInputSchema,
  DescribeImagesInputSchema,
  DescribeInstancesInputSchema,
  DescribeSecurityGroupRulesInputSchema,
  DescribeSecurityGroupsInputSchema,
  DescribeSnapshotsInputSchema,
  DescribeSubnetsInputSchema,
  DescribeVpcsInputSchema,
  InstanceRefInputSchema,
  ModifyInstanceSecurityGroupsInputSchema,
  ModifySecurityGroupRuleInputSchema,
  SecurityGroupRulesInputSchema,
  StopInstanceInputSchema,
} from './types';
import type {
  CreateSecurityGroupInput,
  CreateSnapshotInput,
  CreateTagsInput,
  DeleteSecurityGroupInput,
  DeleteTagsInput,
  DescribeImagesInput,
  DescribeInstancesInput,
  DescribeSecurityGroupRulesInput,
  DescribeSecurityGroupsInput,
  DescribeSnapshotsInput,
  DescribeSubnetsInput,
  DescribeVpcsInput,
  InstanceRefInput,
  ModifyInstanceSecurityGroupsInput,
  ModifySecurityGroupRuleInput,
  SecurityGroupRulesInput,
  StopInstanceInput,
} from './types';

/** Shapes a Start/Stop/TerminateInstances response, which all share InstanceStateChange. */
function readStateChange(data: Record<string, unknown>) {
  const change = toArray(data.instancesSet).map(trimStateChange)[0];
  if (!change) {
    throw new Error('AWS EC2 returned no instance state change for the request.');
  }
  return change;
}

/**
 * Reports a revoke honestly. AWS answers `return: true` even when nothing
 * matched, listing the misses in `unknownIpPermissionSet`, so a containment
 * step that silently did nothing would otherwise look like a success.
 */
function summarizeRevoke(groupId: string, data: Record<string, unknown>) {
  const revokedRules = toArray(data.revokedSecurityGroupRuleSet).map(trimSecurityGroupRule);
  const unmatched = toArray(data.unknownIpPermissionSet);
  const changed = unmatched.length === 0;
  return {
    groupId,
    changed,
    ...(changed
      ? {}
      : {
          reason:
            'AWS matched none of the requested rules, so no access was removed. Rule properties must match an existing rule exactly; prefer revoking by securityGroupRuleId from describeSecurityGroupRules.',
        }),
    revokedRules,
    unmatchedRules: unmatched.map((permission) => ({
      ipProtocol: permission.ipProtocol,
      // Parsed, not passed through: xml2js yields strings, and these are the
      // same fields the trim helpers expose as numbers. Leaving them raw here
      // would hand a workflow "9999" from one action and 9999 from another.
      fromPort: readXmlNumber(permission.fromPort),
      toPort: readXmlNumber(permission.toPort),
      cidrIpv4: toArray(permission.ipRanges).map((range) => range.cidrIp),
    })),
  };
}

/** Maps the action input's rule shape onto the API helper\'s permission shape. */
function toIpPermissions(input: SecurityGroupRulesInput) {
  return input.ipPermissions.map((permission) => ({
    ipProtocol: permission.ipProtocol,
    fromPort: permission.fromPort,
    toPort: permission.toPort,
    cidrIpv4: permission.cidrIpv4,
    cidrIpv6: permission.cidrIpv6,
    sourceSecurityGroupId: permission.sourceSecurityGroupIds,
    description: permission.description,
  }));
}

/** Builds `TagSpecification.1.Tag.N.*` params for a create action. */
function tagSpecParams(
  resourceType: string,
  tags: ReadonlyArray<{ key: string; value: string }>
): Record<string, string> {
  const params: Record<string, string> = {
    'TagSpecification.1.ResourceType': resourceType,
  };
  tags.forEach((tag, index) => {
    params[`TagSpecification.1.Tag.${index + 1}.Key`] = tag.key;
    params[`TagSpecification.1.Tag.${index + 1}.Value`] = tag.value;
  });
  return params;
}

/**
 * AWS rejects MaxResults when explicit resource ids are supplied
 * (InvalidParameterCombination), so pagination params are only sent for an
 * unscoped listing.
 */
function paginationParams(
  input: { maxResults?: string; nextToken?: string },
  ids: readonly string[] | undefined
): Record<string, string> {
  return {
    ...(input.maxResults && !ids?.length ? { MaxResults: input.maxResults } : {}),
    ...(input.nextToken ? { NextToken: input.nextToken } : {}),
  };
}

export const AwsEc2: ConnectorSpec = {
  metadata: {
    id: '.aws_ec2',
    displayName: 'AWS EC2',
    description: i18n.translate('core.kibanaConnectorSpecs.awsEc2.metadata.description', {
      defaultMessage:
        'Inspect, stop, start, reboot, and terminate EC2 instances, and quarantine them with security group changes',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    // SigV4 signing is handled by the framework's aws_credentials interceptor,
    // which derives the service ("ec2") and region from the request hostname.
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
          i18n.translate('core.kibanaConnectorSpecs.awsEc2.config.region', {
            defaultMessage:
              'AWS Region the instances live in (e.g. us-east-1). EC2 is regional, so this connector only reaches resources in this region.',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.awsEc2.config.region.label', {
            defaultMessage: 'AWS Region',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.awsEc2.config.region.helpText', {
            defaultMessage:
              'For example, us-east-1. EC2 is regional, so create one connector per region.',
          }),
          placeholder: 'us-east-1',
        }),
    })
  ),

  actions: {
    describeInstances: {
      isTool: true,
      description:
        'Look up EC2 instances and return each one\'s state, instance type, private and public IP, VPC, subnet, availability zone, attached security groups, and tags. This is the entry point for any remediation: run it first to resolve an alert to a real instance and to capture the security groups a containment step will need to restore later. Filter with e.g. name "instance-state-name" values ["running"], or "tag:Environment". Paginates: keep passing nextToken while one is returned. Never returns user data, which commonly contains secrets.',
      input: DescribeInstancesInputSchema,
      handler: async (ctx, input: DescribeInstancesInput) => {
        const data = await callEc2Api(ctx, 'DescribeInstances', {
          ...listParams('InstanceId', input.instanceIds ?? []),
          ...filterParams(input.filters),
          ...paginationParams(input, input.instanceIds),
        });
        // An instance sits two levels deep: reservationSet > instancesSet.
        const instances = toArray(data.reservationSet).flatMap((reservation) =>
          toArray(reservation.instancesSet).map((instance) =>
            trimInstance(instance, reservation.reservationId)
          )
        );
        return { instances, count: instances.length, nextToken: data.nextToken };
      },
    },

    describeSecurityGroups: {
      isTool: true,
      description:
        'List security groups with their current inbound and outbound rules, VPC, and tags. Run this before any security-group containment step so you know the existing exposure and can restore it afterwards. AWS filter matching is loose across rules, so to prove a specific rule exists (for example SSH open to the world) read the rules back and evaluate them rather than trusting a filter.',
      input: DescribeSecurityGroupsInputSchema,
      handler: async (ctx, input: DescribeSecurityGroupsInput) => {
        const data = await callEc2Api(ctx, 'DescribeSecurityGroups', {
          ...listParams('GroupId', input.groupIds ?? []),
          ...filterParams(input.filters),
          ...paginationParams(input, input.groupIds),
        });
        const securityGroups = toArray(data.securityGroupInfo).map(trimSecurityGroup);
        return { securityGroups, count: securityGroups.length, nextToken: data.nextToken };
      },
    },

    describeSecurityGroupRules: {
      isTool: true,
      description:
        'List individual security-group rules, each with its own securityGroupRuleId. Prefer this over describeSecurityGroups when you intend to revoke or modify a rule: acting on a rule id is exact, whereas revoking by matching properties requires every value to match the existing rule and otherwise silently removes nothing.',
      input: DescribeSecurityGroupRulesInputSchema,
      handler: async (ctx, input: DescribeSecurityGroupRulesInput) => {
        const data = await callEc2Api(ctx, 'DescribeSecurityGroupRules', {
          ...listParams('SecurityGroupRuleId', input.securityGroupRuleIds ?? []),
          // This API has no GroupId parameter; group scoping is a filter.
          ...filterParams(input.groupId ? [{ name: 'group-id', values: [input.groupId] }] : []),
          ...paginationParams(input, input.securityGroupRuleIds),
        });
        const rules = toArray(data.securityGroupRuleSet).map(trimSecurityGroupRule);
        return { rules, count: rules.length, nextToken: data.nextToken };
      },
    },

    startInstance: {
      isTool: false,
      description:
        'Start a stopped EC2 instance, the natural pair to stopInstance after remediation. Asynchronous: the response reports the transition (typically "pending"), not a running instance. Check settled in the result and poll describeInstances until state is "running" before reporting the instance as back up.',
      input: InstanceRefInputSchema,
      handler: async (ctx, input: InstanceRefInput) => {
        const data = await callEc2Api(ctx, 'StartInstances', {
          ...listParams('InstanceId', [input.instanceId]),
        });
        return readStateChange(data);
      },
    },

    stopInstance: {
      isTool: false,
      description:
        'Stop a running EC2 instance while preserving its EBS volumes, the core containment move that keeps disk state for investigation. Asynchronous: the response reports "stopping", not "stopped", so poll describeInstances until state is "stopped" before reporting the threat halted. Stopping discards RAM contents, so capture volatile evidence first if it matters.',
      input: StopInstanceInputSchema,
      handler: async (ctx, input: StopInstanceInput) => {
        const data = await callEc2Api(ctx, 'StopInstances', {
          ...listParams('InstanceId', [input.instanceId]),
          ...(input.force ? { Force: 'true' } : {}),
          ...(input.hibernate ? { Hibernate: 'true' } : {}),
        });
        return readStateChange(data);
      },
    },

    rebootInstance: {
      isTool: false,
      description:
        'Reboot an EC2 instance, the primary non-destructive recovery step for an unhealthy host. AWS only queues the request, so a success here means "accepted", NOT "rebooted", and the response carries no state transition at all. A reboot of an already-terminated instance is silently ignored, so confirm the instance is running with describeInstances first, and poll it afterwards to confirm the host came back.',
      input: InstanceRefInputSchema,
      handler: async (ctx, input: InstanceRefInput) => {
        const data = await callEc2Api(ctx, 'RebootInstances', {
          ...listParams('InstanceId', [input.instanceId]),
        });
        return {
          instanceId: input.instanceId,
          accepted: readXmlBoolean(data.return),
          // AWS returns no state for a reboot, so nothing here can honestly
          // claim the instance actually restarted.
          settled: false,
          note: 'Reboot is queued asynchronously. Poll describeInstances to confirm the instance came back.',
        };
      },
    },

    terminateInstance: {
      isTool: false,
      description:
        'Permanently destroy an EC2 instance, the last-resort containment step. IRREVERSIBLE: the instance cannot be recovered, EBS volumes marked delete-on-termination are destroyed, and all instance-store data is lost. Capture evidence with createSnapshot and confirm it reached "completed" first. Asynchronous: the response reports "shutting-down", so poll describeInstances until state is "terminated".',
      input: InstanceRefInputSchema,
      handler: async (ctx, input: InstanceRefInput) => {
        const data = await callEc2Api(ctx, 'TerminateInstances', {
          ...listParams('InstanceId', [input.instanceId]),
        });
        return readStateChange(data);
      },
    },

    modifyInstanceSecurityGroups: {
      isTool: false,
      description:
        "Replace the security groups attached to a running instance, isolating it on the network without stopping it so memory and disk stay intact for investigation. REPLACE semantics: the groupIds you pass become the instance's complete group list, so pass only an isolation group to quarantine, and pass the full original list back to restore. The result returns previousSecurityGroupIds for exactly that undo. Fails on an instance with more than one network interface.",
      input: ModifyInstanceSecurityGroupsInputSchema,
      handler: async (ctx, input: ModifyInstanceSecurityGroupsInput) => {
        // Read the current groups first so the caller gets an exact undo list,
        // and so a request that changes nothing is reported as a no-op rather
        // than as successful containment.
        const before = await callEc2Api(ctx, 'DescribeInstances', {
          ...listParams('InstanceId', [input.instanceId]),
        });
        const instance = toArray(before.reservationSet).flatMap((reservation) =>
          toArray(reservation.instancesSet)
        )[0];
        if (!instance) {
          throw new Error(
            `AWS EC2 returned no instance for ${input.instanceId}. Confirm the id and that the connector\'s region matches the instance\'s region.`
          );
        }
        const previousSecurityGroupIds = toArray(instance.groupSet).map((group) =>
          String(group.groupId)
        );

        const desired = [...input.groupIds].sort();
        const unchanged =
          previousSecurityGroupIds.length === desired.length &&
          [...previousSecurityGroupIds].sort().every((groupId, i) => groupId === desired[i]);
        if (unchanged) {
          return {
            instanceId: input.instanceId,
            changed: false,
            reason: 'The instance is already attached to exactly these security groups.',
            securityGroupIds: previousSecurityGroupIds,
            previousSecurityGroupIds,
          };
        }

        await callEc2Api(ctx, 'ModifyInstanceAttribute', {
          InstanceId: input.instanceId,
          ...listParams('GroupId', input.groupIds),
        });
        return {
          instanceId: input.instanceId,
          changed: true,
          securityGroupIds: input.groupIds,
          previousSecurityGroupIds,
        };
      },
    },

    authorizeSecurityGroupIngress: {
      isTool: false,
      description:
        'Add inbound rules to a security group, used to restore access after containment or to open a responder path. Not idempotent: re-adding an existing rule fails with a duplicate-rule error, and AWS canonicalizes CIDRs (100.68.0.18/18 becomes 100.68.0.0/18) so a non-canonical duplicate fails too. Returns the new securityGroupRuleIds, which are the clean handle for undoing this later.',
      input: SecurityGroupRulesInputSchema,
      handler: async (ctx, input: SecurityGroupRulesInput) => {
        const data = await callEc2Api(ctx, 'AuthorizeSecurityGroupIngress', {
          GroupId: input.groupId,
          ...ipPermissionParams(toIpPermissions(input)),
        });
        return {
          groupId: input.groupId,
          changed: readXmlBoolean(data.return),
          rules: toArray(data.securityGroupRuleSet).map(trimSecurityGroupRule),
        };
      },
    },

    revokeSecurityGroupIngress: {
      isTool: false,
      description:
        'Remove inbound rules from a security group to sever attacker access, the most-used security-group containment action. Rule properties must match an existing rule exactly. Reports changed: false with unmatchedRules when nothing was actually revoked, so a workflow can tell real containment from a silent miss. Follow with describeSecurityGroupRules to confirm, which is the only reliable verification.',
      input: SecurityGroupRulesInputSchema,
      handler: async (ctx, input: SecurityGroupRulesInput) => {
        const data = await callEc2Api(ctx, 'RevokeSecurityGroupIngress', {
          GroupId: input.groupId,
          ...ipPermissionParams(toIpPermissions(input)),
        });
        return summarizeRevoke(input.groupId, data);
      },
    },

    authorizeSecurityGroupEgress: {
      isTool: false,
      description:
        'Add outbound rules to a security group, reversing an egress block. Not idempotent: re-adding an existing rule fails with a duplicate-rule error. Returns the new securityGroupRuleIds.',
      input: SecurityGroupRulesInputSchema,
      handler: async (ctx, input: SecurityGroupRulesInput) => {
        const data = await callEc2Api(ctx, 'AuthorizeSecurityGroupEgress', {
          GroupId: input.groupId,
          ...ipPermissionParams(toIpPermissions(input)),
        });
        return {
          groupId: input.groupId,
          changed: readXmlBoolean(data.return),
          rules: toArray(data.securityGroupRuleSet).map(trimSecurityGroupRule),
        };
      },
    },

    revokeSecurityGroupEgress: {
      isTool: false,
      description:
        'Remove outbound rules from a security group to stop data exfiltration or command-and-control beaconing. A group with no egress rules blocks all outbound traffic, which is usually the point of a quarantine group: use this to strip the allow-all rule a freshly created group starts with. Reports changed: false with unmatchedRules when nothing was revoked.',
      input: SecurityGroupRulesInputSchema,
      handler: async (ctx, input: SecurityGroupRulesInput) => {
        const data = await callEc2Api(ctx, 'RevokeSecurityGroupEgress', {
          GroupId: input.groupId,
          ...ipPermissionParams(toIpPermissions(input)),
        });
        return summarizeRevoke(input.groupId, data);
      },
    },

    modifySecurityGroupRules: {
      isTool: false,
      description:
        "Change an existing security-group rule in place, identified by its securityGroupRuleId from describeSecurityGroupRules, for finer-grained containment than a full revoke and re-authorize. You cannot change a rule's type, so supply the same kind of source the rule already uses (cidrIpv4, cidrIpv6, or referencedGroupId). AWS returns no rule detail, so this reads the rule back to confirm the change landed.",
      input: ModifySecurityGroupRuleInputSchema,
      handler: async (ctx, input: ModifySecurityGroupRuleInput) => {
        const rule = 'SecurityGroupRule.1.SecurityGroupRule';
        await callEc2Api(ctx, 'ModifySecurityGroupRules', {
          GroupId: input.groupId,
          'SecurityGroupRule.1.SecurityGroupRuleId': input.securityGroupRuleId,
          [`${rule}.IpProtocol`]: input.ipProtocol,
          ...(input.fromPort !== undefined ? { [`${rule}.FromPort`]: String(input.fromPort) } : {}),
          ...(input.toPort !== undefined ? { [`${rule}.ToPort`]: String(input.toPort) } : {}),
          ...(input.cidrIpv4 ? { [`${rule}.CidrIpv4`]: input.cidrIpv4 } : {}),
          ...(input.cidrIpv6 ? { [`${rule}.CidrIpv6`]: input.cidrIpv6 } : {}),
          ...(input.referencedGroupId
            ? { [`${rule}.ReferencedGroupId`]: input.referencedGroupId }
            : {}),
          ...(input.description ? { [`${rule}.Description`]: input.description } : {}),
        });
        // This API answers with only `return: true`, so the effective rule is
        // read back rather than echoing the request as if it were confirmed.
        const after = await callEc2Api(ctx, 'DescribeSecurityGroupRules', {
          ...listParams('SecurityGroupRuleId', [input.securityGroupRuleId]),
        });
        return {
          groupId: input.groupId,
          changed: true,
          rule: toArray(after.securityGroupRuleSet).map(trimSecurityGroupRule)[0],
        };
      },
    },

    createSecurityGroup: {
      isTool: false,
      description:
        'Create a security group, used to stand up an isolation group on demand when none is pre-staged. A new group has NO inbound rules but one allow-all OUTBOUND rule, so it is not yet a quarantine: strip that rule with revokeSecurityGroupEgress using ipProtocol "-1" and cidrIpv4 ["0.0.0.0/0"]. Group names must be unique within the VPC, so creating the same name twice fails.',
      input: CreateSecurityGroupInputSchema,
      handler: async (ctx, input: CreateSecurityGroupInput) => {
        const data = await callEc2Api(ctx, 'CreateSecurityGroup', {
          GroupName: input.groupName,
          GroupDescription: input.description,
          ...(input.vpcId ? { VpcId: input.vpcId } : {}),
          ...(input.tags?.length ? tagSpecParams('security-group', input.tags) : {}),
        });
        return {
          groupId: data.groupId,
          groupName: input.groupName,
          securityGroupArn: data.securityGroupArn,
          changed: true,
        };
      },
    },

    deleteSecurityGroup: {
      isTool: false,
      description:
        'Delete a security group once an incident is closed. Fails with DependencyViolation while the group is still attached to any instance or network interface, or referenced by another group, so move every instance off it with modifyInstanceSecurityGroups first.',
      input: DeleteSecurityGroupInputSchema,
      handler: async (ctx, input: DeleteSecurityGroupInput) => {
        const data = await callEc2Api(ctx, 'DeleteSecurityGroup', { GroupId: input.groupId });
        return { groupId: input.groupId, deleted: readXmlBoolean(data.return), changed: true };
      },
    },

    createTags: {
      isTool: false,
      description:
        'Add or overwrite tags on instances or other EC2 resources, used to record incident state such as IncidentStatus=quarantined so humans and downstream automation can see it. Upsert semantics: an existing tag with the same key is overwritten without warning, so read the current tags with describeInstances first if the previous value matters.',
      input: CreateTagsInputSchema,
      handler: async (ctx, input: CreateTagsInput) => {
        const data = await callEc2Api(ctx, 'CreateTags', {
          ...listParams('ResourceId', input.resourceIds),
          ...tagParams(input.tags),
        });
        return {
          resourceIds: input.resourceIds,
          tags: input.tags,
          changed: readXmlBoolean(data.return),
        };
      },
    },

    deleteTags: {
      isTool: false,
      description:
        "Remove specific tags from EC2 resources, the counterpart to createTags when an incident closes. The tag list is REQUIRED here even though the AWS API treats it as optional, because omitting it deletes EVERY user tag on every listed resource. Omit an individual tag's value to delete that key whatever its value, or supply the value to delete it only on an exact match.",
      input: DeleteTagsInputSchema,
      handler: async (ctx, input: DeleteTagsInput) => {
        const data = await callEc2Api(ctx, 'DeleteTags', {
          ...listParams('ResourceId', input.resourceIds),
          ...tagParams(input.tags),
        });
        return {
          resourceIds: input.resourceIds,
          tags: input.tags,
          changed: readXmlBoolean(data.return),
        };
      },
    },

    createSnapshot: {
      isTool: false,
      description:
        'Capture a point-in-time snapshot of an EBS volume, the standard evidence-preservation step before terminating a compromised instance. Asynchronous: status comes back "pending", so poll describeSnapshots until it is "completed" before terminating anything. Only data already written to the volume is captured, so anything still cached in memory by the OS or an application is not included.',
      input: CreateSnapshotInputSchema,
      handler: async (ctx, input: CreateSnapshotInput) => {
        const data = await callEc2Api(ctx, 'CreateSnapshot', {
          VolumeId: input.volumeId,
          ...(input.description ? { Description: input.description } : {}),
          ...(input.tags?.length ? tagSpecParams('snapshot', input.tags) : {}),
        });
        return {
          snapshotId: data.snapshotId,
          volumeId: data.volumeId,
          status: data.status,
          progress: data.progress,
          startTime: data.startTime,
          volumeSize: data.volumeSize,
          encrypted: readXmlBoolean(data.encrypted),
          settled: data.status === 'completed',
          changed: true,
        };
      },
    },

    describeSnapshots: {
      isTool: true,
      description:
        'List EBS snapshots with their status and progress, used to confirm a forensic snapshot finished before terminating an instance. Defaults to snapshots this account owns, because an unscoped query enumerates every public snapshot on AWS.',
      input: DescribeSnapshotsInputSchema,
      handler: async (ctx, input: DescribeSnapshotsInput) => {
        const data = await callEc2Api(ctx, 'DescribeSnapshots', {
          ...listParams('SnapshotId', input.snapshotIds ?? []),
          // Default to this account: an unscoped call returns the entire
          // public snapshot catalogue.
          ...listParams('Owner', input.ownerIds ?? (input.snapshotIds?.length ? [] : ['self'])),
          ...filterParams(input.filters),
          ...paginationParams(input, input.snapshotIds),
        });
        const snapshots = toArray(data.snapshotSet).map((snapshot) => ({
          snapshotId: snapshot.snapshotId,
          volumeId: snapshot.volumeId,
          status: snapshot.status,
          progress: snapshot.progress,
          startTime: snapshot.startTime,
          volumeSize: snapshot.volumeSize,
          description: snapshot.description,
          encrypted: readXmlBoolean(snapshot.encrypted),
          ownerId: snapshot.ownerId,
          settled: snapshot.status === 'completed',
        }));
        return { snapshots, count: snapshots.length, nextToken: data.nextToken };
      },
    },

    describeVpcs: {
      isTool: true,
      description:
        'List VPCs with their CIDR blocks, tenancy, state, and whether each is the default VPC. Use it to pick the VPC when creating an isolation security group, since a group can only be attached to instances in the same VPC.',
      input: DescribeVpcsInputSchema,
      handler: async (ctx, input: DescribeVpcsInput) => {
        const data = await callEc2Api(ctx, 'DescribeVpcs', {
          ...listParams('VpcId', input.vpcIds ?? []),
          ...filterParams(input.filters),
          ...paginationParams(input, input.vpcIds),
        });
        const vpcs = toArray(data.vpcSet).map((vpc) => ({
          vpcId: vpc.vpcId,
          state: vpc.state,
          cidrBlock: vpc.cidrBlock,
          isDefault: readXmlBoolean(vpc.isDefault),
          instanceTenancy: vpc.instanceTenancy,
          ownerId: vpc.ownerId,
          tags: toArray(vpc.tagSet).map((tag) => ({ key: tag.key, value: tag.value })),
        }));
        return { vpcs, count: vpcs.length, nextToken: data.nextToken };
      },
    },

    describeSubnets: {
      isTool: true,
      description:
        'List subnets with their VPC, availability zone, CIDR, available IP count, and whether they auto-assign public IPs. Useful for enriching an investigation with where an instance actually sits, and for spotting that a compromised host is on a public subnet.',
      input: DescribeSubnetsInputSchema,
      handler: async (ctx, input: DescribeSubnetsInput) => {
        const data = await callEc2Api(ctx, 'DescribeSubnets', {
          ...listParams('SubnetId', input.subnetIds ?? []),
          ...filterParams(input.filters),
          ...paginationParams(input, input.subnetIds),
        });
        const subnets = toArray(data.subnetSet).map((subnet) => ({
          subnetId: subnet.subnetId,
          vpcId: subnet.vpcId,
          state: subnet.state,
          cidrBlock: subnet.cidrBlock,
          availabilityZone: subnet.availabilityZone,
          availableIpAddressCount: subnet.availableIpAddressCount,
          mapPublicIpOnLaunch: readXmlBoolean(subnet.mapPublicIpOnLaunch),
          defaultForAz: readXmlBoolean(subnet.defaultForAz),
          tags: toArray(subnet.tagSet).map((tag) => ({ key: tag.key, value: tag.value })),
        }));
        return { subnets, count: subnets.length, nextToken: data.nextToken };
      },
    },

    describeImages: {
      isTool: true,
      description:
        'Look up AMIs by id or filter, returning name, owner, architecture, platform, state, and whether the image is public. Use it to identify what a compromised instance was launched from, or to spot that a host is running an untrusted public image. Defaults to images this account owns, because an unscoped query tries to enumerate every public AMI on AWS.',
      input: DescribeImagesInputSchema,
      handler: async (ctx, input: DescribeImagesInput) => {
        const data = await callEc2Api(ctx, 'DescribeImages', {
          ...listParams('ImageId', input.imageIds ?? []),
          ...listParams('Owner', input.ownerIds ?? (input.imageIds?.length ? [] : ['self'])),
          ...filterParams(input.filters),
          ...paginationParams(input, input.imageIds),
        });
        const images = toArray(data.imagesSet).map((image) => ({
          imageId: image.imageId,
          name: image.name,
          description: image.description,
          state: image.imageState,
          // AWS's own docs show both spellings across their examples.
          ownerId: image.imageOwnerId ?? image.ownerId,
          ownerAlias: image.imageOwnerAlias,
          isPublic: readXmlBoolean(image.isPublic),
          architecture: image.architecture,
          platformDetails: image.platformDetails,
          rootDeviceType: image.rootDeviceType,
          creationDate: image.creationDate,
        }));
        return { images, count: images.length, nextToken: data.nextToken };
      },
    },
  },

  skill: [
    '## AWS EC2 connector',
    '',
    'Instance lifecycle and security-group containment for observability remediation and automated',
    'security response. A connector instance is bound to ONE region (set in its configuration), so it',
    'cannot see or act on instances anywhere else.',
    '',
    '### Always resolve the target first',
    '',
    'Call `describeInstances` before any remediation. It gives you the instance state and, critically, the',
    '`securityGroups` currently attached. Capture that list: it is the only way to undo a quarantine.',
    '',
    '### Every mutating action is eventually consistent',
    '',
    'Stop, start and terminate return a TRANSITION, not a finished state: stopping an instance answers',
    '"stopping", not "stopped". Each result carries `settled`. While it is false, poll `describeInstances`',
    'until `state` reaches the value you want before reporting the step complete. `rebootInstance` is',
    'weaker still: AWS only queues it, so it returns no state at all and `settled` is always false.',
    '',
    '### Quarantine patterns, in order of preference',
    '',
    '1. Network-isolate without stopping, which preserves memory and disk for investigation:',
    '   `describeInstances` to capture the current groups, then `modifyInstanceSecurityGroups` with only an',
    '   isolation group id. That REPLACES the group list, so reverse it by passing the captured list back;',
    '   the result hands you `previousSecurityGroupIds` for exactly that.',
    '2. Trim exposure on a shared group instead: `describeSecurityGroupRules` then',
    '   `revokeSecurityGroupIngress`. Careful, the group is shared, so this affects every instance using it.',
    '3. `stopInstance` when isolation is not enough. Discards RAM.',
    '4. `terminateInstance` only as a last resort, and only after `createSnapshot` has reached "completed"',
    '   in `describeSnapshots`. Termination is irreversible.',
    '',
    '### Building an isolation group from scratch',
    '',
    '`createSecurityGroup` makes a group with no inbound rules but a default allow-all EGRESS rule, so it',
    'is not a quarantine yet. Strip that rule with `revokeSecurityGroupEgress` (ipProtocol "-1", cidrIpv4',
    '["0.0.0.0/0"]). Reverse the order when cleaning up: move every instance off the group before',
    '`deleteSecurityGroup`, or it fails with DependencyViolation.',
    '',
    '### A revoke can succeed while doing nothing',
    '',
    'AWS reports a revoke whose properties match no existing rule as a success. These handlers surface that',
    'as `changed: false` with `unmatchedRules` populated. Treat it as a FAILED containment and investigate;',
    'do not report the access as severed. Reading the group back afterwards is the only real confirmation.',
    '',
    '### Gotchas',
    '',
    '- Authorize is not idempotent: re-adding an existing rule fails as a duplicate. AWS also canonicalizes',
    '  CIDRs, so 10.0.0.18/24 comes back as 10.0.0.0/24 and a non-canonical retry also fails.',
    '- ipProtocol "-1" allows traffic on ALL ports whatever port range you pass.',
    '- `createTags` overwrites an existing key silently.',
    '- `modifyInstanceSecurityGroups` fails on an instance with multiple network interfaces.',
    '- Terminated instances keep appearing in `describeInstances` for about an hour.',
    '- User data is never returned by this connector, because it commonly contains bootstrap secrets.',
  ].join('\n'),

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.awsEc2.test.description', {
      defaultMessage:
        'Verifies the credentials and region by calling DescribeRegions, a cheap read-only EC2 call that does not depend on any instance existing',
    }),
    handler: async (ctx) => {
      const { region } = ctx.config as { region?: string };
      await callEc2Api(ctx, 'DescribeRegions', { 'RegionName.1': String(region) });
      return { message: `Successfully connected to the AWS EC2 API in ${region}.` };
    },
  },
};
