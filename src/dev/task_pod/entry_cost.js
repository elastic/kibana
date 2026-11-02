/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// node scripts/task_pod_entry_cost <module> [--trace]
// Reports the RSS a module costs when loaded first in a fresh process, with the launcher flag the
// pods run with. --trace attributes the cost to the packages whose files were loaded.
const path = require('path');
const { spawnSync } = require('child_process');

const [entry, ...flags] = process.argv.slice(2);
if (!entry) {
  console.error('usage: node scripts/task_pod_entry_cost <module> [--trace]');
  process.exit(1);
}
// What every pod loads regardless of family; --baseline measures the entry on top of it.
const BASELINE = ['@kbn/config-schema', '@kbn/i18n', 'rxjs', '@elastic/elasticsearch'].join(',');
const res = spawnSync(
  process.execPath,
  [
    '--max-semi-space-size=8',
    '--expose-gc',
    path.join(__dirname, 'entry_cost_child.js'),
    entry,
    ...flags,
  ],
  {
    stdio: ['ignore', 'pipe', 'inherit'],
    cwd: path.resolve(__dirname, '../../..'),
    env: { ...process.env, TASK_POD_BASELINE: flags.includes('--baseline') ? BASELINE : '' },
  }
);
if (res.status !== 0) process.exit(res.status || 1);
const out = res.stdout.toString().trim().split('\n').pop();
const parsed = JSON.parse(out);
console.log(`${parsed.entry}: +${parsed.deltaMb} MB`);
(parsed.packages || []).forEach(({ pkg, mb }) =>
  console.log(`  ${String(mb).padStart(7)} MB  ${pkg}`)
);
