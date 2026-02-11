/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/setup-node-env');
const { merge } = require('@kbn/openapi-bundler');
const { REPO_ROOT } = require('@kbn/repo-info');
const checkBundle = require('./check_bundles');

(async () => {
  checkBundle(`${REPO_ROOT}/oas_docs/bundle.json`);
  await merge({
    sourceGlobs: [
      `${REPO_ROOT}/oas_docs/bundle.json`,
      `${REPO_ROOT}/x-pack/platform/plugins/shared/alerting/docs/openapi/bundled.yaml`,
      `${REPO_ROOT}/x-pack/platform/plugins/shared/cases/docs/openapi/bundled-types.schema.yaml`,
      `${REPO_ROOT}/src/platform/plugins/shared/data_views/docs/openapi/bundled.yaml`,
      `${REPO_ROOT}/x-pack/platform/plugins/shared/features/docs/openapi/feature_apis.yaml`,
      `${REPO_ROOT}/x-pack/platform/plugins/shared/ml/common/openapi/ml_apis.yaml`,
      `${REPO_ROOT}/src/core/packages/saved-objects/docs/openapi/bundled.yaml`,
      `${REPO_ROOT}/x-pack/platform/plugins/private/upgrade_assistant/docs/openapi/upgrade_apis.yaml`,
      `${REPO_ROOT}/x-pack/platform/plugins/shared/security/docs/openapi/user_session_apis.yaml`,
      `${REPO_ROOT}/src/platform/plugins/shared/share/docs/openapi/short_url_apis.yaml`,
      `${REPO_ROOT}/x-pack/platform/plugins/private/logstash/docs/openapi/logstash_apis.yaml`,
      `${REPO_ROOT}/x-pack/platform/plugins/shared/task_manager/docs/openapi/bundled.yaml`,

      // Observability Solution
      `${REPO_ROOT}/x-pack/solutions/observability/plugins/apm/docs/openapi/apm/bundled.yaml`,
      `${REPO_ROOT}/x-pack/solutions/observability/plugins/slo/docs/openapi/slo/bundled.yaml`,
      `${REPO_ROOT}/x-pack/solutions/observability/plugins/uptime/docs/openapi/uptime_apis.yaml`,
      `${REPO_ROOT}/x-pack/solutions/observability/plugins/observability_ai_assistant_app/docs/openapi/observability_ai_assistant_app_apis.yaml`,
      `${REPO_ROOT}/x-pack/solutions/observability/plugins/synthetics/docs/openapi/synthetic_apis.yaml`,

      // Security solution
      `${REPO_ROOT}/x-pack/solutions/security/plugins/security_solution/docs/openapi/ess/*.schema.yaml`,
      `${REPO_ROOT}/x-pack/solutions/security/packages/kbn-securitysolution-lists-common/docs/openapi/ess/*.schema.yaml`,
      `${REPO_ROOT}/x-pack/solutions/security/packages/kbn-securitysolution-exceptions-common/docs/openapi/ess/*.schema.yaml`,
      `${REPO_ROOT}/x-pack/solutions/security/packages/kbn-securitysolution-endpoint-exceptions-common/docs/openapi/ess/*.schema.yaml`,
      `${REPO_ROOT}/x-pack/platform/packages/shared/kbn-elastic-assistant-common/docs/openapi/ess/elastic_assistant_api_2023_10_31.bundled.schema.yaml`,
      `${REPO_ROOT}/x-pack/platform/packages/shared/kbn-elastic-assistant-common/docs/openapi/ess/attack_discovery_api_2023_10_31.bundled.schema.yaml`,
      `${REPO_ROOT}/x-pack/platform/plugins/shared/osquery/docs/openapi/ess/*.schema.yaml`,
    ],
    outputFilePath: `${REPO_ROOT}/oas_docs/output/kibana.yaml`,
    options: {
      prototypeDocument: `${REPO_ROOT}/oas_docs/kibana.info.yaml`,
    },
  });
})();
