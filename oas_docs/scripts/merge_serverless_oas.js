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

      // Observability Solution
      `${REPO_ROOT}/x-pack/plugins/observability_solution/apm/docs/openapi/apm.yaml`,
      `${REPO_ROOT}/x-pack/plugins/observability_solution/slo/docs/openapi/slo/bundled.yaml`,

      // Security solution
      `${REPO_ROOT}/x-pack/plugins/security_solution/docs/openapi/serverless/*.schema.yaml`,
      `${REPO_ROOT}/packages/kbn-securitysolution-lists-common/docs/openapi/serverless/*.schema.yaml`,
      `${REPO_ROOT}/packages/kbn-securitysolution-exceptions-common/docs/openapi/serverless/*.schema.yaml`,
      `${REPO_ROOT}/x-pack/packages/kbn-elastic-assistant-common/docs/openapi/serverless/*.schema.yaml`,
      `${REPO_ROOT}/x-pack/plugins/osquery/docs/openapi/serverless/*.schema.yaml`,
    ],
    outputFilePath: `${REPO_ROOT}/oas_docs/output/kibana.serverless.bundled.yaml`,
    options: {
      mergedSpecInfo: {
        title: 'Kibana Serverless',
        description: `**Technical preview**  

    This functionality is in technical preview and may be changed or removed in
    a future release.

    Elastic will work to fix any issues, but features in technical preview are
    not subject to the support SLA of official GA features.


    The Kibana REST APIs for Elastic serverless enable you to manage resources

    such as connectors, data views, and saved objects. The API calls are

    stateless. Each request that you make happens in isolation from other calls

    and must include all of the necessary information for Kibana to fulfill the

    request. API requests return JSON output, which is a format that is

    machine-readable and works well for automation.


    To interact with Kibana APIs, use the following operations:


    - GET: Fetches the information.

    - POST: Adds new information.

    - PUT: Updates the existing information.

    - DELETE: Removes the information.


    You can prepend any Kibana API endpoint with \`kbn:\` and run the request in

    **Dev Tools → Console**. For example:


    \`\`\`

    GET kbn:/api/data_views

    \`\`\``,
        version: '1.0.2',
        license: {
          name: 'Elastic License 2.0',
          url: 'https://www.elastic.co/licensing/elastic-license',
        },
        contact: { name: 'Kibana Team' },
      },
    },
  });
})();
