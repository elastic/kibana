/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Fs = require('fs');
const Path = require('path');
const { REPO_ROOT } = require('@kbn/repo-info');
const { kbnVitestPlugins } = require('../src/vitest/plugins');

const SETUP_DIR = Path.resolve(__dirname, '../src/vitest/setup');
const JEST_SETUP_DIR = Path.resolve(__dirname, '../src/jest/setup');
const TEST_EXTENSIONS = '{js,mjs,ts,tsx}';

const toAbsolute = (path) => (Path.isAbsolute(path) ? path : Path.resolve(REPO_ROOT, path));
const toRepoRelative = (path) => Path.relative(REPO_ROOT, toAbsolute(path));
// Setup files are repo paths or package specifiers such as `jest-canvas-mock`.
const resolveSetupFile = (file) => (Fs.existsSync(toAbsolute(file)) ? toAbsolute(file) : file);

/**
 * Builds the Vitest config for one Kibana unit test group — the Vitest equivalent of a
 * `jest.config.js` using the `@kbn/test` (jsdom) or `@kbn/test/jest_node` preset.
 *
 * Paths may be absolute or relative to the repository root. Package `setupFiles` run after
 * the preset setup, so they can rely on the `jest` -> `vi` global.
 *
 * @param {{
 *   roots: string[],
 *   environment?: 'jsdom' | 'node',
 *   include?: string[],
 *   exclude?: string[],
 *   setupFiles?: string[],
 *   aliases?: Array<{ find: string | RegExp, replacement: string }>, // replacement: repo path
 *   inlineDeps?: Array<string | RegExp>,
 *   testTimeout?: number,
 *   clearMocks?: boolean,
 *   restoreMocks?: boolean,
 * }} options
 * @returns {import('vitest/config').UserConfig}
 */
const createKbnVitestConfig = ({
  roots,
  environment = 'jsdom',
  include,
  exclude = [],
  setupFiles = [],
  aliases = [],
  inlineDeps = [],
  testTimeout,
  clearMocks = false,
  restoreMocks = false,
}) => {
  const isJsdom = environment === 'jsdom';
  const relativeRoots = roots.map(toRepoRelative);

  return {
    root: REPO_ROOT,
    plugins: kbnVitestPlugins(
      aliases.map(({ find, replacement }) => ({ find, replacement: toAbsolute(replacement) }))
    ),
    // Sources are compiled by the kbn SWC plugin; skip Vite's own TS/JSX transform.
    oxc: false,
    test: {
      include: (include ?? relativeRoots.map((root) => `${root}/**/*.test.${TEST_EXTENSIONS}`)).map(
        toRepoRelative
      ),
      exclude: [
        '**/node_modules/**',
        '**/integration_tests/**',
        '**/__fixtures__/**',
        '**/target/**',
        ...exclude,
      ],
      environment,
      // Jest's jsdom environment defaults to http://localhost/; Vitest's to http://localhost:3000.
      environmentOptions: { jsdom: { url: 'http://localhost/' } },
      globals: true,
      pool: process.env.VITEST_POOL || 'forks',
      ...(process.env.VITEST_MAX_WORKERS
        ? { maxWorkers: Number(process.env.VITEST_MAX_WORKERS) }
        : {}),
      // Persist transforms across runs, like Jest's transform cache.
      fsModuleCache: true,
      // Jest defaults; Vitest 5 enables clearMocks by default.
      clearMocks,
      // Jest's restoreMocks also resets every jest.fn(); Vitest's only restores vi.spyOn() spies.
      restoreMocks,
      mockReset: restoreMocks,
      ...(testTimeout ? { testTimeout } : {}),
      retry: process.env.CI ? 3 : 0,
      // jest-worker enabled colors in test processes; chalk-based snapshots depend on it.
      env: { FORCE_COLOR: process.env.FORCE_COLOR ?? '1' },
      setupFiles: [
        ...(isJsdom
          ? [
              Path.join(SETUP_DIR, 'timers.jsdom.js'),
              'core-js/stable',
              Path.join(JEST_SETUP_DIR, 'polyfills.jsdom.js'),
              Path.join(SETUP_DIR, 'enzyme.js'),
            ]
          : []),
        Path.join(JEST_SETUP_DIR, 'disallow_code_generation.js'),
        Path.join(SETUP_DIR, 'after_env.js'),
        ...(isJsdom ? [Path.join(SETUP_DIR, 'serializers.jsdom.js')] : []),
        ...setupFiles.map(resolveSetupFile),
      ],
      snapshotFormat: { escapeString: true, printBasicPrototype: true },
      // Vitest truncates `$var` values in `.each` titles (and so snapshot keys) at 40 chars; Jest
      // never did.
      taskTitleValueFormatTruncate: Number.MAX_SAFE_INTEGER,
      server: { deps: { inline: inlineDeps } },
    },
  };
};

module.exports = { createKbnVitestConfig };
