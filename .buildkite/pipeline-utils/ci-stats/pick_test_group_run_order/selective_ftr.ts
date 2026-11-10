/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  allChangedFilesInScope,
  getAffectedPackages,
  touchedCriticalFiles,
} from '../../affected-packages/index.ts';

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
  '@kbn/performance-testing-dataset-extractor',
  '@kbn/dependency-ownership',

  // Lint
  '@kbn/eslint-config',
  '@kbn/eslint-plugin-alerting-v2',
  '@kbn/eslint-plugin-disable',
  '@kbn/eslint-plugin-eslint',
  '@kbn/eslint-plugin-i18n',
  '@kbn/eslint-plugin-imports',
  '@kbn/eslint-plugin-telemetry',
  '@kbn/eslint-plugin-kbn-ui',
  '@kbn/eslint-plugin-kbn-monaco',
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
  'pnpm-lock.yaml',
  '.nvmrc',
  'config/**/*.yml',
  'config/node.options',
];

/** Skip FTR when every changed file matches, regardless of owning module. */
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
  // Scout (Playwright) test trees never affect FTR, whichever module owns them.
  '**/test/scout{_*,}/**',
];

/**
 * Modules directly owning changed files, ignoring FTR-irrelevant paths so e.g. a plugin's
 * `test/scout/**` changes don't count as changes to that plugin. Returns null on failure.
 */
export async function getFtrRelevantModules(
  changedFiles: readonly string[]
): Promise<Set<string> | null> {
  return getAffectedPackages(undefined, {
    changedFiles: [...changedFiles],
    strategy: 'git',
    includeDownstream: false,
    ignorePatterns: FTR_IRRELEVANT_PATHS,
    ignoreUncategorizedChanges: true,
  }).catch((error) => {
    console.error('Error getting affected packages for FTR skip check', error);
    return null;
  });
}

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

  if (allChangedFilesInScope(changedFiles, FTR_IRRELEVANT_PATHS)) {
    return true;
  }

  if (affectedModules.size > 0) {
    for (const id of affectedModules) {
      if (!FTR_EXCLUDED_MODULES.has(id)) {
        return false;
      }
    }
    return true;
  }

  return false;
}

/** Directly affected modules when the diff cannot affect FTR; null when FTR must run. */
export async function getFtrSkipModules(changedFiles: string[]): Promise<string[] | null> {
  const directlyAffected = await getFtrRelevantModules(changedFiles);

  if (directlyAffected === null || !shouldSkipFtrTests(directlyAffected, changedFiles)) {
    return null;
  }
  return [...directlyAffected];
}
