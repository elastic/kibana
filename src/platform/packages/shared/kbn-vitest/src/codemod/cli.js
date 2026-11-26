/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Path = require('path');
const { REPO_ROOT } = require('@kbn/repo-info');

const USAGE = `Usage:
  node scripts/vitest_migrate [--dry-run] <packageDir...>
      Migrate packages from Jest to Vitest (config, tests, mocks, snapshots, tsconfig, moon.yml).
  node scripts/vitest_migrate --files [--dry-run] <file...>
      Only run the jest.* -> vi.* codemod on the given files.
  node scripts/vitest_migrate --tsconfig-only [--dry-run] <packageDir...>
      Only apply the tsconfig.json step to already migrated packages; prints the changed files.
  node scripts/vitest_migrate --compare-snapshots [--base <ref>] <file.snap...>
      Check that .snap files only differ from their Jest versions at <ref> (default HEAD) by key format.
`;

const printReport = (report) => {
  for (const kind of ['review', 'manual']) {
    const entries = report
      .filter((entry) => entry.kind === kind)
      .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
    if (!entries.length) {
      continue;
    }
    process.stdout.write(
      kind === 'manual'
        ? `\nNeeds a manual change (${entries.length}):\n`
        : `\nRewritten, worth a look (${entries.length}):\n`
    );
    for (const { file, line, message } of entries) {
      process.stdout.write(`  ${Path.relative(REPO_ROOT, file)}:${line} ${message}\n`);
    }
  }
};

const runFiles = (files, dryRun) => {
  const { transformFiles } = require('./jest_to_vitest');
  printReport(transformFiles(files, { dryRun }));
};

const runCompareSnapshots = (args) => {
  const { compareSnapshots } = require('./compare_snapshots');
  const baseIndex = args.indexOf('--base');
  const baseRef = baseIndex === -1 ? undefined : args[baseIndex + 1];
  const files = args.filter((arg, i) => !arg.startsWith('--') && i !== baseIndex + 1);
  const { identical, differences } = compareSnapshots(
    files.map((file) => Path.resolve(file)),
    { baseRef }
  );
  for (const difference of differences) {
    process.stdout.write(`${difference}\n`);
  }
  process.stdout.write(`identical=${identical} differing=${differences.length}\n`);
  return differences.length ? 1 : 0;
};

const runPackages = (dirs, dryRun) => {
  const { migratePackage, MigrationError } = require('./migrate_package');
  let failed = false;
  for (const dir of dirs) {
    process.stdout.write(`\n${Path.relative(REPO_ROOT, Path.resolve(dir))}\n`);
    try {
      const { report, snapshotStats, testFiles } = migratePackage(dir, { dryRun });
      const snapshots = Object.entries(snapshotStats)
        .map(([name, count]) => `${name}=${count}`)
        .join(' ');
      process.stdout.write(`  ${testFiles.length} test file(s); snapshots: ${snapshots}\n`);
      printReport(report);
    } catch (error) {
      if (!(error instanceof MigrationError)) {
        throw error;
      }
      failed = true;
      process.stderr.write(`  not migrated: ${error.message}\n`);
    }
  }
  return failed ? 1 : 0;
};

/** Entry point of `node scripts/vitest_migrate`. */
const run = (argv = process.argv.slice(2)) => {
  const dryRun = argv.includes('--dry-run');
  const positional = argv.filter((arg) => !arg.startsWith('--'));
  if (argv.includes('--help') || !positional.length) {
    process.stdout.write(USAGE);
    process.exitCode = argv.includes('--help') ? 0 : 1;
    return;
  }
  if (argv.includes('--compare-snapshots')) {
    process.exitCode = runCompareSnapshots(argv);
    return;
  }
  if (argv.includes('--files')) {
    runFiles(
      positional.map((file) => Path.resolve(file)),
      dryRun
    );
    return;
  }
  if (argv.includes('--tsconfig-only')) {
    const { migrateTsconfig } = require('./migrate_package');
    for (const dir of positional) {
      if (migrateTsconfig(dir, { dryRun })) {
        process.stdout.write(`${Path.relative(REPO_ROOT, Path.resolve(dir, 'tsconfig.json'))}\n`);
      }
    }
    return;
  }
  process.exitCode = runPackages(positional, dryRun);
};

module.exports = { run };
