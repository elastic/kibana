/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

declare const _exports: {
  createKbnVitestConfig: typeof createKbnVitestConfig;
};
export = _exports;
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
declare const createKbnVitestConfig: ({
  roots,
  environment,
  include,
  exclude,
  setupFiles,
  aliases,
  inlineDeps,
  testTimeout,
  clearMocks,
  restoreMocks,
}: {
  roots: string[];
  environment?: 'jsdom' | 'node';
  include?: string[];
  exclude?: string[];
  setupFiles?: string[];
  aliases?: Array<{
    find: string | RegExp;
    replacement: string;
  }>;
  inlineDeps?: Array<string | RegExp>;
  testTimeout?: number;
  clearMocks?: boolean;
  restoreMocks?: boolean;
}) => import('vitest/config').UserConfig;
