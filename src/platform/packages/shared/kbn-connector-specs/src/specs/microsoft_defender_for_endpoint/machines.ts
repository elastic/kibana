/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  isActionConflict,
  isResourceNotFound,
  MdeApiError,
  mdeList,
  mdeRequest,
  odataString,
  parseConflictingActionRef,
  valueOf,
  withoutODataContext,
} from './client';
import type { ConflictingMachineAction } from './client';
import {
  CancelMachineActionInputSchema,
  EmptyInputSchema,
  GetActionsInputSchema,
  GetAgentListInputSchema,
  GetFileInputSchema,
  GetMachineInputSchema,
  IsolateMachineInputSchema,
  ListInputSchema,
  MachineActionInputSchema,
  MachineCommentInputSchema,
  MachineTagInputSchema,
  RunAntiVirusScanInputSchema,
  RunScriptInputSchema,
  StopAndQuarantineFileInputSchema,
} from './types';
import type {
  CancelMachineActionInput,
  GetActionsInput,
  GetAgentListInput,
  GetFileInput,
  GetMachineInput,
  IsolateMachineInput,
  ListInput,
  MachineActionInput,
  MachineCommentInput,
  MachineTagInput,
  RunAntiVirusScanInput,
  RunScriptInput,
  StopAndQuarantineFileInput,
} from './types';

/** findbyip only matches devices seen within the past 30 days. */
const FIND_BY_IP_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const machinePath = (machineId: string) => `/machines/${encodeURIComponent(machineId)}`;
const actionPath = (actionId: string) => `/machineactions/${encodeURIComponent(actionId)}`;

const toList = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/**
 * One OData condition per value, joined with "or" (parenthesised when there are several). Each
 * condition costs several of the API's 100 query nodes, so use it only where `in` cannot apply.
 */
const anyOf = <T>(value: T | T[] | undefined, condition: (item: T) => string) => {
  const conditions = toList(value).map(condition);
  if (conditions.length === 0) {
    return undefined;
  }
  return conditions.length === 1 ? conditions[0] : `(${conditions.join(' or ')})`;
};

/**
 * `field eq <literal>` for one value, `field in (<literals>)` for several. The API rejects a query
 * over 100 nodes ("The node count limit of '100' has been exceeded"), which an "or" chain of about
 * 25 equality conditions reaches; an `in` list of 50 values stays within it.
 */
const eqOrIn = <T>(field: string, value: T | T[] | undefined, literal: (item: T) => string) => {
  const literals = toList(value).map(literal);
  if (literals.length === 0) {
    return undefined;
  }
  return literals.length === 1
    ? `${field} eq ${literals[0]}`
    : `${field} in (${literals.join(',')})`;
};

/** Joins OData conditions with "and"; a caller's own filter is parenthesised. */
const joinFilters = (conditions: Array<string | undefined>, filter?: string) => {
  const parts = conditions.filter((part): part is string => Boolean(part));
  if (filter) {
    parts.push(parts.length > 0 ? `(${filter})` : filter);
  }
  return parts.length > 0 ? parts.join(' and ') : undefined;
};

/** Machine action types that block a new action of each operation (the API's `type` values). */
const CONFLICTING_TYPES: Record<string, readonly string[]> = {
  isolate: ['Isolate', 'Unisolate'],
  unisolate: ['Isolate', 'Unisolate'],
  runAntiVirusScan: ['RunAntiVirusScan'],
  collectInvestigationPackage: ['CollectInvestigationPackage'],
  runliveresponse: ['LiveResponse'],
  restrictCodeExecution: ['RestrictCodeExecution', 'UnrestrictCodeExecution'],
  unrestrictCodeExecution: ['RestrictCodeExecution', 'UnrestrictCodeExecution'],
  StopAndQuarantineFile: ['StopAndQuarantineFile'],
};

const CONFLICT_LOOKUP_TOP = 20;

const describeConflict = (action: ConflictingMachineAction) =>
  `Conflicting machine action: id=${action.id}, type=${action.type}, status=${
    action.status ?? 'unknown'
  }, requestor=${action.requestor ?? 'unknown'}, creationDateTimeUtc=${
    action.creationDateTimeUtc ?? 'unknown'
  }.`;

const errorReason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Finds the pending machine action that blocked `operation` on the device, with no retry loop:
 * when the API's message names it ("... Isolate action: <id> is still active."), one GET of that
 * action; otherwise, or when that call fails (a just-created action can answer 404 for a few
 * seconds), one list call filtered on the device and the Pending/InProgress status. Returns a
 * conflict error that names the action, or says it could not be found.
 */
const toConflictError = async (
  ctx: ActionContext,
  machineId: string,
  operation: string,
  error: MdeApiError
): Promise<MdeApiError> => {
  const blockingTypes = CONFLICTING_TYPES[operation] ?? [];
  const named = parseConflictingActionRef(error.message);
  let conflicting: ConflictingMachineAction | undefined;
  let otherPendingCount = 0;
  const lookupFailures: string[] = [];

  if (named) {
    try {
      conflicting = withoutODataContext(
        await mdeRequest<ConflictingMachineAction>(ctx, {
          method: 'GET',
          path: actionPath(named.id),
          permission: 'Machine.ReadWrite.All',
        })
      );
    } catch (getError) {
      lookupFailures.push(`machine action ${named.id}: ${errorReason(getError)}`);
    }
  }

  if (!conflicting) {
    try {
      const page = await mdeList<ConflictingMachineAction>(
        ctx,
        '/machineactions',
        {
          filter: `machineId eq ${odataString(
            machineId
          )} and (status eq 'Pending' or status eq 'InProgress')`,
          top: CONFLICT_LOOKUP_TOP,
        },
        { permission: 'Machine.ReadWrite.All' }
      );
      // Only an action the API named, or one of a type that blocks this operation, is reported:
      // any other pending action (a scan blocking nothing here) would point at the wrong one.
      conflicting =
        (named && page.value.find((action) => action.id?.toLowerCase() === named.id)) ||
        page.value.find((action) => action.type && blockingTypes.includes(action.type));
      otherPendingCount = page.value.length;
    } catch (listError) {
      lookupFailures.push(`pending machine actions: ${errorReason(listError)}`);
    }
  }

  let lookupNote: string;
  if (conflicting) {
    lookupNote = describeConflict(conflicting);
  } else if (named) {
    // The API named the action but its details could not be read yet: report what it said.
    conflicting = { id: named.id, type: named.type };
    lookupNote = `${describeConflict(
      conflicting
    )} Its details could not be read yet; poll getActions with this actionId.`;
  } else if (lookupFailures.length > 0) {
    lookupNote = `The conflicting machine action could not be looked up (${lookupFailures.join(
      '; '
    )}); find it with getActions filtered on machineId and status.`;
  } else if (otherPendingCount > 0) {
    lookupNote = `No Pending or InProgress machine action of a type that blocks ${operation} (${blockingTypes.join(
      ', '
    )}) was found on the device, only ${otherPendingCount} of other types; the blocking one may have just finished, so retry, or list them with getActions filtered on machineId and status.`;
  } else {
    lookupNote =
      'No Pending or InProgress machine action was found on the device; it may have just finished, so retry.';
  }
  return new MdeApiError(`${error.message} ${lookupNote}`, error.status, error.code, conflicting);
};

/**
 * Starts a machine action. Never retried on 5xx: a retry could start the action twice. When the
 * device already has a pending action that blocks it, the error names that action.
 */
const startMachineAction = async (
  ctx: ActionContext,
  machineId: string,
  operation: string,
  data: Record<string, unknown>,
  permission: string
): Promise<Record<string, unknown>> => {
  try {
    const action = await mdeRequest<Record<string, unknown>>(ctx, {
      method: 'POST',
      path: `${machinePath(machineId)}/${operation}`,
      data,
      permission,
      idempotent: false,
    });
    return withoutODataContext(action);
  } catch (error) {
    if (isActionConflict(error)) {
      throw await toConflictError(ctx, machineId, operation, error as MdeApiError);
    }
    throw error;
  }
};

/** Runs one live response command on a device. */
const runLiveResponseCommand = (
  ctx: ActionContext,
  machineId: string,
  comment: string,
  type: 'RunScript' | 'GetFile',
  params: Array<{ key: string; value: string }>
) =>
  startMachineAction(
    ctx,
    machineId,
    'runliveresponse',
    { Commands: [{ type, params }], Comment: comment },
    'Machine.LiveResponse'
  );

const SCAN_PENDING_NOTE =
  'If a scan is already pending on the device, Microsoft returns that pending scan (same id) instead of starting another one or failing.';

const MACHINE_ACTION_RETURNS =
  'Returns the machine action with status Pending; poll getActions with its id as actionId until it finishes.';

const LIVE_RESPONSE_NOTE =
  'Live response must be enabled in the Defender portal (Settings > Endpoints > Advanced features), and unsigned scripts need "Live response unsigned script execution". Only one live response session per device at a time; 10 calls per minute.';

export const machineActions: ConnectorSpec['actions'] = {
  getAgentList: {
    isTool: true,
    scope: 'read',
    description:
      'List onboarded devices, one page at a time. Narrow it with deviceId, hostname (prefix of the computer DNS name, up to 10), and ipAddress (the last IP each device reported), each one value or a list; with a single ipAddress, add ipSeenAt to find who used the IP at a given time in the past 30 days. You can also pass an OData filter on computerDnsName, id, version, deviceValue, aadDeviceId, machineTags, lastSeen, exposureLevel, onboardingStatus, lastIpAddress, healthStatus, osPlatform, riskScore, or rbacGroupId. Returns value (device entities), count, hasMore, and nextSkip: hasMore is true when the page is full (count equals top), then pass nextSkip as skip for the next page, which can be empty. A filter that matches nothing returns an empty value, not an error.',
    input: GetAgentListInputSchema,
    handler: async (ctx, input: GetAgentListInput) => {
      if (input.ipSeenAt !== undefined && typeof input.ipAddress === 'string') {
        const age = Date.now() - Date.parse(input.ipSeenAt);
        if (age < 0 || age > FIND_BY_IP_WINDOW_MS) {
          throw new Error('ipSeenAt must be in the past 30 days (the API rejects other times).');
        }
        // ipAddress and ipSeenAt are schema-validated (an IP and an ISO 8601 UTC time), so they
        // carry no path-breaking characters; the OData function call syntax needs them unencoded.
        const found = valueOf(
          await mdeRequest(ctx, {
            method: 'GET',
            path: `/machines/findbyip(ip='${input.ipAddress}',timestamp=${input.ipSeenAt})`,
            permission: 'Machine.ReadWrite.All',
          })
        );
        return { ...found, hasMore: false };
      }

      const filter = joinFilters(
        [
          eqOrIn('id', input.deviceId, odataString),
          // startswith has no "in" form, so hostnames stay an "or" chain (capped by the schema).
          anyOf(input.hostname, (name) => `startswith(computerDnsName,${odataString(name)})`),
          eqOrIn('lastIpAddress', input.ipAddress, odataString),
        ],
        input.filter
      );
      try {
        return await mdeList(
          ctx,
          '/machines',
          { filter, top: input.top, skip: input.skip },
          { permission: 'Machine.Read.All' }
        );
      } catch (error) {
        // The API answers 404 ResourceNotFound when the tenant has no devices seen in the last 30
        // days. Any other 404 (for example a wrong API URL path) stays an error.
        if (isResourceNotFound(error)) {
          return { value: [], count: 0, hasMore: false };
        }
        throw error;
      }
    },
  },

  getAgentDetails: {
    isTool: true,
    scope: 'read',
    description:
      'Get one device by device ID or computer name: computerDnsName, osPlatform, healthStatus, riskScore, exposureLevel, lastIpAddress, lastExternalIpAddress, lastSeen, rbacGroupName, machineTags, and onboardingStatus. Use it to check a host before acting on it.',
    input: GetMachineInputSchema,
    handler: async (ctx, input: GetMachineInput) =>
      withoutODataContext(
        await mdeRequest(ctx, {
          method: 'GET',
          path: machinePath(input.machineId),
          permission: 'Machine.ReadWrite.All',
        })
      ),
  },

  getMachineUsers: {
    isTool: true,
    scope: 'read',
    description:
      'List the users who logged on to a device, by device ID or computer name: accountName, accountDomain, firstSeen, lastSeen, logonTypes, isDomainAdmin, and isOnlyNetworkUser. Use it to pivot from a compromised device to the identities involved. Returns value and count.',
    // The logonusers API accepts a computer name as well as a device ID.
    input: GetMachineInputSchema,
    handler: async (ctx, input: GetMachineInput) =>
      valueOf(
        await mdeRequest(ctx, {
          method: 'GET',
          path: `${machinePath(input.machineId)}/logonusers`,
          permission: 'User.Read.All',
        })
      ),
  },

  getDeviceAvHealth: {
    isTool: true,
    scope: 'read',
    description:
      'Get the Microsoft Defender Antivirus health of devices, one page at a time, with an optional OData filter on machineId, computerDnsName, osKind, osPlatform, osVersion, avMode, avSignatureVersion, avEngineVersion, avPlatformVersion, quickScanResult, quickScanError, fullScanResult, fullScanError, avIsSignatureUpToDate, avIsEngineUpToDate, avIsPlatformUpToDate, or rbacGroupId, e.g. "machineId eq \'1e5b...\'". Each record has avMode, signature, engine and platform versions and whether each is up to date, and the last quick and full scan results. Returns value, count, hasMore, and nextSkip. Limited to 30 calls per minute.',
    input: ListInputSchema,
    handler: async (ctx, input: ListInput) =>
      mdeList(ctx, '/deviceavinfo', input, { permission: 'Machine.Read.All' }),
  },

  isolateHost: {
    isTool: true,
    scope: 'destroy',
    description: `Isolate a device from the network to contain a threat; it keeps its connection to the Defender service. Use only on a confirmed or strongly suspected compromise. Undo with releaseHost. ${MACHINE_ACTION_RETURNS}`,
    input: IsolateMachineInputSchema,
    handler: async (ctx, input: IsolateMachineInput) =>
      startMachineAction(
        ctx,
        input.machineId,
        'isolate',
        { Comment: input.comment, IsolationType: input.isolationType ?? 'Full' },
        'Machine.Isolate'
      ),
  },

  releaseHost: {
    isTool: true,
    scope: 'destroy',
    description: `Release a device from network isolation, restoring its network access. Use after remediation is confirmed. ${MACHINE_ACTION_RETURNS}`,
    input: MachineCommentInputSchema,
    handler: async (ctx, input: MachineCommentInput) =>
      startMachineAction(
        ctx,
        input.machineId,
        'unisolate',
        { Comment: input.comment },
        'Machine.Isolate'
      ),
  },

  runScript: {
    // Not an agent tool: it runs a script on a live device.
    isTool: false,
    scope: 'destroy',
    description: `Run a script from the live response library (see getLibraryFiles) on a device, with optional arguments and a required comment. Effects on the device cannot be undone. When the action has Succeeded, get the script output with getActionResults. ${LIVE_RESPONSE_NOTE} ${MACHINE_ACTION_RETURNS}`,
    input: RunScriptInputSchema,
    handler: async (ctx, input: RunScriptInput) =>
      runLiveResponseCommand(ctx, input.machineId, input.comment, 'RunScript', [
        { key: 'ScriptName', value: input.scriptName },
        ...(input.args ? [{ key: 'Args', value: input.args }] : []),
      ]),
  },

  getFile: {
    isTool: true,
    scope: 'write',
    description: `Collect a file from a device for evidence, with live response GetFile. When the action has Succeeded, get a download link for the file with getActionResults. ${LIVE_RESPONSE_NOTE} ${MACHINE_ACTION_RETURNS}`,
    input: GetFileInputSchema,
    handler: async (ctx, input: GetFileInput) =>
      runLiveResponseCommand(ctx, input.machineId, input.comment, 'GetFile', [
        { key: 'Path', value: input.path },
      ]),
  },

  getLibraryFiles: {
    isTool: true,
    scope: 'read',
    description:
      'List the scripts and files in the live response library (fileName, description, creationTime, createdBy, hasParameters, parametersDescription). Agents can only list them: running a script needs a person in the Defender portal. Returns value and count.',
    input: EmptyInputSchema,
    handler: async (ctx) =>
      valueOf(
        await mdeRequest(ctx, {
          method: 'GET',
          path: '/libraryfiles',
          permission: 'Library.Manage',
        })
      ),
  },

  runAntivirusScan: {
    isTool: true,
    scope: 'write',
    description: `Start a Microsoft Defender Antivirus scan (Quick or Full) on a device. Detections are handled by the device's antivirus policy. Cancel a pending scan with cancelAction. ${MACHINE_ACTION_RETURNS} ${SCAN_PENDING_NOTE}`,
    input: RunAntiVirusScanInputSchema,
    handler: async (ctx, input: RunAntiVirusScanInput) =>
      startMachineAction(
        ctx,
        input.machineId,
        'runAntiVirusScan',
        { Comment: input.comment, ScanType: input.scanType },
        'Machine.Scan'
      ),
  },

  collectInvestigationPackage: {
    isTool: true,
    scope: 'write',
    description: `Collect a forensic investigation package (processes, services, network connections, autoruns, logs) from a device. When the action has Succeeded, get a download link with getInvestigationUri. ${MACHINE_ACTION_RETURNS}`,
    input: MachineCommentInputSchema,
    handler: async (ctx, input: MachineCommentInput) =>
      startMachineAction(
        ctx,
        input.machineId,
        'collectInvestigationPackage',
        { Comment: input.comment },
        'Machine.CollectForensics'
      ),
  },

  stopAndQuarantineFile: {
    isTool: true,
    scope: 'destroy',
    description: `Stop the running processes of a file (by SHA-1) on a device and quarantine the file. Only a quarantine restore in the Defender portal brings the file back. Needs Windows 10 1703 or later, and does not apply to files signed by Microsoft or trusted publishers. To act on every device that saw the file, list them with getFileDevices and run this once per device. ${MACHINE_ACTION_RETURNS}`,
    input: StopAndQuarantineFileInputSchema,
    handler: async (ctx, input: StopAndQuarantineFileInput) =>
      startMachineAction(
        ctx,
        input.machineId,
        'StopAndQuarantineFile',
        { Comment: input.comment, Sha1: input.sha1 },
        'Machine.StopAndQuarantine'
      ),
  },

  restrictAppExecution: {
    isTool: true,
    scope: 'destroy',
    description: `Restrict a device so only Microsoft-signed applications can run: softer containment than isolation, the device stays on the network. Needs Microsoft Defender Antivirus in active mode on the device (otherwise 400 InvalidDefenderRunningMode). Undo with removeAppRestriction. ${MACHINE_ACTION_RETURNS}`,
    input: MachineCommentInputSchema,
    handler: async (ctx, input: MachineCommentInput) =>
      startMachineAction(
        ctx,
        input.machineId,
        'restrictCodeExecution',
        { Comment: input.comment },
        'Machine.RestrictExecution'
      ),
  },

  removeAppRestriction: {
    isTool: true,
    scope: 'destroy',
    description: `Remove the app execution restriction set by restrictAppExecution, so every application can run again. Needs Microsoft Defender Antivirus in active mode on the device (otherwise 400 InvalidDefenderRunningMode). ${MACHINE_ACTION_RETURNS}`,
    input: MachineCommentInputSchema,
    handler: async (ctx, input: MachineCommentInput) =>
      startMachineAction(
        ctx,
        input.machineId,
        'unrestrictCodeExecution',
        { Comment: input.comment },
        'Machine.RestrictExecution'
      ),
  },

  updateMachineTag: {
    isTool: true,
    scope: 'write',
    description:
      'Add or remove a device tag, for example to mark a device as handled. Tags can drive device group membership, so a change can move the device into or out of a tag-based device group. Undo with the opposite action. Returns the updated device with machineTags.',
    input: MachineTagInputSchema,
    handler: async (ctx, input: MachineTagInput) =>
      withoutODataContext(
        await mdeRequest<Record<string, unknown>>(ctx, {
          method: 'POST',
          path: `${machinePath(input.machineId)}/tags`,
          data: { Value: input.tag, Action: input.action },
          permission: 'Machine.ReadWrite.All',
          // Setting the same tag state twice leaves the same state, so a 5xx is safe to retry.
          idempotent: true,
        })
      ),
  },

  getActions: {
    isTool: true,
    scope: 'read',
    description:
      'List machine actions (isolations, scans, package collections, live response, app restrictions, file quarantines), one page at a time. Narrow it with actionId (to poll one action), machineId, status, and type (each one value or a list of up to 50), and/or an OData filter on id, status, machineId, type, requestor, or creationDateTimeUtc. Each action has id, type, status (Pending or InProgress while it runs, then Succeeded, Failed, TimeOut, or Cancelled), machineId, requestor, requestorComment, creationDateTimeUtc, and, for live response, commands with each commandStatus. A just-created action can be missing for a few seconds: poll again. Returns value, count, hasMore, and nextSkip.',
    input: GetActionsInputSchema,
    handler: async (ctx, input: GetActionsInput) =>
      mdeList(
        ctx,
        '/machineactions',
        {
          filter: joinFilters(
            [
              // Machine action ids are Edm.Guid: a quoted string literal gets 400 (operand type mismatch).
              // The schema only accepts GUIDs, so the bare literal is safe.
              eqOrIn('id', input.actionId, (id) => id),
              eqOrIn('machineId', input.machineId, odataString),
              eqOrIn('status', input.status, odataString),
              eqOrIn('type', input.type, odataString),
            ],
            input.filter
          ),
          top: input.top,
          skip: input.skip,
        },
        { permission: 'Machine.ReadWrite.All' }
      ),
  },

  getActionResults: {
    isTool: true,
    scope: 'read',
    description:
      'Get a download link for the output of a completed live response action: the file collected by getFile, or the output of a script a person ran. Call it after the action has Succeeded. Returns value: a URL valid for 30 minutes; download it outside the agent.',
    input: MachineActionInputSchema,
    handler: async (ctx, input: MachineActionInput) =>
      withoutODataContext(
        await mdeRequest(ctx, {
          method: 'GET',
          // runScript and getFile send one command, so its result is at index 0.
          path: `${actionPath(input.actionId)}/GetLiveResponseResultDownloadLink(index=0)`,
          permission: 'Machine.ReadWrite.All',
        })
      ),
  },

  cancelAction: {
    isTool: true,
    scope: 'destroy',
    description:
      'Cancel a machine action that is still Pending or InProgress, with a required comment giving the reason. The cancellation itself cannot be undone; start the action again if needed. An action created a few seconds ago can answer 404 ResourceNotFound: retry after a few seconds. Returns the machine action with its new status.',
    input: CancelMachineActionInputSchema,
    handler: async (ctx, input: CancelMachineActionInput) =>
      withoutODataContext(
        await mdeRequest(ctx, {
          method: 'POST',
          path: `${actionPath(input.actionId)}/cancel`,
          data: { Comment: input.comment },
          permission:
            'Machine.Isolate, Machine.Scan, Machine.CollectForensics, Machine.RestrictExecution, Machine.StopAndQuarantine, Machine.Offboard, or Machine.LiveResponse (the one matching the action type)',
          idempotent: false,
        })
      ),
  },

  getInvestigationUri: {
    isTool: true,
    scope: 'read',
    description:
      'Get a temporary download URL for the package collected by collectInvestigationPackage. Call it only after that action has Succeeded (404 before). Returns value: a URL valid for a short time. The package is a ZIP file to download outside the agent. Limited to 2 calls per minute.',
    input: MachineActionInputSchema,
    handler: async (ctx, input: MachineActionInput) =>
      withoutODataContext(
        await mdeRequest(ctx, {
          method: 'GET',
          path: `${actionPath(input.actionId)}/getPackageUri`,
          permission: 'Machine.ReadWrite.All',
        })
      ),
  },
};
