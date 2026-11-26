/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from '../../connector_spec';
import {
  CortexXdrError,
  collectPages,
  endpointIdFilter,
  pageInfo,
  pushFilter,
  toInteger,
  xdrPost,
  xdrRequest,
} from './client';
import type { Filter } from './client';
import {
  GetAuditLogsInputSchema,
  GetIndicatorsInputSchema,
  GetRiskyUsersInputSchema,
  GetScriptResultsInputSchema,
  GetScriptsInputSchema,
  GetXqlResultsInputSchema,
  InsertIndicatorsInputSchema,
  RunScriptInputSchema,
  RunXqlQueryInputSchema,
} from './types';
import type {
  GetAuditLogsInput,
  GetIndicatorsInput,
  GetScriptResultsInput,
  GetScriptsInput,
  GetXqlResultsInput,
  IndicatorInput,
  InsertIndicatorsInput,
  RunScriptInput,
  RunXqlQueryInput,
} from './types';

interface IndicatorsBody {
  objects_count?: number;
  objects_type?: string;
  objects?: unknown[];
}

interface AuditBody {
  reply?: { total_count?: number; result_count?: number; data?: unknown[] };
}

interface RiskyUser {
  score?: number;
  [key: string]: unknown;
}

const toVendorIndicator = (indicator: IndicatorInput) =>
  Object.fromEntries(
    Object.entries({
      indicator: indicator.indicator,
      type: indicator.type,
      severity: indicator.severity,
      rule_id: indicator.ruleId,
      expiration_date: indicator.expirationDate,
      default_expiration_enabled: indicator.defaultExpirationEnabled,
      comment: indicator.comment,
      reputation: indicator.reputation,
      reliability: indicator.reliability,
    }).filter(([, value]) => value !== undefined)
  );

/** Some responses are documented bare and some wrapped in reply; accept both. */
const unwrap = <T>(body: unknown): T =>
  (typeof body === 'object' && body !== null && 'reply' in body
    ? (body as { reply: T }).reply
    : body) as T;

export const investigationActions: ConnectorSpec['actions'] = {
  getScripts: {
    isTool: true,
    scope: 'read',
    description:
      'List script library scripts, optionally by name, platform or high-risk flag. Returns reply.scripts[] with script_uid, name, platforms and is_high_risk.',
    input: GetScriptsInputSchema,
    handler: async (ctx, input: GetScriptsInput) => {
      const filters: Filter[] = [];
      pushFilter(filters, 'name', 'in', input.names);
      pushFilter(filters, 'windows_supported', 'in', input.windowsSupported);
      pushFilter(filters, 'linux_supported', 'in', input.linuxSupported);
      pushFilter(filters, 'macos_supported', 'in', input.macosSupported);
      pushFilter(filters, 'is_high_risk', 'in', input.isHighRisk);
      return xdrPost(ctx, '/scripts/get_scripts', { filters });
    },
  },
  runScript: {
    isTool: false,
    scope: 'destroy',
    description:
      'Run a library script (script_uid from getScripts) on endpoints with optional parameters and timeout. Returns reply.action_id for getActionStatus and getScriptResults; reply.endpoints_count counts the endpoints reached (unknown ids are not listed).',
    input: RunScriptInputSchema,
    handler: async (ctx, input: RunScriptInput) =>
      xdrPost(
        ctx,
        '/scripts/run_script',
        {
          script_uid: input.scriptUid,
          filters: endpointIdFilter(input.endpointIds),
          ...(input.parameters ? { parameters_values: input.parameters } : {}),
          timeout: input.timeout,
          ...(input.caseId ? { incident_id: input.caseId } : {}),
        },
        { stateChanging: true }
      ),
  },
  getScriptResults: {
    isTool: true,
    scope: 'read',
    description:
      'Get the per-endpoint results of a script run by its action id: execution status, standard output and retrieved files.',
    input: GetScriptResultsInputSchema,
    handler: async (ctx, input: GetScriptResultsInput) =>
      xdrPost(ctx, '/scripts/get_script_execution_results', {
        action_id: String(toInteger(input.actionId)),
      }),
  },
  runXqlQuery: {
    isTool: true,
    scope: 'read',
    description:
      'Start an XQL query over a relative time or an absolute from/to range. Returns queryId for getXqlResults. Uses the tenant XQL quota.',
    input: RunXqlQueryInputSchema,
    handler: async (ctx, input: RunXqlQueryInput) => {
      const timeframe =
        input.relativeTime !== undefined
          ? { relativeTime: input.relativeTime }
          : input.fromTime !== undefined && input.toTime !== undefined
          ? { from: input.fromTime, to: input.toTime }
          : undefined;
      const body = await xdrPost<{ reply?: string }>(ctx, '/xql/start_xql_query', {
        query: input.query,
        ...(timeframe ? { timeframe } : {}),
      });
      return { queryId: body.reply ?? null, reply: body.reply ?? null };
    },
  },
  getXqlResults: {
    isTool: true,
    scope: 'read',
    description:
      'Get the results of an XQL query by queryId. Returns reply.status (PENDING, SUCCESS or FAIL) and up to 1000 rows in reply.results.data; call again while PENDING.',
    input: GetXqlResultsInputSchema,
    handler: async (ctx, input: GetXqlResultsInput) =>
      xdrPost(ctx, '/xql/get_query_results', {
        query_id: input.queryId,
        pending_flag: input.pendingFlag,
        format: input.format,
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      }),
  },
  insertIndicators: {
    isTool: true,
    scope: 'destroy',
    description:
      'Insert or update IOCs (hash, IP, path, domain, file name) with optional severity, reputation, expiration and comment. An existing ruleId is overwritten. Returns added_objects, updated_objects and errors.',
    input: InsertIndicatorsInputSchema,
    handler: async (ctx, input: InsertIndicatorsInput) => {
      const result = unwrap(
        await xdrPost(ctx, '/indicators/insert', input.indicators.map(toVendorIndicator), {
          stateChanging: true,
        })
      ) as { added_objects?: unknown[]; updated_objects?: unknown[]; errors?: unknown[] } | null;
      const changed = (result?.added_objects?.length ?? 0) + (result?.updated_objects?.length ?? 0);
      if (changed === 0 && (result?.errors?.length ?? 0) > 0) {
        throw new CortexXdrError(
          `Cortex XDR inserted none of the indicators: ${JSON.stringify(result?.errors).slice(
            0,
            500
          )}`
        );
      }
      return result;
    },
  },
  getIndicators: {
    isTool: true,
    scope: 'read',
    description:
      'List IOCs, optionally by indicator value, type or severity. Returns objects[] (rule_id, indicator, type, severity, expiration_date) and objects_count.',
    input: GetIndicatorsInputSchema,
    handler: async (ctx, input: GetIndicatorsInput) => {
      const filters: Filter[] = [];
      pushFilter(filters, 'indicator', 'EQ', input.indicator);
      pushFilter(filters, 'type', 'EQ', input.type);
      pushFilter(filters, 'severity', 'EQ', input.severity);
      const page = await collectPages<IndicatorsBody>(ctx, {
        path: '/indicators/get',
        requestData: {
          filters,
          ...(input.extendedView !== undefined ? { extended_view: input.extendedView } : {}),
        },
        searchFrom: input.searchFrom,
        maxResults: input.maxResults,
        itemsOf: (body) => unwrap<IndicatorsBody>(body).objects,
        totalOf: (body) => unwrap<IndicatorsBody>(body).objects_count,
      });
      const last = unwrap<IndicatorsBody>(page.lastBody ?? {});
      return {
        objects_count: last.objects_count,
        objects_type: last.objects_type,
        objects: page.items,
        ...pageInfo(page),
      };
    },
  },
  getAuditLogs: {
    isTool: true,
    scope: 'read',
    description:
      'Read audit logs: logType management for user and API actions, agent for agent reports. Filter by time, type, result, user email or endpoint. Returns reply.data[] and reply.total_count.',
    input: GetAuditLogsInputSchema,
    handler: async (ctx, input: GetAuditLogsInput) => {
      const filters: Filter[] = [];
      pushFilter(filters, 'timestamp', 'gte', input.timestampFrom);
      pushFilter(filters, 'timestamp', 'lte', input.timestampTo);
      pushFilter(filters, 'type', 'in', input.types);
      pushFilter(filters, 'sub_type', 'in', input.subTypes);
      pushFilter(filters, 'result', 'in', input.results);
      pushFilter(filters, 'email', 'in', input.emails);
      pushFilter(filters, 'endpoint_id', 'in', input.endpointIds);
      const page = await collectPages<AuditBody>(ctx, {
        path: input.logType === 'agent' ? '/audits/agents_reports' : '/audits/management_logs',
        requestData: { filters },
        searchFrom: input.searchFrom,
        maxResults: input.maxResults,
        itemsOf: (body) => body.reply?.data,
        totalOf: (body) => body.reply?.total_count,
      });
      return {
        reply: {
          total_count: page.lastBody?.reply?.total_count,
          result_count: page.items.length,
          data: page.items,
        },
        ...pageInfo(page),
      };
    },
  },
  getRiskyUsers: {
    isTool: true,
    scope: 'read',
    description:
      'List the users Cortex XDR rates most risky, highest score first, with risk_level and reasons. Needs the Identity Threat Module license.',
    input: GetRiskyUsersInputSchema,
    handler: async (ctx) => {
      // The API documents an empty JSON object as its body, without the request_data envelope.
      const { data: body } = await xdrRequest<{ reply?: RiskyUser[] }>(ctx, {
        path: '/get_risky_users',
        body: {},
      });
      const users = Array.isArray(body?.reply) ? [...body.reply] : [];
      users.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      return { reply: users };
    },
  },
};
