/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  ALERTS_RESULT_WINDOW,
  DEVICE_ID_PATTERN,
  DOMAIN_PATTERN,
  FILE_HASH_PATTERN,
  GROUP_ID_PATTERN,
  MAX_FILE_BASE64_CHARS,
  MAX_FILE_BYTES,
  MD5_PATTERN,
  NGSIEM_SEARCH_ID_PATTERN,
  NGSIEM_TIME_PATTERN,
  SCAN_CPU_PRIORITY_MAX,
  SCAN_CPU_PRIORITY_MIN,
  SCAN_ID_PATTERN,
  SCAN_PATH_PATTERN,
  SHA256_PATTERN,
  UUID_PATTERN,
} from './constants';

// ---------------------------------------------------------------------------
// Shared fields
// ---------------------------------------------------------------------------

const Ipv4Schema = lazySchema(() => z.ipv4());
const Ipv6Schema = lazySchema(() => z.ipv6());

const deviceId = () =>
  z.string().max(32).regex(DEVICE_ID_PATTERN, 'A Falcon device id is 32 hexadecimal characters.');

const deviceIds = (max: number, description: string) =>
  z.array(deviceId().describe('Falcon device id')).min(1).max(max).describe(description);

const offsetField = (description = 'Position of the first result (default 0)') =>
  z.number().int().min(0).optional().describe(description);

const limitField = (max: number, description: string) =>
  z.number().int().min(1).max(max).optional().describe(description);

const sortField = (example: string) =>
  z.string().max(100).optional().describe(`Sort as field.direction, for example ${example}`);

const rtrTimeout = (defaultSeconds: number) =>
  z
    .number()
    .int()
    .min(1)
    .max(300)
    .optional()
    .describe(`Seconds to wait for the result (default ${defaultSeconds}, max 300)`);

const queueOffline = () =>
  z
    .boolean()
    .optional()
    .describe(
      'Queue the command for hosts that are offline instead of failing them (default false)'
    );

/** Decoded size of a base64 string, without decoding it. */
export const base64DecodedBytes = (value: string): number =>
  Math.floor((value.length * 3) / 4) - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0);

const base64Content = (description: string) =>
  z
    .string()
    .min(1)
    .max(MAX_FILE_BASE64_CHARS)
    .regex(/^[A-Za-z0-9+/]*={0,2}$/, 'Content must be base64 encoded.')
    .refine((value) => value.length % 4 === 0, 'Base64 content length must be a multiple of 4.')
    .refine(
      (value) => base64DecodedBytes(value) <= MAX_FILE_BYTES,
      'Content is larger than 1 MiB once decoded.'
    )
    .describe(description);

export const INDICATOR_TYPES = ['sha256', 'md5', 'domain', 'ipv4', 'ipv6'] as const;
export type IndicatorType = (typeof INDICATOR_TYPES)[number];

/** True when a value has the format its indicator type requires. */
export const isValidIndicatorValue = (type: IndicatorType, value: string): boolean => {
  switch (type) {
    case 'sha256':
      return SHA256_PATTERN.test(value);
    case 'md5':
      return MD5_PATTERN.test(value);
    case 'domain':
      return DOMAIN_PATTERN.test(value);
    case 'ipv4':
      return Ipv4Schema.safeParse(value).success;
    case 'ipv6':
      return Ipv6Schema.safeParse(value).success;
  }
};

const indicatorTypeField = () =>
  z
    .enum(INDICATOR_TYPES)
    .describe('Indicator type: sha256, md5, domain, ipv4 or ipv6 (lower case)');

const SANDBOX_ENVIRONMENTS = [430, 330, 200, 160, 140, 110, 100] as const;
const sandboxFields = () => ({
  environment_id: z
    .literal(SANDBOX_ENVIRONMENTS)
    .optional()
    .describe(
      'Sandbox environment: 160 Windows 10 (default), 140 Windows 11, 110 Windows 7 64-bit, 100 Windows 7 32-bit, 330 Ubuntu 24, 430 macOS ARM, 200 Android'
    ),
  action_script: z
    .enum([
      'default',
      'default_maxantievasion',
      'default_randomfiles',
      'default_randomtheme',
      'default_openie',
    ])
    .optional()
    .describe('Runtime action script for the analysis (default: Falcon default)'),
  submission_id: z
    .string()
    .min(1)
    .max(100)
    .optional()
    .describe('submission_id of an earlier call, to check it again'),
  timeout: z
    .number()
    .int()
    .min(0)
    .max(300)
    .optional()
    .describe('Seconds to wait for the report (default 60, max 300)'),
});

// ---------------------------------------------------------------------------
// Hosts
// ---------------------------------------------------------------------------

export const GetAgentDetailsInputSchema = lazySchema(() =>
  z.object({
    ids: deviceIds(5000, 'Falcon device ids, 32 hex characters each, at most 5000'),
  })
);
export type GetAgentDetailsInput = z.infer<typeof GetAgentDetailsInputSchema>;

export const SearchDevicesInputSchema = lazySchema(() =>
  z.object({
    filter: z
      .string()
      .max(2000)
      .optional()
      .describe("FQL filter, for example hostname:'web-01'; + is AND, a comma is OR"),
    limit: limitField(5000, 'Page size (1-5000, default 100)'),
    offset: offsetField(
      'Position of the first result (default 0); pass next_offset. Paging stops at 10,000 results.'
    ),
    sort: sortField('hostname.asc or last_seen.desc'),
  })
);
export type SearchDevicesInput = z.infer<typeof SearchDevicesInputSchema>;

export const GetAgentOnlineStatusInputSchema = lazySchema(() =>
  z.object({
    ids: deviceIds(100, 'Falcon device ids, 32 hex characters each, at most 100'),
  })
);
export type GetAgentOnlineStatusInput = z.infer<typeof GetAgentOnlineStatusInputSchema>;

export const HostActionInputSchema = lazySchema(() =>
  z.object({
    ids: deviceIds(100, 'Falcon device ids, 32 hex characters each, at most 100'),
    actionParameters: z
      .record(z.string().min(1).max(100), z.string().max(1000))
      .refine((value) => Object.keys(value).length <= 20, 'At most 20 action parameters.')
      .optional()
      .describe('Extra Falcon action parameters as name and value pairs; usually omitted'),
  })
);
export type HostActionInput = z.infer<typeof HostActionInputSchema>;

export const ListHostGroupsInputSchema = lazySchema(() =>
  z.object({
    filter: z
      .string()
      .max(1000)
      .optional()
      .describe(
        "FQL filter on host group fields, for example name:'Servers' or group_type:'static'"
      ),
    limit: limitField(5000, 'Page size (1-5000, default 100)'),
    offset: offsetField('Position of the first result (default 0); pass next_offset to continue'),
    sort: z
      .enum(['name.asc', 'name.desc', 'created_timestamp.asc', 'created_timestamp.desc'])
      .optional()
      .describe('Sort order: name.asc, name.desc, created_timestamp.asc or created_timestamp.desc'),
  })
);
export type ListHostGroupsInput = z.infer<typeof ListHostGroupsInputSchema>;

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

const ALERT_STATUSES = ['new', 'in_progress', 'reopened', 'closed'] as const;

export const SearchAlertsInputSchema = lazySchema(() =>
  z
    .object({
      filter: z
        .string()
        .max(4000)
        .optional()
        .describe(
          "Raw FQL filter, ANDed with the convenience filters, for example product:'epp'+tactic:'Execution'"
        ),
      status: z
        .enum(ALERT_STATUSES)
        .optional()
        .describe('Only alerts with this status: new, in_progress, reopened or closed'),
      severity_min: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Minimum severity, 1-100 (Falcon: 20 low, 40 medium, 60 high, 80 critical)'),
      device_id: deviceId().optional().describe('Falcon device id of the affected host'),
      hostname: z
        .string()
        .max(255)
        .optional()
        .describe('Hostname of the affected host, exact match'),
      start_time: z.iso
        .datetime({ offset: true })
        .max(40)
        .optional()
        .describe(
          'Only alerts created at or after this time, ISO 8601, for example 2026-11-01T00:00:00Z'
        ),
      end_time: z.iso
        .datetime({ offset: true })
        .max(40)
        .optional()
        .describe('Only alerts created at or before this time, ISO 8601'),
      q: z.string().max(500).optional().describe('Free-text search across alert fields'),
      sort: sortField('created_timestamp.desc (default) or severity.desc'),
      limit: limitField(10_000, 'Page size (1-10000, default 100)'),
      offset: z
        .number()
        .int()
        .min(0)
        .max(9999)
        .optional()
        .describe('Position of the first result (default 0); pass next_offset'),
      include_hidden: z
        .boolean()
        .optional()
        .describe('Include alerts hidden from the Falcon console (default false)'),
    })
    .refine(
      ({ offset = 0, limit = 100 }) => offset + limit <= ALERTS_RESULT_WINDOW,
      'offset + limit must not exceed 10,000: Falcon cannot page further. Narrow the filter (for example with start_time) instead.'
    )
);
export type SearchAlertsInput = z.infer<typeof SearchAlertsInputSchema>;

const compositeIds = () =>
  z
    .array(z.string().min(1).max(300).describe('Composite alert id'))
    .min(1)
    .max(1000)
    .describe('Composite alert ids (composite_id values from searchAlerts), at most 1000');

export const GetAlertDetailsInputSchema = lazySchema(() =>
  z.object({
    composite_ids: compositeIds(),
    include_hidden: z
      .boolean()
      .optional()
      .describe('Include alerts hidden from the Falcon console (default false)'),
  })
);
export type GetAlertDetailsInput = z.infer<typeof GetAlertDetailsInputSchema>;

const tagList = (description: string) =>
  z
    .array(z.string().min(1).max(100).describe('Tag'))
    .min(1)
    .max(50)
    .optional()
    .describe(description);

export const UpdateAlertInputSchema = lazySchema(() =>
  z
    .object({
      composite_ids: compositeIds(),
      status: z
        .enum(ALERT_STATUSES)
        .optional()
        .describe('New status: new, in_progress, reopened or closed'),
      comment: z
        .string()
        .min(1)
        .max(4000)
        .optional()
        .describe(
          'Comment appended to the alerts. Earlier comments are kept and cannot be removed.'
        ),
      assign_to: z
        .string()
        .min(1)
        .max(255)
        .optional()
        .describe('User UUID, login email or display name; not with unassign'),
      unassign: z
        .boolean()
        .optional()
        .describe('true releases the alerts back to the queue (clears the assignee)'),
      add_tags: tagList('Tags to add, at most 50 of up to 100 characters'),
      remove_tags: tagList('Tags to remove, at most 50. Removals are applied before additions.'),
      remove_tags_by_prefix: z
        .string()
        .min(1)
        .max(100)
        .optional()
        .describe('Remove every tag that starts with this prefix, for example soar:'),
      show_in_ui: z
        .boolean()
        .optional()
        .describe('true shows and false hides the alerts in the Falcon console'),
    })
    .refine(
      (v) =>
        v.status !== undefined ||
        v.comment !== undefined ||
        v.assign_to !== undefined ||
        v.unassign === true ||
        v.add_tags !== undefined ||
        v.remove_tags !== undefined ||
        v.remove_tags_by_prefix !== undefined ||
        v.show_in_ui !== undefined,
      'Give at least one change: status, comment, assign_to, unassign, add_tags, remove_tags, remove_tags_by_prefix or show_in_ui.'
    )
    .refine(
      (v) => !(v.assign_to !== undefined && v.unassign === true),
      'assign_to and unassign cannot be used together.'
    )
);
export type UpdateAlertInput = z.infer<typeof UpdateAlertInputSchema>;

// ---------------------------------------------------------------------------
// Custom IOCs
// ---------------------------------------------------------------------------

const IndicatorSchema = lazySchema(() =>
  z
    .object({
      type: indicatorTypeField(),
      value: z
        .string()
        .min(1)
        .max(255)
        .describe('Indicator value in the format of its type, for example a 64-character sha256'),
      action: z
        .enum(['no_action', 'allow', 'prevent_no_ui', 'detect', 'prevent'])
        .describe(
          'What Falcon does on a match: detect, prevent (hashes only), prevent_no_ui, allow or no_action'
        ),
      platforms: z
        .array(z.enum(['windows', 'mac', 'linux']).describe('Platform'))
        .min(1)
        .max(3)
        .describe('Platforms the indicator applies to: windows, mac, linux'),
      severity: z
        .enum(['informational', 'low', 'medium', 'high', 'critical'])
        .optional()
        .describe(
          'Severity of the detections it raises; required when action is detect or prevent'
        ),
      description: z.string().max(1000).optional().describe('Description shown in Falcon'),
      expiration: z.iso
        .datetime({ offset: true })
        .max(40)
        .optional()
        .describe('When the indicator expires, ISO 8601; omit for no expiry'),
      applied_globally: z
        .boolean()
        .optional()
        .describe('Apply to every host; defaults to true when host_groups is not given'),
      host_groups: z
        .array(z.string().min(1).max(100).describe('Host group id'))
        .min(1)
        .max(500)
        .optional()
        .describe(
          'Host group ids (from listHostGroups) to apply the indicator to instead of all hosts'
        ),
      tags: z
        .array(z.string().min(1).max(100).describe('Tag'))
        .max(50)
        .optional()
        .describe('Tags, at most 50'),
      source: z.string().max(200).optional().describe('Source label, for example Elastic Security'),
    })
    .refine((v) => isValidIndicatorValue(v.type, v.value), {
      message: 'The value does not match the indicator type.',
      path: ['value'],
    })
    .refine((v) => !['detect', 'prevent'].includes(v.action) || v.severity !== undefined, {
      message: 'severity is required when action is detect or prevent.',
      path: ['severity'],
    })
    .refine((v) => !(v.applied_globally === true && v.host_groups?.length), {
      message: 'Use either applied_globally=true or host_groups, not both.',
      path: ['host_groups'],
    })
);

export const UploadIOCInputSchema = lazySchema(() =>
  z.object({
    indicators: z
      .array(IndicatorSchema.describe('Indicator to create'))
      .min(1)
      .max(200)
      .describe('Indicators to create, at most 200'),
    retrodetects: z
      .boolean()
      .optional()
      .describe('Also raise detections for past matches (default false)'),
    ignore_warnings: z
      .boolean()
      .optional()
      .describe('Create the indicators even when Falcon returns warnings (default false)'),
  })
);
export type UploadIOCInput = z.infer<typeof UploadIOCInputSchema>;

export const SearchIOCsInputSchema = lazySchema(() =>
  z
    .object({
      filter: z
        .string()
        .max(2000)
        .optional()
        .describe("FQL filter, for example type:'sha256'+value:'<hash>' or value:'evil.example'"),
      limit: limitField(2000, 'Page size (1-2000, default 100)'),
      offset: offsetField('Position of the first result (not together with after)'),
      after: z
        .string()
        .min(1)
        .max(500)
        .optional()
        .describe('Cursor from the previous page (next_after); use it beyond 10,000 results'),
      sort: sortField('created_on.desc or modified_on.asc'),
    })
    .refine(
      (v) => v.offset === undefined || v.after === undefined,
      'Use offset or after, not both.'
    )
);
export type SearchIOCsInput = z.infer<typeof SearchIOCsInputSchema>;

export const DeleteIOCInputSchema = lazySchema(() =>
  z.object({
    ids: z
      .array(z.string().min(1).max(64).describe('IOC id'))
      .min(1)
      .max(100)
      .describe('Ids of the custom IOCs to delete (from uploadIOC or searchIOCs), at most 100'),
    comment: z.string().max(500).optional().describe('Why the IOCs are removed, kept for audit'),
  })
);
export type DeleteIOCInput = z.infer<typeof DeleteIOCInputSchema>;

export const FindHostsByIndicatorInputSchema = lazySchema(() =>
  z
    .object({
      type: indicatorTypeField(),
      value: z
        .string()
        .min(1)
        .max(253)
        .describe('Indicator value, for example a sha256 or a domain (at most 253 characters)'),
      limit: limitField(100, 'Page size (1-100, default 100)'),
      offset: offsetField('Position of the first result (default 0); pass next_offset to continue'),
    })
    .refine((v) => isValidIndicatorValue(v.type, v.value), {
      message: 'The value does not match the indicator type.',
      path: ['value'],
    })
);
export type FindHostsByIndicatorInput = z.infer<typeof FindHostsByIndicatorInputSchema>;

// ---------------------------------------------------------------------------
// Real Time Response
// ---------------------------------------------------------------------------

const rtrCommandInput = (maxHosts: number, tierCommands: string) =>
  z.object({
    endpoint_ids: deviceIds(
      maxHosts,
      `Falcon device ids of the hosts to run on, at most ${maxHosts}. Duplicates are removed.`
    ),
    command: z
      .string()
      .min(1)
      .max(4000)
      .describe(`Command line, for example 'ls C:\\Windows'. Allowed commands: ${tierCommands}.`),
    timeout: rtrTimeout(30),
    queue_offline: queueOffline(),
  });

export const ExecuteRTRCommandInputSchema = lazySchema(() =>
  rtrCommandInput(
    100,
    'cat, cd, clear, env, eventlog, filehash, getsid, help, history, ipconfig, ls, mount, netstat, ps, reg query'
  )
);
export type ExecuteRTRCommandInput = z.infer<typeof ExecuteRTRCommandInputSchema>;

export const BatchActiveResponderInputSchema = lazySchema(() =>
  rtrCommandInput(
    10_000,
    'the read-only commands plus cp, encrypt, get, kill, map, memdump, mkdir, mv, reg set, reg delete, reg load, reg unload, restart, rm, runscript, shutdown, umount, unmap, update, xmemdump, zip; put, put-and-run and run need batchAdminExecuteRTR'
  )
);
export type BatchActiveResponderInput = z.infer<typeof BatchActiveResponderInputSchema>;

export const BatchAdminInputSchema = lazySchema(() =>
  rtrCommandInput(10_000, 'the active responder commands plus put, put-and-run and run')
);
export type BatchAdminInput = z.infer<typeof BatchAdminInputSchema>;

export const GetRTRCommandStatusInputSchema = lazySchema(() =>
  z.object({
    cloud_request_id: z
      .string()
      .min(1)
      .max(64)
      .describe('cloud_request_id returned by an RTR action whose command was still running'),
    sequence_id: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        'Output chunk to read (default 0); increase it to read later chunks of long output'
      ),
    tier: z
      .enum(['read_only', 'active_responder', 'admin'])
      .optional()
      .describe('Tier the command ran in: read_only (default), active_responder or admin'),
  })
);
export type GetRTRCommandStatusInput = z.infer<typeof GetRTRCommandStatusInputSchema>;

const libraryListFields = (example: string) => ({
  filter: z.string().max(1000).optional().describe(`FQL filter, for example ${example}`),
  limit: limitField(100, 'Page size (1-100, default 100)'),
  offset: offsetField('Position of the first result (default 0); pass next_offset to continue'),
});

export const GetRTRCloudScriptsInputSchema = lazySchema(() =>
  z.object({ ...libraryListFields("name:'collect*'"), sort: sortField('name.asc') })
);
export type GetRTRCloudScriptsInput = z.infer<typeof GetRTRCloudScriptsInputSchema>;

export const RtrRetrieveFileInputSchema = lazySchema(() =>
  z.object({
    device_id: deviceId().describe('Falcon device id of the host'),
    file_path: z
      .string()
      .min(1)
      .max(1000)
      .describe(
        'Full path of the file on the host, for example C:\\Users\\a\\Downloads\\invoice.exe'
      ),
    timeout: rtrTimeout(60),
    queue_offline: z
      .boolean()
      .optional()
      .describe(
        'Queue for an offline host (default false); the result then has complete=false and no file'
      ),
  })
);
export type RtrRetrieveFileInput = z.infer<typeof RtrRetrieveFileInputSchema>;

export const RtrKillProcessInputSchema = lazySchema(() =>
  z.object({
    device_id: deviceId().describe('Falcon device id of the host'),
    process_id: z
      .number()
      .int()
      .min(1)
      .max(4294967295)
      .describe('Id of the process to kill, for example from rtrListProcesses'),
    timeout: rtrTimeout(30),
  })
);
export type RtrKillProcessInput = z.infer<typeof RtrKillProcessInputSchema>;

export const RtrListProcessesInputSchema = lazySchema(() =>
  z.object({
    device_id: deviceId().describe('Falcon device id of the host'),
    timeout: rtrTimeout(30),
  })
);
export type RtrListProcessesInput = z.infer<typeof RtrListProcessesInputSchema>;

export const UploadRTRFileInputSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .min(1)
      .max(255)
      .describe('File name in the put-file library, for example tool.exe'),
    description: z.string().min(1).max(1000).describe('Description (required by Falcon)'),
    content_base64: base64Content('File content, base64 encoded, at most 1 MiB once decoded'),
    comments_for_audit_log: z
      .string()
      .max(1000)
      .optional()
      .describe('Comment kept in the audit log'),
  })
);
export type UploadRTRFileInput = z.infer<typeof UploadRTRFileInputSchema>;

export const ListRTRFilesInputSchema = lazySchema(() =>
  z.object({ ...libraryListFields("name:'tool*'"), sort: sortField('created_at.asc') })
);
export type ListRTRFilesInput = z.infer<typeof ListRTRFilesInputSchema>;

const libraryId = (source: string) =>
  z.object({ id: z.string().min(1).max(100).describe(`Id of the item, from ${source}`) });

export const DeleteRTRFileInputSchema = lazySchema(() =>
  libraryId('uploadRTRFile or listRTRFiles')
);
export type DeleteRTRFileInput = z.infer<typeof DeleteRTRFileInputSchema>;

export const UploadRTRScriptInputSchema = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(255).describe('Script name, used as runscript -CloudFile=name'),
    description: z.string().min(1).max(1000).describe('Description (required by Falcon)'),
    content: z
      .string()
      .min(1)
      .max(MAX_FILE_BYTES)
      .refine(
        (value) => Buffer.byteLength(value, 'utf8') <= MAX_FILE_BYTES,
        'The script is larger than 1 MiB.'
      )
      .describe('Script text, at most 1 MiB'),
    permission_type: z
      .enum(['private', 'group', 'public'])
      .describe('Who can run it: private (you), group (RTR admins) or public (all RTR users)'),
    platform: z
      .array(z.enum(['windows', 'mac', 'linux']).describe('Platform'))
      .min(1)
      .max(3)
      .optional()
      .describe('Platforms: windows, mac, linux (default windows)'),
    comments_for_audit_log: z
      .string()
      .max(1000)
      .optional()
      .describe('Comment kept in the audit log'),
  })
);
export type UploadRTRScriptInput = z.infer<typeof UploadRTRScriptInputSchema>;

export const DeleteRTRScriptInputSchema = lazySchema(() =>
  libraryId('uploadRTRScript or getRTRCloudScripts')
);
export type DeleteRTRScriptInput = z.infer<typeof DeleteRTRScriptInputSchema>;

// ---------------------------------------------------------------------------
// Quarantine, intelligence, sandbox and Spotlight
// ---------------------------------------------------------------------------

export const ListQuarantinedFilesInputSchema = lazySchema(() =>
  z.object({
    filter: z
      .string()
      .max(2000)
      .optional()
      .describe("FQL filter, for example hostname:'web-01'+state:'quarantined' or sha256:'<hash>'"),
    q: z.string().max(500).optional().describe('Free-text search'),
    limit: limitField(500, 'Page size (1-500, default 100)'),
    offset: offsetField('Position of the first result (default 0); pass next_offset to continue'),
    sort: z.string().max(100).optional().describe('Sort, for example date_created.desc'),
  })
);
export type ListQuarantinedFilesInput = z.infer<typeof ListQuarantinedFilesInputSchema>;

export const ApplyQuarantineFileActionInputSchema = lazySchema(() =>
  z.object({
    ids: z
      .array(z.string().min(1).max(100).describe('Quarantined file id'))
      .min(1)
      .max(500)
      .describe('Quarantined file ids from listQuarantinedFiles, at most 500'),
    action: z
      .enum(['release', 'unrelease', 'delete'])
      .describe(
        'release restores the file, unrelease quarantines it again, delete removes it for good'
      ),
    comment: z.string().max(500).optional().describe('Why, kept for audit'),
  })
);
export type ApplyQuarantineFileActionInput = z.infer<typeof ApplyQuarantineFileActionInputSchema>;

const reputationLimit = () =>
  z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe('Matching indicators to return (1-1000, default 10)');

export const GetFileReputationInputSchema = lazySchema(() =>
  z.object({
    hash: z
      .string()
      .max(64)
      .regex(FILE_HASH_PATTERN, 'A file hash is 32 (MD5), 40 (SHA1) or 64 (SHA256) hex characters.')
      .describe('File hash: MD5 (32), SHA1 (40) or SHA256 (64) hexadecimal characters'),
    limit: reputationLimit(),
  })
);
export type GetFileReputationInput = z.infer<typeof GetFileReputationInputSchema>;

export const GetUrlReputationInputSchema = lazySchema(() =>
  z.object({
    url: z
      .string()
      .min(1)
      .max(2048)
      .describe(
        'A URL with its scheme (https://evil.example/path) or a bare domain (evil.example)'
      ),
    limit: reputationLimit(),
  })
);
export type GetUrlReputationInput = z.infer<typeof GetUrlReputationInputSchema>;

export const DetonateUrlInputSchema = lazySchema(() =>
  z
    .object({
      url: z
        .string()
        .max(2048)
        .refine(
          (value) => /^(https?|ftp):\/\/[^\s]+$/i.test(value),
          'Give an http, https or ftp URL.'
        )
        .optional()
        .describe('URL to detonate, http, https or ftp (required unless submission_id is given)'),
      ...sandboxFields(),
    })
    .refine(
      (v) => (v.url === undefined) !== (v.submission_id === undefined),
      'Give exactly one of url or submission_id.'
    )
);
export type DetonateUrlInput = z.infer<typeof DetonateUrlInputSchema>;

export const DetonateFileInputSchema = lazySchema(() =>
  z
    .object({
      content_base64: base64Content(
        'File content, base64 encoded, at most 1 MiB once decoded; give file_name with it'
      ).optional(),
      file_name: z
        .string()
        .min(1)
        .max(255)
        .optional()
        .describe('File name of the uploaded content, used for file type detection'),
      sha256: z
        .string()
        .max(64)
        .regex(SHA256_PATTERN, 'A sha256 is 64 hexadecimal characters.')
        .optional()
        .describe('SHA256 of a sample already uploaded to Falcon'),
      ...sandboxFields(),
    })
    .refine(
      (v) =>
        [v.content_base64, v.sha256, v.submission_id].filter((x) => x !== undefined).length === 1,
      'Give exactly one of content_base64, sha256 or submission_id.'
    )
    .refine(
      (v) => v.content_base64 === undefined || v.file_name !== undefined,
      'file_name is required with content_base64.'
    )
);
export type DetonateFileInput = z.infer<typeof DetonateFileInputSchema>;

export const SpotlightSearchVulnerabilityInputSchema = lazySchema(() =>
  z.object({
    filter: z
      .string()
      .min(1)
      .max(2000)
      .describe("FQL filter, required, for example aid:'<device id>'+status:'open'"),
    limit: limitField(5000, 'Page size (1-5000, default 100)'),
    after: z
      .string()
      .min(1)
      .max(500)
      .optional()
      .describe('Cursor from the previous page (next_after)'),
    facet: z
      .array(z.enum(['host_info', 'remediation', 'cve', 'evaluation_logic']).describe('Facet'))
      .min(1)
      .max(4)
      .optional()
      .describe('Extra detail blocks: host_info, remediation, cve, evaluation_logic'),
    sort: sortField('created_timestamp.desc'),
  })
);
export type SpotlightSearchVulnerabilityInput = z.infer<
  typeof SpotlightSearchVulnerabilityInputSchema
>;

// ---------------------------------------------------------------------------
// Host group membership
// ---------------------------------------------------------------------------

const groupId = (description: string) =>
  z
    .string()
    .min(1)
    .max(64)
    .regex(GROUP_ID_PATTERN, 'A group id has letters and digits only.')
    .describe(description);

const hostGroupMemberFields = () => ({
  group_id: groupId('Host group id (from listHostGroups)'),
  host_ids: deviceIds(100, 'Falcon device ids, 32 hex characters each, at most 100'),
});

export const HostGroupMembersInputSchema = lazySchema(() => z.object(hostGroupMemberFields()));
export type HostGroupMembersInput = z.infer<typeof HostGroupMembersInputSchema>;

export const AddHostGroupMembersInputSchema = lazySchema(() =>
  z.object({
    ...hostGroupMemberFields(),
    disable_hostname_check: z
      .boolean()
      .optional()
      .describe("Skip Falcon's hostname check (default false)"),
  })
);
export type AddHostGroupMembersInput = z.infer<typeof AddHostGroupMembersInputSchema>;

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

const caseId = (description = 'Case id') => z.string().min(1).max(100).describe(description);

const caseTags = (description: string) =>
  z.array(z.string().min(1).max(100).describe('Tag')).min(1).max(20).describe(description);

export const SearchCasesInputSchema = lazySchema(() =>
  z.object({
    filter: z.string().max(2000).optional().describe("FQL filter, for example status:'new'"),
    q: z.string().max(500).optional().describe('Free-text search over case metadata'),
    sort: z
      .string()
      .max(100)
      .optional()
      .describe('Sort as <field>|asc or <field>|desc, for example created_timestamp|desc'),
    offset: offsetField('Position of the first result (default 0); pass next_offset to continue'),
    limit: limitField(500, 'Page size (1-500, default 100)'),
  })
);
export type SearchCasesInput = z.infer<typeof SearchCasesInputSchema>;

export const GetCaseDetailsInputSchema = lazySchema(() =>
  z.object({
    case_ids: z.array(caseId()).min(1).max(100).describe('Case ids from searchCases, at most 100'),
  })
);
export type GetCaseDetailsInput = z.infer<typeof GetCaseDetailsInputSchema>;

export const UpdateCaseInputSchema = lazySchema(() =>
  z
    .object({
      case_id: caseId(),
      status: z
        .string()
        .min(1)
        .max(50)
        .optional()
        .describe('New status, sent as given (for example new, in_progress or closed)'),
      assigned_to_user_uuid: z
        .string()
        .max(36)
        .regex(UUID_PATTERN, 'Give the Falcon user UUID, not a name.')
        .optional()
        .describe('Falcon user UUID to assign'),
      remove_user_assignment: z.boolean().optional().describe('true removes the current assignee'),
      name: z.string().min(1).max(255).optional().describe('New case name'),
      description: z.string().max(4000).optional().describe('New case description'),
      severity: z
        .string()
        .min(1)
        .max(20)
        .optional()
        .describe('New severity, sent as given; a numeric value is sent as a number'),
      expected_version: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Case version the change is based on; refused if the case changed since'),
    })
    .refine(
      (v) =>
        v.status !== undefined ||
        v.assigned_to_user_uuid !== undefined ||
        v.remove_user_assignment === true ||
        v.name !== undefined ||
        v.description !== undefined ||
        v.severity !== undefined,
      'Give at least one change: status, assigned_to_user_uuid, remove_user_assignment, name, description or severity.'
    )
    .refine(
      (v) => !(v.assigned_to_user_uuid !== undefined && v.remove_user_assignment === true),
      'assigned_to_user_uuid and remove_user_assignment cannot be used together.'
    )
);
export type UpdateCaseInput = z.infer<typeof UpdateCaseInputSchema>;

export const CaseTagsInputSchema = lazySchema(() =>
  z.object({
    case_id: caseId(),
    tags: caseTags('Tags, at most 20 of up to 100 characters'),
  })
);
export type CaseTagsInput = z.infer<typeof CaseTagsInputSchema>;

// ---------------------------------------------------------------------------
// Custom IOA rules and IOA exclusions
// ---------------------------------------------------------------------------

const ruleGroupId = () => groupId('Custom IOA rule group id');

const FieldValueSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .min(1)
      .max(255)
      .describe('Field name of the rule type, for example ImageFilename'),
    label: z.string().max(255).optional().describe('Field label'),
    type: z.string().max(50).optional().describe('Field type, for example excludable'),
    value: z.string().max(4000).optional().describe('Field value'),
    final_value: z.string().max(4000).optional().describe('Final value as Falcon computes it'),
    values: z
      .array(
        z.object({
          label: z.string().max(255).describe('Value label, for example include'),
          value: z.string().max(4000).describe('Value, for example a regular expression'),
        })
      )
      .max(100)
      .optional()
      .describe('Values of the field as {label, value} pairs'),
  })
);

const fieldValues = () =>
  z
    .array(FieldValueSchema)
    .min(1)
    .max(50)
    .describe('Pattern fields of the rule type: name, label, type, value and values');

const ioaComment = () => z.string().max(500).optional().describe('Audit comment');
const patternSeverity = () =>
  z.string().min(1).max(30).describe('Severity of a match, sent as given, for example critical');

export const ListIOARulesInputSchema = lazySchema(() =>
  z.object({
    filter: z
      .string()
      .max(2000)
      .optional()
      .describe("FQL filter, for example enabled:true+platform:'windows'"),
    q: z.string().max(500).optional().describe('Free-text match across the filter fields'),
    sort: z
      .enum(['created_by', 'created_on', 'enabled', 'modified_by', 'modified_on', 'name'])
      .optional()
      .describe('Sort field'),
    offset: offsetField('Position of the first group (default 0); pass next_offset to continue'),
    limit: limitField(500, 'Groups per page (1-500, default 50)'),
  })
);
export type ListIOARulesInput = z.infer<typeof ListIOARulesInputSchema>;

export const CreateIOARuleInputSchema = lazySchema(() =>
  z.object({
    rule_group_id: ruleGroupId(),
    ruletype_id: z
      .string()
      .min(1)
      .max(64)
      .describe('Rule type id (from the Falcon console rule type)'),
    name: z.string().min(1).max(255).describe('Rule name'),
    description: z.string().max(2000).optional().describe('Rule description'),
    pattern_severity: patternSeverity(),
    disposition_id: z
      .number()
      .int()
      .min(0)
      .describe('Action Falcon takes on a match (disposition id of the rule type)'),
    field_values: fieldValues(),
    comment: ioaComment(),
  })
);
export type CreateIOARuleInput = z.infer<typeof CreateIOARuleInputSchema>;

export const UpdateIOARuleInputSchema = lazySchema(() =>
  z
    .object({
      rule_group_id: ruleGroupId(),
      instance_id: z
        .string()
        .min(1)
        .max(64)
        .describe('Rule instance id (from createIOARule or listIOARules)'),
      rulegroup_version: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Rule group version the change is based on; read from the group when omitted'),
      enabled: z.boolean().optional().describe('true enables and false disables the rule'),
      name: z.string().min(1).max(255).optional().describe('New rule name'),
      description: z.string().max(2000).optional().describe('New rule description'),
      pattern_severity: patternSeverity().optional(),
      disposition_id: z.number().int().min(0).optional().describe('New action (disposition id)'),
      field_values: fieldValues().optional(),
      comment: ioaComment(),
    })
    .refine(
      (v) =>
        v.enabled !== undefined ||
        v.name !== undefined ||
        v.description !== undefined ||
        v.pattern_severity !== undefined ||
        v.disposition_id !== undefined ||
        v.field_values !== undefined,
      'Give at least one change: enabled, name, description, pattern_severity, disposition_id or field_values.'
    )
);
export type UpdateIOARuleInput = z.infer<typeof UpdateIOARuleInputSchema>;

export const DeleteIOARuleInputSchema = lazySchema(() =>
  z.object({
    rule_group_id: ruleGroupId(),
    rule_ids: z
      .array(z.string().min(1).max(64).describe('Rule id'))
      .min(1)
      .max(100)
      .describe('instance_id values of the rules to delete, at most 100'),
    comment: z.string().max(500).optional().describe('Why the rules are deleted, kept for audit'),
  })
);
export type DeleteIOARuleInput = z.infer<typeof DeleteIOARuleInputSchema>;

export const SearchIOAExclusionsInputSchema = lazySchema(() =>
  z.object({
    filter: z.string().max(2000).optional().describe("FQL filter, for example name:'*backup*'"),
    sort: z
      .enum([
        'name.asc',
        'name.desc',
        'pattern_id.asc',
        'pattern_id.desc',
        'pattern_name.asc',
        'pattern_name.desc',
        'created_by.asc',
        'created_by.desc',
        'last_modified.asc',
        'last_modified.desc',
        'modified_by.asc',
        'modified_by.desc',
      ])
      .optional()
      .describe('Sort order'),
    offset: offsetField('Position of the first result (default 0); pass next_offset to continue'),
    limit: limitField(500, 'Page size (1-500, default 100)'),
    hydrate: z
      .boolean()
      .optional()
      .describe('Also read the exclusion details (default true); false returns ids only'),
  })
);
export type SearchIOAExclusionsInput = z.infer<typeof SearchIOAExclusionsInputSchema>;

// ---------------------------------------------------------------------------
// On-demand scans
// ---------------------------------------------------------------------------

const scanLevel = (description: string) => z.number().int().min(0).optional().describe(description);
const pathList = (description: string) =>
  z.array(z.string().min(1).max(1000)).min(1).max(50).optional().describe(description);

export const CreateScanInputSchema = lazySchema(() =>
  z
    .object({
      hosts: deviceIds(100, 'Device ids to scan, at most 100').optional(),
      host_groups: z
        .array(groupId('Host group id'))
        .min(1)
        .max(20)
        .optional()
        .describe('Host group ids to scan, at most 20'),
      file_paths: z
        .array(
          z
            .string()
            .min(1)
            .max(1000)
            .regex(
              SCAN_PATH_PATTERN,
              'file_paths are folders or files without wildcards (*): Falcon rejects them as invalid path characters.'
            )
        )
        .min(1)
        .max(50)
        .optional()
        .describe('Folders or files to scan, at most 50, without wildcards (*)'),
      scan_exclusions: pathList('Path patterns to skip, at most 50'),
      quarantine: z
        .boolean()
        .optional()
        .describe('Quarantine malicious files found (default false)'),
      cpu_priority: z
        .number()
        .int()
        .min(SCAN_CPU_PRIORITY_MIN)
        .max(SCAN_CPU_PRIORITY_MAX)
        .optional()
        .describe('CPU priority of the scan on the host, 1 (lowest, the default) to 5 (highest)'),
      max_duration: scanLevel('Maximum scan duration'),
      pause_duration: scanLevel('Pause duration, at most max_duration'),
      max_file_size: scanLevel('Largest file to scan'),
      sensor_ml_level_detection: scanLevel('Sensor machine-learning detection level'),
      sensor_ml_level_prevention: scanLevel('Sensor machine-learning prevention level'),
      cloud_ml_level_detection: scanLevel('Cloud machine-learning detection level'),
      cloud_ml_level_prevention: scanLevel('Cloud machine-learning prevention level'),
      description: z.string().max(1000).optional().describe('Scan description'),
      endpoint_notification: z.boolean().optional().describe('Notify the end user on the host'),
    })
    .refine(
      (v) => (v.hosts?.length ?? 0) > 0 || (v.host_groups?.length ?? 0) > 0,
      'Give hosts or host_groups: a scan never targets the whole fleet implicitly.'
    )
    .refine(
      (v) =>
        v.pause_duration === undefined ||
        v.max_duration === undefined ||
        v.pause_duration <= v.max_duration,
      {
        message: 'pause_duration must be less than or equal to max_duration.',
        path: ['pause_duration'],
      }
    )
);
export type CreateScanInput = z.infer<typeof CreateScanInputSchema>;

export const GetScanResultsInputSchema = lazySchema(() =>
  z.object({
    scan_id: z
      .string()
      .min(1)
      .max(64)
      .regex(SCAN_ID_PATTERN, 'A scan id has letters, digits, - and _ only.')
      .describe('Scan id from createScan'),
    include_files: z
      .boolean()
      .optional()
      .describe('Also return the malicious files found (default true)'),
    offset: offsetField('Position of the first malicious file (default 0)'),
    limit: limitField(500, 'Malicious files per page (1-500, default 100)'),
  })
);
export type GetScanResultsInput = z.infer<typeof GetScanResultsInputSchema>;

// ---------------------------------------------------------------------------
// Next-Gen SIEM search
// ---------------------------------------------------------------------------

const NGSIEM_TIME_MESSAGE =
  'Use now, a relative time such as 15m, 24h or 7d (units s, m, h, d, w, y), or epoch milliseconds (13 digits).';

const ngSiemSearchId = () =>
  z
    .string()
    .min(1)
    .max(128)
    .regex(NGSIEM_SEARCH_ID_PATTERN, 'A search id has letters, digits, - and _ only.')
    .describe('Search ID returned by Start Next-Gen SIEM search (letters, digits, - and _)');

export const StartNgSiemSearchInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .max(10_000)
      .describe('CQL query; add #repo=<name> to search one repository'),
    start: z
      .string()
      .min(1)
      .max(20)
      .regex(NGSIEM_TIME_PATTERN, NGSIEM_TIME_MESSAGE)
      .refine((value) => value !== 'now', {
        message: 'start must be before now: use a relative time such as 24h or epoch milliseconds.',
      })
      .describe('Start: relative time such as 15m, 24h or 7d, or epoch milliseconds'),
    end: z
      .string()
      .min(1)
      .max(20)
      .regex(NGSIEM_TIME_PATTERN, NGSIEM_TIME_MESSAGE)
      .optional()
      .describe('End of the time range: now (default), a relative time or epoch milliseconds'),
  })
);
export type StartNgSiemSearchInput = z.infer<typeof StartNgSiemSearchInputSchema>;

export const GetNgSiemSearchResultsInputSchema = lazySchema(() =>
  z.object({
    id: ngSiemSearchId(),
    offset: offsetField('Position of the first event to return'),
    limit: limitField(
      1000,
      "Events per page (cap 1000); when empty the parameter is not sent and Falcon's default applies"
    ),
  })
);
export type GetNgSiemSearchResultsInput = z.infer<typeof GetNgSiemSearchResultsInputSchema>;

export const StopNgSiemSearchInputSchema = lazySchema(() =>
  z.object({
    id: ngSiemSearchId(),
  })
);
export type StopNgSiemSearchInput = z.infer<typeof StopNgSiemSearchInputSchema>;
