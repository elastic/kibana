/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester: OxlintRuleTester } = await import('oxlint/plugins-dev');
const { createRequire } = await import('node:module');

const require = createRequire(import.meta.url);
const eslint = require('eslint');
const oxlintPlugin = require('../../oxlint_plugin');
const legacyPluginPath = require.resolve('../..');
require.cache[legacyPluginPath] = { exports: oxlintPlugin };

class RuleTester extends OxlintRuleTester {
  constructor(config = {}) {
    const isTypeScript = String(config.parser).includes('@typescript-eslint/parser');
    super({
      eslintCompat: true,
      languageOptions: {
        sourceType: config.parserOptions?.sourceType ?? 'module',
        parserOptions: { lang: isTypeScript ? 'ts' : 'js' },
      },
    });
  }
}

RuleTester.describe = (_, fn) => fn();
RuleTester.it = (_, fn) => fn();
eslint.RuleTester = RuleTester;

const parityTests = {
  'disallow-license-headers': () => require('../disallow_license_headers.test.js'),
  'require-license-header': () => require('../require_license_header.test.js'),
  deployment_agnostic_test_context: () => require('../deployment_agnostic_test_context.test.js'),
  module_migration: () => require('../module_migration.test.js'),
  no_async_foreach: () => require('../no_async_foreach.test.js'),
  no_async_promise_body: () => require('../no_async_promise_body.test.js'),
  no_conditional_saved_object_type_registration: () =>
    require('../no_conditional_saved_object_type_registration.test.js'),
  no_constructor_args_in_property_initializers: () =>
    require('../no_constructor_args_in_property_initializers.test.js'),
  no_npx_playwright: () => require('../no_npx_playwright.test.js'),
  no_sync_import_from_plugin: () => require('../no_sync_import_from_plugin.test.js'),
  no_this_in_property_initializers: () => require('../no_this_in_property_initializers.test.js'),
  no_trailing_import_slash: () => require('../no_trailing_import_slash.test.js'),
  no_unsafe_console: () => require('../no_unsafe_console.test.js'),
  no_unsafe_dynamic_http_path: () => require('../no_unsafe_dynamic_http_path.test.js'),
  no_viz_naming: () => require('../no_viz_naming.test.js'),
  no_wrapped_error_in_logger: () => require('../no_wrapped_error_in_logger.test.js'),
  require_include_in_check_a11y: () => require('../require_include_in_check_a11y.test.js'),
  require_kbn_fs: () => require('../require_kbn_fs.test.js'),
  require_kibana_feature_privileges_naming: () =>
    require('../require_kibana_feature_privileges_naming.test.js'),
  scout_expect_import: () => require('../scout_expect_import.test.js'),
  scout_max_one_describe: () => require('../scout_max_one_describe.test.js'),
  scout_no_at_in_test_titles: () => require('../scout_no_at_in_test_titles.test.js'),
  scout_no_core_settings_in_space_test: () =>
    require('../scout_no_core_settings_in_space_test.test.js'),
  scout_no_cross_boundary_imports: () => require('../scout_no_cross_boundary_imports.test.js'),
  scout_no_deprecated_tags: () => require('../scout_no_deprecated_tags.test.js'),
  scout_no_describe_configure: () => require('../scout_no_describe_configure.test.js'),
  scout_no_es_archiver_in_parallel_tests: () =>
    require('../scout_no_es_archiver_in_parallel_tests.test.js'),
  scout_no_locators: () => require('../scout_no_locators.test.js'),
  scout_no_promise_all_with_playwright_apis: () =>
    require('../scout_no_promise_all_with_playwright_apis.test.js'),
  scout_require_api_client_in_api_test: () =>
    require('../scout_require_api_client_in_api_test.test.js'),
  scout_require_global_setup_hook_in_parallel_tests: () =>
    require('../scout_require_global_setup_hook_in_parallel_tests.test.js'),
  scout_test_file_naming: () => require('../scout_test_file_naming.test.js'),
};

for (const [ruleName, rule] of Object.entries(oxlintPlugin.rules)) {
  if (typeof rule.createOnce !== 'function') {
    throw new Error(`Oxlint plugin rule '${ruleName}' must use createOnce.`);
  }

  const runParityTest = parityTests[ruleName];
  if (!runParityTest) {
    throw new Error(`Oxlint plugin rule '${ruleName}' has no parity test.`);
  }

  runParityTest();
}
