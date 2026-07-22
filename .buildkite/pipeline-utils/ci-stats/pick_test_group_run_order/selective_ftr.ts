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
 * Modules that cannot affect FTR. When a PR only touches these (and no critical
 * paths), FTR is skipped. Do not add FTR runtime deps (e.g. scout-info,
 * scout-reporting, test-jest-helpers) or product/build packages.
 */
export const FTR_EXCLUDED_MODULES: ReadonlySet<string> = new Set([
  // Scout (Playwright)
  '@kbn/scout',
  '@kbn/scout-oblt',
  '@kbn/scout-search',
  '@kbn/scout-security',
  '@kbn/scout-synthtrace',
  '@kbn/scout-release-testing',
  '@kbn/content-list-scout',

  // Jest
  '@kbn/test-eui-helpers',
  '@kbn/jest-serializers',

  // Cypress
  '@kbn/cypress-config',
  '@kbn/cypress-test-helper',
  '@kbn/osquery-plugin-cypress',
  '@kbn/fleet-plugin-cypress',

  // Misc test-only / evals
  '@kbn/storybook',
  '@kbn/web-worker-stub',
  '@kbn/migrator-test-kit',
  '@kbn/evals',
  '@kbn/evals-extensions',
  '@kbn/evals-phoenix-executor',
  '@kbn/performance-testing-dataset-extractor',

  // Lint
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

/** Always keep FTR on when these paths change. */
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

/** Uncategorized-only diffs: skip FTR when every file matches. */
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
  '**/.i18nrc.json',
  '.i18nrc.json',
  'renovate.json',
  'catalog-info.yaml',
  'NOTICE.txt',
  'LICENSE',
  'LICENSE.txt',
  '.backportrc.json',
  '**/*.png',
  '**/*.svg',
  '**/*.gif',
  '**/*.jpg',
  '**/*.jpeg',
  '**/*.webp',
];

/** True when this PR should omit FTR configs. */
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
