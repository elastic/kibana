/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Path = require('path');
const nodePreset = require('./node_preset');
const { kbnJsdomPlugins } = require('./src/plugins');

const SETUP_DIR = Path.resolve(__dirname, 'src/setup');

/**
 * Vitest counterpart of the `@kbn/jest` (jsdom) preset. Merge it into a package's
 * `vitest.config.ts` with `mergeConfig` and set `test.root` to the package directory.
 *
 * @type {import('vitest/config').ViteUserConfig & {
 *   test: NonNullable<import('vitest/config').ViteUserConfig['test']>
 * }}
 */
module.exports = {
  ...nodePreset,
  plugins: kbnJsdomPlugins(),
  // The Jest transformer (kbn-vitest-swc) compiles TS/JSX; skip Vite's own pass.
  oxc: false,
  test: {
    ...nodePreset.test,
    environment: 'jsdom',
    // jsdom compiles CSS selectors with new Function(); disallow_code_generation.jsdom.js
    // guards eval/Function instead of the V8 flag.
    execArgv: [],
    setupFiles: [
      Path.resolve(SETUP_DIR, 'set_immediate.jsdom.js'),
      Path.resolve(SETUP_DIR, 'disallow_code_generation.jsdom.js'),
      ...nodePreset.test.setupFiles,
      Path.resolve(SETUP_DIR, 'jsdom.js'),
      Path.resolve(SETUP_DIR, 'enzyme.js'),
    ],
  },
};
