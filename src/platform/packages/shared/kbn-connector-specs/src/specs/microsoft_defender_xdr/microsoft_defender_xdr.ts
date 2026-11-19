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
 * Exposes incident management, alert management, advanced hunting, and custom detection
 * rule management as agent tools.
 *
 * API base URL: https://graph.microsoft.com/v1.0 (commercial)
 *               https://graph.microsoft.us/v1.0   (GCC High)
 *               https://dod-graph.microsoft.us/v1.0 (DoD)
 * Auth: OAuth 2.0 Client Credentials or certificate (private key JWT)
 * Docs: https://learn.microsoft.com/en-us/defender-xdr/api-overview
 */

import { i18n } from '@kbn/i18n';
import type { AxiosError } from 'axios';
import type { ConnectorSpec } from '../../connector_spec';
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
const graphBase = (cloud: Cloud | undefined): string =>
  `${GRAPH_HOST[cloud ?? 'commercial']}/v1.0`;

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
  return new Error(
    `Microsoft Defender XDR ${action} failed (HTTP ${err.response?.status ?? 'unknown'}): ${detail}`
  );
};

export const MicrosoftDefenderXdr: ConnectorSpec = {
  metadata: {
    id: '.microsoft_defender_xdr',
    displayName: 'Microsoft Defender XDR',
    description: i18n.translate(
      'core.kibanaConnectorSpecs.microsoftDefenderXdr.metadata.description',
      {
        defaultMessage:
          'Manage incidents and alerts, run advanced hunting KQL queries, manage custom detection rules, and triage threats in Microsoft Defender XDR',
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
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        const params: Record<string, string | number> = {
          $top: input.top,
          $skip: input.skip,
        };
        if (input.filter) {
          params.$filter = input.filter;
        }
        if (input.includeAlerts) {
          params.$expand = 'alerts';
        }
        try {
          const response = await ctx.client.get(`${base}/security/incidents`, {
            params,
            headers: JSON_HEADERS,
          });
          return {
            value: response.data?.value ?? [],
            nextLink: response.data?.['@odata.nextLink'] ?? null,
          };
        } catch (error) {
          throw formatError('listIncidents', error);
        }
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
      handler: async (ctx, input: GetIncidentInput) => {
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        try {
          const response = await ctx.client.get(
            `${base}/security/incidents/${encodeURIComponent(input.incidentId)}`,
            {
              params: { $expand: 'alerts' },
              headers: JSON_HEADERS,
            }
          );
          return response.data;
        } catch (error) {
          throw formatError('getIncident', error);
        }
      },
    },

    updateIncident: {
      isTool: true,
      scope: 'write',
      description:
        'Update a Microsoft Defender XDR incident — change status (active/resolved/inProgress), ' +
        'assign to an analyst, set classification and determination, adjust severity, ' +
        'or replace custom tags. Provide only the fields you want to change.',
      input: UpdateIncidentInputSchema,
      handler: async (ctx, input: UpdateIncidentInput) => {
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        const { incidentId, ...fields } = input;
        const body: Record<string, unknown> = {};
        if (fields.status !== undefined) body.status = fields.status;
        if (fields.assignedTo !== undefined) body.assignedTo = fields.assignedTo;
        if (fields.classification !== undefined) body.classification = fields.classification;
        if (fields.determination !== undefined) body.determination = fields.determination;
        if (fields.severity !== undefined) body.severity = fields.severity;
        if (fields.customTags !== undefined) body.customTags = fields.customTags;
        if (fields.comment !== undefined) body.comment = fields.comment;
        try {
          const response = await ctx.client.patch(
            `${base}/security/incidents/${encodeURIComponent(incidentId)}`,
            body,
            { headers: JSON_HEADERS }
          );
          return response.data;
        } catch (error) {
          throw formatError('updateIncident', error);
        }
      },
    },

    addIncidentComment: {
      isTool: true,
      scope: 'write',
      description:
        'Append a comment to a Microsoft Defender XDR incident activity log. Use to record analyst ' +
        'notes, investigation findings, or escalation decisions directly on the incident for audit trail purposes.',
      input: AddIncidentCommentInputSchema,
      handler: async (ctx, input: AddIncidentCommentInput) => {
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        try {
          const response = await ctx.client.post(
            `${base}/security/incidents/${encodeURIComponent(input.incidentId)}/comments`,
            { comment: input.comment },
            { headers: JSON_HEADERS }
          );
          return response.data;
        } catch (error) {
          throw formatError('addIncidentComment', error);
        }
      },
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
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        const params: Record<string, string | number> = {
          $top: input.top,
          $skip: input.skip,
        };
        if (input.filter) {
          params.$filter = input.filter;
        }
        try {
          const response = await ctx.client.get(`${base}/security/alerts_v2`, {
            params,
            headers: JSON_HEADERS,
          });
          return {
            value: response.data?.value ?? [],
            nextLink: response.data?.['@odata.nextLink'] ?? null,
          };
        } catch (error) {
          throw formatError('listAlerts', error);
        }
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
      handler: async (ctx, input: GetAlertInput) => {
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        try {
          const response = await ctx.client.get(
            `${base}/security/alerts_v2/${encodeURIComponent(input.alertId)}`,
            { headers: JSON_HEADERS }
          );
          return response.data;
        } catch (error) {
          throw formatError('getAlert', error);
        }
      },
    },

    updateAlert: {
      isTool: true,
      scope: 'write',
      description:
        'Update a Microsoft Defender XDR alert independently of its parent incident — change status ' +
        '(new/inProgress/resolved), assign to an analyst, set classification, determination, or severity. ' +
        'Use for triage that does not warrant touching the full incident yet. Provide only the fields you want to change.',
      input: UpdateAlertInputSchema,
      handler: async (ctx, input: UpdateAlertInput) => {
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        const { alertId, ...fields } = input;
        const body: Record<string, unknown> = {};
        if (fields.status !== undefined) body.status = fields.status;
        if (fields.assignedTo !== undefined) body.assignedTo = fields.assignedTo;
        if (fields.classification !== undefined) body.classification = fields.classification;
        if (fields.determination !== undefined) body.determination = fields.determination;
        if (fields.severity !== undefined) body.severity = fields.severity;
        try {
          const response = await ctx.client.patch(
            `${base}/security/alerts_v2/${encodeURIComponent(alertId)}`,
            body,
            { headers: JSON_HEADERS }
          );
          return response.data;
        } catch (error) {
          throw formatError('updateAlert', error);
        }
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
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        const body: Record<string, unknown> = { Query: input.query };
        if (input.timespan) {
          body.Timespan = input.timespan;
        }
        try {
          const response = await ctx.client.post(`${base}/security/runHuntingQuery`, body, {
            headers: JSON_HEADERS,
          });
          return {
            schema: response.data?.schema ?? [],
            results: response.data?.results ?? [],
            stats: response.data?.stats ?? null,
          };
        } catch (error) {
          throw formatError('runHuntingQuery', error);
        }
      },
    },

    listDetectionRules: {
      isTool: true,
      scope: 'read',
      description:
        'List custom hunting-based detection rules configured in Microsoft Defender XDR. ' +
        'Use to audit what rules are already generating alerts before creating a new one, ' +
        'or to retrieve rule IDs for update or delete operations.',
      input: ListDetectionRulesInputSchema,
      handler: async (ctx, input: ListDetectionRulesInput) => {
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        const params: Record<string, string | number> = {
          $top: input.top,
          $skip: input.skip,
        };
        try {
          const response = await ctx.client.get(`${base}/security/rules/detectionRules`, {
            params,
            headers: JSON_HEADERS,
          });
          return {
            value: response.data?.value ?? [],
            nextLink: response.data?.['@odata.nextLink'] ?? null,
          };
        } catch (error) {
          throw formatError('listDetectionRules', error);
        }
      },
    },

    getDetectionRule: {
      isTool: true,
      scope: 'read',
      description:
        'Retrieve full details for a single custom detection rule by its numeric ID, ' +
        'including its KQL query, schedule, alert template, and trigger settings.',
      input: GetDetectionRuleInputSchema,
      handler: async (ctx, input: GetDetectionRuleInput) => {
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        try {
          const response = await ctx.client.get(
            `${base}/security/rules/detectionRules/${encodeURIComponent(input.ruleId)}`,
            { headers: JSON_HEADERS }
          );
          return response.data;
        } catch (error) {
          throw formatError('getDetectionRule', error);
        }
      },
    },

    createDetectionRule: {
      isTool: false,
      scope: 'write',
      description:
        'Create a new custom hunting-based detection rule in Microsoft Defender XDR. ' +
        'The rule runs a KQL query on the specified schedule and generates alerts when the result count ' +
        'satisfies the trigger condition. The query must project at least one of: ' +
        'DeviceId, AccountObjectId, AccountSid, AccountUpn, AccountName, MailboxAddress, FileName, SHA256, IPAddress, URL.',
      input: CreateDetectionRuleInputSchema,
      handler: async (ctx, input: CreateDetectionRuleInput) => {
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        // Graph API wraps fields in nested objects: queryCondition, schedule, detectionAction
        const body = {
          displayName: input.displayName,
          isEnabled: input.isEnabled,
          queryCondition: { queryText: input.queryText },
          schedule: { frequency: input.period },
          detectionAction: {
            alertTemplate: input.alertTemplate,
          },
        };
        try {
          const response = await ctx.client.post(
            `${base}/security/rules/detectionRules`,
            body,
            { headers: JSON_HEADERS }
          );
          return response.data;
        } catch (error) {
          throw formatError('createDetectionRule', error);
        }
      },
    },

    updateDetectionRule: {
      isTool: false,
      scope: 'write',
      description:
        'Update an existing custom detection rule — change its display name, enable/disable it, ' +
        'modify the KQL query, adjust the schedule period, update the alert template, or change trigger settings. ' +
        'Provide only the fields you want to change.',
      input: UpdateDetectionRuleInputSchema,
      handler: async (ctx, input: UpdateDetectionRuleInput) => {
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        const { ruleId, ...fields } = input;
        // Graph API uses nested objects — only include changed top-level wrappers
        const body: Record<string, unknown> = {};
        if (fields.displayName !== undefined) body.displayName = fields.displayName;
        if (fields.isEnabled !== undefined) body.isEnabled = fields.isEnabled;
        if (fields.queryText !== undefined) {
          body.queryCondition = { queryText: fields.queryText };
        }
        if (fields.period !== undefined) {
          body.schedule = { frequency: fields.period };
        }
        // Build detectionAction only when alertTemplate changes
        if (fields.alertTemplate !== undefined) {
          body.detectionAction = { alertTemplate: fields.alertTemplate };
        }
        try {
          const response = await ctx.client.patch(
            `${base}/security/rules/detectionRules/${encodeURIComponent(ruleId)}`,
            body,
            { headers: JSON_HEADERS }
          );
          return response.data;
        } catch (error) {
          throw formatError('updateDetectionRule', error);
        }
      },
    },

    deleteDetectionRule: {
      isTool: false,
      scope: 'write',
      description:
        'Delete a custom detection rule by its numeric ID. ' +
        'Use to retire a detection that is no longer relevant or has been superseded. ' +
        'This action is irreversible — confirm the rule ID with listDetectionRules or getDetectionRule first.',
      input: DeleteDetectionRuleInputSchema,
      handler: async (ctx, input: DeleteDetectionRuleInput) => {
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        try {
          await ctx.client.delete(
            `${base}/security/rules/detectionRules/${encodeURIComponent(input.ruleId)}`,
            { headers: JSON_HEADERS }
          );
          return { deleted: true, ruleId: input.ruleId };
        } catch (error) {
          throw formatError('deleteDetectionRule', error);
        }
      },
    },

    addAlertComment: {
      isTool: true,
      scope: 'write',
      description:
        'Append a comment to a Microsoft Defender XDR alert. Use to record triage notes, ' +
        'analyst observations, or escalation decisions directly on the alert for audit trail purposes.',
      input: AddAlertCommentInputSchema,
      handler: async (ctx, input: AddAlertCommentInput) => {
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        try {
          const response = await ctx.client.post(
            `${base}/security/alerts_v2/${encodeURIComponent(input.alertId)}/comments`,
            { comment: input.comment },
            { headers: JSON_HEADERS }
          );
          return response.data;
        } catch (error) {
          throw formatError('addAlertComment', error);
        }
      },
    },

    mergeIncidents: {
      isTool: false,
      scope: 'write',
      description:
        'Merge two or more Microsoft Defender XDR incidents into a single incident. ' +
        'The first incident ID in the list becomes the primary (surviving) incident; the others are merged into it. ' +
        'Use to consolidate duplicate detections or combine related incidents from the same attack campaign. ' +
        'This action is irreversible — verify the incident IDs with listIncidents or getIncident first.',
      input: MergeIncidentsInputSchema,
      handler: async (ctx, input: MergeIncidentsInput) => {
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        // The Graph API uses `incidentComment` (not `comment`) and optionally `mergeReasons`.
        const body: Record<string, unknown> = {
          incidentIds: input.incidentIds,
          incidentComment: input.comment,
        };
        if (input.mergeReasons !== undefined) {
          body.mergeReasons = (input.mergeReasons as CorrelationReason[]).join(',');
        }
        try {
          const response = await ctx.client.post(
            `${base}/security/incidents/mergeIncidents`,
            body,
            { headers: JSON_HEADERS }
          );
          return response.data;
        } catch (error) {
          throw formatError('mergeIncidents', error);
        }
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
      handler: async (ctx, input: GetThreatIntelHostInput) => {
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        try {
          const response = await ctx.client.get(
            `${base}/security/threatIntelligence/hosts/${encodeURIComponent(input.host)}`,
            { headers: JSON_HEADERS }
          );
          return response.data;
        } catch (error) {
          throw formatError('getThreatIntelHost', error);
        }
      },
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
      handler: async (ctx, input: GetThreatIntelHostInput) => {
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        try {
          const response = await ctx.client.get(
            `${base}/security/threatIntelligence/hosts/${encodeURIComponent(input.host)}/reputation`,
            { headers: JSON_HEADERS }
          );
          return response.data;
        } catch (error) {
          throw formatError('getThreatIntelHostReputation', error);
        }
      },
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
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        try {
          const response = await ctx.client.get(
            `${base}/security/threatIntelligence/hosts/${encodeURIComponent(input.host)}/passivedns`,
            { headers: JSON_HEADERS }
          );
          return {
            value: response.data?.value ?? [],
            nextLink: response.data?.['@odata.nextLink'] ?? null,
          };
        } catch (error) {
          throw formatError('getPassiveDnsRecords', error);
        }
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
      handler: async (ctx, input: GetWhoisRecordInput) => {
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        try {
          const response = await ctx.client.get(
            `${base}/security/threatIntelligence/hosts/${encodeURIComponent(input.host)}/whois`,
            { headers: JSON_HEADERS }
          );
          return response.data;
        } catch (error) {
          throw formatError('getWhoisRecord', error);
        }
      },
    },

    listSecureScores: {
      isTool: true,
      scope: 'read',
      description:
        'Retrieve Microsoft Secure Score snapshots from the Graph Security API. ' +
        'Returns the organization\'s composite identity, device, and app security score with control-level breakdowns. ' +
        'Results are ordered by date descending so the most recent score is first. ' +
        'Requires the SecurityEvents.Read.All Graph permission.',
      input: ListSecureScoresInputSchema,
      handler: async (ctx, input: ListSecureScoresInput) => {
        const base = graphBase(ctx.config?.cloud as Cloud | undefined);
        try {
          const response = await ctx.client.get(`${base}/security/secureScores`, {
            params: { $top: input.top },
            headers: JSON_HEADERS,
          });
          return {
            value: response.data?.value ?? [],
            nextLink: response.data?.['@odata.nextLink'] ?? null,
          };
        } catch (error) {
          throw formatError('listSecureScores', error);
        }
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
    'It exposes incident management, alert triage, advanced hunting, custom detection rule management,',
    'threat intelligence enrichment, and secure score reporting as agent tools.',
    '',
    '### Setup',
    '- Register an application in Microsoft Entra ID (Azure AD).',
    '- Grant the following **Application** (not Delegated) permissions on Microsoft Graph:',
    '  - `SecurityIncident.ReadWrite.All` — read, update, and merge incidents',
    '  - `SecurityAlert.ReadWrite.All` — read, update, and comment on alerts',
    '  - `ThreatHunting.Read.All` — run advanced hunting queries',
    '  - `CustomDetection.ReadWrite.All` — manage custom detection rules',
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
    '- Custom detection rules require the `CustomDetection.ReadWrite.All` Graph permission.',
    '- Threat Intelligence actions require the `ThreatIntelligence.Read.All` permission and a Defender XDR or Microsoft Threat Intelligence license.',
    '- `mergeIncidents` is irreversible — verify incident IDs before calling.',
  ].join('\n'),
};
