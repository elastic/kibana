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
 * Compute Engine constrains these names itself (RFC 1035 for resources, a fixed shape for
 * zones). Mirroring the constraints keeps an LLM- or workflow-supplied value from reaching a
 * URL path segment or a filter expression as something unexpected.
 */
const PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const RESOURCE_NAME_PATTERN = /^[a-z]([-a-z0-9]{0,61}[a-z0-9])?$/;
// The region number is multi-digit: europe-west10-* (Berlin) and europe-west12-* (Turin) are
// live zones that a single [0-9] would reject, which would make the connector unusable in
// those regions entirely. Verified against all 130 zones the API currently returns.
const ZONE_PATTERN = /^[a-z]+-[a-z]+\d+-[a-z]$/;
const NETWORK_TAG_PATTERN = /^[a-z]([-a-z0-9]{0,61}[a-z0-9])?$/;

const projectId = () =>
  z
    .string()
    .max(30)
    .regex(PROJECT_ID_PATTERN, {
      message: 'Must be a valid Google Cloud project id, for example my-project-123',
    })
    .describe(
      'Google Cloud project id, for example "my-project-123". Not the project number and not the display name.'
    );

const zone = () =>
  z
    .string()
    .max(64)
    .regex(ZONE_PATTERN, { message: 'Must be a zone such as us-central1-a' })
    .describe('The zone the instance lives in, for example "us-central1-a".');

const instanceName = () =>
  z
    .string()
    .max(63)
    .regex(RESOURCE_NAME_PATTERN, {
      message: 'Must be a Compute Engine instance name, lowercase letters, digits and hyphens',
    })
    .describe('The instance name, for example "web-server-1". Obtain it from listInstances.');

const firewallName = () =>
  z
    .string()
    .max(63)
    .regex(RESOURCE_NAME_PATTERN, {
      message: 'Must be a firewall rule name, lowercase letters, digits and hyphens',
    })
    .describe('The firewall rule name. Obtain it from listFirewalls.');

const filterExpression = () =>
  z
    .string()
    .max(2048)
    .optional()
    .describe(
      'Optional Compute Engine filter expression, for example \'status = "RUNNING"\' or \'name != "bastion"\'. A single expression string, not a list.'
    );

const pageSize = () =>
  z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe('Maximum results per page. Defaults to 500, the API maximum.');

const pageToken = () =>
  z
    .string()
    .max(4096)
    .optional()
    .describe(
      'Page token from a previous response. Keep paging while nextPageToken is present to enumerate everything.'
    );

// --- Instances -------------------------------------------------------------------------

export const ListInstancesInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    zone: zone()
      .optional()
      .describe(
        'Optional zone. Omit it to search every zone in the project through the aggregated list, which is what you want when you do not know where a host lives.'
      ),
    filter: filterExpression(),
    pageSize: pageSize(),
    pageToken: pageToken(),
  })
);

export const InstanceRefInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    zone: zone(),
    instanceName: instanceName(),
  })
);

export const SetInstanceTagsInputSchema = lazySchema(() =>
  z
    .object({
      projectId: projectId(),
      zone: zone(),
      instanceName: instanceName(),
      addTags: z
        .array(z.string().max(63).regex(NETWORK_TAG_PATTERN))
        .max(64)
        .optional()
        .describe(
          'Network tags to ADD, keeping the tags already on the instance. Use this to apply a quarantine tag without dropping the tags existing firewall rules match on.'
        ),
      removeTags: z
        .array(z.string().max(63).regex(NETWORK_TAG_PATTERN))
        .max(64)
        .optional()
        .describe('Network tags to REMOVE, keeping every other tag on the instance.'),
      replaceTags: z
        .array(z.string().max(63).regex(NETWORK_TAG_PATTERN))
        .max(64)
        .optional()
        .describe(
          'The COMPLETE tag list to write, replacing every existing tag. Destructive: any tag not listed here is removed, which silently detaches the firewall rules that target it. Prefer addTags or removeTags unless you truly intend a full replacement.'
        ),
    })
    // Without this a call with no tag fields would silently no-op instead of erroring.
    .refine(
      (input) =>
        input.addTags !== undefined ||
        input.removeTags !== undefined ||
        input.replaceTags !== undefined,
      { message: 'Provide at least one of addTags, removeTags, or replaceTags' }
    )
    // Mixing a full replacement with a relative edit is ambiguous, so reject it outright.
    .refine(
      (input) =>
        input.replaceTags === undefined ||
        (input.addTags === undefined && input.removeTags === undefined),
      { message: 'replaceTags cannot be combined with addTags or removeTags' }
    )
);

export const SetInstanceLabelsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    zone: zone(),
    instanceName: instanceName(),
    labels: z
      .record(
        // Deliberately narrower than Google's rule, which also permits international
        // characters: these labels are written by a response workflow (incident ids, case
        // refs), so ASCII-only keeps an LLM-supplied key predictable in a URL and a log.
        z
          .string()
          .max(63)
          .regex(/^[a-z][a-z0-9_-]{0,62}$/),
        z
          .string()
          .max(63)
          .regex(/^[a-z0-9_-]{0,63}$/)
      )
      .refine((labels) => Object.keys(labels).length <= 64, {
        message: 'A Compute Engine resource supports at most 64 labels',
      })
      .describe(
        'The COMPLETE label map to write, for example {"incident": "inc-1234"}. Replaces every existing label, so include the ones you want to keep. Keys and values are lowercase letters, digits, hyphens and underscores.'
      ),
  })
);

// --- Disks and snapshots ---------------------------------------------------------------

export const CreateSnapshotInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    zone: zone(),
    diskName: z
      .string()
      .max(63)
      .regex(RESOURCE_NAME_PATTERN, { message: 'Must be a Compute Engine disk name' })
      .describe(
        'The source disk to snapshot, typically the boot disk of a suspect VM. Read the disk names from getInstance.'
      ),
    snapshotName: z
      .string()
      .max(63)
      .regex(RESOURCE_NAME_PATTERN, { message: 'Must be a valid snapshot name' })
      .describe(
        'Name for the new snapshot, for example "inc-1234-web-server-1-boot". Must be unique in the project.'
      ),
    description: z
      .string()
      .max(2048)
      .optional()
      .describe('Optional description. Worth recording the incident or case id here.'),
  })
);

// --- Firewalls -------------------------------------------------------------------------

export const ListFirewallsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    filter: filterExpression(),
    pageSize: pageSize(),
    pageToken: pageToken(),
  })
);

export const FirewallRefInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    firewallName: firewallName(),
  })
);

const firewallPortsRule = () =>
  z
    .array(
      z.object({
        IPProtocol: z
          .string()
          .max(16)
          .regex(/^(tcp|udp|icmp|esp|ah|sctp|ipip|all|[0-9]{1,3})$/)
          .describe('Protocol: tcp, udp, icmp, all, or an IP protocol number.'),
        ports: z
          .array(
            z
              .string()
              .max(11)
              .regex(/^[0-9]{1,5}(-[0-9]{1,5})?$/)
          )
          .max(100)
          .optional()
          .describe('Ports or ranges, for example ["22", "8000-8080"]. Omit for all ports.'),
      })
    )
    .max(100);

export const InsertFirewallInputSchema = lazySchema(() =>
  z
    .object({
      projectId: projectId(),
      firewallName: firewallName(),
      network: z
        .string()
        .max(1024)
        .optional()
        .describe(
          'The network the rule attaches to, by bare name (for example "default", as returned by getFirewall) or by full URL. A bare name is qualified to a full network URL before the call, because Compute Engine rejects an unqualified name. Defaults to the project\'s default network.'
        ),
      direction: z
        .enum(['INGRESS', 'EGRESS'])
        .optional()
        .describe('Traffic direction. Defaults to INGRESS.'),
      priority: z
        .number()
        .int()
        .min(0)
        .max(65535)
        .optional()
        .describe(
          'Rule priority, 0 to 65535, lower wins. Use a low number such as 100 for an isolation rule so it beats permissive existing rules.'
        ),
      targetTags: z
        .array(z.string().max(63).regex(NETWORK_TAG_PATTERN))
        .max(64)
        .optional()
        .describe(
          'Network tags this rule applies to. Pair with setInstanceTags addTags to quarantine specific instances.'
        ),
      sourceRanges: z
        .array(z.string().max(64))
        .max(256)
        .optional()
        .describe('Source CIDR ranges for an INGRESS rule, for example ["0.0.0.0/0"].'),
      destinationRanges: z
        .array(z.string().max(64))
        .max(256)
        .optional()
        .describe('Destination CIDR ranges for an EGRESS rule.'),
      denied: firewallPortsRule()
        .optional()
        .describe(
          'Traffic to DENY, for example [{"IPProtocol": "all"}] for a full isolation rule.'
        ),
      allowed: firewallPortsRule().optional().describe('Traffic to ALLOW.'),
      description: z
        .string()
        .max(2048)
        .optional()
        .describe('Optional description. Worth recording the incident or case id here.'),
    })
    // A rule with neither allow nor deny is rejected by the API, so fail fast with a clear message.
    .refine((input) => input.denied !== undefined || input.allowed !== undefined, {
      message: 'Provide at least one of denied or allowed',
    })
);

export const PatchFirewallInputSchema = lazySchema(() =>
  z
    .object({
      projectId: projectId(),
      firewallName: firewallName(),
      priority: z.number().int().min(0).max(65535).optional().describe('New rule priority.'),
      targetTags: z
        .array(z.string().max(63).regex(NETWORK_TAG_PATTERN))
        .max(64)
        .optional()
        .describe('Replacement target tag list.'),
      sourceRanges: z
        .array(z.string().max(64))
        .max(256)
        .optional()
        .describe('Replacement source CIDR ranges.'),
      destinationRanges: z
        .array(z.string().max(64))
        .max(256)
        .optional()
        .describe('Replacement destination CIDR ranges.'),
      denied: firewallPortsRule().optional().describe('Replacement deny list.'),
      allowed: firewallPortsRule().optional().describe('Replacement allow list.'),
      disabled: z
        .boolean()
        .optional()
        .describe('Set true to disable the rule without deleting it.'),
      description: z.string().max(2048).optional().describe('Replacement description.'),
    })
    .refine(
      (input) =>
        Object.keys(input).some(
          (key) => !['projectId', 'firewallName'].includes(key) && input[key as never] !== undefined
        ),
      { message: 'Provide at least one field to change' }
    )
);

// --- Operations ------------------------------------------------------------------------

export const GetOperationInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    operationName: z
      .string()
      .max(128)
      // Not anchored to an "operation-" prefix: Compute Engine also emits system-generated
      // operations with other prefixes (systemevent-, repair-) for live migration, automatic
      // restarts and host repairs, and a workflow reading a name out of an operations list or a
      // log event must be able to poll those too. The name is server-generated and output-only,
      // so a tight client-side prefix check buys nothing and refuses valid input.
      .regex(/^[a-z][a-z0-9-]{0,127}$/, {
        message: 'Must be a Compute Engine operation name',
      })
      .describe(
        'The operation name returned by a mutating action, for example "operation-1234-...". System-generated names such as "systemevent-..." are also valid.'
      ),
    zone: zone()
      .optional()
      .describe(
        'The zone of a zonal operation (instance stop, start, reset, setTags, delete, createSnapshot). Omit it for a global operation (firewall insert or patch).'
      ),
  })
);

export type ListInstancesInput = z.infer<typeof ListInstancesInputSchema>;
export type InstanceRefInput = z.infer<typeof InstanceRefInputSchema>;
export type SetInstanceTagsInput = z.infer<typeof SetInstanceTagsInputSchema>;
export type SetInstanceLabelsInput = z.infer<typeof SetInstanceLabelsInputSchema>;
export type CreateSnapshotInput = z.infer<typeof CreateSnapshotInputSchema>;
export type ListFirewallsInput = z.infer<typeof ListFirewallsInputSchema>;
export type FirewallRefInput = z.infer<typeof FirewallRefInputSchema>;
export type InsertFirewallInput = z.infer<typeof InsertFirewallInputSchema>;
export type PatchFirewallInput = z.infer<typeof PatchFirewallInputSchema>;
export type GetOperationInput = z.infer<typeof GetOperationInputSchema>;

export interface ComputeInstance {
  id?: string;
  name?: string;
  status?: string;
  zone?: string;
  machineType?: string;
  creationTimestamp?: string;
  tags?: { items?: string[]; fingerprint?: string };
  labels?: Record<string, string>;
  labelFingerprint?: string;
  networkInterfaces?: Array<{
    networkIP?: string;
    network?: string;
    accessConfigs?: Array<{ natIP?: string }>;
  }>;
  disks?: Array<{ deviceName?: string; boot?: boolean; source?: string; diskSizeGb?: string }>;
  deletionProtection?: boolean;
}

export interface ComputeOperation {
  name?: string;
  status?: string;
  operationType?: string;
  progress?: number;
  targetLink?: string;
  insertTime?: string;
  endTime?: string;
  error?: { errors?: Array<{ code?: string; message?: string }> };
  warnings?: Array<{ code?: string; message?: string }>;
}

export interface ComputeFirewall {
  id?: string;
  name?: string;
  network?: string;
  direction?: string;
  priority?: number;
  disabled?: boolean;
  targetTags?: string[];
  sourceTags?: string[];
  sourceRanges?: string[];
  destinationRanges?: string[];
  allowed?: Array<{ IPProtocol?: string; ports?: string[] }>;
  denied?: Array<{ IPProtocol?: string; ports?: string[] }>;
  description?: string;
  creationTimestamp?: string;
}
