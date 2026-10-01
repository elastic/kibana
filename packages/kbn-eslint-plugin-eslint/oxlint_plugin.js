/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { eslintCompatPlugin } = require('@oxlint/plugins');

module.exports = eslintCompatPlugin({
  meta: { name: '@kbn/eslint' },
  rules: {
    no_async_promise_body: require('./rules/no_async_promise_body'),
    no_async_foreach: require('./rules/no_async_foreach'),
    no_trailing_import_slash: require('./rules/no_trailing_import_slash'),
    no_constructor_args_in_property_initializers: require('./rules/no_constructor_args_in_property_initializers'),
    no_this_in_property_initializers: require('./rules/no_this_in_property_initializers'),
    no_conditional_saved_object_type_registration: require('./rules/no_conditional_saved_object_type_registration'),
    no_unsafe_console: require('./rules/no_unsafe_console'),
    no_npx_playwright: require('./rules/no_npx_playwright'),
    no_unsafe_dynamic_http_path: require('./rules/no_unsafe_dynamic_http_path'),
    no_wrapped_error_in_logger: require('./rules/no_wrapped_error_in_logger'),
    require_kibana_feature_privileges_naming: require('./rules/require_kibana_feature_privileges_naming'),
    deployment_agnostic_test_context: require('./rules/deployment_agnostic_test_context'),
    no_sync_import_from_plugin: require('./rules/no_sync_import_from_plugin'),
    no_viz_naming: require('./rules/no_viz_naming'),
    scout_no_describe_configure: require('./rules/scout_no_describe_configure'),
    scout_max_one_describe: require('./rules/scout_max_one_describe'),
    scout_no_core_settings_in_space_test: require('./rules/scout_no_core_settings_in_space_test'),
    scout_no_deprecated_tags: require('./rules/scout_no_deprecated_tags'),
    scout_no_at_in_test_titles: require('./rules/scout_no_at_in_test_titles'),
    scout_no_locators: require('./rules/scout_no_locators'),
    scout_no_promise_all_with_playwright_apis: require('./rules/scout_no_promise_all_with_playwright_apis'),
    require_include_in_check_a11y: require('./rules/require_include_in_check_a11y'),
    require_kbn_fs: require('./rules/require_kbn_fs'),
  },
});
