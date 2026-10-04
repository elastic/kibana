#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-restricted-syntax, no-console */

/**
 * Create an Alerting V2 rule that fires constantly to generate episodes.
 *
 * The rule runs every 5s (minimum allowed by alerting_v2), uses a standalone
 * ES|QL breach query that always matches (ROW count = 1 | WHERE count > 0),
 * and sets pending_count: 1 so the first breach transitions its episode to
 * "active" immediately.
 *
 * Kibana config required:
 *   xpack.alerting_v2.enabled: true
 *   uiSettings.globalOverrides.alerting:v2:enabled: true
 *
 * Usage:
 *   node scripts/create_alerting_v2_noisy_rule.js               # create rule
 *   node scripts/create_alerting_v2_noisy_rule.js --group       # multi-episode mode
 *   node scripts/create_alerting_v2_noisy_rule.js --name=foo
 *   node scripts/create_alerting_v2_noisy_rule.js --every=30s
 *   node scripts/create_alerting_v2_noisy_rule.js --clean       # delete rules tagged by this script
 *
 * Env overrides:
 *   KIBANA_URL       (default: http://localhost:5601)
 *   KIBANA_USERNAME  (default: elastic)
 *   KIBANA_PASSWORD  (default: changeme)
 *   KIBANA_SPACE     (default: default)
 */

require('@kbn/setup-node-env');

const http = require('http');
const https = require('https');
const { URL } = require('url');
const getopts = require('getopts');

const TAG = 'script:noisy-alerting-v2-rule';

const argv = getopts(process.argv.slice(2), {
  boolean: ['clean', 'group', 'help'],
  string: ['name', 'every'],
  alias: { h: 'help' },
  default: {
    name: 'Noisy alerting v2 rule',
    every: '5s',
  },
});

if (argv.help) {
  console.log(
    [
      'Create an Alerting V2 rule that fires constantly to generate episodes.',
      '',
      'Usage:',
      '  node scripts/create_alerting_v2_noisy_rule.js [--name=NAME] [--every=DURATION] [--group]',
      '  node scripts/create_alerting_v2_noisy_rule.js --clean',
      '',
      'Env:',
      '  KIBANA_URL, KIBANA_USERNAME, KIBANA_PASSWORD, KIBANA_SPACE',
    ].join('\n')
  );
  process.exit(0);
}

const kibanaUrl = process.env.KIBANA_URL || 'http://localhost:5601';
const username = process.env.KIBANA_USERNAME || 'elastic';
const password = process.env.KIBANA_PASSWORD || 'changeme';
const space = process.env.KIBANA_SPACE || 'default';

const basePath = space === 'default' ? '' : `/s/${space}`;
const apiBase = `${kibanaUrl}${basePath}/api/alerting/v2/rules`;

const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

function request(method, url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const httpModule = parsed.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : undefined;
    const req = httpModule.request(
      {
        method,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          'kbn-xsrf': 'true',
          'x-elastic-internal-origin': 'Kibana',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
        rejectUnauthorized: false,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          const parsedBody = data ? safeJson(data) : undefined;
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedBody);
          } else {
            reject(
              new Error(
                `${method} ${parsed.pathname} → ${res.statusCode}\n${
                  typeof parsedBody === 'object' ? JSON.stringify(parsedBody, null, 2) : data
                }`
              )
            );
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function clean() {
  console.log(`→ Finding rules tagged "${TAG}"…`);
  const list = await request('GET', `${apiBase}?perPage=1000&search=${encodeURIComponent(TAG)}`);
  const matches = (list?.items ?? []).filter((r) => (r.metadata?.tags ?? []).includes(TAG));
  if (matches.length === 0) {
    console.log('✔ No matching rules.');
    return;
  }
  for (const rule of matches) {
    console.log(`  delete ${rule.id} (${rule.metadata?.name})`);
    await request('DELETE', `${apiBase}/${rule.id}`);
  }
  console.log(`✔ Deleted ${matches.length} rule(s).`);
}

async function create() {
  const grouped = argv.group;
  const breachQuery = grouped
    ? 'ROW host = ["a", "b", "c", "d", "e"] | MV_EXPAND host | EVAL count = 1'
    : 'ROW count = 1 | WHERE count > 0';

  const body = {
    kind: 'alert',
    metadata: {
      name: argv.name,
      description: `Created by scripts/create_alerting_v2_noisy_rule.js — fires every ${argv.every}`,
      tags: [TAG],
    },
    schedule: { every: argv.every },
    query: {
      format: 'standalone',
      breach: { query: breachQuery },
    },
    state_transition: {
      pending_count: 1,
      pending_operator: 'OR',
    },
    ...(grouped ? { grouping: { fields: ['host'] } } : {}),
  };

  console.log(`→ Creating rule "${argv.name}" at ${apiBase}`);
  const created = await request('POST', apiBase, body);
  console.log(`✔ Created rule id=${created.id}`);
  console.log(`  schedule: every ${argv.every}`);
  console.log(`  ${grouped ? 'multi-episode mode (5 groups)' : 'single-episode mode'}`);
  console.log('  Episodes appear in: Stack Management → Alerting V2 Preview → Alerts');
  console.log(`  To delete: node scripts/create_alerting_v2_noisy_rule.js --clean`);
}

(async () => {
  try {
    if (argv.clean) {
      await clean();
    } else {
      await create();
    }
  } catch (err) {
    console.error('✘', err.message);
    process.exit(1);
  }
})();
