/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import type { SentinelOneBody } from './client';
import {
  assertApplied,
  compact,
  downloadFile,
  s1Request,
  timers,
  toListResult,
  withAdditionalFilters,
} from './client';
import {
  NO_SCRIPT_TARGET_MESSAGE,
  SCRIPT_FINAL_STATUSES,
  SCRIPT_POLL_INTERVAL_MS,
} from './constants';
import { ACTION_DESCRIPTIONS } from './descriptions';
import { REMOTE_SCRIPT_FILTER_NAMES } from './filter_names';
import {
  DownloadRemoteScriptResultsInputSchema,
  ExecuteScriptInputSchema,
  GetRemoteScriptResultsInputSchema,
  GetRemoteScriptStatusInputSchema,
  GetRemoteScriptsInputSchema,
  RunScriptAndWaitInputSchema,
} from './types';
import type {
  DownloadRemoteScriptResultsInput,
  ExecuteScriptInput,
  GetRemoteScriptResultsInput,
  GetRemoteScriptStatusInput,
  GetRemoteScriptsInput,
  RunScriptAndWaitInput,
} from './types';

interface DownloadLink {
  downloadUrl?: string;
  fileName?: string;
  taskId?: string;
}

/** Sends the execute call; the target must be explicit agent ids or uuids (V1 message kept). */
const runScript = async (ctx: ActionContext, action: string, input: ExecuteScriptInput) => {
  const { agentIds, agentUuids, outputDestination, ...script } = input;
  const filter: Record<string, string[]> = {};
  if (agentIds?.length) filter.ids = agentIds;
  if (agentUuids?.length) filter.uuids = agentUuids;
  if (Object.keys(filter).length === 0) {
    throw new Error(NO_SCRIPT_TARGET_MESSAGE);
  }
  const body = await s1Request(ctx, {
    action,
    method: 'POST',
    path: '/remote-scripts/execute',
    body: {
      filter,
      data: compact({ ...script, outputDestination: outputDestination ?? 'SentinelCloud' }),
    },
    mutating: true,
  });
  return assertApplied(action, [...(agentIds ?? []), ...(agentUuids ?? [])], body);
};

/** fetch-files is a read sent as POST; the links sit in data.data.downloadLinks (V1 read data.download_links). */
const fetchResultLinks = async (
  ctx: ActionContext,
  action: string,
  taskIds: string[],
  computerNames?: string[]
): Promise<{ body: SentinelOneBody; links: DownloadLink[] }> => {
  const body = await s1Request(ctx, {
    action,
    method: 'POST',
    path: '/remote-scripts/fetch-files',
    body: { data: compact({ taskIds, computerNames }) },
    mutating: false,
  });
  const data = body.data as
    | { data?: { downloadLinks?: unknown }; download_links?: unknown; downloadLinks?: unknown }
    | undefined;
  const raw = data?.data?.downloadLinks ?? data?.downloadLinks ?? data?.download_links;
  return { body, links: Array.isArray(raw) ? (raw as DownloadLink[]) : [] };
};

export const scriptActions: ConnectorSpec['actions'] = {
  getRemoteScripts: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.getRemoteScripts,
    input: GetRemoteScriptsInputSchema,
    handler: async (ctx, input: GetRemoteScriptsInput) => {
      const { additionalFilters, ...named } = input;
      return toListResult(
        await s1Request(ctx, {
          action: 'getRemoteScripts',
          method: 'GET',
          path: '/remote-scripts',
          params: withAdditionalFilters(
            'getRemoteScripts',
            named,
            additionalFilters,
            REMOTE_SCRIPT_FILTER_NAMES
          ),
          mutating: false,
        })
      );
    },
  },

  executeScript: {
    isTool: true,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.executeScript,
    input: ExecuteScriptInputSchema,
    handler: async (ctx, input: ExecuteScriptInput) => runScript(ctx, 'executeScript', input),
  },

  getRemoteScriptStatus: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.getRemoteScriptStatus,
    input: GetRemoteScriptStatusInputSchema,
    handler: async (ctx, input: GetRemoteScriptStatusInput) =>
      toListResult(
        await s1Request(ctx, {
          action: 'getRemoteScriptStatus',
          method: 'GET',
          path: '/remote-scripts/status',
          params: {
            parentTaskId: input.parentTaskId,
            status: input.statuses,
            limit: input.limit,
            cursor: input.cursor,
          },
          mutating: false,
        })
      ),
  },

  getRemoteScriptResults: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.getRemoteScriptResults,
    input: GetRemoteScriptResultsInputSchema,
    handler: async (ctx, input: GetRemoteScriptResultsInput) => {
      const { body } = await fetchResultLinks(
        ctx,
        'getRemoteScriptResults',
        input.taskIds,
        input.computerNames
      );
      return body;
    },
  },

  downloadRemoteScriptResults: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.downloadRemoteScriptResults,
    input: DownloadRemoteScriptResultsInputSchema,
    handler: async (ctx, input: DownloadRemoteScriptResultsInput) => {
      const { links } = await fetchResultLinks(ctx, 'downloadRemoteScriptResults', [input.taskId]);
      const link =
        links.find((item) => item.taskId === input.taskId) ??
        (links.length === 1 && !links[0].taskId ? links[0] : undefined);
      if (!link?.downloadUrl) {
        throw new Error(`Download URL for script results of task id [${input.taskId}] not found`);
      }
      const file = await downloadFile(ctx, {
        action: 'downloadRemoteScriptResults',
        link: link.downloadUrl,
        fallbackName: link.fileName ?? '',
      });
      // the pre-signed link (it embeds a temporary security token) is not returned: the file content is, and workflow history would keep the link
      return { ...file, taskId: input.taskId };
    },
  },

  runScriptAndWait: {
    isTool: true,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.runScriptAndWait,
    input: RunScriptAndWaitInputSchema,
    handler: async (ctx, input: RunScriptAndWaitInput) => {
      const { waitSeconds = 120, ...script } = input;
      const started = await runScript(ctx, 'runScriptAndWait', script);
      const data = (started.data ?? {}) as {
        parentTaskId?: string | null;
        pending?: boolean;
        pendingExecutionId?: string | null;
      };
      const parentTaskId = data.parentTaskId ?? null;
      if (data.pending || !parentTaskId) {
        return {
          parentTaskId,
          pending: true,
          pendingExecutionId: data.pendingExecutionId ?? null,
          timedOut: false,
          tasks: [],
          downloadLinks: [],
        };
      }
      const maxPolls = Math.max(1, Math.ceil((waitSeconds * 1000) / SCRIPT_POLL_INTERVAL_MS));
      let tasks: Array<{ id?: string; status?: string }> = [];
      for (let poll = 0; poll < maxPolls; poll++) {
        await timers.sleep(SCRIPT_POLL_INTERVAL_MS);
        tasks = toListResult(
          await s1Request(ctx, {
            action: 'runScriptAndWait',
            method: 'GET',
            path: '/remote-scripts/status',
            params: { parentTaskId, limit: 1000 },
            mutating: false,
          })
        ).data as typeof tasks;
        const finished =
          tasks.length > 0 &&
          tasks.every((task) => SCRIPT_FINAL_STATUSES.includes(String(task.status)));
        if (finished) {
          const taskIds = tasks.map((task) => String(task.id)).filter((id) => id !== 'undefined');
          const { links } = taskIds.length
            ? await fetchResultLinks(ctx, 'runScriptAndWait', taskIds)
            : { links: [] };
          return {
            parentTaskId,
            pending: false,
            pendingExecutionId: null,
            timedOut: false,
            tasks,
            downloadLinks: links,
          };
        }
      }
      return {
        parentTaskId,
        pending: false,
        pendingExecutionId: null,
        timedOut: true,
        tasks,
        downloadLinks: [],
      };
    },
  },
};
