/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

module.exports = {
  rules: {
    'require-license-header': require('./rules/require_license_header'),
    'disallow-license-headers': require('./rules/disallow_license_headers'),
    'no-restricted-paths': require('./rules/no_restricted_paths'),
    module_migration: require('./rules/module_migration'),
  },
};
