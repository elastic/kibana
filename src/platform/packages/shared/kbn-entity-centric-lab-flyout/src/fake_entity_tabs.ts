/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Mock data backing the non-Overview tabs of the entity-centric lab flyout.
 * Mirrors {@link buildFakeEntityOverview} — everything is hard-coded from the
 * design, interpolating the clicked entity name where the screen references
 * it so the flyout still feels specific.
 */

import { getStoryTabsData } from './payflow_story';
import { getChaosModeEnabled, getEffectiveEntityHealth } from './chaos_mode';
import {
  buildKindTemplate,
  entityTypeToKind,
  inferEntityKind,
  normalizeEntityHealth,
  type EntityKind,
} from './kind_templates';
import { INCIDENT_X_DOMAIN } from './time_domain';

export interface MetricSeriesPoint {
  readonly x: number;
  readonly y: number;
}

export interface MetricSeries {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly description: string;
  /** Threshold line drawn as a dotted reference (e.g. SLO target). Optional. */
  readonly threshold?: number;
  /** One or more named series rendered in the same chart. */
  readonly series: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
    readonly points: readonly MetricSeriesPoint[];
  }>;
}

/**
 * A point-in-time event surfaced on the Metrics tab as a vertical purple
 * annotation. Hovering the line/marker opens a built-in chart tooltip with the
 * supplied `header` (title) and `details` (body copy) — that's the storyline
 * mechanic the demo relies on, e.g. "Deployment — v2.14.3 deployed at
 * 02:46:41 UTC".
 */
export interface MetricEvent {
  /** Epoch ms position on the X axis. Must fall within {@link INCIDENT_X_DOMAIN}. */
  readonly x: number;
  /** Tooltip title shown when hovering the annotation. */
  readonly header: string;
  /** Tooltip body copy explaining what happened at this point in time. */
  readonly details?: string;
}

export interface MetricsTabData {
  readonly goldenSignals: readonly MetricSeries[];
  readonly otherMetrics: readonly MetricSeries[];
  /** Events rendered as vertical purple annotations + hover tooltips. */
  readonly events: readonly MetricEvent[];
}

export type LogSeverity = 'Info' | 'Warning' | 'Error';

export interface LogRow {
  readonly id: string;
  readonly timestamp: string;
  readonly attribute: string;
  readonly summary: string;
  /**
   * Severity surfaced as a coloured badge in the logs table. Defaults to
   * `'Info'` when the source data doesn't classify the row.
   */
  readonly severity: LogSeverity;
}

export interface AlertRow {
  readonly id: string;
  readonly status: 'Active';
  readonly triggeredAt: string;
  readonly ruleName: string;
  readonly reason: string;
}

export interface AlertsTabData {
  readonly activeCount: number;
  readonly totalCount: number;
  readonly overTime: readonly MetricSeriesPoint[];
  readonly details: readonly AlertRow[];
}

export type RelatedEntityHealth = 'Unhealthy' | 'At risk' | 'Healthy';

export interface RelatedEntity {
  readonly id: string;
  readonly name: string;
  readonly health: RelatedEntityHealth;
  readonly entityType: string;
  readonly relation: string;
}

export interface TopologyNode {
  readonly id: string;
  readonly label: string;
  /** Whether this is the entity the flyout is open on — drives highlight. */
  readonly focal?: boolean;
}

export interface TopologyEdge {
  readonly from: string;
  readonly to: string;
  /** Thicker edge — design highlights a subset of edges with the focal node. */
  readonly emphasized?: boolean;
}

export interface RelationshipsTabData {
  readonly topology: {
    readonly nodes: readonly TopologyNode[];
    readonly edges: readonly TopologyEdge[];
    /**
     * Health of the focal (centre) node. Non-focal node health is derived
     * automatically from {@link RelationshipsTabData.related} (matching by
     * `node.label`), so this field only carries information about the entity
     * the flyout is currently open on.
     */
    readonly focalHealth?: RelatedEntityHealth;
  };
  readonly related: readonly RelatedEntity[];
}

export type SecuritySeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface SecurityIssue {
  readonly id: string;
  readonly severity: SecuritySeverity;
  readonly title: string;
  readonly detectedAt: string;
  readonly source: string;
  readonly status: 'Open' | 'Triaged' | 'Suppressed';
}

export interface SecurityTabData {
  readonly riskScore: number;
  readonly riskLevel: 'Low' | 'Medium' | 'High';
  readonly lastEvent: string;
  readonly issues: readonly SecurityIssue[];
}

/**
 * Colour used for a service's bar in the Traces waterfall and its dot in
 * the Services legend. Constrained to a small set of EUI-friendly hues so
 * the renderer can map straight onto `EuiHealth` / theme colour tokens
 * without an open string union widening to anything the design team didn't
 * sign off on.
 */
export type TraceServiceColor = 'primary' | 'success' | 'accent' | 'warning' | 'danger';

export interface TraceServiceLegendEntry {
  readonly id: string;
  readonly name: string;
  readonly color: TraceServiceColor;
}

/**
 * Span subtype drives the inline icon prefixed to a span row in the
 * waterfall (globe for browser/HTTP, database for db calls, etc.) and is
 * kept narrow on purpose — unknown values would render as a generic icon
 * and fail the curated demo aesthetic.
 */
export type TraceSpanType = 'browser' | 'http' | 'render' | 'db' | 'event' | 'asset';

export interface TraceSpan {
  readonly id: string;
  /** Parent span id; omitted for the trace's root span. */
  readonly parentId?: string;
  /** Foreign-key into {@link TracesTabData.services}. */
  readonly serviceId: string;
  readonly name: string;
  /** Start offset (ms) from the trace root. */
  readonly startMs: number;
  readonly durationMs: number;
  readonly type: TraceSpanType;
  /** HTTP status code surfaced as a leading badge on HTTP spans (e.g. `2xx`). */
  readonly statusCode?: string;
  /** Renders a red error count badge ("2 Errors") next to the name. */
  readonly errorCount?: number;
  /** Free-form trailing badge — today only `'blocking'` is rendered. */
  readonly extraBadge?: string;
}

export interface TracesTabData {
  readonly traceId: string;
  readonly rootName: string;
  readonly totalDurationMs: number;
  readonly services: readonly TraceServiceLegendEntry[];
  readonly spans: readonly TraceSpan[];
}

export interface EntityTabsData {
  readonly metrics: MetricsTabData;
  readonly logs: readonly LogRow[];
  readonly alerts: AlertsTabData;
  readonly relationships: RelationshipsTabData;
  readonly security: SecurityTabData;
  /**
   * Mock APM-style trace waterfall surfaced under the Traces tab. Optional
   * — only `kind === 'service'` builders populate it today, and the flyout
   * hides the tab entirely when the field is absent.
   */
  readonly traces?: TracesTabData;
}

/**
 * 24-point X domain shared by every chart in the flyout — see
 * `time_domain.ts`. Off-story / generic entities surface the same chart
 * window (02:41:21 → 02:49:01 around the v2.14.3 deployment) so the X-axis
 * tick formatter in `metrics_tab.tsx` / `alerts_tab.tsx` only has to handle
 * one shape of value (epoch milliseconds).
 */
const X_DOMAIN = INCIDENT_X_DOMAIN;

const series = (id: string, label: string, ys: readonly number[]) => ({
  id,
  label,
  points: X_DOMAIN.map((x, i) => ({ x, y: ys[i] ?? 0 })),
});

/**
 * Build the curated/fake payload for the non-Overview tabs of the flyout.
 *
 * Dispatch order mirrors `buildFakeEntityOverview`:
 *
 *   1. PayFlow story — curated tabs for the 4 click-path entities.
 *   2. Per-kind + per-health template — kind-shaped tabs (service / host /
 *      pod / node / cluster / namespace / database / cloud / middleware /
 *      llm) tinted by `entityHealth` (healthy / atRisk / unhealthy).
 *   3. Generic fallback — last-resort mock, mostly never reached.
 */
export const buildFakeEntityTabsData = (
  entityName: string,
  entityType?: string,
  entityHealth?: string
): EntityTabsData => {
  const storyTabs = getStoryTabsData(entityName);
  if (storyTabs) {
    return storyTabs;
  }
  const kind: EntityKind | undefined = entityTypeToKind(entityType) ?? inferEntityKind(entityName);
  // Same chaos-mode override as `buildFakeEntityOverview` — flips the
  // PayFlow click-path entities to the healthy kind template when the
  // user has rolled back. Other entities pass through unchanged.
  const effectiveHealth = getEffectiveEntityHealth(
    entityName,
    normalizeEntityHealth(entityHealth),
    getChaosModeEnabled()
  );
  const kindTemplate = buildKindTemplate(entityName, kind, effectiveHealth, entityType);
  if (kindTemplate) {
    return kindTemplate.tabs;
  }
  return buildGenericEntityTabsData(entityName);
};

const buildGenericEntityTabsData = (entityName: string): EntityTabsData => ({
  metrics: {
    events: [
      {
        x: X_DOMAIN[4],
        header: 'Configuration change',
        details: 'Rolling restart triggered by GitOps reconcile loop.',
      },
      {
        x: X_DOMAIN[9],
        header: 'Auto-scaling event',
        details: 'Horizontal Pod Autoscaler added 2 replicas (target CPU 70%).',
      },
    ],
    goldenSignals: [
      {
        id: 'latency',
        label: 'Latency',
        unit: 'ms',
        threshold: 320,
        description: 'Average end-to-end request latency across all instances of this entity.',
        series: [
          series(
            'latency-ms',
            'latency (ms)',
            [
              310, 290, 270, 260, 280, 320, 360, 340, 300, 250, 220, 200, 230, 260, 290, 280, 250,
              230, 240, 260, 280, 290, 300, 310,
            ]
          ),
        ],
      },
      {
        id: 'errorRate',
        label: 'Error rate',
        unit: '%',
        threshold: 3,
        description: 'Percentage of failed requests (status >= 500 or trace error tag).',
        series: [
          series(
            'error-rate-pct',
            'Error rate (%)',
            [
              3.2, 3.5, 3.8, 4.2, 4.6, 5.1, 4.9, 4.6, 4.3, 4.0, 3.8, 3.5, 3.2, 3.0, 2.9, 3.0, 3.3,
              3.7, 4.1, 4.4, 4.7, 5.0, 5.3, 5.6,
            ]
          ),
        ],
      },
      {
        id: 'throughput',
        label: 'Throughput',
        unit: 'req/s',
        description: 'Requests per second served by this entity across all instances.',
        series: [
          series(
            'network-in',
            'Network in',
            [
              52, 50, 55, 60, 58, 65, 70, 68, 60, 55, 50, 48, 52, 55, 60, 62, 60, 55, 50, 48, 50,
              52, 55, 58,
            ]
          ),
          series(
            'network-out',
            'Network out',
            [
              60, 58, 55, 50, 48, 52, 55, 60, 65, 68, 70, 72, 70, 68, 65, 62, 60, 58, 60, 62, 65,
              68, 70, 72,
            ]
          ),
        ],
      },
    ],
    otherMetrics: [
      {
        id: 'cpu-usage',
        label: 'Other metric',
        unit: '%',
        description: 'Average CPU utilization across pods running this entity.',
        series: [
          series(
            'do-nyc1-demo-infra-1',
            'do-nyc1-demo-infra',
            [
              55, 60, 58, 52, 50, 48, 50, 55, 60, 62, 60, 58, 55, 52, 50, 55, 60, 62, 64, 60, 55,
              52, 50, 55,
            ]
          ),
        ],
      },
      {
        id: 'memory-usage',
        label: 'Other metric',
        unit: '%',
        description: 'Average memory utilization across pods running this entity.',
        series: [
          series(
            'do-nyc1-demo-infra-2',
            'do-nyc1-demo-infra',
            [
              60, 65, 70, 72, 68, 65, 60, 58, 55, 60, 65, 70, 72, 75, 78, 80, 78, 75, 72, 70, 68,
              65, 60, 58,
            ]
          ),
        ],
      },
    ],
  },
  logs: buildFakeLogRows(entityName),
  alerts: {
    activeCount: 16,
    totalCount: 20,
    overTime: X_DOMAIN.map((x) => ({
      x,
      y: [
        60, 62, 65, 68, 64, 60, 58, 55, 50, 48, 52, 55, 58, 60, 62, 64, 60, 55, 58, 62, 66, 68, 70,
        72,
      ][x],
    })),
    details: [
      {
        id: 'a1',
        status: 'Active',
        triggeredAt: 'Dec 10, 2025, 11:30:45.873',
        ruleName: 'K8s memory.usage limits',
        reason: `Max k8s memory.usage spiked for ${entityName}`,
      },
      {
        id: 'a2',
        status: 'Active',
        triggeredAt: 'Dec 10, 2025, 11:30:44.136',
        ruleName: 'API Server Responsiveness',
        reason: 'Server responsiveness is degraded',
      },
      {
        id: 'a3',
        status: 'Active',
        triggeredAt: 'Dec 10, 2025, 11:30:44.081',
        ruleName: '[Elastic] Node availability',
        reason: 'Max node availability is below threshold',
      },
      {
        id: 'a4',
        status: 'Active',
        triggeredAt: 'Dec 10, 2025, 11:30:43.345',
        ruleName: '[Elastic Agent] Excessive memory',
        reason: 'Max k8s memory.usage is above 90%',
      },
      {
        id: 'a5',
        status: 'Active',
        triggeredAt: 'Dec 10, 2025, 11:30:43.136',
        ruleName: 'K8s memory.usage limits',
        reason: 'Avg k8s memory.usage is at the limit',
      },
      {
        id: 'a6',
        status: 'Active',
        triggeredAt: 'Dec 10, 2025, 11:30:43.136',
        ruleName: 'K8s memory.usage limits',
        reason: 'Avg k8s memory.usage is at the limit',
      },
      {
        id: 'a7',
        status: 'Active',
        triggeredAt: 'Dec 10, 2025, 11:30:43.136',
        ruleName: 'K8s memory.usage limits',
        reason: 'Avg k8s memory.usage is at the limit',
      },
      {
        id: 'a8',
        status: 'Active',
        triggeredAt: 'Dec 10, 2025, 11:30:43.136',
        ruleName: 'K8s memory.usage limits',
        reason: 'Avg k8s memory.usage is at the limit',
      },
      {
        id: 'a9',
        status: 'Active',
        triggeredAt: 'Dec 10, 2025, 11:30:43.136',
        ruleName: 'K8s memory.usage limits',
        reason: 'Avg k8s memory.usage is at the limit',
      },
      {
        id: 'a10',
        status: 'Active',
        triggeredAt: 'Dec 10, 2025, 11:30:00.000',
        ruleName: 'API Server Responsiveness',
        reason: 'Server responsiveness is degraded',
      },
      {
        id: 'a11',
        status: 'Active',
        triggeredAt: 'Dec 10, 2025, 11:29:55.000',
        ruleName: 'K8s CPU.usage limits',
        reason: `CPU spike detected on ${entityName}`,
      },
      {
        id: 'a12',
        status: 'Active',
        triggeredAt: 'Dec 10, 2025, 11:29:50.000',
        ruleName: '[Elastic] Disk pressure',
        reason: 'Max disk usage above threshold',
      },
      {
        id: 'a13',
        status: 'Active',
        triggeredAt: 'Dec 10, 2025, 11:29:45.000',
        ruleName: 'K8s pod restarts',
        reason: 'Pod restart rate elevated',
      },
      {
        id: 'a14',
        status: 'Active',
        triggeredAt: 'Dec 10, 2025, 11:29:40.000',
        ruleName: '[Elastic] Network errors',
        reason: 'Network error rate above SLO',
      },
      {
        id: 'a15',
        status: 'Active',
        triggeredAt: 'Dec 10, 2025, 11:29:35.000',
        ruleName: 'API latency SLO',
        reason: '99p latency above target',
      },
      {
        id: 'a16',
        status: 'Active',
        triggeredAt: 'Dec 10, 2025, 11:29:30.000',
        ruleName: 'Synthetic check',
        reason: 'Uptime check failing from 2 regions',
      },
    ],
  },
  relationships: buildFakeRelationships(entityName),
  security: {
    riskScore: 72,
    riskLevel: 'High',
    lastEvent: '14 min ago',
    issues: [
      {
        id: 's1',
        severity: 'Critical',
        title: 'CVE-2026-12345: Remote code execution in payments-lib v2.1.0',
        detectedAt: 'May 6, 2026, 09:12',
        source: 'Vulnerabilities',
        status: 'Open',
      },
      {
        id: 's2',
        severity: 'High',
        title: `Privileged container detected for ${entityName}`,
        detectedAt: 'May 5, 2026, 18:42',
        source: 'CSPM',
        status: 'Open',
      },
      {
        id: 's3',
        severity: 'High',
        title: 'Outbound traffic to unknown destination 185.220.101.42',
        detectedAt: 'May 5, 2026, 14:05',
        source: 'Detections',
        status: 'Triaged',
      },
      {
        id: 's4',
        severity: 'Medium',
        title: 'Secret rotated more than 90 days ago',
        detectedAt: 'May 4, 2026, 22:18',
        source: 'CSPM',
        status: 'Open',
      },
      {
        id: 's5',
        severity: 'Low',
        title: 'Deprecated TLS version negotiated by a downstream client',
        detectedAt: 'May 2, 2026, 08:30',
        source: 'Detections',
        status: 'Suppressed',
      },
    ],
  },
});

const buildFakeLogRows = (entityName: string): LogRow[] => {
  const baseTimestamp = 'Apr 20, 2026 @ 11:36:5';
  const lines: Array<Omit<LogRow, 'id' | 'timestamp'> & { ts: string }> = [
    {
      ts: '5.803',
      severity: 'Info',
      attribute: '3 attributes.log.file.path',
      summary: `/var/log/pods/${entityName}-system_konnectivity-agent-6ffb545547-phjh2_c9b9e8d6-9b95-...`,
    },
    {
      ts: '2.542',
      severity: 'Info',
      attribute: '2 attributes.log.file.path',
      summary: `/var/log/pods/${entityName}-system_konnectivity-agent-6ffb545547-w6lg4_298622e6-f54d-...`,
    },
    {
      ts: '2.295',
      severity: 'Info',
      attribute: '5 attributes.log.file.path',
      summary: `/var/log/pods/ensemble-oteldemo-yrxlg-default_kafka-6989c85598-4mwpt_92fe8ad...`,
    },
    {
      ts: '2.295',
      severity: 'Info',
      attribute: '5 attributes.log.file.path',
      summary: `/var/log/pods/ensemble-oteldemo-yrxlg-default_kafka-6989c85598-4mwpt_92fe8ad...`,
    },
    {
      ts: '2.293',
      severity: 'Info',
      attribute: 'body.text',
      summary: `[LocalLog partition=__cluster_metadata-0, dir=/tmp/kafka-logs] Rolled new log segment at offset 1895220 in...`,
    },
    {
      ts: '2.293',
      severity: 'Info',
      attribute: 'body.text',
      summary: `[ProducerStateManager partition=__cluster_metadata-0] Wrote producer snapshot at offset 1895220 with 0 pre...`,
    },
    {
      ts: '2.150',
      severity: 'Info',
      attribute: '2 attributes.log.file.path',
      summary: `/var/log/pods/${entityName}_default_main-9c0e8d2e-9b95.log`,
    },
    {
      ts: '1.987',
      severity: 'Info',
      attribute: 'body.text',
      summary: `[Health] Entity ${entityName} reported healthy after readiness probe`,
    },
    {
      ts: '1.812',
      severity: 'Info',
      attribute: '3 attributes.log.file.path',
      summary: `/var/log/pods/${entityName}_default_sidecar-1f2a3b-4c5d.log`,
    },
    {
      ts: '1.654',
      severity: 'Info',
      attribute: 'body.text',
      summary: `[GC] Young generation pause 18ms (allocated 412MB)`,
    },
    {
      ts: '1.501',
      severity: 'Info',
      attribute: 'body.text',
      summary: `[HTTP] POST /v1/orders 201 in 84ms (request_id=req_8821)`,
    },
    {
      ts: '1.342',
      severity: 'Info',
      attribute: 'body.text',
      summary: `[HTTP] GET /v1/orders/42 200 in 12ms (cache hit)`,
    },
    {
      ts: '1.193',
      severity: 'Info',
      attribute: 'body.text',
      summary: `[Cache] Evicted 32 entries from session cache (capacity reached)`,
    },
    {
      ts: '0.998',
      severity: 'Info',
      attribute: 'body.text',
      summary: `[Auth] Issued JWT for user_id=4711, scopes=[orders:read]`,
    },
    {
      ts: '0.834',
      severity: 'Info',
      attribute: 'body.text',
      summary: `[Outbound] charge tx_8821 → stripe.charges.create OK in 1.2s`,
    },
    {
      ts: '0.671',
      severity: 'Warning',
      attribute: 'body.text',
      summary: `[Worker] Retrying charge tx_8821 (attempt 2/5)`,
    },
    {
      ts: '0.512',
      severity: 'Error',
      attribute: 'body.text',
      summary: `[Outbound] stock-db connection-timeout after 5000ms`,
    },
    {
      ts: '0.345',
      severity: 'Info',
      attribute: 'body.text',
      summary: `[Health] Entity ${entityName} liveness probe OK`,
    },
    {
      ts: '0.198',
      severity: 'Info',
      attribute: 'body.text',
      summary: `[HTTP] GET /healthz 200 in 2ms`,
    },
    {
      ts: '0.050',
      severity: 'Info',
      attribute: 'body.text',
      summary: `[Worker] Restored connection to stock-db (3 pending writes flushed)`,
    },
  ];
  return lines.map((line, idx) => ({
    id: `log-${idx}`,
    timestamp: `${baseTimestamp}${line.ts}`,
    attribute: line.attribute,
    summary: line.summary,
    severity: line.severity,
  }));
};

const buildFakeRelationships = (entityName: string): RelationshipsTabData => {
  // Layout coordinates aren't here — the topology component lays the nodes out
  // along a fixed radial arrangement based on order.
  const topology: RelationshipsTabData['topology'] = {
    nodes: [
      { id: 'focal', label: entityName, focal: true },
      { id: 'cart', label: 'cart' },
      { id: 'ad', label: 'ad' },
      { id: 'recommendation', label: 'recommendation' },
      { id: 'product-catalog', label: 'product-catalog' },
      { id: 'currency', label: 'currency' },
      { id: 'frontend-proxy', label: 'frontend-proxy' },
      { id: 'load-generator', label: 'load-generator' },
      { id: 'payment', label: 'payment' },
      { id: 'redis', label: 'redis' },
      { id: 'flagd', label: 'flagd' },
    ],
    edges: [
      { from: 'focal', to: 'cart', emphasized: true },
      { from: 'focal', to: 'ad', emphasized: true },
      { from: 'focal', to: 'recommendation', emphasized: true },
      { from: 'focal', to: 'product-catalog', emphasized: true },
      { from: 'focal', to: 'currency', emphasized: true },
      { from: 'cart', to: 'redis' },
      { from: 'recommendation', to: 'product-catalog' },
      { from: 'frontend-proxy', to: 'focal' },
      { from: 'load-generator', to: 'frontend-proxy' },
      { from: 'product-catalog', to: 'flagd' },
      { from: 'payment', to: 'cart' },
    ],
  };
  return {
    topology,
    related: [
      {
        id: 'r1',
        name: 'gke-abcdefgh',
        health: 'Unhealthy',
        entityType: 'Host',
        relation: `Hosting ${entityName}`,
      },
      {
        id: 'r2',
        name: 'checkout-api',
        health: 'Unhealthy',
        entityType: 'API',
        relation: `Called by ${entityName}`,
      },
      {
        id: 'r3',
        name: 'entity-name',
        health: 'At risk',
        entityType: 'entity-type',
        relation: 'Relation in plain language',
      },
      {
        id: 'r4',
        name: 'entity-name',
        health: 'At risk',
        entityType: 'entity-type',
        relation: 'Relation in plain language',
      },
      {
        id: 'r5',
        name: 'entity-name',
        health: 'Healthy',
        entityType: 'entity-type',
        relation: 'Relation in plain language',
      },
      {
        id: 'r6',
        name: 'entity-name',
        health: 'Healthy',
        entityType: 'entity-type',
        relation: 'Relation in plain language',
      },
      {
        id: 'r7',
        name: 'entity-name',
        health: 'Healthy',
        entityType: 'entity-type',
        relation: 'Relation in plain language',
      },
      {
        id: 'r8',
        name: 'entity-name',
        health: 'Healthy',
        entityType: 'entity-type',
        relation: 'Relation in plain language',
      },
      {
        id: 'r9',
        name: 'entity-name',
        health: 'Healthy',
        entityType: 'entity-type',
        relation: 'Relation in plain language',
      },
      {
        id: 'r10',
        name: 'entity-name',
        health: 'Healthy',
        entityType: 'entity-type',
        relation: 'Relation in plain language',
      },
      {
        id: 'r11',
        name: 'entity-name',
        health: 'Healthy',
        entityType: 'entity-type',
        relation: 'Relation in plain language',
      },
      {
        id: 'r12',
        name: 'entity-name',
        health: 'Healthy',
        entityType: 'entity-type',
        relation: 'Relation in plain language',
      },
      {
        id: 'r13',
        name: 'entity-name',
        health: 'Healthy',
        entityType: 'entity-type',
        relation: 'Relation in plain language',
      },
      {
        id: 'r14',
        name: 'entity-name',
        health: 'Healthy',
        entityType: 'entity-type',
        relation: 'Relation in plain language',
      },
      {
        id: 'r15',
        name: 'entity-name',
        health: 'Healthy',
        entityType: 'entity-type',
        relation: 'Relation in plain language',
      },
      {
        id: 'r16',
        name: 'entity-name',
        health: 'Healthy',
        entityType: 'entity-type',
        relation: 'Relation in plain language',
      },
    ],
  };
};
