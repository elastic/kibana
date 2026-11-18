/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const fs = require('fs');
const path = require('path');
const { OUT_DIR, getTaskBundleEntries, buildTaskBundles, writeManifest } = require('./build');

// node scripts/task_bundle [--name <bundle>]... [--out <dir>] [--manifest] [--no-contributions]
// Builds the task type files declared in `kibana.jsonc` (`plugin.taskTypes`) into one bundle each,
// in target/task_bundles, with a manifest of the task types each bundle serves. `--no-contributions`
// builds the floor alone, with no plugin's contributions, to baseline what every worker pays before
// any step, trigger or service a plugin contributes is added.
const args = process.argv.slice(2);
const getArgs = (flag) =>
  args.flatMap((arg, i) => (arg === flag && args[i + 1] ? [args[i + 1]] : []));
const getArg = (flag) => getArgs(flag)[0];

const main = async () => {
  const entries = getTaskBundleEntries();
  const names = getArgs('--name');
  const outDir = getArg('--out') ?? OUT_DIR;
  const selected = names.length
    ? entries.filter((e) => names.some((name) => e.name === name || e.name.endsWith(`__${name}`)))
    : entries;
  if (!selected.length) {
    console.error(
      `no task bundle ${names.length ? `named '${names}'` : 'declared'}; known: ${entries
        .map((e) => e.name)
        .join(', ')}`
    );
    process.exit(1);
  }
  const started = Date.now();
  const withContributions = !args.includes('--no-contributions');
  const results = await buildTaskBundles({
    entries: selected,
    outDir,
    metafile: true,
    withContributions,
  });
  for (const result of results) {
    console.log(
      `${result.name}: ${(result.bytes / 1024).toFixed(0)} KB, ${
        Date.now() - started
      } ms batch -> ${path.relative(process.cwd(), result.outfile)}`
    );
  }
  // The esbuild metafile (inputs, outputs and who imports whom) of the build, for tracing weight.
  if (results[0]?.metafile) {
    fs.writeFileSync(path.join(outDir, 'metafile.json'), JSON.stringify(results[0].metafile));
  }
  // A partial build must not replace the manifest of a full one, unless it goes to its own directory.
  if (!names.length || args.includes('--manifest')) writeManifest(results, outDir);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
