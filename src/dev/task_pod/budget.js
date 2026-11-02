/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// node scripts/task_pod_budget [--update]
// Checks every entry in src/cli/task_pod/budgets.yml against its fresh-process RSS cost (measured on
// top of the shared baseline, like src/dev/task_pod/entry_cost.js). Budgets are fresh-process numbers
// so a PR can't hide a heavy import behind a dependency that something else already loaded.
// --update rewrites the budgets from the measured cost plus 15% and 8 MB of headroom (runs vary by ~10 MB).
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { parse, stringify } = require('yaml');

const root = path.resolve(__dirname, '../../..');
const budgetsPath = path.join(root, 'src/cli/task_pod/budgets.yml');
const update = process.argv.includes('--update');
const budgets = parse(fs.readFileSync(budgetsPath, 'utf8')) || {};

const measure = (entry) => {
  const res = spawnSync(
    process.execPath,
    [path.join(root, 'scripts/task_pod_entry_cost.js'), entry, '--baseline'],
    { cwd: root, encoding: 'utf8' }
  );
  const match = /\+(-?\d+) MB/.exec(res.stdout || '');
  if (res.status !== 0 || !match) throw new Error(`could not measure ${entry}:\n${res.stderr}`);
  return Number(match[1]);
};

let failed = false;
const next = {};
for (const [entry, limit] of Object.entries(budgets)) {
  const cost = measure(entry);
  next[entry] = update ? Math.ceil(cost * 1.15) + 8 : limit;
  const ok = cost <= limit;
  failed = failed || (!ok && !update);
  console.log(
    `${ok || update ? 'ok  ' : 'OVER'} ${String(cost).padStart(4)} / ${String(limit).padStart(
      4
    )} MB  ${entry}`
  );
}
if (update) {
  fs.writeFileSync(budgetsPath, stringify(next));
  console.log(`updated ${path.relative(root, budgetsPath)}`);
} else if (failed) {
  console.error(
    '\nAn entry is over budget. Find the package behind it with: node scripts/task_pod_entry_cost.js <entry> --baseline --trace'
  );
  process.exit(1);
}
