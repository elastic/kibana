/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RtrTier } from './constants';
import {
  CONTAINMENT_STATES,
  INTEL_CONFIDENCE_ORDER,
  RTR_TIER_COMMANDS,
  RTR_TIER_LABELS,
} from './constants';
import type { FalconBody } from './client';

type JsonObject = Record<string, unknown>;

/** Per-item result of a change action: `skipped` means the item was already in the requested state. */
export type OutcomeStatus = 'requested' | 'skipped' | 'notFound' | 'failed';

export interface ItemOutcome {
  id: string;
  status: OutcomeStatus;
  reason?: string;
}

/**
 * Outcome of each id sent in a change request: `notFound` for a 404 error that names it, `failed`
 * for any other error that names it, `requested` otherwise.
 */
export const sentOutcomes = (
  ids: string[],
  errors: Array<{ code?: number; message?: string; id?: string } | null | undefined>
): ItemOutcome[] =>
  ids.map((id) => {
    const error = errors.find((item) => item?.id === id || Boolean(item?.message?.includes(id)));
    if (!error) {
      return { id, status: 'requested' };
    }
    return error.code === 404
      ? { id, status: 'notFound' }
      : { id, status: 'failed', reason: error.message ?? 'Falcon reported an error for this id.' };
  });

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Adds `containment_state` (normal | containing | contained | lift_pending | unknown) to a host record. */
export const withContainmentState = (host: unknown): unknown => {
  if (!isObject(host)) {
    return host;
  }
  const status = typeof host.status === 'string' ? host.status : '';
  return { ...host, containment_state: CONTAINMENT_STATES[status] ?? 'unknown' };
};

export interface ParsedRtrCommand {
  baseCommand: string;
  commandString: string;
}

/**
 * Splits an RTR command line into the base command Falcon expects and the whole line, and checks
 * it against the tier's allow-list. `reg` is checked with its sub-command (`reg query`).
 */
export const parseRtrCommand = (command: string, tier: RtrTier): ParsedRtrCommand => {
  const commandString = command.trim();
  const [first = '', second = ''] = commandString.split(/\s+/);
  const baseCommand = first.toLowerCase();
  const checked = baseCommand === 'reg' ? `reg ${second.toLowerCase()}` : baseCommand;
  const allowed = RTR_TIER_COMMANDS[tier];
  if (!allowed.includes(checked)) {
    throw new Error(
      `'${checked || commandString}' is not allowed in the ${
        RTR_TIER_LABELS[tier]
      } Real Time Response tier. Allowed commands: ${allowed.join(', ')}.`
    );
  }
  return { baseCommand, commandString };
};

export interface RtrHostResult {
  host_id: string;
  session_id?: string;
  complete: boolean;
  stdout?: string;
  stderr?: string;
  base_command?: string;
  offline_queued?: boolean;
  cloud_request_id?: string;
  errors: unknown[];
}

/** Per-host map of an RTR batch response (`combined.resources`, or `resources` on batch init). */
export const batchResources = (data: FalconBody | undefined): Record<string, JsonObject> => {
  const combined = isObject(data?.combined) ? data?.combined.resources : undefined;
  const resources = isObject(combined) ? combined : data?.resources;
  if (!isObject(resources)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(resources).filter((entry): entry is [string, JsonObject] => isObject(entry[1]))
  );
};

const hostErrors = (host: JsonObject): unknown[] => (Array.isArray(host.errors) ? host.errors : []);

/**
 * One result per host: the command's per-host output, plus hosts whose session could not be
 * opened (they appear only in the init response, with their errors). A host whose command was
 * still running carries `cloud_request_id` for getRTRCommandStatus.
 */
export const shapeBatchResults = (
  init: Record<string, JsonObject>,
  command: Record<string, JsonObject>
): RtrHostResult[] => {
  const results: RtrHostResult[] = Object.entries(command).map(([hostId, host]) => {
    const complete = host.complete === true;
    const cloudRequestId = typeof host.task_id === 'string' ? host.task_id : undefined;
    return {
      host_id: hostId,
      session_id: typeof host.session_id === 'string' ? host.session_id : undefined,
      complete,
      stdout: typeof host.stdout === 'string' ? host.stdout : undefined,
      stderr: typeof host.stderr === 'string' ? host.stderr : undefined,
      base_command: typeof host.base_command === 'string' ? host.base_command : undefined,
      offline_queued: host.offline_queued === true,
      ...(!complete && cloudRequestId ? { cloud_request_id: cloudRequestId } : {}),
      errors: hostErrors(host),
    };
  });
  for (const [hostId, host] of Object.entries(init)) {
    if (!(hostId in command) && (hostErrors(host).length > 0 || host.offline_queued === true)) {
      results.push({
        host_id: hostId,
        session_id: typeof host.session_id === 'string' ? host.session_id : undefined,
        complete: false,
        offline_queued: host.offline_queued === true,
        errors: hostErrors(host),
      });
    }
  }
  return results;
};

export interface RetrievedFileEntry {
  session_id?: string;
  sha256: string;
  name?: string;
  size?: number;
}

/**
 * The file a batch get produced for a host, from the batch-get status response. Falcon has
 * returned the host's entry as an object, a list of objects, or an object with `files`; all
 * three are read.
 */
export const retrievedFileFor = (
  data: FalconBody | undefined,
  hostId: string
): RetrievedFileEntry | undefined => {
  const combined = isObject(data?.combined) ? data?.combined.resources : undefined;
  const sources = [combined, data?.resources].map((map) =>
    isObject(map) ? map[hostId] : undefined
  );
  const candidates: unknown[] = [];
  for (const source of sources) {
    if (Array.isArray(source)) {
      candidates.push(...source);
    } else if (isObject(source)) {
      candidates.push(...(Array.isArray(source.files) ? source.files : []), source);
    }
  }
  const sessionId = sources.find(isObject)?.session_id;
  for (const candidate of candidates) {
    if (isObject(candidate) && typeof candidate.sha256 === 'string' && candidate.sha256) {
      return {
        session_id:
          typeof candidate.session_id === 'string'
            ? candidate.session_id
            : typeof sessionId === 'string'
            ? sessionId
            : undefined,
        sha256: candidate.sha256,
        name: typeof candidate.name === 'string' ? candidate.name : undefined,
        size: typeof candidate.size === 'number' ? candidate.size : undefined,
      };
    }
  }
  return undefined;
};

/** Last path segment of a Windows or POSIX path. */
export const baseName = (path: string): string => path.split(/[\\/]/).filter(Boolean).pop() ?? path;

/**
 * Parses tabular `ps` output into rows, using the dashed line under the header for the column
 * boundaries. Returns [] when the output is not a table; the raw stdout is always returned too.
 */
export const parseProcessTable = (stdout: string): Array<Record<string, string>> => {
  const lines = stdout.replace(/\r/g, '').split('\n');
  const dashIndex = lines.findIndex(
    (line, i) => i > 0 && /^[\s-]+$/.test(line) && line.includes('-')
  );
  if (dashIndex < 1) {
    return [];
  }
  const columns: Array<{ start: number; end: number }> = [];
  for (const match of lines[dashIndex].matchAll(/-+/g)) {
    columns.push({ start: match.index ?? 0, end: (match.index ?? 0) + match[0].length });
  }
  const slice = (line: string, index: number) =>
    line
      .slice(
        columns[index].start,
        index + 1 < columns.length ? columns[index + 1].start : undefined
      )
      .trim();
  const header = columns.map((_, index) => slice(lines[dashIndex - 1], index));
  return lines
    .slice(dashIndex + 1)
    .filter((line) => line.trim().length > 0)
    .map((line) => Object.fromEntries(header.map((name, index) => [name, slice(line, index)])));
};

/** Highest malicious_confidence among Falcon Intelligence indicators, or not_found. */
export const intelVerdict = (resources: unknown[]): string => {
  const levels = resources
    .map((resource) => (isObject(resource) ? resource.malicious_confidence : undefined))
    .filter((level): level is string => typeof level === 'string');
  for (const level of INTEL_CONFIDENCE_ORDER) {
    if (levels.includes(level)) {
      return level;
    }
  }
  return resources.length > 0 ? 'unverified' : 'not_found';
};
