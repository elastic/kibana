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
import { UISchemas } from '../../connector_spec_ui';
import { callOpenSearchApi, getMonitor, putMonitor } from './opensearch_aws_opensearch_service_api';
import {
  AcknowledgeAlertInputSchema,
  AcknowledgeDetectorAlertInputSchema,
  CreateMonitorInputSchema,
  ExecuteMonitorInputSchema,
  GetAlertsInputSchema,
  GetDetectorFindingsInputSchema,
  IndexDocumentInputSchema,
  ListIndicesInputSchema,
  MonitorIdInputSchema,
  RunQueryInputSchema,
  SearchDetectorsInputSchema,
  SearchMonitorsInputSchema,
  UpdateMonitorInputSchema,
  type AcknowledgeAlertInput,
  type AcknowledgeDetectorAlertInput,
  type CreateMonitorInput,
  type ExecuteMonitorInput,
  type GetAlertsInput,
  type GetDetectorFindingsInput,
  type IndexDocumentInput,
  type ListIndicesInput,
  type MonitorIdInput,
  type RunQueryInput,
  type SearchDetectorsInput,
  type SearchMonitorsInput,
  type UpdateMonitorInput,
} from './types';

function buildSearchDetectorsQuery(input: SearchDetectorsInput): Record<string, unknown> {
  const must: Array<Record<string, unknown>> = [];
  if (input.name) {
    must.push({
      nested: { path: 'detector', query: { match: { 'detector.name': input.name } } },
    });
  }
  if (input.detectorType) {
    must.push({ match: { detector_type: input.detectorType } });
  }
  return must.length > 0 ? { bool: { must } } : { match_all: {} };
}

function buildSearchMonitorsQuery(input: SearchMonitorsInput): Record<string, unknown> {
  const must: Array<Record<string, unknown>> = [];
  if (input.name) {
    must.push({ match: { 'monitor.name': input.name } });
  }
  if (input.enabled !== undefined) {
    must.push({ term: { 'monitor.enabled': input.enabled } });
  }
  if (input.index) {
    must.push({
      bool: {
        should: [
          { match: { 'monitor.inputs.search.indices': input.index } },
          { match: { 'monitor.inputs.doc_level_input.indices': input.index } },
        ],
        minimum_should_match: 1,
      },
    });
  }
  return must.length > 0 ? { bool: { must } } : { match_all: {} };
}

export const OpensearchAwsOpensearchService: ConnectorSpec = {
  metadata: {
    id: '.opensearch_aws_opensearch_service',
    displayName: 'OpenSearch (AWS OpenSearch Service)',
    description: i18n.translate(
      'core.kibanaConnectorSpecs.opensearchAwsOpensearchService.metadata.description',
      {
        defaultMessage:
          'Acknowledge and search alerts, manage monitors, retrieve Security Analytics findings, and search and index documents in OpenSearch',
      }
    ),
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
        type: 'aws_credentials',
        isRecommended: true,
        defaults: {},
        overrides: {
          label: i18n.translate(
            'core.kibanaConnectorSpecs.opensearchAwsOpensearchService.auth.awsCredentials.label',
            { defaultMessage: 'AWS access key (Amazon OpenSearch Service)' }
          ),
          meta: {
            accessKeyId: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.opensearchAwsOpensearchService.auth.accessKeyId.helpText',
                {
                  defaultMessage:
                    'An IAM access key with es:ESHttpGet, es:ESHttpPost, es:ESHttpPut, and es:ESHttpDelete permissions on the domain.',
                }
              ),
            },
          },
        },
      },
      {
        type: 'basic',
        defaults: {},
        overrides: {
          label: i18n.translate(
            'core.kibanaConnectorSpecs.opensearchAwsOpensearchService.auth.basic.label',
            { defaultMessage: 'Username and password (self-managed cluster)' }
          ),
          meta: {
            password: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.opensearchAwsOpensearchService.auth.basic.password.helpText',
                {
                  defaultMessage:
                    'The internal user or Security-plugin backend role must be mapped to a role with the alerting and security-analytics cluster permissions used by this connector\u2019s actions, plus read/write on the indices you search or index into.',
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
      endpoint: UISchemas.url('https://my-domain.us-east-1.es.amazonaws.com')
        .describe(
          'The domain or cluster endpoint URL. For AWS OpenSearch Service, use the auto-generated domain endpoint (e.g. https://search-my-domain-abc123.us-east-1.es.amazonaws.com) — a custom CNAME endpoint cannot be used with AWS access key/secret auth, because request signing derives the region from this hostname. For a self-managed cluster, use its full URL, e.g. https://opensearch.example.com:9200.'
        )
        .meta({
          label: i18n.translate(
            'core.kibanaConnectorSpecs.opensearchAwsOpensearchService.config.endpoint.label',
            { defaultMessage: 'Endpoint URL' }
          ),
        }),
    })
  ),

  actions: {
    // --- Alerts (Alerting plugin) ---

    acknowledgeAlert: {
      isTool: true,
      description:
        'Acknowledge one or more active alerts on a monitor so they stop re-notifying. Use getAlerts first to find the monitor ID and alert IDs. Returns which alert IDs succeeded and which failed (e.g. because they were already COMPLETED, ERROR, or ACKNOWLEDGED).',
      input: AcknowledgeAlertInputSchema,
      handler: async (ctx, input: AcknowledgeAlertInput) => {
        return callOpenSearchApi(
          ctx,
          'POST',
          `/_plugins/_alerting/monitors/${encodeURIComponent(input.monitorId)}/_acknowledge/alerts`,
          { body: { alerts: input.alertIds } }
        );
      },
    },

    getAlerts: {
      isTool: true,
      description:
        'List OpenSearch Alerting alerts across all monitors, or for a specific monitor, optionally filtered by state or severity. Use this to drive triage — branch on the returned alerts and acknowledge, or dig into the monitor that raised them with getMonitor.',
      input: GetAlertsInputSchema,
      handler: async (ctx, input: GetAlertsInput) => {
        return callOpenSearchApi(ctx, 'GET', '/_plugins/_alerting/monitors/alerts', {
          params: {
            monitorId: input.monitorId,
            alertState: input.alertState,
            severityLevel: input.severityLevel,
            searchString: input.searchString,
            sortString: input.sortString,
            sortOrder: input.sortOrder,
            size: input.size,
            startIndex: input.startIndex,
          },
        });
      },
    },

    // --- Monitors (Alerting plugin) ---

    executeMonitor: {
      isTool: true,
      description:
        'Run a monitor immediately instead of waiting for its schedule, evaluating its query and trigger conditions now. Set dryrun to true to see the trigger results without sending any notification actions.',
      input: ExecuteMonitorInputSchema,
      handler: async (ctx, input: ExecuteMonitorInput) => {
        return callOpenSearchApi(
          ctx,
          'POST',
          `/_plugins/_alerting/monitors/${encodeURIComponent(input.monitorId)}/_execute`,
          { params: input.dryrun !== undefined ? { dryrun: input.dryrun } : undefined }
        );
      },
    },

    getMonitor: {
      isTool: true,
      description:
        'Fetch a monitor\u2019s full definition (schedule, inputs, triggers) and current enabled state by ID. This is the read most branching workflow steps depend on before calling enableMonitor, disableMonitor, updateMonitor, or executeMonitor.',
      input: MonitorIdInputSchema,
      handler: async (ctx, input: MonitorIdInput) => {
        const result = await getMonitor(ctx, input.monitorId);
        return { id: result._id, ...result.monitor };
      },
    },

    enableMonitor: {
      isTool: true,
      description:
        'Resume scheduled evaluation of a monitor that was previously disabled, e.g. to restore alerting after a maintenance window. Use getMonitor or searchMonitors first to find the monitor ID.',
      input: MonitorIdInputSchema,
      handler: async (ctx, input: MonitorIdInput) => {
        const current = await getMonitor(ctx, input.monitorId);
        const updated = await putMonitor(
          ctx,
          input.monitorId,
          { ...current.monitor, enabled: true },
          { seqNo: current._seq_no, primaryTerm: current._primary_term }
        );
        return { monitorId: updated._id, enabled: true, message: 'Monitor enabled.' };
      },
    },

    disableMonitor: {
      isTool: true,
      description:
        'Suspend scheduled evaluation of a monitor without deleting it, e.g. to silence a known-noisy monitor during a maintenance window. Call enableMonitor afterward to restore it. Use getMonitor or searchMonitors first to find the monitor ID.',
      input: MonitorIdInputSchema,
      handler: async (ctx, input: MonitorIdInput) => {
        const current = await getMonitor(ctx, input.monitorId);
        const updated = await putMonitor(
          ctx,
          input.monitorId,
          { ...current.monitor, enabled: false },
          { seqNo: current._seq_no, primaryTerm: current._primary_term }
        );
        return { monitorId: updated._id, enabled: false, message: 'Monitor disabled.' };
      },
    },

    searchMonitors: {
      isTool: true,
      description:
        'Search for monitors by name, source index, or enabled state. Use this to locate the correct monitor ID before calling getMonitor, executeMonitor, enableMonitor, disableMonitor, updateMonitor, or deleteMonitor. Omit all filters to list monitors.',
      input: SearchMonitorsInputSchema,
      handler: async (ctx, input: SearchMonitorsInput) => {
        return callOpenSearchApi(ctx, 'POST', '/_plugins/_alerting/monitors/_search', {
          body: {
            query: buildSearchMonitorsQuery(input),
            size: input.size ?? 20,
            from: input.from ?? 0,
          },
        });
      },
    },

    createMonitor: {
      // Not a tool: creates new detection logic (an admin-style operation), workflow steps only.
      isTool: false,
      description:
        'Create a new OpenSearch Alerting monitor (query-level, bucket-level, or doc-level) to stand up detection, e.g. as part of an automated onboarding workflow. See the "inputs" and "triggers" parameter descriptions for the exact shape each monitor type expects.',
      input: CreateMonitorInputSchema,
      handler: async (ctx, input: CreateMonitorInput) => {
        const body: Record<string, unknown> = {
          type: 'monitor',
          name: input.name,
          monitor_type: input.monitorType,
          enabled: input.enabled ?? true,
          schedule: input.schedule,
          inputs: input.inputs,
          triggers: input.triggers,
        };
        if (input.rbacRoles) {
          body.rbac_roles = input.rbacRoles;
        }
        const result = await callOpenSearchApi<{ _id: string }>(
          ctx,
          'POST',
          '/_plugins/_alerting/monitors',
          { body }
        );
        return { monitorId: result._id, message: `Monitor "${input.name}" was created.` };
      },
    },

    updateMonitor: {
      // Not a tool: replaces the monitor's stored definition (an admin-style operation), workflow steps only.
      isTool: false,
      description:
        'Update an existing monitor\u2019s name, schedule, inputs, or triggers without recreating it. Only the fields you provide are changed; everything else on the monitor is preserved. Use getMonitor or searchMonitors first to find the monitor ID.',
      input: UpdateMonitorInputSchema,
      handler: async (ctx, input: UpdateMonitorInput) => {
        const current = await getMonitor(ctx, input.monitorId);
        const merged: Record<string, unknown> = { ...current.monitor };
        if (input.name !== undefined) merged.name = input.name;
        if (input.monitorType !== undefined) merged.monitor_type = input.monitorType;
        if (input.enabled !== undefined) merged.enabled = input.enabled;
        if (input.schedule !== undefined) merged.schedule = input.schedule;
        if (input.inputs !== undefined) merged.inputs = input.inputs;
        if (input.triggers !== undefined) merged.triggers = input.triggers;
        if (input.rbacRoles !== undefined) merged.rbac_roles = input.rbacRoles;

        const updated = await putMonitor(ctx, input.monitorId, merged, {
          seqNo: current._seq_no,
          primaryTerm: current._primary_term,
        });
        return { monitorId: updated._id, message: 'Monitor updated.' };
      },
    },

    deleteMonitor: {
      // Not a tool: irreversible deletion, workflow steps only.
      isTool: false,
      description:
        'Permanently delete a monitor, completing the monitor lifecycle for teardown and cleanup. This does not delete alerts already raised by the monitor. Use getMonitor or searchMonitors first to confirm the monitor ID.',
      input: MonitorIdInputSchema,
      handler: async (ctx, input: MonitorIdInput) => {
        await callOpenSearchApi(
          ctx,
          'DELETE',
          `/_plugins/_alerting/monitors/${encodeURIComponent(input.monitorId)}`
        );
        return { monitorId: input.monitorId, message: 'Monitor deleted.' };
      },
    },

    // --- Security Analytics ---

    searchDetectors: {
      isTool: true,
      description:
        'Search for Security Analytics detectors by name or log type. Use this to find a detector ID or type before calling getDetectorFindings or acknowledgeDetectorAlert.',
      input: SearchDetectorsInputSchema,
      handler: async (ctx, input: SearchDetectorsInput) => {
        return callOpenSearchApi(ctx, 'POST', '/_plugins/_security_analytics/detectors/_search', {
          body: { query: buildSearchDetectorsQuery(input), size: input.size ?? 20 },
        });
      },
    },

    acknowledgeDetectorAlert: {
      isTool: true,
      description:
        'Acknowledge one or more active alerts raised by a Security Analytics detector, closing the loop on a threat detection alongside the Alerting-plugin acknowledgeAlert action. Use getDetectorFindings or the detector alert list to find the detector ID and alert IDs.',
      input: AcknowledgeDetectorAlertInputSchema,
      handler: async (ctx, input: AcknowledgeDetectorAlertInput) => {
        return callOpenSearchApi(
          ctx,
          'POST',
          `/_plugins/_security_analytics/detectors/${encodeURIComponent(
            input.detectorId
          )}/_acknowledge/alerts`,
          { body: { alerts: input.alertIds } }
        );
      },
    },

    getDetectorFindings: {
      isTool: true,
      description:
        'Retrieve Security Analytics findings (matched Sigma rules or threat-intelligence hits) for a detector or detector type, to enrich an alert triage workflow with detection context. Either detectorId or detectorType is required — use searchDetectors first if you only know the detector name.',
      input: GetDetectorFindingsInputSchema,
      handler: async (ctx, input: GetDetectorFindingsInput) => {
        return callOpenSearchApi(ctx, 'GET', '/_plugins/_security_analytics/findings/_search', {
          params: {
            detector_id: input.detectorId,
            detectorType: input.detectorType,
            detectionType: input.detectionType,
            severity: input.severity,
            sortOrder: input.sortOrder,
            size: input.size,
            startIndex: input.startIndex,
          },
        });
      },
    },

    // --- Document read/write ---

    listIndices: {
      isTool: true,
      description:
        'List indices and their health, status, and document/storage size, optionally filtered by name or pattern. Use this to discover which index to pass to runQuery or indexDocument.',
      input: ListIndicesInputSchema,
      handler: async (ctx, input: ListIndicesInput) => {
        const path = input.pattern
          ? `/_cat/indices/${encodeURIComponent(input.pattern)}`
          : '/_cat/indices';
        return callOpenSearchApi(ctx, 'GET', path, {
          params: { format: 'json', h: 'health,status,index,docs.count,store.size' },
        });
      },
    },

    runQuery: {
      isTool: true,
      description:
        'Run a search query against an index using the OpenSearch Query DSL, to gather evidence from cluster data during triage. Pass the full search request body (query, aggregations, sort, size, etc.) in the "query" parameter.',
      input: RunQueryInputSchema,
      handler: async (ctx, input: RunQueryInput) => {
        return callOpenSearchApi(ctx, 'POST', `/${encodeURIComponent(input.index)}/_search`, {
          body: input.query,
        });
      },
    },

    indexDocument: {
      isTool: true,
      description:
        'Write a document to an index, giving a workflow a write-back path for enrichment or audit output (e.g. recording triage notes). Provide an explicit "id" to create or fully replace a specific document, or omit it to let OpenSearch generate one.',
      input: IndexDocumentInputSchema,
      handler: async (ctx, input: IndexDocumentInput) => {
        const path = input.id
          ? `/${encodeURIComponent(input.index)}/_doc/${encodeURIComponent(input.id)}`
          : `/${encodeURIComponent(input.index)}/_doc`;
        return callOpenSearchApi(ctx, input.id ? 'PUT' : 'POST', path, { body: input.document });
      },
    },
  },

  skill: [
    '## OpenSearch (AWS OpenSearch Service) Connector',
    '',
    'Covers the OpenSearch Alerting plugin (monitors and alerts), Security Analytics detector alerts and findings, and a small document search/index surface.',
    '',
    '### Alert triage workflow',
    '- Call getAlerts (optionally filtered by alertState or monitorId) to find active alerts, then acknowledgeAlert with the monitor ID and alert IDs to stop re-notification once handled.',
    '- For Security Analytics detections, use searchDetectors to find a detector, then getDetectorFindings and acknowledgeDetectorAlert — these are a separate alert stream from the Alerting-plugin alerts above.',
    '',
    '### Monitor lifecycle',
    '- Use searchMonitors (by name, source index, or enabled state) to find a monitor ID before calling getMonitor, executeMonitor, enableMonitor, disableMonitor, updateMonitor, or deleteMonitor.',
    '- disableMonitor / enableMonitor silence and restore scheduled alerting around a maintenance window without deleting the monitor.',
    '- executeMonitor with dryrun=true previews trigger results without sending notifications — use this to test a monitor before enabling it for real.',
    '- updateMonitor only changes the fields you provide; everything else on the monitor is preserved.',
    '',
    '### Query and document actions',
    '- Use listIndices to discover index names before calling runQuery or indexDocument, especially if the index pattern is unknown.',
    '- runQuery accepts a full OpenSearch Query DSL request body (query, aggregations, sort, size) and returns the raw _search response.',
    '- indexDocument is a write path for enrichment/audit output, not for creating monitors — use createMonitor/updateMonitor for those.',
  ].join('\n'),

  test: {
    enabled: true,
    description: i18n.translate(
      'core.kibanaConnectorSpecs.opensearchAwsOpensearchService.test.description',
      {
        defaultMessage: 'Verifies the connection by checking cluster health',
      }
    ),
    handler: async (ctx) => {
      const health = await callOpenSearchApi<{ status?: string; cluster_name?: string }>(
        ctx,
        'GET',
        '/_cluster/health'
      );
      return {
        message: `Successfully connected to OpenSearch cluster "${health.cluster_name}" (status: ${health.status}).`,
      };
    },
  },
};
