/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const UNCATEGORIZED_MODULE_ID = '[uncategorized]';

// Changes here skip affected-package filtering for Jest (full run).
// Keep narrow: global test harness, transforms, CI selection.
export const CRITICAL_FILES_JEST_UNIT_TESTS = [
  'scripts/jest.js',
  'scripts/jest_all.js',
  'package.json',
  'yarn.lock',
  'tsconfig.json',
  '.node-version',
  '.nvmrc',
  'src/setup_node_env/**/*',
  'packages/kbn-babel-preset/**/*',
  'src/platform/packages/shared/kbn-repo-info/**/*',
  'src/platform/packages/shared/kbn-test/**/*',
  'src/platform/packages/private/kbn-scout-reporting/src/reporting/jest/**/*',
  'src/platform/packages/shared/react/kibana_mount/test_helpers/react_mount_serializer.ts',
  'src/platform/packages/private/kbn-jest-serializers/**/*',
  '.buildkite/pipeline-utils/affected-packages/**/*.{ts,js,sh}',
  '.buildkite/pipeline-utils/ci-stats/**/*.{ts,js}',
];

export const CRITICAL_FILES_JEST_INTEGRATION_TESTS = [
  'scripts/jest_integration.js',
  'scripts/jest_all.js',
  'package.json',
  'yarn.lock',
  'tsconfig.json',
  '.node-version',
  '.nvmrc',
  'src/setup_node_env/**/*',
  'packages/kbn-babel-preset/**/*',
  'src/platform/packages/shared/kbn-repo-info/**/*',
  'src/platform/packages/shared/kbn-test/**/*',
  'src/platform/packages/private/kbn-scout-reporting/src/reporting/jest/**/*',
  'src/platform/packages/shared/react/kibana_mount/test_helpers/react_mount_serializer.ts',
  '.buildkite/pipeline-utils/affected-packages/**/*.{ts,js,sh}',
  '.buildkite/pipeline-utils/ci-stats/**/*.{ts,js}',
];

export const CRITICAL_FILES_SCOUT = [
  'package.json',
  'yarn.lock',
  'tsconfig.json',
  '.node-version',
  '.nvmrc',
  'src/setup_node_env/**/*',
  'packages/kbn-babel-preset/**/*',
  'src/platform/packages/shared/kbn-repo-info/**/*',
  'src/platform/packages/shared/kbn-scout/**/*',
  'src/platform/packages/private/kbn-scout-reporting/**/*',
  'scripts/scout.js',
  '.buildkite/scripts/steps/test/scout/**/*',
  '.buildkite/pipeline-utils/affected-packages/**/*.{ts,js,sh}',
  '.buildkite/pipeline-utils/ci-stats/**/*.{ts,js}',
];
