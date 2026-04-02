#!/usr/bin/env node
/*
 * Create many Stack Rules (Elasticsearch query / .es-query) for load testing Task Manager.
 *
 * Usage:
 *   node scripts/create_bulk_alerting_rules.mjs
 *   RULE_COUNT=6000 KIBANA_URL=http://localhost:5601 node scripts/create_bulk_alerting_rules.mjs
 *
 * If you use server.basePath (e.g. cloud), set:
 *   KIBANA_BASE_PATH=/your/prefix
 *
 * Default space is default (no prefix). For another space:
 *   KIBANA_SPACE=my-space
 *
 * Auth — Basic (default elastic:changeme):
 *   KIBANA_AUTH=elastic:changeme
 * Or API key (Elasticsearch API key, base64 of `id:key`):
 *   KIBANA_API_KEY=...
 *
 * Target index for the ES query (must exist and contain the time field):
 *   ALERT_ES_INDEX=.kibana_alerting_cases
 *   ALERT_TIME_FIELD=updated_at
 */

import { randomUUID } from 'crypto';

const RULE_COUNT = Number(process.env.RULE_COUNT ?? '6000');
const CONCURRENCY = Number(process.env.CONCURRENCY ?? '40');
const KIBANA_URL = (process.env.KIBANA_URL ?? 'http://localhost:5601').replace(/\/$/, '');
const BASE_PATH = (process.env.KIBANA_BASE_PATH ?? '').replace(/\/$/, '');
const SPACE = process.env.KIBANA_SPACE ?? '';
const AUTH = process.env.KIBANA_AUTH ?? 'elastic:changeme';
/** If set (base64 of `id:api_key`), sent as `Authorization: ApiKey …` instead of Basic auth */
const API_KEY = process.env.KIBANA_API_KEY ?? '';
const ALERT_ES_INDEX = process.env.ALERT_ES_INDEX ?? '.kibana_alerting_cases';
const ALERT_TIME_FIELD = process.env.ALERT_TIME_FIELD ?? 'updated_at';
const RULE_INTERVAL = process.env.RULE_INTERVAL ?? '1m';
const TAG = process.env.RULE_TAG ?? 'bulk-load-test';

function buildUrl(path) {
  const spacePrefix = SPACE ? `/s/${encodeURIComponent(SPACE)}` : '';
  return `${KIBANA_URL}${BASE_PATH}${spacePrefix}${path}`;
}

const authHeader = API_KEY.trim()
  ? `ApiKey ${API_KEY.trim()}`
  : `Basic ${Buffer.from(AUTH, 'utf8').toString('base64')}`;

function ruleBody(index) {
  const name = `bulk-load-${index}-${Date.now()}`;
  return {
    name,
    tags: [TAG],
    rule_type_id: '.es-query',
    consumer: 'stackAlerts',
    schedule: { interval: RULE_INTERVAL },
    enabled: true,
    params: {
      searchType: 'esQuery',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      // Unlikely to fire: count is almost never above 1M in a 5m window
      threshold: [1_000_000],
      thresholdComparator: '<',
      size: 100,
      esQuery: JSON.stringify({ query: { match_all: {} } }),
      aggType: 'count',
      groupBy: 'all',
      termSize: 5,
      excludeHitsFromPreviousRun: false,
      sourceFields: [],
      index: [ALERT_ES_INDEX],
      timeField: ALERT_TIME_FIELD,
    },
    actions: [],
  };
}

async function createOne(index) {
  const id = randomUUID();
  const url = buildUrl(`/api/alerting/rule/${encodeURIComponent(id)}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'Kibana',
      Authorization: authHeader,
      Accept: 'application/json',
    },
    body: JSON.stringify(ruleBody(index)),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }

  if (!res.ok) {
    return { ok: false, status: res.status, index, id, body: json };
  }
  return { ok: true, index, id, ruleId: json.id };
}

async function poolMap(items, concurrency, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function main() {
  console.error(
    `Creating ${RULE_COUNT} rules every ${RULE_INTERVAL} at ${buildUrl('/api/alerting/rule')} (concurrency ${CONCURRENCY})`
  );
  console.error(`ES query index: ${ALERT_ES_INDEX}, timeField: ${ALERT_TIME_FIELD}`);

  const indices = Array.from({ length: RULE_COUNT }, (_, i) => i);
  const started = Date.now();
  const results = await poolMap(indices, CONCURRENCY, (n, idx) => createOne(idx));

  const failed = results.filter((r) => r && !r.ok);
  const ok = results.filter((r) => r && r.ok);

  console.error(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s — ok: ${ok.length}, failed: ${failed.length}`);

  if (failed.length) {
    const sample = failed.slice(0, 5);
    console.error('Sample failures:', JSON.stringify(sample, null, 2));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
