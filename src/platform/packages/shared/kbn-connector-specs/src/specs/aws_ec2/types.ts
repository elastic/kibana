/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

/**
 * AWS resource ids have a fixed shape (`i-` plus 8 or 17 hex digits), so they
 * are regex-constrained rather than merely length-bounded: these values flow
 * into query parameters and filter expressions, where an unconstrained string
 * is an injection risk as well as a guaranteed API error.
 */
const INSTANCE_ID_REGEX = /^i-[0-9a-f]{8,17}$/;
const SECURITY_GROUP_ID_REGEX = /^sg-[0-9a-f]{8,17}$/;
const SECURITY_GROUP_RULE_ID_REGEX = /^sgr-[0-9a-f]{8,17}$/;
const VOLUME_ID_REGEX = /^vol-[0-9a-f]{8,17}$/;
const SNAPSHOT_ID_REGEX = /^snap-[0-9a-f]{8,17}$/;
const VPC_ID_REGEX = /^vpc-[0-9a-f]{8,17}$/;
const SUBNET_ID_REGEX = /^subnet-[0-9a-f]{8,17}$/;
const IMAGE_ID_REGEX = /^ami-[0-9a-f]{8,17}$/;

const MAX_IDS = 200;
const MAX_FILTERS = 20;
const MAX_FILTER_VALUES = 50;
const MAX_RULES = 50;
const MAX_TAGS = 50;

const instanceId = z
  .string()
  .regex(INSTANCE_ID_REGEX, 'Must be an EC2 instance id, e.g. i-0123456789abcdef0.')
  .describe('The EC2 instance id, e.g. "i-0123456789abcdef0".');

const securityGroupId = z
  .string()
  .regex(SECURITY_GROUP_ID_REGEX, 'Must be a security group id, e.g. sg-0123456789abcdef0.')
  .describe('The security group id, e.g. "sg-0123456789abcdef0".');

/**
 * A `Filter.N.Name` / `Filter.N.Value.M` pair. Filter names are a fixed AWS
 * vocabulary (`instance-state-name`, `tag:Environment`, ...) so the name is
 * bounded and character-constrained.
 */
const FilterSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-zA-Z0-9.:_-]+$/, 'Must be a valid EC2 filter name.')
      .describe(
        'The filter name, e.g. "instance-state-name", "vpc-id", "instance.group-id", or "tag:Environment".'
      ),
    values: z
      .array(z.string().min(1).max(256))
      .min(1)
      .max(MAX_FILTER_VALUES)
      .describe('The values to match. A resource matches if any value matches.'),
  })
);

const paginationFields = {
  maxResults: z
    .string()
    .regex(/^\d{1,4}$/, 'Must be a whole number.')
    .optional()
    .describe(
      'Maximum number of results per page (5-1000). Use with nextToken to page through results.'
    ),
  nextToken: z
    .string()
    .max(2048)
    .optional()
    .describe('The pagination token from a previous response. Omit for the first page.'),
};

export const DescribeInstancesInputSchema = lazySchema(() =>
  z.object({
    instanceIds: z
      .array(instanceId)
      .max(MAX_IDS)
      .optional()
      .describe(
        'Specific instance ids to describe. Omit to describe all instances (use filters to narrow). Cannot be combined with maxResults.'
      ),
    filters: z
      .array(FilterSchema)
      .max(MAX_FILTERS)
      .optional()
      .describe(
        'Filters to narrow the results, e.g. name "instance-state-name" with values ["running"].'
      ),
    ...paginationFields,
  })
);
export type DescribeInstancesInput = z.infer<typeof DescribeInstancesInputSchema>;

export const DescribeSecurityGroupsInputSchema = lazySchema(() =>
  z.object({
    groupIds: z
      .array(securityGroupId)
      .max(MAX_IDS)
      .optional()
      .describe('Specific security group ids to describe. Omit to describe all groups.'),
    filters: z
      .array(FilterSchema)
      .max(MAX_FILTERS)
      .optional()
      .describe('Filters to narrow the results, e.g. name "vpc-id" with values ["vpc-abc123"].'),
    ...paginationFields,
  })
);
export type DescribeSecurityGroupsInput = z.infer<typeof DescribeSecurityGroupsInputSchema>;

export const DescribeSecurityGroupRulesInputSchema = lazySchema(() =>
  z.object({
    securityGroupRuleIds: z
      .array(
        z
          .string()
          .regex(
            SECURITY_GROUP_RULE_ID_REGEX,
            'Must be a security group rule id, e.g. sgr-0123456789abcdef0.'
          )
      )
      .max(MAX_IDS)
      .optional()
      .describe('Specific security group rule ids to describe.'),
    groupId: securityGroupId
      .optional()
      .describe('List every rule in this security group. Applied as a "group-id" filter.'),
    ...paginationFields,
  })
);
export type DescribeSecurityGroupRulesInput = z.infer<typeof DescribeSecurityGroupRulesInputSchema>;

export const InstanceRefInputSchema = lazySchema(() => z.object({ instanceId }));
export type InstanceRefInput = z.infer<typeof InstanceRefInputSchema>;

export const StopInstanceInputSchema = lazySchema(() =>
  z.object({
    instanceId,
    force: z
      .boolean()
      .optional()
      .describe(
        'Force the instance to stop without a graceful OS shutdown. Risks data loss and filesystem corruption, so leave unset unless a normal stop has already failed.'
      ),
    hibernate: z
      .boolean()
      .optional()
      .describe(
        'Hibernate the instance instead of stopping it, preserving RAM contents. Requires the instance to be hibernation-enabled.'
      ),
  })
);
export type StopInstanceInput = z.infer<typeof StopInstanceInputSchema>;

export const ModifyInstanceSecurityGroupsInputSchema = lazySchema(() =>
  z.object({
    instanceId,
    groupIds: z
      .array(securityGroupId)
      .min(1)
      .max(MAX_IDS)
      .describe(
        'The COMPLETE list of security group ids the instance should end up with. This REPLACES all current groups, so to isolate an instance pass only the isolation group id, and to restore access pass the full original list.'
      ),
  })
);
export type ModifyInstanceSecurityGroupsInput = z.infer<
  typeof ModifyInstanceSecurityGroupsInputSchema
>;

/**
 * One inbound or outbound rule. AWS requires exactly one source/destination
 * kind per rule, and requires ports whenever the protocol is tcp or udp, so
 * both constraints are enforced here rather than surfacing as an opaque
 * InvalidParameterCombination from the API.
 */
const IpPermissionSchema = lazySchema(() =>
  z
    .object({
      ipProtocol: z
        .enum(['tcp', 'udp', 'icmp', 'icmpv6', '-1'])
        .describe(
          'The IP protocol: "tcp", "udp", "icmp", "icmpv6", or "-1" for all protocols. Note that "-1" allows traffic on ALL ports regardless of any port range.'
        ),
      fromPort: z
        .number()
        .int()
        .min(-1)
        .max(65535)
        .optional()
        .describe(
          'Start of the port range (or the ICMP type). Required for tcp and udp. Use -1 for all ICMP types.'
        ),
      toPort: z
        .number()
        .int()
        .min(-1)
        .max(65535)
        .optional()
        .describe(
          'End of the port range (or the ICMP code). Required for tcp and udp. Use -1 for all ICMP codes.'
        ),
      cidrIpv4: z
        .array(
          z
            .string()
            .max(43)
            .regex(/^[0-9./]+$/, 'Must be an IPv4 CIDR block.')
        )
        .max(MAX_RULES)
        .optional()
        .describe('IPv4 CIDR ranges, e.g. ["203.0.113.0/24"]. Use "0.0.0.0/0" for anywhere.'),
      cidrIpv6: z
        .array(
          z
            .string()
            .max(49)
            .regex(/^[0-9a-fA-F:./]+$/, 'Must be an IPv6 CIDR block.')
        )
        .max(MAX_RULES)
        .optional()
        .describe('IPv6 CIDR ranges, e.g. ["2001:db8::/32"].'),
      sourceSecurityGroupIds: z
        .array(securityGroupId)
        .max(MAX_RULES)
        .optional()
        .describe('Security group ids to allow as the source or destination of the traffic.'),
      description: z
        .string()
        .max(255)
        .optional()
        .describe('A description applied to each range in this rule, e.g. "Responder access".'),
    })
    .refine(
      (rule) =>
        (rule.cidrIpv4?.length ?? 0) +
          (rule.cidrIpv6?.length ?? 0) +
          (rule.sourceSecurityGroupIds?.length ?? 0) >
        0,
      {
        message:
          'Specify at least one source or destination: cidrIpv4, cidrIpv6, or sourceSecurityGroupIds.',
      }
    )
    .refine(
      (rule) =>
        !(rule.ipProtocol === 'tcp' || rule.ipProtocol === 'udp') ||
        (rule.fromPort !== undefined && rule.toPort !== undefined),
      { message: 'fromPort and toPort are required when ipProtocol is "tcp" or "udp".' }
    )
);

export const SecurityGroupRulesInputSchema = lazySchema(() =>
  z.object({
    groupId: securityGroupId,
    ipPermissions: z
      .array(IpPermissionSchema)
      .min(1)
      .max(MAX_RULES)
      .describe('The rules to add or remove.'),
  })
);
export type SecurityGroupRulesInput = z.infer<typeof SecurityGroupRulesInputSchema>;

export const ModifySecurityGroupRuleInputSchema = lazySchema(() =>
  z
    .object({
      groupId: securityGroupId,
      securityGroupRuleId: z
        .string()
        .regex(
          SECURITY_GROUP_RULE_ID_REGEX,
          'Must be a security group rule id, e.g. sgr-0123456789abcdef0.'
        )
        .describe('The id of the rule to modify, from describeSecurityGroupRules.'),
      ipProtocol: z
        .enum(['tcp', 'udp', 'icmp', 'icmpv6', '-1'])
        .describe('The IP protocol for the updated rule.'),
      fromPort: z
        .number()
        .int()
        .min(-1)
        .max(65535)
        .optional()
        .describe('Start of the updated port range. Required for tcp and udp.'),
      toPort: z
        .number()
        .int()
        .min(-1)
        .max(65535)
        .optional()
        .describe('End of the updated port range. Required for tcp and udp.'),
      cidrIpv4: z
        .string()
        .max(43)
        .regex(/^[0-9./]+$/, 'Must be an IPv4 CIDR block.')
        .optional()
        .describe('The updated IPv4 CIDR range. Only for a rule that already uses an IPv4 range.'),
      cidrIpv6: z
        .string()
        .max(49)
        .regex(/^[0-9a-fA-F:./]+$/, 'Must be an IPv6 CIDR block.')
        .optional()
        .describe('The updated IPv6 CIDR range. Only for a rule that already uses an IPv6 range.'),
      referencedGroupId: securityGroupId
        .optional()
        .describe(
          'The updated source security group. Only for a rule that already references a group.'
        ),
      description: z.string().max(255).optional().describe('An updated description for the rule.'),
    })
    .refine(
      (input) =>
        [input.cidrIpv4, input.cidrIpv6, input.referencedGroupId].filter(
          (value) => value !== undefined
        ).length === 1,
      {
        message:
          "Specify exactly one of cidrIpv4, cidrIpv6, or referencedGroupId, matching the rule's existing type. AWS does not allow changing a rule's type.",
      }
    )
    .refine(
      (input) =>
        !(input.ipProtocol === 'tcp' || input.ipProtocol === 'udp') ||
        (input.fromPort !== undefined && input.toPort !== undefined),
      { message: 'fromPort and toPort are required when ipProtocol is "tcp" or "udp".' }
    )
);
export type ModifySecurityGroupRuleInput = z.infer<typeof ModifySecurityGroupRuleInputSchema>;

export const CreateSecurityGroupInputSchema = lazySchema(() =>
  z.object({
    groupName: z
      .string()
      .min(1)
      .max(255)
      .regex(/^(?!sg-)[a-zA-Z0-9 ._\-:/()#,@[\]+=&;{}!$*]+$/, 'Must be a valid group name.')
      .describe(
        'The group name, unique within the VPC and case-insensitive. Cannot start with "sg-", e.g. "incident-isolation".'
      ),
    description: z
      .string()
      .min(1)
      .max(255)
      .describe('What the group is for, e.g. "Quarantine group, no ingress or egress".'),
    vpcId: z
      .string()
      .regex(VPC_ID_REGEX, 'Must be a VPC id, e.g. vpc-0123456789abcdef0.')
      .optional()
      .describe('The VPC to create the group in. Required for any non-default VPC.'),
    tags: z
      .array(
        z.object({
          key: z.string().min(1).max(127).describe('The tag key.'),
          value: z.string().max(256).describe('The tag value.'),
        })
      )
      .max(MAX_TAGS)
      .optional()
      .describe('Tags to apply to the new group, e.g. the incident id.'),
  })
);
export type CreateSecurityGroupInput = z.infer<typeof CreateSecurityGroupInputSchema>;

export const DeleteSecurityGroupInputSchema = lazySchema(() =>
  z.object({
    groupId: securityGroupId.describe(
      'The id of the security group to delete. It must not be attached to any instance or referenced by another group.'
    ),
  })
);
export type DeleteSecurityGroupInput = z.infer<typeof DeleteSecurityGroupInputSchema>;

/**
 * Tag resource ids are deliberately loose across types (an instance, a group, a
 * volume, a snapshot can all be tagged), so this validates the general AWS id
 * shape rather than one prefix.
 */
const taggableResourceId = z
  .string()
  .min(3)
  .max(64)
  .regex(
    /^[a-z]+(-[a-z]+)*-[0-9a-f]{8,17}$/,
    'Must be an AWS resource id, e.g. i-0123456789abcdef0.'
  )
  .describe('An AWS resource id to tag, e.g. "i-0123456789abcdef0" or "sg-0123456789abcdef0".');

export const CreateTagsInputSchema = lazySchema(() =>
  z.object({
    resourceIds: z
      .array(taggableResourceId)
      .min(1)
      .max(MAX_IDS)
      .describe('The resources to tag, e.g. one or more instance ids.'),
    tags: z
      .array(
        z.object({
          key: z
            .string()
            .min(1)
            .max(127)
            .describe('The tag key, e.g. "IncidentStatus". Cannot begin with "aws:".'),
          value: z.string().max(256).describe('The tag value, e.g. "quarantined".'),
        })
      )
      .min(1)
      .max(MAX_TAGS)
      .describe(
        'The tags to add. An existing tag with the same key is OVERWRITTEN, so read current tags first if that matters.'
      ),
  })
);
export type CreateTagsInput = z.infer<typeof CreateTagsInputSchema>;

export const DeleteTagsInputSchema = lazySchema(() =>
  z.object({
    resourceIds: z
      .array(taggableResourceId)
      .min(1)
      .max(MAX_IDS)
      .describe('The resources to remove tags from.'),
    tags: z
      .array(
        z.object({
          key: z.string().min(1).max(127).describe('The tag key to delete.'),
          value: z
            .string()
            .max(256)
            .optional()
            .describe(
              'Only delete the tag when its value matches this exactly. Omit to delete the tag whatever its value.'
            ),
        })
      )
      .min(1)
      .max(MAX_TAGS)
      .describe(
        'The tags to delete. Required: this connector never sends an empty list, because AWS treats that as "delete every user tag on every listed resource".'
      ),
  })
);
export type DeleteTagsInput = z.infer<typeof DeleteTagsInputSchema>;

export const CreateSnapshotInputSchema = lazySchema(() =>
  z.object({
    volumeId: z
      .string()
      .regex(VOLUME_ID_REGEX, 'Must be an EBS volume id, e.g. vol-0123456789abcdef0.')
      .describe('The EBS volume to snapshot, from the instance you are preserving evidence for.'),
    description: z
      .string()
      .max(255)
      .optional()
      .describe('A description, e.g. "Forensic capture for incident 1234".'),
    tags: z
      .array(
        z.object({
          key: z.string().min(1).max(127).describe('The tag key.'),
          value: z.string().max(256).describe('The tag value.'),
        })
      )
      .max(MAX_TAGS)
      .optional()
      .describe('Tags to apply to the snapshot.'),
  })
);
export type CreateSnapshotInput = z.infer<typeof CreateSnapshotInputSchema>;

export const DescribeSnapshotsInputSchema = lazySchema(() =>
  z.object({
    snapshotIds: z
      .array(
        z.string().regex(SNAPSHOT_ID_REGEX, 'Must be a snapshot id, e.g. snap-0123456789abcdef0.')
      )
      .max(MAX_IDS)
      .optional()
      .describe('Specific snapshot ids to describe.'),
    ownerIds: z
      .array(
        z
          .string()
          .max(64)
          .regex(
            /^(self|amazon|aws-marketplace|\d{12})$/,
            'Must be "self", "amazon", "aws-marketplace", or a 12-digit AWS account id.'
          )
      )
      .max(MAX_IDS)
      .optional()
      .describe(
        'Restrict results to these owners: "self", "amazon", or a 12-digit account id. Defaults to "self", because an unscoped call enumerates every public snapshot.'
      ),
    filters: z
      .array(FilterSchema)
      .max(MAX_FILTERS)
      .optional()
      .describe('Filters to narrow the results, e.g. name "volume-id".'),
    ...paginationFields,
  })
);
export type DescribeSnapshotsInput = z.infer<typeof DescribeSnapshotsInputSchema>;

export const DescribeVpcsInputSchema = lazySchema(() =>
  z.object({
    vpcIds: z
      .array(z.string().regex(VPC_ID_REGEX, 'Must be a VPC id, e.g. vpc-0123456789abcdef0.'))
      .max(MAX_IDS)
      .optional()
      .describe('Specific VPC ids to describe. Omit to describe all VPCs.'),
    filters: z
      .array(FilterSchema)
      .max(MAX_FILTERS)
      .optional()
      .describe('Filters to narrow results.'),
    ...paginationFields,
  })
);
export type DescribeVpcsInput = z.infer<typeof DescribeVpcsInputSchema>;

export const DescribeSubnetsInputSchema = lazySchema(() =>
  z.object({
    subnetIds: z
      .array(
        z.string().regex(SUBNET_ID_REGEX, 'Must be a subnet id, e.g. subnet-0123456789abcdef0.')
      )
      .max(MAX_IDS)
      .optional()
      .describe('Specific subnet ids to describe. Omit to describe all subnets.'),
    filters: z
      .array(FilterSchema)
      .max(MAX_FILTERS)
      .optional()
      .describe('Filters to narrow results, e.g. name "vpc-id".'),
    ...paginationFields,
  })
);
export type DescribeSubnetsInput = z.infer<typeof DescribeSubnetsInputSchema>;

export const DescribeImagesInputSchema = lazySchema(() =>
  z.object({
    imageIds: z
      .array(z.string().regex(IMAGE_ID_REGEX, 'Must be an AMI id, e.g. ami-0123456789abcdef0.'))
      .max(MAX_IDS)
      .optional()
      .describe('Specific AMI ids to describe.'),
    ownerIds: z
      .array(
        z
          .string()
          .max(64)
          .regex(
            /^(self|amazon|aws-marketplace|\d{12})$/,
            'Must be "self", "amazon", "aws-marketplace", or a 12-digit AWS account id.'
          )
      )
      .max(MAX_IDS)
      .optional()
      .describe(
        'Restrict results to these owners: "self", "amazon", or a 12-digit account id. Defaults to "self", because an unscoped call tries to enumerate every public AMI.'
      ),
    filters: z
      .array(FilterSchema)
      .max(MAX_FILTERS)
      .optional()
      .describe('Filters to narrow results, e.g. name "name".'),
    ...paginationFields,
  })
);
export type DescribeImagesInput = z.infer<typeof DescribeImagesInputSchema>;
