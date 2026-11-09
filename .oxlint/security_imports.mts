/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OxlintOverride } from 'oxlint';

/**
 * Files that already import axios. New axios imports must not be added here;
 * this list is expected to shrink as consumers migrate to the native `fetch` API.
 * Globs are scoped to existing feature boundaries to keep the leak surface small.
 */
const AXIOS_LEGACY_CONSUMERS = [
  '.buildkite/**/*.{js,mjs,ts,tsx,jsx}',
  'packages/kbn-ci-stats-performance-metrics/**/*.{js,mjs,ts,tsx}',
  'packages/kbn-generate/**/*.{js,mjs,ts,tsx}',
  'src/dev/build/lib/**/*.{js,mjs,ts,tsx}',
  'src/dev/build/tasks/**/*.{js,mjs,ts,tsx}',
  'src/dev/prs/**/*.{js,mjs,ts,tsx}',
  'src/platform/packages/private/kbn-ci-stats-reporter/**/*.{js,mjs,ts,tsx}',
  'src/platform/packages/shared/kbn-connector-specs/**/*.{js,mjs,ts,tsx}',
  'src/platform/packages/shared/kbn-cypress-test-helper/**/*.{js,mjs,ts,tsx}',
  'src/platform/packages/shared/kbn-dev-utils/src/axios/**/*.{js,mjs,ts,tsx}',
  'x-pack/examples/alerting_example/server/rule_types/**/*.{js,mjs,ts,tsx}',
  'x-pack/packages/kbn-synthetics-private-location/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/packages/shared/kbn-data-forge/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/plugins/private/canvas/common/lib/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/plugins/private/data_usage/server/services/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/plugins/private/indices_metadata/server/lib/services/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/plugins/shared/actions/server/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/plugins/shared/cloud_connect/server/routes/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/plugins/shared/cloud_connect/server/services/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/plugins/shared/dataset_quality/server/test_helpers/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/plugins/shared/fleet/server/services/agents/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/plugins/shared/fleet/server/telemetry/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/plugins/shared/inference/scripts/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/plugins/shared/observability_ai_assistant/server/service/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/plugins/shared/osquery/cypress/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/plugins/shared/screenshotting/server/browsers/chromium/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/plugins/shared/screenshotting/server/browsers/download/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/plugins/shared/stack_connectors/server/connector_types/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/test/alerting_api_integration/common/plugins/alerts/server/sub_action_connector.ts',
  'x-pack/platform/test/alerting_api_integration/security_and_spaces/group4/tests/alerting/mustache_templates.ts',
  'x-pack/platform/test/alerting_api_integration/spaces_only/tests/alerting/group4/mustache_templates.ts',
  'x-pack/platform/test/fleet_api_integration/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/test/fleet_cypress/agent.ts',
  'x-pack/platform/test/fleet_cypress/artifact_manager.ts',
  'x-pack/platform/test/fleet_cypress/fleet_server.ts',
  'x-pack/platform/test/fleet_multi_cluster/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/observability/packages/alerting-test-data/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/observability/packages/kbn-synthetics-forge/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/observability/plugins/apm/scripts/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/observability/plugins/apm/server/test_helpers/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/observability/plugins/observability_ai_assistant_app/scripts/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/observability/plugins/synthetics/scripts/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/observability/plugins/synthetics/server/synthetics_service/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/observability/plugins/synthetics/server/telemetry/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/security/packages/kbn-securitysolution-utils/src/axios/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/security/plugins/security_solution/server/integration_tests/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/security/plugins/security_solution/server/lib/telemetry/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/security/test/security_solution_api_integration/config/services/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/security/test/security_solution_cypress/cypress/support/**/*.{js,mjs,ts,tsx}',
];

/**
 * Security-related restricted imports. These are enforced by the dedicated
 * `@kbn/eslint/security_imports_restriction` rule so that local
 * `no-restricted-imports` overrides cannot silently drop them.
 */
const SECURITY_RESTRICTED_IMPORTS = [
  {
    name: 'lodash',
    importNames: ['set', 'setWith', 'template'],
    message:
      'lodash.set/setWith: Please use @kbn/safer-lodash-set instead.\n' +
      'lodash.template: Function is unsafe, and not compatible with our content security policy.',
  },
  {
    name: 'lodash.set',
    message: 'Please use @kbn/safer-lodash-set/set instead',
  },
  {
    name: 'lodash.setwith',
    message: 'Please use @kbn/safer-lodash-set/setWith instead',
  },
  {
    name: 'lodash/set',
    message: 'Please use @kbn/safer-lodash-set/set instead',
  },
  {
    name: 'lodash/setWith',
    message: 'Please use @kbn/safer-lodash-set/setWith instead',
  },
  {
    name: 'lodash/fp',
    importNames: ['set', 'setWith', 'assoc', 'assocPath', 'template'],
    message:
      'lodash.set/setWith/assoc/assocPath: Please use @kbn/safer-lodash-set/fp instead\n' +
      'lodash.template: Function is unsafe, and not compatible with our content security policy.',
  },
  {
    name: 'lodash/fp/set',
    message: 'Please use @kbn/safer-lodash-set/fp/set instead',
  },
  {
    name: 'lodash/fp/setWith',
    message: 'Please use @kbn/safer-lodash-set/fp/setWith instead',
  },
  {
    name: 'lodash/fp/assoc',
    message: 'Please use @kbn/safer-lodash-set/fp/assoc instead',
  },
  {
    name: 'lodash/fp/assocPath',
    message: 'Please use @kbn/safer-lodash-set/fp/assocPath instead',
  },
  {
    name: 'lodash.template',
    message: 'lodash.template is unsafe, and not compatible with our content security policy.',
  },
  {
    name: 'lodash/template',
    message: 'lodash.template is unsafe, and not compatible with our content security policy.',
  },
  {
    name: 'lodash/fp/template',
    message: 'lodash.template is unsafe, and not compatible with our content security policy.',
  },
  {
    name: 'axios',
    message:
      'Do not introduce new axios usage. Use the native `fetch` API instead (available in Node.js 22 and modern browsers). Existing consumers are being migrated incrementally; the allowlist in AXIOS_LEGACY_CONSUMERS will shrink over time.',
  },
];

/** Order matters: the axios allowlist replaces the general options for its files. */
export const securityImportsOverrides: OxlintOverride[] = [
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    rules: {
      '@kbn/eslint/security_imports_restriction': ['error', ...SECURITY_RESTRICTED_IMPORTS],
    },
  },
  {
    files: AXIOS_LEGACY_CONSUMERS,
    rules: {
      '@kbn/eslint/security_imports_restriction': [
        'error',
        ...SECURITY_RESTRICTED_IMPORTS.filter(({ name }) => name !== 'axios'),
      ],
    },
  },
];
