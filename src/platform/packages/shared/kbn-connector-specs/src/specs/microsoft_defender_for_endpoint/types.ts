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
 * Largest page the connector asks for. Microsoft allows 10,000 (8,000 for vulnerabilities), but
 * a record is about 1 KB (measured: devices 1.0 KB, machine actions 1.0 KB, vulnerabilities up to
 * 1.2 KB), and the actions framework rejects a response over its 1 MB default
 * (xpack.actions.maxResponseContentLength). 500 keeps a page near 0.6 MB at most.
 */
export const MAX_TOP = 500;
/** Page size the connector asks for when the caller sets none (the API default is 10,000). */
export const DEFAULT_TOP = 100;
/** `lookBackHours` limit on the stats APIs ("max 720 hours (30 days)"). */
export const MAX_LOOKBACK_HOURS = 720;
/** Indicators per call of the import and BatchDelete APIs (documented: 500). */
export const MAX_INDICATOR_BATCH = 500;
/** Connector bounds; the API documents no limit for these. */
export const MAX_FILTER_LENGTH = 2000;
export const MAX_COMMENT_LENGTH = 2000;

// ---------------------------------------------------------------------------
// Identifiers. Each one has its own format, so each has its own schema.
// ---------------------------------------------------------------------------

/** Defender for Endpoint device ID: 40 hexadecimal characters. */
export const MachineIdSchema = lazySchema(() =>
  z
    .string()
    .regex(/^[0-9a-fA-F]{40}$/, 'Must be a Defender for Endpoint device ID (40 hex characters).')
    .max(40)
    .describe(
      'Defender for Endpoint device ID: 40 hexadecimal characters, e.g. "1e5bc9d7e413ddd7902c2932e418702b84d0cc07". Get it from getAgentList, getFileDevices, getUserDevices, getDomainDevices, or the machineId field of an alert.'
    )
);

const HOSTNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** `getAgentDetails` also accepts the device's computer name. */
export const MachineIdOrNameSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(255)
    .regex(
      HOSTNAME_PATTERN,
      'Must be a device ID or a computer name (letters, digits, ".", "_", "-").'
    )
    .describe(
      'Device ID (40 hex characters) or computer DNS name, e.g. "1e5bc9d7e413ddd7902c2932e418702b84d0cc07" or "mymachine1.contoso.com".'
    )
);

/** Machine action ID: a GUID. */
export const MachineActionIdSchema = lazySchema(() =>
  z
    .string()
    .regex(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
      'Must be a machine action ID (GUID).'
    )
    .max(36)
    .describe(
      'Machine action ID (GUID) returned by isolateHost, releaseHost, getFile, runAntivirusScan, collectInvestigationPackage, or getActions, e.g. "5382f7ea-7557-4ab7-9782-d50480024a4e".'
    )
);

/** File hash accepted by the file APIs: SHA-1 or SHA-256. */
export const FileHashSchema = lazySchema(() =>
  z
    .string()
    .regex(/^([0-9a-fA-F]{40}|[0-9a-fA-F]{64})$/, 'Must be a SHA-1 (40 hex) or SHA-256 (64 hex).')
    .max(64)
    .describe(
      'File SHA-1 (40 hex characters) or SHA-256 (64 hex characters), e.g. "4388963aaa83afe2042a46a3c017ad50bdcdafb3".'
    )
);

export const Sha1Schema = lazySchema(() =>
  z
    .string()
    .regex(/^[0-9a-fA-F]{40}$/, 'Must be a SHA-1 hash (40 hex characters).')
    .max(40)
    .describe(
      'File SHA-1 hash (40 hex characters; this API does not accept SHA-256), e.g. "4388963aaa83afe2042a46a3c017ad50bdcdafb3".'
    )
);

export const IpAddressSchema = lazySchema(() =>
  z
    .union([z.ipv4().max(15), z.ipv6().max(45)])
    .describe('IPv4 or IPv6 address, e.g. "10.166.93.61". CIDR ranges are not accepted.')
);

/**
 * IPv4 only: the IP statistics and indicator APIs answer 400 "Invalid IP address" for every IPv6
 * address.
 */
export const Ipv4AddressSchema = lazySchema(() =>
  z
    .ipv4('Must be an IPv4 address; this API does not accept IPv6 or CIDR ranges.')
    .max(15)
    .describe('IPv4 address, e.g. "10.166.93.61". IPv6 and CIDR ranges are not accepted.')
);

export const DomainSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(253)
    .regex(
      /^(?=.{1,253}$)([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}\.?$/,
      'Must be a domain name such as "example.com".'
    )
    .describe('Domain name without scheme or path, e.g. "example.com".')
);

export const UserSchema = lazySchema(() =>
  z
    .string()
    .trim()
    .min(1)
    .max(256)
    // Windows account names can contain spaces ("John Doe"), and the API accepts them URL-encoded.
    .regex(
      /^[^\t\r\n/?#%]+$/,
      'Must be a user name, a UPN or DOMAIN\\user, without "/", "?", "#", "%" or line breaks.'
    )
    .describe(
      'User to look up: a bare user name ("user1" or "John Doe"), a UPN ("user1@contoso.com") or "CONTOSO\\user1". The API is keyed on the bare account name, so the connector strips the domain part before calling it.'
    )
);

export const IndicatorIdSchema = lazySchema(() =>
  z
    .union([
      z.string().regex(/^\d+$/, 'Must be a numeric indicator ID.').max(20),
      z.number().int().nonnegative(),
    ])
    .describe('Indicator ID returned by submitIndicator or listIndicators, e.g. "995" or 995.')
);

/** TVM software ID: "<vendor>-_-<product>", e.g. "microsoft-_-edge". */
export const SoftwareIdSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(256)
    .regex(/^[A-Za-z0-9._-]+$/, 'Must be a software ID such as "microsoft-_-edge".')
    .describe(
      'Defender Vulnerability Management software ID, "<vendor>-_-<product>", e.g. "microsoft-_-edge".'
    )
);

const LookBackHoursSchema = lazySchema(() =>
  z
    .number()
    .int()
    .min(1)
    .max(MAX_LOOKBACK_HOURS)
    .optional()
    .describe(
      `Time window in hours for the prevalence statistics (1–${MAX_LOOKBACK_HOURS}). Defaults to 720 (30 days).`
    )
);

const CommentSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(MAX_COMMENT_LENGTH)
    .describe(
      'Reason for the action, saved with the machine action and shown in the Microsoft Defender portal action center, e.g. "Isolated by Elastic: alert 1234".'
    )
);

// ---------------------------------------------------------------------------
// Shared list inputs (OData $filter, $top, $skip).
// ---------------------------------------------------------------------------

/** Values per multi-value filter field sent as an OData `in` list. Keeps the URL short. */
export const MAX_FILTER_VALUES = 50;

/**
 * Hostnames per getAgentList call. They need one `startswith` condition each, joined with "or",
 * and the API rejects a query over 100 nodes: 21 hostnames alone exceed it. 10 leaves
 * room for the other fields and a caller filter.
 */
export const MAX_HOSTNAME_VALUES = 10;

/** One value, or a list of values (an OData `in` list, or an "or" chain for hostnames). */
const oneOrMany = <T extends z.ZodType>(schema: T, max: number = MAX_FILTER_VALUES) =>
  z.union([schema, z.array(schema).min(1).max(max)]);

const listFields = () => ({
  filter: z
    .string()
    .max(MAX_FILTER_LENGTH)
    .optional()
    .describe(
      "OData v4 $filter expression on the properties this API supports. String values in single quotes, dates in ISO 8601, e.g. \"healthStatus eq 'Active' and riskScore eq 'High'\"."
    ),
  top: z
    .number()
    .int()
    .min(1)
    .max(MAX_TOP)
    .optional()
    .describe(
      `Number of records to return (1–${MAX_TOP}). Defaults to ${DEFAULT_TOP}. Keep it small when the result is read by an agent.`
    ),
  skip: z
    .number()
    .int()
    .min(0)
    .max(1_000_000)
    .optional()
    .describe(
      'Number of records to skip, for paging. Pass the nextSkip value of the previous page.'
    ),
});

export const ListInputSchema = lazySchema(() => z.object(listFields()));
export type ListInput = z.infer<typeof ListInputSchema>;

// ---------------------------------------------------------------------------
// Machines
// ---------------------------------------------------------------------------

export const GetAgentListInputSchema = lazySchema(() =>
  z
    .object({
      ...listFields(),
      deviceId: oneOrMany(MachineIdSchema)
        .optional()
        .describe('Only the devices with this device ID (40 hex characters), or any of a list.'),
      hostname: oneOrMany(
        z
          .string()
          .min(1)
          .max(255)
          .regex(HOSTNAME_PATTERN, 'Must be a host name (letters, digits, ".", "_", "-").'),
        MAX_HOSTNAME_VALUES
      )
        .optional()
        .describe(
          `Devices whose computer DNS name starts with this host name (OData startswith on computerDnsName), or with any of a list of up to ${MAX_HOSTNAME_VALUES}, e.g. "desktop-01" matches "desktop-01.contoso.com".`
        ),
      ipAddress: oneOrMany(IpAddressSchema)
        .optional()
        .describe(
          'Devices that used this IPv4 or IPv6 address, or any of a list. Without ipSeenAt, matches the last IP address each device reported (lastIpAddress). With ipSeenAt, a single address. CIDR ranges are not accepted.'
        ),
      ipSeenAt: z.iso
        .datetime()
        .max(40)
        .optional()
        .describe(
          'With ipAddress: UTC time the IP was seen, ISO 8601 with a Z suffix, within the past 30 days, e.g. "2026-11-10T14:30:00Z". Returns devices that reported the IP within 15 minutes either side, even if their IP has changed since. Cannot be combined with deviceId, hostname, filter, top, or skip.'
        ),
    })
    .superRefine((input, refineCtx) => {
      if (input.ipSeenAt === undefined) {
        return;
      }
      if (input.ipAddress === undefined || Array.isArray(input.ipAddress)) {
        refineCtx.addIssue({
          code: 'custom',
          message: 'ipSeenAt needs a single ipAddress.',
          path: ['ipSeenAt'],
        });
      }
      const combined = (['deviceId', 'hostname', 'filter', 'top', 'skip'] as const).filter(
        (key) => input[key] !== undefined
      );
      if (combined.length > 0) {
        refineCtx.addIssue({
          code: 'custom',
          message: `ipSeenAt cannot be combined with ${combined.join(', ')}.`,
          path: ['ipSeenAt'],
        });
      }
    })
);
export type GetAgentListInput = z.infer<typeof GetAgentListInputSchema>;

export const GetMachineInputSchema = lazySchema(() =>
  z.object({ machineId: MachineIdOrNameSchema })
);
export type GetMachineInput = z.infer<typeof GetMachineInputSchema>;

export const IsolateMachineInputSchema = lazySchema(() =>
  z.object({
    machineId: MachineIdSchema,
    comment: CommentSchema,
    isolationType: z
      .enum(['Full', 'Selective', 'UnManagedDevice'])
      .optional()
      .describe(
        'Isolation type. "Full" (default) blocks all network traffic except the Defender service; "Selective" also keeps Outlook, Teams, and Skype for Business working; "UnManagedDevice" contains an unmanaged device.'
      ),
  })
);
export type IsolateMachineInput = z.infer<typeof IsolateMachineInputSchema>;

export const MachineCommentInputSchema = lazySchema(() =>
  z.object({ machineId: MachineIdSchema, comment: CommentSchema })
);
export type MachineCommentInput = z.infer<typeof MachineCommentInputSchema>;

export const StopAndQuarantineFileInputSchema = lazySchema(() =>
  z.object({ machineId: MachineIdSchema, sha1: Sha1Schema, comment: CommentSchema })
);
export type StopAndQuarantineFileInput = z.infer<typeof StopAndQuarantineFileInputSchema>;

/** Longest device tag accepted. The API documents no limit; this bound keeps input bounded. */
export const MAX_TAG_LENGTH = 200;

export const MachineTagInputSchema = lazySchema(() =>
  z.object({
    machineId: MachineIdSchema,
    tag: z
      .string()
      .trim()
      .min(1)
      .max(MAX_TAG_LENGTH)
      .describe('Device tag, e.g. "handled-by-elastic".'),
    action: z
      .enum(['Add', 'Remove'])
      .describe('"Add" sets the tag on the device; "Remove" takes it off.'),
  })
);
export type MachineTagInput = z.infer<typeof MachineTagInputSchema>;

export const RunAntiVirusScanInputSchema = lazySchema(() =>
  z.object({
    machineId: MachineIdSchema,
    comment: CommentSchema,
    scanType: z
      .enum(['Quick', 'Full'])
      .describe(
        'Scan type: "Quick" scans common locations; "Full" scans the whole device and takes much longer.'
      ),
  })
);
export type RunAntiVirusScanInput = z.infer<typeof RunAntiVirusScanInputSchema>;

export const RunScriptInputSchema = lazySchema(() =>
  z.object({
    machineId: MachineIdSchema,
    // Microsoft documents Comment as optional for live response, but the API answers
    // 400 MissingRequiredParameter "$Comment is missing." without it.
    comment: CommentSchema,
    scriptName: z
      .string()
      .min(1)
      .max(256)
      .regex(/^[^\\/:*?"<>|]+$/, 'Must be a library file name, without a path.')
      .describe(
        'Name of a script in the live response library, as getLibraryFiles lists it, e.g. "collect_logs.ps1".'
      ),
    args: z
      .string()
      .min(1)
      .max(2048)
      .optional()
      .describe('Arguments passed to the script, e.g. "-Days 7".'),
  })
);
export type RunScriptInput = z.infer<typeof RunScriptInputSchema>;

export const GetFileInputSchema = lazySchema(() =>
  z.object({
    machineId: MachineIdSchema,
    // Microsoft documents Comment as optional for live response, but the API answers
    // 400 MissingRequiredParameter "$Comment is missing." without it.
    comment: CommentSchema,
    path: z
      .string()
      .min(1)
      .max(2048)
      .describe(
        'Full path of the file on the device, with backslashes as in the device path, e.g. "C:\\Windows\\Temp\\sample.exe".'
      ),
  })
);
export type GetFileInput = z.infer<typeof GetFileInputSchema>;

// ---------------------------------------------------------------------------
// Machine actions
// ---------------------------------------------------------------------------

export const MACHINE_ACTION_STATUSES = [
  'Pending',
  'InProgress',
  'Succeeded',
  'Failed',
  'TimeOut',
  'Cancelled',
] as const;

export const MACHINE_ACTION_TYPES = [
  'RunAntiVirusScan',
  'Offboard',
  'LiveResponse',
  'CollectInvestigationPackage',
  'Isolate',
  'Unisolate',
  'StopAndQuarantineFile',
  'RestrictCodeExecution',
  'UnrestrictCodeExecution',
] as const;

export const GetActionsInputSchema = lazySchema(() =>
  z.object({
    ...listFields(),
    actionId: oneOrMany(MachineActionIdSchema)
      .optional()
      .describe(
        'Only the machine action with this ID (to poll one action until it finishes), or any of a list.'
      ),
    machineId: oneOrMany(MachineIdSchema)
      .optional()
      .describe('Only the machine actions of this device, or of any of a list.'),
    status: oneOrMany(z.enum(MACHINE_ACTION_STATUSES))
      .optional()
      .describe(
        'Only machine actions in this status, or in any of a list: Pending, InProgress, Succeeded, Failed, TimeOut, Cancelled.'
      ),
    type: oneOrMany(z.enum(MACHINE_ACTION_TYPES))
      .optional()
      .describe(
        'Only machine actions of this type, or of any of a list: RunAntiVirusScan, Offboard, LiveResponse, CollectInvestigationPackage, Isolate, Unisolate, StopAndQuarantineFile, RestrictCodeExecution, UnrestrictCodeExecution.'
      ),
  })
);
export type GetActionsInput = z.infer<typeof GetActionsInputSchema>;

export const MachineActionInputSchema = lazySchema(() =>
  z.object({ actionId: MachineActionIdSchema })
);
export type MachineActionInput = z.infer<typeof MachineActionInputSchema>;

export const CancelMachineActionInputSchema = lazySchema(() =>
  z.object({
    actionId: MachineActionIdSchema,
    // Microsoft documents Comment as optional for cancel, but the API answers
    // 400 MissingRequiredParameter "$Comment is missing." without it.
    comment: z
      .string()
      .min(1)
      .max(MAX_COMMENT_LENGTH)
      .describe('Reason for the cancellation, e.g. "Cancelled by Elastic: false positive".'),
  })
);
export type CancelMachineActionInput = z.infer<typeof CancelMachineActionInputSchema>;

export const EmptyInputSchema = lazySchema(() => z.object({}));

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export const FileInputSchema = lazySchema(() => z.object({ hash: FileHashSchema }));
export type FileInput = z.infer<typeof FileInputSchema>;

export const FileStatsInputSchema = lazySchema(() =>
  z.object({ hash: FileHashSchema, lookBackHours: LookBackHoursSchema })
);
export type FileStatsInput = z.infer<typeof FileStatsInputSchema>;

export const FileMachinesInputSchema = lazySchema(() => z.object({ sha1: Sha1Schema }));
export type FileMachinesInput = z.infer<typeof FileMachinesInputSchema>;

export const IpStatsInputSchema = lazySchema(() =>
  z.object({ ip: Ipv4AddressSchema, lookBackHours: LookBackHoursSchema })
);
export type IpStatsInput = z.infer<typeof IpStatsInputSchema>;

export const DomainInputSchema = lazySchema(() => z.object({ domain: DomainSchema }));
export type DomainInput = z.infer<typeof DomainInputSchema>;

export const DomainStatsInputSchema = lazySchema(() =>
  z.object({ domain: DomainSchema, lookBackHours: LookBackHoursSchema })
);
export type DomainStatsInput = z.infer<typeof DomainStatsInputSchema>;

export const UserInputSchema = lazySchema(() => z.object({ user: UserSchema }));
export type UserInput = z.infer<typeof UserInputSchema>;

// ---------------------------------------------------------------------------
// Vulnerabilities
// ---------------------------------------------------------------------------

export const ListVulnerabilitiesInputSchema = lazySchema(() =>
  z
    .object({
      ...listFields(),
      softwareId: SoftwareIdSchema.optional().describe(
        'Only the vulnerabilities of this software, e.g. "microsoft-_-edge". Paged with top and skip; cannot be combined with filter.'
      ),
    })
    .superRefine((input, refineCtx) => {
      if (input.softwareId === undefined) {
        return;
      }
      if (input.filter !== undefined) {
        refineCtx.addIssue({
          code: 'custom',
          message: 'softwareId cannot be combined with filter.',
          path: ['softwareId'],
        });
      }
    })
);
export type ListVulnerabilitiesInput = z.infer<typeof ListVulnerabilitiesInputSchema>;

// ---------------------------------------------------------------------------
// Indicators
// ---------------------------------------------------------------------------

const INDICATOR_VALUE_PATTERNS: Record<string, RegExp> = {
  FileSha1: /^[0-9a-fA-F]{40}$/,
  FileSha256: /^[0-9a-fA-F]{64}$/,
  FileMd5: /^[0-9a-fA-F]{32}$/,
  CertificateThumbprint: /^[0-9a-fA-F]{40}$/,
};

/**
 * What to send instead of a retired indicator action. The API still accepts both and converts them:
 * Alert to Audit with generateAlert true, AlertAndBlock to Block with generateAlert true
 * (BlockAndRemediate for file hashes).
 */
const RETIRED_INDICATOR_ACTIONS: Readonly<Record<string, string>> = {
  Alert:
    '"Alert" is a retired action: use action "Audit" with generateAlert true, which is what Microsoft converts it to.',
  AlertAndBlock:
    '"AlertAndBlock" is a retired action: use action "Block" with generateAlert true (Microsoft converts it to that, or to "BlockAndRemediate" with generateAlert true for file hashes).',
};

const indicatorFields = () => ({
  indicatorValue: z
    .string()
    .min(1)
    .max(2048)
    .describe(
      'Indicator value matching indicatorType: a hash, a certificate thumbprint, a public IPv4 address (no private ranges such as 10.x, no IPv6, no CIDR), a domain, or a URL, e.g. "192.0.2.10".'
    ),
  indicatorType: z
    .enum([
      'FileSha1',
      'FileSha256',
      'FileMd5',
      'CertificateThumbprint',
      'IpAddress',
      'DomainName',
      'Url',
    ])
    .describe('Indicator type.'),
  action: z
    // The action types Microsoft documents as supported. Alert and AlertAndBlock are left out:
    // they are legacy response actions, supported only until January 2022.
    .enum(['Audit', 'Warn', 'Block', 'BlockAndRemediate', 'Allowed'], {
      error: (issue) =>
        typeof issue.input === 'string' ? RETIRED_INDICATOR_ACTIONS[issue.input] : undefined,
    })
    .describe(
      'What Defender does when the indicator is seen, on every device in the tenant (or in rbacGroupNames). "Audit" (requires generateAlert true) only records and alerts; "Warn" applies to Defender for Cloud Apps only; "Block" and "BlockAndRemediate" stop the file, IP, domain or URL; "Allowed" exempts it. Microsoft stores "Block" on a CertificateThumbprint as "BlockAndRemediate". The retired "Alert" and "AlertAndBlock" are not accepted: use "Audit" or "Block" with generateAlert true.'
    ),
  title: z.string().min(1).max(500).describe('Indicator title, shown on alerts it raises.'),
  description: z
    .string()
    .min(1)
    .max(2000)
    .describe('Description of the indicator and why it was added.'),
  severity: z
    .enum(['Informational', 'Low', 'Medium', 'High'])
    .optional()
    .describe('Severity of alerts the indicator raises.'),
  expirationTime: z.iso
    .datetime()
    .max(40)
    .optional()
    .describe(
      'UTC expiry, ISO 8601 with a Z suffix, e.g. "2026-12-31T00:00:00Z". Without it the indicator never expires.'
    ),
  generateAlert: z
    .boolean()
    .optional()
    .describe('Whether a match raises an alert. Must be true when action is "Audit".'),
  application: z
    .string()
    .max(256)
    .optional()
    .describe('Application associated with the indicator, e.g. "Elastic Security".'),
  recommendedActions: z
    .string()
    .max(2000)
    .optional()
    .describe('Recommended actions shown on alerts the indicator raises.'),
  rbacGroupNames: z
    .array(z.string().min(1).max(256).describe('Device group name.'))
    .max(100)
    .optional()
    .describe('Device group names the indicator applies to. Omit to apply it to all devices.'),
  educateUrl: z
    .url()
    .max(2048)
    .optional()
    .describe(
      'Custom notification or support URL shown to users. Only for a Url indicator with action "Block" or "Warn".'
    ),
});

type IndicatorFields = z.infer<z.ZodObject<ReturnType<typeof indicatorFields>>>;

const refineIndicator = (input: IndicatorFields, refineCtx: z.RefinementCtx) => {
  const pattern = INDICATOR_VALUE_PATTERNS[input.indicatorType];
  if (pattern && !pattern.test(input.indicatorValue)) {
    refineCtx.addIssue({
      code: 'custom',
      message: `indicatorValue is not a valid ${input.indicatorType}.`,
      path: ['indicatorValue'],
    });
  }
  // IPv4 only: the indicator API rejects every IPv6 address with 400 InvalidIpAddress.
  if (input.indicatorType === 'IpAddress' && !z.ipv4().safeParse(input.indicatorValue).success) {
    refineCtx.addIssue({
      code: 'custom',
      message:
        'indicatorValue must be a single IPv4 address; IPv6 and CIDR ranges are not supported.',
      path: ['indicatorValue'],
    });
  }
  if (input.action === 'Audit' && input.generateAlert !== true) {
    refineCtx.addIssue({
      code: 'custom',
      message: 'The Audit action requires generateAlert: true.',
      path: ['generateAlert'],
    });
  }
  if (
    input.educateUrl !== undefined &&
    (input.indicatorType !== 'Url' || (input.action !== 'Block' && input.action !== 'Warn'))
  ) {
    refineCtx.addIssue({
      code: 'custom',
      message: 'educateUrl is only allowed on a Url indicator with action Block or Warn.',
      path: ['educateUrl'],
    });
  }
};

export const SubmitIndicatorInputSchema = lazySchema(() =>
  z.object(indicatorFields()).superRefine(refineIndicator)
);
export type SubmitIndicatorInput = z.infer<typeof SubmitIndicatorInputSchema>;

export const BatchSubmitIndicatorsInputSchema = lazySchema(() =>
  z.object({
    indicators: z
      .array(z.object(indicatorFields()).superRefine(refineIndicator))
      .min(1)
      .max(MAX_INDICATOR_BATCH)
      .describe(
        `Indicators to create or update, 1 to ${MAX_INDICATOR_BATCH}, each with the same fields as submitIndicator.`
      ),
  })
);
export type BatchSubmitIndicatorsInput = z.infer<typeof BatchSubmitIndicatorsInputSchema>;

export const DeleteIndicatorInputSchema = lazySchema(() =>
  z.object({ indicatorId: IndicatorIdSchema })
);
export type DeleteIndicatorInput = z.infer<typeof DeleteIndicatorInputSchema>;

export const BatchDeleteIndicatorsInputSchema = lazySchema(() =>
  z.object({
    indicatorIds: z
      .array(IndicatorIdSchema)
      .min(1)
      .max(MAX_INDICATOR_BATCH)
      .describe(
        `Indicator IDs to delete, 1 to ${MAX_INDICATOR_BATCH}, from submitIndicator, batchSubmitIndicators, or listIndicators.`
      ),
  })
);
export type BatchDeleteIndicatorsInput = z.infer<typeof BatchDeleteIndicatorsInputSchema>;
