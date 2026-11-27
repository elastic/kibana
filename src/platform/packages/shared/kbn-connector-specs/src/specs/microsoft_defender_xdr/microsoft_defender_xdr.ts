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
import type { ConnectorSpec } from '../../connector_spec';
import { CloudConfigSchema } from './types';
import type { Cloud } from './types';
import { graphBase, formatError, JSON_HEADERS } from './client';
import { incidentActions } from './incidents_actions';
import { alertActions } from './alerts_actions';
import { huntingActions } from './hunting_actions';
import { detectionRuleActions } from './detection_rules_actions';
import { threatIntelActions } from './threat_intel_actions';
import { secureScoreActions } from './secure_score_actions';

export const MicrosoftDefenderXdr: ConnectorSpec = {
  metadata: {
    id: '.microsoft_defender_xdr',
    displayName: 'Microsoft Defender XDR',
    description: i18n.translate('connectorSpecs.microsoftDefenderXdr.metadata.description', {
      defaultMessage:
        'Manage incidents and alerts, run advanced hunting KQL queries, enrich threat intelligence, and triage threats in Microsoft Defender XDR',
    }),
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
              label: i18n.translate('connectorSpecs.microsoftDefenderXdr.auth.scope.label', {
                defaultMessage: 'OAuth scope',
              }),
              helpText: i18n.translate('connectorSpecs.microsoftDefenderXdr.auth.scope.helpText', {
                defaultMessage:
                  'Use "https://graph.microsoft.com/.default" for Commercial, ' +
                  '"https://graph.microsoft.us/.default" for GCC High, ' +
                  'or "https://dod-graph.microsoft.us/.default" for DoD. ' +
                  'Must match the cloud environment selected above.',
              }),
            },
            tokenUrl: {
              label: i18n.translate('connectorSpecs.microsoftDefenderXdr.auth.tokenUrl.label', {
                defaultMessage: 'Token URL',
              }),
              placeholder: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token',
              helpText: i18n.translate(
                'connectorSpecs.microsoftDefenderXdr.auth.tokenUrl.helpText',
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
              label: i18n.translate('connectorSpecs.microsoftDefenderXdr.auth.cert.scope.label', {
                defaultMessage: 'OAuth scope',
              }),
              helpText: i18n.translate(
                'connectorSpecs.microsoftDefenderXdr.auth.cert.scope.helpText',
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
                'connectorSpecs.microsoftDefenderXdr.auth.cert.tokenUrl.helpText',
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
                'connectorSpecs.microsoftDefenderXdr.auth.cert.clientId.helpText',
                {
                  defaultMessage:
                    'The Application (client) ID of the Entra app registration (Azure Portal > Entra ID > App registrations > your app > Overview).',
                }
              ),
            },
            certificate: {
              helpText: i18n.translate(
                'connectorSpecs.microsoftDefenderXdr.auth.cert.certificate.helpText',
                {
                  defaultMessage:
                    'Upload the PEM-encoded public certificate you uploaded to the Entra app registration. Must begin with -----BEGIN CERTIFICATE-----.',
                }
              ),
            },
            privateKey: {
              helpText: i18n.translate(
                'connectorSpecs.microsoftDefenderXdr.auth.cert.privateKey.helpText',
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
    ...incidentActions,
    ...alertActions,
    ...huntingActions,
    ...detectionRuleActions,
    ...threatIntelActions,
    ...secureScoreActions,
  },

  test: {
    enabled: true,
    description: i18n.translate('connectorSpecs.microsoftDefenderXdr.test.description', {
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
    '- **Get incident details with alerts**: call `getIncident` with `includeAlerts: true` to retrieve the incident and its full alert and evidence payload.',
    '- **Add an audit note to an incident**: call `addIncidentComment` with the incident ID and a comment describing findings or escalation steps.',
    '- **Add an audit note to an alert**: call `addAlertComment` with the alert ID and a triage note.',
    '- **Hunt for threats**: call `runHuntingQuery` with a KQL query such as ' +
      '`DeviceEvents | where ActionType == "ProcessCreated" | limit 10`.',
    '- **Audit detection rules**: call `listDetectionRules` to see what custom detections are active.',
    '- **Enrich a suspicious host**: call `getThreatIntelHostReputation` to get a risk score and classification, ' +
      'then `getThreatIntelHost` for the host record (first-seen and last-seen dates).',
    '- **Pivot on infrastructure**: call `getPassiveDnsRecords` to find what IPs a domain resolved to via historical DNS.',
    '- **Look up domain registration**: call `getWhoisRecord` to identify the registrant and registration date.',
    '- **Report on security posture**: call `listSecureScores` to retrieve the latest Microsoft Secure Score snapshot.',
    '',
    '### Notes',
    '- `updateIncident` and `updateAlert` are API-only and cannot be called by agents. To record analyst actions, use `addIncidentComment` or `addAlertComment`.',
    '- Incidents aggregate related alerts. Use `getIncident` with `includeAlerts: true` to retrieve alerts and evidence. Omit `includeAlerts` when you only need incident status or assignee.',
    '- Advanced hunting covers up to 30 days of data; queries respect your Defender XDR retention settings.',
    "- OData `$filter` expressions use single quotes for string values: `severity eq 'high'`.",
    '- Detection rule listing and reading require the `CustomDetection.Read.All` Graph permission. Rule creation, update, and deletion are not yet exposed as agent tools.',
    '- Threat Intelligence actions require the `ThreatIntelligence.Read.All` permission and a Defender XDR or Microsoft Threat Intelligence license.',
  ].join('\n'),
};
