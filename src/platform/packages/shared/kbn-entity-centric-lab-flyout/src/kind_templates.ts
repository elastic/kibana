/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Per-entity-kind mock template factories for the entity-centric lab flyout.
 *
 * When a non-PayFlow-story entity opens the flyout, we render kind-shaped
 * mock data so the demo always looks credible:
 *
 *   - clicking a service → service-shaped overview (latency / error / RPS),
 *     APM-style logs, downstream/upstream services in Dependencies, etc.
 *   - clicking a pod    → pod-shaped overview (CPU / memory / restarts),
 *     container logs, parent node + namespace + service in Dependencies, etc.
 *   - clicking a host   → host-shaped overview (CPU / memory / disk), ...
 *
 * Two ways to pick the kind:
 *   1. Caller passes `entityKind` explicitly when it knows the type (e.g. the
 *      Streams "All entities" page has `entity.type` from the dataset).
 *   2. Otherwise the kind is inferred from the entity name using stable name
 *      patterns (`-pod-`, `-service`, `node-`, ...). Covers Discover service
 *      clicks and internal flyout navigation (Dependencies row clicks, topology
 *      node clicks) where only the name is known.
 */

import type {
  EntityAiSummary,
  EntityOverview,
  EntityTag,
  GoldenSignal,
  OwnershipContact,
} from './fake_entity_overview';
import type {
  AlertsTabData,
  EntityTabsData,
  LogRow,
  LogSeverity,
  MetricEvent,
  MetricSeries,
  MetricsTabData,
  RelatedEntity,
  RelationshipsTabData,
  SecurityIssue,
  SecurityTabData,
} from './fake_entity_tabs';
import { INCIDENT_X_DOMAIN } from './time_domain';

// ---------------------------------------------------------------------------
// Kind type + inference
// ---------------------------------------------------------------------------

export type EntityKind =
  | 'service'
  | 'host'
  | 'node'
  | 'pod'
  | 'container'
  | 'deployment'
  | 'cluster'
  | 'namespace'
  | 'database'
  | 'cloud'
  | 'middleware'
  | 'llm';

/**
 * Map a free-form entity `type` string (as exposed by the Streams entities
 * dataset, e.g. `apm.service`, `K8s pod`, `Postgres`) to one of the canonical
 * {@link EntityKind} values used to select a flyout template.
 */
export const entityTypeToKind = (type: string | undefined): EntityKind | undefined => {
  if (!type) return undefined;
  const normalized = type.toLowerCase();
  if (normalized.includes('apm') || normalized.endsWith('service')) return 'service';
  if (normalized.includes('k8s cluster') || normalized.includes('kubernetes cluster'))
    return 'cluster';
  if (normalized.includes('k8s node') || normalized.includes('kubernetes node')) return 'node';
  if (normalized.includes('k8s pod') || normalized.includes('kubernetes pod')) return 'pod';
  if (normalized.includes('namespace')) return 'namespace';
  if (normalized.includes('deployment')) return 'deployment';
  if (normalized.includes('container')) return 'container';
  if (
    normalized.includes('postgres') ||
    normalized.includes('mysql') ||
    normalized.includes('mongo') ||
    normalized.includes('elasticsearch') ||
    normalized.includes('redis') ||
    normalized.includes('database')
  )
    return 'database';
  if (
    normalized.includes('aws') ||
    normalized.includes('gcp') ||
    normalized.includes('azure') ||
    normalized.includes('cloud')
  )
    return 'cloud';
  if (
    normalized.includes('kafka') ||
    normalized.includes('rabbitmq') ||
    normalized.includes('nats') ||
    normalized.includes('middleware')
  )
    return 'middleware';
  if (
    normalized.includes('openai') ||
    normalized.includes('anthropic') ||
    normalized.includes('gemini') ||
    normalized.includes('llm')
  )
    return 'llm';
  if (normalized.includes('bare-metal') || normalized.includes('vm') || normalized.includes('host'))
    return 'host';
  return undefined;
};

/**
 * Infer the {@link EntityKind} from an entity name when no type is available.
 * Order matters — more specific patterns are checked first (e.g. `-pod-`
 * before `-service`).
 */
export const inferEntityKind = (name: string): EntityKind | undefined => {
  const lower = name.toLowerCase();
  if (/(^|-)pod-/.test(lower) || lower.endsWith('-pod')) return 'pod';
  if (/(^|-)node-/.test(lower) || lower.startsWith('node-')) return 'node';
  if (lower.startsWith('host-')) return 'host';
  if (lower.startsWith('container-')) return 'container';
  if (lower.startsWith('deployment-')) return 'deployment';
  if (lower.endsWith('-db') || /(^|-)db-/.test(lower)) return 'database';
  if (lower.startsWith('k8s-') || lower.startsWith('cluster-')) return 'cluster';
  if (lower.startsWith('ns-')) return 'namespace';
  if (
    lower.startsWith('aws-') ||
    lower.startsWith('gcp-') ||
    lower.startsWith('azure-') ||
    lower.startsWith('cloud-')
  )
    return 'cloud';
  if (
    lower.startsWith('kafka') ||
    lower.startsWith('rabbitmq') ||
    lower.startsWith('mw-') ||
    lower.startsWith('nats')
  )
    return 'middleware';
  if (
    lower.startsWith('gpt') ||
    lower.startsWith('claude') ||
    lower.startsWith('gemini') ||
    lower.startsWith('llm-')
  )
    return 'llm';
  // PayFlow-style "ad-hoc" namespace words (payments / checkout / settlement
  // / fraud) — surface them as a namespace when nothing else matches and the
  // word is one of the curated tags. Otherwise default to service since most
  // free-form names in the demo are APM services (e.g. `merchant-portal`).
  if (
    [
      'payments',
      'checkout',
      'settlement',
      'fraud',
      'merchant',
      'platform',
      'risk',
      'orders',
    ].includes(lower)
  )
    return 'namespace';
  if (lower.endsWith('-service') || lower.endsWith('-api') || lower.endsWith('-portal'))
    return 'service';
  return undefined;
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const series = (
  id: string,
  label: string,
  ys: readonly number[]
): MetricSeries['series'][number] => ({
  id,
  label,
  points: INCIDENT_X_DOMAIN.map((x, i) => ({ x, y: ys[i] ?? ys[ys.length - 1] ?? 0 })),
});

const flatTrend = (base: number, jitter: number, seed: number): number[] => {
  const out: number[] = [];
  for (let i = 0; i < 24; i++) {
    // Deterministic, gently noisy wobble — no incident spike here, just a
    // "looks alive" sparkline for happy entities.
    const wobble = Math.sin((i + seed) * 0.6) * jitter;
    out.push(Number((base + wobble).toFixed(3)));
  }
  return out;
};

const NO_EVENTS: readonly MetricEvent[] = [];

const log = (
  id: string,
  timestamp: string,
  severity: LogSeverity,
  attribute: string,
  summary: string
): LogRow => ({ id, timestamp, severity, attribute, summary });

const today = 'Apr 14, 2026';

/**
 * Common ownership block surfaced on every non-story entity. Keeps the
 * "Ownership" accordion populated without forcing every template to repeat
 * the same placeholders.
 */
const commonOwnership: readonly OwnershipContact[] = [
  { id: 'team', label: 'Owning team', value: 'platform-team' },
  { id: 'slack', label: 'Slack channel', value: '#platform-on-call' },
  { id: 'oncall', label: 'On-call rotation', value: 'PagerDuty: platform-primary' },
];

const healthyOwnership = (
  team: string,
  slack: string,
  pagerRotation: string
): OwnershipContact[] => [
  { id: 'team', label: 'Owning team', value: team },
  { id: 'slack', label: 'Slack channel', value: slack },
  { id: 'oncall', label: 'On-call rotation', value: `PagerDuty: ${pagerRotation}` },
];

const healthySummary = (headline: string, nextSteps: readonly string[]): EntityAiSummary => ({
  headline,
  issues: [],
  nextSteps: [...nextSteps],
  generatedAt: `${today} @ 02:47:32`,
});

/**
 * Standard "no active alerts" payload used by every happy template. Charts use
 * the shared incident X domain so the X-axis tick formatter doesn't have to
 * special-case multiple shapes of values.
 */
const noActiveAlerts = (): AlertsTabData => ({
  activeCount: 0,
  totalCount: 0,
  overTime: INCIDENT_X_DOMAIN.map((x) => ({ x, y: 0 })),
  details: [],
});

const lowSecurity = (issues: readonly SecurityIssue[]): SecurityTabData => ({
  riskScore: issues.length === 0 ? 12 : 24,
  riskLevel: 'Low',
  lastEvent: issues.length === 0 ? 'No security events' : '2 days ago',
  issues: [...issues],
});

const tabs = (
  metrics: MetricsTabData,
  logs: readonly LogRow[],
  alerts: AlertsTabData,
  relationships: RelationshipsTabData,
  security: SecurityTabData
): EntityTabsData => ({ metrics, logs, alerts, relationships, security });

// ---------------------------------------------------------------------------
// Per-kind templates
// ---------------------------------------------------------------------------

const buildServiceTemplate = (name: string): { overview: EntityOverview; tabs: EntityTabsData } => {
  const tags: EntityTag[] = [
    { label: 'apm.service', color: 'hollow' },
    { label: 'Healthy', color: 'success' },
    { label: 'Production', color: 'hollow' },
  ];
  const goldenSignals: GoldenSignal[] = [
    {
      id: 'latency',
      label: 'p99 latency',
      value: 0.142,
      unit: 's',
      delta: 'Stable in last 5 min',
      color: 'success',
      trend: flatTrend(0.14, 0.01, 1),
      description: 'p99 end-to-end latency across all instances of this service.',
    },
    {
      id: 'errorRate',
      label: 'Error rate',
      value: 0.4,
      unit: '%',
      delta: 'Stable in last 5 min',
      color: 'success',
      trend: flatTrend(0.4, 0.05, 2),
      description: 'Percentage of failed requests (status >= 500 or error tag).',
    },
    {
      id: 'throughput',
      label: 'Throughput',
      value: 320,
      unit: 'req/s',
      delta: 'Stable in last 5 min',
      color: 'success',
      trend: flatTrend(320, 12, 3),
      description: 'Requests per second served across all instances of this service.',
    },
  ];
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:31`,
    tags,
    summary: healthySummary(
      `${name} is healthy — error rate, latency, and throughput are all within SLO.`,
      [
        'Continue monitoring — no action required.',
        `Compare ${name} dependencies against the current rollout in case adjacent services degrade.`,
      ]
    ),
    goldenSignals,
    details: [
      { id: 'serviceName', label: 'Service name', value: name },
      { id: 'environment', label: 'Environment', value: 'production' },
      { id: 'language', label: 'Runtime', value: 'Node.js 20.11.1' },
      { id: 'version', label: 'Version', value: 'v1.8.2' },
      { id: 'instances', label: 'Running instances', value: '6 pods' },
    ],
    ownership: healthyOwnership('platform-team', '#platform-on-call', 'platform-primary'),
    securityIssueCount: 1,
  };
  const metrics: MetricsTabData = {
    events: NO_EVENTS,
    goldenSignals: [
      {
        id: 'latency',
        label: 'Latency',
        unit: 's',
        threshold: 0.5,
        description: 'p99 end-to-end request latency.',
        series: [series('p99', 'p99 latency', flatTrend(0.14, 0.01, 4))],
      },
      {
        id: 'errorRate',
        label: 'Error rate',
        unit: '%',
        threshold: 5,
        description: 'Percentage of failed requests.',
        series: [series('error-rate', 'Error rate', flatTrend(0.4, 0.05, 5))],
      },
      {
        id: 'throughput',
        label: 'Throughput',
        unit: 'req/s',
        description: 'Requests per second served by this service.',
        series: [series('rps', 'Requests / s', flatTrend(320, 12, 6))],
      },
    ],
    otherMetrics: [
      {
        id: 'cpu',
        label: 'CPU usage',
        unit: '%',
        description: 'Average CPU usage across instances.',
        series: [series('cpu', 'CPU %', flatTrend(38, 4, 7))],
      },
      {
        id: 'memory',
        label: 'Memory usage',
        unit: '%',
        description: 'Average memory usage across instances.',
        series: [series('memory', 'Memory %', flatTrend(54, 3, 8))],
      },
    ],
  };
  const logs: LogRow[] = [
    log(
      's-1',
      `${today} @ 02:47:18.221`,
      'Info',
      'body.text',
      `[HTTP] POST /v1/${name} 200 in 12ms`
    ),
    log('s-2', `${today} @ 02:47:09.084`, 'Info', 'body.text', `[HTTP] GET /healthz 200 in 2ms`),
    log(
      's-3',
      `${today} @ 02:46:58.421`,
      'Info',
      'body.text',
      `[Worker] Processed batch of 64 events`
    ),
    log(
      's-4',
      `${today} @ 02:46:41.012`,
      'Info',
      'body.text',
      `[Lifecycle] Readiness probe succeeded`
    ),
    log(
      's-5',
      `${today} @ 02:46:28.118`,
      'Warning',
      'body.text',
      `[Cache] Evicted 12 cold entries from L1 cache`
    ),
    log(
      's-6',
      `${today} @ 02:46:09.084`,
      'Info',
      'body.text',
      `[Auth] Issued JWT for user_id=4711`
    ),
  ];
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-pod-1`,
      name: `${name}-pod-1`,
      health: 'Healthy',
      entityType: 'kubernetes.pod',
      relation: 'Runs on — healthy, 42% memory',
    },
    {
      id: `${name}-rel-pod-2`,
      name: `${name}-pod-2`,
      health: 'Healthy',
      entityType: 'kubernetes.pod',
      relation: 'Runs on — healthy, 38% memory',
    },
    {
      id: `${name}-rel-db`,
      name: 'orders-db',
      health: 'Healthy',
      entityType: 'database (postgresql)',
      relation: 'Calls — 4ms',
    },
    {
      id: `${name}-rel-cluster`,
      name: 'k8s-us-prod',
      health: 'Healthy',
      entityType: 'kubernetes.cluster',
      relation: 'Member of — 48 nodes, 600+ pods',
    },
  ];
  const relationships: RelationshipsTabData = {
    topology: {
      focalHealth: 'Healthy',
      nodes: [
        { id: 'focal', label: name, focal: true },
        { id: 'cart', label: 'orders-db' },
        { id: 'payment', label: `${name}-pod-1` },
        { id: 'recommendation', label: `${name}-pod-2` },
      ],
      edges: [
        { from: 'focal', to: 'cart', emphasized: true },
        { from: 'focal', to: 'payment' },
        { from: 'focal', to: 'recommendation' },
      ],
    },
    related,
  };
  const security = lowSecurity([
    {
      id: 's-cve-1',
      severity: 'Low',
      title: 'Outdated transitive dependency lodash@4.17.20 (CVE-2026-09127)',
      detectedAt: 'May 1, 2026, 08:30',
      source: 'Vulnerabilities',
      status: 'Triaged',
    },
  ]);
  return { overview, tabs: tabs(metrics, logs, noActiveAlerts(), relationships, security) };
};

const buildHostTemplate = (name: string): { overview: EntityOverview; tabs: EntityTabsData } => {
  const tags: EntityTag[] = [
    { label: 'Host', color: 'hollow' },
    { label: 'Bare-metal', color: 'hollow' },
    { label: 'Healthy', color: 'success' },
    { label: 'Production', color: 'hollow' },
  ];
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: healthySummary(
      `${name} is healthy — CPU, memory, and disk are all well below alerting thresholds.`,
      [
        'No action required — continue monitoring resource trends.',
        'Confirm the most recent kernel patch landed on the next maintenance window.',
      ]
    ),
    goldenSignals: [
      {
        id: 'latency',
        label: 'CPU',
        value: 42,
        unit: '%',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(42, 3, 11),
        description: 'Average CPU utilization across all cores on this host.',
      },
      {
        id: 'errorRate',
        label: 'Memory',
        value: 58,
        unit: '%',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(58, 2, 12),
        description: 'Memory used as a percentage of total physical memory.',
      },
      {
        id: 'throughput',
        label: 'Disk used',
        value: 31,
        unit: '%',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(31, 1, 13),
        description: 'Root filesystem usage as a percentage of total capacity.',
      },
    ],
    details: [
      { id: 'hostname', label: 'Hostname', value: name },
      { id: 'os', label: 'OS', value: 'Ubuntu 22.04.4 LTS' },
      { id: 'kernel', label: 'Kernel', value: '5.15.0-105-generic' },
      { id: 'cpu', label: 'CPU', value: 'Intel Xeon Gold 6248R · 24 cores' },
      { id: 'memory', label: 'Memory', value: '128 GB' },
      { id: 'disk', label: 'Disk', value: '2 × 960 GB NVMe (RAID 1)' },
      { id: 'address', label: 'Private IP', value: '10.32.14.87' },
    ],
    ownership: healthyOwnership('platform-infra', '#infra-on-call', 'infra-primary'),
    securityIssueCount: 2,
  };
  const metrics: MetricsTabData = {
    events: NO_EVENTS,
    goldenSignals: [
      {
        id: 'cpu',
        label: 'CPU usage',
        unit: '%',
        threshold: 85,
        description: 'Average CPU usage across cores.',
        series: [series('cpu', 'CPU %', flatTrend(42, 3, 14))],
      },
      {
        id: 'memory',
        label: 'Memory usage',
        unit: '%',
        threshold: 85,
        description: 'Memory used / total memory.',
        series: [series('memory', 'Memory %', flatTrend(58, 2, 15))],
      },
      {
        id: 'disk',
        label: 'Disk usage',
        unit: '%',
        threshold: 90,
        description: 'Root filesystem usage.',
        series: [series('disk', 'Disk %', flatTrend(31, 1, 16))],
      },
    ],
    otherMetrics: [
      {
        id: 'netIn',
        label: 'Network in',
        unit: 'MB/s',
        description: 'Inbound network throughput.',
        series: [series('net-in', 'Network in', flatTrend(48, 4, 17))],
      },
      {
        id: 'netOut',
        label: 'Network out',
        unit: 'MB/s',
        description: 'Outbound network throughput.',
        series: [series('net-out', 'Network out', flatTrend(52, 4, 18))],
      },
    ],
  };
  const logs: LogRow[] = [
    log(
      'h-1',
      `${today} @ 02:47:20.001`,
      'Info',
      'body.text',
      `systemd[1]: Started Daily apt download activities`
    ),
    log(
      'h-2',
      `${today} @ 02:47:12.084`,
      'Info',
      'body.text',
      `kernel: TCP: established hash table entries: 65536`
    ),
    log(
      'h-3',
      `${today} @ 02:46:58.421`,
      'Info',
      'body.text',
      `sshd[8821]: Accepted publickey for sre from 10.32.0.4`
    ),
    log(
      'h-4',
      `${today} @ 02:46:41.012`,
      'Info',
      'body.text',
      `systemd-timesyncd[634]: Synchronized to time server`
    ),
    log(
      'h-5',
      `${today} @ 02:46:28.118`,
      'Info',
      'body.text',
      `kubelet[1112]: container manager: started 24 containers`
    ),
  ];
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-pod-a`,
      name: 'payments-pod-3ac1f',
      health: 'Healthy',
      entityType: 'kubernetes.pod',
      relation: 'Hosts — namespace payments',
    },
    {
      id: `${name}-rel-pod-b`,
      name: 'fraud-pod-9a1c',
      health: 'Healthy',
      entityType: 'kubernetes.pod',
      relation: 'Hosts — namespace fraud',
    },
    {
      id: `${name}-rel-cluster`,
      name: 'k8s-us-prod',
      health: 'Healthy',
      entityType: 'kubernetes.cluster',
      relation: 'Member of — 48 nodes, 600+ pods',
    },
  ];
  const relationships: RelationshipsTabData = {
    topology: {
      focalHealth: 'Healthy',
      nodes: [
        { id: 'focal', label: name, focal: true },
        { id: 'cart', label: 'payments-pod-3ac1f' },
        { id: 'payment', label: 'fraud-pod-9a1c' },
        { id: 'ad', label: 'k8s-us-prod' },
      ],
      edges: [
        { from: 'focal', to: 'cart', emphasized: true },
        { from: 'focal', to: 'payment', emphasized: true },
        { from: 'focal', to: 'ad' },
      ],
    },
    related,
  };
  const security = lowSecurity([
    {
      id: 'h-cve-1',
      severity: 'Medium',
      title: 'OpenSSL 3.0.2 affected by CVE-2026-04188',
      detectedAt: 'May 3, 2026, 09:12',
      source: 'Vulnerabilities',
      status: 'Open',
    },
    {
      id: 'h-cve-2',
      severity: 'Low',
      title: 'sudo package out of date by 2 minor versions',
      detectedAt: 'May 2, 2026, 14:05',
      source: 'CSPM',
      status: 'Open',
    },
  ]);
  return { overview, tabs: tabs(metrics, logs, noActiveAlerts(), relationships, security) };
};

const buildNodeTemplate = (name: string): { overview: EntityOverview; tabs: EntityTabsData } => {
  const tags: EntityTag[] = [
    { label: 'kubernetes.node', color: 'hollow' },
    { label: 'Healthy', color: 'success' },
    { label: 'Production', color: 'hollow' },
  ];
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: healthySummary(
      `${name} is healthy — 22 pods scheduled, memory at 41% of allocatable.`,
      [
        'Continue monitoring scheduler pressure ahead of the next deploy wave.',
        'Verify NodeMemoryPressure stays false — current trend is well below threshold.',
      ]
    ),
    goldenSignals: [
      {
        id: 'latency',
        label: 'CPU',
        value: 38,
        unit: '%',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(38, 3, 21),
        description: 'Average CPU usage on this node.',
      },
      {
        id: 'errorRate',
        label: 'Memory',
        value: 41,
        unit: '%',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(41, 3, 22),
        description: 'Memory used as a percentage of allocatable.',
      },
      {
        id: 'throughput',
        label: 'Pods',
        value: 22,
        unit: '',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(22, 0.5, 23),
        description: 'Number of pods currently scheduled to this node.',
      },
    ],
    details: [
      { id: 'nodeName', label: 'Node name', value: name },
      { id: 'kubeletVersion', label: 'Kubelet version', value: 'v1.29.4' },
      { id: 'containerRuntime', label: 'Container runtime', value: 'containerd://1.7.13' },
      { id: 'os', label: 'OS image', value: 'Ubuntu 22.04.4 LTS' },
      { id: 'allocatableCpu', label: 'Allocatable CPU', value: '16 cores' },
      { id: 'allocatableMemory', label: 'Allocatable memory', value: '64 Gi' },
      { id: 'nodeRoles', label: 'Roles', value: 'worker' },
    ],
    ownership: healthyOwnership('platform-infra', '#infra-on-call', 'infra-primary'),
    securityIssueCount: 1,
  };
  const metrics: MetricsTabData = {
    events: NO_EVENTS,
    goldenSignals: [
      {
        id: 'cpu',
        label: 'CPU usage',
        unit: '%',
        threshold: 85,
        description: 'CPU usage on this node.',
        series: [series('cpu', 'CPU %', flatTrend(38, 3, 24))],
      },
      {
        id: 'memory',
        label: 'Memory usage',
        unit: '%',
        threshold: 85,
        description: 'Memory used / allocatable.',
        series: [series('memory', 'Memory %', flatTrend(41, 3, 25))],
      },
      {
        id: 'pods',
        label: 'Scheduled pods',
        unit: '',
        description: 'Number of pods scheduled to this node.',
        series: [series('pods', 'Pods', flatTrend(22, 0.5, 26))],
      },
    ],
    otherMetrics: [
      {
        id: 'restarts',
        label: 'Container restarts',
        unit: '',
        description: 'Container restart count across this node.',
        series: [series('restarts', 'Restarts', flatTrend(0.4, 0.3, 27))],
      },
      {
        id: 'netIn',
        label: 'Network in',
        unit: 'MB/s',
        description: 'Inbound network throughput.',
        series: [series('net-in', 'Network in', flatTrend(34, 3, 28))],
      },
    ],
  };
  const logs: LogRow[] = [
    log('n-1', `${today} @ 02:47:20.001`, 'Info', 'body.text', `kubelet: NodeReady condition true`),
    log(
      'n-2',
      `${today} @ 02:47:09.084`,
      'Info',
      'body.text',
      `kubelet: Started container metrics-server`
    ),
    log(
      'n-3',
      `${today} @ 02:46:58.421`,
      'Info',
      'body.text',
      `kubelet: Successfully pulled image \"registry/checkout-service:v1.8.2\"`
    ),
    log(
      'n-4',
      `${today} @ 02:46:41.012`,
      'Info',
      'body.text',
      `kubelet: scheduled pod default/checkout-pod-1f2a (memory: 256Mi)`
    ),
  ];
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-pod-a`,
      name: 'payments-pod-3ac1f',
      health: 'Healthy',
      entityType: 'kubernetes.pod',
      relation: 'Pods — payments namespace, 38% memory',
    },
    {
      id: `${name}-rel-pod-b`,
      name: 'fraud-pod-9a1c',
      health: 'Healthy',
      entityType: 'kubernetes.pod',
      relation: 'Pods — fraud namespace, 22% memory',
    },
    {
      id: `${name}-rel-cluster`,
      name: 'k8s-us-prod',
      health: 'Healthy',
      entityType: 'kubernetes.cluster',
      relation: 'Member of — 48 nodes, 600+ pods',
    },
  ];
  const relationships: RelationshipsTabData = {
    topology: {
      focalHealth: 'Healthy',
      nodes: [
        { id: 'focal', label: name, focal: true },
        { id: 'cart', label: 'payments-pod-3ac1f' },
        { id: 'payment', label: 'fraud-pod-9a1c' },
        { id: 'ad', label: 'k8s-us-prod' },
      ],
      edges: [
        { from: 'focal', to: 'cart', emphasized: true },
        { from: 'focal', to: 'payment', emphasized: true },
        { from: 'focal', to: 'ad' },
      ],
    },
    related,
  };
  const security = lowSecurity([
    {
      id: 'n-cve-1',
      severity: 'Low',
      title: 'containerd 1.7.13 has a known low-severity advisory',
      detectedAt: 'May 1, 2026, 08:30',
      source: 'CSPM',
      status: 'Suppressed',
    },
  ]);
  return { overview, tabs: tabs(metrics, logs, noActiveAlerts(), relationships, security) };
};

const buildPodTemplate = (name: string): { overview: EntityOverview; tabs: EntityTabsData } => {
  const tags: EntityTag[] = [
    { label: 'kubernetes.pod', color: 'hollow' },
    { label: 'Healthy', color: 'success' },
    { label: 'Production', color: 'hollow' },
  ];
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: healthySummary(
      `${name} is healthy — running steady on node-prod-eu-04 for the last 4 days.`,
      [
        'No action required.',
        'Compare resource usage against the deployment template if a memory increase shows up after the next release.',
      ]
    ),
    goldenSignals: [
      {
        id: 'latency',
        label: 'CPU',
        value: 12,
        unit: '%',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(12, 1.5, 31),
        description: 'CPU usage relative to the pod resource request.',
      },
      {
        id: 'errorRate',
        label: 'Memory',
        value: 41,
        unit: '%',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(41, 1.5, 32),
        description: 'Memory used as a percentage of the pod limit.',
      },
      {
        id: 'throughput',
        label: 'Restarts',
        value: 0,
        unit: '',
        delta: 'No restarts in last 24 h',
        color: 'success',
        trend: flatTrend(0, 0, 33),
        description: 'Number of container restarts in the last 24 hours.',
      },
    ],
    details: [
      { id: 'podName', label: 'Pod name', value: name },
      { id: 'namespace', label: 'Namespace', value: 'payments' },
      { id: 'node', label: 'Node', value: 'node-prod-eu-04' },
      { id: 'image', label: 'Container image', value: 'registry/payments-service:v1.8.2' },
      { id: 'qos', label: 'QoS class', value: 'Burstable' },
      { id: 'age', label: 'Age', value: '4 days' },
    ],
    ownership: healthyOwnership('payments-team', '#payments-on-call', 'payments-primary'),
    securityIssueCount: 1,
  };
  const metrics: MetricsTabData = {
    events: NO_EVENTS,
    goldenSignals: [
      {
        id: 'cpu',
        label: 'CPU usage',
        unit: '%',
        threshold: 85,
        description: 'CPU usage on this pod.',
        series: [series('cpu', 'CPU %', flatTrend(12, 1.5, 34))],
      },
      {
        id: 'memory',
        label: 'Memory usage',
        unit: '%',
        threshold: 85,
        description: 'Memory used / limit.',
        series: [series('memory', 'Memory %', flatTrend(41, 1.5, 35))],
      },
      {
        id: 'restarts',
        label: 'Container restarts',
        unit: '',
        description: 'Container restart count.',
        series: [series('restarts', 'Restarts', flatTrend(0, 0, 36))],
      },
    ],
    otherMetrics: [
      {
        id: 'netIn',
        label: 'Network in',
        unit: 'KB/s',
        description: 'Inbound network throughput.',
        series: [series('net-in', 'Network in', flatTrend(180, 12, 37))],
      },
      {
        id: 'netOut',
        label: 'Network out',
        unit: 'KB/s',
        description: 'Outbound network throughput.',
        series: [series('net-out', 'Network out', flatTrend(220, 14, 38))],
      },
    ],
  };
  const logs: LogRow[] = [
    log(
      'p-1',
      `${today} @ 02:47:20.001`,
      'Info',
      'body.text',
      `kubelet: Started container ${name}`
    ),
    log(
      'p-2',
      `${today} @ 02:47:09.084`,
      'Info',
      'body.text',
      `Liveness probe succeeded (HTTP 200, 12ms)`
    ),
    log(
      'p-3',
      `${today} @ 02:46:58.421`,
      'Info',
      'body.text',
      `Readiness probe succeeded (HTTP 200, 8ms)`
    ),
    log(
      'p-4',
      `${today} @ 02:46:41.012`,
      'Info',
      'body.text',
      `kubelet: Pulled image registry/payments-service:v1.8.2`
    ),
  ];
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-node`,
      name: 'node-prod-eu-04',
      health: 'Healthy',
      entityType: 'kubernetes.node',
      relation: 'Runs on — node memory 41%',
    },
    {
      id: `${name}-rel-service`,
      name: 'payments-service',
      health: 'Healthy',
      entityType: 'apm.service',
      relation: 'Runs — v1.8.2',
    },
    {
      id: `${name}-rel-cluster`,
      name: 'k8s-eu-prod',
      health: 'Healthy',
      entityType: 'kubernetes.cluster',
      relation: 'Member of — 48 nodes, 600+ pods',
    },
  ];
  const relationships: RelationshipsTabData = {
    topology: {
      focalHealth: 'Healthy',
      nodes: [
        { id: 'focal', label: name, focal: true },
        { id: 'cart', label: 'node-prod-eu-04' },
        { id: 'payment', label: 'payments-service' },
        { id: 'ad', label: 'k8s-eu-prod' },
      ],
      edges: [
        { from: 'focal', to: 'cart', emphasized: true },
        { from: 'focal', to: 'payment', emphasized: true },
        { from: 'cart', to: 'ad' },
      ],
    },
    related,
  };
  const security = lowSecurity([
    {
      id: 'p-cve-1',
      severity: 'Low',
      title: 'Base image distroless/cc:nonroot has a low-severity glibc advisory',
      detectedAt: 'May 1, 2026, 08:30',
      source: 'Vulnerabilities',
      status: 'Triaged',
    },
  ]);
  return { overview, tabs: tabs(metrics, logs, noActiveAlerts(), relationships, security) };
};

const buildClusterTemplate = (name: string): { overview: EntityOverview; tabs: EntityTabsData } => {
  const tags: EntityTag[] = [
    { label: 'kubernetes.cluster', color: 'hollow' },
    { label: 'Healthy', color: 'success' },
    { label: 'Production', color: 'hollow' },
  ];
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: healthySummary(
      `${name} is healthy — 48 nodes ready, 612 pods running across 8 namespaces.`,
      [
        'Continue monitoring etcd write latency ahead of the next maintenance window.',
        'Verify NodeMemoryPressure stays false across all nodes.',
      ]
    ),
    goldenSignals: [
      {
        id: 'latency',
        label: 'Ready nodes',
        value: 48,
        unit: '/48',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(48, 0, 41),
        description: 'Number of nodes in Ready condition versus total nodes.',
      },
      {
        id: 'errorRate',
        label: 'API latency p99',
        value: 84,
        unit: 'ms',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(84, 6, 42),
        description: 'p99 latency for kube-apiserver requests.',
      },
      {
        id: 'throughput',
        label: 'Running pods',
        value: 612,
        unit: '',
        delta: '+3 in last 5 min',
        color: 'success',
        trend: flatTrend(612, 4, 43),
        description: 'Number of pods in Running state across the cluster.',
      },
    ],
    details: [
      { id: 'clusterName', label: 'Cluster name', value: name },
      { id: 'k8sVersion', label: 'Kubernetes version', value: 'v1.29.4' },
      { id: 'provider', label: 'Provider', value: 'EKS · eu-west-1' },
      { id: 'nodes', label: 'Nodes', value: '48 (24 m5.4xlarge, 24 r5.4xlarge)' },
      { id: 'namespaces', label: 'Namespaces', value: '8' },
      { id: 'pods', label: 'Running pods', value: '612' },
    ],
    ownership: healthyOwnership('platform-infra', '#infra-on-call', 'infra-primary'),
    securityIssueCount: 2,
  };
  const metrics: MetricsTabData = {
    events: NO_EVENTS,
    goldenSignals: [
      {
        id: 'apiLatency',
        label: 'API server p99 latency',
        unit: 'ms',
        threshold: 500,
        description: 'p99 latency for kube-apiserver requests.',
        series: [series('api-p99', 'API p99 latency', flatTrend(84, 6, 44))],
      },
      {
        id: 'readyNodes',
        label: 'Ready nodes',
        unit: '',
        description: 'Number of nodes in Ready condition.',
        series: [series('ready-nodes', 'Ready nodes', flatTrend(48, 0, 45))],
      },
      {
        id: 'pods',
        label: 'Running pods',
        unit: '',
        description: 'Number of pods in Running state.',
        series: [series('pods', 'Running pods', flatTrend(612, 4, 46))],
      },
    ],
    otherMetrics: [
      {
        id: 'etcd',
        label: 'etcd write latency p99',
        unit: 'ms',
        description: 'p99 etcd write latency.',
        series: [series('etcd', 'etcd p99', flatTrend(28, 3, 47))],
      },
      {
        id: 'scheduler',
        label: 'Scheduler latency p99',
        unit: 'ms',
        description: 'p99 scheduling latency.',
        series: [series('scheduler', 'Scheduler p99', flatTrend(42, 4, 48))],
      },
    ],
  };
  const logs: LogRow[] = [
    log(
      'c-1',
      `${today} @ 02:47:20.001`,
      'Info',
      'body.text',
      `kube-controller-manager: Reconciled HPA payments-service (replicas: 6)`
    ),
    log(
      'c-2',
      `${today} @ 02:47:09.084`,
      'Info',
      'body.text',
      `kube-scheduler: Bound pod default/checkout-pod-1f2a to node-prod-eu-04`
    ),
    log(
      'c-3',
      `${today} @ 02:46:58.421`,
      'Info',
      'body.text',
      `kube-apiserver: Watch event sent — Deployment payments-service`
    ),
    log(
      'c-4',
      `${today} @ 02:46:41.012`,
      'Info',
      'body.text',
      `etcd: snapshot saved at index 1895220`
    ),
  ];
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-node-a`,
      name: 'node-prod-eu-04',
      health: 'Healthy',
      entityType: 'kubernetes.node',
      relation: 'Nodes — 22 pods scheduled',
    },
    {
      id: `${name}-rel-node-b`,
      name: 'node-prod-eu-05',
      health: 'Healthy',
      entityType: 'kubernetes.node',
      relation: 'Nodes — 18 pods scheduled',
    },
    {
      id: `${name}-rel-ns-payments`,
      name: 'payments',
      health: 'Healthy',
      entityType: 'kubernetes.namespace',
      relation: 'Namespaces — 64 pods, 8 services',
    },
    {
      id: `${name}-rel-ns-checkout`,
      name: 'checkout',
      health: 'Healthy',
      entityType: 'kubernetes.namespace',
      relation: 'Namespaces — 32 pods, 4 services',
    },
  ];
  const relationships: RelationshipsTabData = {
    topology: {
      focalHealth: 'Healthy',
      nodes: [
        { id: 'focal', label: name, focal: true },
        { id: 'cart', label: 'node-prod-eu-04' },
        { id: 'payment', label: 'node-prod-eu-05' },
        { id: 'recommendation', label: 'payments' },
        { id: 'ad', label: 'checkout' },
      ],
      edges: [
        { from: 'focal', to: 'cart', emphasized: true },
        { from: 'focal', to: 'payment', emphasized: true },
        { from: 'focal', to: 'recommendation' },
        { from: 'focal', to: 'ad' },
      ],
    },
    related,
  };
  const security = lowSecurity([
    {
      id: 'cl-cve-1',
      severity: 'Medium',
      title: 'NetworkPolicy missing in 2 namespaces',
      detectedAt: 'May 3, 2026, 09:12',
      source: 'CSPM',
      status: 'Open',
    },
    {
      id: 'cl-cve-2',
      severity: 'Low',
      title: 'Audit log retention below recommended 30 days',
      detectedAt: 'May 2, 2026, 14:05',
      source: 'CSPM',
      status: 'Triaged',
    },
  ]);
  return { overview, tabs: tabs(metrics, logs, noActiveAlerts(), relationships, security) };
};

const buildNamespaceTemplate = (
  name: string
): { overview: EntityOverview; tabs: EntityTabsData } => {
  const tags: EntityTag[] = [
    { label: 'kubernetes.namespace', color: 'hollow' },
    { label: 'Healthy', color: 'success' },
    { label: 'Production', color: 'hollow' },
  ];
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: healthySummary(
      `${name} is healthy — 32 pods running across 4 services, no recent restarts.`,
      [
        'Continue monitoring HPA decisions for ${name}.',
        'Review NetworkPolicies on the next platform sync.',
      ]
    ),
    goldenSignals: [
      {
        id: 'latency',
        label: 'Running pods',
        value: 32,
        unit: '',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(32, 0.6, 51),
        description: 'Pods in Running state in this namespace.',
      },
      {
        id: 'errorRate',
        label: 'Services',
        value: 4,
        unit: '',
        delta: 'No change',
        color: 'success',
        trend: flatTrend(4, 0, 52),
        description: 'Number of services registered in this namespace.',
      },
      {
        id: 'throughput',
        label: 'Restart rate',
        value: 0,
        unit: '/h',
        delta: 'No restarts in last 1 h',
        color: 'success',
        trend: flatTrend(0, 0, 53),
        description: 'Container restarts per hour across all pods.',
      },
    ],
    details: [
      { id: 'namespace', label: 'Namespace', value: name },
      { id: 'pods', label: 'Running pods', value: '32' },
      { id: 'services', label: 'Services', value: '4' },
      { id: 'deployments', label: 'Deployments', value: '6' },
      { id: 'cpuRequest', label: 'Total CPU request', value: '14.2 cores' },
      { id: 'memoryRequest', label: 'Total memory request', value: '38 Gi' },
    ],
    ownership: healthyOwnership(`${name}-team`, `#${name}-on-call`, `${name}-primary`),
    securityIssueCount: 0,
  };
  const metrics: MetricsTabData = {
    events: NO_EVENTS,
    goldenSignals: [
      {
        id: 'pods',
        label: 'Running pods',
        unit: '',
        description: 'Pods in Running state.',
        series: [series('pods', 'Running pods', flatTrend(32, 0.6, 54))],
      },
      {
        id: 'restarts',
        label: 'Container restarts',
        unit: '',
        description: 'Container restart count.',
        series: [series('restarts', 'Restarts', flatTrend(0, 0, 55))],
      },
      {
        id: 'cpu',
        label: 'Namespace CPU usage',
        unit: 'cores',
        description: 'Sum of CPU usage across all pods.',
        series: [series('cpu', 'CPU cores', flatTrend(6.2, 0.4, 56))],
      },
    ],
    otherMetrics: [
      {
        id: 'memory',
        label: 'Namespace memory usage',
        unit: 'GB',
        description: 'Sum of memory usage across all pods.',
        series: [series('memory', 'Memory GB', flatTrend(18.4, 0.6, 57))],
      },
      {
        id: 'netIn',
        label: 'Network in',
        unit: 'MB/s',
        description: 'Inbound network throughput.',
        series: [series('net-in', 'Network in', flatTrend(48, 4, 58))],
      },
    ],
  };
  const logs: LogRow[] = [
    log(
      'ns-1',
      `${today} @ 02:47:20.001`,
      'Info',
      'body.text',
      `kube-controller-manager: HPA scaled ${name}/checkout-service to 4`
    ),
    log(
      'ns-2',
      `${today} @ 02:47:09.084`,
      'Info',
      'body.text',
      `kube-scheduler: Bound pod ${name}/checkout-pod-1f2a`
    ),
    log(
      'ns-3',
      `${today} @ 02:46:58.421`,
      'Info',
      'body.text',
      `kube-controller-manager: Reconciled Deployment ${name}/payments-service`
    ),
  ];
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-cluster`,
      name: 'k8s-eu-prod',
      health: 'Healthy',
      entityType: 'kubernetes.cluster',
      relation: 'Member of — 48 nodes, 600+ pods',
    },
    {
      id: `${name}-rel-svc`,
      name: 'payments-service',
      health: 'Healthy',
      entityType: 'apm.service',
      relation: 'Hosts — 4 replicas',
    },
    {
      id: `${name}-rel-pod`,
      name: 'payments-pod-3ac1f',
      health: 'Healthy',
      entityType: 'kubernetes.pod',
      relation: 'Pods — payments-service',
    },
  ];
  const relationships: RelationshipsTabData = {
    topology: {
      focalHealth: 'Healthy',
      nodes: [
        { id: 'focal', label: name, focal: true },
        { id: 'cart', label: 'payments-service' },
        { id: 'payment', label: 'payments-pod-3ac1f' },
        { id: 'ad', label: 'k8s-eu-prod' },
      ],
      edges: [
        { from: 'focal', to: 'cart', emphasized: true },
        { from: 'focal', to: 'payment', emphasized: true },
        { from: 'focal', to: 'ad' },
      ],
    },
    related,
  };
  return {
    overview,
    tabs: tabs(metrics, logs, noActiveAlerts(), relationships, lowSecurity([])),
  };
};

const buildDatabaseTemplate = (
  name: string
): { overview: EntityOverview; tabs: EntityTabsData } => {
  const tags: EntityTag[] = [
    { label: 'database', color: 'hollow' },
    { label: 'Postgres', color: 'hollow' },
    { label: 'Healthy', color: 'success' },
    { label: 'Production', color: 'hollow' },
  ];
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: healthySummary(`${name} is healthy — query latency normal, replica lag under 80 ms.`, [
      'No action required — connection pool headroom is healthy.',
      'Run VACUUM ANALYZE on hot tables before the next billing cycle.',
    ]),
    goldenSignals: [
      {
        id: 'latency',
        label: 'Query p99 latency',
        value: 8,
        unit: 'ms',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(8, 0.8, 61),
        description: 'p99 query latency across all clients.',
      },
      {
        id: 'errorRate',
        label: 'Connections',
        value: 42,
        unit: '',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(42, 3, 62),
        description: 'Active client connections.',
      },
      {
        id: 'throughput',
        label: 'Replica lag',
        value: 72,
        unit: 'ms',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(72, 6, 63),
        description: 'Replication lag against the read replica.',
      },
    ],
    details: [
      { id: 'engine', label: 'Engine', value: 'PostgreSQL 15.4' },
      { id: 'size', label: 'Total size', value: '482 GB' },
      { id: 'connections', label: 'Max connections', value: '200' },
      { id: 'replication', label: 'Replication', value: 'streaming (1 replica)' },
      { id: 'backup', label: 'Last backup', value: '2 h ago (incremental)' },
    ],
    ownership: healthyOwnership('platform-data', '#data-on-call', 'data-primary'),
    securityIssueCount: 1,
  };
  const metrics: MetricsTabData = {
    events: NO_EVENTS,
    goldenSignals: [
      {
        id: 'queryLatency',
        label: 'Query latency p99',
        unit: 'ms',
        threshold: 50,
        description: 'p99 query latency.',
        series: [series('query-p99', 'p99 latency', flatTrend(8, 0.8, 64))],
      },
      {
        id: 'connections',
        label: 'Active connections',
        unit: '',
        threshold: 180,
        description: 'Active client connections.',
        series: [series('connections', 'Connections', flatTrend(42, 3, 65))],
      },
      {
        id: 'replicaLag',
        label: 'Replica lag',
        unit: 'ms',
        threshold: 1000,
        description: 'Replication lag.',
        series: [series('replica-lag', 'Replica lag', flatTrend(72, 6, 66))],
      },
    ],
    otherMetrics: [
      {
        id: 'cpu',
        label: 'CPU usage',
        unit: '%',
        description: 'CPU usage on the database host.',
        series: [series('cpu', 'CPU %', flatTrend(28, 3, 67))],
      },
      {
        id: 'disk',
        label: 'Disk usage',
        unit: '%',
        description: 'Disk usage as a percentage of total capacity.',
        series: [series('disk', 'Disk %', flatTrend(48, 1, 68))],
      },
    ],
  };
  const logs: LogRow[] = [
    log(
      'd-1',
      `${today} @ 02:47:20.001`,
      'Info',
      'body.text',
      `LOG: checkpoint complete: wrote 1842 buffers (1.4%)`
    ),
    log(
      'd-2',
      `${today} @ 02:47:09.084`,
      'Info',
      'body.text',
      `LOG: replication standby \"replica-1\" caught up`
    ),
    log(
      'd-3',
      `${today} @ 02:46:58.421`,
      'Warning',
      'body.text',
      `LOG: duration: 312.418 ms statement: SELECT * FROM orders WHERE …`
    ),
    log(
      'd-4',
      `${today} @ 02:46:41.012`,
      'Info',
      'body.text',
      `LOG: autovacuum: ANALYZE public.orders`
    ),
  ];
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-svc-1`,
      name: 'payments-service',
      health: 'Healthy',
      entityType: 'apm.service',
      relation: 'Called by — 240 req/s',
    },
    {
      id: `${name}-rel-svc-2`,
      name: 'billing-api',
      health: 'Healthy',
      entityType: 'apm.service',
      relation: 'Called by — 18 req/s',
    },
    {
      id: `${name}-rel-host`,
      name: 'host-eu-prod-01',
      health: 'Healthy',
      entityType: 'host',
      relation: 'Runs on — Bare-metal',
    },
  ];
  const relationships: RelationshipsTabData = {
    topology: {
      focalHealth: 'Healthy',
      nodes: [
        { id: 'focal', label: name, focal: true },
        { id: 'cart', label: 'payments-service' },
        { id: 'payment', label: 'billing-api' },
        { id: 'ad', label: 'host-eu-prod-01' },
      ],
      edges: [
        { from: 'cart', to: 'focal', emphasized: true },
        { from: 'payment', to: 'focal' },
        { from: 'focal', to: 'ad' },
      ],
    },
    related,
  };
  const security = lowSecurity([
    {
      id: 'd-cve-1',
      severity: 'Medium',
      title: 'CIS Postgres 1.5.0 — auditd rule for FAILED_LOGIN missing',
      detectedAt: 'May 3, 2026, 09:12',
      source: 'CSPM',
      status: 'Open',
    },
  ]);
  return { overview, tabs: tabs(metrics, logs, noActiveAlerts(), relationships, security) };
};

const buildCloudTemplate = (name: string): { overview: EntityOverview; tabs: EntityTabsData } => {
  const tags: EntityTag[] = [
    { label: 'cloud', color: 'hollow' },
    { label: 'AWS region', color: 'hollow' },
    { label: 'Healthy', color: 'success' },
    { label: 'Production', color: 'hollow' },
  ];
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: healthySummary(
      `${name} is healthy — no service-level events from AWS, spend is on track for the month.`,
      [
        'No action required — continue monitoring throttling rate ahead of the next promo.',
        'Confirm the IAM trust-policy review for the platform-infra role.',
      ]
    ),
    goldenSignals: [
      {
        id: 'latency',
        label: 'API success rate',
        value: 99.98,
        unit: '%',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(99.98, 0.01, 71),
        description: 'AWS API success rate across all services in this region.',
      },
      {
        id: 'errorRate',
        label: 'Throttling rate',
        value: 0.02,
        unit: '%',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(0.02, 0.005, 72),
        description: 'Percentage of AWS API calls that were throttled.',
      },
      {
        id: 'throughput',
        label: 'Spend MTD',
        value: 18420,
        unit: '$',
        delta: '+$420 vs budget',
        color: 'warning',
        trend: flatTrend(18000, 200, 73),
        description: 'Month-to-date spend across all services in this region.',
      },
    ],
    details: [
      { id: 'provider', label: 'Provider', value: 'AWS' },
      { id: 'region', label: 'Region', value: name },
      { id: 'accounts', label: 'Linked accounts', value: '3 (platform, payments, fraud)' },
      {
        id: 'services',
        label: 'Services tracked',
        value: 'EC2, EKS, RDS, S3, SQS, IAM, CloudWatch',
      },
    ],
    ownership: healthyOwnership('platform-cloud', '#cloud-platform', 'cloud-primary'),
    securityIssueCount: 0,
  };
  const metrics: MetricsTabData = {
    events: NO_EVENTS,
    goldenSignals: [
      {
        id: 'apiSuccess',
        label: 'API success rate',
        unit: '%',
        threshold: 99.5,
        description: 'AWS API success rate.',
        series: [series('api-success', 'Success %', flatTrend(99.98, 0.01, 74))],
      },
      {
        id: 'throttle',
        label: 'Throttling rate',
        unit: '%',
        threshold: 1,
        description: 'AWS API throttling rate.',
        series: [series('throttle', 'Throttle %', flatTrend(0.02, 0.005, 75))],
      },
      {
        id: 'spend',
        label: 'Spend MTD',
        unit: '$',
        description: 'Month-to-date spend.',
        series: [series('spend', 'Spend $', flatTrend(18000, 200, 76))],
      },
    ],
    otherMetrics: [
      {
        id: 'ec2',
        label: 'EC2 running instances',
        unit: '',
        description: 'Number of running EC2 instances.',
        series: [series('ec2', 'Instances', flatTrend(96, 1, 77))],
      },
      {
        id: 's3',
        label: 'S3 storage (TiB)',
        unit: 'TiB',
        description: 'Total S3 storage across linked accounts.',
        series: [series('s3', 'Storage', flatTrend(124, 1, 78))],
      },
    ],
  };
  const logs: LogRow[] = [
    log(
      'cl-1',
      `${today} @ 02:47:20.001`,
      'Info',
      'body.text',
      `CloudTrail: ec2.RunInstances by platform-infra (success)`
    ),
    log(
      'cl-2',
      `${today} @ 02:47:09.084`,
      'Info',
      'body.text',
      `CloudTrail: rds.DescribeDBInstances by platform-data (success)`
    ),
    log(
      'cl-3',
      `${today} @ 02:46:58.421`,
      'Info',
      'body.text',
      `CloudTrail: iam.CreateAccessKey by platform-cloud (success)`
    ),
    log(
      'cl-4',
      `${today} @ 02:46:41.012`,
      'Info',
      'body.text',
      `CloudTrail: s3.PutObject by ci-bot (success, 4.2 MB)`
    ),
  ];
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-cluster`,
      name: 'k8s-eu-prod',
      health: 'Healthy',
      entityType: 'kubernetes.cluster',
      relation: 'Hosts — EKS cluster',
    },
    {
      id: `${name}-rel-db`,
      name: 'payments-db',
      health: 'Healthy',
      entityType: 'database',
      relation: 'Hosts — RDS Postgres',
    },
    {
      id: `${name}-rel-mw`,
      name: 'kafka-payments',
      health: 'Healthy',
      entityType: 'middleware (kafka)',
      relation: 'Hosts — MSK',
    },
  ];
  const relationships: RelationshipsTabData = {
    topology: {
      focalHealth: 'Healthy',
      nodes: [
        { id: 'focal', label: name, focal: true },
        { id: 'cart', label: 'k8s-eu-prod' },
        { id: 'payment', label: 'payments-db' },
        { id: 'ad', label: 'kafka-payments' },
      ],
      edges: [
        { from: 'focal', to: 'cart', emphasized: true },
        { from: 'focal', to: 'payment' },
        { from: 'focal', to: 'ad' },
      ],
    },
    related,
  };
  return {
    overview,
    tabs: tabs(metrics, logs, noActiveAlerts(), relationships, lowSecurity([])),
  };
};

const buildMiddlewareTemplate = (
  name: string
): { overview: EntityOverview; tabs: EntityTabsData } => {
  const isRabbit = name.toLowerCase().includes('rabbit');
  const productLabel = isRabbit ? 'RabbitMQ' : 'Kafka';
  const tags: EntityTag[] = [
    { label: 'middleware', color: 'hollow' },
    { label: productLabel, color: 'hollow' },
    { label: 'Healthy', color: 'success' },
    { label: 'Production', color: 'hollow' },
  ];
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: healthySummary(
      `${name} is healthy — consumer lag under 200 messages, brokers all leading their partitions.`,
      [
        'Continue monitoring lag on the payments-events topic during peak hours.',
        'Verify retention policies are current on the next platform sync.',
      ]
    ),
    goldenSignals: [
      {
        id: 'latency',
        label: 'Messages / s',
        value: 2400,
        unit: '',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(2400, 80, 81),
        description: 'Messages produced per second across all topics.',
      },
      {
        id: 'errorRate',
        label: 'Consumer lag p95',
        value: 184,
        unit: '',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(184, 14, 82),
        description: 'p95 consumer lag across all groups.',
      },
      {
        id: 'throughput',
        label: 'Brokers',
        value: 5,
        unit: '/5',
        delta: 'All brokers up',
        color: 'success',
        trend: flatTrend(5, 0, 83),
        description: 'Number of brokers up out of total.',
      },
    ],
    details: [
      { id: 'product', label: 'Product', value: productLabel },
      { id: 'version', label: 'Version', value: isRabbit ? '3.12.13' : '3.6.1' },
      { id: 'brokers', label: 'Brokers', value: '5' },
      { id: 'topics', label: 'Topics', value: isRabbit ? '— (queues: 32)' : '48' },
      { id: 'partitions', label: 'Partitions', value: isRabbit ? '—' : '180' },
    ],
    ownership: healthyOwnership('platform-streaming', '#streaming-on-call', 'streaming-primary'),
    securityIssueCount: 1,
  };
  const metrics: MetricsTabData = {
    events: NO_EVENTS,
    goldenSignals: [
      {
        id: 'throughput',
        label: 'Messages / s',
        unit: '',
        description: 'Messages per second across all topics.',
        series: [series('msgs', 'Messages / s', flatTrend(2400, 80, 84))],
      },
      {
        id: 'lag',
        label: 'Consumer lag p95',
        unit: '',
        threshold: 1000,
        description: 'p95 consumer lag.',
        series: [series('lag', 'Lag', flatTrend(184, 14, 85))],
      },
      {
        id: 'brokers',
        label: 'Brokers up',
        unit: '',
        description: 'Number of brokers up.',
        series: [series('brokers', 'Brokers', flatTrend(5, 0, 86))],
      },
    ],
    otherMetrics: [
      {
        id: 'disk',
        label: 'Broker disk usage',
        unit: '%',
        description: 'Average broker disk usage.',
        series: [series('disk', 'Disk %', flatTrend(52, 1, 87))],
      },
      {
        id: 'netIn',
        label: 'Broker network in',
        unit: 'MB/s',
        description: 'Inbound network throughput per broker.',
        series: [series('net-in', 'Network in', flatTrend(34, 3, 88))],
      },
    ],
  };
  const logs: LogRow[] = [
    log(
      'mw-1',
      `${today} @ 02:47:20.001`,
      'Info',
      'body.text',
      `[Controller] Reassigned 3 partitions across brokers`
    ),
    log(
      'mw-2',
      `${today} @ 02:47:09.084`,
      'Info',
      'body.text',
      `[Group] Consumer group 'payments-worker' rebalanced (members=4)`
    ),
    log(
      'mw-3',
      `${today} @ 02:46:58.421`,
      'Info',
      'body.text',
      `[LocalLog] Rolled new log segment at offset 1895220`
    ),
  ];
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-producer`,
      name: 'payments-service',
      health: 'Healthy',
      entityType: 'apm.service',
      relation: 'Produces — payments-events topic',
    },
    {
      id: `${name}-rel-consumer`,
      name: 'fraud-service',
      health: 'Healthy',
      entityType: 'apm.service',
      relation: 'Consumes — payments-events topic',
    },
    {
      id: `${name}-rel-host`,
      name: 'host-eu-prod-02',
      health: 'Healthy',
      entityType: 'host',
      relation: 'Runs on — Bare-metal',
    },
  ];
  const relationships: RelationshipsTabData = {
    topology: {
      focalHealth: 'Healthy',
      nodes: [
        { id: 'focal', label: name, focal: true },
        { id: 'cart', label: 'payments-service' },
        { id: 'payment', label: 'fraud-service' },
        { id: 'ad', label: 'host-eu-prod-02' },
      ],
      edges: [
        { from: 'cart', to: 'focal', emphasized: true },
        { from: 'focal', to: 'payment', emphasized: true },
        { from: 'focal', to: 'ad' },
      ],
    },
    related,
  };
  const security = lowSecurity([
    {
      id: 'mw-cve-1',
      severity: 'Low',
      title: 'TLS client auth disabled on internal listener',
      detectedAt: 'May 2, 2026, 14:05',
      source: 'CSPM',
      status: 'Triaged',
    },
  ]);
  return { overview, tabs: tabs(metrics, logs, noActiveAlerts(), relationships, security) };
};

const buildLlmTemplate = (name: string): { overview: EntityOverview; tabs: EntityTabsData } => {
  const isClaude = name.toLowerCase().includes('claude');
  const provider = isClaude ? 'Anthropic' : 'OpenAI';
  const model = isClaude ? 'claude-3.5-sonnet' : 'gpt-4o-2024-05-13';
  const tags: EntityTag[] = [
    { label: 'llm', color: 'hollow' },
    { label: provider, color: 'hollow' },
    { label: 'Healthy', color: 'success' },
    { label: 'Production', color: 'hollow' },
  ];
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: healthySummary(
      `${name} is healthy — token usage within plan, p95 latency at 1.4 s, no rate-limit breaches.`,
      [
        'Continue monitoring token spend ahead of the next pricing review.',
        'Verify cache hit rate stays above 35% — current trend looks healthy.',
      ]
    ),
    goldenSignals: [
      {
        id: 'latency',
        label: 'p95 latency',
        value: 1.4,
        unit: 's',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(1.4, 0.1, 91),
        description: 'p95 LLM response latency.',
      },
      {
        id: 'errorRate',
        label: 'Tokens / min',
        value: 184000,
        unit: '',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(184000, 3000, 92),
        description: 'Tokens processed per minute.',
      },
      {
        id: 'throughput',
        label: 'Rate-limit usage',
        value: 38,
        unit: '%',
        delta: 'Stable in last 5 min',
        color: 'success',
        trend: flatTrend(38, 3, 93),
        description: 'Current rate-limit usage as a percentage of the per-minute quota.',
      },
    ],
    details: [
      { id: 'provider', label: 'Provider', value: provider },
      { id: 'model', label: 'Model', value: model },
      { id: 'integration', label: 'Integration', value: 'agent-builder + summaries pipeline' },
      { id: 'plan', label: 'Plan', value: 'Enterprise (1 M tokens / min)' },
      { id: 'spendMtd', label: 'Spend MTD', value: '$2,148' },
    ],
    ownership: healthyOwnership('platform-ai', '#platform-ai', 'ai-primary'),
    securityIssueCount: 0,
  };
  const metrics: MetricsTabData = {
    events: NO_EVENTS,
    goldenSignals: [
      {
        id: 'latency',
        label: 'p95 latency',
        unit: 's',
        threshold: 3,
        description: 'p95 LLM response latency.',
        series: [series('p95', 'p95 latency', flatTrend(1.4, 0.1, 94))],
      },
      {
        id: 'tpm',
        label: 'Tokens / min',
        unit: '',
        description: 'Tokens processed per minute.',
        series: [series('tpm', 'Tokens / min', flatTrend(184000, 3000, 95))],
      },
      {
        id: 'rateLimit',
        label: 'Rate-limit usage',
        unit: '%',
        threshold: 90,
        description: 'Current rate-limit usage.',
        series: [series('rate', 'Rate %', flatTrend(38, 3, 96))],
      },
    ],
    otherMetrics: [
      {
        id: 'cache',
        label: 'Cache hit rate',
        unit: '%',
        description: 'Prompt-cache hit rate.',
        series: [series('cache', 'Hit %', flatTrend(42, 3, 97))],
      },
      {
        id: 'spend',
        label: 'Spend rate',
        unit: '$/min',
        description: 'Spend per minute.',
        series: [series('spend', 'Spend / min', flatTrend(1.6, 0.1, 98))],
      },
    ],
  };
  const logs: LogRow[] = [
    log(
      'llm-1',
      `${today} @ 02:47:20.001`,
      'Info',
      'body.text',
      `[client] ${model} 200 — 1.31 s, 1820 tokens (cached: 612)`
    ),
    log(
      'llm-2',
      `${today} @ 02:47:09.084`,
      'Info',
      'body.text',
      `[client] ${model} 200 — 1.44 s, 2210 tokens`
    ),
    log(
      'llm-3',
      `${today} @ 02:46:58.421`,
      'Warning',
      'body.text',
      `[client] ${model} 429 — retrying after 612 ms`
    ),
    log(
      'llm-4',
      `${today} @ 02:46:41.012`,
      'Info',
      'body.text',
      `[client] ${model} 200 — 1.18 s, 980 tokens`
    ),
  ];
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-consumer-1`,
      name: 'summary-service',
      health: 'Healthy',
      entityType: 'apm.service',
      relation: 'Called by — incident summaries pipeline',
    },
    {
      id: `${name}-rel-consumer-2`,
      name: 'agent-builder',
      health: 'Healthy',
      entityType: 'apm.service',
      relation: 'Called by — agent flows',
    },
  ];
  const relationships: RelationshipsTabData = {
    topology: {
      focalHealth: 'Healthy',
      nodes: [
        { id: 'focal', label: name, focal: true },
        { id: 'cart', label: 'summary-service' },
        { id: 'payment', label: 'agent-builder' },
      ],
      edges: [
        { from: 'cart', to: 'focal', emphasized: true },
        { from: 'payment', to: 'focal', emphasized: true },
      ],
    },
    related,
  };
  return {
    overview,
    tabs: tabs(metrics, logs, noActiveAlerts(), relationships, lowSecurity([])),
  };
};

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Build a kind-shaped overview + tabs payload for a non-PayFlow entity. The
 * caller is expected to have resolved the entity's kind beforehand (via
 * {@link entityTypeToKind} or {@link inferEntityKind}); pass `undefined` to
 * fall back on the generic mock shape rendered upstream.
 */
export const buildKindTemplate = (
  entityName: string,
  kind: EntityKind | undefined
): { overview: EntityOverview; tabs: EntityTabsData } | undefined => {
  if (!kind) return undefined;
  switch (kind) {
    case 'service':
      return buildServiceTemplate(entityName);
    case 'host':
      return buildHostTemplate(entityName);
    case 'node':
      return buildNodeTemplate(entityName);
    case 'pod':
    case 'container':
    case 'deployment':
      return buildPodTemplate(entityName);
    case 'cluster':
      return buildClusterTemplate(entityName);
    case 'namespace':
      return buildNamespaceTemplate(entityName);
    case 'database':
      return buildDatabaseTemplate(entityName);
    case 'cloud':
      return buildCloudTemplate(entityName);
    case 'middleware':
      return buildMiddlewareTemplate(entityName);
    case 'llm':
      return buildLlmTemplate(entityName);
  }
};

// Keeps the linter happy — `commonOwnership` is exported for any caller that
// wants to override the per-template ownership without rebuilding the block.
export { commonOwnership };
