/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import type { RtrTier } from './constants';
import {
  MAX_FILE_BYTES,
  RTR_BATCH_COMMAND_PATHS,
  RTR_COMMAND_PATHS,
  RTR_MAX_OUTPUT_CHUNKS,
  RTR_POLL_INTERVAL_MS,
  RTR_SESSION_REFRESH_AFTER_MS,
  RTR_TIER_SCOPES,
  RTR_TIMEOUT_MARGIN_MS,
  SCOPES,
} from './constants';
import type { FalconBody } from './client';
import { falconMessage, falconRequest, resourcesOf, timing } from './client';
import type { RtrHostResult } from './format';
import {
  baseName,
  batchResources,
  parseRtrCommand,
  retrievedFileFor,
  shapeBatchResults,
} from './format';

const requestTimeout = (seconds: number) => seconds * 1000 + RTR_TIMEOUT_MARGIN_MS;

const unique = (ids: string[]) => [...new Set(ids)];

/** Session deletes sent at the same time when a batch is closed (a batch can hold 10,000 hosts). */
const SESSION_DELETE_CONCURRENCY = 10;

interface BatchSession {
  batchId: string;
  openedAt: number;
  hosts: Record<string, Record<string, unknown>>;
}

/** Opens one batch session for exactly these hosts; fails without sending anything else if Falcon returns no batch_id. */
export const initBatchSession = async (
  ctx: ActionContext,
  hostIds: string[],
  options: { timeout: number; queueOffline?: boolean; scope: string; retryServerErrors?: boolean }
): Promise<BatchSession> => {
  const response = await falconRequest(ctx, {
    method: 'POST',
    path: '/real-time-response/combined/batch-init-session/v1',
    params: { timeout: options.timeout },
    data: { host_ids: hostIds, queue_offline: options.queueOffline ?? false },
    timeout: requestTimeout(options.timeout),
    retryServerErrors: options.retryServerErrors ?? false,
    scope: options.scope,
  });
  const batchId = response.data?.batch_id;
  if (typeof batchId !== 'string' || !batchId) {
    throw new Error(
      `Real Time Response session could not be opened: ${falconMessage(response.data)}`
    );
  }
  return { batchId, openedAt: timing.now(), hosts: batchResources(response.data) };
};

/** Refreshes a batch session once it is older than 5 minutes (idle sessions expire after 10 minutes). */
const keepBatchAlive = async (ctx: ActionContext, session: BatchSession, scope: string) => {
  if (timing.now() - session.openedAt < RTR_SESSION_REFRESH_AFTER_MS) {
    return;
  }
  await falconRequest(ctx, {
    method: 'POST',
    path: '/real-time-response/combined/batch-refresh-session/v1',
    data: { batch_id: session.batchId },
    retryServerErrors: true,
    scope,
  });
  session.openedAt = timing.now();
};

export interface BatchCommandResult {
  batch_id: string;
  complete: boolean;
  results: RtrHostResult[];
  resources: Record<string, unknown>;
  errors: unknown[];
}

/**
 * Runs one command in a tier across hosts: allow-list check, batch session, batch command. When
 * no host could open a session, the command is not sent and the per-host init errors are returned.
 * The hosts' sessions are deleted afterwards, also when the command fails (closeBatchSessions).
 */
export const runBatchCommand = async (
  ctx: ActionContext,
  tier: RtrTier,
  input: { endpoint_ids: string[]; command: string; timeout?: number; queue_offline?: boolean }
): Promise<BatchCommandResult> => {
  const { baseCommand, commandString } = parseRtrCommand(input.command, tier);
  const timeout = input.timeout ?? 30;
  const scope = RTR_TIER_SCOPES[tier];
  const session = await initBatchSession(ctx, unique(input.endpoint_ids), {
    timeout,
    queueOffline: input.queue_offline,
    scope,
    retryServerErrors: tier === 'read_only',
  });
  const opened = Object.values(session.hosts).some(
    (host) => !Array.isArray(host.errors) || host.errors.length === 0
  );
  if (!opened) {
    return {
      batch_id: session.batchId,
      complete: false,
      results: shapeBatchResults(session.hosts, {}),
      resources: {},
      errors: [],
    };
  }
  let command: Record<string, Record<string, unknown>> = {};
  let errors: unknown[] = [];
  try {
    // Inside the try: a failed refresh still closes the sessions the batch init opened.
    await keepBatchAlive(ctx, session, scope);
    const response = await falconRequest(ctx, {
      method: 'POST',
      path: RTR_BATCH_COMMAND_PATHS[tier],
      params: { timeout },
      data: { batch_id: session.batchId, base_command: baseCommand, command_string: commandString },
      timeout: requestTimeout(timeout),
      retryServerErrors: tier === 'read_only',
      scope,
    });
    command = batchResources(response.data);
    errors = Array.isArray(response.data?.errors) ? response.data.errors : [];
  } finally {
    await closeBatchSessions(ctx, session, command, scope);
  }
  const results = shapeBatchResults(session.hosts, command);
  return {
    batch_id: session.batchId,
    complete: results.length > 0 && results.every((r) => r.complete && r.errors.length === 0),
    results,
    resources: command,
    errors,
  };
};

export interface CommandStatus {
  complete: boolean;
  stdout?: string;
  stderr?: string;
  base_command?: string;
  sequence_id: number;
  resources: unknown[];
}

/** Reads the status (and output chunk) of an RTR command by cloud_request_id. */
export const getCommandStatus = async (
  ctx: ActionContext,
  tier: RtrTier,
  cloudRequestId: string,
  sequenceId = 0
): Promise<CommandStatus> => {
  const response = await falconRequest(ctx, {
    method: 'GET',
    path: RTR_COMMAND_PATHS[tier],
    params: { cloud_request_id: cloudRequestId, sequence_id: sequenceId },
    retryServerErrors: true,
    scope: RTR_TIER_SCOPES[tier],
  });
  const resources = resourcesOf<Record<string, unknown>>(response.data);
  const first = resources[0] ?? {};
  return {
    complete: first.complete === true,
    stdout: typeof first.stdout === 'string' ? first.stdout : undefined,
    stderr: typeof first.stderr === 'string' ? first.stderr : undefined,
    base_command: typeof first.base_command === 'string' ? first.base_command : undefined,
    sequence_id: typeof first.sequence_id === 'number' ? first.sequence_id : sequenceId,
    resources,
  };
};

export interface SingleHostResult extends CommandStatus {
  cloud_request_id: string;
  session_id: string;
}

/** Deletes a single-host session; a failed delete is only logged (Falcon ends idle sessions). */
const deleteSession = async (ctx: ActionContext, sessionId: string, scope: string) => {
  try {
    await falconRequest(ctx, {
      method: 'DELETE',
      path: '/real-time-response/entities/sessions/v1',
      params: { session_id: sessionId },
      retryServerErrors: true,
      allowNotFound: true,
      scope,
    });
  } catch (error) {
    ctx.log.warn(`Could not delete Real Time Response session: ${(error as Error).message}`);
  }
};

/**
 * Deletes the per-host sessions of a batch session (Falcon's own samples close each host's
 * session_id from batch init with the single-session delete). Kept: hosts queued offline (the
 * delete would drop the queued command) and hosts whose command is still running (their
 * cloud_request_id is read with getRTRCommandStatus; Falcon ends them after 10 minutes idle).
 */
const closeBatchSessions = async (
  ctx: ActionContext,
  session: BatchSession,
  command: Record<string, Record<string, unknown>>,
  scope: string
) => {
  const sessionIds = Object.entries(session.hosts).flatMap(([hostId, host]) => {
    const result = command[hostId];
    const running =
      result !== undefined &&
      result.complete !== true &&
      !(Array.isArray(result.errors) && result.errors.length > 0);
    const queued = host.offline_queued === true || result?.offline_queued === true;
    return typeof host.session_id === 'string' && host.session_id && !queued && !running
      ? [host.session_id]
      : [];
  });
  const ids = unique(sessionIds);
  for (let start = 0; start < ids.length; start += SESSION_DELETE_CONCURRENCY) {
    await Promise.all(
      ids
        .slice(start, start + SESSION_DELETE_CONCURRENCY)
        .map((id) => deleteSession(ctx, id, scope))
    );
  }
};

/** The chunk marker Falcon returns with a chunk: a positive sequence_id while more output follows. */
const chunkMarker = (status: CommandStatus): number | undefined => {
  const marker = (status.resources[0] as Record<string, unknown> | undefined)?.sequence_id;
  return typeof marker === 'number' && marker > 0 ? marker : undefined;
};

/**
 * Reads every output chunk of a completed command: sequence_id 1, 2, ... while Falcon marks
 * more output, until the marker is 0 or absent, makes no progress, or the chunk cap is reached.
 */
const readAllChunks = async (
  ctx: ActionContext,
  tier: RtrTier,
  cloudRequestId: string,
  first: CommandStatus
): Promise<CommandStatus> => {
  const chunks = [first];
  let current = first;
  let previousMarker: number | undefined;
  for (let sequenceId = 1; sequenceId < RTR_MAX_OUTPUT_CHUNKS; sequenceId++) {
    const marker = chunkMarker(current);
    if (marker === undefined || marker === previousMarker) {
      break;
    }
    previousMarker = marker;
    current = await getCommandStatus(ctx, tier, cloudRequestId, sequenceId);
    if (current.resources.length === 0) {
      break;
    }
    chunks.push(current);
  }
  if (chunks.length === 1) {
    return first;
  }
  const joined = (key: 'stdout' | 'stderr') =>
    chunks.some((chunk) => chunk[key] !== undefined)
      ? chunks.map((chunk) => chunk[key] ?? '').join('')
      : undefined;
  return {
    ...first,
    stdout: joined('stdout'),
    stderr: joined('stderr'),
    sequence_id: chunks.length - 1,
    resources: chunks.flatMap((chunk) => chunk.resources),
  };
};

/**
 * Runs one command on one host in its own session: open, run, poll until complete or the
 * timeout, and read every output chunk. The session is deleted when the command completed or
 * failed; when it is still running at the timeout the session is kept so getRTRCommandStatus can
 * read the result by cloud_request_id, and Falcon ends it after 10 minutes idle.
 */
export const runSingleHostCommand = async (
  ctx: ActionContext,
  tier: RtrTier,
  input: { deviceId: string; baseCommand: string; commandString: string; timeout: number }
): Promise<SingleHostResult> => {
  const scope = RTR_TIER_SCOPES[tier];
  const opened = await falconRequest(ctx, {
    method: 'POST',
    path: '/real-time-response/entities/sessions/v1',
    params: { timeout: input.timeout },
    data: { device_id: input.deviceId, queue_offline: false },
    timeout: requestTimeout(input.timeout),
    retryServerErrors: tier === 'read_only',
    scope,
  });
  const sessionId = resourcesOf<{ session_id?: string }>(opened.data)[0]?.session_id;
  if (!sessionId) {
    throw new Error(
      `Real Time Response session could not be opened: ${falconMessage(opened.data)}`
    );
  }
  let keepSession = false;
  try {
    const sent = await falconRequest(ctx, {
      method: 'POST',
      path: RTR_COMMAND_PATHS[tier],
      data: {
        session_id: sessionId,
        device_id: input.deviceId,
        base_command: input.baseCommand,
        command_string: input.commandString,
        persist: false,
      },
      retryServerErrors: tier === 'read_only',
      scope,
    });
    const cloudRequestId = resourcesOf<{ cloud_request_id?: string }>(sent.data)[0]
      ?.cloud_request_id;
    if (!cloudRequestId) {
      throw new Error(`Real Time Response command was not accepted: ${falconMessage(sent.data)}`);
    }
    const deadline = timing.now() + input.timeout * 1000;
    let status = await getCommandStatus(ctx, tier, cloudRequestId);
    while (!status.complete && timing.now() < deadline) {
      await timing.sleep(RTR_POLL_INTERVAL_MS);
      status = await getCommandStatus(ctx, tier, cloudRequestId);
    }
    if (!status.complete) {
      keepSession = true;
      return { ...status, cloud_request_id: cloudRequestId, session_id: sessionId };
    }
    const output = await readAllChunks(ctx, tier, cloudRequestId, status);
    return { ...output, cloud_request_id: cloudRequestId, session_id: sessionId };
  } finally {
    if (!keepSession) {
      await deleteSession(ctx, sessionId, scope);
    }
  }
};

export interface RetrievedFile {
  complete: boolean;
  session_id?: string;
  batch_get_cmd_req_id?: string;
  file_name?: string;
  sha256?: string;
  size?: number;
  content_base64?: string;
  archive_format?: string;
}

/**
 * Pulls one file from one host with RTR get and returns the archive Falcon packs it in (7z,
 * password `infected`), as base64. Files over 1 MiB fail with their sha256 instead. The host's
 * session is deleted afterwards, unless the file is still being prepared at the timeout. A call
 * with the batch_get_cmd_req_id (and session_id) of such a result keeps waiting for the same file
 * instead of starting a new collection.
 */
export const retrieveFile = async (
  ctx: ActionContext,
  input: {
    device_id: string;
    file_path: string;
    timeout?: number;
    queue_offline?: boolean;
    batch_get_cmd_req_id?: string;
    session_id?: string;
  }
): Promise<RetrievedFile> => {
  const timeout = input.timeout ?? 60;
  const scope = SCOPES.rtrWrite;
  if (input.batch_get_cmd_req_id) {
    let resumed: RetrievedFile | undefined;
    try {
      resumed = await awaitFile(
        ctx,
        input,
        input.batch_get_cmd_req_id,
        input.session_id,
        timeout,
        scope
      );
      return resumed;
    } finally {
      const sessionId = resumed?.session_id ?? input.session_id;
      if (resumed?.complete !== false && sessionId) {
        await deleteSession(ctx, sessionId, scope);
      }
    }
  }
  const session = await initBatchSession(ctx, [input.device_id], {
    timeout,
    queueOffline: input.queue_offline,
    scope,
  });
  let keepSession = false;
  try {
    const file = await getFile(ctx, input, session, timeout, scope);
    keepSession = !file.complete;
    return file;
  } finally {
    if (!keepSession) {
      await closeBatchSessions(ctx, session, {}, scope);
    }
  }
};

/** Sends the batch get, waits for the file and downloads its archive (see retrieveFile). */
const getFile = async (
  ctx: ActionContext,
  input: { device_id: string; file_path: string },
  session: BatchSession,
  timeout: number,
  scope: string
): Promise<RetrievedFile> => {
  const sent = await falconRequest(ctx, {
    method: 'POST',
    path: '/real-time-response/combined/batch-get-command/v1',
    params: { timeout },
    data: { batch_id: session.batchId, file_path: input.file_path },
    timeout: requestTimeout(timeout),
    retryServerErrors: false,
    scope,
  });
  const requestId = sent.data?.batch_get_cmd_req_id;
  const hostResult = batchResources(sent.data)[input.device_id];
  const hostErrors = Array.isArray(hostResult?.errors) ? hostResult.errors : [];
  if (hostErrors.length > 0) {
    throw new Error(
      `Real Time Response get failed on the host: ${falconMessage({
        errors: hostErrors,
      } as FalconBody)}`
    );
  }
  if (typeof requestId !== 'string' || !requestId) {
    throw new Error(`Real Time Response get was not accepted: ${falconMessage(sent.data)}`);
  }
  const sessionId = typeof hostResult?.session_id === 'string' ? hostResult.session_id : undefined;
  return awaitFile(ctx, input, requestId, sessionId, timeout, scope, () =>
    keepBatchAlive(ctx, session, scope)
  );
};

/**
 * Polls a batch get until the host's file is ready or the timeout passes, then downloads its
 * archive. Returns complete: false with the ids to resume when the file is not ready yet.
 */
const awaitFile = async (
  ctx: ActionContext,
  input: { device_id: string; file_path: string },
  requestId: string,
  sessionId: string | undefined,
  timeout: number,
  scope: string,
  beforeDownload?: () => Promise<void>
): Promise<RetrievedFile> => {
  const deadline = timing.now() + timeout * 1000;
  let file;
  for (;;) {
    const status = await falconRequest(ctx, {
      method: 'GET',
      path: '/real-time-response/combined/batch-get-command/v1',
      params: { batch_get_cmd_req_id: requestId, timeout },
      timeout: requestTimeout(timeout),
      retryServerErrors: true,
      scope,
    });
    file = retrievedFileFor(status.data, input.device_id);
    if (file || timing.now() >= deadline) {
      break;
    }
    await timing.sleep(RTR_POLL_INTERVAL_MS);
  }
  if (!file) {
    return { complete: false, session_id: sessionId, batch_get_cmd_req_id: requestId };
  }
  if (file.size !== undefined && file.size > MAX_FILE_BYTES) {
    throw new Error(
      `The file is ${file.size} bytes, larger than the 1 MiB the connector returns (sha256 ${file.sha256}). Download it from the Falcon console.`
    );
  }
  const fileName = baseName(file.name ?? input.file_path);
  await beforeDownload?.();
  const content = await falconRequest<ArrayBuffer>(ctx, {
    method: 'GET',
    path: '/real-time-response/entities/extracted-file-contents/v1',
    params: { session_id: file.session_id ?? sessionId, sha256: file.sha256, filename: fileName },
    headers: { Accept: 'application/octet-stream' },
    responseType: 'arraybuffer',
    retryServerErrors: true,
    scope,
  });
  const bytes = Buffer.from(content.data);
  if (bytes.length > MAX_FILE_BYTES) {
    throw new Error(
      `The file archive is ${bytes.length} bytes, larger than the 1 MiB the connector returns (sha256 ${file.sha256}). Download it from the Falcon console.`
    );
  }
  return {
    complete: true,
    session_id: file.session_id ?? sessionId,
    batch_get_cmd_req_id: requestId,
    file_name: fileName,
    sha256: file.sha256,
    size: file.size,
    content_base64: bytes.toString('base64'),
    archive_format: '7z',
  };
};
