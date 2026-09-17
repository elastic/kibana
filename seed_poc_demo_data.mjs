#!/usr/bin/env node
/**
 * GA POC demo seed script — run with: node seed_poc_demo_data.mjs
 *
 * Phases:
 *   0. Seed ECS docs into logs-poc-demo-default (provides real data for rules to fire on)
 *   1. Create 8 v1 .es-query rules that query logs-poc-demo-default with real thresholds
 *   2. Create 5 v2 rules via the v2 rules API querying the same data stream
 *   3. Bulk-index v2 native alert events (source: 'internal')
 *   4. Bulk-index external alert events from Datadog, New Relic, Dynatrace
 *
 * Re-run at any time. Existing v1 rules are deleted and recreated. v2 rules are upserted.
 * Bulk-indexed events with the same _id are skipped (use reset to start fresh).
 *
 * Reset:
 *   curl -s -X POST -u elastic:changeme \
 *     -H "kbn-xsrf: true" \
 *     "http://localhost:5717/alerti/internal/alerting/v2/_reset_resources"
 *   node seed_poc_demo_data.mjs
 */

const KBN_URL = 'http://localhost:5717';
const KBN_BASE_PATH = '/alerti';
const ES_URL = 'http://localhost:9212';
const USERNAME = 'elastic';
const PASSWORD = 'changeme';
const SPACE = 'default';
const DEMO_INDEX = 'poc-demo-metrics';

const KBN_HEADERS = {
  'Content-Type': 'application/json',
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'poc-seed',
  Authorization: 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64'),
};

const ES_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64'),
};

const kbnFetch = (path, opts = {}) =>
  fetch(`${KBN_URL}${KBN_BASE_PATH}${path}`, {
    ...opts,
    headers: { ...KBN_HEADERS, ...(opts.headers ?? {}) },
  });

const esFetch = (path, opts = {}) =>
  fetch(`${ES_URL}${path}`, {
    ...opts,
    headers: { ...ES_HEADERS, ...(opts.headers ?? {}) },
  });

const json = (r) => r.json();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function deleteV1Rule(id) {
  const res = await kbnFetch(`/api/alerting/rule/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    console.warn(`  [cleanup] delete rule ${id} failed ${res.status}`);
  }
}

async function createV1Rule(rule) {
  const res = await kbnFetch('/api/alerting/rule', {
    method: 'POST',
    body: JSON.stringify(rule),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`createV1Rule "${rule.name}" failed ${res.status}: ${body}`);
  }
  const data = await json(res);
  console.log(`  [v1] created rule "${data.name}" id=${data.id}`);
  return data.id;
}

async function runRuleSoon(ruleId) {
  const res = await kbnFetch(`/internal/alerting/rule/${ruleId}/_run_soon`, { method: 'POST' });
  if (!res.ok) {
    const body = await res.text();
    console.warn(`  [v1] _run_soon for ${ruleId} failed ${res.status}: ${body}`);
  }
}

async function createV2Rule(id, rule) {
  const res = await kbnFetch(`/api/alerting/v2/rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(rule),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`createV2Rule id=${id} failed ${res.status}: ${body}`);
  }
  const data = await json(res);
  console.log(`  [v2] upserted rule "${data.metadata?.name}" id=${data.id}`);
  return data.id;
}

async function bulkIndex(ops) {
  const body = ops.map((o) => JSON.stringify(o)).join('\n') + '\n';
  const res = await esFetch('/_bulk?refresh=true', { method: 'POST', body });
  if (!res.ok) {
    throw new Error(`bulk index failed ${res.status}: ${await res.text()}`);
  }
  const data = await json(res);
  if (data.errors) {
    const errs = data.items
      .filter((i) => i.create?.error || i.index?.error)
      .map((i) => {
        const op = i.create ?? i.index;
        return `${op?._id}: ${JSON.stringify(op?.error)}`;
      })
      .slice(0, 5);
    if (errs.length) console.warn('  bulk errors (first 5):', errs);
  }
  const created = data.items.filter((i) => (i.create ?? i.index)?.result === 'created').length;
  const updated = data.items.filter((i) => (i.create ?? i.index)?.result === 'updated').length;
  const skipped = data.items.filter((i) => (i.create ?? i.index)?.status === 409).length;
  console.log(`  bulk: ${created} created, ${updated} updated, ${skipped} already-existed`);
}

function nowIso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function sha(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).padStart(8, '0');
}

// ---------------------------------------------------------------------------
// Cleanup — delete all existing v1 (.es-query) rules
// ---------------------------------------------------------------------------

async function cleanupV1Rules() {
  console.log('\n=== Cleanup: deleting existing v1 rules ===');
  let page = 1;
  let deleted = 0;
  while (true) {
    const res = await kbnFetch(`/api/alerting/rules/_find?page=${page}&per_page=50`);
    if (!res.ok) {
      console.warn('  could not list rules:', res.status);
      break;
    }
    const data = await json(res);
    const rules = data.data ?? [];
    if (rules.length === 0) break;

    const esQueryRules = rules.filter((r) => r.rule_type_id === '.es-query');
    for (const rule of esQueryRules) {
      await deleteV1Rule(rule.id);
      deleted++;
    }

    if (rules.length < 50) break;
    page++;
  }
  console.log(`  deleted ${deleted} v1 rule(s)`);
}

// ---------------------------------------------------------------------------
// Phase 0 — seed ECS docs into logs-poc-demo-default
// ---------------------------------------------------------------------------

async function seedDemoData() {
  console.log(`\n=== Phase 0: seeding ECS docs into ${DEMO_INDEX} ===`);

  const ops = [];
  const idx = (id) => ({ index: { _index: DEMO_INDEX, _id: id } });

  // CPU: prod-node-01 and prod-node-02 running hot
  for (let i = 0; i < 5; i++) {
    const minAgo = i * 3;
    ops.push(idx(`cpu-prod-01-${i}`));
    ops.push({
      '@timestamp': nowIso(-minAgo * 60_000),
      'host.name': 'prod-node-01',
      'host.hostname': 'prod-node-01',
      'event.dataset': 'system.cpu',
      'system.cpu.total.pct': 0.95 + Math.random() * 0.04,
    });
    ops.push(idx(`cpu-prod-02-${i}`));
    ops.push({
      '@timestamp': nowIso(-(minAgo + 1) * 60_000),
      'host.name': 'prod-node-02',
      'host.hostname': 'prod-node-02',
      'event.dataset': 'system.cpu',
      'system.cpu.total.pct': 0.96 + Math.random() * 0.03,
    });
  }

  // Disk write latency spike on data-node-01
  for (let i = 0; i < 4; i++) {
    ops.push(idx(`disk-dn01-${i}`));
    ops.push({
      '@timestamp': nowIso(-i * 4 * 60_000),
      'host.name': 'data-node-01',
      'event.dataset': 'system.diskio',
      'disk.write.latency_ms': 210 + i * 30,
    });
  }

  // OOMKilled events — payments namespace
  for (let i = 0; i < 3; i++) {
    ops.push(idx(`oom-payments-${i}`));
    ops.push({
      '@timestamp': nowIso(-i * 8 * 60_000),
      'kubernetes.pod.name': `payments-worker-${i}`,
      'kubernetes.namespace': 'payments',
      'event.reason': 'OOMKilled',
      'event.dataset': 'kubernetes.events',
      'event.action': 'kill',
    });
  }

  // HTTP 500s from checkout-service
  for (let i = 0; i < 8; i++) {
    ops.push(idx(`checkout-500-${i}`));
    ops.push({
      '@timestamp': nowIso(-i * 2 * 60_000),
      'service.name': 'checkout-service',
      'service.environment': 'production',
      'http.response.status_code': 500,
      'event.dataset': 'apm.transaction',
      'transaction.name': 'POST /checkout/complete',
    });
  }

  // APM high latency on search-api (>2s P99)
  for (let i = 0; i < 5; i++) {
    ops.push(idx(`search-api-slow-${i}`));
    ops.push({
      '@timestamp': nowIso(-i * 5 * 60_000),
      'service.name': 'search-api',
      'service.environment': 'production',
      'transaction.name': 'GET /search',
      'transaction.duration.us': 2_500_000 + i * 200_000,
      'event.dataset': 'apm.transaction',
    });
  }

  // DB free connections low on postgres-primary
  for (let i = 0; i < 4; i++) {
    ops.push(idx(`pg-pool-${i}`));
    ops.push({
      '@timestamp': nowIso(-i * 3 * 60_000),
      'host.name': 'postgres-primary',
      'event.dataset': 'postgresql.activity',
      'postgresql.pool.free_connections': Math.max(0, 4 - i),
    });
  }

  // TLS certificate expiry — api.example.com
  ops.push(idx('tls-cert-api'));
  ops.push({
    '@timestamp': nowIso(-5 * 60_000),
    'host.name': 'api.example.com',
    'event.dataset': 'tls',
    'tls.server.x509.subject.common_name': 'api.example.com',
    'tls.days_remaining': 12,
  });

  // Network packet drops on edge-router
  for (let i = 0; i < 4; i++) {
    ops.push(idx(`net-drop-edge-${i}`));
    ops.push({
      '@timestamp': nowIso(-i * 4 * 60_000),
      'host.name': 'edge-router',
      'event.dataset': 'system.network',
      'network.dropped_packets_pct': 0.002 + i * 0.001,
    });
  }

  await bulkIndex(ops);
  console.log(`  done — ${ops.length / 2} docs indexed into ${DEMO_INDEX}`);
}

// ---------------------------------------------------------------------------
// Phase 1 — v1 rules (.es-query, querying logs-poc-demo-default)
// ---------------------------------------------------------------------------

const V1_RULES = [
  {
    name: 'High CPU utilization — production',
    esQuery: JSON.stringify({
      query: { range: { 'system.cpu.total.pct': { gte: 0.95 } } },
    }),
  },
  {
    name: 'Disk write latency spike — data-node-01',
    esQuery: JSON.stringify({
      query: {
        bool: {
          filter: [
            { term: { 'host.name': 'data-node-01' } },
            { range: { 'disk.write.latency_ms': { gte: 200 } } },
          ],
        },
      },
    }),
  },
  {
    name: 'Pod OOMKilled — payments namespace',
    esQuery: JSON.stringify({
      query: {
        bool: {
          filter: [
            { term: { 'kubernetes.namespace': 'payments' } },
            { term: { 'event.reason': 'OOMKilled' } },
          ],
        },
      },
    }),
  },
  {
    name: 'Log error rate surge — checkout service',
    esQuery: JSON.stringify({
      query: {
        bool: {
          filter: [
            { term: { 'service.name': 'checkout-service' } },
            { term: { 'http.response.status_code': 500 } },
          ],
        },
      },
    }),
  },
  {
    name: 'APM transaction P99 degraded — search-api',
    esQuery: JSON.stringify({
      query: {
        bool: {
          filter: [
            { term: { 'service.name': 'search-api' } },
            { range: { 'transaction.duration.us': { gte: 2_000_000 } } },
          ],
        },
      },
    }),
  },
  {
    name: 'Database connection pool exhausted — postgres-primary',
    esQuery: JSON.stringify({
      query: {
        bool: {
          filter: [
            { term: { 'host.name': 'postgres-primary' } },
            { range: { 'postgresql.pool.free_connections': { lte: 5 } } },
          ],
        },
      },
    }),
  },
  {
    name: 'Certificate expiry — api.example.com',
    esQuery: JSON.stringify({
      query: { range: { 'tls.days_remaining': { lte: 30 } } },
    }),
  },
  {
    name: 'Network packet drop rate — edge-router',
    esQuery: JSON.stringify({
      query: {
        bool: {
          filter: [
            { term: { 'host.name': 'edge-router' } },
            { range: { 'network.dropped_packets_pct': { gte: 0.001 } } },
          ],
        },
      },
    }),
  },
];

async function seedV1Rules() {
  console.log('\n=== Phase 1: v1 rules ===');
  const ids = [];
  for (const { name, esQuery } of V1_RULES) {
    const id = await createV1Rule({
      name,
      rule_type_id: '.es-query',
      consumer: 'alerts',
      schedule: { interval: '1m' },
      actions: [],
      params: {
        index: [DEMO_INDEX],
        timeField: '@timestamp',
        esQuery,
        size: 0,
        aggType: 'count',
        groupBy: 'all',
        thresholdComparator: '>',
        threshold: [0],
        timeWindowSize: 24,
        timeWindowUnit: 'h',
        excludeHitsFromPreviousRun: false,
      },
    });
    ids.push(id);
  }
  console.log('  kicking rules via _run_soon...');
  await Promise.all(ids.map(runRuleSoon));
  console.log('  done — alerts will appear within ~30 seconds');
  return ids;
}

// ---------------------------------------------------------------------------
// Phase 2 — v2 rules (ES|QL against logs-poc-demo-default)
// ---------------------------------------------------------------------------

const V2_RULE_IDS = [
  'poc-v2-rule-001',
  'poc-v2-rule-002',
  'poc-v2-rule-003',
  'poc-v2-rule-004',
  'poc-v2-rule-005',
];

const V2_RULES = [
  {
    name: 'K8s pod restart rate — production cluster',
    breach: `FROM ${DEMO_INDEX} | WHERE kubernetes.namespace == "payments" AND event.reason == "OOMKilled" | STATS count = COUNT(*) | WHERE count > 0`,
  },
  {
    name: 'SLO burn rate — checkout (99.9%)',
    breach: `FROM ${DEMO_INDEX} | WHERE \`service.name\` == "checkout-service" AND \`http.response.status_code\` == 500 | STATS count = COUNT(*) | WHERE count > 0`,
  },
  {
    name: 'Anomalous ingest volume — events pipeline',
    breach: `FROM ${DEMO_INDEX} | WHERE \`host.name\` == "data-node-01" AND \`disk.write.latency_ms\` >= 200 | STATS count = COUNT(*) | WHERE count > 0`,
  },
  {
    name: 'Host memory pressure — analytics cluster',
    breach: `FROM ${DEMO_INDEX} | WHERE \`system.cpu.total.pct\` >= 0.95 | STATS count = COUNT(*) | WHERE count > 0`,
  },
  {
    name: 'RUM Largest Contentful Paint degraded — storefront',
    breach: `FROM ${DEMO_INDEX} | WHERE \`service.name\` == "search-api" AND \`transaction.duration.us\` >= 2000000 | STATS count = COUNT(*) | WHERE count > 0`,
  },
];

async function seedV2Rules() {
  console.log('\n=== Phase 2: v2 rules ===');
  for (let i = 0; i < V2_RULE_IDS.length; i++) {
    await createV2Rule(V2_RULE_IDS[i], {
      kind: 'alert',
      metadata: {
        name: V2_RULES[i].name,
        tags: ['poc', 'demo'],
      },
      schedule: { every: '5m' },
      query: {
        format: 'standalone',
        breach: { query: V2_RULES[i].breach },
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Phase 3 — v2 native alert events (source: 'internal')
// ---------------------------------------------------------------------------

const V2_NATIVE_SCENARIOS = [
  { ruleIndex: 0, severity: 'high', episodes: 3 },
  { ruleIndex: 1, severity: 'critical', episodes: 2 },
  { ruleIndex: 2, severity: 'medium', episodes: 4 },
  { ruleIndex: 3, severity: 'low', episodes: 2 },
  { ruleIndex: 4, severity: 'medium', episodes: 3 },
];

async function seedV2NativeAlerts() {
  console.log('\n=== Phase 3: v2 native alert events (source: internal) ===');
  const ops = [];

  for (const { ruleIndex, severity, episodes } of V2_NATIVE_SCENARIOS) {
    const ruleId = V2_RULE_IDS[ruleIndex];
    for (let ep = 0; ep < episodes; ep++) {
      const episodeId = `poc-ep-v2-${ruleIndex}-${ep}`;
      const groupHash = sha(`${SPACE}:internal:${ruleId}:ep${ep}`);
      const tsMs = Date.now() - ep * 15 * 60 * 1000;

      ops.push({ create: { _index: '.rule-events', _id: `${episodeId}-breach` } });
      ops.push({
        '@timestamp': new Date(tsMs - 5 * 60 * 1000).toISOString(),
        group_hash: groupHash,
        episode: { id: episodeId, status: 'active' },
        rule: { id: ruleId, version: 1 },
        status: 'breached',
        source: 'internal',
        type: 'alert',
        space_id: SPACE,
        severity,
        data: { rule_name: V2_RULES[ruleIndex].name },
      });

      ops.push({ create: { _index: '.rule-events', _id: `${episodeId}-active` } });
      ops.push({
        '@timestamp': new Date(tsMs).toISOString(),
        group_hash: groupHash,
        episode: { id: episodeId, status: 'active' },
        rule: { id: ruleId, version: 1 },
        status: 'breached',
        source: 'internal',
        type: 'alert',
        space_id: SPACE,
        severity,
        data: { rule_name: V2_RULES[ruleIndex].name },
      });
    }
  }

  await bulkIndex(ops);
}

// ---------------------------------------------------------------------------
// Phase 4 — external alert events (Datadog, New Relic, Dynatrace)
// ---------------------------------------------------------------------------

const EXTERNAL_ALERTS = [
  {
    source: 'datadog',
    scenarios: [
      {
        id: 'dd-ep-01',
        severity: 'high',
        data: {
          rule_name: 'High error rate — payments-service',
          alert_url: 'https://app.datadoghq.com/monitors/123456',
          'dd.monitor.id': '123456',
          'service.name': 'payments-service',
        },
      },
      {
        id: 'dd-ep-02',
        severity: 'critical',
        data: {
          rule_name: 'DB replica lag — primary cluster',
          alert_url: 'https://app.datadoghq.com/monitors/234567',
          'dd.monitor.id': '234567',
          'service.name': 'postgres',
        },
      },
      {
        id: 'dd-ep-03',
        severity: 'medium',
        data: {
          rule_name: 'Container CPU throttling — worker pods',
          alert_url: 'https://app.datadoghq.com/monitors/345678',
          'dd.monitor.id': '345678',
          'service.name': 'worker',
        },
      },
    ],
  },
  {
    source: 'newrelic',
    scenarios: [
      {
        id: 'nr-ep-01',
        severity: 'critical',
        data: {
          rule_name: 'Apdex score below threshold — mobile API',
          alert_url: 'https://alerts.newrelic.com/accounts/123/incidents/456',
          'nr.incident.id': '456',
          'service.name': 'mobile-api',
        },
      },
      {
        id: 'nr-ep-02',
        severity: 'high',
        data: {
          rule_name: 'Transaction throughput drop — order processing',
          alert_url: 'https://alerts.newrelic.com/accounts/123/incidents/789',
          'nr.incident.id': '789',
          'service.name': 'order-service',
        },
      },
    ],
  },
  {
    source: 'dynatrace',
    scenarios: [
      {
        id: 'dt-ep-01',
        severity: 'high',
        data: {
          rule_name: 'Response time degradation — storefront',
          alert_url: 'https://example.live.dynatrace.com/problems/PROBLEM-12345',
          'dt.problem.id': 'PROBLEM-12345',
          'service.name': 'storefront',
        },
      },
      {
        id: 'dt-ep-02',
        severity: 'critical',
        data: {
          rule_name: 'Process crash — analytics ingest',
          alert_url: 'https://example.live.dynatrace.com/problems/PROBLEM-23456',
          'dt.problem.id': 'PROBLEM-23456',
          'service.name': 'analytics-ingest',
        },
      },
      {
        id: 'dt-ep-03',
        severity: 'medium',
        data: {
          rule_name: 'Memory leak suspected — session cache',
          alert_url: 'https://example.live.dynatrace.com/problems/PROBLEM-34567',
          'dt.problem.id': 'PROBLEM-34567',
          'service.name': 'session-cache',
        },
      },
    ],
  },
];

async function seedExternalAlerts() {
  console.log('\n=== Phase 4: external alert events (Datadog, New Relic, Dynatrace) ===');
  const ops = [];

  for (const { source, scenarios } of EXTERNAL_ALERTS) {
    for (let i = 0; i < scenarios.length; i++) {
      const { id: episodeId, severity, data } = scenarios[i];
      const groupHash = sha(`${SPACE}:${source}:${episodeId}`);
      const tsMs = Date.now() - i * 20 * 60 * 1000;

      ops.push({ create: { _index: '.rule-events', _id: `${episodeId}-breach` } });
      ops.push({
        '@timestamp': new Date(tsMs - 10 * 60 * 1000).toISOString(),
        group_hash: groupHash,
        episode: { id: episodeId, status: 'active' },
        status: 'breached',
        source,
        type: 'alert',
        space_id: SPACE,
        severity,
        data,
      });

      ops.push({ create: { _index: '.rule-events', _id: `${episodeId}-active` } });
      ops.push({
        '@timestamp': new Date(tsMs).toISOString(),
        group_hash: groupHash,
        episode: { id: episodeId, status: 'active' },
        status: 'breached',
        source,
        type: 'alert',
        space_id: SPACE,
        severity,
        data,
      });
    }
  }

  await bulkIndex(ops);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('POC demo seed script');
  console.log(`  Kibana: ${KBN_URL}${KBN_BASE_PATH}`);
  console.log(`  ES:     ${ES_URL}`);
  console.log('');

  const kbCheck = await kbnFetch('/api/status').catch(() => null);
  if (!kbCheck?.ok) {
    throw new Error(
      'Cannot reach Kibana — is it running? Check KBN_URL/KBN_BASE_PATH at top of script.'
    );
  }

  await cleanupV1Rules();
  await seedDemoData();
  await seedV1Rules();
  await seedV2Rules();
  await seedV2NativeAlerts();
  await seedExternalAlerts();

  console.log(`
=== Done! ===
Open: ${KBN_URL}${KBN_BASE_PATH}/app/observability/alerting/inbox

Table defaults filter to:
  - status: active only
  - time range: now-24h

All seeded events use timestamps within the last few hours.
v1 alerts will appear within ~30 seconds after _run_soon fires.

To reset and re-run:
  curl -s -X POST -u elastic:changeme \\
    -H "kbn-xsrf: true" \\
    "${KBN_URL}${KBN_BASE_PATH}/internal/alerting/v2/_reset_resources"
  node seed_poc_demo_data.mjs
`);
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
