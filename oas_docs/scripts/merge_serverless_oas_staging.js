/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

require('../../src/setup_node_env');
const { merge } = require('@kbn/openapi-bundler');
const { REPO_ROOT } = require('@kbn/repo-info');

(async () => {
  await merge({
    sourceGlobs: [
      `${REPO_ROOT}/oas_docs/bundle.serverless.json`,
      `${REPO_ROOT}/x-pack/plugins/actions/docs/openapi/bundled_serverless.yaml`,
      `${REPO_ROOT}/src/plugins/data_views/docs/openapi/bundled.yaml`,
      `${REPO_ROOT}/x-pack/plugins/ml/common/openapi/ml_apis_serverless.yaml`,
      `${REPO_ROOT}/packages/core/saved-objects/docs/openapi/bundled_serverless.yaml`,
      `${REPO_ROOT}/x-pack/plugins/fleet/common/openapi/bundled.yaml`,

      // Observability Solution
      `${REPO_ROOT}/x-pack/plugins/observability_solution/apm/docs/openapi/apm.yaml`,
      `${REPO_ROOT}/x-pack/plugins/observability_solution/slo/docs/openapi/slo/bundled.yaml`,

      // Security solution
      `${REPO_ROOT}/x-pack/plugins/security_solution/docs/openapi/serverless/*.schema.yaml`,
      `${REPO_ROOT}/packages/kbn-securitysolution-lists-common/docs/openapi/serverless/*.schema.yaml`,
      `${REPO_ROOT}/packages/kbn-securitysolution-exceptions-common/docs/openapi/serverless/*.schema.yaml`,
      `${REPO_ROOT}/packages/kbn-securitysolution-endpoint-exceptions-common/docs/openapi/serverless/*.schema.yaml`,
      `${REPO_ROOT}/x-pack/packages/kbn-elastic-assistant-common/docs/openapi/serverless/*.schema.yaml`,
      `${REPO_ROOT}/x-pack/plugins/osquery/docs/openapi/serverless/*.schema.yaml`,
    ],
    outputFilePath: `${REPO_ROOT}/oas_docs/output/kibana.serverless.staging.yaml`,
    options: {
      prototypeDocument: `${REPO_ROOT}/oas_docs/kibana.info.serverless.yaml`,
    },
  });
})();
