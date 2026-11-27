/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { compact, timers } from './client';
import { ACTION_DESCRIPTIONS } from './descriptions';
import { RunQueryInputSchema } from './query_types';
import type { RunQueryInput } from './query_types';
import { FORWARD_TAG_REQUEST_HEADER, FORWARD_TAG_RESPONSE_HEADER, sdlRequest } from './sdl_client';
import type { SdlResponse } from './sdl_client';

export const QUERY_POLL_INTERVAL_MS = 2_000;
export const QUERY_DEFAULT_WAIT_SECONDS = 60;
export const QUERY_MAX_ROWS = 1000;

const ACTION = 'runQuery';

/** The parts of the query service's QueryResult the action reads. */
interface QueryResult {
  id?: string;
  stepsCompleted?: number;
  stepsTotal?: number;
  resolvedTimeRange?: { start?: number; end?: number } | null;
  cpuUsage?: number | null;
  data?: {
    columns?: unknown[];
    values?: unknown[];
    matchCount?: number;
    warnings?: unknown[];
    partialResultsDueToTimeLimit?: boolean;
    omittedEvents?: number;
  } | null;
  error?: { message?: string; details?: unknown } | null;
}

interface QueryTableData {
  columns: unknown[];
  values: unknown[];
  rowCount: number;
  truncated: boolean;
  matchCount: number | null;
  warnings: unknown[];
  partialResultsDueToTimeLimit: boolean;
  omittedEvents: number | null;
}

export interface RunQueryOutput {
  status: 'completed' | 'timedOut';
  stepsCompleted: number | null;
  stepsTotal: number | null;
  resolvedTimeRange: { start?: number; end?: number } | null;
  cpuUsage: number | null;
  data: QueryTableData | null;
  queryDeleted: boolean;
  cleanupFailed?: true;
  message?: string;
}

const toTableData = (data: NonNullable<QueryResult['data']>): QueryTableData => {
  const values = Array.isArray(data.values) ? data.values : [];
  return {
    columns: Array.isArray(data.columns) ? data.columns : [],
    values: values.slice(0, QUERY_MAX_ROWS),
    rowCount: values.length,
    truncated: values.length > QUERY_MAX_ROWS,
    matchCount: typeof data.matchCount === 'number' ? data.matchCount : null,
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
    partialResultsDueToTimeLimit: data.partialResultsDueToTimeLimit === true,
    omittedEvents: typeof data.omittedEvents === 'number' ? data.omittedEvents : null,
  };
};

/** Fails the action when the service reports that the query could not run. */
const assertNoQueryError = (result: QueryResult): void => {
  if (!result.error) return;
  const details =
    result.error.details !== undefined && result.error.details !== null
      ? ` ${JSON.stringify(result.error.details).slice(0, 500)}`
      : '';
  throw new Error(
    `SentinelOne ${ACTION}: the query failed: ${result.error.message ?? 'no message'}${details}`
  );
};

const forwardTagHeaders = (tag: string | undefined): Record<string, string> | undefined =>
  tag ? { [FORWARD_TAG_REQUEST_HEADER]: tag } : undefined;

const queryPath = (id: string): string => `/queries/${encodeURIComponent(id)}`;

/** The latest forward tag; kept up to date while polling so the delete always routes correctly. */
interface Routing {
  tag: string | undefined;
}

/** Polls every 2 s with the last step seen until the result is in, the query fails or the wait ends. */
const waitForResult = async (
  ctx: ActionContext,
  id: string,
  launched: SdlResponse<QueryResult>,
  routing: Routing,
  waitSeconds: number,
  startedAt: number
): Promise<{ result: QueryResult; done: boolean }> => {
  let result = launched.data ?? {};
  assertNoQueryError(result);
  const deadline = startedAt + waitSeconds * 1000;
  const maxPolls = Math.ceil((waitSeconds * 1000) / QUERY_POLL_INTERVAL_MS);
  for (let poll = 0; !result.data && poll < maxPolls; poll++) {
    if (Date.now() + QUERY_POLL_INTERVAL_MS > deadline) break;
    await timers.sleep(QUERY_POLL_INTERVAL_MS);
    const answer = await sdlRequest<QueryResult>(ctx, {
      action: ACTION,
      method: 'GET',
      path: queryPath(id),
      params: { lastStepSeen: result.stepsCompleted ?? 0 },
      headers: forwardTagHeaders(routing.tag),
      mutating: false,
    });
    result = answer.data ?? {};
    routing.tag = answer.headers[FORWARD_TAG_RESPONSE_HEADER] ?? routing.tag;
    assertNoQueryError(result);
  }
  return { result, done: Boolean(result.data) };
};

/** DELETE is required after use and idempotent; a failure is reported, never thrown. */
const deleteQuery = async (
  ctx: ActionContext,
  id: string,
  tag: string | undefined
): Promise<boolean> => {
  try {
    await sdlRequest(ctx, {
      action: ACTION,
      method: 'DELETE',
      path: queryPath(id),
      headers: forwardTagHeaders(tag),
      mutating: false,
    });
    return true;
  } catch (error) {
    ctx.log.debug(
      `SentinelOne ${ACTION}: deleting the query failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  }
};

export const queryActions: ConnectorSpec['actions'] = {
  runQuery: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.runQuery,
    input: RunQueryInputSchema,
    handler: async (ctx, input: RunQueryInput): Promise<RunQueryOutput> => {
      const { query, waitSeconds = QUERY_DEFAULT_WAIT_SECONDS, ...options } = input;
      const startedAt = Date.now();
      // launching is a POST: treated as state-changing so only HTTP 429 is retried
      const launched = await sdlRequest<QueryResult>(ctx, {
        action: ACTION,
        method: 'POST',
        path: '/queries',
        body: compact({
          queryType: 'PQ',
          pq: { query, resultType: 'TABLE' },
          startTime: options.startTime,
          endTime: options.endTime,
          queryPriority: options.queryPriority ?? 'LOW',
          accountIds: options.accountIds,
          // the query service rejects accountIds unless tenant is explicitly false
          tenant: options.tenant ?? (options.accountIds ? false : undefined),
        }),
        mutating: true,
      });
      const id = typeof launched.data?.id === 'string' ? launched.data.id : '';
      if (!id) {
        throw new Error(`SentinelOne ${ACTION}: the query service returned no query id`);
      }

      const routing: Routing = { tag: launched.headers[FORWARD_TAG_RESPONSE_HEADER] };
      let outcome: { result: QueryResult; done: boolean } | undefined;
      let queryDeleted = false;
      try {
        outcome = await waitForResult(ctx, id, launched, routing, waitSeconds, startedAt);
      } finally {
        queryDeleted = await deleteQuery(ctx, id, routing.tag);
      }

      const { result, done } = outcome;
      const cleanup = queryDeleted ? {} : { cleanupFailed: true as const };
      const base = {
        stepsCompleted: result.stepsCompleted ?? null,
        stepsTotal: result.stepsTotal ?? null,
        resolvedTimeRange: result.resolvedTimeRange ?? null,
        cpuUsage: result.cpuUsage ?? null,
        queryDeleted,
        ...cleanup,
      };
      if (done && result.data) {
        return { status: 'completed', ...base, data: toTableData(result.data) };
      }
      return {
        status: 'timedOut',
        ...base,
        data: null,
        message: `The query did not finish within ${waitSeconds} seconds. ${
          queryDeleted
            ? 'The query was deleted.'
            : 'Deleting the query failed; SentinelOne expires it on its own.'
        } Narrow the time range (startTime, endTime) or the filter, then run it again.`,
      };
    },
  },
};
