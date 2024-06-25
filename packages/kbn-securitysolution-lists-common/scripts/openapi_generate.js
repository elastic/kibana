/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

require('../../../src/setup_node_env');
const { resolve } = require('path');
const { generate } = require('@kbn/openapi-generator');

const ROOT = resolve(__dirname, '..');

(async () => {
  await generate({
    title: 'OpenAPI Lists API Schemas',
    rootDir: ROOT,
    sourceGlob: './**/*.schema.yaml',
    templateName: 'zod_operation_schema',
  });
})();
