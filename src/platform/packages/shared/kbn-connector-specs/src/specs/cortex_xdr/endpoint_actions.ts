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
  CortexXdrError,
  collectPages,
  endpointIdFilter,
  isConfirmed,
  notConfirmedError,
  pageInfo,
  pushFilter,
  toInteger,
  xdrPost,
} from './client';
import type { Filter } from './client';
import { ISOLATED_STATES, PAGE_SIZE, UNISOLATED_STATES } from './constants';
import {
  EndpointActionInputSchema,
  EndpointTagInputSchema,
  GetActionStatusInputSchema,
  GetDeviceControlViolationsInputSchema,
  GetEndpointsInputSchema,
  GetPolicyInputSchema,
} from './types';
import type {
  EndpointActionInput,
  EndpointTagInput,
  GetActionStatusInput,
  GetDeviceControlViolationsInput,
  GetEndpointsInput,
  GetPolicyInput,
} from './types';

interface EndpointRecord {
  endpoint_id?: string;
  is_isolated?: string;
  [key: string]: unknown;
}

interface EndpointsBody {
  reply?: { total_count?: number; result_count?: number; endpoints?: EndpointRecord[] };
}

interface ViolationsBody {
  reply?: { total_count?: number; result_count?: number; violations?: unknown[] };
}

const GET_ENDPOINT = '/endpoints/get_endpoint';

const getEndpoints = async (ctx: ActionContext, input: GetEndpointsInput) => {
  const filters: Filter[] = [];
  pushFilter(filters, 'endpoint_id_list', 'in', input.endpointIds);
  pushFilter(filters, 'hostname', 'in', input.hostnames);
  pushFilter(filters, 'ip_list', 'in', input.ipList);
  pushFilter(filters, 'platform', 'in', input.platform && [input.platform]);
  pushFilter(filters, 'isolate', 'in', input.isolate && [input.isolate]);
  pushFilter(filters, 'endpoint_status', 'in', input.endpointStatus);
  pushFilter(filters, 'scan_status', 'in', input.scanStatus);
  const sort =
    input.sortField || input.sortOrder
      ? { field: input.sortField ?? 'first_seen', keyword: input.sortOrder ?? 'DESC' }
      : undefined;
  const page = await collectPages<EndpointsBody>(ctx, {
    path: GET_ENDPOINT,
    requestData: { filters, ...(sort ? { sort } : {}) },
    searchFrom: input.searchFrom,
    maxResults: input.maxResults,
    itemsOf: (body) => body.reply?.endpoints,
    totalOf: (body) => body.reply?.total_count,
  });
  return {
    reply: {
      total_count: page.lastBody?.reply?.total_count,
      result_count: page.items.length,
      endpoints: page.items,
    },
    ...pageInfo(page),
  };
};

/**
 * Isolate and unisolate read the endpoints first and send the request only for ids that exist and
 * are not already in (or moving to) the target state.
 */
const changeIsolation =
  (route: '/endpoints/isolate' | '/endpoints/unisolate', skipStates: readonly string[]) =>
  async (ctx: ActionContext, input: EndpointActionInput) => {
    const page = await collectPages<EndpointsBody>(ctx, {
      path: GET_ENDPOINT,
      requestData: { filters: endpointIdFilter(input.endpointIds) },
      searchFrom: 0,
      maxResults: Math.max(PAGE_SIZE, input.endpointIds.length),
      itemsOf: (body) => body.reply?.endpoints,
      totalOf: (body) => body.reply?.total_count,
    });
    if (page.timedOut) {
      // A partial lookup would report endpoints that exist as notFound: send nothing.
      throw new CortexXdrError(
        `The endpoint lookup did not finish within the action's time budget, so nothing was sent to ${route}. Send fewer endpoint ids per call.`,
        undefined,
        false,
        true
      );
    }
    const known = new Map(
      (page.items as EndpointRecord[]).map((endpoint) => [endpoint.endpoint_id, endpoint])
    );
    const requested: string[] = [];
    const skipped: Array<{ endpointId: string; isIsolated: string }> = [];
    const notFound: string[] = [];
    for (const endpointId of new Set(input.endpointIds)) {
      const endpoint = known.get(endpointId);
      if (!endpoint) {
        notFound.push(endpointId);
      } else if (endpoint.is_isolated && skipStates.includes(endpoint.is_isolated)) {
        skipped.push({ endpointId, isIsolated: endpoint.is_isolated });
      } else {
        requested.push(endpointId);
      }
    }
    if (requested.length === 0 && skipped.length === 0) {
      throw new CortexXdrError(
        `Cortex XDR found none of the endpoint ids: ${notFound.join(
          ', '
        )}. Check the ids with getEndpoints.`
      );
    }
    if (requested.length === 0) {
      return { reply: null, requested, skipped, notFound };
    }
    const body = await xdrPost<{ reply?: unknown }>(
      ctx,
      route,
      {
        filters: endpointIdFilter(requested),
        ...(input.caseId ? { incident_id: input.caseId } : {}),
      },
      { stateChanging: true }
    );
    return { reply: body.reply ?? null, requested, skipped, notFound };
  };

const endpointAction =
  (route: '/endpoints/scan' | '/endpoints/abort_scan') =>
  async (ctx: ActionContext, input: EndpointActionInput) =>
    xdrPost(
      ctx,
      route,
      {
        filters: endpointIdFilter(input.endpointIds),
        ...(input.caseId ? { incident_id: input.caseId } : {}),
      },
      { stateChanging: true }
    );

const changeTag =
  (route: '/tags/agents/assign' | '/tags/agents/remove') =>
  async (ctx: ActionContext, input: EndpointTagInput) => {
    const body = await xdrPost(
      ctx,
      route,
      { filters: endpointIdFilter(input.endpointIds), tag: input.tag },
      { stateChanging: true }
    );
    if (!isConfirmed(body)) throw notConfirmedError(body);
    return { success: true, tag: input.tag, endpointIds: input.endpointIds };
  };

export const endpointActions: ConnectorSpec['actions'] = {
  getEndpoints: {
    isTool: true,
    scope: 'read',
    description:
      'Find Cortex XDR endpoints by id, hostname, IP, platform, isolation, connection or scan status (filters combine with AND). Returns reply.endpoints[] with endpoint_id, is_isolated, scan_status and tags. Use it to get the ids other actions take and to confirm their effect.',
    input: GetEndpointsInputSchema,
    handler: async (ctx, input: GetEndpointsInput) => getEndpoints(ctx, input),
  },
  isolateEndpoint: {
    isTool: false,
    scope: 'destroy',
    description:
      'Network-isolate endpoints. Ids already isolated are returned in skipped and unknown ids in notFound; only the rest are sent. Returns reply.action_id (null when nothing was sent) for getActionStatus.',
    input: EndpointActionInputSchema,
    handler: async (ctx, input: EndpointActionInput) =>
      changeIsolation('/endpoints/isolate', ISOLATED_STATES)(ctx, input),
  },
  unisolateEndpoint: {
    isTool: false,
    scope: 'destroy',
    description:
      'Release the network isolation of endpoints. Ids already released are returned in skipped and unknown ids in notFound; only the rest are sent. Returns reply.action_id (null when nothing was sent) for getActionStatus.',
    input: EndpointActionInputSchema,
    handler: async (ctx, input: EndpointActionInput) =>
      changeIsolation('/endpoints/unisolate', UNISOLATED_STATES)(ctx, input),
  },
  getActionStatus: {
    isTool: true,
    scope: 'read',
    description:
      'Get the state of an asynchronous response action on each endpoint from its action id. Returns reply.data mapping endpoint ids to states such as PENDING, IN_PROGRESS, COMPLETED_SUCCESSFULLY, FAILED or TIMEOUT. Call again until every state is final.',
    input: GetActionStatusInputSchema,
    handler: async (ctx, input: GetActionStatusInput) =>
      xdrPost(ctx, '/actions/get_action_status', { group_action_id: toInteger(input.actionId) }),
  },
  scanEndpoint: {
    isTool: true,
    scope: 'write',
    description:
      'Start a malware scan on the given endpoints. Returns reply.action_id for getActionStatus and reply.endpoints_count (unknown ids are not listed); scan_status in getEndpoints shows progress. Cancel with cancelScan.',
    input: EndpointActionInputSchema,
    handler: async (ctx, input: EndpointActionInput) =>
      endpointAction('/endpoints/scan')(ctx, input),
  },
  cancelScan: {
    isTool: true,
    scope: 'destroy',
    description:
      'Cancel a pending or running malware scan on the given endpoints. Returns reply.action_id for getActionStatus and reply.endpoints_count (unknown ids are not listed).',
    input: EndpointActionInputSchema,
    handler: async (ctx, input: EndpointActionInput) =>
      endpointAction('/endpoints/abort_scan')(ctx, input),
  },
  getPolicy: {
    isTool: true,
    scope: 'read',
    description:
      'Get the name of the prevention policy applied to one endpoint (reply.policy_name).',
    input: GetPolicyInputSchema,
    handler: async (ctx, input: GetPolicyInput) =>
      xdrPost(ctx, '/endpoints/get_policy', { endpoint_id: input.endpointId }),
  },
  addEndpointTag: {
    isTool: true,
    scope: 'write',
    description:
      'Add a tag to endpoints, for example to mark hosts under investigation. Returns success true once Cortex XDR confirms the request as a whole (unknown ids are not reported); getEndpoints shows the tags. Undo with removeEndpointTag.',
    input: EndpointTagInputSchema,
    handler: async (ctx, input: EndpointTagInput) => changeTag('/tags/agents/assign')(ctx, input),
  },
  removeEndpointTag: {
    isTool: true,
    scope: 'destroy',
    description:
      'Remove a tag from endpoints. Returns success true once Cortex XDR confirms the request as a whole (unknown ids are not reported).',
    input: EndpointTagInputSchema,
    handler: async (ctx, input: EndpointTagInput) => changeTag('/tags/agents/remove')(ctx, input),
  },
  getDeviceControlViolations: {
    isTool: true,
    scope: 'read',
    description:
      'List device control violations (blocked USB and other removable devices) by endpoint, hostname, type and time range. Returns reply.violations[] and reply.total_count.',
    input: GetDeviceControlViolationsInputSchema,
    handler: async (ctx, input: GetDeviceControlViolationsInput) => {
      const filters: Filter[] = [];
      pushFilter(filters, 'endpoint_id_list', 'in', input.endpointIds);
      pushFilter(filters, 'hostname', 'in', input.hostnames);
      pushFilter(filters, 'type', 'in', input.types);
      pushFilter(filters, 'timestamp', 'gte', input.timestampFrom);
      pushFilter(filters, 'timestamp', 'lte', input.timestampTo);
      const page = await collectPages<ViolationsBody>(ctx, {
        path: '/device_control/get_violations',
        requestData: { filters },
        searchFrom: input.searchFrom,
        maxResults: input.maxResults,
        itemsOf: (body) => body.reply?.violations,
        totalOf: (body) => body.reply?.total_count,
      });
      return {
        reply: {
          total_count: page.lastBody?.reply?.total_count,
          result_count: page.items.length,
          violations: page.items,
        },
        ...pageInfo(page),
      };
    },
  },
};
