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

// Jest integration configs that must run on every PR regardless of the affected-package graph.
// These boot a full Kibana and snapshot a *global registry* populated at runtime by many
// downstream publishers that sit upstream of the config's own package in the dependency graph.
// includeDownstream expansion therefore never reaches them, so the graph cannot predict when a
// publisher-only change (e.g. a new rule-type param, connector type, or task type) invalidates the
// snapshot. Keep this list tiny — it is a deliberate escape hatch, not a dumping ground.
export const ALWAYS_RUN_JEST_INTEGRATION_CONFIGS = [
  // rule-type param + alert-as-data field snapshots; rule types are registered by security, o11y,
  // ml, apm, stack, monitoring, … (serverless_upgrade_and_rollback_checks, alert_as_data_fields)
  'x-pack/platform/plugins/shared/alerting/jest.integration.config.js',
  // connector-type registry snapshot; connector types registered by stack_connectors et al.
  'x-pack/platform/plugins/shared/actions/jest.integration.config.js',
  // task cost/priority registry snapshots; task types registered by many downstream plugins
  'x-pack/platform/plugins/shared/task_manager/jest.integration.config.js',
];
