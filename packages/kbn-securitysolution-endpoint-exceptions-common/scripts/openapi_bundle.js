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
const { bundle } = require('@kbn/openapi-bundler');

const ROOT = resolve(__dirname, '..');

(async () => {
  await bundle({
    sourceGlob: join(ROOT, 'api/**/*.schema.yaml'),
    outputFilePath: join(
      ROOT,
      'docs/openapi/serverless/security_solution_endpoint_exceptions_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['serverless'],
      prototypeDocument: {
        info: {
          title: 'Security Solution Endpoint Exceptions API (Elastic Cloud Serverless)',
          description: 'Endpoint Exceptions API allow you to manage Endpoint lists.',
        },
      },
    },
  });

  await bundle({
    sourceGlob: join(ROOT, 'api/**/*.schema.yaml'),
    outputFilePath: join(
      ROOT,
      'docs/openapi/ess/security_solution_endpoint_exceptions_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['ess'],
      prototypeDocument: {
        info: {
          title: 'Security Solution Endpoint Exceptions API (Elastic Cloud and self-hosted)',
          description: 'Endpoint Exceptions API allow you to manage Endpoint lists.',
        },
      },
    },
  });
})();
