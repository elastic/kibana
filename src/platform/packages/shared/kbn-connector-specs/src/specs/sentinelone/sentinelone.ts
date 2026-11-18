/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SentinelOne (v2) connector
 *
 * Endpoint response, threat triage and detection-content actions against the SentinelOne
 * management API (v2.1). The V1 stack connector `.sentinelone` stays registered alongside it.
 *
 * Auth: `Authorization: ApiToken <token>` (console user or service user token).
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import { UISchemas } from '../../connector_spec';
import { agentActions } from './agent_actions';
import { applicationRiskActions } from './application_risk_actions';
import { s1Request, toListResult, withoutRegistrationTokens } from './client';
import { SENTINELONE_CONNECTOR_TYPE_ID } from './constants';
import { ACTION_DESCRIPTIONS } from './descriptions';
import { detectionActions } from './detection_actions';
import { policyActions } from './policy_actions';
import { queryActions } from './query_actions';
import { scriptActions } from './script_actions';
import { threatActions } from './threat_actions';
import {
  GetAccountsInputSchema,
  GetAgentCvesInputSchema,
  GetGroupsInputSchema,
  GetSitesInputSchema,
} from './types';
import type { GetAccountsInput, GetAgentCvesInput, GetGroupsInput, GetSitesInput } from './types';

export const SentinelOne: ConnectorSpec = {
  metadata: {
    id: SENTINELONE_CONNECTOR_TYPE_ID,
    displayName: 'SentinelOne (v2)',
    description: i18n.translate('connectorSpecs.sentinelone.metadata.description', {
      defaultMessage:
        'Find endpoints, isolate and release hosts, triage and mitigate threats, run remote scripts, fetch files, and manage blocklists, exclusions, indicators, firewall and custom detection rules in SentinelOne',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
    docsUrl: `https://www.elastic.co/docs/reference/kibana/connectors-kibana/sentinelone-v2-action-type`,
  },

  auth: {
    types: [
      {
        type: 'api_key_header',
        // Stored under `token` (not Authorization); requests send Authorization: ApiToken <token>.
        defaults: { headerField: 'token' },
        overrides: {
          meta: {
            token: {
              label: i18n.translate('connectorSpecs.sentinelone.auth.token.label', {
                defaultMessage: 'API token',
              }),
              helpText: i18n.translate('connectorSpecs.sentinelone.auth.token.helpText', {
                defaultMessage:
                  'API token of a SentinelOne console user or service user (Settings > Users > Service Users). Paste the token only: the connector sends Authorization: ApiToken automatically. The user role needs the permissions of the actions you use, for example Endpoints view and disconnect from network, Threats view and update, and Remote Script Orchestration view.',
              }),
            },
          },
        },
      },
    ],
  },

  // Strict like V1's config schema: an unknown config key is rejected, not silently dropped.
  schema: lazySchema(() =>
    z
      .object({
        url: UISchemas.url('https://yourcompany.sentinelone.net')
          .describe('SentinelOne management console URL')
          .meta({
            label: i18n.translate('connectorSpecs.sentinelone.config.url.label', {
              defaultMessage: 'SentinelOne tenant URL',
            }),
            helpText: i18n.translate('connectorSpecs.sentinelone.config.url.helpText', {
              defaultMessage:
                'Your SentinelOne management console URL with https, for example https://yourcompany.sentinelone.net. The connector adds the API path. The host must be in the Kibana allowed hosts list.',
            }),
          }),
      })
      .strict()
  ),

  actions: {
    ...agentActions,
    ...threatActions,
    ...scriptActions,
    ...detectionActions,
    ...policyActions,
    ...applicationRiskActions,
    ...queryActions,

    getSites: {
      isTool: true,
      scope: 'read',
      description: ACTION_DESCRIPTIONS.getSites,
      input: GetSitesInputSchema,
      handler: async (ctx, input: GetSitesInput) => {
        const body = await s1Request(ctx, {
          action: 'getSites',
          method: 'GET',
          path: '/sites',
          params: input,
          mutating: false,
        });
        // Sites come back as data.sites with license totals in data.allSites, not as a data[] list.
        const data = (body.data ?? {}) as { sites?: unknown; allSites?: unknown };
        const { pagination, errors } = toListResult(body);
        return {
          data: {
            sites: withoutRegistrationTokens(Array.isArray(data.sites) ? data.sites : []),
            allSites: data.allSites ?? null,
          },
          pagination,
          errors,
        };
      },
    },

    getGroups: {
      isTool: true,
      scope: 'read',
      description: ACTION_DESCRIPTIONS.getGroups,
      input: GetGroupsInputSchema,
      handler: async (ctx, input: GetGroupsInput) => {
        const result = toListResult(
          await s1Request(ctx, {
            action: 'getGroups',
            method: 'GET',
            path: '/groups',
            params: input,
            mutating: false,
          })
        );
        return { ...result, data: withoutRegistrationTokens(result.data) };
      },
    },

    getAccounts: {
      isTool: true,
      scope: 'read',
      description: ACTION_DESCRIPTIONS.getAccounts,
      input: GetAccountsInputSchema,
      handler: async (ctx, input: GetAccountsInput) =>
        toListResult(
          await s1Request(ctx, {
            action: 'getAccounts',
            method: 'GET',
            path: '/accounts',
            params: input,
            mutating: false,
          })
        ),
    },

    getAgentCves: {
      isTool: true,
      scope: 'read',
      description: ACTION_DESCRIPTIONS.getAgentCves,
      input: GetAgentCvesInputSchema,
      handler: async (ctx, input: GetAgentCvesInput) =>
        toListResult(
          await s1Request(ctx, {
            action: 'getAgentCves',
            method: 'GET',
            path: '/installed-applications/cves',
            params: input,
            mutating: false,
          })
        ),
    },
  },

  skill: [
    '## SentinelOne (v2) connector',
    '',
    'Use this connector to investigate and respond to endpoint threats in SentinelOne.',
    '',
    '### Finding ids',
    '- Agents: `getAgents` by computerName, ip, uuid or query returns `data[].id` (agent id) and `networkStatus`.',
    '- Threats: `getThreats` (filters such as incidentStatuses, analystVerdicts, agentIds, contentHashes) returns `data[].id`; `getThreatDetails` gives the full record for explicit ids.',
    '- Scopes: `getAccounts`, `getSites` and `getGroups` return the account, site and group ids that create actions need.',
    '',
    '### Common patterns',
    '- Triage a threat: `getThreats` or `getThreatDetails`, then `getAgents` (ids from `agentRealtimeInfo.agentId`), `getThreatNotes`, `getThreatTimeline` and, for a SHA1, `getHashReputation`.',
    '- Contain an endpoint: `getAgents` to get the id and current `networkStatus`, `isolateHost` with `agentIds`, then `getAgents` again to confirm `networkStatus` is `disconnected`. Undo with `releaseHost`.',
    '- Close a threat: `updateThreatVerdict`, `updateThreatStatus` (resolved) and `addThreatNote` with what was done.',
    '- Mitigate: `mitigateThreat` (kill, quarantine, remediate, ...) or `rollbackThreat` for ransomware on Windows; read the result back with `getThreatDetails` (`threatInfo.mitigationStatus`).',
    '- Remote script: `getRemoteScripts` for the scriptId, `executeScript`, poll `getRemoteScriptStatus` with `data.parentTaskId`, then `getRemoteScriptResults` or `downloadRemoteScriptResults` with a task id. `runScriptAndWait` does the three steps in one call (up to 240 s).',
    '- Threat file: `fetchThreatFile` (one threat id and an archive password of at least 10 characters) asks SentinelOne to upload the file; once it is in the cloud, `downloadThreatFile` returns it.',
    '- Collect files: `fetchAgentFiles`, wait for the upload activity in `getActivities` (agentIds, activityTypes 81), then `downloadAgentFile` with the agent id and activity id.',
    '- Block a hash: check `searchBlocklist` first, then `addHashToBlocklist` with an explicit scope; undo with `removeHashFromBlocklist`.',
    '',
    '### Gotchas',
    '- State-changing actions need explicit ids; an empty list is rejected because SentinelOne would apply an empty filter to every object.',
    '- Responses to isolate, release, scan, mitigate and scripts are acknowledgments (`data.affected`), not completion: read the state back.',
    '- `getSites` and `getGroups` never return registration tokens (they enroll new agents); read them in the SentinelOne console.',
    '- List actions return one page: pass `pagination.nextCursor` back as `cursor` with the same filters until it is null.',
    '- Download actions return the whole file as base64 in `content` (up to 25 MB): the output can be very large, so only download files you need to hand on, and decode `content` before use.',
    '- `getHashReputation`, `getAgentCves` and the Deep Visibility actions (`createQuery`, `getQueryStatus`, `getQueryEvents`) are deprecated in the official SentinelOne API specification; poll `getQueryStatus` no faster than once per second.',
  ].join('\n'),

  test: {
    enabled: true,
    description:
      'Verifies the tenant URL, the API token and the Endpoints view permission by listing one agent (GET /web/api/v2.1/agents?limit=1).',
    handler: async (ctx) => {
      const result = toListResult(
        await s1Request(ctx, {
          action: 'test',
          method: 'GET',
          path: '/agents',
          params: { limit: 1 },
          mutating: false,
        })
      );
      const totalItems = result.pagination.totalItems ?? result.data.length;
      return { message: `Connected to SentinelOne (${totalItems} agents visible)`, totalItems };
    },
  },
};
