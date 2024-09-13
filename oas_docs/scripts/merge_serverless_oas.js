/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('../../src/setup_node_env');
const { merge } = require('@kbn/openapi-bundler');
const { REPO_ROOT } = require('@kbn/repo-info');

(async () => {
  await merge({
    sourceGlobs: [
      `${REPO_ROOT}/oas_docs/bundle.serverless.json`,
      `${REPO_ROOT}/src/plugins/data_views/docs/openapi/bundled.yaml`,
      `${REPO_ROOT}/x-pack/plugins/ml/common/openapi/ml_apis_serverless.yaml`,
      `${REPO_ROOT}/packages/core/saved-objects/docs/openapi/bundled_serverless.yaml`,
      `${REPO_ROOT}/x-pack/plugins/fleet/common/openapi/bundled.yaml`,

      // Observability Solution
      `${REPO_ROOT}/x-pack/plugins/observability_solution/apm/docs/openapi/apm.yaml`,
      `${REPO_ROOT}/x-pack/plugins/observability_solution/slo/docs/openapi/slo/bundled.yaml`,

      // Security solution
    ],
    outputFilePath: `${REPO_ROOT}/oas_docs/output/kibana.serverless.yaml`,
    options: {
      prototypeDocument: `${REPO_ROOT}/oas_docs/kibana.info.serverless.yaml`,
    },
  });
})();
