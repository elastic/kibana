/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Modules that can never affect Scout tests. When a PR only
 * touches modules in this set, Scout tests are skipped entirely.
 *
 * Do NOT add modules that @kbn/scout depends on.
 */

export const SCOUT_EXCLUDED_MODULES: ReadonlySet<string> = new Set([
  // FTR framework
  '@kbn/test',
  '@kbn/ambient-ftr-types',
  '@kbn/ftr-benchmarks',

  // Jest test helpers
  '@kbn/test-eui-helpers',
  '@kbn/test-jest-helpers',

  // FTR services & helpers
  '@kbn/ftr-common-functional-services',
  '@kbn/ftr-common-functional-ui-services',
  '@kbn/ftr-screenshot-filename',
  '@kbn/ftr-apis-plugin',
  '@kbn/detections-response-ftr-services',
  '@kbn/analytics-ftr-helpers-plugin',

  // FTR suite roots
  '@kbn/test-suites-src',
  '@kbn/test-suites-xpack-platform',
  '@kbn/test-suites-xpack-observability',
  '@kbn/test-suites-xpack-search',
  '@kbn/test-suites-xpack-security',
  '@kbn/test-suites-xpack-security-endpoint',
  '@kbn/test-suites-xpack-performance',
  '@kbn/test-suites-xpack-vectordb',
  '@kbn/test-suites-xpack-workplace-ai',
  '@kbn/test-suites-security-solution-apis',

  // Other test-only infrastructure
  '@kbn/journeys',
  '@kbn/cypress-test-helper',
  '@kbn/performance-testing-dataset-extractor',
  '@kbn/migrator-test-kit',
  '@kbn/web-worker-stub',
]);

/** Returns true when all affected modules are in the excluded list. */
export function shouldSkipScoutTests(moduleIds: ReadonlySet<string>): boolean {
  if (moduleIds.size === 0) return false;
  for (const id of moduleIds) {
    if (!SCOUT_EXCLUDED_MODULES.has(id)) return false;
  }
  return true;
}
