/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Path = require('path');
const { kbnNodePlugins } = require('./src/plugins');

const SETUP_DIR = Path.resolve(__dirname, 'src/setup');
// Setup and mocks shared with the Jest presets stay in @kbn/jest.
const KBN_JEST_DIR = Path.dirname(require.resolve('@kbn/jest/package.json'));

/**
 * Vitest counterpart of the `@kbn/jest/jest_node` preset. Merge it into a package's
 * `vitest.config.js` with `mergeConfig` and set `test.root` to the package directory.
 *
 * @type {import('vitest/config').ViteUserConfig & {
 *   test: NonNullable<import('vitest/config').ViteUserConfig['test']>
 * }}
 */
module.exports = {
  resolve: {
    alias: {
      'elastic-apm-node': Path.resolve(KBN_JEST_DIR, 'src/mocks/apm_agent_mock.ts'),
    },
  },
  plugins: kbnNodePlugins(),
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.{js,mjs,ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/integration_tests/**',
      '**/__fixtures__/**',
      '**/target/**',
    ],
    retry: process.env.CI ? 3 : 0,
    // Vitest clears mock calls before every test by default; Jest (and @kbn/jest) doesn't, and
    // tests that call mocks in beforeAll or describe bodies rely on that.
    clearMocks: false,
    // Vitest truncates values interpolated into `.each` titles to 40 characters; Jest doesn't, and
    // snapshot keys and test names must stay the same.
    taskTitleValueFormatTruncate: 0,
    // Snapshots of colored output (chalk) were recorded with color on, as Jest workers run; Vitest
    // forks inherit the parent's pipe and would detect no color support outside a TTY. An explicit
    // NO_COLOR wins: Node warns when both are set, which fails child processes run with
    // @kbn/setup-node-env.
    env: process.env.NO_COLOR ? {} : { FORCE_COLOR: '1' },
    // Kibana runs with --disallow-code-generation-from-strings, so eval() and new Function()
    // throw in production. Test workers get the same V8 flag, unlike Jest, which can only shim
    // eval and Function. The flag is process-wide, so it needs the `forks` pool.
    pool: 'forks',
    execArgv: ['--disallow-code-generation-from-strings'],
    setupFiles: [
      Path.resolve(SETUP_DIR, 'jest_global.js'),
      Path.resolve(SETUP_DIR, 'swc_register.js'),
      Path.resolve(SETUP_DIR, 'native_loader.js'),
      Path.resolve(SETUP_DIR, 'mocks.moment_timezone.js'),
    ],
    snapshotFormat: {
      escapeString: true,
      printBasicPrototype: true,
    },
  },
};
