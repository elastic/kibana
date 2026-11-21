/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Microsoft Defender XDR Connector
 *
 * Connects to the Microsoft Defender XDR REST API via the Microsoft Graph Security API.
 * Exposes incident management, alert management, advanced hunting, detection rule auditing,
 * threat intelligence enrichment, and secure score reporting as agent tools.
 *
 * API base URL: https://graph.microsoft.com/v1.0 (commercial)
 *               https://graph.microsoft.us/v1.0   (GCC High)
 *               https://dod-graph.microsoft.us/v1.0 (DoD)
 * Auth: OAuth 2.0 Client Credentials or certificate (private key JWT)
 * Docs: https://learn.microsoft.com/en-us/defender-xdr/api-overview
 */

import { i18n } from '@kbn/i18n';
import type { AxiosError } from 'axios';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  AddAlertCommentInputSchema,
  AddIncidentCommentInputSchema,
  CloudConfigSchema,
  CreateDetectionRuleInputSchema,
  DeleteDetectionRuleInputSchema,
  GetAlertInputSchema,
  GetDetectionRuleInputSchema,
  GetIncidentInputSchema,
  GetThreatIntelHostInputSchema,
  GetWhoisRecordInputSchema,
  ListAlertsInputSchema,
  ListDetectionRulesInputSchema,
  ListIncidentsInputSchema,
  ListSecureScoresInputSchema,
  MergeIncidentsInputSchema,
  RunHuntingQueryInputSchema,
  UpdateAlertInputSchema,
  UpdateDetectionRuleInputSchema,
  UpdateIncidentInputSchema,
  GRAPH_HOST,
  type AddAlertCommentInput,
  type AddIncidentCommentInput,
  type Cloud,
  type CreateDetectionRuleInput,
  type DeleteDetectionRuleInput,
  type GetAlertInput,
  type GetDetectionRuleInput,
  type GetIncidentInput,
  type GetThreatIntelHostInput,
  type GetWhoisRecordInput,
  type ListAlertsInput,
  type ListDetectionRulesInput,
  type ListIncidentsInput,
  type ListSecureScoresInput,
  type MergeIncidentsInput,
  type RunHuntingQueryInput,
  type UpdateAlertInput,
  type UpdateDetectionRuleInput,
  type UpdateIncidentInput,
  type CorrelationReason,
} from './types';

/** Resolve Graph API base URL from connector config. Falls back to commercial. */
const graphBase = (cloud: Cloud | undefined): string => `${GRAPH_HOST[cloud ?? 'commercial']}/v1.0`;

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const;

const formatError = (action: string, error: unknown): Error => {
  const err = error as AxiosError<{
    error?: { message?: string; code?: string };
    message?: string;
  }>;
  const graphError = err.response?.data?.error;
  const detail = graphError
    ? `${graphError.code ?? 'Error'}: ${graphError.message ?? 'unknown'}`
    : err.response?.data?.message ?? err.message ?? String(error);
  const httpError = new Error(
    `Microsoft Defender XDR ${action} failed (HTTP ${err.response?.status ?? 'unknown'}): ${detail}`
  );
  // Preserve the HTTP status so the connector executor can read it (e.g. 429 Retry-After).
  if (err.response?.status) {
    (httpError as Error & { statusCode?: number }).statusCode = err.response.status;
  }
  return httpError;
};

/** Shared helper that resolves the Graph base URL, makes the request, and wraps errors. */
const graphRequest = async (
  ctx: ActionContext,
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  action: string,
  opts?: { params?: Record<string, string | number>; body?: unknown }
) => {
  const base = graphBase(ctx.config?.cloud as Cloud | undefined);
  const url = `${base}${path}`;
  const reqOpts = { params: opts?.params, headers: JSON_HEADERS };
  try {
    switch (method) {
      case 'get':
        return (await ctx.client.get(url, reqOpts)).data;
      case 'delete':
        return (await ctx.client.delete(url, reqOpts)).data;
      case 'post':
        return (await ctx.client.post(url, opts?.body, reqOpts)).data;
      case 'patch':
        return (await ctx.client.patch(url, opts?.body, reqOpts)).data;
    }
  } catch (error) {
    throw formatError(action, error);
  }
};

export const MicrosoftDefenderXdr: ConnectorSpec = {
  metadata: {
    id: '.microsoft_defender_xdr',
    displayName: 'Microsoft Defender XDR',
    description: i18n.translate(
      'core.kibanaConnectorSpecs.microsoftDefenderXdr.metadata.description',
      {
        defaultMessage:
          'Manage incidents and alerts, run advanced hunting KQL queries, enrich threat intelligence, and triage threats in Microsoft Defender XDR',
      }
    ),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'oauth_client_credentials',
        defaults: {
          scope: 'https://graph.microsoft.com/.default',
        },
        overrides: {
          meta: {
            scope: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftDefenderXdr.auth.scope.label',
                { defaultMessage: 'OAuth scope' }
              ),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftDefenderXdr.auth.scope.helpText',
                {
                  defaultMessage:
                    'Use "https://graph.microsoft.com/.default" for Commercial, ' +
                    '"https://graph.microsoft.us/.default" for GCC High, ' +
                    'or "https://dod-graph.microsoft.us/.default" for DoD. ' +
                    'Must match the cloud environment selected above.',
                }
              ),
            },
            tokenUrl: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftDefenderXdr.auth.tokenUrl.label',
                { defaultMessage: 'Token URL' }
              ),
              placeholder: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftDefenderXdr.auth.tokenUrl.helpText',
                {
                  defaultMessage:
                    "Replace '{tenant-id}' with your Microsoft Entra tenant ID (GUID). " +
                    'Find it in the Azure Portal under Microsoft Entra ID > Overview > Tenant ID.',
                }
              ),
            },
          },
        },
      },
      {
        type: 'oauth_client_credentials_private_key_jwt',
        defaults: {
          scope: 'https://graph.microsoft.com/.default',
          algorithm: 'PS256',
          certificateBinding: 'x5t#S256',
        },
        overrides: {
          meta: {
            scope: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftDefenderXdr.auth.cert.scope.label',
                { defaultMessage: 'OAuth scope' }
              ),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftDefenderXdr.auth.cert.scope.helpText',
                {
                  defaultMessage:
                    'Use "https://graph.microsoft.com/.default" for Commercial, ' +
                    '"https://graph.microsoft.us/.default" for GCC High, ' +
                    'or "https://dod-graph.microsoft.us/.default" for DoD. ' +
                    'Must match the cloud environment selected above.',
                }
              ),
            },
            algorithm: { hidden: true },
            certificateBinding: { hidden: true },
            keyId: { hidden: true },
            tokenUrl: {
              placeholder: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftDefenderXdr.auth.cert.tokenUrl.helpText',
                {
                  defaultMessage:
                    "Replace '{tenant-id}' with your Microsoft Entra tenant ID. " +
                    'Register an application in Microsoft Entra ID, grant it the required Graph application permissions, ' +
                    'and upload a self-signed or CA-issued X.509 certificate under Certificates & secrets > Certificates. ' +
                    'For GCC High or DoD, use the respective national cloud token URL.',
                }
              ),
            },
            clientId: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftDefenderXdr.auth.cert.clientId.helpText',
                {
                  defaultMessage:
                    'The Application (client) ID of the Entra app registration (Azure Portal > Entra ID > App registrations > your app > Overview).',
                }
              ),
            },
            certificate: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftDefenderXdr.auth.cert.certificate.helpText',
                {
                  defaultMessage:
                    'Upload the PEM-encoded public certificate you uploaded to the Entra app registration. Must begin with -----BEGIN CERTIFICATE-----.',
                }
              ),
            },
            privateKey: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.microsoftDefenderXdr.auth.cert.privateKey.helpText',
                {
                  defaultMessage:
                    'Upload the PEM-encoded private key that matches the uploaded certificate. Must begin with -----BEGIN PRIVATE KEY-----, -----BEGIN RSA PRIVATE KEY-----, or -----BEGIN ENCRYPTED PRIVATE KEY-----.',
                }
              ),
            },
          },
        },
      },
    ],
  },

  // Cloud environment selection (commercial, GCC High, DoD).
  schema: CloudConfigSchema,

  actions: {
    listIncidents: {
      isTool: true,
      scope: 'read',
      description:
        'List Microsoft Defender XDR incidents with optional OData filtering, pagination, and ' +
        'optional expansion of related alerts. Use to get an overview of active threats, filter ' +
        'by severity or status, or page through a large incident list.',
      input: ListIncidentsInputSchema,
      handler: async (ctx, input: ListIncidentsInput) => {
        const params: Record<string, string | number> = { $top: input.top, $skip: input.skip };
        if (input.filter) params.$filter = input.filter;
        if (input.includeAlerts) params.$expand = 'alerts';
        const data = await graphRequest(ctx, 'get', '/security/incidents', 'listIncidents', {
          params,
        });
        return { value: data?.value ?? [], nextLink: data?.['@odata.nextLink'] ?? null };
      },
    },

    getIncident: {
      isTool: true,
      scope: 'read',
      description:
        'Retrieve full details for a single Microsoft Defender XDR incident by its numeric ID, ' +
        'including all related alerts and affected assets. ' +
        'Each alert in the response includes an evidence array with device evidence containing mdeDeviceId fields that can be passed to the Microsoft Defender for Endpoint connector.',
      input: GetIncidentInputSchema,
      handler: async (ctx, input: GetIncidentInput) =>
        graphRequest(ctx, 'get', `/security/incidents/${encodeURIComponent(input.incidentId)}`, 'getIncident', {
          params: { $expand: 'alerts' },
        }),
    },

    updateIncident: {
      isTool: true,
      scope: 'destroy',
      description:
        'Update a Microsoft Defender XDR incident — change status (active/resolved/inProgress), ' +
        'assign to an analyst, set classification and determination, adjust severity, ' +
        'or replace custom tags. Provide only the fields you want to change. ' +
        'To add a comment, use addIncidentComment instead.',
      input: UpdateIncidentInputSchema,
      handler: async (ctx, input: UpdateIncidentInput) => {
        const { incidentId, ...fields } = input;
        const body: Record<string, unknown> = {};
        if (fields.status !== undefined) body.status = fields.status;
        if (fields.assignedTo !== undefined) body.assignedTo = fields.assignedTo;
        if (fields.classification !== undefined) body.classification = fields.classification;
        if (fields.determination !== undefined) body.determination = fields.determination;
        if (fields.severity !== undefined) body.severity = fields.severity;
        if (fields.customTags !== undefined) body.customTags = fields.customTags;
        return graphRequest(ctx, 'patch', `/security/incidents/${encodeURIComponent(incidentId)}`, 'updateIncident', { body });
      },
    },

    addIncidentComment: {
      isTool: true,
      scope: 'write',
      description:
        'Append a comment to a Microsoft Defender XDR incident activity log. Use to record analyst ' +
        'notes, investigation findings, or escalation decisions directly on the incident for audit trail purposes.',
      input: AddIncidentCommentInputSchema,
      handler: async (ctx, input: AddIncidentCommentInput) =>
        graphRequest(ctx, 'post', `/security/incidents/${encodeURIComponent(input.incidentId)}/comments`, 'addIncidentComment', {
          body: { comment: input.comment },
        }),
    },

    listAlerts: {
      isTool: true,
      scope: 'read',
      description:
        'List Microsoft Defender XDR alerts (alerts_v2) with optional OData filtering and pagination. ' +
        'Returns cross-product alerts from all Defender services (Endpoint, Office 365, Identity, Cloud Apps). ' +
        'Each alert includes evidence with mdeDeviceId for affected endpoints, usable with the Microsoft Defender for Endpoint connector.',
      input: ListAlertsInputSchema,
      handler: async (ctx, input: ListAlertsInput) => {
        const params: Record<string, string | number> = { $top: input.top, $skip: input.skip };
        if (input.filter) params.$filter = input.filter;
        const data = await graphRequest(ctx, 'get', '/security/alerts_v2', 'listAlerts', { params });
        return { value: data?.value ?? [], nextLink: data?.['@odata.nextLink'] ?? null };
      },
    },

    getAlert: {
      isTool: true,
      scope: 'read',
      description:
        'Retrieve full details for a single Microsoft Defender XDR alert including evidence ' +
        '(affected devices, users, files, processes, and network connections). ' +
        'Device evidence includes mdeDeviceId which can be passed to the Microsoft Defender for Endpoint connector for containment or live-response actions.',
      input: GetAlertInputSchema,
      handler: async (ctx, input: GetAlertInput) =>
        graphRequest(ctx, 'get', `/security/alerts_v2/${encodeURIComponent(input.alertId)}`, 'getAlert'),
    },

    updateAlert: {
      isTool: true,
      scope: 'destroy',
      description:
        'Update a Microsoft Defender XDR alert independently of its parent incident — change status ' +
        '(new/inProgress/resolved), assign to an analyst, or set classification and determination. ' +
        'Use for triage that does not warrant touching the full incident yet. Provide only the fields you want to change.',
      input: UpdateAlertInputSchema,
      handler: async (ctx, input: UpdateAlertInput) => {
        const { alertId, ...fields } = input;
        const body: Record<string, unknown> = {};
        if (fields.status !== undefined) body.status = fields.status;
        if (fields.assignedTo !== undefined) body.assignedTo = fields.assignedTo;
        if (fields.classification !== undefined) body.classification = fields.classification;
        if (fields.determination !== undefined) body.determination = fields.determination;
        return graphRequest(ctx, 'patch', `/security/alerts_v2/${encodeURIComponent(alertId)}`, 'updateAlert', { body });
      },
    },

    runHuntingQuery: {
      isTool: true,
      scope: 'read',
      description:
        'Run a Kusto Query Language (KQL) advanced hunting query against Microsoft Defender XDR ' +
        'tables (DeviceEvents, EmailEvents, AlertInfo, AlertEvidence, IdentityLogonEvents, CloudAppEvents, etc.). ' +
        'Returns schema and result rows. Results are capped at 100,000 rows; queries can access up to 30 days of data.',
      input: RunHuntingQueryInputSchema,
      handler: async (ctx, input: RunHuntingQueryInput) => {
        const body: Record<string, unknown> = { Query: input.query };
        if (input.timespan) body.Timespan = input.timespan;
        const data = await graphRequest(ctx, 'post', '/security/runHuntingQuery', 'runHuntingQuery', { body });
        return { schema: data?.schema ?? [], results: data?.results ?? [], stats: data?.stats ?? null };
      },
    },

    listDetectionRules: {
      isTool: true,
      scope: 'read',
      description:
        'List custom hunting-based detection rules configured in Microsoft Defender XDR. ' +
        'Use to audit what rules are already generating alerts, ' +
        'or to retrieve rule IDs for reference.',
      input: ListDetectionRulesInputSchema,
      handler: async (ctx, input: ListDetectionRulesInput) => {
        const data = await graphRequest(ctx, 'get', '/security/rules/detectionRules', 'listDetectionRules', {
          params: { $top: input.top, $skip: input.skip },
        });
        return { value: data?.value ?? [], nextLink: data?.['@odata.nextLink'] ?? null };
      },
    },

    getDetectionRule: {
      isTool: true,
      scope: 'read',
      description:
        'Retrieve full details for a single custom detection rule by its numeric ID, ' +
        'including its KQL query, schedule, alert template, and trigger settings.',
      input: GetDetectionRuleInputSchema,
      handler: async (ctx, input: GetDetectionRuleInput) =>
        graphRequest(ctx, 'get', `/security/rules/detectionRules/${encodeURIComponent(input.ruleId)}`, 'getDetectionRule'),
    },

    createDetectionRule: {
      isTool: false,
      scope: 'destroy',
      description:
        'Create a new custom hunting-based detection rule in Microsoft Defender XDR. ' +
        'The rule runs a KQL query on the specified schedule and generates alerts when the result count ' +
        'satisfies the trigger condition. The query must project at least one of: ' +
        'DeviceId, AccountObjectId, AccountSid, AccountUpn, AccountName, MailboxAddress, FileName, SHA256, IPAddress, URL.',
      input: CreateDetectionRuleInputSchema,
      handler: async (ctx, input: CreateDetectionRuleInput) =>
        graphRequest(ctx, 'post', '/security/rules/detectionRules', 'createDetectionRule', {
          body: {
            displayName: input.displayName,
            status: input.status,
            queryCondition: { queryText: input.queryText },
            schedule: { frequency: input.period },
            detectionAction: { alertTemplate: input.alertTemplate },
          },
        }),
    },

    updateDetectionRule: {
      isTool: false,
      scope: 'destroy',
      description:
        'Update an existing custom detection rule — change its display name, enable/disable it, ' +
        'modify the KQL query, adjust the schedule period, update the alert template, or change trigger settings. ' +
        'Provide only the fields you want to change.',
      input: UpdateDetectionRuleInputSchema,
      handler: async (ctx, input: UpdateDetectionRuleInput) => {
        const { ruleId, ...fields } = input;
        const body: Record<string, unknown> = {};
        if (fields.displayName !== undefined) body.displayName = fields.displayName;
        if (fields.status !== undefined) body.status = fields.status;
        if (fields.queryText !== undefined) body.queryCondition = { queryText: fields.queryText };
        if (fields.period !== undefined) body.schedule = { frequency: fields.period };
        if (fields.alertTemplate !== undefined) body.detectionAction = { alertTemplate: fields.alertTemplate };
        return graphRequest(ctx, 'patch', `/security/rules/detectionRules/${encodeURIComponent(ruleId)}`, 'updateDetectionRule', { body });
      },
    },

    deleteDetectionRule: {
      isTool: false,
      scope: 'destroy',
      description:
        'Delete a custom detection rule by its numeric ID. ' +
        'Use to retire a detection that is no longer relevant or has been superseded. ' +
        'This action is irreversible — confirm the rule ID with listDetectionRules or getDetectionRule first.',
      input: DeleteDetectionRuleInputSchema,
      handler: async (ctx, input: DeleteDetectionRuleInput) => {
        await graphRequest(ctx, 'delete', `/security/rules/detectionRules/${encodeURIComponent(input.ruleId)}`, 'deleteDetectionRule');
        return { deleted: true, ruleId: input.ruleId };
      },
    },

    addAlertComment: {
      isTool: true,
      scope: 'write',
      description:
        'Append a comment to a Microsoft Defender XDR alert. Use to record triage notes, ' +
        'analyst observations, or escalation decisions directly on the alert for audit trail purposes.',
      input: AddAlertCommentInputSchema,
      handler: async (ctx, input: AddAlertCommentInput) =>
        graphRequest(ctx, 'post', `/security/alerts_v2/${encodeURIComponent(input.alertId)}/comments`, 'addAlertComment', {
          body: { comment: input.comment },
        }),
    },

    mergeIncidents: {
      isTool: false,
      scope: 'destroy',
      description:
        'Merge two or more Microsoft Defender XDR incidents into a single incident. ' +
        'The first incident ID in the list becomes the primary (surviving) incident; the others are merged into it. ' +
        'Use to consolidate duplicate detections or combine related incidents from the same attack campaign. ' +
        'This action is irreversible — verify the incident IDs with listIncidents or getIncident first.',
      input: MergeIncidentsInputSchema,
      handler: async (ctx, input: MergeIncidentsInput) => {
        const body: Record<string, unknown> = {
          incidentIds: input.incidentIds,
          incidentComment: input.comment,
        };
        if (input.mergeReasons !== undefined) {
          body.mergeReasons = (input.mergeReasons as CorrelationReason[]).join(',');
        }
        return graphRequest(ctx, 'post', '/security/incidents/mergeIncidents', 'mergeIncidents', { body });
      },
    },

    getThreatIntelHost: {
      isTool: true,
      scope: 'read',
      description:
        'Retrieve Microsoft Defender Threat Intelligence (MDTI) data for a hostname or IP address — ' +
        'including associated threat actors, malware families, infrastructure relationships, and first/last seen dates. ' +
        'Requires the ThreatIntelligence.Read.All Graph permission.',
      input: GetThreatIntelHostInputSchema,
      handler: async (ctx, input: GetThreatIntelHostInput) =>
        graphRequest(ctx, 'get', `/security/threatIntelligence/hosts/${encodeURIComponent(input.host)}`, 'getThreatIntelHost'),
    },

    getThreatIntelHostReputation: {
      isTool: true,
      scope: 'read',
      description:
        'Get the Microsoft Defender Threat Intelligence reputation score and classification for a hostname or IP address. ' +
        'Returns a score (0–100, higher = more malicious), a classification (malicious/suspicious/neutral/benign), ' +
        'and the rules that influenced the score. ' +
        'Requires the ThreatIntelligence.Read.All Graph permission.',
      input: GetThreatIntelHostInputSchema,
      handler: async (ctx, input: GetThreatIntelHostInput) =>
        graphRequest(ctx, 'get', `/security/threatIntelligence/hosts/${encodeURIComponent(input.host)}/reputation`, 'getThreatIntelHostReputation'),
    },

    getPassiveDnsRecords: {
      isTool: true,
      scope: 'read',
      description:
        'Retrieve forward passive DNS records for a hostname from Microsoft Defender Threat Intelligence. ' +
        'Returns historical DNS resolution data showing what IPs a domain resolved to. ' +
        'Use to pivot across attacker infrastructure during threat hunting or attribution investigations. ' +
        'Requires the ThreatIntelligence.Read.All Graph permission.',
      input: GetThreatIntelHostInputSchema,
      handler: async (ctx, input: GetThreatIntelHostInput) => {
        const data = await graphRequest(ctx, 'get', `/security/threatIntelligence/hosts/${encodeURIComponent(input.host)}/passivedns`, 'getPassiveDnsRecords');
        return { value: data?.value ?? [], nextLink: data?.['@odata.nextLink'] ?? null };
      },
    },

    getWhoisRecord: {
      isTool: true,
      scope: 'read',
      description:
        'Retrieve WHOIS registration data for a domain from Microsoft Defender Threat Intelligence. ' +
        'Returns registrar, registrant contact details, name servers, registration and expiry dates, and abuse contact. ' +
        'Use to attribute domains to known threat actors or identify recently registered infrastructure. ' +
        'Requires the ThreatIntelligence.Read.All Graph permission.',
      input: GetWhoisRecordInputSchema,
      handler: async (ctx, input: GetWhoisRecordInput) =>
        graphRequest(ctx, 'get', `/security/threatIntelligence/hosts/${encodeURIComponent(input.host)}/whois`, 'getWhoisRecord'),
    },

    listSecureScores: {
      isTool: true,
      scope: 'read',
      description:
        'Retrieve Microsoft Secure Score snapshots from the Graph Security API. ' +
        "Returns the organization's composite identity, device, and app security score with control-level breakdowns. " +
        'Results are ordered by date descending so the most recent score is first. ' +
        'Requires the SecurityEvents.Read.All Graph permission.',
      input: ListSecureScoresInputSchema,
      handler: async (ctx, input: ListSecureScoresInput) => {
        const data = await graphRequest(ctx, 'get', '/security/secureScores', 'listSecureScores', {
          params: { $top: input.top },
        });
        return { value: data?.value ?? [], nextLink: data?.['@odata.nextLink'] ?? null };
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.microsoftDefenderXdr.test.description', {
      defaultMessage:
        'Verifies connectivity to Microsoft Defender XDR by fetching the most recent incident.',
    }),
    handler: async (ctx) => {
      const base = graphBase(ctx.config?.cloud as Cloud | undefined);
      try {
        const response = await ctx.client.get(`${base}/security/incidents`, {
          params: { $top: 1 },
          headers: JSON_HEADERS,
        });
        const count = Array.isArray(response.data?.value) ? response.data.value.length : 0;
        return { connected: true, incidentsReturned: count };
      } catch (error) {
        throw formatError('test', error);
      }
    },
  },

  skill: [
    '## Microsoft Defender XDR Connector',
    '',
    'This connector integrates with Microsoft Defender XDR via the Microsoft Graph Security API.',
    'It exposes incident management, alert triage, advanced hunting, detection rule auditing,',
    'threat intelligence enrichment, and secure score reporting as agent tools.',
    '',
    '### Setup',
    '- Register an application in Microsoft Entra ID (Azure AD).',
    '- Grant the following **Application** (not Delegated) permissions on Microsoft Graph:',
    '  - `SecurityIncident.ReadWrite.All` — read, update, and comment on incidents',
    '  - `SecurityAlert.ReadWrite.All` — read, update, and comment on alerts',
    '  - `ThreatHunting.Read.All` — run advanced hunting queries',
    '  - `CustomDetection.Read.All` — list and read custom detection rules',
    '  - `ThreatIntelligence.Read.All` — threat intelligence enrichment (host, reputation, passive DNS, WHOIS)',
    '  - `SecurityEvents.Read.All` — read Microsoft Secure Score',
    '- Authenticate with a **client secret** or a **certificate** (upload the X.509 cert to the app registration).',
    '- For US Government clouds, select the matching **Cloud environment** in the connector config and use the GCC High or DoD token URL.',
    '- Set the Token URL to: `https://login.microsoftonline.com/{your-tenant-id}/oauth2/v2.0/token`.',
    '',
    '### Device ID handoff to Microsoft Defender for Endpoint',
    '- `getAlert` responses include a top-level `evidence` array. `getIncident` responses nest evidence under `alerts[].evidence`.',
    '  Device evidence items contain `mdeDeviceId` (the Defender for Endpoint machine ID) and `deviceDnsName`.',
    '- Pass `mdeDeviceId` to the Microsoft Defender for Endpoint connector to trigger isolate, scan, or live-response actions.',
    '',
    '### Typical usage patterns',
    '- **Triage new threats**: call `listIncidents` with `filter: "status eq \'active\'"` ' +
      'and `includeAlerts: true` to see all active incidents with their alerts.',
    '- **Assign an incident**: call `updateIncident` with the incident ID and `assignedTo` set to an analyst UPN.',
    '- **Add an audit note to an incident**: call `addIncidentComment` with the incident ID and a comment describing findings or escalation steps.',
    '- **Add an audit note to an alert**: call `addAlertComment` with the alert ID and a triage note.',
    '- **Triage an alert independently**: call `updateAlert` with `status: "inProgress"` before the incident is fully classified.',
    '- **Resolve an alert**: call `updateAlert` with `status: "resolved"`, `classification`, and `determination`.',
    '- **Hunt for threats**: call `runHuntingQuery` with a KQL query such as ' +
      '`DeviceEvents | where ActionType == "ProcessCreated" | limit 10`.',
    '- **Audit detection rules**: call `listDetectionRules` to see what custom detections are active.',
    '- **Enrich a suspicious host**: call `getThreatIntelHostReputation` to get a score and classification, ' +
      'then `getThreatIntelHost` for full threat actor and malware associations.',
    '- **Pivot on infrastructure**: call `getPassiveDnsRecords` to find what IPs a domain resolved to via historical DNS.',
    '- **Look up domain registration**: call `getWhoisRecord` to identify the registrant and registration date.',
    '- **Report on security posture**: call `listSecureScores` to retrieve the latest Microsoft Secure Score snapshot.',
    '',
    '### Notes',
    '- Incidents aggregate related alerts. Use `getIncident` with `$expand=alerts` to see alerts grouped by incident.',
    '- Advanced hunting covers up to 30 days of data; queries respect your Defender XDR retention settings.',
    "- OData `$filter` expressions use single quotes for string values: `severity eq 'high'`.",
    '- Detection rule listing and reading require the `CustomDetection.Read.All` Graph permission. Rule creation, update, and deletion are not yet exposed as agent tools.',
    '- Threat Intelligence actions require the `ThreatIntelligence.Read.All` permission and a Defender XDR or Microsoft Threat Intelligence license.',
  ].join('\n'),
};
