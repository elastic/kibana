/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/setup-node-env/root');
require('@kbn/setup-node-env/node_version_validator');
import('../src/dev/kbn_pm/src/cli.mjs').catch(function (error) {
  console.error('UNHANDLED EXCEPTION:', error.stack);
  process.exit(1);
});
