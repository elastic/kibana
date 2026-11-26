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
import { UISchemas } from '../../connector_spec';
import { xdrPost } from './client';
import { caseActions } from './case_actions';
import { endpointActions } from './endpoint_actions';
import { fileActions } from './file_actions';
import { investigationActions } from './investigation_actions';

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/** HTTPS only; plain HTTP is accepted for a loopback host (a local test server). */
const isTenantApiUrl = (value: string): boolean => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return (
    (url.protocol === 'https:' ||
      (url.protocol === 'http:' && LOOPBACK_HOSTS.includes(url.hostname))) &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash &&
    /^\/(public_api\/v1\/?)?$/.test(url.pathname)
  );
};

export const CortexXdr: ConnectorSpec = {
  metadata: {
    id: '.cortex_xdr',
    displayName: 'Cortex XDR',
    description: i18n.translate('connectorSpecs.cortexXdr.metadata.description', {
      defaultMessage:
        'Search endpoints, cases, issues and XQL data in Cortex XDR, and scan, tag or collect files from endpoints',
    }),
    // New third party connectors default to an enterprise license by policy. The floor
    // the actions plugin enforces is gold; raise this only, never lower it below gold.
    minimumLicense: 'enterprise',
    // A new connector type must reach Production-NonCanary before it can declare
    // more user-facing features; ship ['agentBuilder'] first.
    supportedFeatureIds: ['agentBuilder'],
  },
  auth: {
    types: [
      {
        type: 'cortex_xdr_advanced_key',
        defaults: {},
        overrides: {
          meta: {
            apiKeyId: {
              helpText: i18n.translate('connectorSpecs.cortexXdr.auth.apiKeyIdHelpText', {
                defaultMessage:
                  'The ID column of the key in Settings, Configurations, Integrations, API Keys.',
              }),
            },
            apiKey: {
              helpText: i18n.translate('connectorSpecs.cortexXdr.auth.apiKeyHelpText', {
                defaultMessage:
                  'An API key with security level Advanced (a Standard key is rejected). Its role must allow the actions you use: Endpoint Administration (View; Edit for tags), Action Center (View), the Isolation, Scan, Quarantine and File Retrieval response actions, Script Library (View; Run Standard Scripts or Run High-Risk Scripts), Cases and Issues (View; Edit; Change Case/Issue Severity), Hash Exceptions (Edit), Rules (Edit) for indicators, Auditing (View) and Identity Analytics (View). XQL queries need the Instance Administrator role. The key is never sent: each request is signed with it.',
              }),
            },
          },
        },
      },
    ],
  },
  schema: lazySchema(() =>
    z.object({
      apiUrl: UISchemas.url('https://api-mytenant.xdr.us.paloaltonetworks.com')
        .max(2048)
        .refine(
          isTenantApiUrl,
          'Enter the HTTPS API URL of your tenant (HTTP is accepted only for localhost), without a path, credentials, query parameters or a fragment.'
        )
        .describe('API URL of the Cortex XDR tenant')
        .meta({
          label: i18n.translate('connectorSpecs.cortexXdr.config.apiUrlLabel', {
            defaultMessage: 'API URL',
          }),
          helpText: i18n.translate('connectorSpecs.cortexXdr.config.apiUrlHelpText', {
            defaultMessage:
              'The API URL shown by Copy API URL in Settings, Configurations, Integrations, API Keys, for example https://api-mytenant.xdr.us.paloaltonetworks.com. Each tenant has its own host in its region. HTTPS only; HTTP is accepted only for localhost.',
          }),
        }),
    })
  ),
  validateUrls: { fields: ['apiUrl'] },
  actions: {
    ...endpointActions,
    ...fileActions,
    ...caseActions,
    ...investigationActions,
  },
  skill: [
    '## Cortex XDR connector',
    '',
    'Use this connector to investigate and respond in Cortex XDR: find endpoints, read cases, issues, audit logs and XQL data, and run response actions on endpoints.',
    '',
    '### Finding ids',
    '- Endpoint ids come from `getEndpoints` (`reply.endpoints[].endpoint_id`); search by hostname or IP when the user names a host.',
    '- Case ids come from `getCases` (`reply.DATA[].case_id`); issue ids from `getIssues` (`reply.DATA[].id`) or `getCaseDetails` (`issues[].id`).',
    '- Script ids come from `getScripts` (`reply.scripts[].script_uid`); indicator rule ids from `getIndicators` (`objects[].rule_id`).',
    '',
    '### Response actions are asynchronous',
    '- `scanEndpoint`, `cancelScan`, `restoreFile` and `retrieveFile` return `reply.action_id` as soon as Cortex XDR accepts the request. That does not mean the action ran.',
    '- Call `getActionStatus` with that id until every endpoint in `reply.data` has a final state (COMPLETED_SUCCESSFULLY, COMPLETED_PARTIAL, FAILED, TIMEOUT, CANCELLED, ABORTED or EXPIRED).',
    '- Confirm the effect: `getEndpoints` (`is_isolated`, `scan_status`, `endpointTags`) for isolation state, scans and tags; `getQuarantineStatus` (`reply[].status`) for quarantine and restore.',
    '- Isolation, quarantine, running scripts and allow listing are not available as tools; suggest them to the user instead.',
    '',
    '### Common patterns',
    '- Scan a host: `getEndpoints` by hostname, `scanEndpoint` with its endpoint_id (pass `caseId` to log it on the case), then `getActionStatus`.',
    '- Read a script run: `getScriptResults` with the action id of the run; `getScripts` lists the library.',
    '- Collect a file: `retrieveFile`, wait for `getActionStatus` to show COMPLETED_SUCCESSFULLY, then `getRetrievedFileDetails` (set `download` true only when you will process the base64 archive).',
    '- Hunt: `runXqlQuery`, then `getXqlResults` with the returned `queryId` until `reply.status` is SUCCESS or FAIL.',
    '- Triage a case: `getCaseDetails` for artifacts and issues, then `updateCase` or `updateIssue` (resolving needs a resolve reason).',
    '',
    '### Gotchas',
    '- Times are epoch milliseconds. Case severities are lowercase (`high`), issue severities uppercase (`HIGH`).',
    '- List actions return up to `maxResults` rows (at most 500); when `nextSearchFrom` is not null, call again with `searchFrom` set to it.',
    '- `blocklistFiles` and `insertIndicators` affect the whole tenant and cannot be undone through this connector; confirm with the user first.',
    '- The tenant allows 10 API requests per second across all keys; the connector retries rate limits, but avoid running many actions in parallel.',
    '- HTTP 402 means the tenant lacks the license for that API (for example `getRiskyUsers` needs the Identity Threat Module); 403 means the key role lacks the permission.',
  ].join('\n'),
  test: {
    // enabled must be explicitly set to true, otherwise the "Test connector"
    // button stays disabled in the UI even though a handler is defined.
    enabled: true,
    description:
      'Reads one case, which checks the API URL, the key signature and the View permission on Cases and Issues.',
    handler: async (ctx) => {
      const body = await xdrPost<{ reply?: { TOTAL_COUNT?: number } }>(ctx, '/case/search', {
        search_from: 0,
        search_to: 1,
      });
      return { totalCases: body.reply?.TOTAL_COUNT ?? null };
    },
  },
};
