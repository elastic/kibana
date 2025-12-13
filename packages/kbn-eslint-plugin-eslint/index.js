/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

module.exports = {
  rules: {
    'require-license-header': require('./rules/require_license_header'),
    'disallow-license-headers': require('./rules/disallow_license_headers'),
    module_migration: require('./rules/module_migration'),
    no_export_all: require('./rules/no_export_all'),
    no_async_promise_body: require('./rules/no_async_promise_body'),
    no_async_foreach: require('./rules/no_async_foreach'),
    no_trailing_import_slash: require('./rules/no_trailing_import_slash'),
    no_constructor_args_in_property_initializers: require('./rules/no_constructor_args_in_property_initializers'),
    no_this_in_property_initializers: require('./rules/no_this_in_property_initializers'),
    no_unsafe_console: require('./rules/no_unsafe_console'),
    no_unsafe_hash: require('./rules/no_unsafe_hash'),
    require_kibana_feature_privileges_naming: require('./rules/require_kibana_feature_privileges_naming'),
    no_deprecated_imports: require('./rules/no_deprecated_imports'),
    deployment_agnostic_test_context: require('./rules/deployment_agnostic_test_context'),
    scout_no_describe_configure: require('./rules/scout_no_describe_configure'),
    scout_require_api_client_in_api_test: require('./rules/scout_require_api_client_in_api_test'),
    require_kbn_fs: require('./rules/require_kbn_fs'),
    require_include_in_check_a11y: require('./rules/require_include_in_check_a11y'),
  },
};
