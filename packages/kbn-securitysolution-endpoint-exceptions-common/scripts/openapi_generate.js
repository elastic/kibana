/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('../../../src/setup_node_env');
const { join, resolve } = require('path');
const { generate } = require('@kbn/openapi-generator');
const { REPO_ROOT } = require('@kbn/repo-info');

const ROOT = resolve(__dirname, '..');

(async () => {
  await generate({
    title: 'OpenAPI Endpoint Exceptions API Schemas',
    rootDir: ROOT,
    sourceGlob: './api/**/*.schema.yaml',
    templateName: 'zod_operation_schema',
  });

  await generate({
    title: 'Endpoint Exceptions API client for tests',
    rootDir: ROOT,
    sourceGlob: './api/**/*.schema.yaml',
    templateName: 'api_client_supertest',
    skipLinting: true,
    bundle: {
      outFile: join(
        REPO_ROOT,
        'x-pack/test/api_integration/services/security_solution_endpoint_exceptions_api.gen.ts'
      ),
    },
  });
})();
