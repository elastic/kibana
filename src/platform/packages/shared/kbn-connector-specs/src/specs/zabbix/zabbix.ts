/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Zabbix Connector
 *
 * Zabbix exposes a single JSON-RPC 2.0 endpoint (`api_jsonrpc.php`) for everything —
 * there is no REST-style resource hierarchy. Every action here POSTs a
 * `{jsonrpc, method, params, id}` envelope to that one endpoint and inspects the
 * response body for an `error` property, since Zabbix returns HTTP 200 even when
 * the RPC call itself failed (invalid params, permission denied, etc).
 *
 * https://www.zabbix.com/documentation/current/en/manual/api
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosError } from 'axios';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { UISchemas } from '../../connector_spec';
import {
  ZABBIX_SEVERITIES,
  ZABBIX_TAG_FILTER_OPERATORS,
  GetProblemsInputSchema,
  GetEventInputSchema,
  AcknowledgeProblemInputSchema,
  UnacknowledgeProblemInputSchema,
  AddProblemMessageInputSchema,
  CloseProblemInputSchema,
  ChangeProblemSeverityInputSchema,
  SuppressProblemInputSchema,
  UnsuppressProblemInputSchema,
  CreateMaintenanceInputSchema,
  UpdateMaintenanceInputSchema,
  DeleteMaintenanceInputSchema,
  GetMaintenancesInputSchema,
  GetHostsInputSchema,
  DisableHostInputSchema,
  EnableHostInputSchema,
  DisableTriggerInputSchema,
  EnableTriggerInputSchema,
  GetItemHistoryInputSchema,
} from './types';
import type {
  ZabbixSeverity,
  ZabbixTagFilter,
  ZabbixTagFilterOperator,
  GetProblemsInput,
  GetEventInput,
  AcknowledgeProblemInput,
  UnacknowledgeProblemInput,
  AddProblemMessageInput,
  CloseProblemInput,
  ChangeProblemSeverityInput,
  SuppressProblemInput,
  UnsuppressProblemInput,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  DeleteMaintenanceInput,
  GetMaintenancesInput,
  GetHostsInput,
  DisableHostInput,
  EnableHostInput,
  DisableTriggerInput,
  EnableTriggerInput,
  GetItemHistoryInput,
  ZabbixRpcResponse,
} from './types';

const buildRpcUrl = (ctx: ActionContext): string => {
  const baseUrl = ((ctx.config?.baseUrl as string | undefined) ?? '').trim();
  if (!baseUrl) {
    throw new Error('Zabbix connector is missing the required base URL configuration field.');
  }
  return `${baseUrl.replace(/\/+$/, '')}/api_jsonrpc.php`;
};

function formatZabbixError(method: string, error: unknown): Error {
  const err = error as AxiosError;
  return new Error(
    `Zabbix ${method} request failed (status ${err.response?.status ?? 'unknown'}): ${err.message}`
  );
}

/**
 * Every Zabbix API call — success or failure — comes back as HTTP 200 with a
 * `{jsonrpc, result, id}` or `{jsonrpc, error, id}` body, so the RPC-level error has to be
 * checked explicitly; a non-2xx HTTP status only happens for transport-level failures
 * (network error, wrong URL, proxy auth) ahead of the RPC layer ever running.
 */
async function zabbixRequest<T>(ctx: ActionContext, method: string, params: unknown): Promise<T> {
  const url = buildRpcUrl(ctx);
  const response = await ctx.client
    .post<ZabbixRpcResponse<T>>(url, { jsonrpc: '2.0', method, params, id: 1 })
    .catch((error: unknown) => {
      throw formatZabbixError(method, error);
    });
  if (response.data.error) {
    const { message, data } = response.data.error;
    throw new Error(`Zabbix API error calling ${method}: ${message}${data ? ` — ${data}` : ''}`);
  }
  return response.data.result as T;
}

const severityToNumber = (severity: ZabbixSeverity): number => ZABBIX_SEVERITIES.indexOf(severity);

const tagFilterOperatorToNumber = (operator: ZabbixTagFilterOperator): number =>
  ZABBIX_TAG_FILTER_OPERATORS.indexOf(operator);

const buildTagFilters = (tags?: ZabbixTagFilter[]): Array<Record<string, unknown>> | undefined =>
  tags?.map((t) => ({
    tag: t.tag,
    value: t.value ?? '',
    operator: tagFilterOperatorToNumber(t.operator ?? 'contains'),
  }));

/**
 * Wraps `event.acknowledge`, the single endpoint Zabbix uses for every problem-lifecycle
 * write (close, (un)acknowledge, add message, change severity, (un)suppress) via a bitmask
 * `action` field. Each named connector action below calls this with its own fixed bit so the
 * agent never has to construct the bitmask itself.
 */
const acknowledgeEvent = async (
  ctx: ActionContext,
  eventIds: string[],
  action: number,
  extra: Record<string, unknown> = {}
): Promise<{ eventids: string[] }> =>
  zabbixRequest<{ eventids: string[] }>(ctx, 'event.acknowledge', {
    eventids: eventIds,
    action,
    ...extra,
  });

const buildOneTimeTimeperiod = (activeSince: number, activeTill: number) => [
  {
    timeperiod_type: 0,
    start_date: activeSince,
    period: activeTill - activeSince,
  },
];

export const Zabbix: ConnectorSpec = {
  metadata: {
    id: '.zabbix',
    displayName: 'Zabbix',
    description: i18n.translate('core.kibanaConnectorSpecs.zabbix.metadata.description', {
      defaultMessage:
        'Read and triage Zabbix problems and events, manage maintenance windows, and enable or disable hosts and triggers',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    // A new connector type must reach Production-NonCanary before it can declare
    // user-facing features. Ship ['agentBuilder'] first, then add 'workflows'
    // and others in a follow-up PR.
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'bearer',
        isRecommended: true,
        defaults: {},
        overrides: {
          meta: {
            token: {
              label: i18n.translate('core.kibanaConnectorSpecs.zabbix.auth.bearer.token.label', {
                defaultMessage: 'API token',
              }),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.zabbix.auth.bearer.token.helpText',
                {
                  defaultMessage:
                    'A Zabbix API token (Users > API tokens in the Zabbix frontend) or a session token from the user.login method. Sent as a Bearer Authorization header, which requires Zabbix 6.4 or later. Use an Admin or Super admin account if this connector will manage maintenance windows or enable/disable hosts and triggers — other actions work with any user type.',
                }
              ),
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      baseUrl: UISchemas.url('https://zabbix.example.com')
        .describe('Zabbix frontend base URL')
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.zabbix.config.baseUrl.label', {
            defaultMessage: 'Zabbix URL',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.zabbix.config.baseUrl.helpText', {
            defaultMessage:
              'The base URL of your self-hosted Zabbix frontend, e.g. https://zabbix.example.com — do not include /api_jsonrpc.php. Must be network-reachable from Kibana.',
          }),
          validate: { allowedHosts: true },
        }),
    })
  ),

  validateUrls: {
    fields: ['baseUrl'],
  },

  actions: {
    getProblems: {
      isTool: true,
      description:
        "List current Zabbix problems (unresolved trigger-generated events), optionally filtered by host, host group, severity, tags, acknowledgement, or suppression state. This is the primary read path for triage. Pass recent: true to also include problems resolved within the server's configured display window — for problems resolved further in the past, use getEvent with known event IDs instead.",
      input: GetProblemsInputSchema,
      handler: async (ctx, input: GetProblemsInput) => {
        const params: Record<string, unknown> = {
          output: 'extend',
          selectTags: 'extend',
          selectAcknowledges: 'extend',
          selectSuppressionData: 'extend',
          sortfield: ['eventid'],
          sortorder: 'DESC',
          limit: input.limit ?? 100,
        };
        if (input.eventIds) params.eventids = input.eventIds;
        if (input.hostIds) params.hostids = input.hostIds;
        if (input.groupIds) params.groupids = input.groupIds;
        if (input.severities) params.severities = input.severities.map(severityToNumber);
        if (input.tags) params.tags = buildTagFilters(input.tags);
        if (input.acknowledged !== undefined) params.acknowledged = input.acknowledged;
        if (input.suppressed !== undefined) params.suppressed = input.suppressed;
        if (input.recent !== undefined) params.recent = input.recent;
        const problems = await zabbixRequest(ctx, 'problem.get', params);
        return { problems };
      },
    },

    getEvent: {
      isTool: true,
      description:
        'Fetch full details for one or more Zabbix events by ID, including already-resolved ones (unlike getProblems, which only returns unresolved or recently-resolved problems). Returns the problem name, host, tags, and full acknowledgement/update history — use this to enrich a decision with complete context.',
      input: GetEventInputSchema,
      handler: async (ctx, input: GetEventInput) => {
        const events = await zabbixRequest(ctx, 'event.get', {
          output: 'extend',
          eventids: input.eventIds,
          selectTags: 'extend',
          selectAcknowledges: 'extend',
          selectHosts: ['hostid', 'host', 'name'],
          selectSuppressionData: 'extend',
        });
        return { events };
      },
    },

    acknowledgeProblem: {
      isTool: true,
      description:
        'Acknowledge one or more Zabbix problems, marking them as being handled. This is the primary triage write into Zabbix. Already-acknowledged problems are left unchanged. Use addProblemMessage separately to attach investigation notes.',
      input: AcknowledgeProblemInputSchema,
      handler: async (ctx, input: AcknowledgeProblemInput) =>
        acknowledgeEvent(ctx, input.eventIds, 2),
    },

    unacknowledgeProblem: {
      isTool: true,
      description:
        'Remove the acknowledgement from one or more Zabbix problems, returning them to the open/unacknowledged queue — for when a problem was acknowledged or closed out too early.',
      input: UnacknowledgeProblemInputSchema,
      handler: async (ctx, input: UnacknowledgeProblemInput) =>
        acknowledgeEvent(ctx, input.eventIds, 16),
    },

    addProblemMessage: {
      isTool: true,
      description:
        "Attach a note to one or more Zabbix problems' acknowledgement/update trail, without changing their acknowledged/closed state. Use this so automated triage context and investigation findings land where operators already look.",
      input: AddProblemMessageInputSchema,
      handler: async (ctx, input: AddProblemMessageInput) =>
        acknowledgeEvent(ctx, input.eventIds, 4, { message: input.message }),
    },

    closeProblem: {
      isTool: true,
      description:
        'Manually close one or more Zabbix problems that have been remediated. The underlying trigger must have manual close enabled, or Zabbix rejects the request — already-resolved problems are left unchanged.',
      input: CloseProblemInputSchema,
      handler: async (ctx, input: CloseProblemInput) => acknowledgeEvent(ctx, input.eventIds, 1),
    },

    changeProblemSeverity: {
      isTool: true,
      description:
        "Re-rank one or more Zabbix problems' severity (e.g. raise a warning to high) so a workflow can escalate a problem it judges more urgent than the trigger's configured severity.",
      input: ChangeProblemSeverityInputSchema,
      handler: async (ctx, input: ChangeProblemSeverityInput) =>
        acknowledgeEvent(ctx, input.eventIds, 8, { severity: severityToNumber(input.severity) }),
    },

    suppressProblem: {
      isTool: true,
      description:
        'Suppress (mute) one or more Zabbix problems so they stop triggering notifications for a time window, e.g. during known, unplanned work. Pair with unsuppressProblem to resume alerting early, or let suppressUntil expire naturally.',
      input: SuppressProblemInputSchema,
      handler: async (ctx, input: SuppressProblemInput) =>
        acknowledgeEvent(ctx, input.eventIds, 32, { suppress_until: input.suppressUntil ?? 0 }),
    },

    unsuppressProblem: {
      isTool: true,
      description:
        'Resume normal alerting on one or more previously-suppressed Zabbix problems, ending the mute early instead of waiting for it to expire.',
      input: UnsuppressProblemInputSchema,
      handler: async (ctx, input: UnsuppressProblemInput) =>
        acknowledgeEvent(ctx, input.eventIds, 64),
    },

    createMaintenance: {
      isTool: true,
      description:
        'Open a one-time Zabbix maintenance window over the given hosts or host groups for a time range, so planned work does not page anyone. Returns the new maintenance ID. By default this only suppresses problem notifications (data collection continues); set withDataCollection: false to stop data collection entirely.',
      input: CreateMaintenanceInputSchema,
      handler: async (ctx, input: CreateMaintenanceInput) => {
        const withDataCollection = input.withDataCollection !== false;
        const params: Record<string, unknown> = {
          name: input.name,
          active_since: input.activeSince,
          active_till: input.activeTill,
          maintenance_type: withDataCollection ? 0 : 1,
          timeperiods: buildOneTimeTimeperiod(input.activeSince, input.activeTill),
        };
        if (input.description) params.description = input.description;
        if (input.hostIds) params.hosts = input.hostIds.map((hostid) => ({ hostid }));
        if (input.groupIds) params.groups = input.groupIds.map((groupid) => ({ groupid }));
        if (input.tags && withDataCollection) {
          params.tags_evaltype = 0;
          params.tags = input.tags.map((t) => ({
            tag: t.tag,
            operator: t.matchExactly ? 0 : 2,
            value: t.value ?? '',
          }));
        }
        return zabbixRequest(ctx, 'maintenance.create', params);
      },
    },

    updateMaintenance: {
      isTool: true,
      description:
        'Adjust an existing Zabbix maintenance window — rename it, change its target hosts/groups, or extend/shorten its time range — so a workflow can stretch a window when planned work runs long. Only the fields provided are changed; provide activeSince and activeTill together to change the time range.',
      input: UpdateMaintenanceInputSchema,
      handler: async (ctx, input: UpdateMaintenanceInput) => {
        const params: Record<string, unknown> = { maintenanceid: input.maintenanceId };
        if (input.name !== undefined) params.name = input.name;
        if (input.description !== undefined) params.description = input.description;
        if (input.hostIds !== undefined) {
          params.hosts = input.hostIds.map((hostid) => ({ hostid }));
        }
        if (input.groupIds !== undefined) {
          params.groups = input.groupIds.map((groupid) => ({ groupid }));
        }
        if (input.activeSince !== undefined && input.activeTill !== undefined) {
          params.active_since = input.activeSince;
          params.active_till = input.activeTill;
          params.timeperiods = buildOneTimeTimeperiod(input.activeSince, input.activeTill);
        }
        return zabbixRequest(ctx, 'maintenance.update', params);
      },
    },

    deleteMaintenance: {
      isTool: true,
      description:
        'Delete one or more Zabbix maintenance windows, ending them immediately so normal alerting resumes right away rather than waiting for activeTill — use this to close out a window once planned work finishes early.',
      input: DeleteMaintenanceInputSchema,
      handler: async (ctx, input: DeleteMaintenanceInput) =>
        zabbixRequest(ctx, 'maintenance.delete', input.maintenanceIds),
    },

    getMaintenances: {
      isTool: true,
      description:
        'List Zabbix maintenance windows, optionally filtered by host or host group, so a workflow can check what is already scheduled before opening or closing one.',
      input: GetMaintenancesInputSchema,
      handler: async (ctx, input: GetMaintenancesInput) => {
        const params: Record<string, unknown> = {
          output: 'extend',
          selectTags: 'extend',
          selectTimeperiods: 'extend',
        };
        if (input.maintenanceIds) params.maintenanceids = input.maintenanceIds;
        if (input.hostIds) params.hostids = input.hostIds;
        if (input.groupIds) params.groupids = input.groupIds;
        const maintenances = await zabbixRequest(ctx, 'maintenance.get', params);
        return { maintenances };
      },
    },

    getHosts: {
      isTool: true,
      description:
        'Resolve Zabbix hosts by ID, host group, name, or monitoring status. Returns host IDs and status, for use as input to getProblems, createMaintenance, disableHost/enableHost, or similar actions that need a host ID.',
      input: GetHostsInputSchema,
      handler: async (ctx, input: GetHostsInput) => {
        const params: Record<string, unknown> = {
          output: ['hostid', 'host', 'name', 'status'],
          limit: input.limit ?? 100,
        };
        if (input.hostIds) params.hostids = input.hostIds;
        if (input.groupIds) params.groupids = input.groupIds;
        if (input.name) {
          params.search = { name: input.name };
          params.searchWildcardsEnabled = true;
        }
        if (input.status) params.filter = { status: input.status === 'disabled' ? 1 : 0 };
        const hosts = await zabbixRequest(ctx, 'host.get', params);
        return { hosts };
      },
    },

    disableHost: {
      isTool: true,
      description:
        'Stop monitoring one or more Zabbix hosts (equivalent to unchecking "Enabled" on the host). Use this to quiet a decommissioning or noisy host without deleting its configuration. Use enableHost to resume.',
      input: DisableHostInputSchema,
      handler: async (ctx, input: DisableHostInput) =>
        zabbixRequest(
          ctx,
          'host.update',
          input.hostIds.map((hostid) => ({ hostid, status: 1 }))
        ),
    },

    enableHost: {
      isTool: true,
      description: 'Resume monitoring on one or more previously-disabled Zabbix hosts.',
      input: EnableHostInputSchema,
      handler: async (ctx, input: EnableHostInput) =>
        zabbixRequest(
          ctx,
          'host.update',
          input.hostIds.map((hostid) => ({ hostid, status: 0 }))
        ),
    },

    disableTrigger: {
      isTool: true,
      description:
        'Disable one or more Zabbix triggers, silencing just that specific condition without stopping monitoring of the whole host — a finer-grained alternative to disableHost for a single noisy trigger.',
      input: DisableTriggerInputSchema,
      handler: async (ctx, input: DisableTriggerInput) =>
        zabbixRequest(
          ctx,
          'trigger.update',
          input.triggerIds.map((triggerid) => ({ triggerid, status: 1 }))
        ),
    },

    enableTrigger: {
      isTool: true,
      description: 'Re-enable one or more previously-disabled Zabbix triggers.',
      input: EnableTriggerInputSchema,
      handler: async (ctx, input: EnableTriggerInput) =>
        zabbixRequest(
          ctx,
          'trigger.update',
          input.triggerIds.map((triggerid) => ({ triggerid, status: 0 }))
        ),
    },

    getItemHistory: {
      isTool: true,
      description:
        "Fetch recent metric values recorded for a Zabbix item, so an alert workflow can enrich a decision with the underlying trend. Automatically detects the item's value type — Zabbix's history.get otherwise requires the caller to know and pass it explicitly.",
      input: GetItemHistoryInputSchema,
      handler: async (ctx, input: GetItemHistoryInput) => {
        const items = await zabbixRequest<
          Array<{ itemid: string; name?: string; key_?: string; value_type: string }>
        >(ctx, 'item.get', {
          itemids: [input.itemId],
          output: ['itemid', 'name', 'key_', 'value_type'],
        });
        const item = items[0];
        if (!item) {
          throw new Error(`Zabbix item ${input.itemId} was not found.`);
        }
        const params: Record<string, unknown> = {
          itemids: [input.itemId],
          history: Number(item.value_type),
          output: 'extend',
          sortfield: 'clock',
          sortorder: 'DESC',
          limit: input.limit ?? 100,
        };
        if (input.timeFrom !== undefined) params.time_from = input.timeFrom;
        if (input.timeTill !== undefined) params.time_till = input.timeTill;
        const history = await zabbixRequest(ctx, 'history.get', params);
        return { item, history };
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.zabbix.test.description', {
      defaultMessage: 'Verifies the connection by listing a host from Zabbix',
    }),
    handler: async (ctx) => {
      const hosts = await zabbixRequest<unknown[]>(ctx, 'host.get', {
        output: ['hostid', 'host'],
        limit: 1,
      });
      return {
        message: `Successfully connected to Zabbix (${
          Array.isArray(hosts) ? hosts.length : 0
        } host(s) visible).`,
      };
    },
  },

  skill: [
    '## Zabbix Connector',
    '',
    'Zabbix exposes a single JSON-RPC endpoint covering the problem lifecycle, event history,',
    'maintenance windows, and host/trigger enable-disable controls.',
    '',
    '### Problem lifecycle',
    'Use getProblems as the primary read path for currently unresolved problems, filterable by host,',
    'host group, severity, tags, and acknowledgement/suppression state. Then act on a problem by its',
    'event ID: acknowledgeProblem to mark it as being handled, addProblemMessage to attach investigation',
    'notes without changing its state, changeProblemSeverity to escalate or de-escalate it, and',
    'closeProblem once it is remediated (the underlying trigger must have manual close enabled, or Zabbix',
    'rejects the close). Use unacknowledgeProblem if a problem was closed out too early.',
    '',
    '### Suppressing noise',
    'Use suppressProblem (with an optional suppressUntil timestamp; omit it to suppress indefinitely) to',
    'mute a known problem without acknowledging or closing it, and unsuppressProblem to resume alerting',
    'early. For planned work spanning many hosts, prefer createMaintenance instead — it suppresses',
    'problem notifications across a host or host-group scope for a time window, optionally restricted to',
    'problems matching specific tags.',
    '',
    '### Event history and enrichment',
    'getEvent returns full details for one or more event IDs, including already-resolved ones —',
    'getProblems only returns unresolved or recently-resolved problems. getItemHistory pulls recent metric',
    'values for a specific item (e.g. the item behind a trigger) to show the underlying trend.',
    '',
    '### Maintenance windows',
    'createMaintenance opens a one-time window over given hostIds or groupIds and a time range;',
    'getMaintenances lists what is already scheduled before opening or closing one; updateMaintenance',
    'adjusts an existing window (provide activeSince and activeTill together to change the time range);',
    'deleteMaintenance ends a window immediately instead of waiting for it to expire.',
    '',
    '### Host and trigger controls',
    'Use getHosts to resolve a host ID by name or group before calling any other host-scoped action.',
    'disableHost/enableHost stop and resume monitoring an entire host — use this for decommissioning or a',
    'persistently noisy host. disableTrigger/enableTrigger silence a single trigger without touching the',
    'rest of the host, a finer-grained alternative.',
  ].join('\n'),
};
