/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Replaces every unit-test jest.config.js with an equivalent vitest.config.js.
 *
 *  - preset/testEnvironment         -> environment
 *  - roots/testMatch                -> roots/include (repo-relative)
 *  - setupFiles/setupFilesAfterEnv  -> setupFiles
 *  - moduleNameMapper               -> aliases
 *  - `<root>/__mocks__/<package>`   -> aliases (Jest applies these node_modules mocks implicitly)
 *  - modulePathIgnorePatterns, testTimeout, clearMocks, restoreMocks carried over
 *  - `projects` configs (lens) become one Vitest config per project directory
 *  - coverage, haste, transform and worker options are dropped
 *
 * Configs that select no tests are deleted, as are `jest.config.dev.js` helper configs.
 * Every test file must end up in exactly the config that Jest used, or the script fails.
 *
 * Usage: node src/platform/packages/shared/kbn-test/src/vitest/codemod/generate_vitest_configs.js
 */

// get_jest_configs is TypeScript
require('@kbn/swc-register').install();

const Fs = require('fs');
const Path = require('path');
const { execFileSync } = require('child_process');
const { createRequire } = require('module');
const { REPO_ROOT } = require('@kbn/repo-info');
const { getJestConfigs } = require('../../jest/configs/get_jest_configs');

const JEST_ENVIRONMENTS = { '@kbn/test': 'jsdom', '@kbn/test/jest_node': 'node' };
const SKIPPED_CONFIGS = ['.buildkite/jest.config.cjs'];

const rel = (path) => Path.relative(REPO_ROOT, path);

const loadJestConfig = (configPath) => {
  const loaded = createRequire(__filename)(configPath);
  return loaded.default ?? loaded;
};

const readHeader = (configPath) => {
  const [header] = /^\/\*[\s\S]*?\*\//.exec(Fs.readFileSync(configPath, 'utf8')) ?? [];
  return header;
};

const resolveRootDir = (configPath, config) =>
  Path.resolve(Path.dirname(configPath), config.rootDir ?? '.');

const fromRootDir = (value, rootDir) =>
  value.startsWith('<rootDir>') ? rel(Path.join(rootDir, value.slice('<rootDir>'.length))) : value;

/** node_modules / @kbn package mocks Jest picks up from `<root>/__mocks__` without jest.mock(). */
const getImplicitPackageMocks = (roots) =>
  roots.flatMap((root) => {
    const mocksDir = Path.resolve(REPO_ROOT, root, '__mocks__');
    if (!Fs.existsSync(mocksDir)) {
      return [];
    }
    const entries = Fs.readdirSync(mocksDir, { withFileTypes: true });
    const scoped = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('@'))
      .flatMap((scope) =>
        Fs.readdirSync(Path.join(mocksDir, scope.name)).map((name) => `${scope.name}/${name}`)
      );
    const unscoped = entries
      .filter((entry) => !entry.name.startsWith('@'))
      .map((entry) => entry.name.replace(/\.(js|ts|tsx)$/, ''))
      .filter((name) => {
        try {
          require.resolve(`${name}/package.json`, { paths: [REPO_ROOT] });
          return true;
        } catch {
          return false;
        }
      });

    return [...scoped, ...unscoped].map((pkg) => {
      const target = Path.join(mocksDir, pkg);
      const file =
        Fs.existsSync(target) && Fs.statSync(target).isDirectory()
          ? Fs.readdirSync(target).find((name) => /^index\.(js|ts|tsx)$/.test(name))
          : undefined;
      const replacement = file
        ? Path.join(target, file)
        : Fs.readdirSync(mocksDir)
            .map((name) => Path.join(mocksDir, name))
            .find((path) => path.replace(/\.(js|ts|tsx)$/, '') === target);
      return { find: `^${pkg.replace(/\./g, '\\.')}$`, replacement: rel(replacement) };
    });
  });

const toVitestOptions = (configPath, config) => {
  const rootDir = resolveRootDir(configPath, config);
  const roots = (config.roots ?? ['<rootDir>']).map((root) => fromRootDir(root, rootDir));
  const environment =
    config.testEnvironment === 'node' || config.testEnvironment === 'jsdom'
      ? config.testEnvironment
      : JEST_ENVIRONMENTS[config.preset];
  if (!environment) {
    throw new Error(`Unsupported preset in ${rel(configPath)}: ${config.preset}`);
  }

  const setupFiles = [...(config.setupFiles ?? []), ...(config.setupFilesAfterEnv ?? [])]
    .map((file) => fromRootDir(file, rootDir))
    // already part of the Vitest preset
    .filter((file) => file !== '@testing-library/jest-dom');

  const aliases = [
    ...Object.entries(config.moduleNameMapper ?? {}).map(([find, replacement]) => ({
      find,
      replacement: fromRootDir(replacement, rootDir),
    })),
    ...getImplicitPackageMocks(roots),
  ];

  return {
    environment,
    roots,
    ...(config.testMatch
      ? { include: config.testMatch.map((glob) => fromRootDir(glob, rootDir)) }
      : {}),
    ...(config.modulePathIgnorePatterns
      ? { exclude: config.modulePathIgnorePatterns.map((pattern) => `**/${pattern}/**`) }
      : {}),
    ...(setupFiles.length ? { setupFiles } : {}),
    ...(aliases.length ? { aliases } : {}),
    ...(config.testTimeout ? { testTimeout: config.testTimeout } : {}),
    ...(config.clearMocks ? { clearMocks: true } : {}),
    ...(config.restoreMocks ? { restoreMocks: true } : {}),
  };
};

const formatValue = (key, value) => {
  if (key === 'aliases') {
    return `[\n${value
      .map(
        ({ find, replacement }) =>
          `    { find: /${find.replace(/(?<!\\)\//g, '\\/')}/, replacement: '${replacement}' },`
      )
      .join('\n')}\n  ]`;
  }
  if (Array.isArray(value)) {
    return `[\n${value
      .map((item) => `    ${JSON.stringify(item).replace(/"/g, "'")},`)
      .join('\n')}\n  ]`;
  }
  return typeof value === 'string' ? `'${value}'` : String(value);
};

const renderConfig = (header, options) => {
  const body = Object.entries(options)
    .map(([key, value]) => `  ${key}: ${formatValue(key, value)},`)
    .join('\n');
  return `${header}\n\nconst { createKbnVitestConfig } = require('@kbn/test/vitest/preset');\n\nmodule.exports = createKbnVitestConfig({\n${body}\n});\n`;
};

const run = async () => {
  const { configsWithTests } = await getJestConfigs();
  const jestTestsByConfig = new Map(
    configsWithTests
      .filter(({ config }) => /jest\.config\.c?js$/.test(config))
      .map(({ config, testFiles }) => [config, testFiles])
  );

  const unitConfigs = execFileSync('git', ['ls-files', '*jest.config.js', '*jest.config.cjs'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((file) => file && !file.includes('__fixtures__') && !SKIPPED_CONFIGS.includes(file))
    .map((file) => Path.resolve(REPO_ROOT, file));

  const written = [];
  for (const configPath of unitConfigs) {
    const config = loadJestConfig(configPath);
    const header = readHeader(configPath);
    const targets = config.projects
      ? config.projects.map((project) =>
          Path.resolve(REPO_ROOT, fromRootDir(project, resolveRootDir(configPath, config)))
        )
      : [configPath];

    if (!config.projects && !jestTestsByConfig.has(configPath)) {
      Fs.rmSync(configPath);
      continue;
    }

    for (const target of targets) {
      const vitestPath = Path.join(Path.dirname(target), 'vitest.config.js');
      Fs.writeFileSync(
        vitestPath,
        renderConfig(header, toVitestOptions(target, loadJestConfig(target)))
      );
      written.push(vitestPath);
      if (target !== configPath) {
        Fs.rmSync(target);
      }
    }
    Fs.rmSync(configPath);
  }

  for (const devConfig of execFileSync('git', ['ls-files', '*jest.config.dev.js'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)) {
    Fs.rmSync(Path.resolve(REPO_ROOT, devConfig), { force: true });
  }

  // Parity: each test file Jest ran must be selected by exactly one Vitest config, and the
  // Vitest config must live where its Jest config lived (or in its project directory).
  const { configsWithTests: vitestConfigs, duplicateTestFiles } = await getJestConfigs(written);
  const vitestConfigByTest = new Map(
    vitestConfigs.flatMap(({ config, testFiles }) => testFiles.map((file) => [file, config]))
  );
  const problems = duplicateTestFiles.map(
    ({ testFile, configs }) => `duplicate: ${rel(testFile)} in ${configs.map(rel).join(', ')}`
  );
  for (const [jestConfig, testFiles] of jestTestsByConfig) {
    for (const testFile of testFiles) {
      const vitestConfig = vitestConfigByTest.get(testFile);
      if (!vitestConfig) {
        problems.push(`missing: ${rel(testFile)} (was ${rel(jestConfig)})`);
      } else if (!Path.dirname(vitestConfig).startsWith(Path.dirname(jestConfig))) {
        problems.push(`moved: ${rel(testFile)} ${rel(jestConfig)} -> ${rel(vitestConfig)}`);
      }
    }
  }

  process.stdout.write(`wrote ${written.length} vitest configs\n`);
  if (problems.length) {
    process.stdout.write(`${problems.join('\n')}\n${problems.length} parity problem(s)\n`);
    process.exitCode = 1;
  }
};

run().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
