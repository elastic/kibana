/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/setup-node-env');
const { runScript } = require('@kbn/product-doc-artifact-builder');

// Prepend 'openapi' command if not already present
const args = process.argv.slice(2);
if (args[0] !== 'openapi') {
  args.unshift('openapi');
}
process.argv = [process.argv[0], process.argv[1], ...args];

runScript();
