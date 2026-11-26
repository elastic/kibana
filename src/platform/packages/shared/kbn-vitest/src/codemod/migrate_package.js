/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Moves a package's unit tests from Jest to Vitest: replaces `jest.config.js` with a
 * `vitest.config.ts`, rewrites the tests and package-local mocks, re-keys snapshots and updates
 * tsconfig.json and moon.yml. Integration tests (`jest.integration.config.js`) stay on Jest.
 */

const Fs = require('fs');
const Path = require('path');
const { spawnSync } = require('child_process');
const { createRequire } = require('module');
const { REPO_ROOT } = require('@kbn/repo-info');
const Ts = require('typescript');
const { getProp, removeReferences, setCompilerOption, setProp } = require('@kbn/json-ast');
const { transformFiles } = require('./jest_to_vitest');
const { migrateSnapshotKeys } = require('./migrate_snapshot_keys');

const PRESETS = {
  '@kbn/jest/jest_node': '@kbn/vitest/node_preset',
  '@kbn/jest': '@kbn/vitest/jsdom_preset',
};
// Coverage settings are dropped: Vitest configures coverage from the root config.
const SUPPORTED_KEYS = new Set([
  'preset',
  'rootDir',
  'roots',
  'collectCoverageFrom',
  'coverageDirectory',
  'coverageReporters',
]);
const SKIPPED_DIRS = new Set(['node_modules', 'target', 'integration_tests', '__fixtures__']);
const SOURCE_FILE = /\.(ts|tsx|js)$/;
const TEST_FILE = /\.test\.(ts|tsx|js)$/;
const TSCONFIG_TYPE_RENAMES = {
  jest: 'vitest/globals',
  '@testing-library/jest-dom': '@testing-library/jest-dom/vitest',
};
const LICENSE_HEADER = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */`;

class MigrationError extends Error {}

/** Files under `dir`, without nested packages or the directories the Vitest presets exclude. */
const walk = (dir, root = dir) =>
  Fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = Path.join(dir, entry.name);
    if (!entry.isDirectory()) {
      return [path];
    }
    if (SKIPPED_DIRS.has(entry.name) || Fs.existsSync(Path.join(path, 'kibana.jsonc'))) {
      return [];
    }
    return walk(path, root);
  });

const readJestConfig = (dir) => {
  const configPath = Path.join(dir, 'jest.config.js');
  if (!Fs.existsSync(configPath)) {
    throw new MigrationError(`${configPath} not found`);
  }
  if (Fs.existsSync(Path.join(dir, 'vitest.config.ts'))) {
    throw new MigrationError(`${dir} already has a vitest.config.ts`);
  }
  const config = createRequire(configPath)(configPath);

  const problems = [];
  const unsupportedKeys = Object.keys(config).filter((key) => !SUPPORTED_KEYS.has(key));
  if (unsupportedKeys.length) {
    problems.push(`unsupported jest.config.js keys: ${unsupportedKeys.join(', ')}`);
  }
  const preset = PRESETS[config.preset];
  if (!preset) {
    problems.push(`unsupported preset ${JSON.stringify(config.preset)}`);
  }
  const rootDir = Path.resolve(dir, config.rootDir ?? '.');
  const roots = (config.roots ?? ['<rootDir>']).map((root) =>
    Path.resolve(rootDir, root.replace(/^<rootDir>\/?/, ''))
  );
  if (roots.length !== 1 || roots[0] !== dir) {
    problems.push(`roots must be the package directory, got ${JSON.stringify(config.roots)}`);
  }
  if (problems.length) {
    throw new MigrationError(problems.join('\n'));
  }
  return { configPath, preset };
};

const resolveRelative = (from, specifier) => {
  const base = Path.resolve(Path.dirname(from), specifier);
  return ['', '.ts', '.tsx', '.js', '/index.ts', '/index.tsx', '/index.js']
    .map((suffix) => base + suffix)
    .find((candidate) => Fs.existsSync(candidate) && Fs.statSync(candidate).isFile());
};

/**
 * Files other packages can import: the package entry points and everything they reach through
 * relative imports. Rewriting `jest.*` in them to `vi.*` would break consumers still on Jest.
 */
const findPublicFiles = (dir, files) => {
  const entryDirs = [dir, ...['public', 'server', 'common'].map((name) => Path.join(dir, name))];
  const queue = files.filter(
    (file) =>
      entryDirs.includes(Path.dirname(file)) &&
      /^(index|mocks)\.(ts|tsx|js)$/.test(Path.basename(file))
  );
  const reachable = new Set(queue);
  const specifiers = /(?:from\s+|import\(\s*|require\(\s*)['"](\.{1,2}\/[^'"]*|\.)['"]/g;
  while (queue.length) {
    const file = queue.pop();
    for (const [, specifier] of Fs.readFileSync(file, 'utf8').matchAll(specifiers)) {
      const resolved = resolveRelative(file, specifier);
      if (resolved && !reachable.has(resolved) && !TEST_FILE.test(resolved)) {
        reachable.add(resolved);
        queue.push(resolved);
      }
    }
  }
  return reachable;
};

/** Node module mocks in a root `__mocks__` dir: Jest applies them implicitly, Vitest doesn't. */
const reportImplicitModuleMocks = (dir, report) => {
  const mocksDir = Path.join(dir, '__mocks__');
  if (!Fs.existsSync(mocksDir)) {
    return;
  }
  for (const name of Fs.readdirSync(mocksDir)) {
    report.push({
      file: Path.join(mocksDir, name),
      line: 1,
      kind: 'manual',
      message:
        'Jest applies root __mocks__ for node modules automatically; Vitest only with vi.mock(<module>) in each test that needs it',
    });
  }
};

const readTsconfig = (path) => {
  const { config, error } = Ts.parseConfigFileTextToJson(path, Fs.readFileSync(path, 'utf8'));
  if (error) {
    throw new MigrationError(`can't parse ${path}: ${error.messageText}`);
  }
  return config;
};

/** `compilerOptions.types` of a tsconfig, following `extends` when it doesn't set them. */
const resolveTypes = (path) => {
  const config = readTsconfig(path);
  if (config.compilerOptions?.types) {
    return config.compilerOptions.types;
  }
  if (!config.extends) {
    return [];
  }
  const parent = config.extends.startsWith('.')
    ? Path.resolve(Path.dirname(path), config.extends)
    : require.resolve(config.extends, { paths: [Path.dirname(path)] });
  return resolveTypes(parent);
};

/**
 * Adds Vitest's globals to `compilerOptions.types`, writing out the inherited list when the
 * package doesn't set its own. The Jest entries stay: shared mock packages' declarations use the
 * `jest` namespace (jest.Mocked, jest.MockInstance), which @vitest/expect otherwise declares
 * empty. Both sets coexist under skipLibCheck. Each Vitest entry is followed by its Jest one.
 */
const vitestTypes = (types) => {
  const vitestNames = Object.values(TSCONFIG_TYPE_RENAMES);
  const jestName = (type) =>
    Object.keys(TSCONFIG_TYPE_RENAMES).find((name) => TSCONFIG_TYPE_RENAMES[name] === type);
  return [
    ...new Set(
      types.flatMap((type) => {
        const vitestName = TSCONFIG_TYPE_RENAMES[type] ?? (vitestNames.includes(type) && type);
        return vitestName ? [vitestName, jestName(vitestName)] : [type];
      })
    ),
  ];
};

/** Updates tsconfig.json; returns whether it changed. */
const updateTsconfig = (dir, { dryRun }) => {
  const path = Path.join(dir, 'tsconfig.json');
  const source = Fs.readFileSync(path, 'utf8');
  const types = vitestTypes(resolveTypes(path));
  const typesPattern = /"types"\s*:\s*\[[^\]]*\]/;
  const ownTypes = readTsconfig(path).compilerOptions?.types;
  let next =
    ownTypes && typesPattern.test(source)
      ? source.replace(
          typesPattern,
          `"types": [\n${types.map((type) => `      ${JSON.stringify(type)}`).join(',\n')}\n    ]`
        )
      : setCompilerOption(source, 'types', types);
  // kbn_references to @kbn/vitest would create project cycles (@kbn/vitest -> @kbn/jest -> ...);
  // keep vitest.config.ts out of the TS project instead, like jest.config.js was.
  const stringValues = (name) =>
    (getProp(next, name)?.value.elements ?? []).map((element) => element.value);
  if (stringValues('kbn_references').includes('@kbn/vitest')) {
    next = removeReferences(next, ['@kbn/vitest']);
  }
  const exclude = stringValues('exclude');
  if (!exclude.includes('vitest.config.ts')) {
    next = setProp(next, 'exclude', [...exclude, 'vitest.config.ts']);
  }
  if (next !== source && !dryRun) {
    Fs.writeFileSync(path, next);
  }
  return next !== source;
};

/** Drops tsc build info, which can hide errors after the project's types changed. */
const removeBuildInfo = (dir) => {
  const typesDir = Path.join(dir, 'target/types');
  if (!Fs.existsSync(typesDir)) {
    return;
  }
  for (const name of Fs.readdirSync(typesDir)) {
    if (name.endsWith('.tsbuildinfo')) {
      Fs.rmSync(Path.join(typesDir, name));
    }
  }
};

const regenerateMoonProject = (dir) => {
  const { status, stdout, stderr } = spawnSync(
    process.execPath,
    [
      Path.join(REPO_ROOT, 'scripts/regenerate_moon_projects.js'),
      '--update',
      '--filter',
      Path.relative(REPO_ROOT, dir),
    ],
    { cwd: REPO_ROOT, encoding: 'utf8' }
  );
  if (status !== 0) {
    throw new MigrationError(`regenerating moon.yml failed:\n${stdout}${stderr}`);
  }
};

/**
 * Applies only the tsconfig.json step to an already migrated package; regenerates moon.yml when
 * kbn_references changed. Returns whether tsconfig.json changed.
 *
 * @param {string} packageDir
 * @param {{ dryRun?: boolean }} [options]
 */
const migrateTsconfig = (packageDir, { dryRun = false } = {}) => {
  const dir = Path.resolve(packageDir);
  const path = Path.join(dir, 'tsconfig.json');
  const referencesBefore = readTsconfig(path).kbn_references;
  const changed = updateTsconfig(dir, { dryRun });
  if (changed && !dryRun) {
    removeBuildInfo(dir);
    const referencesAfter = readTsconfig(path).kbn_references;
    if (JSON.stringify(referencesBefore) !== JSON.stringify(referencesAfter)) {
      regenerateMoonProject(dir);
    }
  }
  return changed;
};

/**
 * Migrates the package in `packageDir` and returns what needs a manual look. Throws a
 * `MigrationError` when the package can't be migrated mechanically; nothing is written then.
 *
 * @param {string} packageDir
 * @param {{ dryRun?: boolean }} [options]
 */
const migratePackage = (packageDir, { dryRun = false } = {}) => {
  const dir = Path.resolve(packageDir);
  const { configPath, preset } = readJestConfig(dir);
  const files = walk(dir);

  const nestedConfigs = files.filter(
    (file) => file !== configPath && /^(jest|vitest)\.config\.(js|ts)$/.test(Path.basename(file))
  );
  if (nestedConfigs.length) {
    throw new MigrationError(`nested test configs found:\n${nestedConfigs.join('\n')}`);
  }

  const report = [];
  const sourceFiles = files.filter(
    (file) => SOURCE_FILE.test(file) && !file.endsWith('.d.ts') && file !== configPath
  );
  const testFiles = sourceFiles.filter((file) => TEST_FILE.test(file));
  const publicFiles = findPublicFiles(dir, sourceFiles);
  const helperFiles = sourceFiles.filter(
    (file) =>
      !TEST_FILE.test(file) &&
      !/\/jest\.[\w.]*config\.js$/.test(file) &&
      /\bjest\./.test(Fs.readFileSync(file, 'utf8'))
  );
  for (const file of helperFiles.filter((helper) => publicFiles.has(helper))) {
    report.push({
      file,
      line: 1,
      kind: 'manual',
      message:
        'uses jest.* but is reachable from a package entry point; left on Jest so consumers keep working',
    });
  }

  report.push(
    ...transformFiles([...testFiles, ...helperFiles.filter((file) => !publicFiles.has(file))], {
      dryRun,
    })
  );
  const snapshots = migrateSnapshotKeys(
    files.filter(
      (file) => file.endsWith('.snap') && Path.basename(Path.dirname(file)) === '__snapshots__'
    ),
    { dryRun }
  );
  report.push(...snapshots.report);
  reportImplicitModuleMocks(dir, report);

  if (!dryRun) {
    Fs.writeFileSync(
      Path.join(dir, 'vitest.config.ts'),
      `${LICENSE_HEADER}

import { defineConfig, mergeConfig } from 'vitest/config';
import preset from '${preset}';

export default mergeConfig(preset, defineConfig({ test: { root: import.meta.dirname } }));
`
    );
    Fs.unlinkSync(configPath);
  }
  if (updateTsconfig(dir, { dryRun }) && !dryRun) {
    removeBuildInfo(dir);
  }
  if (!dryRun) {
    regenerateMoonProject(dir);
  }

  return { report, snapshotStats: snapshots.stats, testFiles };
};

module.exports = { migratePackage, migrateTsconfig, MigrationError };
