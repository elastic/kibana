/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Curated "PayFlow incident" demo storyline.
 *
 * The storyline drives Sofia (the on-call engineer in the demo) through a
 * four-hop investigation:
 *
 *   Hop 0  Discover Logs Explorer (six PayFlow log lines) -> click on a
 *          service name
 *   Hop 1  payments-service flyout -> Dependencies tab -> click
 *          payments-pod-7f9b2 in the Infrastructure section
 *   Hop 2  payments-pod-7f9b2 flyout -> Dependencies tab -> click
 *          node-prod-eu-04 in the Runs on section
 *   Hop 3  node-prod-eu-04 flyout -> Dependencies tab -> root cause
 *          (batch-settlement-job-xk2p degraded on the same node)
 *
 * Only the four click-path entities (`payments-service`, `checkout-service`,
 * `payments-pod-7f9b2`, `node-prod-eu-04`) get a full curated overview +
 * tabs payload. The supporting cast (stripe-api, payments-db, fraud-service,
 * payments-pod-3ac1f, batch-settlement-job-xk2p, fraud-pod-9a1c, k8s-eu-prod)
 * appears only as rows inside the click-path entities' Dependencies tabs
 * (non-clickable; just background detail Sofia narrates).
 */

import type { EntityOverview } from './fake_entity_overview';
import type {
  AlertsTabData,
  EntityTabsData,
  LogRow,
  MetricsTabData,
  RelatedEntity,
  RelationshipsTabData,
  SecurityTabData,
} from './fake_entity_tabs';
import { INCIDENT_DEPLOY_TIME_MS, INCIDENT_X_DOMAIN } from './time_domain';
// `chaos_mode` imports `STORY_CLICKABLE_NAMES` from this file but only
// reads it inside function bodies, so this back-reference resolves at
// runtime regardless of module init order.
import { getChaosModeEnabled } from './chaos_mode';

// ---------------------------------------------------------------------------
// Click-path set: rows whose names are in this set render as clickable links
// in the Dependencies tab, opening the next curated flyout.
// ---------------------------------------------------------------------------
export const STORY_CLICKABLE_NAMES: ReadonlySet<string> = new Set<string>([
  'payments-service',
  'checkout-service',
  'payments-pod-7f9b2',
  'node-prod-eu-04',
]);

/**
 * Wider set of entities the PayFlow incident visibly impacts. Includes
 * the four click-path flyouts plus the supporting cast that's seeded
 * `unhealthy` or `atRisk` in `fake_entities.ts` precisely because they
 * sit on the same blast radius as the v2.14.3 deploy:
 *
 *   - `batch-settlement-job-xk2p` — shares the same node as
 *     `payments-pod-7f9b2`, dragged into the incident by memory
 *     pressure (called out in node-prod-eu-04's narrative).
 *   - `k8s-eu-prod` — the EU prod cluster hosting every PayFlow
 *     workload; degrades whenever a node + namespaces inside it do.
 *   - `aws-eu-central-1` — the region the EU cluster runs in.
 *   - `payments`, `checkout`, `settlement` — the three k8s
 *     namespaces directly housing the PayFlow workloads.
 *
 * Used by the chaos-mode override ({@link getEffectiveEntityHealth})
 * to flip the *whole* PayFlow stack to healthy on rollback. Background
 * unhealthy entities outside this set (random EC2 / Lambda / S3 issues
 * elsewhere) stay as-is — the rollback heals PayFlow, not the rest of
 * the org.
 */
export const PAYFLOW_AFFECTED_NAMES: ReadonlySet<string> = new Set<string>([
  ...STORY_CLICKABLE_NAMES,
  'batch-settlement-job-xk2p',
  'k8s-eu-prod',
  'aws-eu-central-1',
  'payments',
  'checkout',
  'settlement',
]);

// ---------------------------------------------------------------------------
// Shared helpers: trends + relative timestamps anchored on the incident.
// ---------------------------------------------------------------------------

/**
 * Anchor timestamp ("now"-ish for the story). All log/alert/event timestamps
 * read 02:46-02:47 so the demo always tells the same story.
 */
const INCIDENT_DAY = 'Apr 14, 2026';

// X domain shared with `fake_entity_tabs.ts` and surfaced by every chart in
// the flyout. Each entry is an epoch-millisecond timestamp; index 16 is
// pinned to the v2.14.3 deployment time (02:46:41) so the post-incident
// spike always renders in the last third of the chart, lined up exactly
// under the deployment annotation marker.
const X_DOMAIN = INCIDENT_X_DOMAIN;

const seriesPoints = (ys: readonly number[]) => X_DOMAIN.map((x, i) => ({ x, y: ys[i] ?? 0 }));

// Trend shapes that match the incident narrative — quiet baseline until the
// deployment marker (~index 16), then a spike. Reused across overview and
// metrics tabs so the demo reads consistently.
const PAYMENTS_LATENCY_TREND = [
  0.18, 0.19, 0.2, 0.18, 0.19, 0.21, 0.2, 0.2, 0.18, 0.19, 0.2, 0.19, 0.2, 0.2, 0.21, 0.22, 0.42,
  0.85, 1.2, 1.45, 1.62, 1.74, 1.8, 1.84,
];
const PAYMENTS_ERROR_TREND = [
  0.4, 0.5, 0.4, 0.5, 0.6, 0.5, 0.4, 0.5, 0.4, 0.5, 0.4, 0.5, 0.4, 0.5, 0.6, 0.7, 1.8, 3.4, 5.1,
  6.4, 7.2, 7.8, 8.0, 8.2,
];
const PAYMENTS_THROUGHPUT_TREND = [
  1180, 1195, 1210, 1200, 1205, 1198, 1212, 1205, 1190, 1200, 1208, 1195, 1185, 1190, 1200, 1190,
  980, 820, 690, 560, 470, 420, 395, 380,
];
const PAYMENTS_POD_MEMORY_TREND = [
  41, 42, 41, 43, 44, 42, 43, 42, 41, 43, 42, 43, 42, 43, 44, 45, 58, 71, 82, 89, 93, 95, 96, 97,
];
const PAYMENTS_POD_CPU_TREND = [
  28, 30, 31, 29, 30, 32, 30, 29, 31, 30, 28, 30, 31, 30, 32, 33, 48, 62, 70, 74, 76, 77, 77, 78,
];
const NODE_MEMORY_TREND = [
  62, 63, 64, 64, 65, 66, 66, 67, 68, 69, 70, 71, 71, 72, 73, 74, 80, 85, 89, 91, 92, 93, 94, 94,
];
const NODE_CPU_TREND = [
  44, 45, 46, 45, 46, 47, 47, 48, 49, 50, 51, 52, 53, 53, 54, 55, 60, 64, 67, 69, 70, 71, 71, 71,
];
const CHECKOUT_LATENCY_TREND = [
  0.18, 0.19, 0.18, 0.2, 0.19, 0.2, 0.19, 0.18, 0.2, 0.19, 0.2, 0.18, 0.19, 0.2, 0.21, 0.22, 0.34,
  0.5, 0.62, 0.71, 0.78, 0.82, 0.84, 0.84,
];
const CHECKOUT_ERROR_TREND = [
  0.4, 0.5, 0.4, 0.5, 0.6, 0.5, 0.4, 0.5, 0.4, 0.5, 0.4, 0.5, 0.4, 0.5, 0.6, 0.7, 1.6, 3.2, 4.9,
  6.3, 7.1, 7.7, 7.9, 8.1,
];
const CHECKOUT_THROUGHPUT_TREND = [
  720, 728, 735, 730, 725, 732, 728, 722, 730, 728, 735, 730, 725, 722, 720, 725, 700, 680, 660,
  645, 630, 625, 622, 620,
];

// Timestamp at which the v2.14.3 deployment landed (02:46:41 on the incident
// day). Surfaced on every Metrics-tab chart as a vertical purple annotation,
// and aligned by construction with X_DOMAIN[16] so the spike "starts" right
// underneath the deploy marker.
const DEPLOYMENT_EVENT_X = INCIDENT_DEPLOY_TIME_MS;

// Shared deploy event surfaced on every PayFlow Metrics-tab chart. Hover copy
// is intentionally consistent across the 4 click-path entities so the user
// sees the same "this is what changed" story regardless of where they are in
// the investigation.
const DEPLOY_EVENT = {
  x: DEPLOYMENT_EVENT_X,
  header: 'Deployment — payments-service v2.14.3',
  details:
    `${INCIDENT_DAY} @ 02:46:41 UTC — rolled out by ci-bot (commit a3f17b2). ` +
    'Changes include connection-pool tuning and a new retry policy on the ' +
    'cart-service client. SLO breach started ~50s later.',
} as const;

// ---------------------------------------------------------------------------
// payments-service
// ---------------------------------------------------------------------------

const paymentsServiceOverview: EntityOverview = {
  displayName: 'payments-service',
  lastUpdate: `${INCIDENT_DAY} @ 02:47:31`,
  tags: [
    { label: 'apm.service', color: 'hollow' },
    { label: 'Critical', color: 'danger' },
    { label: 'Production', color: 'hollow' },
    { label: 'v2.14.3', color: 'hollow' },
  ],
  summary: {
    headline:
      'payments-service entered a critical state at 02:47:31 — error rate, p99 latency, and ' +
      'throughput all degraded shortly after v2.14.3 deployed at 02:46:41.',
    issues: [
      'Error rate crossed the 5% SLO at 02:47:31 (current: 8.2%)',
      'p99 latency above the 500ms target since 02:47:18 (current: 1.84s)',
      'Throughput collapsed from ~1,200/s to 380/s in under 60s',
      'payments-pod-7f9b2 has been OOMKilled 3 times in the last 5 minutes',
    ],
    nextSteps: [
      'Open payments-pod-7f9b2 from the Dependencies tab to inspect the OOM event',
      'Consider rolling back v2.14.3 if memory growth correlates with the new build',
      'Notify checkout-team — checkout-service is the only upstream caller affected',
    ],
    generatedAt: `${INCIDENT_DAY} @ 02:47:32`,
  },
  goldenSignals: [
    {
      id: 'latency',
      label: 'p99 latency',
      value: 1.84,
      unit: 's',
      delta: '+1.66s since 02:46:41',
      color: 'danger',
      trend: PAYMENTS_LATENCY_TREND,
      description: 'p99 end-to-end latency across payments-service instances.',
    },
    {
      id: 'errorRate',
      label: 'Error rate',
      value: 8.2,
      unit: '%',
      delta: '+7.7% since 02:46:41',
      color: 'danger',
      trend: PAYMENTS_ERROR_TREND,
      description: 'Percentage of failed requests (status >= 500 or trace error tag).',
    },
    {
      id: 'throughput',
      label: 'Throughput',
      value: 380,
      unit: 'req/s',
      delta: '-820 req/s since 02:46:41',
      color: 'warning',
      trend: PAYMENTS_THROUGHPUT_TREND,
      description: 'Requests per second served by payments-service across all instances.',
    },
  ],
  details: [
    { id: 'entityId', label: 'Entity id', value: 'apm.service:payments-service:production' },
    { id: 'environment', label: 'Environment', value: 'production' },
    { id: 'version', label: 'Version', value: 'v2.14.3 (deployed 02:46:41)' },
    { id: 'previousVersion', label: 'Previous version', value: 'v2.14.2' },
    { id: 'instances', label: 'Instances', value: '2 pods (1 critical, 1 healthy)' },
  ],
  ownership: [
    { id: 'team', label: 'payments-team', value: 'slack #payments-oncall' },
    { id: 'contact', label: 'Service owner', value: 'paola.rojas@payflow.com' },
  ],
  securityIssueCount: 0,
};

const paymentsServiceMetrics: MetricsTabData = {
  events: [DEPLOY_EVENT],
  goldenSignals: [
    {
      id: 'latency',
      label: 'p99 latency',
      unit: 's',
      threshold: 0.5,
      description: 'p99 end-to-end latency across payments-service instances.',
      series: [{ id: 'p99', label: 'p99 (s)', points: seriesPoints(PAYMENTS_LATENCY_TREND) }],
    },
    {
      id: 'errorRate',
      label: 'Error rate',
      unit: '%',
      threshold: 5,
      description: 'Percentage of failed requests (status >= 500 or trace error tag).',
      series: [
        { id: 'error-pct', label: 'Error rate (%)', points: seriesPoints(PAYMENTS_ERROR_TREND) },
      ],
    },
    {
      id: 'throughput',
      label: 'Throughput',
      unit: 'req/s',
      description: 'Requests per second across all payments-service instances.',
      series: [
        {
          id: 'rps',
          label: 'Requests / s',
          points: seriesPoints(PAYMENTS_THROUGHPUT_TREND),
        },
      ],
    },
  ],
  otherMetrics: [
    {
      id: 'downstream-stripe',
      label: 'stripe-api outbound latency',
      unit: 'ms',
      description: 'Outbound span latency from payments-service to stripe-api.',
      series: [
        {
          id: 'stripe-latency',
          label: 'stripe-api (ms)',
          points: seriesPoints([
            46, 47, 48, 46, 47, 48, 47, 46, 48, 47, 48, 46, 47, 48, 47, 48, 48, 49, 48, 48, 48, 48,
            48, 48,
          ]),
        },
      ],
    },
    {
      id: 'downstream-db',
      label: 'payments-db latency',
      unit: 'ms',
      description: 'Outbound span latency from payments-service to payments-db.',
      series: [
        {
          id: 'db-latency',
          label: 'payments-db (ms)',
          points: seriesPoints([
            4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
          ]),
        },
      ],
    },
  ],
};

const paymentsServiceLogs: LogRow[] = [
  {
    id: 'pl-1',
    timestamp: `${INCIDENT_DAY} @ 02:46:41.012`,
    severity: 'Info',
    attribute: 'body.text',
    summary: 'Deployment completed v2.14.3',
  },
  {
    id: 'pl-2',
    timestamp: `${INCIDENT_DAY} @ 02:46:58.421`,
    severity: 'Warning',
    attribute: 'body.text',
    summary: 'Memory usage at 97% of limit',
  },
  {
    id: 'pl-3',
    timestamp: `${INCIDENT_DAY} @ 02:47:09.084`,
    severity: 'Error',
    attribute: 'body.text',
    summary: 'OOMKilled — container restarting',
  },
  {
    id: 'pl-4',
    timestamp: `${INCIDENT_DAY} @ 02:47:18.221`,
    severity: 'Warning',
    attribute: 'body.text',
    summary: 'Retry attempt 3/3 for payment provider',
  },
  {
    id: 'pl-5',
    timestamp: `${INCIDENT_DAY} @ 02:47:21.604`,
    severity: 'Error',
    attribute: 'body.text',
    summary: 'Timeout connecting to stripe-api after 5000ms',
  },
  {
    id: 'pl-6',
    timestamp: `${INCIDENT_DAY} @ 02:47:28.118`,
    severity: 'Info',
    attribute: 'body.text',
    summary: '/var/log/pods/payments_payments-service-7f9b2_oom_restart.log rotated',
  },
];

const paymentsServiceAlerts: AlertsTabData = {
  activeCount: 4,
  totalCount: 4,
  overTime: seriesPoints([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 3, 3, 4, 4]),
  details: [
    {
      id: 'pa-1',
      status: 'Active',
      triggeredAt: `${INCIDENT_DAY} @ 02:47:31`,
      ruleName: 'Service error rate SLO',
      reason: 'Error rate on payments-service crossed 5% (current: 8.2%)',
    },
    {
      id: 'pa-2',
      status: 'Active',
      triggeredAt: `${INCIDENT_DAY} @ 02:47:18`,
      ruleName: 'Service p99 latency SLO',
      reason: 'p99 latency on payments-service above 500ms (current: 1.84s)',
    },
    {
      id: 'pa-3',
      status: 'Active',
      triggeredAt: `${INCIDENT_DAY} @ 02:47:09`,
      ruleName: 'Pod restart rate',
      reason: 'payments-pod-7f9b2 restarted 3 times in 5 minutes',
    },
    {
      id: 'pa-4',
      status: 'Active',
      triggeredAt: `${INCIDENT_DAY} @ 02:46:58`,
      ruleName: 'Pod memory above limit',
      reason: 'payments-pod-7f9b2 memory at 97% of limit',
    },
  ],
};

const paymentsServiceRelated: RelatedEntity[] = [
  // Called by (upstream)
  {
    id: 'ps-rel-checkout',
    name: 'checkout-service',
    health: 'Unhealthy',
    entityType: 'apm.service',
    relation: 'Called by',
  },
  // Calls (downstream)
  {
    id: 'ps-rel-stripe',
    name: 'stripe-api',
    health: 'Healthy',
    entityType: 'external_service (inferred)',
    relation: 'Calls — 48ms',
  },
  {
    id: 'ps-rel-db',
    name: 'payments-db',
    health: 'Healthy',
    entityType: 'database (postgresql)',
    relation: 'Calls — 4ms',
  },
  {
    id: 'ps-rel-fraud',
    name: 'fraud-service',
    health: 'Healthy',
    entityType: 'apm.service',
    relation: 'Calls — 18ms',
  },
  // Infrastructure (Sofia's next hop is here)
  {
    id: 'ps-rel-pod-critical',
    name: 'payments-pod-7f9b2',
    health: 'Unhealthy',
    entityType: 'kubernetes.pod',
    relation: 'Runs on — OOMKilled, 3 restarts',
  },
  {
    id: 'ps-rel-pod-healthy',
    name: 'payments-pod-3ac1f',
    health: 'Healthy',
    entityType: 'kubernetes.pod',
    relation: 'Runs on — healthy, 41% memory',
  },
];

const paymentsServiceRelationships: RelationshipsTabData = {
  topology: {
    focalHealth: 'Unhealthy',
    nodes: [
      { id: 'focal', label: 'payments-service', focal: true },
      { id: 'cart', label: 'checkout-service' },
      { id: 'payment', label: 'stripe-api' },
      { id: 'redis', label: 'payments-db' },
      { id: 'recommendation', label: 'fraud-service' },
      { id: 'product-catalog', label: 'payments-pod-7f9b2' },
      { id: 'currency', label: 'payments-pod-3ac1f' },
    ],
    edges: [
      { from: 'cart', to: 'focal', emphasized: true },
      { from: 'focal', to: 'payment', emphasized: true },
      { from: 'focal', to: 'redis', emphasized: true },
      { from: 'focal', to: 'recommendation', emphasized: true },
      { from: 'focal', to: 'product-catalog' },
      { from: 'focal', to: 'currency' },
    ],
  },
  related: paymentsServiceRelated,
};

const paymentsServiceSecurity: SecurityTabData = {
  riskScore: 0,
  riskLevel: 'Low',
  lastEvent: 'No security events',
  issues: [],
};

const paymentsServiceTabsData: EntityTabsData = {
  metrics: paymentsServiceMetrics,
  logs: paymentsServiceLogs,
  alerts: paymentsServiceAlerts,
  relationships: paymentsServiceRelationships,
  security: paymentsServiceSecurity,
};

// ---------------------------------------------------------------------------
// checkout-service
// ---------------------------------------------------------------------------

const checkoutServiceOverview: EntityOverview = {
  displayName: 'checkout-service',
  lastUpdate: `${INCIDENT_DAY} @ 02:47:31`,
  tags: [
    { label: 'apm.service', color: 'hollow' },
    { label: 'Critical', color: 'danger' },
    { label: 'Production', color: 'hollow' },
  ],
  summary: {
    headline:
      'checkout-service entered a critical state at 02:47:31 — failures on /checkout/confirm ' +
      'started right after upstream payments-service began returning 503s.',
    issues: [
      'Error rate on /checkout/confirm crossed the 5% SLO (current: 8.1%)',
      'p99 latency on /checkout/confirm at 841ms (target: 500ms)',
      'Throughput dropping (~620/s, was ~730/s before 02:46:41)',
      'All errors trace back to upstream payments-service returning 503',
    ],
    nextSteps: [
      'Open payments-service from the Dependencies tab — the root cause lives there',
      'Keep checkout-service deployment frozen until payments-service stabilizes',
    ],
    generatedAt: `${INCIDENT_DAY} @ 02:47:32`,
  },
  goldenSignals: [
    {
      id: 'latency',
      label: 'p99 latency',
      value: 0.841,
      unit: 's',
      delta: '+0.66s since 02:46:41',
      color: 'danger',
      trend: CHECKOUT_LATENCY_TREND,
      description: 'p99 end-to-end latency across checkout-service instances.',
    },
    {
      id: 'errorRate',
      label: 'Error rate',
      value: 8.1,
      unit: '%',
      delta: '+7.6% since 02:46:41',
      color: 'danger',
      trend: CHECKOUT_ERROR_TREND,
      description: 'Percentage of failed checkout-service requests.',
    },
    {
      id: 'throughput',
      label: 'Throughput',
      value: 620,
      unit: 'req/s',
      delta: '-110 req/s since 02:46:41',
      color: 'warning',
      trend: CHECKOUT_THROUGHPUT_TREND,
      description: 'Requests per second across checkout-service instances.',
    },
  ],
  details: [
    { id: 'entityId', label: 'Entity id', value: 'apm.service:checkout-service:production' },
    { id: 'environment', label: 'Environment', value: 'production' },
    { id: 'version', label: 'Version', value: 'v3.6.1 (stable, deployed 4d ago)' },
    { id: 'instances', label: 'Instances', value: '6 pods (all healthy)' },
  ],
  ownership: [
    { id: 'team', label: 'checkout-team', value: 'slack #checkout-oncall' },
    { id: 'contact', label: 'Service owner', value: 'pierre.weber@payflow.com' },
  ],
  securityIssueCount: 0,
};

const checkoutServiceMetrics: MetricsTabData = {
  events: [DEPLOY_EVENT],
  goldenSignals: [
    {
      id: 'latency',
      label: 'p99 latency',
      unit: 's',
      threshold: 0.5,
      description: 'p99 end-to-end latency across checkout-service instances.',
      series: [{ id: 'p99', label: 'p99 (s)', points: seriesPoints(CHECKOUT_LATENCY_TREND) }],
    },
    {
      id: 'errorRate',
      label: 'Error rate',
      unit: '%',
      threshold: 5,
      description: 'Percentage of failed checkout-service requests.',
      series: [
        { id: 'error-pct', label: 'Error rate (%)', points: seriesPoints(CHECKOUT_ERROR_TREND) },
      ],
    },
    {
      id: 'throughput',
      label: 'Throughput',
      unit: 'req/s',
      description: 'Requests per second across checkout-service instances.',
      series: [
        { id: 'rps', label: 'Requests / s', points: seriesPoints(CHECKOUT_THROUGHPUT_TREND) },
      ],
    },
  ],
  otherMetrics: [],
};

const checkoutServiceRelated: RelatedEntity[] = [
  {
    id: 'cs-rel-payments',
    name: 'payments-service',
    health: 'Unhealthy',
    entityType: 'apm.service',
    relation: 'Calls — returning 503s',
  },
];

const checkoutServiceRelationships: RelationshipsTabData = {
  topology: {
    focalHealth: 'Unhealthy',
    nodes: [
      { id: 'focal', label: 'checkout-service', focal: true },
      { id: 'payment', label: 'payments-service' },
    ],
    edges: [{ from: 'focal', to: 'payment', emphasized: true }],
  },
  related: checkoutServiceRelated,
};

const checkoutServiceAlerts: AlertsTabData = {
  activeCount: 2,
  totalCount: 2,
  overTime: seriesPoints([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2]),
  details: [
    {
      id: 'ca-1',
      status: 'Active',
      triggeredAt: `${INCIDENT_DAY} @ 02:47:31`,
      ruleName: 'Service error rate SLO',
      reason: 'Error rate on checkout-service crossed 5% (current: 8.1%)',
    },
    {
      id: 'ca-2',
      status: 'Active',
      triggeredAt: `${INCIDENT_DAY} @ 02:47:21`,
      ruleName: 'Upstream availability',
      reason: 'checkout-service receiving 503 from upstream payments-service',
    },
  ],
};

const checkoutServiceLogs: LogRow[] = [
  {
    id: 'cl-1',
    timestamp: `${INCIDENT_DAY} @ 02:47:31.842`,
    severity: 'Error',
    attribute: 'body.text',
    summary: 'POST /checkout/confirm 503 upstream error 841ms',
  },
  {
    id: 'cl-2',
    timestamp: `${INCIDENT_DAY} @ 02:47:28.612`,
    severity: 'Error',
    attribute: 'body.text',
    summary: 'POST /checkout/confirm 503 upstream error 812ms',
  },
];

const checkoutServiceSecurity: SecurityTabData = {
  riskScore: 0,
  riskLevel: 'Low',
  lastEvent: 'No security events',
  issues: [],
};

const checkoutServiceTabsData: EntityTabsData = {
  metrics: checkoutServiceMetrics,
  logs: checkoutServiceLogs,
  alerts: checkoutServiceAlerts,
  relationships: checkoutServiceRelationships,
  security: checkoutServiceSecurity,
};

// ---------------------------------------------------------------------------
// payments-pod-7f9b2 (the OOMKilled pod)
// ---------------------------------------------------------------------------

const paymentsPodOverview: EntityOverview = {
  displayName: 'payments-pod-7f9b2',
  lastUpdate: `${INCIDENT_DAY} @ 02:47:31`,
  tags: [
    { label: 'kubernetes.pod', color: 'hollow' },
    { label: 'Critical', color: 'danger' },
    { label: 'OOMKilled', color: 'danger' },
    { label: 'payments / k8s-eu-prod', color: 'hollow' },
  ],
  summary: {
    headline:
      'payments-pod-7f9b2 is OOMKilling repeatedly — memory climbed from 44% to 97% the instant ' +
      'v2.14.3 deployed at 02:46:41, and the pod has restarted 3 times in 5 minutes.',
    issues: [
      'Memory at 97% of pod limit (warning threshold 90%)',
      'Container OOMKilled 3 times since 02:47:09 (exit code 137)',
      'CPU at 78% — climbing alongside memory',
      'Runs on node-prod-eu-04, which itself reports memory pressure (94%)',
    ],
    nextSteps: [
      'Open node-prod-eu-04 from the Dependencies tab to see what else competes for memory',
      'Raise the memory limit on the payments-service deployment or evict noisy neighbours',
      'Profile the v2.14.3 build for a memory leak before rolling forward',
    ],
    generatedAt: `${INCIDENT_DAY} @ 02:47:32`,
  },
  goldenSignals: [
    {
      id: 'latency',
      label: 'Memory usage',
      value: 97,
      unit: '%',
      delta: '+56pp since 02:46:41',
      color: 'danger',
      trend: PAYMENTS_POD_MEMORY_TREND,
      description: 'Container memory usage as a percentage of the pod memory limit.',
    },
    {
      id: 'errorRate',
      label: 'Restart count',
      value: 3,
      unit: '',
      delta: '3 restarts in last 5 min',
      color: 'danger',
      trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 3],
      description: 'Container restart count over the selected window.',
    },
    {
      id: 'throughput',
      label: 'CPU usage',
      value: 78,
      unit: '%',
      delta: '+45pp since 02:46:41',
      color: 'warning',
      trend: PAYMENTS_POD_CPU_TREND,
      description: 'Container CPU usage as a percentage of the pod CPU limit.',
    },
  ],
  details: [
    { id: 'entityId', label: 'Entity id', value: 'kubernetes.pod:payments-pod-7f9b2' },
    { id: 'namespace', label: 'Namespace', value: 'payments' },
    { id: 'cluster', label: 'Cluster', value: 'k8s-eu-prod' },
    { id: 'node', label: 'Node', value: 'node-prod-eu-04' },
    { id: 'phase', label: 'Phase', value: 'OOMKill' },
    { id: 'restartCount', label: 'Restart count', value: '3 (last 5 min)' },
    { id: 'image', label: 'Container image', value: 'payflow/payments-service:v2.14.3' },
  ],
  ownership: [
    { id: 'team', label: 'payments-team', value: 'slack #payments-oncall' },
    { id: 'platform', label: 'Platform owner', value: 'slack #platform-eu' },
  ],
  securityIssueCount: 0,
};

const paymentsPodMetrics: MetricsTabData = {
  events: [DEPLOY_EVENT],
  goldenSignals: [
    {
      id: 'latency',
      label: 'Memory usage',
      unit: '%',
      threshold: 90,
      description: 'Container memory usage as a percentage of the pod memory limit.',
      series: [
        { id: 'memory', label: 'Memory (%)', points: seriesPoints(PAYMENTS_POD_MEMORY_TREND) },
      ],
    },
    {
      id: 'errorRate',
      label: 'CPU usage',
      unit: '%',
      threshold: 80,
      description: 'Container CPU usage as a percentage of the pod CPU limit.',
      series: [{ id: 'cpu', label: 'CPU (%)', points: seriesPoints(PAYMENTS_POD_CPU_TREND) }],
    },
    {
      id: 'throughput',
      label: 'Restarts',
      unit: '',
      description: 'Cumulative restart count over the selected window.',
      series: [
        {
          id: 'restarts',
          label: 'Restarts',
          points: seriesPoints([
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 3,
          ]),
        },
      ],
    },
  ],
  otherMetrics: [],
};

const paymentsPodLogs: LogRow[] = [
  {
    id: 'pp-1',
    timestamp: `${INCIDENT_DAY} @ 02:47:09.084`,
    severity: 'Error',
    attribute: 'body.text',
    summary: 'Container payments-service OOMKilled (exit_code=137)',
  },
  {
    id: 'pp-2',
    timestamp: `${INCIDENT_DAY} @ 02:46:58.421`,
    severity: 'Warning',
    attribute: 'body.text',
    summary: 'Memory usage at 97% of limit',
  },
  {
    id: 'pp-3',
    timestamp: `${INCIDENT_DAY} @ 02:46:41.012`,
    severity: 'Info',
    attribute: 'body.text',
    summary: 'kubelet: started container payments-service from image v2.14.3',
  },
];

const paymentsPodAlerts: AlertsTabData = {
  activeCount: 3,
  totalCount: 3,
  overTime: seriesPoints([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 3]),
  details: [
    {
      id: 'pp-a1',
      status: 'Active',
      triggeredAt: `${INCIDENT_DAY} @ 02:47:09`,
      ruleName: 'Pod OOMKilled',
      reason: 'payments-pod-7f9b2 OOMKilled — 3 restarts in 5 minutes',
    },
    {
      id: 'pp-a2',
      status: 'Active',
      triggeredAt: `${INCIDENT_DAY} @ 02:46:58`,
      ruleName: 'Pod memory above limit',
      reason: 'payments-pod-7f9b2 memory at 97% of limit',
    },
    {
      id: 'pp-a3',
      status: 'Active',
      triggeredAt: `${INCIDENT_DAY} @ 02:47:02`,
      ruleName: 'Pod restart rate',
      reason: 'payments-pod-7f9b2 restart rate above threshold',
    },
  ],
};

const paymentsPodRelated: RelatedEntity[] = [
  {
    id: 'pp-rel-node',
    name: 'node-prod-eu-04',
    health: 'Unhealthy',
    entityType: 'kubernetes.node',
    relation: 'Runs on — memory 94%, pressure: true',
  },
  {
    id: 'pp-rel-svc',
    name: 'payments-service',
    health: 'Unhealthy',
    entityType: 'apm.service',
    relation: 'Runs — v2.14.3',
  },
  {
    id: 'pp-rel-cluster',
    name: 'k8s-eu-prod',
    health: 'At risk',
    entityType: 'kubernetes.cluster',
    relation: 'Member of — 48 nodes, 600+ pods',
  },
];

const paymentsPodRelationships: RelationshipsTabData = {
  topology: {
    focalHealth: 'Unhealthy',
    nodes: [
      { id: 'focal', label: 'payments-pod-7f9b2', focal: true },
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
  related: paymentsPodRelated,
};

const paymentsPodSecurity: SecurityTabData = {
  riskScore: 0,
  riskLevel: 'Low',
  lastEvent: 'No security events',
  issues: [],
};

const paymentsPodTabsData: EntityTabsData = {
  metrics: paymentsPodMetrics,
  logs: paymentsPodLogs,
  alerts: paymentsPodAlerts,
  relationships: paymentsPodRelationships,
  security: paymentsPodSecurity,
};

// ---------------------------------------------------------------------------
// node-prod-eu-04 (the underlying node — where Sofia finds the root cause)
// ---------------------------------------------------------------------------

const nodeOverview: EntityOverview = {
  displayName: 'node-prod-eu-04',
  lastUpdate: `${INCIDENT_DAY} @ 02:47:31`,
  tags: [
    { label: 'kubernetes.node', color: 'hollow' },
    { label: 'Critical', color: 'danger' },
    { label: 'Memory pressure', color: 'danger' },
    { label: 'AMS-DC2 / k8s-eu-prod', color: 'hollow' },
  ],
  summary: {
    headline:
      'node-prod-eu-04 is under memory pressure (94% used, only 3.1GB of 32GB allocatable) — ' +
      'the node was already primed for OOM well before payments-service v2.14.3 deployed at ' +
      '02:46:41.',
    issues: [
      'Memory at 94% of node capacity (allocatable: 3.1GB / 32GB)',
      'NodeMemoryPressure condition reported true since 02:47:20',
      'batch-settlement-job-xk2p has been holding ~22GB since 02:30 (degraded)',
      'payments-pod-7f9b2 OOMKilled 3× on this node since the deployment',
    ],
    nextSteps: [
      'Drain batch-settlement-job-xk2p or migrate it to a node with more headroom',
      'Cordon node-prod-eu-04 until pressure clears to stop new pods landing here',
      'Add a node to the k8s-eu-prod cluster if the batch job needs to keep running',
    ],
    generatedAt: `${INCIDENT_DAY} @ 02:47:32`,
  },
  goldenSignals: [
    {
      id: 'latency',
      label: 'Memory used',
      value: 94,
      unit: '%',
      delta: '+12pp since 02:30',
      color: 'danger',
      trend: NODE_MEMORY_TREND,
      description: 'Node memory used as a percentage of total node memory.',
    },
    {
      id: 'errorRate',
      label: 'Allocatable remaining',
      value: 3.1,
      unit: 'GB',
      delta: '-15GB since 02:30',
      color: 'danger',
      trend: [
        18.1, 17.5, 17.0, 16.8, 16.2, 15.5, 14.8, 14.0, 13.2, 12.5, 11.6, 10.7, 10.0, 9.3, 8.5, 7.8,
        6.4, 5.2, 4.4, 3.9, 3.5, 3.3, 3.2, 3.1,
      ],
      description: 'Allocatable memory remaining out of 32GB total node memory.',
    },
    {
      id: 'throughput',
      label: 'CPU used',
      value: 71,
      unit: '%',
      delta: '+24pp since 02:30',
      color: 'warning',
      trend: NODE_CPU_TREND,
      description: 'Node CPU used as a percentage of total node CPU.',
    },
  ],
  details: [
    { id: 'entityId', label: 'Entity id', value: 'kubernetes.node:node-prod-eu-04' },
    { id: 'cluster', label: 'Cluster', value: 'k8s-eu-prod' },
    { id: 'datacentre', label: 'Datacentre', value: 'AMS-DC2 (Amsterdam)' },
    { id: 'memory', label: 'Memory', value: '32 GB (3.1 GB allocatable)' },
    { id: 'cpu', label: 'CPU', value: '16 vCPU (71% in use)' },
    { id: 'pods', label: 'Pods running', value: '38 (1 critical, 1 degraded, 36 healthy)' },
    { id: 'pressure', label: 'Memory pressure', value: 'true' },
  ],
  ownership: [
    { id: 'team', label: 'platform-team', value: 'slack #platform-eu' },
    { id: 'contact', label: 'Platform owner', value: 'sofia.bauer@payflow.com' },
  ],
  securityIssueCount: 0,
};

const nodeMetrics: MetricsTabData = {
  events: [DEPLOY_EVENT],
  goldenSignals: [
    {
      id: 'latency',
      label: 'Memory used',
      unit: '%',
      threshold: 90,
      description: 'Node memory used as a percentage of total node memory.',
      series: [{ id: 'mem', label: 'Memory (%)', points: seriesPoints(NODE_MEMORY_TREND) }],
    },
    {
      id: 'errorRate',
      label: 'CPU used',
      unit: '%',
      threshold: 85,
      description: 'Node CPU used as a percentage of total node CPU.',
      series: [{ id: 'cpu', label: 'CPU (%)', points: seriesPoints(NODE_CPU_TREND) }],
    },
    {
      id: 'throughput',
      label: 'Pods running',
      unit: '',
      description: 'Number of pods scheduled on this node.',
      series: [
        {
          id: 'pods',
          label: 'Pods',
          points: seriesPoints([
            34, 35, 35, 36, 36, 37, 37, 37, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38,
            38, 38,
          ]),
        },
      ],
    },
  ],
  otherMetrics: [],
};

const nodeLogs: LogRow[] = [
  {
    id: 'nl-1',
    timestamp: `${INCIDENT_DAY} @ 02:47:20.001`,
    severity: 'Warning',
    attribute: 'body.text',
    summary: 'kubelet: NodeMemoryPressure condition true',
  },
  {
    id: 'nl-2',
    timestamp: `${INCIDENT_DAY} @ 02:47:09.084`,
    severity: 'Error',
    attribute: 'body.text',
    summary: 'kubelet: Killing container payments-service: out of memory',
  },
  {
    id: 'nl-3',
    timestamp: `${INCIDENT_DAY} @ 02:30:12.310`,
    severity: 'Info',
    attribute: 'body.text',
    summary: 'kubelet: scheduled pod settlement/batch-settlement-job-xk2p (memory: 22Gi)',
  },
];

const nodeAlerts: AlertsTabData = {
  activeCount: 2,
  totalCount: 2,
  overTime: seriesPoints([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2]),
  details: [
    {
      id: 'na-1',
      status: 'Active',
      triggeredAt: `${INCIDENT_DAY} @ 02:47:20`,
      ruleName: 'Node memory pressure',
      reason: 'node-prod-eu-04 reports NodeMemoryPressure=true',
    },
    {
      id: 'na-2',
      status: 'Active',
      triggeredAt: `${INCIDENT_DAY} @ 02:47:14`,
      ruleName: 'Node allocatable memory',
      reason: 'node-prod-eu-04 allocatable memory below 10% (current: 3.1GB / 32GB)',
    },
  ],
};

const nodeRelated: RelatedEntity[] = [
  // Pods on the node — the root-cause reveal lives here
  {
    id: 'n-rel-pod-critical',
    name: 'payments-pod-7f9b2',
    health: 'Unhealthy',
    entityType: 'kubernetes.pod',
    relation: 'Pods — payments namespace, OOMKilled',
  },
  {
    id: 'n-rel-pod-batch',
    name: 'batch-settlement-job-xk2p',
    health: 'At risk',
    entityType: 'kubernetes.pod',
    relation: 'Pods — settlement namespace, 68% memory (root cause)',
  },
  {
    id: 'n-rel-pod-fraud',
    name: 'fraud-pod-9a1c',
    health: 'Healthy',
    entityType: 'kubernetes.pod',
    relation: 'Pods — fraud namespace, 22% memory',
  },
  // Cluster
  {
    id: 'n-rel-cluster',
    name: 'k8s-eu-prod',
    health: 'At risk',
    entityType: 'kubernetes.cluster',
    relation: 'Member of — 48 nodes, 600+ pods',
  },
];

const nodeRelationships: RelationshipsTabData = {
  topology: {
    focalHealth: 'Unhealthy',
    nodes: [
      { id: 'focal', label: 'node-prod-eu-04', focal: true },
      { id: 'cart', label: 'payments-pod-7f9b2' },
      { id: 'payment', label: 'batch-settlement-job-xk2p' },
      { id: 'recommendation', label: 'fraud-pod-9a1c' },
      { id: 'ad', label: 'k8s-eu-prod' },
    ],
    edges: [
      { from: 'focal', to: 'cart', emphasized: true },
      { from: 'focal', to: 'payment', emphasized: true },
      { from: 'focal', to: 'recommendation' },
      { from: 'focal', to: 'ad' },
    ],
  },
  related: nodeRelated,
};

const nodeSecurity: SecurityTabData = {
  riskScore: 0,
  riskLevel: 'Low',
  lastEvent: 'No security events',
  issues: [],
};

const nodeTabsData: EntityTabsData = {
  metrics: nodeMetrics,
  logs: nodeLogs,
  alerts: nodeAlerts,
  relationships: nodeRelationships,
  security: nodeSecurity,
};

// ---------------------------------------------------------------------------
// Public lookup
// ---------------------------------------------------------------------------

const STORY_OVERVIEWS: Record<string, EntityOverview> = {
  'payments-service': paymentsServiceOverview,
  'checkout-service': checkoutServiceOverview,
  'payments-pod-7f9b2': paymentsPodOverview,
  'node-prod-eu-04': nodeOverview,
};

const STORY_TABS_DATA: Record<string, EntityTabsData> = {
  'payments-service': paymentsServiceTabsData,
  'checkout-service': checkoutServiceTabsData,
  'payments-pod-7f9b2': paymentsPodTabsData,
  'node-prod-eu-04': nodeTabsData,
};

/**
 * Returns the curated PayFlow overview for `entityName`, or `undefined`
 * when chaos mode is OFF (rollback) so the caller falls back to the
 * regular kind-template path.
 */
export const getStoryOverview = (entityName: string): EntityOverview | undefined => {
  if (!getChaosModeEnabled()) return undefined;
  return STORY_OVERVIEWS[entityName];
};

/**
 * Returns the curated PayFlow tab payload for `entityName`, or
 * `undefined` when chaos mode is OFF (rollback).
 */
export const getStoryTabsData = (entityName: string): EntityTabsData | undefined => {
  if (!getChaosModeEnabled()) return undefined;
  return STORY_TABS_DATA[entityName];
};
