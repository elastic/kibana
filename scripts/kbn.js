/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// When running kbn.js, bootstrap is not done yet, package links are not established
// So we use direct relative paths to the setup_node_env files
/* eslint-disable @kbn/imports/uniform_imports */
require('../src/setup_node_env/root');
require('../src/setup_node_env/node_version_validator');
import('../src/dev/kbn_pm/src/cli.mjs').catch(function (error) {
  console.error('UNHANDLED EXCEPTION:', error.stack);
  process.exit(1);
});
