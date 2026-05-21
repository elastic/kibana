#!/usr/bin/env node
/**
 * Delete one or more Kibana Lens saved objects.
 *
 * Usage:
 *   node delete_panel.mjs <id> [<id> ...]
 *
 * Env:
 *   KIBANA_URL      required
 *   KIBANA_API_KEY  required (falls back to ELASTICSEARCH_API_KEY)
 */

const KIBANA_URL = process.env.KIBANA_URL;
const KIBANA_API_KEY = process.env.KIBANA_API_KEY ?? process.env.ELASTICSEARCH_API_KEY;

function fail(msg) {
  console.error(`[delete_panel] ${msg}`);
  process.exit(1);
}

if (!KIBANA_URL) fail('KIBANA_URL env var is required');
if (!KIBANA_API_KEY) fail('KIBANA_API_KEY (or ELASTICSEARCH_API_KEY) env var is required');

const ids = process.argv.slice(2);
if (ids.length === 0) fail('usage: delete_panel.mjs <id> [<id> ...]');

const headers = {
  Authorization: `ApiKey ${KIBANA_API_KEY}`,
  'kbn-xsrf': 'true',
};

let exitCode = 0;

for (const id of ids) {
  const res = await fetch(`${KIBANA_URL}/api/saved_objects/lens/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (res.ok || res.status === 404) {
    console.log(`deleted ${id}`);
  } else {
    console.error(`[delete_panel] failed to delete ${id} (${res.status}): ${await res.text()}`);
    exitCode = 1;
  }
}

process.exit(exitCode);
