#!/usr/bin/env node
/**
 * GA POC demo seed script — run with: node seed_poc_demo_data.mjs
 *
 * What it does:
 *   1. Creates 8 v1 (classic) .es-query rules configured to fire with zero documents
 *   2. Kicks each rule via /_run_soon so alerts appear immediately
 *   3. Creates 5 v2 rules via the v2 rules API (so the Rules (v2) tab is populated)
 *   4. Bulk-indexes v2 native alert events (source: 'internal') tied to those v2 rule IDs
 *   5. Bulk-indexes external alert events from Datadog, New Relic, Dynatrace
 *
 * Re-run at any time before the demo. The external and v2-native events use `create`
 * (not `index`) so re-runs skip existing IDs. Reset with:
 *   POST http://localhost:5717/alerti/internal/alerting/v2/_reset_resources
 *
 * Config: edit the constants below to match your local ports.
 */

const KBN_URL = 'http://localhost:5717';
const KBN_BASE_PATH = '/alerti';
const ES_URL = 'http://localhost:9212';
const USERNAME = 'elastic';
const PASSWORD = 'changeme';
const SPACE = 'default';

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
    // 409 = already exists, that's fine
    if (res.status === 409) {
      console.log(`  [v2] rule ${id} already exists, skipping`);
      return id;
    }
    throw new Error(`createV2Rule "${rule.name}" failed ${res.status}: ${body}`);
  }
  const data = await json(res);
  console.log(`  [v2] created rule "${data.name}" id=${data.id}`);
  return data.id;
}

async function bulkIndex(ops) {
  const body = ops.map((o) => JSON.stringify(o)).join('\n') + '\n';
  const res = await esFetch('/_bulk', { method: 'POST', body });
  if (!res.ok) {
    throw new Error(`bulk index failed ${res.status}: ${await res.text()}`);
  }
  const data = await json(res);
  if (data.errors) {
    const errs = data.items
      .filter((i) => i.create?.error)
      .map((i) => `${i.create?._id}: ${JSON.stringify(i.create?.error)}`)
      .slice(0, 5);
    console.warn('  bulk errors (first 5):', errs);
  }
  const created = data.items.filter((i) => i.create?.result === 'created').length;
  const skipped = data.items.filter((i) => i.create?.status === 409).length;
  console.log(`  bulk: ${created} created, ${skipped} already-existed`);
}

function nowIso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function sha(str) {
  // Simple deterministic ID without crypto dep — good enough for demo
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).padStart(8, '0');
}

// ---------------------------------------------------------------------------
// Phase 1 — v1 rules (es-query, fire on zero docs)
// ---------------------------------------------------------------------------

const V1_RULES = [
  { name: 'High CPU utilization — production', description: 'CPU > 95% for 5 minutes' },
  { name: 'Disk write latency spike — data-node-01', description: 'P99 write latency > 200ms' },
  { name: 'Pod OOMKilled — payments namespace', description: 'Container killed for OOM' },
  { name: 'Log error rate surge — checkout service', description: 'Error logs > 500 / min' },
  { name: 'APM transaction P99 degraded — search-api', description: 'P99 latency > 2s' },
  { name: 'Database connection pool exhausted — postgres-primary', description: 'Free connections < 5' },
  { name: 'Certificate expiry — api.example.com', description: 'TLS cert expires in < 30 days' },
  { name: 'Network packet drop rate — edge-router', description: 'Drop rate > 0.1%' },
];

async function seedV1Rules() {
  console.log('\n=== Phase 1: v1 rules ===');
  const ids = [];
  for (const { name, description } of V1_RULES) {
    const id = await createV1Rule({
      name,
      description,
      rule_type_id: '.es-query',
      consumer: 'alerts',
      schedule: { interval: '1m' },
      actions: [],
      params: {
        // Match nothing; zero-doc path fires when count < 1
        index: ['.kibana_task_manager_*'],
        timeField: '@timestamp',
        esQuery: JSON.stringify({ query: { match_none: {} } }),
        size: 0,
        aggType: 'count',
        groupBy: 'all',
        thresholdComparator: '<',
        threshold: [1],
        timeWindowSize: 5,
        timeWindowUnit: 'm',
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
// Phase 2 — v2 rules
// ---------------------------------------------------------------------------

const V2_RULE_IDS = [
  'poc-v2-rule-001',
  'poc-v2-rule-002',
  'poc-v2-rule-003',
  'poc-v2-rule-004',
  'poc-v2-rule-005',
];

const V2_RULE_NAMES = [
  'K8s pod restart rate — production cluster',
  'SLO burn rate — checkout (99.9%)',
  'Anomalous ingest volume — events pipeline',
  'Host memory pressure — analytics cluster',
  'RUM Largest Contentful Paint degraded — storefront',
];

async function seedV2Rules() {
  console.log('\n=== Phase 2: v2 rules ===');
  for (let i = 0; i < V2_RULE_IDS.length; i++) {
    await createV2Rule(V2_RULE_IDS[i], {
      name: V2_RULE_NAMES[i],
      description: 'POC demo rule — does not fire live',
      tags: ['poc', 'demo'],
      query: `FROM .rule-events
| WHERE rule.id == "${V2_RULE_IDS[i]}"
| STATS count = COUNT(*) BY rule.id
| WHERE count > 100`,
      schedule: { interval: '5m' },
    });
  }
}

// ---------------------------------------------------------------------------
// Phase 3 — v2 native alert events (source: 'internal')
// ---------------------------------------------------------------------------

const V2_NATIVE_SCENARIOS = [
  {
    ruleIndex: 0,
    severity: 'high',
    episodes: 3,
    description: 'K8s pod restart rate alert',
  },
  {
    ruleIndex: 1,
    severity: 'critical',
    episodes: 2,
    description: 'SLO burn rate alert',
  },
  {
    ruleIndex: 2,
    severity: 'medium',
    episodes: 4,
    description: 'Ingest volume anomaly',
  },
  {
    ruleIndex: 3,
    severity: 'low',
    episodes: 2,
    description: 'Memory pressure warning',
  },
  {
    ruleIndex: 4,
    severity: 'medium',
    episodes: 3,
    description: 'RUM LCP degraded',
  },
];

async function seedV2NativeAlerts() {
  console.log('\n=== Phase 3: v2 native alert events (source: internal) ===');
  const ops = [];

  for (const { ruleIndex, severity, episodes } of V2_NATIVE_SCENARIOS) {
    const ruleId = V2_RULE_IDS[ruleIndex];
    for (let ep = 0; ep < episodes; ep++) {
      const episodeId = `poc-ep-v2-${ruleIndex}-${ep}`;
      const groupHash = sha(`${SPACE}:internal:${ruleId}:ep${ep}`);
      const tsMs = Date.now() - ep * 15 * 60 * 1000; // stagger by 15 min

      // breaching event
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
        data: {
          rule_name: V2_RULE_NAMES[ruleIndex],
        },
      });

      // active event (the one ES|QL episode projection picks up)
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
        data: {
          rule_name: V2_RULE_NAMES[ruleIndex],
        },
      });
    }
  }

  await bulkIndex(ops);
}

// ---------------------------------------------------------------------------
// Phase 4 — external alert events (Datadog, New Relic, Dynatrace)
// ---------------------------------------------------------------------------

const EXTERNAL_ALERTS = [
  // Datadog
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
          'dd.monitor.name': 'payments-service error rate',
          'service.name': 'payments-service',
          'service.env': 'production',
        },
      },
      {
        id: 'dd-ep-02',
        severity: 'critical',
        data: {
          rule_name: 'DB replica lag — primary cluster',
          alert_url: 'https://app.datadoghq.com/monitors/234567',
          'dd.monitor.id': '234567',
          'dd.monitor.name': 'postgres replica lag',
          'service.name': 'postgres',
          'service.env': 'production',
        },
      },
      {
        id: 'dd-ep-03',
        severity: 'medium',
        data: {
          rule_name: 'Container CPU throttling — worker pods',
          alert_url: 'https://app.datadoghq.com/monitors/345678',
          'dd.monitor.id': '345678',
          'dd.monitor.name': 'k8s container cpu throttle',
          'service.name': 'worker',
          'service.env': 'staging',
        },
      },
    ],
  },
  // New Relic
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
          'nr.policy.name': 'Mobile API SLAs',
          'service.name': 'mobile-api',
          'service.env': 'production',
        },
      },
      {
        id: 'nr-ep-02',
        severity: 'high',
        data: {
          rule_name: 'Transaction throughput drop — order processing',
          alert_url: 'https://alerts.newrelic.com/accounts/123/incidents/789',
          'nr.incident.id': '789',
          'nr.policy.name': 'Order Processing',
          'service.name': 'order-service',
          'service.env': 'production',
        },
      },
    ],
  },
  // Dynatrace
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
          'dt.problem.title': 'Response time degradation',
          'service.name': 'storefront',
          'service.env': 'production',
        },
      },
      {
        id: 'dt-ep-02',
        severity: 'critical',
        data: {
          rule_name: 'Process crash — analytics ingest',
          alert_url: 'https://example.live.dynatrace.com/problems/PROBLEM-23456',
          'dt.problem.id': 'PROBLEM-23456',
          'dt.problem.title': 'Process crash detected',
          'service.name': 'analytics-ingest',
          'service.env': 'production',
        },
      },
      {
        id: 'dt-ep-03',
        severity: 'medium',
        data: {
          rule_name: 'Memory leak suspected — session cache',
          alert_url: 'https://example.live.dynatrace.com/problems/PROBLEM-34567',
          'dt.problem.id': 'PROBLEM-34567',
          'dt.problem.title': 'Memory leak suspected',
          'service.name': 'session-cache',
          'service.env': 'production',
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

  // Verify connectivity
  const kbCheck = await kbnFetch('/api/status').catch(() => null);
  if (!kbCheck?.ok) {
    throw new Error('Cannot reach Kibana — is it running? Check KBN_URL/KBN_BASE_PATH at top of script.');
  }

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

All seeded events use timestamps within the last few hours, so they should appear
immediately. If nothing shows up, expand the time picker to "Last 7 days".

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
