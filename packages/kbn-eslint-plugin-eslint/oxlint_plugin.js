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
    require_kibana_feature_privileges_naming: require('./rules/require_kibana_feature_privileges_naming'),
  },
});
