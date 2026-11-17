/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { OUT_DIR, getTaskBundleEntries, buildTaskBundles, writeManifest } = require('./build');
const {
  DEFAULT_TASK_BUNDLE_LIMITS_PATH,
  readTaskBundleLimits,
  assertTaskBundleLimits,
  updateTaskBundleLimits,
  writeTaskBundleLimits,
  reportTaskBundleWorkerSize,
} = require('./limits');

// node scripts/task_bundle [--name <bundle>]... [--out <dir>] [--manifest] [--no-contributions]
//   [--update-limits] [--validate-limits]
//   [--report-worker <bundle> --packs <id,id,...>]
// Builds the task type files declared in `kibana.jsonc` (`plugin.taskTypes`) into one bundle each,
// in target/task_bundles, with a manifest of the task types each bundle serves. `--no-contributions`
// builds the floor alone, with no plugin's contributions, to baseline what every worker pays before
// any step, trigger or service a plugin contributes is added. `--update-limits`/`--validate-limits`
// build every bundle twice (with and without contributions) to measure the floor and every pack,
// then write or check limits.yml; they ignore `--name` and `--no-contributions`, since a budget
// needs every bundle and both builds to mean anything. `--report-worker <bundle> --packs <id,id>`
// prints the expected worker size (floor plus the named packs) from limits.yml, with no build.
const args = process.argv.slice(2);
const getArgs = (flag) =>
  args.flatMap((arg, i) => (arg === flag && args[i + 1] ? [args[i + 1]] : []));
const getArg = (flag) => getArgs(flag)[0];

/** Floor bytes per bundle name (`--no-contributions`) and every pack's own bytes (with). */
const measureTaskBundles = async (entries) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbn-task-bundle-limits-'));
  try {
    const [floorResults, fullResults] = await Promise.all([
      buildTaskBundles({ entries, outDir: path.join(tmpDir, 'floor'), withContributions: false }),
      buildTaskBundles({ entries, outDir: path.join(tmpDir, 'full'), withContributions: true }),
    ]);
    return {
      floor: Object.fromEntries(floorResults.map(({ name, bytes }) => [name, bytes])),
      packs: Object.fromEntries(
        fullResults.flatMap(({ packs }) => packs.map(({ id, bytes }) => [id, bytes]))
      ),
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
};

const main = async () => {
  if (args.includes('--report-worker')) {
    const bundle = getArg('--report-worker');
    const packIds = (getArg('--packs') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    const limits = readTaskBundleLimits(DEFAULT_TASK_BUNDLE_LIMITS_PATH);
    const report = reportTaskBundleWorkerSize(limits, bundle, packIds);
    const mb = (bytes) => (bytes / 1048576).toFixed(1);
    console.log(`${bundle}: floor ${mb(report.floorBytes)} MB`);
    for (const pack of report.packs) console.log(`  + ${pack.id}: ${mb(pack.bytes)} MB`);
    if (report.unmeasuredPackIds.length) {
      console.log(
        `  ! no measurement for: ${report.unmeasuredPackIds.join(
          ', '
        )} (run --update-limits if these are new)`
      );
    }
    console.log(`  = ${mb(report.totalBytes)} MB expected worker size`);
    return;
  }
  const entries = getTaskBundleEntries();
  if (args.includes('--update-limits') || args.includes('--validate-limits')) {
    const measurements = await measureTaskBundles(entries);
    if (args.includes('--update-limits')) {
      const limits = updateTaskBundleLimits(
        measurements,
        readTaskBundleLimits(DEFAULT_TASK_BUNDLE_LIMITS_PATH)
      );
      writeTaskBundleLimits(limits);
      console.log(`wrote updated limits to ${DEFAULT_TASK_BUNDLE_LIMITS_PATH}`);
    } else {
      assertTaskBundleLimits(measurements);
      console.log('limits.yml valid');
    }
    return;
  }
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
