/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SolarWinds Platform (Orion) connector.
 *
 * Talks to the SolarWinds Information Service (SWIS) REST API on the main polling
 * engine (port 17774 by default). Reads go through SWQL queries; writes go through
 * SWIS verbs, which take positional arguments as a JSON array.
 *
 * https://solarwinds.github.io/OrionSDK/docs/rest/
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import { UISchemas } from '../../connector_spec';
import { swisInvoke, swisQuery, swisRead } from './client';
import {
  buildAcknowledgedAlertsQuery,
  buildGetAlertQuery,
  buildGetNodeQuery,
  buildListActiveAlertsQuery,
  buildSearchNodesQuery,
} from './queries';
import {
  AcknowledgeAlertInputSchema,
  GetAlertInputSchema,
  GetNodeInputSchema,
  ListActiveAlertsInputSchema,
  QueryInputSchema,
  SearchNodesInputSchema,
  SOLARWINDS_SEVERITIES,
  type AcknowledgeAlertInput,
  type GetAlertInput,
  type GetNodeInput,
  type ListActiveAlertsInput,
  type QueryInput,
  type SearchNodesInput,
} from './types';

const MAX_QUERY_ROWS = 1000;

/** System fields SWIS returns on every `Orion.NodesCustomProperties` object. */
const CUSTOM_PROPERTY_SYSTEM_FIELDS = new Set([
  'NodeID',
  'DisplayName',
  'Description',
  'InstanceType',
  'Uri',
  'InstanceSiteId',
]);

type AlertRow = Record<string, unknown> & { Severity?: number };

const withSeverityName = (alert: AlertRow) => ({
  ...alert,
  SeverityName: alert.Severity === undefined ? undefined : SOLARWINDS_SEVERITIES[alert.Severity],
});

const nextOffset = (offset: number, returned: number, totalRows?: number): number | undefined =>
  totalRows !== undefined && offset + returned < totalRows ? offset + returned : undefined;

export const SolarWindsPlatform: ConnectorSpec = {
  metadata: {
    id: '.solarwinds_platform',
    displayName: 'SolarWinds Platform',
    description: i18n.translate(
      'core.kibanaConnectorSpecs.solarwindsPlatform.metadata.description',
      {
        defaultMessage:
          'Run SWQL queries, list, read, and acknowledge active alerts, and look up nodes in SolarWinds Platform (formerly Orion)',
      }
    ),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [
      {
        type: 'basic_with_tls',
        isRecommended: true,
        defaults: {},
        overrides: {
          meta: {
            username: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.solarwindsPlatform.auth.username.helpText',
                {
                  defaultMessage:
                    'A SolarWinds Platform account, for example a local Orion account or DOMAIN\\user. The query action can read all data this account can read, so use an account with only the permissions you need. To acknowledge alerts, the account needs the "Allow Account to Clear Events, Acknowledge Alerts and Syslogs" permission.',
                }
              ),
            },
            verificationMode: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.solarwindsPlatform.auth.verificationMode.helpText',
                {
                  defaultMessage:
                    'How to verify the SWIS TLS certificate. SolarWinds uses a self-signed certificate by default: paste its CA certificate above, or use "none" to turn off verification.',
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
      url: UISchemas.url('https://orion.example.com:17774')
        .describe('SolarWinds Information Service (SWIS) base URL')
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.solarwindsPlatform.config.url.label', {
            defaultMessage: 'SWIS URL',
          }),
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.solarwindsPlatform.config.url.helpText',
            {
              defaultMessage:
                'The protocol, host, and port of the SolarWinds Information Service on the main polling engine, for example https://orion.example.com:17774. Do not include a path.',
            }
          ),
        }),
    })
  ),

  validateUrls: {
    fields: ['url'],
  },

  actions: {
    query: {
      isTool: true,
      scope: 'read',
      description:
        'Run a read-only SWQL query against SolarWinds and return the rows. Use it for data the other actions do not cover: interfaces (Orion.NPM.Interfaces), CPU history (Orion.CPULoad), events (Orion.Events), alert history (Orion.AlertHistory), or custom properties. Pass values as @parameters instead of inlining them. Returns at most 1000 rows; use TOP or WITH ROWS to page.',
      input: QueryInputSchema,
      handler: async (ctx, input: QueryInput) => {
        const { results, totalRows } = await swisQuery<Record<string, unknown>>(
          ctx,
          input.query,
          input.parameters
        );
        return {
          results: results.slice(0, MAX_QUERY_ROWS),
          count: Math.min(results.length, MAX_QUERY_ROWS),
          totalRows,
          truncated: results.length > MAX_QUERY_ROWS,
        };
      },
    },

    listActiveAlerts: {
      isTool: true,
      scope: 'read',
      description:
        'List the currently active SolarWinds alerts, newest first. Each alert has AlertActiveID, AlertObjectID (needed by acknowledgeAlert), AlertName, Severity and SeverityName, TriggeredDateTime, TriggeredMessage, the acknowledged state, the triggering entity (EntityType, EntityCaption, EntityUri), and the related node (NodeID, NodeCaption). Use it to pick up new alerts on a schedule or to check the alerts on one node.',
      input: ListActiveAlertsInputSchema,
      handler: async (ctx, input: ListActiveAlertsInput) => {
        const { query, parameters } = buildListActiveAlertsQuery(input);
        const { results, totalRows } = await swisQuery<AlertRow>(ctx, query, parameters);
        return {
          alerts: results.map(withSeverityName),
          totalRows,
          nextOffset: nextOffset(input.offset, results.length, totalRows),
        };
      },
    },

    getAlert: {
      isTool: true,
      scope: 'read',
      description:
        'Get one active SolarWinds alert by alertActiveId or alertObjectId. Returns the fields of listActiveAlerts plus the alert definition description, the entity details URL, and the notes saved on the alert. Fails if the alert is no longer active (it was reset or cleared).',
      input: GetAlertInputSchema,
      handler: async (ctx, input: GetAlertInput) => {
        const { query, parameters } = buildGetAlertQuery(input);
        const { results } = await swisQuery<AlertRow>(ctx, query, parameters);
        if (results.length === 0) {
          throw new Error(
            'SolarWinds has no active alert with this ID. The alert was reset or cleared, or the ID is wrong.'
          );
        }
        return withSeverityName(results[0]);
      },
    },

    acknowledgeAlert: {
      isTool: true,
      scope: 'destroy',
      description:
        'Acknowledge one or more active SolarWinds alerts and save a note on them, so the NOC sees that the alert is being handled. Takes AlertObjectID values (not AlertActiveID) from listActiveAlerts or getAlert. Returns the IDs that are now acknowledged and the IDs that are not (no active alert has that AlertObjectID). Fails if none were acknowledged.',
      input: AcknowledgeAlertInputSchema,
      handler: async (ctx, input: AcknowledgeAlertInput) => {
        await swisInvoke<boolean>(ctx, 'Orion.AlertActive', 'Acknowledge', [
          input.alertObjectIds,
          input.note ?? '',
        ]);
        // SWIS returns true even for IDs that match no active alert, so read the state back.
        const { query, parameters } = buildAcknowledgedAlertsQuery(input.alertObjectIds);
        const { results } = await swisQuery<{ AlertObjectID: number }>(ctx, query, parameters);
        const acknowledged = new Set(results.map(({ AlertObjectID }) => AlertObjectID));
        if (acknowledged.size === 0) {
          throw new Error(
            'SolarWinds acknowledged no alerts. Check that the values are AlertObjectID values of active alerts, not AlertActiveID values.'
          );
        }
        return {
          acknowledgedAlertObjectIds: input.alertObjectIds.filter((id) => acknowledged.has(id)),
          notAcknowledgedAlertObjectIds: input.alertObjectIds.filter((id) => !acknowledged.has(id)),
        };
      },
    },

    getNode: {
      isTool: true,
      scope: 'read',
      description:
        'Get one SolarWinds node (a monitored device) by NodeID, IP address, or exact name. Returns its status, IP address, DNS name, vendor, model (MachineType), OS version, location, contact, response time, packet loss, CPU and memory load, last boot, maintenance (unmanaged) state, and all node custom properties. Sites often keep the device role, site, and HA pair in custom properties.',
      input: GetNodeInputSchema,
      handler: async (ctx, input: GetNodeInput) => {
        const { query, parameters } = buildGetNodeQuery(input);
        const { results } = await swisQuery<Record<string, unknown> & { Uri: string }>(
          ctx,
          query,
          parameters
        );
        if (results.length === 0) {
          throw new Error('SolarWinds has no node that matches this NodeID, IP address, or name.');
        }
        if (results.length > 1) {
          throw new Error(
            'More than one SolarWinds node matches this IP address or name. Use searchNodes, then call getNode with a NodeID.'
          );
        }
        const node = results[0];
        const properties = await swisRead<Record<string, unknown>>(
          ctx,
          `${node.Uri}/CustomProperties`
        );
        const customProperties = Object.fromEntries(
          Object.entries(properties).filter(([key]) => !CUSTOM_PROPERTY_SYSTEM_FIELDS.has(key))
        );
        return { ...node, customProperties };
      },
    },

    searchNodes: {
      isTool: true,
      scope: 'read',
      description:
        'Search SolarWinds nodes (monitored devices) by name or IP text, status, vendor, model, or a custom property value, sorted by name. Returns NodeID, Caption, IPAddress, DNS, SysName, Status, StatusDescription, Vendor, MachineType, ObjectSubType (polling method), Location, and DetailsUrl. Use it to find the HA peer or other devices at the same site, then call getNode for full details.',
      input: SearchNodesInputSchema,
      handler: async (ctx, input: SearchNodesInput) => {
        const { query, parameters } = buildSearchNodesQuery(input);
        const { results, totalRows } = await swisQuery<Record<string, unknown>>(
          ctx,
          query,
          parameters
        );
        return {
          nodes: results,
          totalRows,
          nextOffset: nextOffset(input.offset, results.length, totalRows),
        };
      },
    },
  },

  skill: [
    '## SolarWinds Platform connector',
    '',
    '- To triage an alert: call `listActiveAlerts` (filter by `acknowledged: false` or `triggeredAfter`), then `getNode` with the alert `NodeID` for the device details and custom properties.',
    '- To find related devices (HA peer, same site): call `searchNodes` with a `customProperty` filter, using a property name returned by `getNode`.',
    '- `acknowledgeAlert` takes `AlertObjectID` values, not `AlertActiveID`.',
    '- Use `query` for anything else. SWQL is read-only and looks like SQL: `SELECT TOP 10 InterfaceID, Name, Status FROM Orion.NPM.Interfaces WHERE NodeID = @nodeId`. Pass values in `parameters`, never inline them.',
    '- List actions page with `limit` and `offset`; pass `nextOffset` back to get the next page.',
  ].join('\n'),

  test: {
    enabled: true,
    description: 'Verifies the URL and credentials by counting the nodes in SolarWinds.',
    handler: async (ctx) => {
      const { results } = await swisQuery<{ NodeCount: number }>(
        ctx,
        'SELECT COUNT(NodeID) AS NodeCount FROM Orion.Nodes'
      );
      return { nodeCount: results[0]?.NodeCount ?? 0 };
    },
  },
};
