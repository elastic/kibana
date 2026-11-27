/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { DEVICE_ID_PATTERN, SCOPES } from './constants';
import { falconRequest, lookupResult, offsetPage, resourcesOf } from './client';
import type { ItemOutcome } from './format';
import { sentOutcomes, withContainmentState } from './format';
import type {
  AddHostGroupMembersInput,
  GetAgentDetailsInput,
  GetAgentOnlineStatusInput,
  HostActionInput,
  HostGroupMembersInput,
  ListHostGroupsInput,
  SearchDevicesInput,
} from './types';
import {
  AddHostGroupMembersInputSchema,
  GetAgentDetailsInputSchema,
  GetAgentOnlineStatusInputSchema,
  HostActionInputSchema,
  HostGroupMembersInputSchema,
  ListHostGroupsInputSchema,
  SearchDevicesInputSchema,
} from './types';

/** Containment states in which a host already is where the action would take it. */
const ALREADY_IN_STATE: Record<'contain' | 'lift_containment', Record<string, string>> = {
  contain: { contained: 'Already contained.', containing: 'Containment is already pending.' },
  lift_containment: { normal: 'Not contained.', lift_pending: 'Lift is already pending.' },
};

/**
 * Contain or lift containment. The hosts' containment state is read first: a host already in the
 * requested state is skipped and an unknown id is notFound, so neither fails the call. Only the
 * other hosts are sent. Idempotent in effect, so 5xx is retried like a read.
 */
const hostAction = async (
  ctx: ActionContext,
  actionName: 'contain' | 'lift_containment',
  { ids, actionParameters }: HostActionInput
) => {
  const unique = [...new Set(ids)];
  const current = await falconRequest(ctx, {
    method: 'POST',
    path: '/devices/entities/devices/v2',
    data: { ids: unique },
    retryServerErrors: true,
    allowNotFound: true,
    scope: SCOPES.hostsRead,
  });
  const states = new Map<string, string>();
  for (const host of resourcesOf(current.data).map(withContainmentState)) {
    const record = host as { device_id?: unknown; containment_state?: unknown };
    if (typeof record?.device_id === 'string') {
      states.set(record.device_id.toLowerCase(), String(record.containment_state));
    }
  }
  const outcomes = new Map<string, ItemOutcome>();
  const send: string[] = [];
  for (const id of unique) {
    const state = states.get(id.toLowerCase());
    const reason = state === undefined ? undefined : ALREADY_IN_STATE[actionName][state];
    if (state === undefined) {
      outcomes.set(id, { id, status: 'notFound' });
    } else if (reason !== undefined) {
      outcomes.set(id, { id, status: 'skipped', reason });
    } else {
      send.push(id);
    }
  }
  if (send.length === 0) {
    return { resources: [], errors: [], outcomes: unique.flatMap((id) => outcomes.get(id) ?? []) };
  }
  const response = await falconRequest(ctx, {
    method: 'POST',
    path: '/devices/entities/devices-actions/v2',
    params: { action_name: actionName },
    data: {
      ids: send,
      ...(actionParameters
        ? {
            action_parameters: Object.entries(actionParameters).map(([name, value]) => ({
              name,
              value,
            })),
          }
        : {}),
    },
    retryServerErrors: true,
    allowNotFound: true,
    scope: SCOPES.hostsWrite,
  });
  const result = lookupResult(response);
  for (const outcome of sentOutcomes(send, result.errors)) {
    outcomes.set(outcome.id, outcome);
  }
  return { ...result, outcomes: unique.flatMap((id) => outcomes.get(id) ?? []) };
};

/**
 * The host filter of a host group action, built by the connector from device ids only:
 * every id is checked against the 32-hex device id format first, so nothing else can reach
 * the filter. Duplicates are sent once.
 */
export const buildDeviceIdFilter = (hostIds: string[]): string => {
  const invalid = hostIds.find((id) => !DEVICE_ID_PATTERN.test(id));
  if (invalid !== undefined || hostIds.length === 0) {
    throw new Error('Every host id must be a Falcon device id of 32 hexadecimal characters.');
  }
  const unique = [...new Set(hostIds.map((id) => id.toLowerCase()))];
  return `device_id:[${unique.map((id) => `'${id}'`).join(',')}]`;
};

/** Add or remove host group members: idempotent in effect, so 5xx is retried like a read. */
const hostGroupMembers = async (
  ctx: ActionContext,
  actionName: 'add-hosts' | 'remove-hosts',
  input: HostGroupMembersInput & { disable_hostname_check?: boolean }
) => {
  const response = await falconRequest(ctx, {
    method: 'POST',
    path: '/devices/entities/host-group-actions/v1',
    params: { action_name: actionName, disable_hostname_check: input.disable_hostname_check },
    data: {
      ids: [input.group_id],
      action_parameters: [{ name: 'filter', value: buildDeviceIdFilter(input.host_ids) }],
    },
    retryServerErrors: true,
    allowNotFound: true,
    scope: SCOPES.hostGroupsWrite,
  });
  const result = lookupResult(response);
  return { ...result, outcomes: sentOutcomes([...new Set(input.host_ids)], result.errors) };
};

export const hostActions: ConnectorSpec['actions'] = {
  getAgentDetails: {
    isTool: true,
    scope: 'read',
    description:
      'Get hosts by Falcon device id: hostname, platform, OS, sensor, IPs, groups and containment_state (normal, containing, contained, lift_pending). Unknown ids are listed in errors.',
    input: GetAgentDetailsInputSchema,
    handler: async (ctx, { ids }: GetAgentDetailsInput) => {
      const response = await falconRequest(ctx, {
        method: 'POST',
        path: '/devices/entities/devices/v2',
        data: { ids },
        retryServerErrors: true,
        allowNotFound: true,
        scope: SCOPES.hostsRead,
      });
      const result = lookupResult(response);
      return { ...result, resources: result.resources.map(withContainmentState) };
    },
  },
  searchDevices: {
    isTool: true,
    scope: 'read',
    description:
      "Search hosts with an FQL filter such as hostname:'web-01'. Returns device ids and next_offset; read details with getAgentDetails.",
    input: SearchDevicesInputSchema,
    handler: async (ctx, input: SearchDevicesInput) =>
      offsetPage(ctx, {
        path: '/devices/queries/devices/v1',
        params: {
          filter: input.filter,
          limit: input.limit,
          offset: input.offset,
          sort: input.sort,
        },
        scope: SCOPES.hostsRead,
      }),
  },
  getAgentOnlineStatus: {
    isTool: true,
    scope: 'read',
    description: 'Get the sensor state (online, offline or unknown) of up to 100 device ids.',
    input: GetAgentOnlineStatusInputSchema,
    handler: async (ctx, { ids }: GetAgentOnlineStatusInput) => {
      const response = await falconRequest(ctx, {
        method: 'GET',
        path: '/devices/entities/online-state/v1',
        params: { ids },
        retryServerErrors: true,
        allowNotFound: true,
        scope: SCOPES.hostsRead,
      });
      return lookupResult(response);
    },
  },
  containHost: {
    isTool: true,
    scope: 'destroy',
    description:
      'Network-contain hosts. Returns outcomes per id: requested, skipped when already contained or containing, or notFound. Poll getAgentDetails until containment_state is contained.',
    input: HostActionInputSchema,
    handler: async (ctx, input: HostActionInput) => hostAction(ctx, 'contain', input),
  },
  liftContainment: {
    isTool: false,
    scope: 'destroy',
    description:
      'Lift network containment. Returns outcomes per id: requested, skipped when already normal or lift_pending, or notFound.',
    input: HostActionInputSchema,
    handler: async (ctx, input: HostActionInput) => hostAction(ctx, 'lift_containment', input),
  },
  listHostGroups: {
    isTool: true,
    scope: 'read',
    description:
      'List host groups (id, name, group_type, assignment_rule) with an optional FQL filter. Returns one page and next_offset.',
    input: ListHostGroupsInputSchema,
    handler: async (ctx, input: ListHostGroupsInput) =>
      offsetPage(ctx, {
        path: '/devices/combined/host-groups/v1',
        params: {
          filter: input.filter,
          limit: input.limit,
          offset: input.offset,
          sort: input.sort,
        },
        scope: SCOPES.hostGroupsRead,
      }),
  },
  addHostGroupMembers: {
    isTool: false,
    scope: 'destroy',
    description:
      "Add up to 100 device ids to a static host group; the group decides the hosts' policies. Returns the group and outcomes per host.",
    input: AddHostGroupMembersInputSchema,
    handler: async (ctx, input: AddHostGroupMembersInput) =>
      hostGroupMembers(ctx, 'add-hosts', input),
  },
  removeHostGroupMembers: {
    isTool: false,
    scope: 'destroy',
    description:
      'Remove up to 100 device ids from a static host group; the hosts lose its policies. Returns the group and outcomes per host.',
    input: HostGroupMembersInputSchema,
    handler: async (ctx, input: HostGroupMembersInput) =>
      hostGroupMembers(ctx, 'remove-hosts', input),
  },
};
