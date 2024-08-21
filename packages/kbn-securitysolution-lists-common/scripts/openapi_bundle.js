/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
      'docs/openapi/serverless/security_solution_lists_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['serverless'],
      prototypeDocument: {
        info: {
          title: 'Security Solution Lists API (Elastic Cloud Serverless)',
          description: 'Lists API allows you to manage lists of keywords, IPs or IP ranges items.',
        },
        tags: [
          {
            name: 'Security Solution Lists API',
            description:
              'Lists API allows you to manage lists of keywords, IPs or IP ranges items.',
          },
        ],
      },
    },
  });

  await bundle({
    sourceGlob: join(ROOT, 'api/**/*.schema.yaml'),
    outputFilePath: join(
      ROOT,
      'docs/openapi/ess/security_solution_lists_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['ess'],
      prototypeDocument: {
        info: {
          title: 'Security Solution Lists API (Elastic Cloud and self-hosted)',
          description: 'Lists API allows you to manage lists of keywords, IPs or IP ranges items.',
        },
        tags: [
          {
            name: 'Security Solution Lists API',
            description:
              'Lists API allows you to manage lists of keywords, IPs or IP ranges items.',
          },
        ],
      },
    },
  });
})();
