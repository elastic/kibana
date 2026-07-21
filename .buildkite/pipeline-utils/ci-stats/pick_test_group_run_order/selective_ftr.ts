/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { allChangedFilesInScope, touchedCriticalFiles } from '../../affected-packages';

/**
 * Modules that can never affect FTR tests. When a PR only touches modules in
 * this set (and no FTR-critical paths), FTR configs are skipped entirely.
 *
 * Inverse of Scout's `SCOUT_EXCLUDED_MODULES`: those are FTR/Jest-infra modules
 * that should not trigger Scout; these are Scout/Jest/Cypress/lint modules that
 * should not trigger FTR.
 *
 * Do NOT add:
 * - Product plugins or shared runtime libraries consumed by the Kibana server/UI
 * - `@kbn/test`, `@kbn/test-suites-*`, `@kbn/ftr-*`, `@kbn/journeys`, or other
 *   FTR framework / suite packages
 * - Build toolchain that ships into the Kibana bundle (`@kbn/babel-*`, optimizer)
 * - `@kbn/scout-info` / `@kbn/scout-reporting` — imported by FTR configs and the
 *   FTR mocha reporter (`ScoutFTRReporter`)
 * - `@kbn/test-jest-helpers` — still imported by FTR services (e.g. `delay` in
 *   `@kbn/ftr-common-functional-ui-services` / `@kbn/ftr-common-functional-services`)
 */

export const FTR_EXCLUDED_MODULES: ReadonlySet<string> = new Set([
  // Scout ecosystem (Playwright-only helpers — not FTR runtime deps)
  '@kbn/scout',
  '@kbn/scout-oblt',
  '@kbn/scout-search',
  '@kbn/scout-security',
  '@kbn/scout-synthtrace',
  '@kbn/scout-release-testing',
  '@kbn/content-list-scout',

  // Jest-only helpers (not @kbn/test-jest-helpers — used by FTR services today)
  '@kbn/test-eui-helpers',
  '@kbn/jest-serializers',

  // Cypress
  '@kbn/cypress-config',
  '@kbn/cypress-test-helper',
  '@kbn/osquery-plugin-cypress',
  '@kbn/fleet-plugin-cypress',

  // Storybook / stubs / LLM eval harness
  '@kbn/storybook',
  '@kbn/web-worker-stub',
  '@kbn/migrator-test-kit',
  '@kbn/evals',
  '@kbn/evals-extensions',
  '@kbn/evals-phoenix-executor',
  '@kbn/evals-plugin',
  '@kbn/performance-testing-dataset-extractor',

  // Lint / static analysis (does not affect FTR runtime)
  '@kbn/eslint-config',
  '@kbn/eslint-plugin-alerting-v2',
  '@kbn/eslint-plugin-disable',
  '@kbn/eslint-plugin-eslint',
  '@kbn/eslint-plugin-i18n',
  '@kbn/eslint-plugin-imports',
  '@kbn/eslint-plugin-telemetry',
  '@kbn/eslint-plugin-kbn-ui',
  '@kbn/check-kibana-settings-cli',
]);

/**
 * Paths that must always keep FTR enabled when touched, even if every
 * categorized module is on the exclusion list (e.g. lockfile + scout-only).
 */
export const FTR_CRITICAL_PATHS: readonly string[] = [
  '.buildkite/ftr-manifests/**',
  '.buildkite/scripts/steps/test/ftr_configs.sh',
  '.buildkite/scripts/steps/functional/**',
  '.buildkite/pipeline-utils/ci-stats/pick_test_group_run_order/**',
  '.buildkite/pipeline-utils/affected-packages/**',
  'scripts/functional_tests.js',
  'scripts/functional_tests_server.js',
  'scripts/functional_test_runner.js',
  'package.json',
  'yarn.lock',
  '.node-version',
  '.nvmrc',
];

/**
 * When no categorized modules are affected, skip FTR only if every changed
 * file matches one of these globs (CI/docs/ownership noise).
 */
export const FTR_IRRELEVANT_PATHS: readonly string[] = [
  'docs/**',
  '**/docs/**',
  'oas_docs/**',
  '**/*.md',
  '**/*.mdx',
  '**/*.asciidoc',
  'fleet_packages.json',
  '.buildkite/**',
  '.claude/**',
  '.github/**',
  '**/.github/**',
  'CODEOWNERS',
  '**/CODEOWNERS',
  'OWNERS',
  '**/OWNERS',
  '**/.eslintrc*',
  '**/.prettierrc*',
  '.mise.toml',
  '.river/**',
  // i18n namespace registration / license / renovate noise
  '**/.i18nrc.json',
  '.i18nrc.json',
  'renovate.json',
  'catalog-info.yaml',
  'NOTICE.txt',
  'LICENSE',
  'LICENSE.txt',
  '.backportrc.json',
  // static assets
  '**/*.png',
  '**/*.svg',
  '**/*.gif',
  '**/*.jpg',
  '**/*.jpeg',
  '**/*.webp',
];

/**
 * Returns true when FTR configs should be omitted from the Jest/FTR
 * orchestrator for this PR.
 *
 * - Critical paths always keep FTR on.
 * - Non-empty affected modules → skip only when every module is excluded.
 * - Empty affected modules (uncategorized-only) → skip only when every
 *   changed file matches `FTR_IRRELEVANT_PATHS`.
 */
export function shouldSkipFtrTests(
  affectedModules: ReadonlySet<string>,
  changedFiles: readonly string[]
): boolean {
  if (changedFiles.length === 0) {
    return false;
  }

  if (touchedCriticalFiles([...changedFiles], [...FTR_CRITICAL_PATHS])) {
    return false;
  }

  if (affectedModules.size > 0) {
    for (const id of affectedModules) {
      if (!FTR_EXCLUDED_MODULES.has(id)) {
        return false;
      }
    }
    return true;
  }

  return allChangedFilesInScope(changedFiles, FTR_IRRELEVANT_PATHS);
}
