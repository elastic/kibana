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
  assertApplied,
  describeBody,
  downloadFile,
  redactFields,
  requireIds,
  s1Request,
  toListResult,
  withAdditionalFilters,
} from './client';
import { ACTION_DESCRIPTIONS } from './descriptions';
import { ACTIVITY_FILTER_NAMES, AGENT_FILTER_NAMES } from './filter_names';
import {
  AbortScanInputSchema,
  BroadcastMessageInputSchema,
  DownloadAgentFileInputSchema,
  FetchAgentFilesInputSchema,
  GetActivitiesInputSchema,
  GetAgentsInputSchema,
  GetInstalledApplicationsInputSchema,
  InitiateScanInputSchema,
  IsolateHostInputSchema,
  MoveAgentInputSchema,
  ReleaseHostInputSchema,
  ShutdownAgentInputSchema,
} from './agent_types';
import type {
  AbortScanInput,
  BroadcastMessageInput,
  DownloadAgentFileInput,
  FetchAgentFilesInput,
  GetActivitiesInput,
  GetAgentsInput,
  GetInstalledApplicationsInput,
  InitiateScanInput,
  IsolateHostInput,
  MoveAgentInput,
  ReleaseHostInput,
  ShutdownAgentInput,
} from './agent_types';

const EMPTY_AGENT_IDS =
  'agentIds must list at least one agent id (an empty filter would target every agent)';

interface AgentState {
  id?: string;
  networkStatus?: string;
  groupId?: string;
}

/** Ids per agent read: the ids go into a query string, which gateways reject above about 8 KB. */
const AGENT_READ_BATCH_SIZE = 300;

interface AgentPartition {
  /** ids the vendor request is sent for */
  requested: string[];
  /** ids already in the target state */
  skipped: string[];
  /** ids the agent read did not return */
  notFound: string[];
}

/** Reads the agents by id and splits the ids into requested, skipped (already in the target state) and notFound. */
const partitionAgents = async (
  ctx: ActionContext,
  action: string,
  agentIds: string[],
  inTargetState: (agent: AgentState) => boolean
): Promise<AgentPartition> => {
  const ids = [...new Set(agentIds)];
  const agents = new Map<string, AgentState>();
  for (let start = 0; start < ids.length; start += AGENT_READ_BATCH_SIZE) {
    const batch = ids.slice(start, start + AGENT_READ_BATCH_SIZE);
    const lookup = toListResult(
      await s1Request(ctx, {
        action,
        method: 'GET',
        path: '/agents',
        params: { ids: batch, limit: batch.length },
        mutating: false,
      })
    );
    if (lookup.errors) {
      // a failed lookup is not "no match": report SentinelOne's error so the operator fixes the lookup, not the ids
      throw new Error(
        `SentinelOne ${action} could not read the agents: ${describeBody({
          errors: lookup.errors,
        })}`
      );
    }
    for (const agent of lookup.data as AgentState[]) {
      agents.set(String(agent.id), agent);
    }
  }
  const partition: AgentPartition = { requested: [], skipped: [], notFound: [] };
  for (const id of ids) {
    const agent = agents.get(id);
    if (!agent) {
      partition.notFound.push(id);
    } else if (inTargetState(agent)) {
      partition.skipped.push(id);
    } else {
      partition.requested.push(id);
    }
  }
  // ids that are already in the target state are a success; ids that do not exist at all must not look like one
  if (partition.requested.length === 0 && partition.skipped.length === 0) {
    const shown = ids.slice(0, 20).join(', ');
    throw new Error(
      `SentinelOne ${action} found none of the agents: ${shown}${
        ids.length > 20 ? ` (+${ids.length - 20})` : ''
      }`
    );
  }
  return partition;
};

/** Isolate/release share one flow: read the agents, skip those already in the target state, act on the rest. */
const changeNetworkState = async (
  ctx: ActionContext,
  action: 'isolateHost' | 'releaseHost',
  agentIds: string[]
) => {
  const isolating = action === 'isolateHost';
  const partition = await partitionAgents(
    ctx,
    action,
    requireIds(agentIds, EMPTY_AGENT_IDS),
    (agent) =>
      isolating
        ? agent.networkStatus === 'disconnected' || agent.networkStatus === 'disconnecting'
        : agent.networkStatus === 'connected' || agent.networkStatus === 'connecting'
  );
  if (partition.requested.length === 0) {
    return { data: { affected: 0 }, ...partition };
  }
  const body = await s1Request(ctx, {
    action,
    method: 'POST',
    path: isolating ? '/agents/actions/disconnect' : '/agents/actions/connect',
    body: { filter: { ids: partition.requested } },
    mutating: true,
  });
  assertApplied(action, partition.requested, body);
  return { ...body, ...partition };
};

/** The agent bulk actions (scan, abort, shutdown, broadcast) all take an explicit ids filter. */
const agentBulkAction = async (
  ctx: ActionContext,
  action: string,
  path: string,
  agentIds: string[],
  data?: Record<string, unknown>
) => {
  const ids = requireIds(agentIds, EMPTY_AGENT_IDS);
  const body = await s1Request(ctx, {
    action,
    method: 'POST',
    path,
    body: { filter: { ids }, ...(data ? { data } : {}) },
    mutating: true,
  });
  return assertApplied(action, ids, body);
};

export const agentActions: ConnectorSpec['actions'] = {
  getAgents: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.getAgents,
    input: GetAgentsInputSchema,
    handler: async (ctx, input: GetAgentsInput) => {
      const { ip, additionalFilters, ...rest } = input;
      const params = withAdditionalFilters(
        'getAgents',
        { ...rest, networkInterfaceInetContains: ip },
        additionalFilters,
        AGENT_FILTER_NAMES
      );
      const result = toListResult(
        await s1Request(ctx, {
          action: 'getAgents',
          method: 'GET',
          path: '/agents',
          params,
          mutating: false,
        })
      );
      // licenseKey is the agent installation license; it is never needed to act on an agent.
      return { ...result, data: redactFields(result.data, ['licenseKey']) };
    },
  },

  isolateHost: {
    isTool: true,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.isolateHost,
    input: IsolateHostInputSchema,
    handler: async (ctx, input: IsolateHostInput) =>
      changeNetworkState(ctx, 'isolateHost', input.agentIds),
  },

  releaseHost: {
    isTool: true,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.releaseHost,
    input: ReleaseHostInputSchema,
    handler: async (ctx, input: ReleaseHostInput) =>
      changeNetworkState(ctx, 'releaseHost', input.agentIds),
  },

  initiateScan: {
    isTool: true,
    scope: 'write',
    description: ACTION_DESCRIPTIONS.initiateScan,
    input: InitiateScanInputSchema,
    handler: async (ctx, input: InitiateScanInput) =>
      agentBulkAction(ctx, 'initiateScan', '/agents/actions/initiate-scan', input.agentIds),
  },

  abortScan: {
    isTool: true,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.abortScan,
    input: AbortScanInputSchema,
    handler: async (ctx, input: AbortScanInput) =>
      agentBulkAction(ctx, 'abortScan', '/agents/actions/abort-scan', input.agentIds),
  },

  shutdownAgent: {
    isTool: false,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.shutdownAgent,
    input: ShutdownAgentInputSchema,
    handler: async (ctx, input: ShutdownAgentInput) =>
      agentBulkAction(ctx, 'shutdownAgent', '/agents/actions/shutdown', input.agentIds),
  },

  broadcastMessage: {
    isTool: true,
    scope: 'write',
    description: ACTION_DESCRIPTIONS.broadcastMessage,
    input: BroadcastMessageInputSchema,
    handler: async (ctx, input: BroadcastMessageInput) =>
      agentBulkAction(ctx, 'broadcastMessage', '/agents/actions/broadcast', input.agentIds, {
        message: input.message,
      }),
  },

  moveAgent: {
    isTool: false,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.moveAgent,
    input: MoveAgentInputSchema,
    handler: async (ctx, input: MoveAgentInput) => {
      const partition = await partitionAgents(
        ctx,
        'moveAgent',
        requireIds(input.agentIds, EMPTY_AGENT_IDS),
        (agent) => String(agent.groupId ?? '') === input.groupId
      );
      const ids = partition.requested;
      if (ids.length === 0) {
        return { data: { agentsMoved: 0 }, ...partition };
      }
      const body = await s1Request(ctx, {
        action: 'moveAgent',
        method: 'PUT',
        path: `/groups/${encodeURIComponent(input.groupId)}/move-agents`,
        body: { filter: { ids } },
        mutating: true,
      });
      const data = body.data as { agentsMoved?: unknown } | undefined;
      if (data?.agentsMoved === 0) {
        throw new Error(
          `SentinelOne did not apply moveAgent to ${ids.join(', ')}: SentinelOne moved 0 agents`
        );
      }
      return { ...assertApplied('moveAgent', ids, body), ...partition };
    },
  },

  fetchAgentFiles: {
    isTool: true,
    scope: 'write',
    description: ACTION_DESCRIPTIONS.fetchAgentFiles,
    input: FetchAgentFilesInputSchema,
    handler: async (ctx, input: FetchAgentFilesInput) => {
      const body = await s1Request(ctx, {
        action: 'fetchAgentFiles',
        method: 'POST',
        path: `/agents/${encodeURIComponent(input.agentId)}/actions/fetch-files`,
        body: { data: { files: input.files, password: input.zipPassCode } },
        mutating: true,
      });
      return assertApplied('fetchAgentFiles', [input.agentId], body);
    },
  },

  downloadAgentFile: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.downloadAgentFile,
    input: DownloadAgentFileInputSchema,
    handler: async (ctx, input: DownloadAgentFileInput) =>
      downloadFile(ctx, {
        action: 'downloadAgentFile',
        link: `/web/api/v2.1/agents/${encodeURIComponent(
          input.agentId
        )}/uploads/${encodeURIComponent(input.activityId)}`,
        fallbackName: `${input.agentId}-${input.activityId}.zip`,
      }),
  },

  getInstalledApplications: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.getInstalledApplications,
    input: GetInstalledApplicationsInputSchema,
    handler: async (ctx, input: GetInstalledApplicationsInput) =>
      toListResult(
        await s1Request(ctx, {
          action: 'getInstalledApplications',
          method: 'GET',
          path: '/agents/applications',
          params: { ids: requireIds(input.agentIds, EMPTY_AGENT_IDS) },
          mutating: false,
        })
      ),
  },

  getActivities: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.getActivities,
    input: GetActivitiesInputSchema,
    handler: async (ctx, input: GetActivitiesInput) => {
      const { additionalFilters, ...named } = input;
      return toListResult(
        await s1Request(ctx, {
          action: 'getActivities',
          method: 'GET',
          path: '/activities',
          params: withAdditionalFilters(
            'getActivities',
            named,
            additionalFilters,
            ACTIVITY_FILTER_NAMES
          ),
          mutating: false,
        })
      );
    },
  },
};
