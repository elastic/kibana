#!/usr/bin/env node
/*
 * Delete alerting rules created by create_bulk_alerting_rules.mjs (same tag / URL / auth).
 *
 * Usage:
 *   node scripts/delete_bulk_alerting_rules.mjs
 *   DELETE_COUNT=25 KIBANA_BASE_PATH=/anm KIBANA_API_KEY=... node scripts/delete_bulk_alerting_rules.mjs
 *
 * Env (align with create_bulk_alerting_rules.mjs):
 *   DELETE_COUNT — default 25
 *   KIBANA_URL, KIBANA_BASE_PATH, KIBANA_SPACE, KIBANA_AUTH, KIBANA_API_KEY
 *   RULE_TAG — default bulk-load-test
 *   CONCURRENCY — parallel DELETEs (default 20)
 */

const DELETE_COUNT = Number(process.env.DELETE_COUNT ?? '25');
const CONCURRENCY = Number(process.env.CONCURRENCY ?? '20');
const KIBANA_URL = (process.env.KIBANA_URL ?? 'http://localhost:5601').replace(/\/$/, '');
const BASE_PATH = (process.env.KIBANA_BASE_PATH ?? '').replace(/\/$/, '');
const SPACE = process.env.KIBANA_SPACE ?? '';
const AUTH = process.env.KIBANA_AUTH ?? 'elastic:changeme';
const API_KEY = process.env.KIBANA_API_KEY ?? '';
const TAG = process.env.RULE_TAG ?? 'bulk-load-test';

function buildUrl(path) {
  const spacePrefix = SPACE ? `/s/${encodeURIComponent(SPACE)}` : '';
  return `${KIBANA_URL}${BASE_PATH}${spacePrefix}${path}`;
}

const authHeader = API_KEY.trim()
  ? `ApiKey ${API_KEY.trim()}`
  : `Basic ${Buffer.from(AUTH, 'utf8').toString('base64')}`;

const commonHeaders = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'Kibana',
  Authorization: authHeader,
  Accept: 'application/json',
};

/** KQL filter matching rules with the bulk-load tag */
function tagFilter() {
  return `alert.attributes.tags: "${TAG.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

async function findPage(page, perPage) {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    filter: tagFilter(),
  });
  const url = buildUrl(`/api/alerting/rules/_find?${params}`);
  const res = await fetch(url, { method: 'GET', headers: commonHeaders });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  if (!res.ok) {
    throw new Error(`_find failed ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function deleteRule(ruleId) {
  const url = buildUrl(`/api/alerting/rule/${encodeURIComponent(ruleId)}`);
  const res = await fetch(url, { method: 'DELETE', headers: commonHeaders });
  if (res.status === 204) {
    return { ok: true, ruleId };
  }
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  return { ok: false, ruleId, status: res.status, body };
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
  if (!Number.isFinite(DELETE_COUNT) || DELETE_COUNT < 1) {
    console.error('DELETE_COUNT must be a positive number');
    process.exitCode = 1;
    return;
  }

  console.error(
    `Deleting up to ${DELETE_COUNT} rules with tag "${TAG}" via ${buildUrl('/api/alerting/rules/_find')}`
  );

  const perPage = 1000;
  const ids = [];
  let page = 1;
  let total = Infinity;

  while (ids.length < DELETE_COUNT && ids.length < total) {
    const body = await findPage(page, perPage);
    const data = Array.isArray(body.data) ? body.data : [];
    total = typeof body.total === 'number' ? body.total : data.length;
    for (const rule of data) {
      if (rule.id && ids.length < DELETE_COUNT) {
        ids.push(rule.id);
      }
    }
    if (data.length === 0) {
      break;
    }
    page += 1;
    if (page > 10000) {
      console.error('Stopped pagination safety cap');
      break;
    }
  }

  if (ids.length === 0) {
    console.error('No matching rules found.');
    return;
  }

  console.error(`Deleting ${ids.length} rule id(s) (concurrency ${CONCURRENCY})…`);
  const started = Date.now();
  const results = await poolMap(ids, CONCURRENCY, (id) => deleteRule(id));
  const failed = results.filter((r) => r && !r.ok);
  const ok = results.filter((r) => r && r.ok);

  console.error(
    `Done in ${((Date.now() - started) / 1000).toFixed(1)}s — deleted: ${ok.length}, failed: ${failed.length}`
  );
  if (failed.length) {
    console.error('Sample failures:', JSON.stringify(failed.slice(0, 5), null, 2));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
