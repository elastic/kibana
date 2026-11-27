/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import { FALCON_CLOUDS, SCOPES } from './constants';
import { falconRequest, isAllowedFalconUrl } from './client';
import { hostActions } from './hosts_actions';
import { alertAndIocActions } from './alerts_iocs_actions';
import { rtrActions } from './rtr_actions';
import { libraryActions } from './library_actions';
import { intelActions } from './intel_actions';
import { ioaActions } from './ioa_actions';
import { scanActions } from './scan_actions';
import { ngSiemActions } from './ngsiem_actions';

const TokenUrlSchema = lazySchema(() =>
  z
    .url()
    .max(2048)
    .refine(
      (value) => isAllowedFalconUrl(value, /^\/oauth2\/token$/),
      'Enter the HTTPS token URL of your Falcon cloud, ending in /oauth2/token, without credentials, query parameters or a fragment.'
    )
    .default('https://api.crowdstrike.com/oauth2/token')
);

const configSchema = lazySchema(() =>
  z.object({
    region: z
      .enum(FALCON_CLOUDS)
      .default('us-1')
      .describe('Falcon cloud of the tenant; selects the API host.')
      .meta({
        label: i18n.translate('connectorSpecs.crowdstrike2.config.region.label', {
          defaultMessage: 'Falcon cloud',
        }),
        helpText: i18n.translate('connectorSpecs.crowdstrike2.config.region.helpText', {
          defaultMessage:
            'The cloud of your Falcon tenant, shown with the API client in the Falcon console: us-1 (api.crowdstrike.com), us-2, us-3, eu-1, us-gov-1 (api.laggar.gcw.crowdstrike.com) or us-gov-2. Select custom to enter an API URL.',
        }),
      }),
    apiUrl: z
      .url()
      .max(2048)
      .refine(
        (value) => isAllowedFalconUrl(value, /^\/?$/),
        'Enter an HTTPS base URL without a path, credentials, query parameters or a fragment.'
      )
      .optional()
      .describe('Base URL of the Falcon API when the cloud is custom.')
      .meta({
        label: i18n.translate('connectorSpecs.crowdstrike2.config.apiUrl.label', {
          defaultMessage: 'API URL (custom cloud only)',
        }),
        placeholder: 'https://api.crowdstrike.com',
        helpText: i18n.translate('connectorSpecs.crowdstrike2.config.apiUrl.helpText', {
          defaultMessage:
            'HTTPS base URL of the Falcon API, used only when the cloud is custom. The host must be allowed by the Kibana allowed hosts setting.',
        }),
        validate: { allowedHosts: true },
      }),
  })
);

export const Crowdstrike2: ConnectorSpec = {
  metadata: {
    id: '.crowdstrike2',
    displayName: 'CrowdStrike Falcon',
    description: i18n.translate('connectorSpecs.crowdstrike2.metadata.description', {
      defaultMessage:
        'Manage CrowdStrike Falcon alerts, cases, hosts, IOCs and IOA rules, and run Real Time Response and scans',
    }),
    // New third party connectors default to an enterprise license by policy. The floor
    // the actions plugin enforces is gold; raise this only, never lower it below gold.
    minimumLicense: 'enterprise',
    // A new connector type must reach Production-NonCanary before it can declare
    // user-facing features. Ship ['agentBuilder'] first, then add 'workflows'
    // in a follow-up PR.
    supportedFeatureIds: ['agentBuilder'],
  },
  auth: {
    types: [
      {
        type: 'oauth_client_credentials',
        defaults: { tokenEndpointAuthMethod: 'client_secret_post', tokenType: 'Bearer' },
        overrides: {
          fields: { tokenUrl: TokenUrlSchema },
          label: i18n.translate('connectorSpecs.crowdstrike2.auth.label', {
            defaultMessage: 'Falcon API client',
          }),
          meta: {
            tokenUrl: {
              placeholder: 'https://api.crowdstrike.com/oauth2/token',
              helpText: i18n.translate('connectorSpecs.crowdstrike2.auth.tokenUrl.helpText', {
                defaultMessage:
                  'The API URL of your Falcon cloud followed by /oauth2/token, for example https://api.eu-1.crowdstrike.com/oauth2/token. Kibana sends the client ID and secret to this URL, so enter only your Falcon cloud token URL. Actions fail when it is not on the host of the selected Falcon cloud.',
              }),
            },
            clientId: {
              helpText: i18n.translate('connectorSpecs.crowdstrike2.auth.clientId.helpText', {
                defaultMessage:
                  'Client ID of a Falcon API client (Support and resources, API clients and keys). Grant only the scopes the actions you use need: Hosts (read, write), Host groups (read, write), Alerts (read, write), Cases (read, write), Custom IOA rules (read, write), IOA exclusions (read), On-demand scans (ODS) (read, write), IOC Management (read, write), Real time response (read, write), Real time response (admin) (write), Quarantined Files (read, write); with the matching subscriptions also Indicators (Falcon Intelligence) (read), Sandbox (Falcon Sandbox) (write), Sample uploads (write) and Vulnerabilities (Spotlight) (read).',
              }),
            },
            scope: { hidden: true },
          },
        },
      },
    ],
  },
  schema: configSchema,
  validateUrls: { fields: ['apiUrl'] },
  actions: {
    ...hostActions,
    ...alertAndIocActions,
    ...ioaActions,
    ...rtrActions,
    ...libraryActions,
    ...scanActions,
    ...intelActions,
    ...ngSiemActions,
  },
  skill: [
    '## CrowdStrike Falcon connector',
    '',
    'Triage Falcon alerts and cases, look up and contain hosts, hunt indicators, run read-only Real Time Response (RTR) and check reputation.',
    '',
    '- Hosts: `searchDevices` (FQL) returns device ids, 32 hex characters; `getAgentDetails` returns the hosts with `containment_state`.',
    '- Alerts: `searchAlerts` returns composite ids; `getAlertDetails` reads them; `updateAlert` sets status, assignee, tags or a comment.',
    '- Contain: check `getAgentOnlineStatus`, call `containHost`, then poll `getAgentDetails` until `containment_state` is `contained`. An offline host is contained when it reconnects.',
    '- Indicators: `findHostsByIndicator` lists the hosts that saw a hash, domain or IP; `getFileReputation` and `getUrlReputation` give the verdict.',
    '- Cases: `searchCases`, `getCaseDetails`, `updateCase`, `addCaseTags`, `removeCaseTags`. Cases have no comments: comment on the alert.',
    '- RTR: `executeRTRCommand` runs read-only commands; `rtrListProcesses` lists processes. When a host result has `complete: false`, poll `cloud_request_id` with `getRTRCommandStatus` and the same tier.',
    '- Next-Gen SIEM: `startNgSiemSearch` returns `id`; call `getNgSiemSearchResults` every 2 seconds or more until `done` is true, then page `events`.',
    '',
    'Rules:',
    '- Lists return one page: continue with `offset: next_offset`, or `after: next_after` where offered; null means the last page.',
    "- FQL quotes values with single quotes, for example hostname:'web-01'; + is AND, a comma is OR.",
    '- Confirm with the user before any action that changes Falcon or a host: containHost, updateAlert, updateCase, the case tag actions, createScan.',
    '- Change actions return `outcomes` per item: `requested`, `skipped` (already in that state) or `notFound`.',
    '- A 403 names the API client scope the action needs.',
  ].join('\n'),
  test: {
    // enabled must be explicitly set to true, otherwise the "Test connector"
    // button stays disabled in the UI even though a handler is defined.
    enabled: true,
    description:
      'Requests a token and lists one device, which confirms the client ID and secret, the Falcon cloud, and the Hosts: Read scope.',
    handler: async (ctx) => {
      const response = await falconRequest(ctx, {
        method: 'GET',
        path: '/devices/queries/devices/v1',
        params: { limit: 1 },
        retryServerErrors: true,
        scope: SCOPES.hostsRead,
      });
      return {
        message: 'Connected to CrowdStrike Falcon.',
        devices: response.data?.meta?.pagination?.total,
      };
    },
  },
};
