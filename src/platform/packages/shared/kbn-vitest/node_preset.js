/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Path = require('path');

const SETUP_DIR = Path.resolve(__dirname, 'src/setup');
// Setup and mocks shared with the Jest presets stay in @kbn/jest.
const KBN_JEST_DIR = Path.dirname(require.resolve('@kbn/jest/package.json'));

/**
 * Vitest counterpart of the `@kbn/jest/jest_node` preset. Merge it into a package's
 * `vitest.config.ts` with `mergeConfig` and set `test.root` to the package directory.
 *
 * @type {import('vitest/config').ViteUserConfig}
 */
module.exports = {
  resolve: {
    alias: {
      'elastic-apm-node': Path.resolve(KBN_JEST_DIR, 'src/mocks/apm_agent_mock.ts'),
    },
  },
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
    setupFiles: [
      Path.resolve(SETUP_DIR, 'jest_global.js'),
      Path.resolve(KBN_JEST_DIR, 'src/setup/disallow_code_generation.js'),
      Path.resolve(SETUP_DIR, 'mocks.moment_timezone.js'),
    ],
    snapshotFormat: {
      escapeString: true,
      printBasicPrototype: true,
    },
  },
};
