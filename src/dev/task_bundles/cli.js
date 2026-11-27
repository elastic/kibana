/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');
const { OUT_DIR, getTaskBundleEntries, buildTaskBundle, writeManifest } = require('./build');

// node scripts/task_bundle [--name <bundle>] [--out <dir>]
// Builds the task type files declared in `kibana.jsonc` (`plugin.taskTypes`) into one bundle each,
// in target/task_bundles, with a manifest of the task types each bundle serves.
const args = process.argv.slice(2);
const getArg = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);

const main = async () => {
  const entries = getTaskBundleEntries();
  const name = getArg('--name');
  const outDir = getArg('--out') ?? OUT_DIR;
  const selected = name
    ? entries.filter((e) => e.name === name || e.name.endsWith(`__${name}`))
    : entries;
  if (!selected.length) {
    console.error(
      `no task bundle ${name ? `named '${name}'` : 'declared'}; known: ${entries
        .map((e) => e.name)
        .join(', ')}`
    );
    process.exit(1);
  }
  const results = [];
  for (const entry of selected) {
    const started = Date.now();
    const result = await buildTaskBundle({ entry, outDir });
    results.push(result);
    console.log(
      `${result.name}: ${(result.bytes / 1024).toFixed(0)} KB, ${
        Date.now() - started
      } ms -> ${path.relative(process.cwd(), result.outfile)}`
    );
  }
  // A partial build must not replace the manifest of a full one.
  if (!name) writeManifest(results, outDir);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
