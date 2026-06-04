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
 * Two axes drive the rendered mock:
 *
 *   1. **Kind** — service / host / node / pod / cluster / namespace /
 *      database / cloud / middleware / llm. Resolved either from an
 *      explicit `entityType` hint (e.g. `'apm.service'`, `'K8s pod'`) via
 *      {@link entityTypeToKind}, or from the entity name via
 *      {@link inferEntityKind}.
 *   2. **Health variant** — healthy / at-risk / unhealthy. Resolved from an
 *      explicit `entityHealth` hint passed by the caller (the Streams "All
 *      entities" page knows `entity.health` from the dataset) via
 *      {@link normalizeEntityHealth}.
 *
 * Each kind exposes three narratives (one per health variant) that swap the
 * AI summary, the golden-signal colours / values / trend shapes, the alert
 * count, the security risk score, and a couple of dependency rows. The
 * shape (which metrics to surface, which dependencies to expect) stays
 * stable per kind, so the demo always looks like a credible
 * "service / pod / host" view — just with the appropriate severity layer
 * draped over it.
 */

import type {
  EntityAiSummary,
  EntityOverview,
  EntityTag,
  GoldenSignal,
  GoldenSignalLevel,
  OwnershipContact,
} from './fake_entity_overview';
import type {
  AlertRow,
  AlertsTabData,
  EntityTabsData,
  LogRow,
  LogSeverity,
  MetricEvent,
  MetricSeries,
  MetricsTabData,
  RelatedEntity,
  RelatedEntityHealth,
  RelationshipsTabData,
  SecurityIssue,
  SecurityTabData,
} from './fake_entity_tabs';
import { INCIDENT_DEPLOY_TIME_MS, INCIDENT_X_DOMAIN } from './time_domain';

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
// Health variant + helpers
// ---------------------------------------------------------------------------

export type EntityHealthVariant = 'healthy' | 'atRisk' | 'unhealthy';

/**
 * Normalise a free-form health string (Streams uses `'healthy' | 'atRisk' |
 * 'unhealthy'`, related-entity rows use `'Healthy' | 'At risk' |
 * 'Unhealthy'`, alerting backends sometimes ship `'critical' | 'warning' |
 * 'ok'`) to the canonical {@link EntityHealthVariant}. Defaults to `healthy`
 * so callers that don't pass anything get the happy-path template.
 */
export const normalizeEntityHealth = (input?: string): EntityHealthVariant => {
  const norm = (input ?? '').toLowerCase().replace(/[\s_-]/g, '');
  if (['unhealthy', 'critical', 'down', 'failed', 'error'].includes(norm)) return 'unhealthy';
  if (['atrisk', 'risk', 'warning', 'warn', 'degraded', 'pending'].includes(norm)) return 'atRisk';
  return 'healthy';
};

const pick = <T>(h: EntityHealthVariant, healthy: T, atRisk: T, unhealthy: T): T =>
  h === 'healthy' ? healthy : h === 'atRisk' ? atRisk : unhealthy;

const signalColor = (h: EntityHealthVariant): GoldenSignalLevel =>
  pick(h, 'success', 'warning', 'danger');

const relatedHealth = (h: EntityHealthVariant): RelatedEntityHealth =>
  pick(h, 'Healthy', 'At risk', 'Unhealthy');

const healthTag = (h: EntityHealthVariant): EntityTag => ({
  label: pick(h, 'Healthy', 'At risk', 'Unhealthy'),
  color: pick(h, 'success', 'warning', 'danger'),
});

const deltaCopy = (h: EntityHealthVariant): string =>
  pick(
    h,
    'Stable in last 5 min',
    'Trending up — +14% in last 5 min',
    'Spiked — +220% since deploy'
  );

// ---------------------------------------------------------------------------
// Type-label normalisers — keep the flyout header tags faithful to the
// dispatched entity's `.type` even when the dispatcher collapses several
// types into the same template body (e.g. `'K8s container'` and
// `'K8s deployment'` both reach `buildPodTemplate`).
// ---------------------------------------------------------------------------

/**
 * Returns the ECS-style kubernetes tag (`kubernetes.pod`,
 * `kubernetes.container`, `kubernetes.deployment`) for the dispatched
 * entity's `typeLabel`. Falls back to {@link defaultLabel} when the
 * caller didn't supply a recognisable typeLabel — keeps non-storyline
 * usage compatible with the previous hardcoded behaviour.
 */
const kubernetesTagFromTypeLabel = (
  typeLabel: string | undefined,
  defaultLabel: 'kubernetes.pod' | 'kubernetes.container' | 'kubernetes.deployment'
): string => {
  if (!typeLabel) return defaultLabel;
  const lower = typeLabel.toLowerCase();
  if (lower.includes('container')) return 'kubernetes.container';
  if (lower.includes('deployment')) return 'kubernetes.deployment';
  if (lower.includes('pod')) return 'kubernetes.pod';
  return defaultLabel;
};

/**
 * Returns the host sub-type tag (`Bare-metal`, `VM`, or whatever the
 * caller passes through verbatim) so a VM host no longer renders with
 * the `Bare-metal` tag. Defaults to `Bare-metal` when no typeLabel is
 * available — matches the historical behaviour for legacy callers.
 */
const hostSubTypeFromTypeLabel = (typeLabel: string | undefined): string => {
  if (!typeLabel) return 'Bare-metal';
  const lower = typeLabel.toLowerCase();
  if (lower.includes('vm')) return 'VM';
  if (lower.includes('bare')) return 'Bare-metal';
  return typeLabel;
};

/**
 * Returns the database engine tag verbatim (e.g. `'Postgres'`,
 * `'MySQL'`, `'MongoDB'`) so a non-Postgres engine no longer
 * misrenders as `Postgres`. Defaults to `Postgres` when no typeLabel
 * is provided — matches the historical behaviour for legacy callers.
 */
const databaseEngineFromTypeLabel = (typeLabel: string | undefined): string =>
  typeLabel && typeLabel.trim().length > 0 ? typeLabel : 'Postgres';

// ---------------------------------------------------------------------------
// Trend generators (24 points, aligned with INCIDENT_X_DOMAIN)
// ---------------------------------------------------------------------------

const flatTrend = (base: number, jitter: number, seed: number): number[] => {
  const out: number[] = [];
  for (let i = 0; i < 24; i++) {
    const wobble = Math.sin((i + seed) * 0.6) * jitter;
    out.push(Number((base + wobble).toFixed(3)));
  }
  return out;
};

const driftingTrend = (start: number, end: number, jitter: number, seed: number): number[] => {
  const out: number[] = [];
  for (let i = 0; i < 24; i++) {
    const t = i / 23;
    const value = start + (end - start) * t;
    const wobble = Math.sin((i + seed) * 0.6) * jitter;
    out.push(Number((value + wobble).toFixed(3)));
  }
  return out;
};

const spikingTrend = (base: number, peak: number, jitter: number, seed: number): number[] => {
  const DEPLOY = 16;
  const out: number[] = [];
  for (let i = 0; i < 24; i++) {
    let value: number;
    if (i < DEPLOY) {
      value = base;
    } else {
      const t = (i - DEPLOY) / (23 - DEPLOY);
      value = base + (peak - base) * (1 - Math.exp(-t * 2.2));
    }
    const wobble = Math.sin((i + seed) * 0.6) * jitter;
    out.push(Number((value + wobble).toFixed(3)));
  }
  return out;
};

const droppingTrend = (base: number, floor: number, jitter: number, seed: number): number[] => {
  const DEPLOY = 16;
  const out: number[] = [];
  for (let i = 0; i < 24; i++) {
    let value: number;
    if (i < DEPLOY) {
      value = base;
    } else {
      const t = (i - DEPLOY) / (23 - DEPLOY);
      value = base + (floor - base) * (1 - Math.exp(-t * 2.2));
    }
    const wobble = Math.sin((i + seed) * 0.6) * jitter;
    out.push(Number((value + wobble).toFixed(3)));
  }
  return out;
};

/**
 * Pick the right trend shape for the given health variant. Healthy entities
 * get a steady wobble around `base`. At-risk entities drift smoothly from
 * `base` toward two thirds of the way to `peak`. Unhealthy entities stay
 * flat at `base` until the deploy index (16) and then ramp asymptotically
 * toward `peak`. Pass `direction: 'down'` for inverted signals like
 * throughput / API success rate that *drop* on degradation.
 */
const trendFor = (
  h: EntityHealthVariant,
  base: number,
  peak: number,
  seed: number,
  direction: 'up' | 'down' = 'up'
): number[] => {
  const jitter = Math.max(Math.abs(base) * 0.025, 0.3);
  if (h === 'healthy') return flatTrend(base, jitter, seed);
  if (h === 'atRisk') {
    const driftTo = base + (peak - base) * 0.55;
    return driftingTrend(base, driftTo, jitter, seed);
  }
  return direction === 'down'
    ? droppingTrend(base, peak, jitter, seed)
    : spikingTrend(base, peak, jitter, seed);
};

// ---------------------------------------------------------------------------
// Common shared bits
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

const log = (
  id: string,
  timestamp: string,
  severity: LogSeverity,
  attribute: string,
  summary: string
): LogRow => ({ id, timestamp, severity, attribute, summary });

const today = 'Apr 14, 2026';

const healthyOwnership = (
  team: string,
  slack: string,
  pagerRotation: string
): OwnershipContact[] => [
  { id: 'team', label: 'Owning team', value: team },
  { id: 'slack', label: 'Slack channel', value: slack },
  { id: 'oncall', label: 'On-call rotation', value: `PagerDuty: ${pagerRotation}` },
];

const summaryFromNarrative = (
  h: EntityHealthVariant,
  narrative: Record<
    EntityHealthVariant,
    { headline: string; issues: string[]; nextSteps: string[] }
  >
): EntityAiSummary => ({
  headline: narrative[h].headline,
  issues: [...narrative[h].issues],
  nextSteps: [...narrative[h].nextSteps],
  generatedAt: `${today} @ 02:47:32`,
});

const eventsByHealth = (h: EntityHealthVariant): MetricEvent[] => {
  if (h === 'healthy') return [];
  if (h === 'atRisk')
    return [
      {
        x: INCIDENT_DEPLOY_TIME_MS,
        header: 'Deployment',
        details: 'New revision rolled out at this point — watch for drift over the next 10 min.',
      },
    ];
  return [
    {
      x: INCIDENT_DEPLOY_TIME_MS,
      header: 'Deployment',
      details: 'New revision rolled out at this point — corresponds with the post-deploy spike.',
    },
  ];
};

const alertsByHealth = (name: string, h: EntityHealthVariant, kind: EntityKind): AlertsTabData => {
  if (h === 'healthy') {
    return {
      activeCount: 0,
      totalCount: 0,
      overTime: INCIDENT_X_DOMAIN.map((x) => ({ x, y: 0 })),
      details: [],
    };
  }
  const rules = ALERT_RULES_BY_KIND[kind];
  const activeCount = h === 'atRisk' ? 1 : 5;
  const details: AlertRow[] = [];
  const triggeredTemplates = [
    `${today} @ 02:47:18.221`,
    `${today} @ 02:47:09.084`,
    `${today} @ 02:46:58.421`,
    `${today} @ 02:46:42.012`,
    `${today} @ 02:46:38.118`,
  ];
  for (let i = 0; i < activeCount; i++) {
    const rule = rules[i % rules.length];
    details.push({
      id: `alert-${i + 1}`,
      status: 'Active',
      triggeredAt: triggeredTemplates[i % triggeredTemplates.length],
      ruleName: rule.ruleName,
      reason: rule.reason(name),
    });
  }
  const peak = h === 'atRisk' ? 4 : 12;
  const overTime = INCIDENT_X_DOMAIN.map((x, i) => ({
    x,
    y: i < 16 ? 0 : Math.round((i - 15) * peak * 0.18),
  }));
  return {
    activeCount,
    totalCount: activeCount + (h === 'atRisk' ? 2 : 6),
    overTime,
    details,
  };
};

const ALERT_RULES_BY_KIND: Record<
  EntityKind,
  ReadonlyArray<{ ruleName: string; reason: (name: string) => string }>
> = {
  service: [
    { ruleName: 'Error rate SLO', reason: (n) => `Error rate above SLO target for ${n}` },
    { ruleName: 'p99 latency SLO', reason: (n) => `p99 latency above target for ${n}` },
    {
      ruleName: 'Throughput drop',
      reason: (n) => `Throughput dropped >40% vs 24 h baseline for ${n}`,
    },
    { ruleName: 'Saturation', reason: (n) => `CPU saturation across instances of ${n}` },
    {
      ruleName: 'Downstream errors',
      reason: (n) => `Downstream call failures correlated with ${n}`,
    },
  ],
  host: [
    { ruleName: '[Elastic] CPU pressure', reason: (n) => `CPU usage above 85% on ${n}` },
    { ruleName: '[Elastic] Disk pressure', reason: (n) => `Disk usage above 90% on ${n}` },
    { ruleName: '[Elastic] Memory pressure', reason: (n) => `Memory usage above 85% on ${n}` },
    { ruleName: 'Network errors', reason: (n) => `Network error rate above threshold on ${n}` },
    { ruleName: 'OOM killer', reason: (n) => `OOM killer triggered on ${n}` },
  ],
  node: [
    { ruleName: 'NodeMemoryPressure', reason: (n) => `MemoryPressure condition true on ${n}` },
    { ruleName: 'NodeDiskPressure', reason: (n) => `DiskPressure condition true on ${n}` },
    { ruleName: 'Pod scheduling failures', reason: (n) => `Pods failing to schedule on ${n}` },
    { ruleName: 'Kubelet unhealthy', reason: (n) => `Kubelet not reporting Ready on ${n}` },
    {
      ruleName: 'Container restarts',
      reason: (n) => `Container restart rate above threshold on ${n}`,
    },
  ],
  pod: [
    {
      ruleName: 'Container restarts',
      reason: (n) => `${n} has restarted 4 times in the last 10 min`,
    },
    { ruleName: 'Memory limit', reason: (n) => `Memory usage above 90% of limit on ${n}` },
    { ruleName: 'CPU throttling', reason: (n) => `CPU throttling rate above 30% on ${n}` },
    { ruleName: 'CrashLoopBackOff', reason: (n) => `${n} in CrashLoopBackOff` },
    { ruleName: 'Liveness probe failing', reason: (n) => `Liveness probe failing for ${n}` },
  ],
  container: [
    {
      ruleName: 'Container restarts',
      reason: (n) => `Container restart rate above threshold on ${n}`,
    },
    { ruleName: 'CPU throttling', reason: (n) => `CPU throttling rate above 30% on ${n}` },
    { ruleName: 'Memory limit', reason: (n) => `Memory usage above 90% of limit on ${n}` },
    { ruleName: 'OOM killed', reason: (n) => `Container OOM killed on ${n}` },
    { ruleName: 'Exit code != 0', reason: (n) => `Container exited with non-zero status on ${n}` },
  ],
  deployment: [
    {
      ruleName: 'Rollout stalled',
      reason: (n) => `Deployment ${n} rollout has stalled with replicas mismatched`,
    },
    {
      ruleName: 'Pod availability',
      reason: (n) => `Deployment ${n} availability below target`,
    },
    { ruleName: 'Image pull errors', reason: (n) => `Image pull errors for ${n}` },
    {
      ruleName: 'Container restarts',
      reason: (n) => `Restart rate above threshold across replicas of ${n}`,
    },
    {
      ruleName: 'Resource quota',
      reason: (n) => `Resource quota near limit for namespace hosting ${n}`,
    },
  ],
  cluster: [
    {
      ruleName: 'API server latency',
      reason: (n) => `kube-apiserver p99 latency elevated on ${n}`,
    },
    { ruleName: 'Nodes NotReady', reason: (n) => `Nodes NotReady on ${n}` },
    { ruleName: 'etcd latency', reason: (n) => `etcd write latency above threshold on ${n}` },
    {
      ruleName: 'Scheduling failures',
      reason: (n) => `Pods failing to schedule across ${n}`,
    },
    {
      ruleName: 'Control plane errors',
      reason: (n) => `Control plane error rate elevated on ${n}`,
    },
  ],
  namespace: [
    {
      ruleName: 'Pod restarts',
      reason: (n) => `Restart rate elevated across pods in namespace ${n}`,
    },
    { ruleName: 'Resource quota', reason: (n) => `CPU quota near limit in namespace ${n}` },
    {
      ruleName: 'Pending pods',
      reason: (n) => `Pods pending more than 5 min in namespace ${n}`,
    },
    { ruleName: 'Error budget', reason: (n) => `Error budget burning in namespace ${n}` },
    {
      ruleName: 'OOMKilled pods',
      reason: (n) => `OOMKilled events above threshold in namespace ${n}`,
    },
  ],
  database: [
    {
      ruleName: 'Query latency SLO',
      reason: (n) => `Query p99 latency above target on ${n}`,
    },
    { ruleName: 'Connection pool', reason: (n) => `Active connections above 90% of max on ${n}` },
    { ruleName: 'Replica lag', reason: (n) => `Replica lag above 5 s on ${n}` },
    { ruleName: 'Long-running query', reason: (n) => `Long-running query detected on ${n}` },
    { ruleName: 'Disk pressure', reason: (n) => `Disk usage above 85% on ${n}` },
  ],
  cloud: [
    {
      ruleName: 'API throttling',
      reason: (n) => `API throttling rate above 1% across ${n} services`,
    },
    { ruleName: 'Budget', reason: (n) => `Spend in ${n} above forecast` },
    {
      ruleName: 'Service event',
      reason: (n) => `AWS Health event affecting services in ${n}`,
    },
    {
      ruleName: 'Quota',
      reason: (n) => `Service quota above 90% in ${n} (EC2 vCPU)`,
    },
    { ruleName: 'Error 5xx', reason: (n) => `Elevated 5xx rate from AWS APIs in ${n}` },
  ],
  middleware: [
    {
      ruleName: 'Consumer lag',
      reason: (n) => `Consumer lag above 10 k on ${n} payments-events topic`,
    },
    { ruleName: 'Broker down', reason: (n) => `1 broker unreachable on ${n}` },
    { ruleName: 'Partition unbalance', reason: (n) => `Leader partitions unbalanced on ${n}` },
    {
      ruleName: 'Producer errors',
      reason: (n) => `Producer error rate above threshold on ${n}`,
    },
    { ruleName: 'Disk pressure', reason: (n) => `Broker disk usage above 85% on ${n}` },
  ],
  llm: [
    { ruleName: 'Rate-limit usage', reason: (n) => `Rate-limit usage above 90% on ${n}` },
    { ruleName: 'Latency p95 SLO', reason: (n) => `p95 latency above 3 s on ${n}` },
    { ruleName: 'Error rate', reason: (n) => `Error rate (4xx/5xx) above 2% on ${n}` },
    { ruleName: 'Spend budget', reason: (n) => `Daily spend above forecast on ${n}` },
    {
      ruleName: 'Prompt injection',
      reason: (n) => `Suspected prompt injection in last call on ${n}`,
    },
  ],
};

const securityIssueCount = (h: EntityHealthVariant, kind: EntityKind): number => {
  if (h === 'healthy') return BASE_SECURITY_COUNT[kind];
  if (h === 'atRisk') return BASE_SECURITY_COUNT[kind] + 1;
  return BASE_SECURITY_COUNT[kind] + 3;
};

const BASE_SECURITY_COUNT: Record<EntityKind, number> = {
  service: 1,
  host: 2,
  node: 1,
  pod: 1,
  container: 1,
  deployment: 1,
  cluster: 2,
  namespace: 0,
  database: 1,
  cloud: 0,
  middleware: 1,
  llm: 0,
};

const securityByHealth = (
  h: EntityHealthVariant,
  baseline: readonly SecurityIssue[],
  unhealthyExtras: readonly SecurityIssue[]
): SecurityTabData => {
  if (h === 'healthy') {
    return {
      riskScore: baseline.length === 0 ? 12 : 18,
      riskLevel: 'Low',
      lastEvent: baseline.length === 0 ? 'No security events' : '2 days ago',
      issues: [...baseline],
    };
  }
  if (h === 'atRisk') {
    return {
      riskScore: 48,
      riskLevel: 'Medium',
      lastEvent: '8 hours ago',
      issues: [...baseline, ...unhealthyExtras.slice(0, 1)],
    };
  }
  return {
    riskScore: 78,
    riskLevel: 'High',
    lastEvent: '32 minutes ago',
    issues: [...unhealthyExtras, ...baseline],
  };
};

const tabsOf = (
  metrics: MetricsTabData,
  logs: readonly LogRow[],
  alerts: AlertsTabData,
  relationships: RelationshipsTabData,
  security: SecurityTabData
): EntityTabsData => ({ metrics, logs, alerts, relationships, security });

// ---------------------------------------------------------------------------
// Per-kind templates
// ---------------------------------------------------------------------------

const buildServiceTemplate = (
  name: string,
  h: EntityHealthVariant
): { overview: EntityOverview; tabs: EntityTabsData } => {
  const tags: EntityTag[] = [
    { label: 'apm.service', color: 'hollow' },
    healthTag(h),
    { label: 'Production', color: 'hollow' },
  ];
  const narrative = {
    healthy: {
      headline: `${name} is healthy — error rate, latency, and throughput are all within SLO.`,
      issues: [],
      nextSteps: [
        'Continue monitoring — no action required.',
        `Compare ${name} dependencies against the current rollout in case adjacent services degrade.`,
      ],
    },
    atRisk: {
      headline: `${name} is trending toward error-budget exhaustion — p99 latency and error rate have been drifting upward since the last deploy.`,
      issues: [
        'p99 latency drifting from 140 ms toward 360 ms over the last 10 min',
        'Error rate at 1.8% — climbing 0.2%/min',
      ],
      nextSteps: [
        `Inspect the latest deploy of ${name} for slow new endpoints or N+1 queries.`,
        'Verify downstream db / cache p99 hasn\u2019t regressed in parallel.',
      ],
    },
    unhealthy: {
      headline: `${name} is unhealthy — error rate spiked to 9.4% and p99 latency jumped to 2.3 s right after the latest deploy.`,
      issues: [
        'Error rate spiked from 0.4% to 9.4% within 90 s of the deploy',
        'p99 latency jumped from 140 ms to 2.3 s — sustained',
        'Throughput dropped 38% (320 → 200 req/s) — clients are timing out',
      ],
      nextSteps: [
        `Rollback the latest revision of ${name} or feature-flag-off the offending endpoint.`,
        'Page the on-call rotation and notify the checkout-platform channel.',
        'Mitigate by capacity-scaling the dependency saturation pulled in by the new release.',
      ],
    },
  };
  const goldenSignals: GoldenSignal[] = [
    {
      id: 'latency',
      label: 'p99 latency',
      value: pick(h, 0.14, 0.36, 2.3),
      unit: 's',
      delta: deltaCopy(h),
      color: signalColor(h),
      trend: trendFor(h, 0.14, 2.3, 1),
      description: 'p99 end-to-end latency across all instances of this service.',
    },
    {
      id: 'errorRate',
      label: 'Error rate',
      value: pick(h, 0.4, 1.8, 9.4),
      unit: '%',
      delta: deltaCopy(h),
      color: signalColor(h),
      trend: trendFor(h, 0.4, 9.4, 2),
      description: 'Percentage of failed requests (status >= 500 or trace error tag).',
    },
    {
      id: 'throughput',
      label: 'Throughput',
      value: pick(h, 320, 304, 198),
      unit: 'req/s',
      delta: pick(h, 'Stable in last 5 min', 'Slight drop', 'Dropped 38% since deploy'),
      color: pick<GoldenSignalLevel>(h, 'success', 'warning', 'danger'),
      trend: trendFor(h, 320, 198, 3, 'down'),
      description: 'Requests per second served across all instances of this service.',
    },
  ];
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:31`,
    tags,
    summary: summaryFromNarrative(h, narrative),
    goldenSignals,
    details: [
      { id: 'serviceName', label: 'Service name', value: name },
      { id: 'environment', label: 'Environment', value: 'production' },
      { id: 'language', label: 'Runtime', value: 'Node.js 20.11.1' },
      { id: 'version', label: 'Version', value: 'v1.8.2' },
      { id: 'instances', label: 'Running instances', value: '6 pods' },
    ],
    ownership: healthyOwnership('platform-team', '#platform-on-call', 'platform-primary'),
    securityIssueCount: securityIssueCount(h, 'service'),
  };
  const metrics: MetricsTabData = {
    events: eventsByHealth(h),
    goldenSignals: [
      {
        id: 'latency',
        label: 'Latency',
        unit: 's',
        threshold: 0.5,
        description: 'p99 end-to-end request latency.',
        series: [series('p99', 'p99 latency', trendFor(h, 0.14, 2.3, 4))],
      },
      {
        id: 'errorRate',
        label: 'Error rate',
        unit: '%',
        threshold: 5,
        description: 'Percentage of failed requests.',
        series: [series('error-rate', 'Error rate', trendFor(h, 0.4, 9.4, 5))],
      },
      {
        id: 'throughput',
        label: 'Throughput',
        unit: 'req/s',
        description: 'Requests per second served by this service.',
        series: [series('rps', 'Requests / s', trendFor(h, 320, 198, 6, 'down'))],
      },
    ],
    otherMetrics: [
      {
        id: 'cpu',
        label: 'CPU usage',
        unit: '%',
        description: 'Average CPU usage across instances.',
        series: [series('cpu', 'CPU %', trendFor(h, 38, 86, 7))],
      },
      {
        id: 'memory',
        label: 'Memory usage',
        unit: '%',
        description: 'Average memory usage across instances.',
        series: [series('memory', 'Memory %', trendFor(h, 54, 82, 8))],
      },
    ],
  };
  const logs: LogRow[] = pick<LogRow[]>(
    h,
    [
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
    ],
    [
      log(
        's-1',
        `${today} @ 02:47:18.221`,
        'Warning',
        'body.text',
        `[HTTP] POST /v1/${name} 200 in 312ms`
      ),
      log(
        's-2',
        `${today} @ 02:47:09.084`,
        'Warning',
        'body.text',
        `[DB] Slow query: SELECT * FROM orders … (412ms)`
      ),
      log(
        's-3',
        `${today} @ 02:46:58.421`,
        'Info',
        'body.text',
        `[Worker] Processed batch of 64 events`
      ),
      log('s-4', `${today} @ 02:46:41.012`, 'Info', 'body.text', `[Deploy] v1.8.2 rolled out`),
      log(
        's-5',
        `${today} @ 02:46:28.118`,
        'Info',
        'body.text',
        `[Auth] Issued JWT for user_id=4711`
      ),
    ],
    [
      log(
        's-1',
        `${today} @ 02:47:18.221`,
        'Error',
        'body.text',
        `[HTTP] POST /v1/${name} 500 in 2412ms`
      ),
      log(
        's-2',
        `${today} @ 02:47:09.084`,
        'Error',
        'body.text',
        `[DB] connection-pool exhausted (max=200)`
      ),
      log(
        's-3',
        `${today} @ 02:46:58.421`,
        'Warning',
        'body.text',
        `[Retry] Upstream gave 503 — retrying (attempt 3/5)`
      ),
      log('s-4', `${today} @ 02:46:41.012`, 'Info', 'body.text', `[Deploy] v1.8.2 rolled out`),
      log(
        's-5',
        `${today} @ 02:46:28.118`,
        'Info',
        'body.text',
        `[Auth] Issued JWT for user_id=4711`
      ),
    ]
  );
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-pod-1`,
      name: `${name}-pod-1`,
      health: relatedHealth(h),
      entityType: 'kubernetes.pod',
      relation: pick(
        h,
        'Runs on — healthy, 42% memory',
        'Runs on — 71% memory',
        'Runs on — 92% memory, restarting'
      ),
    },
    {
      id: `${name}-rel-pod-2`,
      name: `${name}-pod-2`,
      health: pick<RelatedEntityHealth>(h, 'Healthy', 'Healthy', 'At risk'),
      entityType: 'kubernetes.pod',
      relation: 'Runs on — 38% memory',
    },
    {
      id: `${name}-rel-db`,
      name: 'orders-db',
      health: pick<RelatedEntityHealth>(h, 'Healthy', 'Healthy', 'At risk'),
      entityType: 'database (postgresql)',
      relation: pick(h, 'Calls — 4 ms', 'Calls — 18 ms', 'Calls — 412 ms (slow queries)'),
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
      focalHealth: relatedHealth(h),
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
  const security = securityByHealth(
    h,
    [
      {
        id: 's-cve-1',
        severity: 'Low',
        title: 'Outdated transitive dependency lodash@4.17.20 (CVE-2026-09127)',
        detectedAt: 'May 1, 2026, 08:30',
        source: 'Vulnerabilities',
        status: 'Triaged',
      },
    ],
    [
      {
        id: 's-cve-h1',
        severity: 'High',
        title: `Privileged container detected for ${name}`,
        detectedAt: `${today} @ 02:46:58`,
        source: 'CSPM',
        status: 'Open',
      },
      {
        id: 's-cve-h2',
        severity: 'Medium',
        title: 'Outbound call to unverified IP 185.220.101.42',
        detectedAt: `${today} @ 02:47:02`,
        source: 'Detections',
        status: 'Open',
      },
      {
        id: 's-cve-h3',
        severity: 'Medium',
        title: 'Secret rotated more than 90 days ago',
        detectedAt: 'May 4, 2026, 22:18',
        source: 'CSPM',
        status: 'Open',
      },
    ]
  );
  return {
    overview,
    tabs: tabsOf(metrics, logs, alertsByHealth(name, h, 'service'), relationships, security),
  };
};

const buildHostTemplate = (
  name: string,
  h: EntityHealthVariant,
  typeLabel?: string
): { overview: EntityOverview; tabs: EntityTabsData } => {
  // VM vs Bare-metal: the host category dispatches both sub-types to
  // this builder, so derive the secondary tag from the entity's
  // typeLabel instead of hard-coding "Bare-metal".
  const tags: EntityTag[] = [
    { label: 'Host', color: 'hollow' },
    { label: hostSubTypeFromTypeLabel(typeLabel), color: 'hollow' },
    healthTag(h),
    { label: 'Production', color: 'hollow' },
  ];
  const narrative = {
    healthy: {
      headline: `${name} is healthy — CPU, memory, and disk are all well below alerting thresholds.`,
      issues: [],
      nextSteps: [
        'No action required — continue monitoring resource trends.',
        'Confirm the most recent kernel patch landed on the next maintenance window.',
      ],
    },
    atRisk: {
      headline: `${name} is at risk — memory and CPU are drifting upward, headroom dropping fast.`,
      issues: [
        'Memory usage at 78% — trending up since 02:42',
        'CPU usage 71% — sustained over the last 8 min',
      ],
      nextSteps: [
        `Cordon ${name} if memory crosses 85% and start draining.`,
        'Investigate the heaviest workloads on the host (top 3 pods by memory).',
      ],
    },
    unhealthy: {
      headline: `${name} is unhealthy — memory pinned at 94% and CPU saturated, OOM-killer engaged twice in the last 5 min.`,
      issues: [
        'Memory at 94% of 128 GB — sustained',
        'CPU saturated at 98% across all cores',
        'OOM-killer terminated 2 containers in the last 5 min',
      ],
      nextSteps: [
        `Cordon ${name} and drain workloads to neighbouring hosts.`,
        'Page the on-call infra rotation.',
        'Open a ticket for capacity expansion if hot-host pattern persists.',
      ],
    },
  };
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: summaryFromNarrative(h, narrative),
    goldenSignals: [
      {
        id: 'latency',
        label: 'CPU',
        value: pick(h, 42, 71, 98),
        unit: '%',
        delta: deltaCopy(h),
        color: signalColor(h),
        trend: trendFor(h, 42, 98, 11),
        description: 'Average CPU utilization across all cores on this host.',
      },
      {
        id: 'errorRate',
        label: 'Memory',
        value: pick(h, 58, 78, 94),
        unit: '%',
        delta: deltaCopy(h),
        color: signalColor(h),
        trend: trendFor(h, 58, 94, 12),
        description: 'Memory used as a percentage of total physical memory.',
      },
      {
        id: 'throughput',
        label: 'Disk used',
        value: pick(h, 31, 38, 47),
        unit: '%',
        delta: pick(h, 'Stable in last 5 min', 'Slow climb', 'Climbing — +12% in last 1 h'),
        color: pick<GoldenSignalLevel>(h, 'success', 'warning', 'warning'),
        trend: trendFor(h, 31, 47, 13),
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
    securityIssueCount: securityIssueCount(h, 'host'),
  };
  const metrics: MetricsTabData = {
    events: eventsByHealth(h),
    goldenSignals: [
      {
        id: 'cpu',
        label: 'CPU usage',
        unit: '%',
        threshold: 85,
        description: 'Average CPU usage across cores.',
        series: [series('cpu', 'CPU %', trendFor(h, 42, 98, 14))],
      },
      {
        id: 'memory',
        label: 'Memory usage',
        unit: '%',
        threshold: 85,
        description: 'Memory used / total memory.',
        series: [series('memory', 'Memory %', trendFor(h, 58, 94, 15))],
      },
      {
        id: 'disk',
        label: 'Disk usage',
        unit: '%',
        threshold: 90,
        description: 'Root filesystem usage.',
        series: [series('disk', 'Disk %', trendFor(h, 31, 47, 16))],
      },
    ],
    otherMetrics: [
      {
        id: 'netIn',
        label: 'Network in',
        unit: 'MB/s',
        description: 'Inbound network throughput.',
        series: [series('net-in', 'Network in', trendFor(h, 48, 92, 17))],
      },
      {
        id: 'netOut',
        label: 'Network out',
        unit: 'MB/s',
        description: 'Outbound network throughput.',
        series: [series('net-out', 'Network out', trendFor(h, 52, 88, 18))],
      },
    ],
  };
  const logs: LogRow[] = pick<LogRow[]>(
    h,
    [
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
    ],
    [
      log(
        'h-1',
        `${today} @ 02:47:20.001`,
        'Warning',
        'body.text',
        `kernel: TCP: time wait bucket table overflow`
      ),
      log(
        'h-2',
        `${today} @ 02:47:12.084`,
        'Warning',
        'body.text',
        `kubelet[1112]: eviction manager: attempting to reclaim memory`
      ),
      log(
        'h-3',
        `${today} @ 02:46:58.421`,
        'Info',
        'body.text',
        `systemd[1]: Started Daily apt download activities`
      ),
      log(
        'h-4',
        `${today} @ 02:46:41.012`,
        'Info',
        'body.text',
        `sshd[8821]: Accepted publickey for sre from 10.32.0.4`
      ),
    ],
    [
      log(
        'h-1',
        `${today} @ 02:47:20.001`,
        'Error',
        'body.text',
        `kernel: Out of memory: Killed process 9421 (node) total-vm:4194304kB`
      ),
      log(
        'h-2',
        `${today} @ 02:47:12.084`,
        'Error',
        'body.text',
        `kubelet[1112]: eviction manager: pods evicted because of NodeMemoryPressure`
      ),
      log(
        'h-3',
        `${today} @ 02:46:58.421`,
        'Warning',
        'body.text',
        `kernel: TCP: time wait bucket table overflow`
      ),
      log(
        'h-4',
        `${today} @ 02:46:41.012`,
        'Info',
        'body.text',
        `systemd[1]: Reached target Graphical Interface`
      ),
    ]
  );
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-pod-a`,
      name: 'payments-pod-3ac1f',
      health: relatedHealth(h),
      entityType: 'kubernetes.pod',
      relation: pick(
        h,
        'Hosts — namespace payments',
        'Hosts — namespace payments (memory pressure)',
        'Hosts — namespace payments (OOMKilled 1×)'
      ),
    },
    {
      id: `${name}-rel-pod-b`,
      name: 'fraud-pod-9a1c',
      health: pick<RelatedEntityHealth>(h, 'Healthy', 'Healthy', 'At risk'),
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
      focalHealth: relatedHealth(h),
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
  const security = securityByHealth(
    h,
    [
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
    ],
    [
      {
        id: 'h-cve-h1',
        severity: 'High',
        title: 'Kernel CVE-2026-00821 affects current kernel version',
        detectedAt: 'May 6, 2026, 08:30',
        source: 'Vulnerabilities',
        status: 'Open',
      },
      {
        id: 'h-cve-h2',
        severity: 'High',
        title: `SSH brute-force attempt against ${name} (43 failed logins)`,
        detectedAt: `${today} @ 02:47:00`,
        source: 'Detections',
        status: 'Open',
      },
    ]
  );
  return {
    overview,
    tabs: tabsOf(metrics, logs, alertsByHealth(name, h, 'host'), relationships, security),
  };
};

const buildNodeTemplate = (
  name: string,
  h: EntityHealthVariant
): { overview: EntityOverview; tabs: EntityTabsData } => {
  // Leading `Kubernetes` tag matches the {category} + {sub-type}
  // shape used by every other multi-type kind (Host + Bare-metal,
  // database + Postgres, cloud + AWS EC2 Instance, …).
  const tags: EntityTag[] = [
    { label: 'Kubernetes', color: 'hollow' },
    { label: 'kubernetes.node', color: 'hollow' },
    healthTag(h),
    { label: 'Production', color: 'hollow' },
  ];
  const narrative = {
    healthy: {
      headline: `${name} is healthy — 22 pods scheduled, memory at 41% of allocatable.`,
      issues: [],
      nextSteps: [
        'Continue monitoring scheduler pressure ahead of the next deploy wave.',
        'Verify NodeMemoryPressure stays false — current trend is well below threshold.',
      ],
    },
    atRisk: {
      headline: `${name} is at risk — memory pressure rising, 4 pods pending scheduling.`,
      issues: [
        'Memory at 76% of allocatable — climbing since 02:42',
        '4 pods stuck in Pending — scheduler unable to place',
      ],
      nextSteps: [
        `Investigate the largest workloads on ${name}.`,
        'Consider draining if memory crosses 85%.',
      ],
    },
    unhealthy: {
      headline: `${name} is unhealthy — NodeMemoryPressure true, kubelet evicting pods.`,
      issues: [
        'NodeMemoryPressure condition true',
        'Kubelet evicted 6 pods in the last 5 min',
        'Container restart rate spiked to 12/min',
      ],
      nextSteps: [
        `Cordon ${name} and drain remaining workloads.`,
        'Page the on-call infra rotation.',
        'Investigate ImagePull errors blocking rescheduling.',
      ],
    },
  };
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: summaryFromNarrative(h, narrative),
    goldenSignals: [
      {
        id: 'latency',
        label: 'CPU',
        value: pick(h, 38, 64, 92),
        unit: '%',
        delta: deltaCopy(h),
        color: signalColor(h),
        trend: trendFor(h, 38, 92, 21),
        description: 'Average CPU usage on this node.',
      },
      {
        id: 'errorRate',
        label: 'Memory',
        value: pick(h, 41, 76, 96),
        unit: '%',
        delta: deltaCopy(h),
        color: signalColor(h),
        trend: trendFor(h, 41, 96, 22),
        description: 'Memory used as a percentage of allocatable.',
      },
      {
        id: 'throughput',
        label: 'Pods',
        value: pick(h, 22, 22, 14),
        unit: '',
        delta: pick(h, 'Stable in last 5 min', '4 pending', 'Evicted 6 in last 5 min'),
        color: pick<GoldenSignalLevel>(h, 'success', 'warning', 'danger'),
        trend: trendFor(h, 22, 14, 23, 'down'),
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
    securityIssueCount: securityIssueCount(h, 'node'),
  };
  const metrics: MetricsTabData = {
    events: eventsByHealth(h),
    goldenSignals: [
      {
        id: 'cpu',
        label: 'CPU usage',
        unit: '%',
        threshold: 85,
        description: 'CPU usage on this node.',
        series: [series('cpu', 'CPU %', trendFor(h, 38, 92, 24))],
      },
      {
        id: 'memory',
        label: 'Memory usage',
        unit: '%',
        threshold: 85,
        description: 'Memory used / allocatable.',
        series: [series('memory', 'Memory %', trendFor(h, 41, 96, 25))],
      },
      {
        id: 'pods',
        label: 'Scheduled pods',
        unit: '',
        description: 'Number of pods scheduled to this node.',
        series: [series('pods', 'Pods', trendFor(h, 22, 14, 26, 'down'))],
      },
    ],
    otherMetrics: [
      {
        id: 'restarts',
        label: 'Container restarts',
        unit: '',
        description: 'Container restart count across this node.',
        series: [series('restarts', 'Restarts', trendFor(h, 0.4, 12, 27))],
      },
      {
        id: 'netIn',
        label: 'Network in',
        unit: 'MB/s',
        description: 'Inbound network throughput.',
        series: [series('net-in', 'Network in', trendFor(h, 34, 78, 28))],
      },
    ],
  };
  const logs: LogRow[] = pick<LogRow[]>(
    h,
    [
      log(
        'n-1',
        `${today} @ 02:47:20.001`,
        'Info',
        'body.text',
        `kubelet: NodeReady condition true`
      ),
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
    ],
    [
      log(
        'n-1',
        `${today} @ 02:47:20.001`,
        'Warning',
        'body.text',
        `kubelet: NodeMemoryPressure: 76% of allocatable`
      ),
      log(
        'n-2',
        `${today} @ 02:47:09.084`,
        'Warning',
        'body.text',
        `scheduler: 4 pods Unschedulable on ${name} (Insufficient memory)`
      ),
      log(
        'n-3',
        `${today} @ 02:46:58.421`,
        'Info',
        'body.text',
        `kubelet: Pulled image registry/checkout-service:v1.8.2`
      ),
    ],
    [
      log(
        'n-1',
        `${today} @ 02:47:20.001`,
        'Error',
        'body.text',
        `kubelet: NodeMemoryPressure condition true — evicting 3 pods`
      ),
      log(
        'n-2',
        `${today} @ 02:47:09.084`,
        'Error',
        'body.text',
        `kubelet: ImagePull error: failed to pull registry/payments-service:v1.8.2`
      ),
      log(
        'n-3',
        `${today} @ 02:46:58.421`,
        'Warning',
        'body.text',
        `scheduler: Pods Unschedulable on ${name} (Insufficient memory)`
      ),
      log(
        'n-4',
        `${today} @ 02:46:41.012`,
        'Info',
        'body.text',
        `kubelet: scheduled pod default/checkout-pod-1f2a`
      ),
    ]
  );
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-pod-a`,
      name: 'payments-pod-3ac1f',
      health: relatedHealth(h),
      entityType: 'kubernetes.pod',
      relation: pick(
        h,
        'Pods — payments namespace, 38% memory',
        'Pods — payments namespace, 74% memory',
        'Pods — payments namespace, evicted'
      ),
    },
    {
      id: `${name}-rel-pod-b`,
      name: 'fraud-pod-9a1c',
      health: pick<RelatedEntityHealth>(h, 'Healthy', 'Healthy', 'At risk'),
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
      focalHealth: relatedHealth(h),
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
  const security = securityByHealth(
    h,
    [
      {
        id: 'n-cve-1',
        severity: 'Low',
        title: 'containerd 1.7.13 has a known low-severity advisory',
        detectedAt: 'May 1, 2026, 08:30',
        source: 'CSPM',
        status: 'Suppressed',
      },
    ],
    [
      {
        id: 'n-cve-h1',
        severity: 'High',
        title: `Kubelet credentials potentially exposed on ${name}`,
        detectedAt: `${today} @ 02:46:55`,
        source: 'Detections',
        status: 'Open',
      },
      {
        id: 'n-cve-h2',
        severity: 'Medium',
        title: 'NetworkPolicy not enforced on this node',
        detectedAt: 'May 4, 2026, 22:18',
        source: 'CSPM',
        status: 'Open',
      },
    ]
  );
  return {
    overview,
    tabs: tabsOf(metrics, logs, alertsByHealth(name, h, 'node'), relationships, security),
  };
};

const buildPodTemplate = (
  name: string,
  h: EntityHealthVariant,
  typeLabel?: string
): { overview: EntityOverview; tabs: EntityTabsData } => {
  // Pod / container / deployment share this builder (they're all
  // workload-shaped — same metrics, same narrative shape). The
  // dispatcher forwards the dataset's typeLabel so the header tag
  // still reads correctly (`kubernetes.container` for a container,
  // `kubernetes.deployment` for a deployment) instead of always
  // claiming "kubernetes.pod". The leading `Kubernetes` tag follows
  // the {category} + {sub-type} convention used by every other
  // multi-type kind (Host + Bare-metal, cloud + AWS EC2 Instance,
  // database + Postgres, …).
  const tags: EntityTag[] = [
    { label: 'Kubernetes', color: 'hollow' },
    { label: kubernetesTagFromTypeLabel(typeLabel, 'kubernetes.pod'), color: 'hollow' },
    healthTag(h),
    { label: 'Production', color: 'hollow' },
  ];
  const narrative = {
    healthy: {
      headline: `${name} is healthy — running steady on node-prod-eu-04 for the last 4 days.`,
      issues: [],
      nextSteps: [
        'No action required.',
        'Compare resource usage against the deployment template if a memory increase shows up after the next release.',
      ],
    },
    atRisk: {
      headline: `${name} is at risk — memory creeping toward the limit, latency drifting up since deploy.`,
      issues: [
        'Memory at 78% of pod limit — climbing steadily',
        'p99 latency drifting upward over the last 10 min',
      ],
      nextSteps: [
        `Investigate the latest revision running in ${name} for a memory leak.`,
        'Verify the deployment\u2019s memory limit is sized correctly.',
      ],
    },
    unhealthy: {
      headline: `${name} is unhealthy — CrashLoopBackOff after the latest deploy, restarted 4 times in 10 min.`,
      issues: [
        'CrashLoopBackOff after 4 restarts in 10 min',
        'Memory exceeded limit — OOMKilled twice',
        'Liveness probe failing immediately on container start',
      ],
      nextSteps: [
        `Rollback the deployment hosting ${name} or pin to the previous image.`,
        'Examine the OOMKilled container logs for the root cause.',
        'Page the owning team if the rollback doesn\u2019t stabilise within 5 min.',
      ],
    },
  };
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: summaryFromNarrative(h, narrative),
    goldenSignals: [
      {
        id: 'latency',
        label: 'CPU',
        value: pick(h, 12, 38, 84),
        unit: '%',
        delta: deltaCopy(h),
        color: signalColor(h),
        trend: trendFor(h, 12, 84, 31),
        description: 'CPU usage relative to the pod resource request.',
      },
      {
        id: 'errorRate',
        label: 'Memory',
        value: pick(h, 41, 78, 96),
        unit: '%',
        delta: deltaCopy(h),
        color: signalColor(h),
        trend: trendFor(h, 41, 96, 32),
        description: 'Memory used as a percentage of the pod limit.',
      },
      {
        id: 'throughput',
        label: 'Restarts',
        value: pick(h, 0, 0, 4),
        unit: '',
        delta: pick(h, 'No restarts in last 24 h', '0 in last 1 h', '4 restarts in last 10 min'),
        color: pick<GoldenSignalLevel>(h, 'success', 'success', 'danger'),
        trend: trendFor(h, 0, 4, 33),
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
    securityIssueCount: securityIssueCount(h, 'pod'),
  };
  const metrics: MetricsTabData = {
    events: eventsByHealth(h),
    goldenSignals: [
      {
        id: 'cpu',
        label: 'CPU usage',
        unit: '%',
        threshold: 85,
        description: 'CPU usage on this pod.',
        series: [series('cpu', 'CPU %', trendFor(h, 12, 84, 34))],
      },
      {
        id: 'memory',
        label: 'Memory usage',
        unit: '%',
        threshold: 85,
        description: 'Memory used / limit.',
        series: [series('memory', 'Memory %', trendFor(h, 41, 96, 35))],
      },
      {
        id: 'restarts',
        label: 'Container restarts',
        unit: '',
        description: 'Container restart count.',
        series: [series('restarts', 'Restarts', trendFor(h, 0, 4, 36))],
      },
    ],
    otherMetrics: [
      {
        id: 'netIn',
        label: 'Network in',
        unit: 'KB/s',
        description: 'Inbound network throughput.',
        series: [series('net-in', 'Network in', trendFor(h, 180, 90, 37, 'down'))],
      },
      {
        id: 'netOut',
        label: 'Network out',
        unit: 'KB/s',
        description: 'Outbound network throughput.',
        series: [series('net-out', 'Network out', trendFor(h, 220, 110, 38, 'down'))],
      },
    ],
  };
  const logs: LogRow[] = pick<LogRow[]>(
    h,
    [
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
    ],
    [
      log(
        'p-1',
        `${today} @ 02:47:20.001`,
        'Warning',
        'body.text',
        `Liveness probe took 412 ms (threshold 250 ms)`
      ),
      log(
        'p-2',
        `${today} @ 02:47:09.084`,
        'Warning',
        'body.text',
        `Memory usage 78% of limit (rising)`
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
    ],
    [
      log(
        'p-1',
        `${today} @ 02:47:20.001`,
        'Error',
        'body.text',
        `kubelet: Back-off restarting failed container (4 restarts)`
      ),
      log(
        'p-2',
        `${today} @ 02:47:09.084`,
        'Error',
        'body.text',
        `OOMKilled — memory usage 96% of limit`
      ),
      log(
        'p-3',
        `${today} @ 02:46:58.421`,
        'Error',
        'body.text',
        `Liveness probe failed: HTTP 503`
      ),
      log(
        'p-4',
        `${today} @ 02:46:41.012`,
        'Info',
        'body.text',
        `kubelet: Pulled image registry/payments-service:v1.8.2`
      ),
    ]
  );
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-node`,
      name: 'node-prod-eu-04',
      health: pick<RelatedEntityHealth>(h, 'Healthy', 'At risk', 'At risk'),
      entityType: 'kubernetes.node',
      relation: pick(
        h,
        'Runs on — node memory 41%',
        'Runs on — node memory 74%',
        'Runs on — node memory 88%'
      ),
    },
    {
      id: `${name}-rel-service`,
      name: 'payments-service',
      health: relatedHealth(h),
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
      focalHealth: relatedHealth(h),
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
  const security = securityByHealth(
    h,
    [
      {
        id: 'p-cve-1',
        severity: 'Low',
        title: 'Base image distroless/cc:nonroot has a low-severity glibc advisory',
        detectedAt: 'May 1, 2026, 08:30',
        source: 'Vulnerabilities',
        status: 'Triaged',
      },
    ],
    [
      {
        id: 'p-cve-h1',
        severity: 'High',
        title: `Container in ${name} running as root after the latest deploy`,
        detectedAt: `${today} @ 02:46:55`,
        source: 'CSPM',
        status: 'Open',
      },
      {
        id: 'p-cve-h2',
        severity: 'Medium',
        title: 'New container image not yet scanned by the registry pipeline',
        detectedAt: `${today} @ 02:46:42`,
        source: 'Vulnerabilities',
        status: 'Open',
      },
    ]
  );
  return {
    overview,
    tabs: tabsOf(metrics, logs, alertsByHealth(name, h, 'pod'), relationships, security),
  };
};

const buildClusterTemplate = (
  name: string,
  h: EntityHealthVariant
): { overview: EntityOverview; tabs: EntityTabsData } => {
  // Leading `Kubernetes` tag matches the {category} + {sub-type}
  // shape used by every other multi-type kind (Host + Bare-metal,
  // database + Postgres, cloud + AWS EC2 Instance, …).
  const tags: EntityTag[] = [
    { label: 'Kubernetes', color: 'hollow' },
    { label: 'kubernetes.cluster', color: 'hollow' },
    healthTag(h),
    { label: 'Production', color: 'hollow' },
  ];
  const narrative = {
    healthy: {
      headline: `${name} is healthy — 48 nodes ready, 612 pods running across 8 namespaces.`,
      issues: [],
      nextSteps: [
        'Continue monitoring etcd write latency ahead of the next maintenance window.',
        'Verify NodeMemoryPressure stays false across all nodes.',
      ],
    },
    atRisk: {
      headline: `${name} is at risk — API server latency drifting up, 2 nodes reporting MemoryPressure.`,
      issues: [
        'API server p99 latency at 412 ms — climbing since 02:42',
        '2 of 48 nodes reporting MemoryPressure',
      ],
      nextSteps: [
        'Investigate the loudest control-plane consumers (top 3 by request rate).',
        `Cordon the at-risk nodes if memory crosses 85%.`,
      ],
    },
    unhealthy: {
      headline: `${name} is unhealthy — 5 nodes NotReady, control plane error rate spiked.`,
      issues: [
        '5 of 48 nodes NotReady — kubelet not responding',
        'API server error rate at 12% — sustained',
        'Scheduler unable to place 18 pods (Insufficient resources)',
      ],
      nextSteps: [
        'Page the on-call infra rotation.',
        'Investigate the AZ outage that started at 02:46.',
        'Verify the cluster autoscaler is allowed to bring up replacement nodes.',
      ],
    },
  };
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: summaryFromNarrative(h, narrative),
    goldenSignals: [
      {
        id: 'latency',
        label: 'Ready nodes',
        value: pick(h, 48, 46, 43),
        unit: '/48',
        delta: pick(
          h,
          'Stable in last 5 min',
          '2 reporting MemoryPressure',
          '5 NotReady since 02:46'
        ),
        color: pick<GoldenSignalLevel>(h, 'success', 'warning', 'danger'),
        trend: trendFor(h, 48, 43, 41, 'down'),
        description: 'Number of nodes in Ready condition versus total nodes.',
      },
      {
        id: 'errorRate',
        label: 'API latency p99',
        value: pick(h, 84, 412, 1240),
        unit: 'ms',
        delta: deltaCopy(h),
        color: signalColor(h),
        trend: trendFor(h, 84, 1240, 42),
        description: 'p99 latency for kube-apiserver requests.',
      },
      {
        id: 'throughput',
        label: 'Running pods',
        value: pick(h, 612, 604, 568),
        unit: '',
        delta: pick(h, '+3 in last 5 min', '\u22128 pending scheduling', '\u221218 pods evicted'),
        color: pick<GoldenSignalLevel>(h, 'success', 'warning', 'danger'),
        trend: trendFor(h, 612, 568, 43, 'down'),
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
    securityIssueCount: securityIssueCount(h, 'cluster'),
  };
  const metrics: MetricsTabData = {
    events: eventsByHealth(h),
    goldenSignals: [
      {
        id: 'apiLatency',
        label: 'API server p99 latency',
        unit: 'ms',
        threshold: 500,
        description: 'p99 latency for kube-apiserver requests.',
        series: [series('api-p99', 'API p99 latency', trendFor(h, 84, 1240, 44))],
      },
      {
        id: 'readyNodes',
        label: 'Ready nodes',
        unit: '',
        description: 'Number of nodes in Ready condition.',
        series: [series('ready-nodes', 'Ready nodes', trendFor(h, 48, 43, 45, 'down'))],
      },
      {
        id: 'pods',
        label: 'Running pods',
        unit: '',
        description: 'Number of pods in Running state.',
        series: [series('pods', 'Running pods', trendFor(h, 612, 568, 46, 'down'))],
      },
    ],
    otherMetrics: [
      {
        id: 'etcd',
        label: 'etcd write latency p99',
        unit: 'ms',
        description: 'p99 etcd write latency.',
        series: [series('etcd', 'etcd p99', trendFor(h, 28, 312, 47))],
      },
      {
        id: 'scheduler',
        label: 'Scheduler latency p99',
        unit: 'ms',
        description: 'p99 scheduling latency.',
        series: [series('scheduler', 'Scheduler p99', trendFor(h, 42, 480, 48))],
      },
    ],
  };
  const logs: LogRow[] = pick<LogRow[]>(
    h,
    [
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
    ],
    [
      log(
        'c-1',
        `${today} @ 02:47:20.001`,
        'Warning',
        'body.text',
        `kube-apiserver: API request took 412 ms (threshold 250)`
      ),
      log(
        'c-2',
        `${today} @ 02:47:09.084`,
        'Warning',
        'body.text',
        `kube-scheduler: 4 pods could not be scheduled`
      ),
      log(
        'c-3',
        `${today} @ 02:46:58.421`,
        'Info',
        'body.text',
        `kube-controller-manager: Reconciled Deployment payments-service`
      ),
    ],
    [
      log(
        'c-1',
        `${today} @ 02:47:20.001`,
        'Error',
        'body.text',
        `kube-apiserver: 12% error rate over the last 1 min`
      ),
      log(
        'c-2',
        `${today} @ 02:47:09.084`,
        'Error',
        'body.text',
        `kube-scheduler: 18 pods Unschedulable across the cluster`
      ),
      log(
        'c-3',
        `${today} @ 02:46:58.421`,
        'Warning',
        'body.text',
        `node-controller: 5 nodes transitioned to NotReady`
      ),
      log(
        'c-4',
        `${today} @ 02:46:41.012`,
        'Info',
        'body.text',
        `etcd: snapshot saved at index 1895220`
      ),
    ]
  );
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-node-a`,
      name: 'node-prod-eu-04',
      health: relatedHealth(h),
      entityType: 'kubernetes.node',
      relation: pick(
        h,
        'Nodes — 22 pods scheduled',
        'Nodes — MemoryPressure',
        'Nodes — NotReady since 02:46'
      ),
    },
    {
      id: `${name}-rel-node-b`,
      name: 'node-prod-eu-05',
      health: pick<RelatedEntityHealth>(h, 'Healthy', 'Healthy', 'At risk'),
      entityType: 'kubernetes.node',
      relation: 'Nodes — 18 pods scheduled',
    },
    {
      id: `${name}-rel-ns-payments`,
      name: 'payments',
      health: pick<RelatedEntityHealth>(h, 'Healthy', 'At risk', 'Unhealthy'),
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
      focalHealth: relatedHealth(h),
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
  const security = securityByHealth(
    h,
    [
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
    ],
    [
      {
        id: 'cl-cve-h1',
        severity: 'High',
        title: 'ServiceAccount bound to cluster-admin in namespace payments',
        detectedAt: `${today} @ 02:46:18`,
        source: 'CSPM',
        status: 'Open',
      },
      {
        id: 'cl-cve-h2',
        severity: 'High',
        title: 'Privileged pod created in last 10 min',
        detectedAt: `${today} @ 02:47:02`,
        source: 'Detections',
        status: 'Open',
      },
    ]
  );
  return {
    overview,
    tabs: tabsOf(metrics, logs, alertsByHealth(name, h, 'cluster'), relationships, security),
  };
};

const buildNamespaceTemplate = (
  name: string,
  h: EntityHealthVariant
): { overview: EntityOverview; tabs: EntityTabsData } => {
  // Leading `Kubernetes` tag matches the {category} + {sub-type}
  // shape used by every other multi-type kind (Host + Bare-metal,
  // database + Postgres, cloud + AWS EC2 Instance, …).
  const tags: EntityTag[] = [
    { label: 'Kubernetes', color: 'hollow' },
    { label: 'kubernetes.namespace', color: 'hollow' },
    healthTag(h),
    { label: 'Production', color: 'hollow' },
  ];
  const narrative = {
    healthy: {
      headline: `${name} is healthy — 32 pods running across 4 services, no recent restarts.`,
      issues: [],
      nextSteps: [
        `Continue monitoring HPA decisions for ${name}.`,
        'Review NetworkPolicies on the next platform sync.',
      ],
    },
    atRisk: {
      headline: `${name} is at risk — restart rate climbing across services, 2 pods pending.`,
      issues: [
        '6 container restarts in the last 10 min across 3 pods',
        '2 pods pending scheduling',
      ],
      nextSteps: [
        `Inspect the latest deploy of services in ${name}.`,
        'Verify ResourceQuota isn\u2019t blocking new scheduling.',
      ],
    },
    unhealthy: {
      headline: `${name} is unhealthy — error budget burning, multiple services degraded.`,
      issues: [
        'Error budget consumed for payments-service and checkout-service',
        'Restart rate at 22/min across the namespace',
        'CPU quota at 96% of limit',
      ],
      nextSteps: [
        `Rollback the latest releases in ${name} as a first response.`,
        'Page on-call for the namespace owner team.',
        'Coordinate with platform-infra to raise the CPU quota if needed.',
      ],
    },
  };
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: summaryFromNarrative(h, narrative),
    goldenSignals: [
      {
        id: 'latency',
        label: 'Running pods',
        value: pick(h, 32, 30, 24),
        unit: '',
        delta: pick(h, 'Stable in last 5 min', '2 pending', '6 evicted in last 5 min'),
        color: pick<GoldenSignalLevel>(h, 'success', 'warning', 'danger'),
        trend: trendFor(h, 32, 24, 51, 'down'),
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
        value: pick(h, 0, 6, 22),
        unit: '/h',
        delta: pick(h, 'No restarts in last 1 h', '6 in last 10 min', '22/min across namespace'),
        color: signalColor(h),
        trend: trendFor(h, 0, 22, 53),
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
    securityIssueCount: securityIssueCount(h, 'namespace'),
  };
  const metrics: MetricsTabData = {
    events: eventsByHealth(h),
    goldenSignals: [
      {
        id: 'pods',
        label: 'Running pods',
        unit: '',
        description: 'Pods in Running state.',
        series: [series('pods', 'Running pods', trendFor(h, 32, 24, 54, 'down'))],
      },
      {
        id: 'restarts',
        label: 'Container restarts',
        unit: '',
        description: 'Container restart count.',
        series: [series('restarts', 'Restarts', trendFor(h, 0, 22, 55))],
      },
      {
        id: 'cpu',
        label: 'Namespace CPU usage',
        unit: 'cores',
        description: 'Sum of CPU usage across all pods.',
        series: [series('cpu', 'CPU cores', trendFor(h, 6.2, 13.6, 56))],
      },
    ],
    otherMetrics: [
      {
        id: 'memory',
        label: 'Namespace memory usage',
        unit: 'GB',
        description: 'Sum of memory usage across all pods.',
        series: [series('memory', 'Memory GB', trendFor(h, 18.4, 32.8, 57))],
      },
      {
        id: 'netIn',
        label: 'Network in',
        unit: 'MB/s',
        description: 'Inbound network throughput.',
        series: [series('net-in', 'Network in', trendFor(h, 48, 92, 58))],
      },
    ],
  };
  const logs: LogRow[] = pick<LogRow[]>(
    h,
    [
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
    ],
    [
      log(
        'ns-1',
        `${today} @ 02:47:20.001`,
        'Warning',
        'body.text',
        `kube-scheduler: 2 pods Pending in ${name} (Insufficient memory)`
      ),
      log(
        'ns-2',
        `${today} @ 02:47:09.084`,
        'Warning',
        'body.text',
        `Container restart rate: 6 in last 10 min`
      ),
      log(
        'ns-3',
        `${today} @ 02:46:58.421`,
        'Info',
        'body.text',
        `kube-controller-manager: HPA scaled ${name}/checkout-service to 4`
      ),
    ],
    [
      log(
        'ns-1',
        `${today} @ 02:47:20.001`,
        'Error',
        'body.text',
        `Quota CPU exceeded — pods Pending in ${name}`
      ),
      log(
        'ns-2',
        `${today} @ 02:47:09.084`,
        'Error',
        'body.text',
        `Container restart rate: 22/min across ${name}`
      ),
      log(
        'ns-3',
        `${today} @ 02:46:58.421`,
        'Warning',
        'body.text',
        `kube-scheduler: 18 pods Pending in ${name}`
      ),
    ]
  );
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
      health: relatedHealth(h),
      entityType: 'apm.service',
      relation: 'Hosts — 4 replicas',
    },
    {
      id: `${name}-rel-pod`,
      name: 'payments-pod-3ac1f',
      health: relatedHealth(h),
      entityType: 'kubernetes.pod',
      relation: 'Pods — payments-service',
    },
  ];
  const relationships: RelationshipsTabData = {
    topology: {
      focalHealth: relatedHealth(h),
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
  const security = securityByHealth(
    h,
    [],
    [
      {
        id: `ns-cve-h1-${name}`,
        severity: 'High',
        title: `ServiceAccount in ${name} with cluster-admin role`,
        detectedAt: `${today} @ 02:46:18`,
        source: 'CSPM',
        status: 'Open',
      },
      {
        id: `ns-cve-h2-${name}`,
        severity: 'Medium',
        title: `Pod in ${name} writing to host filesystem`,
        detectedAt: `${today} @ 02:47:00`,
        source: 'Detections',
        status: 'Open',
      },
    ]
  );
  return {
    overview,
    tabs: tabsOf(metrics, logs, alertsByHealth(name, h, 'namespace'), relationships, security),
  };
};

const buildDatabaseTemplate = (
  name: string,
  h: EntityHealthVariant,
  typeLabel?: string
): { overview: EntityOverview; tabs: EntityTabsData } => {
  // Database covers Postgres / MySQL / MongoDB / Redis / Elasticsearch
  // with one builder. Surface the actual engine in the secondary tag
  // so a MySQL row no longer renders as "Postgres".
  const tags: EntityTag[] = [
    { label: 'database', color: 'hollow' },
    { label: databaseEngineFromTypeLabel(typeLabel), color: 'hollow' },
    healthTag(h),
    { label: 'Production', color: 'hollow' },
  ];
  const narrative = {
    healthy: {
      headline: `${name} is healthy — query latency normal, replica lag under 80 ms.`,
      issues: [],
      nextSteps: [
        'No action required — connection pool headroom is healthy.',
        'Run VACUUM ANALYZE on hot tables before the next billing cycle.',
      ],
    },
    atRisk: {
      headline: `${name} is at risk — connection pool filling up and a couple of slow queries showing up.`,
      issues: [
        'Active connections at 168/200',
        '4 queries above the 250 ms slow-query threshold in the last 5 min',
      ],
      nextSteps: [
        'Check pg_stat_activity for long-running queries and idle-in-transaction sessions.',
        'Investigate the dominant client (likely payments-service) for query patterns.',
      ],
    },
    unhealthy: {
      headline: `${name} is unhealthy — connection pool exhausted, replica lag past 6 s.`,
      issues: [
        'Connection pool exhausted (200/200, queueing 14)',
        'Replica lag at 6.2 s — clients reading stale data',
        'Multiple long-running queries holding locks',
      ],
      nextSteps: [
        'Kill long-running queries holding locks on hot tables.',
        'Increase max_connections temporarily or shed traffic from the noisy client.',
        'Failover to the replica if lag continues to grow.',
      ],
    },
  };
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: summaryFromNarrative(h, narrative),
    goldenSignals: [
      {
        id: 'latency',
        label: 'Query p99 latency',
        value: pick(h, 8, 84, 412),
        unit: 'ms',
        delta: deltaCopy(h),
        color: signalColor(h),
        trend: trendFor(h, 8, 412, 61),
        description: 'p99 query latency across all clients.',
      },
      {
        id: 'errorRate',
        label: 'Connections',
        value: pick(h, 42, 168, 200),
        unit: '',
        delta: pick(h, 'Stable in last 5 min', '+45 in last 5 min', 'Pool exhausted'),
        color: signalColor(h),
        trend: trendFor(h, 42, 200, 62),
        description: 'Active client connections.',
      },
      {
        id: 'throughput',
        label: 'Replica lag',
        value: pick(h, 72, 480, 6240),
        unit: 'ms',
        delta: deltaCopy(h),
        color: signalColor(h),
        trend: trendFor(h, 72, 6240, 63),
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
    securityIssueCount: securityIssueCount(h, 'database'),
  };
  const metrics: MetricsTabData = {
    events: eventsByHealth(h),
    goldenSignals: [
      {
        id: 'queryLatency',
        label: 'Query latency p99',
        unit: 'ms',
        threshold: 50,
        description: 'p99 query latency.',
        series: [series('query-p99', 'p99 latency', trendFor(h, 8, 412, 64))],
      },
      {
        id: 'connections',
        label: 'Active connections',
        unit: '',
        threshold: 180,
        description: 'Active client connections.',
        series: [series('connections', 'Connections', trendFor(h, 42, 200, 65))],
      },
      {
        id: 'replicaLag',
        label: 'Replica lag',
        unit: 'ms',
        threshold: 1000,
        description: 'Replication lag.',
        series: [series('replica-lag', 'Replica lag', trendFor(h, 72, 6240, 66))],
      },
    ],
    otherMetrics: [
      {
        id: 'cpu',
        label: 'CPU usage',
        unit: '%',
        description: 'CPU usage on the database host.',
        series: [series('cpu', 'CPU %', trendFor(h, 28, 88, 67))],
      },
      {
        id: 'disk',
        label: 'Disk usage',
        unit: '%',
        description: 'Disk usage as a percentage of total capacity.',
        series: [series('disk', 'Disk %', trendFor(h, 48, 62, 68))],
      },
    ],
  };
  const logs: LogRow[] = pick<LogRow[]>(
    h,
    [
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
    ],
    [
      log(
        'd-1',
        `${today} @ 02:47:20.001`,
        'Warning',
        'body.text',
        `LOG: duration: 612.124 ms statement: UPDATE orders …`
      ),
      log(
        'd-2',
        `${today} @ 02:47:09.084`,
        'Warning',
        'body.text',
        `LOG: connection refused — pool near limit (168/200)`
      ),
      log(
        'd-3',
        `${today} @ 02:46:58.421`,
        'Info',
        'body.text',
        `LOG: checkpoint complete: wrote 1842 buffers`
      ),
    ],
    [
      log(
        'd-1',
        `${today} @ 02:47:20.001`,
        'Error',
        'body.text',
        `FATAL: sorry, too many clients already (200/200)`
      ),
      log(
        'd-2',
        `${today} @ 02:47:09.084`,
        'Error',
        'body.text',
        `LOG: replication lag 6.2 s on standby \"replica-1\"`
      ),
      log(
        'd-3',
        `${today} @ 02:46:58.421`,
        'Warning',
        'body.text',
        `LOG: long-running query 8412ms holding lock on public.orders`
      ),
      log(
        'd-4',
        `${today} @ 02:46:41.012`,
        'Info',
        'body.text',
        `LOG: autovacuum: ANALYZE public.orders`
      ),
    ]
  );
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-svc-1`,
      name: 'payments-service',
      health: relatedHealth(h),
      entityType: 'apm.service',
      relation: pick(
        h,
        'Called by — 240 req/s',
        'Called by — 240 req/s, p99 412 ms',
        'Called by — 240 req/s, timeouts'
      ),
    },
    {
      id: `${name}-rel-svc-2`,
      name: 'billing-api',
      health: pick<RelatedEntityHealth>(h, 'Healthy', 'Healthy', 'At risk'),
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
      focalHealth: relatedHealth(h),
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
  const security = securityByHealth(
    h,
    [
      {
        id: 'd-cve-1',
        severity: 'Medium',
        title: 'CIS Postgres 1.5.0 — auditd rule for FAILED_LOGIN missing',
        detectedAt: 'May 3, 2026, 09:12',
        source: 'CSPM',
        status: 'Open',
      },
    ],
    [
      {
        id: 'd-cve-h1',
        severity: 'High',
        title: `Possible SQL-injection pattern detected against ${name}`,
        detectedAt: `${today} @ 02:46:55`,
        source: 'Detections',
        status: 'Open',
      },
      {
        id: 'd-cve-h2',
        severity: 'Medium',
        title: 'Postgres superuser used by a non-admin client',
        detectedAt: 'May 5, 2026, 18:42',
        source: 'CSPM',
        status: 'Open',
      },
    ]
  );
  return {
    overview,
    tabs: tabsOf(metrics, logs, alertsByHealth(name, h, 'database'), relationships, security),
  };
};

/**
 * AWS sub-variant that drives the cloud flyout's tags, narrative,
 * entity details and golden signals. Computed from the raw `.type`
 * string so an EC2 instance no longer gets rendered with the "AWS
 * region" tag and a `Region:` row showing its instance id (the bug
 * Nicolas hit at https://github.com/elastic/kibana — see screenshot).
 *
 * `'region'` is the default fallback when `typeLabel` is missing or
 * doesn't match any known sub-string, which preserves the original
 * region-template behaviour for entities only identified by name.
 */
type AwsCloudVariant = 'region' | 'ec2' | 'lambda' | 's3';

const detectAwsCloudVariant = (typeLabel: string | undefined): AwsCloudVariant => {
  if (!typeLabel) return 'region';
  const lower = typeLabel.toLowerCase();
  if (lower.includes('ec2') || lower.includes('instance')) return 'ec2';
  if (lower.includes('lambda') || lower.includes('function')) return 'lambda';
  if (lower.includes('s3') || lower.includes('bucket')) return 's3';
  return 'region';
};

/**
 * Cloud dispatcher — picks the AWS sub-variant from `typeLabel`
 * (`'AWS region'`, `'AWS EC2 Instance'`, `'AWS Lambda function'`,
 * `'AWS S3 bucket'`) and renders a tailored template. Region keeps
 * the original wide-angle "API success / throttling / spend" story;
 * the other three swap in compute / function / storage signals so
 * the flyout reads true for the actual resource.
 */
const buildCloudTemplate = (
  name: string,
  h: EntityHealthVariant,
  typeLabel?: string
): { overview: EntityOverview; tabs: EntityTabsData } => {
  switch (detectAwsCloudVariant(typeLabel)) {
    case 'ec2':
      return buildCloudEc2Template(name, h);
    case 'lambda':
      return buildCloudLambdaTemplate(name, h);
    case 's3':
      return buildCloudS3Template(name, h);
    case 'region':
    default:
      return buildCloudRegionTemplate(name, h);
  }
};

const buildCloudRegionTemplate = (
  name: string,
  h: EntityHealthVariant
): { overview: EntityOverview; tabs: EntityTabsData } => {
  const tags: EntityTag[] = [
    { label: 'cloud', color: 'hollow' },
    { label: 'AWS region', color: 'hollow' },
    healthTag(h),
    { label: 'Production', color: 'hollow' },
  ];
  const narrative = {
    healthy: {
      headline: `${name} is healthy — no service-level events from AWS, spend is on track for the month.`,
      issues: [],
      nextSteps: [
        'No action required — continue monitoring throttling rate ahead of the next promo.',
        'Confirm the IAM trust-policy review for the platform-infra role.',
      ],
    },
    atRisk: {
      headline: `${name} is at risk — EC2 vCPU quota above 85% and small bump in API throttling.`,
      issues: [
        'EC2 vCPU quota at 88% — autoscaler limited',
        'API throttling at 0.8% — small but elevated',
      ],
      nextSteps: [
        'Submit a quota-increase request for EC2 vCPU in this region.',
        'Verify which service is driving the throttling burst.',
      ],
    },
    unhealthy: {
      headline: `${name} is unhealthy — AWS Health event impacting EC2 + EKS, multiple services degraded.`,
      issues: [
        'AWS Health event in ${name} affecting EC2 + EKS since 02:46',
        'API success rate dropped to 96.4%',
        'Throttling rate at 4.2% — sustained',
      ],
      nextSteps: [
        'Page the on-call cloud rotation.',
        'Drain traffic to the secondary region until the AWS event clears.',
        'Communicate impact to product on-call.',
      ],
    },
  };
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: summaryFromNarrative(h, narrative),
    goldenSignals: [
      {
        id: 'latency',
        label: 'API success rate',
        value: pick(h, 99.98, 99.4, 96.4),
        unit: '%',
        delta: pick(h, 'Stable in last 5 min', '\u22120.5% in last 5 min', 'Dropping since 02:46'),
        color: signalColor(h),
        trend: trendFor(h, 99.98, 96.4, 71, 'down'),
        description: 'AWS API success rate across all services in this region.',
      },
      {
        id: 'errorRate',
        label: 'Throttling rate',
        value: pick(h, 0.02, 0.8, 4.2),
        unit: '%',
        delta: deltaCopy(h),
        color: signalColor(h),
        trend: trendFor(h, 0.02, 4.2, 72),
        description: 'Percentage of AWS API calls that were throttled.',
      },
      {
        id: 'throughput',
        label: 'Spend MTD',
        value: pick(h, 18420, 19840, 22120),
        unit: '$',
        delta: pick(h, '+$420 vs budget', '+$1,840 vs budget', '+$4,120 vs budget'),
        color: pick<GoldenSignalLevel>(h, 'warning', 'warning', 'danger'),
        trend: trendFor(h, 18000, 22120, 73),
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
    securityIssueCount: securityIssueCount(h, 'cloud'),
  };
  const metrics: MetricsTabData = {
    events: eventsByHealth(h),
    goldenSignals: [
      {
        id: 'apiSuccess',
        label: 'API success rate',
        unit: '%',
        threshold: 99.5,
        description: 'AWS API success rate.',
        series: [series('api-success', 'Success %', trendFor(h, 99.98, 96.4, 74, 'down'))],
      },
      {
        id: 'throttle',
        label: 'Throttling rate',
        unit: '%',
        threshold: 1,
        description: 'AWS API throttling rate.',
        series: [series('throttle', 'Throttle %', trendFor(h, 0.02, 4.2, 75))],
      },
      {
        id: 'spend',
        label: 'Spend MTD',
        unit: '$',
        description: 'Month-to-date spend.',
        series: [series('spend', 'Spend $', trendFor(h, 18000, 22120, 76))],
      },
    ],
    otherMetrics: [
      {
        id: 'ec2',
        label: 'EC2 running instances',
        unit: '',
        description: 'Number of running EC2 instances.',
        series: [series('ec2', 'Instances', trendFor(h, 96, 81, 77, 'down'))],
      },
      {
        id: 's3',
        label: 'S3 storage (TiB)',
        unit: 'TiB',
        description: 'Total S3 storage across linked accounts.',
        series: [series('s3', 'Storage', trendFor(h, 124, 128, 78))],
      },
    ],
  };
  const logs: LogRow[] = pick<LogRow[]>(
    h,
    [
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
    ],
    [
      log(
        'cl-1',
        `${today} @ 02:47:20.001`,
        'Warning',
        'body.text',
        `CloudTrail: ec2.RunInstances throttled (vCPU quota)`
      ),
      log(
        'cl-2',
        `${today} @ 02:47:09.084`,
        'Warning',
        'body.text',
        `Budget: spend trending +9% vs forecast`
      ),
      log(
        'cl-3',
        `${today} @ 02:46:58.421`,
        'Info',
        'body.text',
        `CloudTrail: iam.CreateAccessKey by platform-cloud (success)`
      ),
    ],
    [
      log(
        'cl-1',
        `${today} @ 02:47:20.001`,
        'Error',
        'body.text',
        `AWS Health event AWS_EC2_OPERATIONAL_ISSUE in ${name}`
      ),
      log(
        'cl-2',
        `${today} @ 02:47:09.084`,
        'Error',
        'body.text',
        `CloudTrail: ec2.RunInstances 503 (3rd retry)`
      ),
      log(
        'cl-3',
        `${today} @ 02:46:58.421`,
        'Warning',
        'body.text',
        `CloudTrail: throttled — 12 calls in last 1 min`
      ),
      log(
        'cl-4',
        `${today} @ 02:46:41.012`,
        'Info',
        'body.text',
        `CloudTrail: s3.PutObject by ci-bot (success, 4.2 MB)`
      ),
    ]
  );
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-cluster`,
      name: 'k8s-eu-prod',
      health: relatedHealth(h),
      entityType: 'kubernetes.cluster',
      relation: 'Hosts — EKS cluster',
    },
    {
      id: `${name}-rel-db`,
      name: 'payments-db',
      health: pick<RelatedEntityHealth>(h, 'Healthy', 'Healthy', 'At risk'),
      entityType: 'database',
      relation: 'Hosts — RDS Postgres',
    },
    {
      id: `${name}-rel-mw`,
      name: 'kafka-payments',
      health: pick<RelatedEntityHealth>(h, 'Healthy', 'Healthy', 'At risk'),
      entityType: 'middleware (kafka)',
      relation: 'Hosts — MSK',
    },
  ];
  const relationships: RelationshipsTabData = {
    topology: {
      focalHealth: relatedHealth(h),
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
  const security = securityByHealth(
    h,
    [],
    [
      {
        id: `cloud-cve-h1-${name}`,
        severity: 'High',
        title: `Root account used from new IP in ${name}`,
        detectedAt: `${today} @ 02:46:18`,
        source: 'Detections',
        status: 'Open',
      },
      {
        id: `cloud-cve-h2-${name}`,
        severity: 'Medium',
        title: 'IAM access key older than 180 days still active',
        detectedAt: 'May 5, 2026, 18:42',
        source: 'CSPM',
        status: 'Open',
      },
    ]
  );
  return {
    overview,
    tabs: tabsOf(metrics, logs, alertsByHealth(name, h, 'cloud'), relationships, security),
  };
};

// ---------------------------------------------------------------------------
// Cloud sub-variants: EC2 / Lambda / S3
// ---------------------------------------------------------------------------
//
// Each sub-builder mirrors the shape of `buildCloudRegionTemplate` but
// swaps the tag set, narrative, golden signals and metric series for
// resource-appropriate ones. Logs / related entities / security
// findings are kept light: enough to feel real, without exploding the
// file. The `alertsByHealth` / `securityIssueCount` helpers still
// receive the umbrella `'cloud'` kind so alert generation stays
// consistent across the four AWS sub-types.

const cloudOwnership = () => healthyOwnership('platform-cloud', '#cloud-platform', 'cloud-primary');

/**
 * Lightweight shared related-entities block for the three cloud
 * sub-variants. The region template has its own richer set; the
 * compute/function/storage variants reuse this minimal version
 * because the related panel isn't the focus of those flyouts.
 */
const sharedCloudRelationships = (name: string, h: EntityHealthVariant): RelationshipsTabData => {
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-region`,
      name: 'aws-eu-west-1',
      health: relatedHealth(h),
      entityType: 'cloud',
      relation: 'Hosted in — AWS region',
    },
    {
      id: `${name}-rel-team`,
      name: 'platform-cloud',
      health: 'Healthy',
      entityType: 'team',
      relation: 'Owned by',
    },
  ];
  return {
    topology: {
      focalHealth: relatedHealth(h),
      nodes: [
        { id: 'focal', label: name, focal: true },
        { id: 'region', label: 'aws-eu-west-1' },
        { id: 'team', label: 'platform-cloud' },
      ],
      edges: [
        { from: 'focal', to: 'region', emphasized: true },
        { from: 'focal', to: 'team' },
      ],
    },
    related,
  };
};

const buildCloudEc2Template = (
  name: string,
  h: EntityHealthVariant
): { overview: EntityOverview; tabs: EntityTabsData } => {
  const tags: EntityTag[] = [
    { label: 'cloud', color: 'hollow' },
    { label: 'AWS EC2 Instance', color: 'hollow' },
    healthTag(h),
    { label: 'Production', color: 'hollow' },
  ];
  const narrative = {
    healthy: {
      headline: `${name} is healthy — CPU steady around 28%, no status check failures in the last 24 h.`,
      issues: [],
      nextSteps: [
        'No action required — continue monitoring CPU credits on the next promo window.',
        'Confirm the AMI is on the latest hardened baseline.',
      ],
    },
    atRisk: {
      headline: `${name} is at risk — CPU sustained above 80% and CPU credit balance trending down.`,
      issues: [
        'CPU utilisation at 84% — sustained > 30 min',
        'CPU credit balance at 32 — burnable for ~18 min at current rate',
      ],
      nextSteps: [
        'Consider moving from `t3` burstable to a fixed-performance instance type.',
        'Check the noisy-neighbour processes via SSM Run Command.',
      ],
    },
    unhealthy: {
      headline: `${name} is unhealthy — instance status check failing and network out-bound errors climbing.`,
      issues: [
        'System status check FAILED at 02:46',
        'Network out errors at 0.4% — climbing',
        'CPU utilisation at 96% — pegged',
      ],
      nextSteps: [
        'Stop / start the instance to migrate it off the impaired host.',
        'Cordon the instance from the target group during recovery.',
        'Open an AWS support case if the failure persists after migration.',
      ],
    },
  };
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: summaryFromNarrative(h, narrative),
    goldenSignals: [
      {
        // `GoldenSignal.id` is a 3-value enum (`latency` / `errorRate`
        // / `throughput`) shared by the overview card grid — we
        // repurpose the slots: `latency` = primary saturation,
        // `errorRate` = secondary stressor, `throughput` = workload.
        id: 'latency',
        label: 'CPU utilisation',
        value: pick(h, 28, 84, 96),
        unit: '%',
        delta: pick(h, 'Stable in last 5 min', '+12 pts in last 15 min', 'Pegged since 02:46'),
        color: signalColor(h),
        trend: trendFor(h, 28, 96, 81),
        description: 'CloudWatch CPUUtilization, 1-min granularity.',
      },
      {
        id: 'errorRate',
        label: 'Network out',
        value: pick(h, 18.2, 36.7, 41.1),
        unit: 'MB/s',
        delta: deltaCopy(h),
        color: signalColor(h),
        trend: trendFor(h, 18, 41, 82),
        description: 'CloudWatch NetworkOut, 1-min granularity.',
      },
      {
        id: 'throughput',
        label: 'Status check failures',
        value: pick(h, 0, 0, 3),
        unit: '',
        delta: pick(h, 'Healthy 24h', 'Healthy 24h', '3 failures since 02:46'),
        color: pick<GoldenSignalLevel>(h, 'success', 'warning', 'danger'),
        trend: trendFor(h, 0, 3, 83),
        description: 'CloudWatch StatusCheckFailed, 1-min granularity.',
      },
    ],
    details: [
      { id: 'provider', label: 'Provider', value: 'AWS' },
      { id: 'instanceId', label: 'Instance id', value: name },
      {
        id: 'instanceType',
        label: 'Instance type',
        value: pick(h, 'm6i.large', 'm6i.large', 't3.medium'),
      },
      { id: 'region', label: 'Region', value: 'eu-west-1' },
      { id: 'az', label: 'Availability zone', value: 'eu-west-1a' },
      { id: 'ami', label: 'AMI', value: 'ami-0a1b2c3d4e5f67890' },
    ],
    ownership: cloudOwnership(),
    securityIssueCount: securityIssueCount(h, 'cloud'),
  };
  const metrics: MetricsTabData = {
    events: eventsByHealth(h),
    goldenSignals: [
      {
        id: 'cpu',
        label: 'CPU utilisation',
        unit: '%',
        threshold: 80,
        description: 'CloudWatch CPUUtilization.',
        series: [series('cpu', 'CPU %', trendFor(h, 28, 96, 84))],
      },
      {
        id: 'netout',
        label: 'Network out',
        unit: 'MB/s',
        description: 'CloudWatch NetworkOut.',
        series: [series('netout', 'MB/s', trendFor(h, 18, 41, 85))],
      },
      {
        id: 'status',
        label: 'Status check failures',
        unit: '',
        threshold: 1,
        description: 'CloudWatch StatusCheckFailed.',
        series: [series('status', 'Failures', trendFor(h, 0, 3, 86))],
      },
    ],
    otherMetrics: [
      {
        id: 'credit',
        label: 'CPU credit balance',
        unit: '',
        description: 'CloudWatch CPUCreditBalance (burstable types only).',
        series: [series('credit', 'Credits', trendFor(h, 240, 32, 87, 'down'))],
      },
      {
        id: 'disk',
        label: 'EBS read latency',
        unit: 'ms',
        description: 'CloudWatch VolumeTotalReadTime / VolumeReadOps.',
        series: [series('disk', 'ms', trendFor(h, 2.1, 6.8, 88))],
      },
    ],
  };
  const logs: LogRow[] = pick<LogRow[]>(
    h,
    [
      log(
        'ec2-1',
        `${today} @ 02:47:20.001`,
        'Info',
        'body.text',
        `Cloud-init reached final stage on ${name}`
      ),
      log(
        'ec2-2',
        `${today} @ 02:47:09.084`,
        'Info',
        'body.text',
        `SSM session ssm-user closed cleanly`
      ),
    ],
    [
      log(
        'ec2-1',
        `${today} @ 02:47:20.001`,
        'Warning',
        'body.text',
        `CPU credit balance below 100 on ${name}`
      ),
      log(
        'ec2-2',
        `${today} @ 02:47:09.084`,
        'Warning',
        'body.text',
        `kernel: TCP: out of memory -- consider tuning tcp_mem`
      ),
    ],
    [
      log(
        'ec2-1',
        `${today} @ 02:47:20.001`,
        'Error',
        'body.text',
        `Instance status check FAILED on ${name}`
      ),
      log(
        'ec2-2',
        `${today} @ 02:47:09.084`,
        'Error',
        'body.text',
        `kernel: BUG: soft lockup - CPU#0 stuck for 23s`
      ),
      log(
        'ec2-3',
        `${today} @ 02:46:58.421`,
        'Warning',
        'body.text',
        `dropped 12 TCP RSTs to elb-healthcheck`
      ),
    ]
  );
  const security = securityByHealth(
    h,
    [],
    [
      {
        id: `ec2-cve-h1-${name}`,
        severity: 'High',
        title: `Security group on ${name} allows 0.0.0.0/0 to port 22`,
        detectedAt: `${today} @ 02:46:18`,
        source: 'CSPM',
        status: 'Open',
      },
      {
        id: `ec2-cve-h2-${name}`,
        severity: 'Medium',
        title: 'IMDSv1 still allowed on instance metadata service',
        detectedAt: 'May 5, 2026, 18:42',
        source: 'CSPM',
        status: 'Open',
      },
    ]
  );
  return {
    overview,
    tabs: tabsOf(
      metrics,
      logs,
      alertsByHealth(name, h, 'cloud'),
      sharedCloudRelationships(name, h),
      security
    ),
  };
};

const buildCloudLambdaTemplate = (
  name: string,
  h: EntityHealthVariant
): { overview: EntityOverview; tabs: EntityTabsData } => {
  const tags: EntityTag[] = [
    { label: 'cloud', color: 'hollow' },
    { label: 'AWS Lambda function', color: 'hollow' },
    healthTag(h),
    { label: 'Production', color: 'hollow' },
  ];
  const narrative = {
    healthy: {
      headline: `${name} is healthy — invocations steady, p99 duration under the 1s budget.`,
      issues: [],
      nextSteps: [
        'No action required — keep the reserved concurrency at the current value.',
        'Confirm the next runtime upgrade lands on the staging alias first.',
      ],
    },
    atRisk: {
      headline: `${name} is at risk — error rate climbing past 1% and cold starts elevated.`,
      issues: [
        'Error rate at 1.4% — climbing 0.2 pts / min',
        'Cold-start rate at 6.8% — usually < 2%',
      ],
      nextSteps: [
        'Bump provisioned concurrency by +5 to absorb the next promo spike.',
        'Check downstream RDS Postgres pool — likely behind the error climb.',
      ],
    },
    unhealthy: {
      headline: `${name} is unhealthy — 5xx errors above 5% and concurrency throttling triggered.`,
      issues: [
        'Error rate at 5.7% — sustained',
        'Concurrent executions hit reserved limit (200) — 14 throttles in last 5 min',
        'p99 duration at 2.4s — above 1s budget',
      ],
      nextSteps: [
        'Page the on-call function-owner team.',
        'Raise reserved concurrency to 400 temporarily and roll forward to runtime patch.',
        'Open a postmortem item for the queue-depth alert that fired late.',
      ],
    },
  };
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: summaryFromNarrative(h, narrative),
    goldenSignals: [
      {
        // `latency` slot holds the workload-shape signal here
        // (invocations); `errorRate` keeps its semantic meaning;
        // `throughput` is repurposed for p99 duration.
        id: 'latency',
        label: 'Invocations',
        value: pick(h, 38420, 41280, 47120),
        unit: '/min',
        delta: deltaCopy(h),
        color: pick<GoldenSignalLevel>(h, 'success', 'warning', 'warning'),
        trend: trendFor(h, 38000, 47120, 91),
        description: 'CloudWatch Invocations, 1-min granularity.',
      },
      {
        id: 'errorRate',
        label: 'Error rate',
        value: pick(h, 0.18, 1.4, 5.7),
        unit: '%',
        delta: pick(h, 'Stable in last 5 min', '+0.2 pts / min', '+1.8 pts in 5 min'),
        color: signalColor(h),
        trend: trendFor(h, 0.18, 5.7, 92),
        description: 'CloudWatch Errors / Invocations.',
      },
      {
        id: 'throughput',
        label: 'p99 duration',
        value: pick(h, 480, 820, 2400),
        unit: 'ms',
        delta: deltaCopy(h),
        color: signalColor(h),
        trend: trendFor(h, 480, 2400, 93),
        description: 'CloudWatch Duration p99.',
      },
    ],
    details: [
      { id: 'provider', label: 'Provider', value: 'AWS' },
      { id: 'functionName', label: 'Function name', value: name },
      { id: 'runtime', label: 'Runtime', value: 'nodejs20.x' },
      { id: 'memory', label: 'Memory', value: '512 MB' },
      { id: 'region', label: 'Region', value: 'eu-west-1' },
      {
        id: 'reservedConcurrency',
        label: 'Reserved concurrency',
        value: pick(h, '100', '100', '200'),
      },
    ],
    ownership: cloudOwnership(),
    securityIssueCount: securityIssueCount(h, 'cloud'),
  };
  const metrics: MetricsTabData = {
    events: eventsByHealth(h),
    goldenSignals: [
      {
        id: 'invocations',
        label: 'Invocations',
        unit: '/min',
        description: 'CloudWatch Invocations.',
        series: [series('invocations', 'Invocations', trendFor(h, 38000, 47120, 94))],
      },
      {
        id: 'errors',
        label: 'Error rate',
        unit: '%',
        threshold: 1,
        description: 'CloudWatch Errors.',
        series: [series('errors', 'Error %', trendFor(h, 0.18, 5.7, 95))],
      },
      {
        id: 'p99',
        label: 'p99 duration',
        unit: 'ms',
        threshold: 1000,
        description: 'CloudWatch Duration p99.',
        series: [series('p99', 'ms', trendFor(h, 480, 2400, 96))],
      },
    ],
    otherMetrics: [
      {
        id: 'coldstart',
        label: 'Cold-start rate',
        unit: '%',
        description: 'CloudWatch InitDuration / Invocations.',
        series: [series('coldstart', 'Cold %', trendFor(h, 1.4, 6.8, 97))],
      },
      {
        id: 'concurrency',
        label: 'Concurrent executions',
        unit: '',
        threshold: 200,
        description: 'CloudWatch ConcurrentExecutions.',
        series: [series('concurrency', 'Concurrent', trendFor(h, 64, 198, 98))],
      },
    ],
  };
  const logs: LogRow[] = pick<LogRow[]>(
    h,
    [
      log(
        'lm-1',
        `${today} @ 02:47:20.001`,
        'Info',
        'body.text',
        `END RequestId d1f2a3b4 Duration: 482.10 ms`
      ),
      log(
        'lm-2',
        `${today} @ 02:47:09.084`,
        'Info',
        'body.text',
        `START RequestId e5f6a708 Version: $LATEST`
      ),
    ],
    [
      log(
        'lm-1',
        `${today} @ 02:47:20.001`,
        'Warning',
        'body.text',
        `END RequestId d1f2a3b4 Duration: 1810.00 ms`
      ),
      log(
        'lm-2',
        `${today} @ 02:47:09.084`,
        'Warning',
        'body.text',
        `INIT_REPORT InitDuration: 920.40 ms`
      ),
    ],
    [
      log(
        'lm-1',
        `${today} @ 02:47:20.001`,
        'Error',
        'body.text',
        `Task timed out after 3.00 seconds`
      ),
      log(
        'lm-2',
        `${today} @ 02:47:09.084`,
        'Error',
        'body.text',
        `Rate Exceeded: 14 throttled invocations`
      ),
      log(
        'lm-3',
        `${today} @ 02:46:58.421`,
        'Warning',
        'body.text',
        `Concurrent executions: 198 of 200 reserved`
      ),
    ]
  );
  const security = securityByHealth(
    h,
    [],
    [
      {
        id: `lm-cve-h1-${name}`,
        severity: 'High',
        title: `Execution role on ${name} allows iam:PassRole *`,
        detectedAt: `${today} @ 02:46:18`,
        source: 'CSPM',
        status: 'Open',
      },
      {
        id: `lm-cve-h2-${name}`,
        severity: 'Medium',
        title: 'Function exposed via Function URL with AWS_IAM auth_type only',
        detectedAt: 'May 5, 2026, 18:42',
        source: 'CSPM',
        status: 'Open',
      },
    ]
  );
  return {
    overview,
    tabs: tabsOf(
      metrics,
      logs,
      alertsByHealth(name, h, 'cloud'),
      sharedCloudRelationships(name, h),
      security
    ),
  };
};

const buildCloudS3Template = (
  name: string,
  h: EntityHealthVariant
): { overview: EntityOverview; tabs: EntityTabsData } => {
  const tags: EntityTag[] = [
    { label: 'cloud', color: 'hollow' },
    { label: 'AWS S3 bucket', color: 'hollow' },
    healthTag(h),
    { label: 'Production', color: 'hollow' },
  ];
  const narrative = {
    healthy: {
      headline: `${name} is healthy — request rate steady, 4xx ratio under 0.1%, no replication lag.`,
      issues: [],
      nextSteps: [
        'No action required — review the lifecycle rule on the next platform sync.',
        'Confirm versioning + MFA delete on the next compliance pass.',
      ],
    },
    atRisk: {
      headline: `${name} is at risk — 4xx ratio above 1% and replication lag climbing past 90s.`,
      issues: [
        '4xx error ratio at 1.2% — usually < 0.1%',
        'Replication lag at 96s — replica region falling behind',
      ],
      nextSteps: [
        'Investigate which IAM principal is generating the AccessDenied bursts.',
        'Confirm the replication role still has kms:Decrypt on the source CMK.',
      ],
    },
    unhealthy: {
      headline: `${name} is unhealthy — 5xx ratio above 1% and SlowDown errors triggering retries.`,
      issues: [
        '5xx error ratio at 1.8% — sustained',
        'SlowDown errors at 240 / min — request rate above bucket partition limit',
        'Replication lag at 4 min — RPO at risk',
      ],
      nextSteps: [
        'Page the on-call data-platform rotation.',
        'Spread writes across more key prefixes (current top-prefix takes 62% of writes).',
        'Open AWS support case if SlowDown persists after re-sharding.',
      ],
    },
  };
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: summaryFromNarrative(h, narrative),
    goldenSignals: [
      {
        // `latency` slot is repurposed for request rate;
        // `errorRate` is the 4xx ratio; `throughput` is replication
        // lag — the three signals customers actually watch for an
        // S3 bucket.
        id: 'latency',
        label: 'Request rate',
        value: pick(h, 1280, 2410, 3820),
        unit: '/s',
        delta: deltaCopy(h),
        color: pick<GoldenSignalLevel>(h, 'success', 'warning', 'warning'),
        trend: trendFor(h, 1280, 3820, 101),
        description: 'CloudWatch AllRequests.',
      },
      {
        id: 'errorRate',
        label: '4xx error ratio',
        value: pick(h, 0.04, 1.2, 1.4),
        unit: '%',
        delta: deltaCopy(h),
        color: signalColor(h),
        trend: trendFor(h, 0.04, 1.4, 102),
        description: 'CloudWatch 4xxErrors / AllRequests.',
      },
      {
        id: 'throughput',
        label: 'Replication lag',
        value: pick(h, 2, 96, 240),
        unit: 's',
        delta: pick(h, 'Stable', '+18s in last 5 min', '+38s in last 5 min'),
        color: signalColor(h),
        trend: trendFor(h, 2, 240, 103),
        description: 'CloudWatch ReplicationLatency, CRR-enabled buckets only.',
      },
    ],
    details: [
      { id: 'provider', label: 'Provider', value: 'AWS' },
      { id: 'bucketName', label: 'Bucket name', value: name },
      { id: 'region', label: 'Region', value: 'eu-west-1' },
      {
        id: 'storage',
        label: 'Storage size',
        value: pick(h, '128.4 TiB', '128.4 TiB', '129.1 TiB'),
      },
      { id: 'objects', label: 'Object count', value: '14.2 M' },
      { id: 'versioning', label: 'Versioning', value: 'Enabled' },
    ],
    ownership: cloudOwnership(),
    securityIssueCount: securityIssueCount(h, 'cloud'),
  };
  const metrics: MetricsTabData = {
    events: eventsByHealth(h),
    goldenSignals: [
      {
        id: 'requests',
        label: 'Request rate',
        unit: '/s',
        description: 'CloudWatch AllRequests.',
        series: [series('requests', 'Req/s', trendFor(h, 1280, 3820, 104))],
      },
      {
        id: '4xx',
        label: '4xx error ratio',
        unit: '%',
        threshold: 1,
        description: 'CloudWatch 4xxErrors ratio.',
        series: [series('4xx', '4xx %', trendFor(h, 0.04, 1.4, 105))],
      },
      {
        id: '5xx',
        label: '5xx error ratio',
        unit: '%',
        threshold: 1,
        description: 'CloudWatch 5xxErrors ratio.',
        series: [series('5xx', '5xx %', trendFor(h, 0.01, 1.8, 106))],
      },
    ],
    otherMetrics: [
      {
        id: 'replag',
        label: 'Replication lag',
        unit: 's',
        threshold: 60,
        description: 'CloudWatch ReplicationLatency.',
        series: [series('replag', 's', trendFor(h, 2, 240, 107))],
      },
      {
        id: 'firstbyte',
        label: 'First-byte latency',
        unit: 'ms',
        description: 'CloudWatch FirstByteLatency p50.',
        series: [series('firstbyte', 'ms', trendFor(h, 42, 86, 108))],
      },
    ],
  };
  const logs: LogRow[] = pick<LogRow[]>(
    h,
    [
      log(
        's3-1',
        `${today} @ 02:47:20.001`,
        'Info',
        'body.text',
        `PutObject 200 — key: receipts/2026/04/14/abc.json (4.2 KB)`
      ),
      log(
        's3-2',
        `${today} @ 02:47:09.084`,
        'Info',
        'body.text',
        `GetObject 200 — key: receipts/2026/04/14/def.json`
      ),
    ],
    [
      log(
        's3-1',
        `${today} @ 02:47:20.001`,
        'Warning',
        'body.text',
        `PutObject 403 AccessDenied — by ci-bot (12 retries)`
      ),
      log(
        's3-2',
        `${today} @ 02:47:09.084`,
        'Warning',
        'body.text',
        `Replication lag rising — 92s on eu-central-1 destination`
      ),
    ],
    [
      log(
        's3-1',
        `${today} @ 02:47:20.001`,
        'Error',
        'body.text',
        `PutObject 503 SlowDown — top prefix /receipts at 62% of writes`
      ),
      log(
        's3-2',
        `${today} @ 02:47:09.084`,
        'Error',
        'body.text',
        `PutObject 500 InternalError — second retry burst`
      ),
      log(
        's3-3',
        `${today} @ 02:46:58.421`,
        'Warning',
        'body.text',
        `Replication lag 4 min — RPO at risk`
      ),
    ]
  );
  const security = securityByHealth(
    h,
    [],
    [
      {
        id: `s3-cve-h1-${name}`,
        severity: 'High',
        title: `Bucket ${name} policy allows s3:GetObject from "*"`,
        detectedAt: `${today} @ 02:46:18`,
        source: 'CSPM',
        status: 'Open',
      },
      {
        id: `s3-cve-h2-${name}`,
        severity: 'Medium',
        title: 'Default encryption not enforced (BucketEncryption rule missing)',
        detectedAt: 'May 5, 2026, 18:42',
        source: 'CSPM',
        status: 'Open',
      },
    ]
  );
  return {
    overview,
    tabs: tabsOf(
      metrics,
      logs,
      alertsByHealth(name, h, 'cloud'),
      sharedCloudRelationships(name, h),
      security
    ),
  };
};

const buildMiddlewareTemplate = (
  name: string,
  h: EntityHealthVariant,
  typeLabel?: string
): { overview: EntityOverview; tabs: EntityTabsData } => {
  // Prefer the dataset's typeLabel ('Kafka' / 'RabbitMQ') over a name
  // sniff so a Kafka cluster named "rabbit-something" can't slip
  // through as RabbitMQ. The name fallback stays for legacy callers
  // that don't pass a typeLabel.
  const labelFromType = typeLabel ? typeLabel.toLowerCase() : '';
  const isRabbit = labelFromType
    ? labelFromType.includes('rabbit')
    : name.toLowerCase().includes('rabbit');
  const productLabel = isRabbit ? 'RabbitMQ' : 'Kafka';
  const tags: EntityTag[] = [
    { label: 'middleware', color: 'hollow' },
    { label: productLabel, color: 'hollow' },
    healthTag(h),
    { label: 'Production', color: 'hollow' },
  ];
  const narrative = {
    healthy: {
      headline: `${name} is healthy — consumer lag under 200 messages, brokers all leading their partitions.`,
      issues: [],
      nextSteps: [
        'Continue monitoring lag on the payments-events topic during peak hours.',
        'Verify retention policies are current on the next platform sync.',
      ],
    },
    atRisk: {
      headline: `${name} is at risk — consumer lag climbing past 5 k on payments-events.`,
      issues: [
        'Consumer lag at 5.2 k on payments-events — climbing 800/min',
        'Broker disk usage at 78% — within threshold but rising',
      ],
      nextSteps: [
        `Scale up the payments-worker consumer group.`,
        'Investigate the producer rate for an unexpected burst.',
      ],
    },
    unhealthy: {
      headline: `${name} is unhealthy — consumer lag at 64 k, 1 broker unreachable.`,
      issues: [
        'Consumer lag at 64 k on payments-events',
        '1 of 5 brokers unreachable since 02:46',
        'Producer error rate at 8% — clients failing to publish',
      ],
      nextSteps: [
        'Page the on-call streaming rotation.',
        'Initiate broker recovery (or trigger partition reassignment).',
        'Coordinate with payments-service to pause non-critical producers.',
      ],
    },
  };
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: summaryFromNarrative(h, narrative),
    goldenSignals: [
      {
        id: 'latency',
        label: 'Messages / s',
        value: pick(h, 2400, 2380, 1820),
        unit: '',
        delta: pick(h, 'Stable in last 5 min', 'Stable', 'Dropping — producer errors'),
        color: pick<GoldenSignalLevel>(h, 'success', 'success', 'danger'),
        trend: trendFor(h, 2400, 1820, 81, 'down'),
        description: 'Messages produced per second across all topics.',
      },
      {
        id: 'errorRate',
        label: 'Consumer lag p95',
        value: pick(h, 184, 5200, 64000),
        unit: '',
        delta: deltaCopy(h),
        color: signalColor(h),
        trend: trendFor(h, 184, 64000, 82),
        description: 'p95 consumer lag across all groups.',
      },
      {
        id: 'throughput',
        label: 'Brokers',
        value: pick(h, 5, 5, 4),
        unit: '/5',
        delta: pick(h, 'All brokers up', 'All brokers up', '1 broker unreachable'),
        color: pick<GoldenSignalLevel>(h, 'success', 'success', 'danger'),
        trend: trendFor(h, 5, 4, 83, 'down'),
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
    securityIssueCount: securityIssueCount(h, 'middleware'),
  };
  const metrics: MetricsTabData = {
    events: eventsByHealth(h),
    goldenSignals: [
      {
        id: 'throughput',
        label: 'Messages / s',
        unit: '',
        description: 'Messages per second across all topics.',
        series: [series('msgs', 'Messages / s', trendFor(h, 2400, 1820, 84, 'down'))],
      },
      {
        id: 'lag',
        label: 'Consumer lag p95',
        unit: '',
        threshold: 1000,
        description: 'p95 consumer lag.',
        series: [series('lag', 'Lag', trendFor(h, 184, 64000, 85))],
      },
      {
        id: 'brokers',
        label: 'Brokers up',
        unit: '',
        description: 'Number of brokers up.',
        series: [series('brokers', 'Brokers', trendFor(h, 5, 4, 86, 'down'))],
      },
    ],
    otherMetrics: [
      {
        id: 'disk',
        label: 'Broker disk usage',
        unit: '%',
        description: 'Average broker disk usage.',
        series: [series('disk', 'Disk %', trendFor(h, 52, 88, 87))],
      },
      {
        id: 'netIn',
        label: 'Broker network in',
        unit: 'MB/s',
        description: 'Inbound network throughput per broker.',
        series: [series('net-in', 'Network in', trendFor(h, 34, 78, 88))],
      },
    ],
  };
  const logs: LogRow[] = pick<LogRow[]>(
    h,
    [
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
    ],
    [
      log(
        'mw-1',
        `${today} @ 02:47:20.001`,
        'Warning',
        'body.text',
        `[Group] Consumer lag on payments-events: 5200 (rising)`
      ),
      log(
        'mw-2',
        `${today} @ 02:47:09.084`,
        'Warning',
        'body.text',
        `[Broker] Disk usage 78% — purging logs`
      ),
      log(
        'mw-3',
        `${today} @ 02:46:58.421`,
        'Info',
        'body.text',
        `[Controller] Reassigned 3 partitions across brokers`
      ),
    ],
    [
      log(
        'mw-1',
        `${today} @ 02:47:20.001`,
        'Error',
        'body.text',
        `[Broker] broker-3 unreachable (last seen 02:46:48)`
      ),
      log(
        'mw-2',
        `${today} @ 02:47:09.084`,
        'Error',
        'body.text',
        `[Producer] error: NotLeaderForPartition payments-events-12`
      ),
      log(
        'mw-3',
        `${today} @ 02:46:58.421`,
        'Warning',
        'body.text',
        `[Group] Consumer lag on payments-events: 24000 (rising)`
      ),
      log(
        'mw-4',
        `${today} @ 02:46:41.012`,
        'Info',
        'body.text',
        `[Controller] Reassigned 3 partitions across brokers`
      ),
    ]
  );
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-producer`,
      name: 'payments-service',
      health: relatedHealth(h),
      entityType: 'apm.service',
      relation: 'Produces — payments-events topic',
    },
    {
      id: `${name}-rel-consumer`,
      name: 'fraud-service',
      health: pick<RelatedEntityHealth>(h, 'Healthy', 'At risk', 'Unhealthy'),
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
      focalHealth: relatedHealth(h),
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
  const security = securityByHealth(
    h,
    [
      {
        id: 'mw-cve-1',
        severity: 'Low',
        title: 'TLS client auth disabled on internal listener',
        detectedAt: 'May 2, 2026, 14:05',
        source: 'CSPM',
        status: 'Triaged',
      },
    ],
    [
      {
        id: 'mw-cve-h1',
        severity: 'High',
        title: `Unauthorized topic access attempt on ${name}`,
        detectedAt: `${today} @ 02:46:58`,
        source: 'Detections',
        status: 'Open',
      },
      {
        id: 'mw-cve-h2',
        severity: 'Medium',
        title: 'Broker JVM heap dump generated 1 h ago — contains credentials',
        detectedAt: 'May 5, 2026, 18:42',
        source: 'CSPM',
        status: 'Open',
      },
    ]
  );
  return {
    overview,
    tabs: tabsOf(metrics, logs, alertsByHealth(name, h, 'middleware'), relationships, security),
  };
};

const buildLlmTemplate = (
  name: string,
  h: EntityHealthVariant,
  typeLabel?: string
): { overview: EntityOverview; tabs: EntityTabsData } => {
  // Prefer the dataset's typeLabel ('OpenAI' / 'Anthropic') over a
  // name sniff so an Anthropic model named with a non-`claude-` slug
  // (or vice versa) still picks the right provider tag.
  const labelFromType = typeLabel ? typeLabel.toLowerCase() : '';
  const isClaude = labelFromType
    ? labelFromType.includes('anthropic') || labelFromType.includes('claude')
    : name.toLowerCase().includes('claude');
  const provider = isClaude ? 'Anthropic' : 'OpenAI';
  const model = isClaude ? 'claude-3.5-sonnet' : 'gpt-4o-2024-05-13';
  const tags: EntityTag[] = [
    { label: 'llm', color: 'hollow' },
    { label: provider, color: 'hollow' },
    healthTag(h),
    { label: 'Production', color: 'hollow' },
  ];
  const narrative = {
    healthy: {
      headline: `${name} is healthy — token usage within plan, p95 latency at 1.4 s, no rate-limit breaches.`,
      issues: [],
      nextSteps: [
        'Continue monitoring token spend ahead of the next pricing review.',
        'Verify cache hit rate stays above 35% — current trend looks healthy.',
      ],
    },
    atRisk: {
      headline: `${name} is at risk — rate-limit usage climbing past 80%, latency drifting upward.`,
      issues: [
        'Rate-limit usage at 84% of per-minute quota',
        'p95 latency drifting from 1.4 s to 2.3 s over the last 10 min',
      ],
      nextSteps: [
        'Throttle or batch non-critical callers of ${name}.',
        `Request a rate-limit increase if the trend continues.`,
      ],
    },
    unhealthy: {
      headline: `${name} is unhealthy — rate-limit ceiling hit, callers retrying on 429s, latency at 4.8 s.`,
      issues: [
        'Rate-limit ceiling hit — 12% of calls returning 429',
        'p95 latency at 4.8 s — past SLO',
        'Spend rate doubled in the last 5 min (retry storm)',
      ],
      nextSteps: [
        'Shed non-critical callers of ${name} or queue requests at the agent layer.',
        'Engage the provider for an emergency rate-limit increase.',
        'Cap spend rate at the agent-builder service if cost is the priority.',
      ],
    },
  };
  const overview: EntityOverview = {
    displayName: name,
    lastUpdate: `${today} @ 02:47:30`,
    tags,
    summary: summaryFromNarrative(h, narrative),
    goldenSignals: [
      {
        id: 'latency',
        label: 'p95 latency',
        value: pick(h, 1.4, 2.3, 4.8),
        unit: 's',
        delta: deltaCopy(h),
        color: signalColor(h),
        trend: trendFor(h, 1.4, 4.8, 91),
        description: 'p95 LLM response latency.',
      },
      {
        id: 'errorRate',
        label: 'Tokens / min',
        value: pick(h, 184000, 246000, 312000),
        unit: '',
        delta: pick(h, 'Stable in last 5 min', '+33% in last 5 min', '+70% — retry storm'),
        color: pick<GoldenSignalLevel>(h, 'success', 'warning', 'danger'),
        trend: trendFor(h, 184000, 312000, 92),
        description: 'Tokens processed per minute.',
      },
      {
        id: 'throughput',
        label: 'Rate-limit usage',
        value: pick(h, 38, 84, 100),
        unit: '%',
        delta: pick(h, 'Stable in last 5 min', 'Climbing', 'Ceiling hit'),
        color: signalColor(h),
        trend: trendFor(h, 38, 100, 93),
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
    securityIssueCount: securityIssueCount(h, 'llm'),
  };
  const metrics: MetricsTabData = {
    events: eventsByHealth(h),
    goldenSignals: [
      {
        id: 'latency',
        label: 'p95 latency',
        unit: 's',
        threshold: 3,
        description: 'p95 LLM response latency.',
        series: [series('p95', 'p95 latency', trendFor(h, 1.4, 4.8, 94))],
      },
      {
        id: 'tpm',
        label: 'Tokens / min',
        unit: '',
        description: 'Tokens processed per minute.',
        series: [series('tpm', 'Tokens / min', trendFor(h, 184000, 312000, 95))],
      },
      {
        id: 'rateLimit',
        label: 'Rate-limit usage',
        unit: '%',
        threshold: 90,
        description: 'Current rate-limit usage.',
        series: [series('rate', 'Rate %', trendFor(h, 38, 100, 96))],
      },
    ],
    otherMetrics: [
      {
        id: 'cache',
        label: 'Cache hit rate',
        unit: '%',
        description: 'Prompt-cache hit rate.',
        series: [series('cache', 'Hit %', trendFor(h, 42, 18, 97, 'down'))],
      },
      {
        id: 'spend',
        label: 'Spend rate',
        unit: '$/min',
        description: 'Spend per minute.',
        series: [series('spend', 'Spend / min', trendFor(h, 1.6, 4.8, 98))],
      },
    ],
  };
  const logs: LogRow[] = pick<LogRow[]>(
    h,
    [
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
    ],
    [
      log(
        'llm-1',
        `${today} @ 02:47:20.001`,
        'Warning',
        'body.text',
        `[client] ${model} 429 — retrying after 612 ms`
      ),
      log(
        'llm-2',
        `${today} @ 02:47:09.084`,
        'Warning',
        'body.text',
        `[client] ${model} latency 2.31 s above SLO 2 s`
      ),
      log(
        'llm-3',
        `${today} @ 02:46:58.421`,
        'Info',
        'body.text',
        `[client] ${model} 200 — 1.44 s, 2210 tokens`
      ),
    ],
    [
      log(
        'llm-1',
        `${today} @ 02:47:20.001`,
        'Error',
        'body.text',
        `[client] ${model} 429 — rate-limit ceiling hit`
      ),
      log(
        'llm-2',
        `${today} @ 02:47:09.084`,
        'Error',
        'body.text',
        `[client] ${model} 504 — gateway timeout after 5 s`
      ),
      log(
        'llm-3',
        `${today} @ 02:46:58.421`,
        'Warning',
        'body.text',
        `[client] ${model} latency 4.81 s above SLO 3 s`
      ),
      log(
        'llm-4',
        `${today} @ 02:46:41.012`,
        'Info',
        'body.text',
        `[client] ${model} 200 — 1.18 s, 980 tokens`
      ),
    ]
  );
  const related: RelatedEntity[] = [
    {
      id: `${name}-rel-consumer-1`,
      name: 'summary-service',
      health: relatedHealth(h),
      entityType: 'apm.service',
      relation: 'Called by — incident summaries pipeline',
    },
    {
      id: `${name}-rel-consumer-2`,
      name: 'agent-builder',
      health: pick<RelatedEntityHealth>(h, 'Healthy', 'At risk', 'At risk'),
      entityType: 'apm.service',
      relation: 'Called by — agent flows',
    },
  ];
  const relationships: RelationshipsTabData = {
    topology: {
      focalHealth: relatedHealth(h),
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
  const security = securityByHealth(
    h,
    [],
    [
      {
        id: `llm-cve-h1-${name}`,
        severity: 'High',
        title: `Suspected prompt injection in calls to ${name} (last 1 h)`,
        detectedAt: `${today} @ 02:46:18`,
        source: 'Detections',
        status: 'Open',
      },
      {
        id: `llm-cve-h2-${name}`,
        severity: 'Medium',
        title: 'PII detected in prompt — redaction filter missed',
        detectedAt: `${today} @ 02:47:00`,
        source: 'Detections',
        status: 'Open',
      },
    ]
  );
  return {
    overview,
    tabs: tabsOf(metrics, logs, alertsByHealth(name, h, 'llm'), relationships, security),
  };
};

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Build a kind-shaped + health-tinted overview + tabs payload for a
 * non-PayFlow entity. The caller is expected to have resolved the entity's
 * kind beforehand (via {@link entityTypeToKind} or {@link inferEntityKind})
 * and the entity's health (via {@link normalizeEntityHealth}); pass
 * `undefined` for the kind to fall back on the generic mock shape upstream.
 *
 * `typeLabel` (the raw `.type` string from the entities dataset, e.g.
 * `'AWS EC2 Instance'`, `'AWS S3 bucket'`) is forwarded to kinds that
 * have sub-variants — currently just `'cloud'`, which fans out into
 * region / EC2 / Lambda / S3 templates so an EC2 instance no longer
 * gets rendered with the "AWS region" tag and a `Region:` label
 * showing the instance id.
 */
export const buildKindTemplate = (
  entityName: string,
  kind: EntityKind | undefined,
  health: EntityHealthVariant = 'healthy',
  typeLabel?: string
): { overview: EntityOverview; tabs: EntityTabsData } | undefined => {
  if (!kind) return undefined;
  switch (kind) {
    case 'service':
      return buildServiceTemplate(entityName, health);
    case 'host':
      // typeLabel drives the Bare-metal vs VM secondary tag.
      return buildHostTemplate(entityName, health, typeLabel);
    case 'node':
      return buildNodeTemplate(entityName, health);
    case 'pod':
    case 'container':
    case 'deployment':
      // typeLabel drives the kubernetes.{pod,container,deployment}
      // header tag so the three sub-kinds keep their own identity
      // even though they share this builder.
      return buildPodTemplate(entityName, health, typeLabel);
    case 'cluster':
      return buildClusterTemplate(entityName, health);
    case 'namespace':
      return buildNamespaceTemplate(entityName, health);
    case 'database':
      // typeLabel drives the engine tag (Postgres / MySQL / Mongo / …).
      return buildDatabaseTemplate(entityName, health, typeLabel);
    case 'cloud':
      return buildCloudTemplate(entityName, health, typeLabel);
    case 'middleware':
      // typeLabel disambiguates Kafka vs RabbitMQ ahead of the name
      // sniff used as a legacy fallback.
      return buildMiddlewareTemplate(entityName, health, typeLabel);
    case 'llm':
      // typeLabel disambiguates OpenAI vs Anthropic ahead of the name
      // sniff used as a legacy fallback.
      return buildLlmTemplate(entityName, health, typeLabel);
  }
};
