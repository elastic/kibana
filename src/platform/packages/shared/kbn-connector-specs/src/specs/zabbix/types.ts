/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const MAX_IDS = 50;
const MAX_ID_LENGTH = 32;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_NAME_LENGTH = 128;
const MAX_TAG_LENGTH = 255;
const MAX_TAGS = 20;

/**
 * Zabbix's problem/event `severity` is a 0-5 integer on the wire (see the trigger severity
 * reference). Exposed here as a friendly enum — index into this array gives the numeric value
 * Zabbix expects, via `severityToNumber()` in zabbix.ts — so the agent never has to guess or
 * hallucinate a magic number.
 */
export const ZABBIX_SEVERITIES = [
  'not_classified',
  'information',
  'warning',
  'average',
  'high',
  'disaster',
] as const;
export type ZabbixSeverity = (typeof ZABBIX_SEVERITIES)[number];

/**
 * Zabbix's problem/event tag filter `operator` is a 0-5 integer (see problem.get/event.get).
 * Index into this array gives the numeric value, via `tagFilterOperatorToNumber()` in zabbix.ts.
 */
export const ZABBIX_TAG_FILTER_OPERATORS = [
  'contains',
  'equals',
  'not_contains',
  'not_equals',
  'exists',
  'not_exists',
] as const;
export type ZabbixTagFilterOperator = (typeof ZABBIX_TAG_FILTER_OPERATORS)[number];

const IdSchema = z.string().min(1).max(MAX_ID_LENGTH);
const IdArraySchema = z.array(IdSchema).min(1).max(MAX_IDS);

export const ZabbixTagFilterSchema = lazySchema(() =>
  z.object({
    tag: z.string().min(1).max(MAX_TAG_LENGTH).describe('The tag name to filter on, e.g. "scope".'),
    value: z
      .string()
      .max(MAX_TAG_LENGTH)
      .optional()
      .describe('The tag value to match. Omit (or leave empty) when using "exists"/"not_exists".'),
    operator: z
      .enum(ZABBIX_TAG_FILTER_OPERATORS)
      .optional()
      .describe(
        'How to match the tag value: "contains" (default), "equals", "not_contains", "not_equals", "exists", or "not_exists".'
      ),
  })
);
export type ZabbixTagFilter = z.infer<typeof ZabbixTagFilterSchema>;

export const GetProblemsInputSchema = lazySchema(() =>
  z.object({
    eventIds: IdArraySchema.optional().describe('Return only problems with these exact event IDs.'),
    hostIds: IdArraySchema.optional().describe(
      'Return only problems on hosts with these IDs. Resolve host IDs with getHosts.'
    ),
    groupIds: IdArraySchema.optional().describe(
      'Return only problems on hosts belonging to these host group IDs.'
    ),
    severities: z
      .array(z.enum(ZABBIX_SEVERITIES))
      .max(6)
      .optional()
      .describe('Return only problems with one of these severities.'),
    tags: z
      .array(ZabbixTagFilterSchema)
      .max(MAX_TAGS)
      .optional()
      .describe('Return only problems matching all of these tag filters.'),
    acknowledged: z
      .boolean()
      .optional()
      .describe('If true, return only acknowledged problems; if false, only unacknowledged ones.'),
    suppressed: z
      .boolean()
      .optional()
      .describe('If true, return only suppressed (e.g. muted by maintenance) problems.'),
    recent: z
      .boolean()
      .optional()
      .describe(
        'If true, also include problems that were recently resolved (within the server\'s configured "Display OK triggers for" period), not just currently unresolved ones. Defaults to false.'
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Maximum number of problems to return. Defaults to 100.'),
  })
);
export type GetProblemsInput = z.infer<typeof GetProblemsInputSchema>;

export const GetEventInputSchema = lazySchema(() =>
  z.object({
    eventIds: IdArraySchema.describe(
      'The event IDs to fetch full details for (from getProblems, or a Zabbix notification/webhook payload). Unlike getProblems, this also returns already-resolved events.'
    ),
  })
);
export type GetEventInput = z.infer<typeof GetEventInputSchema>;

export const AcknowledgeProblemInputSchema = lazySchema(() =>
  z.object({
    eventIds: IdArraySchema.describe('The problem event IDs to acknowledge.'),
  })
);
export type AcknowledgeProblemInput = z.infer<typeof AcknowledgeProblemInputSchema>;

export const UnacknowledgeProblemInputSchema = lazySchema(() =>
  z.object({
    eventIds: IdArraySchema.describe('The problem event IDs to remove the acknowledgement from.'),
  })
);
export type UnacknowledgeProblemInput = z.infer<typeof UnacknowledgeProblemInputSchema>;

export const AddProblemMessageInputSchema = lazySchema(() =>
  z.object({
    eventIds: IdArraySchema.describe('The problem event IDs to attach the message to.'),
    message: z
      .string()
      .min(1)
      .max(MAX_MESSAGE_LENGTH)
      .describe("The note text to add to the problem's acknowledgement/update trail."),
  })
);
export type AddProblemMessageInput = z.infer<typeof AddProblemMessageInputSchema>;

export const CloseProblemInputSchema = lazySchema(() =>
  z.object({
    eventIds: IdArraySchema.describe(
      'The problem event IDs to close. Each underlying trigger must have manual close enabled, or Zabbix rejects the request.'
    ),
  })
);
export type CloseProblemInput = z.infer<typeof CloseProblemInputSchema>;

export const ChangeProblemSeverityInputSchema = lazySchema(() =>
  z.object({
    eventIds: IdArraySchema.describe('The problem event IDs to re-rank.'),
    severity: z
      .enum(ZABBIX_SEVERITIES)
      .describe(
        'The new severity to set: "not_classified", "information", "warning", "average", "high", or "disaster".'
      ),
  })
);
export type ChangeProblemSeverityInput = z.infer<typeof ChangeProblemSeverityInputSchema>;

export const SuppressProblemInputSchema = lazySchema(() =>
  z.object({
    eventIds: IdArraySchema.describe('The problem event IDs to suppress (mute).'),
    suppressUntil: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        'Unix timestamp (seconds) until which the problem is suppressed. Omit or pass 0 to suppress indefinitely (until manually unsuppressed).'
      ),
  })
);
export type SuppressProblemInput = z.infer<typeof SuppressProblemInputSchema>;

export const UnsuppressProblemInputSchema = lazySchema(() =>
  z.object({
    eventIds: IdArraySchema.describe(
      'The problem event IDs to unsuppress, resuming normal alerting.'
    ),
  })
);
export type UnsuppressProblemInput = z.infer<typeof UnsuppressProblemInputSchema>;

export const MaintenanceTimeWindowRefine = <
  T extends { activeSince?: number; activeTill?: number }
>(
  v: T
) => {
  const { activeSince, activeTill } = v;
  if (activeSince === undefined && activeTill === undefined) return true;
  if (activeSince === undefined || activeTill === undefined) return false;
  return activeTill > activeSince;
};

export const CreateMaintenanceInputSchema = lazySchema(() =>
  z
    .object({
      name: z
        .string()
        .min(1)
        .max(MAX_NAME_LENGTH)
        .describe('A short, descriptive name for the maintenance window, e.g. "DB01 patching".'),
      description: z
        .string()
        .max(MAX_MESSAGE_LENGTH)
        .optional()
        .describe('Optional longer description of the planned work.'),
      hostIds: IdArraySchema.optional().describe(
        'Host IDs to put into maintenance. Required if groupIds is not set. Resolve with getHosts.'
      ),
      groupIds: IdArraySchema.optional().describe(
        'Host group IDs to put into maintenance. Required if hostIds is not set.'
      ),
      activeSince: z
        .number()
        .int()
        .min(0)
        .describe('Unix timestamp (seconds) the maintenance window starts.'),
      activeTill: z
        .number()
        .int()
        .min(0)
        .describe(
          'Unix timestamp (seconds) the maintenance window ends. Must be after activeSince.'
        ),
      withDataCollection: z
        .boolean()
        .optional()
        .describe(
          'If true (default), Zabbix keeps collecting data during the window and only suppresses problem notifications. If false, data collection itself stops — tags is ignored in that case.'
        ),
      tags: z
        .array(
          z.object({
            tag: z.string().min(1).max(MAX_TAG_LENGTH).describe('Problem tag name to match.'),
            value: z.string().max(MAX_TAG_LENGTH).optional().describe('Tag value to match.'),
            matchExactly: z
              .boolean()
              .optional()
              .describe(
                'If true, value must match exactly. If false/omitted, value is matched as a substring.'
              ),
          })
        )
        .max(MAX_TAGS)
        .optional()
        .describe(
          'Only suppress problems whose tags match one of these (requires withDataCollection). If omitted, all problems on the target hosts/groups are suppressed.'
        ),
    })
    .refine((v) => v.hostIds !== undefined || v.groupIds !== undefined, {
      message: 'At least one of hostIds or groupIds is required.',
    })
    .refine((v) => v.activeTill > v.activeSince, {
      message: 'activeTill must be after activeSince.',
    })
);
export type CreateMaintenanceInput = z.infer<typeof CreateMaintenanceInputSchema>;

export const UpdateMaintenanceInputSchema = lazySchema(() =>
  z
    .object({
      maintenanceId: IdSchema.describe(
        'The maintenance ID to update, from createMaintenance or getMaintenances.'
      ),
      name: z.string().min(1).max(MAX_NAME_LENGTH).optional().describe('New name for the window.'),
      description: z.string().max(MAX_MESSAGE_LENGTH).optional().describe('New description.'),
      hostIds: IdArraySchema.optional().describe(
        'Replace the target hosts with this list. Provide alongside groupIds to replace both, or omit to leave hosts unchanged.'
      ),
      groupIds: IdArraySchema.optional().describe(
        'Replace the target host groups with this list. Omit to leave groups unchanged.'
      ),
      activeSince: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('New start time (Unix timestamp). Must be provided together with activeTill.'),
      activeTill: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe(
          'New end time (Unix timestamp) — set this later than the current value to extend the window. Must be provided together with activeSince.'
        ),
    })
    .refine(
      (v) =>
        v.name !== undefined ||
        v.description !== undefined ||
        v.hostIds !== undefined ||
        v.groupIds !== undefined ||
        v.activeSince !== undefined ||
        v.activeTill !== undefined,
      { message: 'At least one field to update must be provided.' }
    )
    .refine(MaintenanceTimeWindowRefine, {
      message:
        'activeSince and activeTill must be provided together, with activeTill after activeSince.',
    })
);
export type UpdateMaintenanceInput = z.infer<typeof UpdateMaintenanceInputSchema>;

export const DeleteMaintenanceInputSchema = lazySchema(() =>
  z.object({
    maintenanceIds: IdArraySchema.describe(
      'The maintenance IDs to delete, ending the window(s) immediately.'
    ),
  })
);
export type DeleteMaintenanceInput = z.infer<typeof DeleteMaintenanceInputSchema>;

export const GetMaintenancesInputSchema = lazySchema(() =>
  z.object({
    maintenanceIds: IdArraySchema.optional().describe('Return only maintenances with these IDs.'),
    hostIds: IdArraySchema.optional().describe('Return only maintenances that target these hosts.'),
    groupIds: IdArraySchema.optional().describe(
      'Return only maintenances that target these host groups.'
    ),
  })
);
export type GetMaintenancesInput = z.infer<typeof GetMaintenancesInputSchema>;

export const GetHostsInputSchema = lazySchema(() =>
  z.object({
    hostIds: IdArraySchema.optional().describe('Return only hosts with these IDs.'),
    groupIds: IdArraySchema.optional().describe(
      'Return only hosts belonging to these host group IDs.'
    ),
    name: z
      .string()
      .max(255)
      .optional()
      .describe("Case-insensitive substring match against the host's visible name."),
    status: z
      .enum(['enabled', 'disabled'])
      .optional()
      .describe('Filter to only monitored ("enabled") or unmonitored ("disabled") hosts.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Maximum number of hosts to return. Defaults to 100.'),
  })
);
export type GetHostsInput = z.infer<typeof GetHostsInputSchema>;

export const DisableHostInputSchema = lazySchema(() =>
  z.object({
    hostIds: IdArraySchema.describe('The host IDs to stop monitoring. Resolve with getHosts.'),
  })
);
export type DisableHostInput = z.infer<typeof DisableHostInputSchema>;

export const EnableHostInputSchema = lazySchema(() =>
  z.object({
    hostIds: IdArraySchema.describe('The host IDs to resume monitoring on. Resolve with getHosts.'),
  })
);
export type EnableHostInput = z.infer<typeof EnableHostInputSchema>;

export const DisableTriggerInputSchema = lazySchema(() =>
  z.object({
    triggerIds: IdArraySchema.describe(
      'The trigger IDs to disable. Disabling a trigger silences just that condition, without stopping monitoring of the whole host.'
    ),
  })
);
export type DisableTriggerInput = z.infer<typeof DisableTriggerInputSchema>;

export const EnableTriggerInputSchema = lazySchema(() =>
  z.object({
    triggerIds: IdArraySchema.describe('The trigger IDs to re-enable.'),
  })
);
export type EnableTriggerInput = z.infer<typeof EnableTriggerInputSchema>;

export const GetItemHistoryInputSchema = lazySchema(() =>
  z.object({
    itemId: IdSchema.describe(
      "The item ID to fetch recent values for, e.g. the objectid of a trigger's underlying item."
    ),
    timeFrom: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Unix timestamp (seconds); only return values recorded at or after this time.'),
    timeTill: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Unix timestamp (seconds); only return values recorded at or before this time.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Maximum number of history values to return, most recent first. Defaults to 100.'),
  })
);
export type GetItemHistoryInput = z.infer<typeof GetItemHistoryInputSchema>;

export interface ZabbixRpcError {
  code: number;
  message: string;
  data?: string;
}

export interface ZabbixRpcResponse<T> {
  jsonrpc: '2.0';
  result?: T;
  error?: ZabbixRpcError;
  id: number;
}
