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
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import type {
  ComputeFirewall,
  ComputeInstance,
  ComputeOperation,
  CreateSnapshotInput,
  FirewallRefInput,
  GetOperationInput,
  InsertFirewallInput,
  InstanceRefInput,
  ListFirewallsInput,
  ListInstancesInput,
  PatchFirewallInput,
  SetInstanceLabelsInput,
  SetInstanceTagsInput,
} from './types';
import {
  CreateSnapshotInputSchema,
  FirewallRefInputSchema,
  GetOperationInputSchema,
  InsertFirewallInputSchema,
  InstanceRefInputSchema,
  ListFirewallsInputSchema,
  ListInstancesInputSchema,
  PatchFirewallInputSchema,
  SetInstanceLabelsInputSchema,
  SetInstanceTagsInputSchema,
} from './types';

const COMPUTE_API = 'https://compute.googleapis.com/compute/v1';

const projectPath = (projectId: string): string =>
  `${COMPUTE_API}/projects/${encodeURIComponent(projectId)}`;

const instancePath = (projectId: string, zone: string, instanceName: string): string =>
  `${projectPath(projectId)}/zones/${encodeURIComponent(zone)}/instances/${encodeURIComponent(
    instanceName
  )}`;

/**
 * Compute Engine returns `machineType`, `zone`, `network` and friends as full selfLink URLs
 * (`https://.../zones/us-central1-a/machineTypes/n2-standard-4`). Only the last segment is
 * meaningful to a reader, and the full URLs bloat an agent's context for no benefit.
 */
const shortName = (selfLink?: string): string | undefined => selfLink?.split('/').pop();

/**
 * The inverse of shortName for a network reference on a WRITE.
 *
 * Compute Engine rejects a bare network name on firewall insert/patch with
 * `400 Invalid value for field 'resource.network': 'default'. The URL is malformed.`, even though
 * the reads in this spec trim networks down to exactly that bare name. Accepting the short form and
 * qualifying it here keeps the round trip symmetrical: a name read from getFirewall can be written
 * straight back without the caller reconstructing a URL.
 *
 * An already-qualified value (absolute URL, or a `projects/...`/`global/...` relative path) is a
 * structural reference and is passed through untouched.
 */
const qualifyNetwork = (projectId: string, network: string): string =>
  network.includes('/')
    ? network
    : `${projectPath(projectId)}/global/networks/${encodeURIComponent(network)}`;

/**
 * Google's partial-response `fields` mask, requesting only what trimInstance returns.
 *
 * This is a correctness requirement, not an optimization. An unmasked
 * `/aggregated/instances` on a real project measured 2,045,231 bytes, over the connector
 * framework's 1MB `maxContentLength`, so the call failed outright with "maxContentLength size
 * of 1048576 exceeded" before any handler code ran. The same request with this mask is 190,875
 * bytes and returns every instance in one page.
 *
 * It also enforces the no-metadata guarantee at the source: `metadata` (startup scripts,
 * secrets) and `serviceAccounts` are never fetched, so they cannot reach a workflow log even
 * if trimInstance later changed. `tags/fingerprint` and `labelFingerprint` are included
 * because the tag and label writes need them for optimistic concurrency.
 */
const INSTANCE_FIELDS = [
  'id',
  'name',
  'status',
  'zone',
  'machineType',
  'creationTimestamp',
  'deletionProtection',
  'tags/items',
  'tags/fingerprint',
  'labels',
  'labelFingerprint',
  'networkInterfaces(networkIP,network,accessConfigs/natIP)',
  'disks(deviceName,boot,source,diskSizeGb)',
].join(',');

/** Firewall equivalent of INSTANCE_FIELDS: 226,822 bytes unmasked, 168,574 masked. */
const FIREWALL_FIELDS = [
  'id',
  'name',
  'network',
  'direction',
  'priority',
  'disabled',
  'targetTags',
  'sourceTags',
  'sourceRanges',
  'destinationRanges',
  'allowed',
  'denied',
  'description',
  'creationTimestamp',
].join(',');

/**
 * Surface Google's own error payload. `error.message` names the missing permission or the
 * malformed field; an unwrapped axios message says only "Request failed with status code 403".
 */
const throwWithApiError = (error: unknown): never => {
  const axiosError = error as { response?: { status?: number; data?: unknown } };
  const data = axiosError.response?.data as
    | { error?: { message?: string; status?: string; errors?: Array<{ reason?: string }> } }
    | undefined;
  if (data?.error?.message) {
    const reason = data.error.errors?.[0]?.reason ? ` [${data.error.errors[0].reason}]` : '';
    throw new Error(
      `Google Compute Engine API error (${axiosError.response?.status})${reason}: ${data.error.message}`
    );
  }
  if (axiosError.response?.data !== undefined) {
    throw new Error(
      `Google Compute Engine API error (${axiosError.response?.status}): ${JSON.stringify(
        axiosError.response.data
      )}`
    );
  }
  throw error;
};

/**
 * An instance response carries disks, guestOsFeatures, licenses, metadata, serviceAccounts and
 * shieldedInstanceConfig. Only the fields a responder acts on are returned, both to keep an
 * agent's context usable and to avoid leaking instance metadata (which can contain startup
 * scripts and secrets) into a workflow log.
 */
const trimInstance = (instance: ComputeInstance) => ({
  id: instance.id,
  name: instance.name,
  status: instance.status,
  zone: shortName(instance.zone),
  machineType: shortName(instance.machineType),
  creationTimestamp: instance.creationTimestamp,
  deletionProtection: instance.deletionProtection === true,
  networkTags: instance.tags?.items ?? [],
  labels: instance.labels ?? {},
  internalIps: (instance.networkInterfaces ?? [])
    .map((nic) => nic.networkIP)
    .filter((ip): ip is string => ip !== undefined),
  externalIps: (instance.networkInterfaces ?? [])
    .flatMap((nic) => nic.accessConfigs ?? [])
    .map((config) => config.natIP)
    .filter((ip): ip is string => ip !== undefined),
  networks: (instance.networkInterfaces ?? [])
    .map((nic) => shortName(nic.network))
    .filter((name): name is string => name !== undefined),
  disks: (instance.disks ?? []).map((disk) => ({
    deviceName: disk.deviceName,
    boot: disk.boot === true,
    diskName: shortName(disk.source),
    diskSizeGb: disk.diskSizeGb,
  })),
});

/**
 * Every mutating Compute Engine call returns a long-running Operation rather than the finished
 * result, so a 200 here means "accepted", NOT "done". The operation name and zone are returned
 * so a workflow can poll getOperation before it reports success.
 *
 * Note the distinction between `done` and `succeeded`. Google defines status DONE as "completed
 * processing, successfully OR with an error", so a failed operation reports DONE with a
 * populated `error`. Real examples on a live project include a delete that finished DONE with
 * RESOURCE_NOT_FOUND and a snapshot that finished DONE with RESOURCE_ALREADY_EXISTS. A workflow
 * branching on `done` alone would report a failed containment action as success, which is
 * exactly the outcome this connector exists to prevent, so `succeeded` is derived here rather
 * than left for each caller to remember.
 */
const trimOperation = (operation: ComputeOperation, zone?: string) => {
  const errors = (operation.error?.errors ?? []).map((entry) => ({
    code: entry.code,
    message: entry.message,
  }));
  const done = operation.status === 'DONE';
  return {
    operationName: operation.name,
    status: operation.status,
    operationType: operation.operationType,
    progress: operation.progress,
    target: shortName(operation.targetLink),
    zone,
    insertTime: operation.insertTime,
    endTime: operation.endTime,
    errors,
    warnings: (operation.warnings ?? []).map((entry) => ({
      code: entry.code,
      message: entry.message,
    })),
    done,
    succeeded: done && errors.length === 0,
  };
};

const trimFirewall = (firewall: ComputeFirewall) => ({
  id: firewall.id,
  name: firewall.name,
  network: shortName(firewall.network),
  direction: firewall.direction,
  priority: firewall.priority,
  disabled: firewall.disabled === true,
  targetTags: firewall.targetTags ?? [],
  sourceTags: firewall.sourceTags ?? [],
  sourceRanges: firewall.sourceRanges ?? [],
  destinationRanges: firewall.destinationRanges ?? [],
  allowed: firewall.allowed ?? [],
  denied: firewall.denied ?? [],
  description: firewall.description,
  creationTimestamp: firewall.creationTimestamp,
});

/** Read an instance so a tag or label write can carry the current fingerprint. */
const readInstance = async (
  ctx: ActionContext,
  projectId: string,
  zone: string,
  instanceName: string
): Promise<ComputeInstance> => {
  const response = await ctx.client.get(instancePath(projectId, zone, instanceName), {
    params: { fields: INSTANCE_FIELDS },
  });
  return response.data as ComputeInstance;
};

export const GoogleComputeEngine: ConnectorSpec = {
  metadata: {
    id: '.google_compute_engine',
    displayName: 'Google Compute Engine',
    description: i18n.translate(
      'core.kibanaConnectorSpecs.googleComputeEngine.metadata.description',
      {
        defaultMessage:
          'Stop, start, reset, snapshot, and quarantine Google Compute Engine instances, and manage isolation firewall rules',
      }
    ),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: ['gcp_service_account'],
  },

  schema: lazySchema(() =>
    z.object({
      defaultProjectId: z
        .string()
        .max(30)
        .optional()
        .describe('Google Cloud project id used by the Test connector button')
        .meta({
          label: i18n.translate(
            'core.kibanaConnectorSpecs.googleComputeEngine.config.defaultProjectId',
            { defaultMessage: 'Default project ID' }
          ),
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.googleComputeEngine.config.defaultProjectIdHelp',
            {
              defaultMessage:
                'Optional, for example my-project-123. Recorded for reference and used by the Test connector button, which has no other way to know which project to call. Every action takes an explicit project ID.',
            }
          ),
          placeholder: 'my-project-123',
        }),
    })
  ),

  skill: `Google Compute Engine runs virtual machines on Google Cloud. Use this connector to contain a compromised VM and to preserve evidence before destroying it.

Containment flow for a compromised instance:
1. listInstances (omit the zone to search the whole project) or getInstance to find the host and read its current status, network tags, and IPs.
2. createSnapshot on its boot disk FIRST if there is any chance you will delete the instance. A snapshot cannot be taken after the disk is gone.
3. Choose the containment level:
   - Network quarantine, workload keeps running for forensics: insertFirewall with a deny-all rule scoped to a quarantine tag, then setInstanceTags with addTags to apply that tag. This is the preferred move because the VM stays up for live analysis while losing network reach.
   - Full halt: stopInstance. Reversible with startInstance, but you lose memory state.
   - Hard reboot: resetInstance. Use only when you want a state reset, not for containment, because it destroys memory evidence without stopping the threat.
4. getOperation to confirm the action finished before reporting success.

Gotchas:
- EVERY mutating action here is asynchronous. It returns an operation, not a result, so a success response means "accepted", not "done". Poll getOperation until done is true, then check succeeded before you claim a VM is stopped or a rule is live.
- done and succeeded are NOT the same thing. Compute Engine reports status DONE for an operation that finished EITHER successfully or with an error, so done only tells you it stopped running. Branch on succeeded, and read errors when it is false; treating done as success will report a failed containment action as a win.
- Operations are zonal for instance and snapshot actions (pass the zone to getOperation) and global for firewall actions (omit the zone). Getting that wrong returns a 404.
- setInstanceTags REPLACES the whole tag list at the API level, and network tags are what firewall rules match on, so blindly replacing them silently detaches existing rules. Use addTags and removeTags, which read the current tags and merge; only use replaceTags when you truly intend a full overwrite.
- Tag and label writes need the instance's current fingerprint. The connector reads it for you, but that means a concurrent edit makes the write fail rather than clobber it. Re-run the action to retry.
- setInstanceLabels also replaces the whole label map, so include the labels you want to keep.
- An isolation firewall rule needs a LOW priority number to win against permissive existing rules. Priority 0 beats priority 1000.
- deleteInstance is irreversible and blocked while deletionProtection is true; getInstance reports that flag.`,

  actions: {
    listInstances: {
      isTool: true,
      description:
        'List Compute Engine instances with status, machine type, network tags, labels, internal and external IPs, and attached disks. ' +
        'Omit the zone to search every zone in the project, which is what you want when an alert names a host but not where it runs. ' +
        'Supports a Compute Engine filter expression such as \'status = "RUNNING"\'. Paginates: keep passing nextPageToken until it is absent.',
      input: ListInstancesInputSchema,
      handler: async (ctx, input: ListInstancesInput) => {
        try {
          const params = {
            filter: input.filter,
            maxResults: input.pageSize,
            pageToken: input.pageToken,
          };

          if (input.zone) {
            const response = await ctx.client.get(
              `${projectPath(input.projectId)}/zones/${encodeURIComponent(input.zone)}/instances`,
              { params: { ...params, fields: `items(${INSTANCE_FIELDS}),nextPageToken` } }
            );
            const data = response.data as {
              items?: ComputeInstance[];
              nextPageToken?: string;
            };
            return {
              instances: (data.items ?? []).map(trimInstance),
              nextPageToken: data.nextPageToken,
            };
          }

          // The aggregated form returns a map keyed by "zones/<zone>", where a zone with no
          // instances carries a `warning` instead of an `instances` array.
          const response = await ctx.client.get(
            `${projectPath(input.projectId)}/aggregated/instances`,
            { params: { ...params, fields: `items/*/instances(${INSTANCE_FIELDS}),nextPageToken` } }
          );
          const data = response.data as {
            items?: Record<string, { instances?: ComputeInstance[] }>;
            nextPageToken?: string;
          };
          const instances = Object.values(data.items ?? {}).flatMap((entry) =>
            (entry.instances ?? []).map(trimInstance)
          );
          return { instances, nextPageToken: data.nextPageToken };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    getInstance: {
      isTool: true,
      description:
        'Get one instance: status, machine type, zone, network tags, labels, internal and external IPs, attached disks, and whether deletion protection is on. ' +
        'The enrichment step to run before acting, and the way to read the disk names createSnapshot needs.',
      input: InstanceRefInputSchema,
      handler: async (ctx, input: InstanceRefInput) => {
        try {
          const instance = await readInstance(ctx, input.projectId, input.zone, input.instanceName);
          return trimInstance(instance);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    stopInstance: {
      // Halts a running workload; a wrong target takes production offline.
      isTool: false,
      description:
        'Stop an instance: the core containment action that halts a running threat. Reversible with startInstance, though memory state is lost. ' +
        'Asynchronous: returns an operation, so poll getOperation with the zone until done is true, then confirm succeeded is true before reporting the VM as stopped. ' +
        'For forensics prefer network quarantine (insertFirewall plus setInstanceTags), which keeps the VM alive for analysis.',
      input: InstanceRefInputSchema,
      handler: async (ctx, input: InstanceRefInput) => {
        try {
          const response = await ctx.client.post(
            `${instancePath(input.projectId, input.zone, input.instanceName)}/stop`,
            {}
          );
          return trimOperation(response.data as ComputeOperation, input.zone);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    startInstance: {
      isTool: false,
      description:
        'Start a stopped instance. The recovery counterpart to stopInstance, used to bring a host back after remediation. ' +
        'Asynchronous: poll getOperation with the zone until done is true, then check succeeded.',
      input: InstanceRefInputSchema,
      handler: async (ctx, input: InstanceRefInput) => {
        try {
          const response = await ctx.client.post(
            `${instancePath(input.projectId, input.zone, input.instanceName)}/start`,
            {}
          );
          return trimOperation(response.data as ComputeOperation, input.zone);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    resetInstance: {
      isTool: false,
      description:
        'Hard-reboot an instance, equivalent to cutting the power. Distinct from a clean stop and start: the guest OS does not shut down gracefully. ' +
        'This DESTROYS memory evidence without removing the threat, so it is a state-reset tool rather than a containment tool. Prefer stopInstance to contain, or quarantine tags to isolate. ' +
        'Asynchronous: poll getOperation with the zone.',
      input: InstanceRefInputSchema,
      handler: async (ctx, input: InstanceRefInput) => {
        try {
          const response = await ctx.client.post(
            `${instancePath(input.projectId, input.zone, input.instanceName)}/reset`,
            {}
          );
          return trimOperation(response.data as ComputeOperation, input.zone);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    setInstanceTags: {
      isTool: false,
      description:
        "Change an instance's network tags, which is what firewall rules match on. Paired with a deny-all rule scoped to a quarantine tag, this isolates a VM while leaving it running for forensics. " +
        'Use addTags to apply a quarantine tag while keeping existing tags, removeTags to lift it, or replaceTags for a full overwrite. ' +
        'If the instance already has exactly the requested tags this makes no API call and returns changed: false with no operation to poll. ' +
        'replaceTags is destructive: any tag left out is removed, which silently detaches every firewall rule targeting it. ' +
        'Reads the current tags to supply the required fingerprint, so a concurrent edit makes this fail rather than clobber. Asynchronous: poll getOperation with the zone.',
      input: SetInstanceTagsInputSchema,
      handler: async (ctx, input: SetInstanceTagsInput) => {
        try {
          const resourcePath = instancePath(input.projectId, input.zone, input.instanceName);
          const instance = await readInstance(ctx, input.projectId, input.zone, input.instanceName);
          const currentTags = instance.tags?.items ?? [];
          const fingerprint = instance.tags?.fingerprint;

          let nextTags: string[];
          if (input.replaceTags) {
            nextTags = [...new Set(input.replaceTags)];
          } else {
            const working = new Set(currentTags);
            for (const tag of input.addTags ?? []) {
              working.add(tag);
            }
            for (const tag of input.removeTags ?? []) {
              working.delete(tag);
            }
            nextTags = [...working];
          }

          // Skip the write when nothing would change, so a workflow can tell a real
          // containment step from a no-op. Compared as sets in both directions: nextTags is
          // deduplicated above but currentTags is raw API output, so a length check plus
          // one-way containment would not establish equality on its own.
          const currentSet = new Set(currentTags);
          const nextSet = new Set(nextTags);
          const unchanged =
            currentSet.size === nextSet.size && [...nextSet].every((tag) => currentSet.has(tag));
          if (unchanged) {
            return {
              changed: false,
              reason: 'Instance already has exactly these network tags',
              networkTags: currentTags,
              // No API call was made, so there is no operation to poll. Reported explicitly
              // (rather than omitted) so a workflow that always polls sees a terminal,
              // successful result instead of an undefined operation name.
              operationName: undefined,
              done: true,
              succeeded: true,
            };
          }

          const response = await ctx.client.post(`${resourcePath}/setTags`, {
            items: nextTags,
            fingerprint,
          });
          return {
            changed: true,
            previousTags: currentTags,
            networkTags: nextTags,
            ...trimOperation(response.data as ComputeOperation, input.zone),
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    setInstanceLabels: {
      isTool: false,
      description:
        "Set an instance's labels, for example to tag a host with an incident id for case tracking and later reporting. " +
        'REPLACES the whole label map, so include any labels you want to keep. Labels are metadata only and do not affect firewall rules, unlike network tags. ' +
        'Reads the current labelFingerprint automatically. Asynchronous: poll getOperation with the zone.',
      input: SetInstanceLabelsInputSchema,
      handler: async (ctx, input: SetInstanceLabelsInput) => {
        try {
          const resourcePath = instancePath(input.projectId, input.zone, input.instanceName);
          const instance = await readInstance(ctx, input.projectId, input.zone, input.instanceName);
          const response = await ctx.client.post(`${resourcePath}/setLabels`, {
            labels: input.labels,
            labelFingerprint: instance.labelFingerprint,
          });
          return {
            previousLabels: instance.labels ?? {},
            labels: input.labels,
            ...trimOperation(response.data as ComputeOperation, input.zone),
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    createSnapshot: {
      isTool: false,
      description:
        'Snapshot a disk to preserve evidence, typically the boot disk of a suspect VM before it is stopped or deleted. ' +
        'Run this BEFORE deleteInstance: once the disk is gone the evidence cannot be recovered. Read disk names from getInstance. ' +
        'Asynchronous: poll getOperation with the zone until done is true and succeeded is true before deleting anything. A snapshot that finished with an error still reports done.',
      input: CreateSnapshotInputSchema,
      handler: async (ctx, input: CreateSnapshotInput) => {
        try {
          const response = await ctx.client.post(
            `${projectPath(input.projectId)}/zones/${encodeURIComponent(
              input.zone
            )}/disks/${encodeURIComponent(input.diskName)}/createSnapshot`,
            {
              name: input.snapshotName,
              ...(input.description ? { description: input.description } : {}),
            }
          );
          return {
            snapshotName: input.snapshotName,
            ...trimOperation(response.data as ComputeOperation, input.zone),
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    deleteInstance: {
      // Irreversible, and takes the disks with it unless they were snapshotted.
      isTool: false,
      description:
        'Delete an instance permanently. The final step for an unrecoverable VM, and NOT reversible. ' +
        'Run createSnapshot on the boot disk first or the evidence is lost with the disk. Blocked while deletionProtection is true; getInstance reports that flag. ' +
        'Asynchronous: poll getOperation with the zone.',
      input: InstanceRefInputSchema,
      handler: async (ctx, input: InstanceRefInput) => {
        try {
          const response = await ctx.client.delete(
            instancePath(input.projectId, input.zone, input.instanceName)
          );
          return trimOperation(response.data as ComputeOperation, input.zone);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    listFirewalls: {
      isTool: true,
      description:
        "List the project's firewall rules with direction, priority, target tags, source and destination ranges, and the allowed or denied protocols and ports. " +
        'Use it to audit what applies to a host before and after isolation, and to check whether a quarantine rule already exists. ' +
        'Paginates: keep passing nextPageToken until it is absent.',
      input: ListFirewallsInputSchema,
      handler: async (ctx, input: ListFirewallsInput) => {
        try {
          const response = await ctx.client.get(
            `${projectPath(input.projectId)}/global/firewalls`,
            {
              params: {
                filter: input.filter,
                maxResults: input.pageSize,
                pageToken: input.pageToken,
                fields: `items(${FIREWALL_FIELDS}),nextPageToken`,
              },
            }
          );
          const data = response.data as { items?: ComputeFirewall[]; nextPageToken?: string };
          return {
            firewalls: (data.items ?? []).map(trimFirewall),
            nextPageToken: data.nextPageToken,
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    getFirewall: {
      isTool: true,
      description:
        'Get one firewall rule: its targets and the traffic it allows or denies, for verifying an isolation rule landed as intended.',
      input: FirewallRefInputSchema,
      handler: async (ctx, input: FirewallRefInput) => {
        try {
          const response = await ctx.client.get(
            `${projectPath(input.projectId)}/global/firewalls/${encodeURIComponent(
              input.firewallName
            )}`,
            { params: { fields: FIREWALL_FIELDS } }
          );
          return trimFirewall(response.data as ComputeFirewall);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    insertFirewall: {
      isTool: false,
      description:
        'Create a firewall rule, the other half of tag-based isolation: a deny-all rule scoped to a quarantine tag, applied to a VM with setInstanceTags addTags. ' +
        'Give an isolation rule a LOW priority number (for example 0 to 100) so it beats permissive existing rules; higher numbers lose. ' +
        'Asynchronous and GLOBAL: poll getOperation WITHOUT a zone.',
      input: InsertFirewallInputSchema,
      handler: async (ctx, input: InsertFirewallInput) => {
        try {
          const response = await ctx.client.post(
            `${projectPath(input.projectId)}/global/firewalls`,
            {
              name: input.firewallName,
              ...(input.network ? { network: qualifyNetwork(input.projectId, input.network) } : {}),
              ...(input.direction ? { direction: input.direction } : {}),
              ...(input.priority !== undefined ? { priority: input.priority } : {}),
              ...(input.targetTags ? { targetTags: input.targetTags } : {}),
              ...(input.sourceRanges ? { sourceRanges: input.sourceRanges } : {}),
              ...(input.destinationRanges ? { destinationRanges: input.destinationRanges } : {}),
              ...(input.denied ? { denied: input.denied } : {}),
              ...(input.allowed ? { allowed: input.allowed } : {}),
              ...(input.description ? { description: input.description } : {}),
            }
          );
          return {
            firewallName: input.firewallName,
            ...trimOperation(response.data as ComputeOperation),
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    patchFirewall: {
      isTool: false,
      description:
        'Update an existing firewall rule during an active response: tighten ranges, flip allow to deny, change priority, or disable it. ' +
        'Only the fields you pass are changed, but a field you do pass REPLACES its previous value wholesale rather than merging (target tags and ranges are lists, not additions). Read the rule with getFirewall first. ' +
        'Asynchronous and GLOBAL: poll getOperation WITHOUT a zone.',
      input: PatchFirewallInputSchema,
      handler: async (ctx, input: PatchFirewallInput) => {
        try {
          const { projectId, firewallName, ...changes } = input;
          const body = Object.fromEntries(
            Object.entries(changes).filter(([, value]) => value !== undefined)
          );
          const response = await ctx.client.patch(
            `${projectPath(projectId)}/global/firewalls/${encodeURIComponent(firewallName)}`,
            body
          );
          return {
            firewallName,
            changedFields: Object.keys(body),
            ...trimOperation(response.data as ComputeOperation),
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    getOperation: {
      isTool: true,
      description:
        'Get the status of a long-running Compute Engine operation: PENDING, RUNNING, or DONE, plus any errors. ' +
        'Every mutating action in this connector returns an operation name, so poll this until done is true and then check succeeded before reporting that a VM was stopped or a rule is live. ' +
        'done means the operation stopped running, NOT that it worked: a failed operation reports done with a populated errors list. succeeded is done plus no errors. ' +
        'Pass the zone for instance and snapshot operations; omit it for firewall operations, which are global. Passing the wrong scope returns a 404.',
      input: GetOperationInputSchema,
      handler: async (ctx, input: GetOperationInput) => {
        try {
          const scope = input.zone ? `zones/${encodeURIComponent(input.zone)}` : 'global';
          const response = await ctx.client.get(
            `${projectPath(input.projectId)}/${scope}/operations/${encodeURIComponent(
              input.operationName
            )}`
          );
          return trimOperation(response.data as ComputeOperation, input.zone);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.googleComputeEngine.test.description', {
      defaultMessage:
        'Verifies the Google Compute Engine connection by listing the available machine zones',
    }),
    handler: async (ctx) => {
      try {
        const { defaultProjectId } = ctx.config as { defaultProjectId?: string };
        if (!defaultProjectId) {
          // Every Compute Engine endpoint is project-scoped, so there is nothing to call
          // without a project. Say so plainly rather than failing with a 404 on an empty path.
          throw new Error(
            'Set a default project ID on the connector to test the connection, or verify the credentials by running an action with an explicit project id'
          );
        }
        await ctx.client.get(`${projectPath(defaultProjectId)}/zones`, {
          params: { maxResults: 1 },
        });
        // Resolving is what signals success; ConnectorTestHandlerResult declares `ok?: never`,
        // so a failure must throw rather than return an ok flag.
        return { message: 'Successfully connected to the Google Compute Engine API' };
      } catch (error) {
        return throwWithApiError(error);
      }
    },
  },
};
