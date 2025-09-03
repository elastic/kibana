/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// A simple Node.js script to add two new properties to each JSON file
const fs = require('fs').promises;
const { pick } = require('lodash');
const path = require('path');

// List of JSON files to process
const jsonFiles = [
  'examples/content_management_examples/kibana.jsonc',
  'examples/controls_example/kibana.jsonc',
  'examples/data_streams_example/kibana.jsonc',
  'examples/data_view_field_editor_example/kibana.jsonc',
  'examples/dependency_injection/kibana.jsonc',
  'examples/developer_examples/kibana.jsonc',
  'examples/discover_customization_examples/kibana.jsonc',
  'examples/embeddable_examples/kibana.jsonc',
  'examples/error_boundary/kibana.jsonc',
  'examples/eso_model_version_example/kibana.jsonc',
  'examples/esql_ast_inspector/kibana.jsonc',
  'examples/esql_validation_example/kibana.jsonc',
  'examples/expressions_explorer/kibana.jsonc',
  'examples/feature_control_examples/kibana.jsonc',
  'examples/feature_flags_example/kibana.jsonc',
  'examples/field_formats_example/kibana.jsonc',
  'examples/files_example/kibana.jsonc',
  'examples/hello_world/kibana.jsonc',
  'examples/locator_examples/kibana.jsonc',
  'examples/locator_explorer/kibana.jsonc',
  'examples/partial_results_example/kibana.jsonc',
  'examples/portable_dashboards_example/kibana.jsonc',
  'examples/preboot_example/kibana.jsonc',
  'examples/resizable_layout_examples/kibana.jsonc',
  'examples/response_stream/kibana.jsonc',
  'examples/routing_example/kibana.jsonc',
  'examples/screenshot_mode_example/kibana.jsonc',
  'examples/search_examples/kibana.jsonc',
  'examples/share_examples/kibana.jsonc',
  'examples/sse_example/kibana.jsonc',
  'examples/state_containers_examples/kibana.jsonc',
  'examples/ui_action_examples/kibana.jsonc',
  'examples/ui_actions_explorer/kibana.jsonc',
  'examples/unified_doc_viewer/kibana.jsonc',
  'examples/unified_field_list_examples/kibana.jsonc',
  'examples/unified_tabs_examples/kibana.jsonc',
  'examples/user_profile_examples/kibana.jsonc',
  'examples/v8_profiler_examples/kibana.jsonc',
  'examples/workflows/kibana.jsonc',
  'packages/kbn-babel-preset/kibana.jsonc',
  'packages/kbn-capture-oas-snapshot-cli/kibana.jsonc',
  'packages/kbn-check-prod-native-modules-cli/kibana.jsonc',
  'packages/kbn-check-saved-objects-cli/kibana.jsonc',
  'packages/kbn-ci-stats-performance-metrics/kibana.jsonc',
  'packages/kbn-ci-stats-shipper-cli/kibana.jsonc',
  'packages/kbn-cli-dev-mode/kibana.jsonc',
  'packages/kbn-dependency-ownership/kibana.jsonc',
  'packages/kbn-dependency-usage/kibana.jsonc',
  'packages/kbn-docs-utils/kibana.jsonc',
  'packages/kbn-eslint-config/kibana.jsonc',
  'packages/kbn-eslint-plugin-disable/kibana.jsonc',
  'packages/kbn-eslint-plugin-eslint/kibana.jsonc',
  'packages/kbn-eslint-plugin-eui-a11y/kibana.jsonc',
  'packages/kbn-eslint-plugin-i18n/kibana.jsonc',
  'packages/kbn-eslint-plugin-imports/kibana.jsonc',
  'packages/kbn-eslint-plugin-telemetry/kibana.jsonc',
  'packages/kbn-extract-plugin-translations/kibana.jsonc',
  'packages/kbn-failed-test-reporter-cli/kibana.jsonc',
  'packages/kbn-find-used-node-modules/kibana.jsonc',
  'packages/kbn-generate/kibana.jsonc',
  'packages/kbn-generate-console-definitions/kibana.jsonc',
  'packages/kbn-import-locator/kibana.jsonc',
  'packages/kbn-json-ast/kibana.jsonc',
  'packages/kbn-kibana-manifest-schema/kibana.jsonc',
  'packages/kbn-lint-packages-cli/kibana.jsonc',
  'packages/kbn-lint-ts-projects-cli/kibana.jsonc',
  'packages/kbn-lock-manager/kibana.jsonc',
  'packages/kbn-managed-vscode-config/kibana.jsonc',
  'packages/kbn-managed-vscode-config-cli/kibana.jsonc',
  'packages/kbn-manifest/kibana.jsonc',
  'packages/kbn-mock-idp-plugin/kibana.jsonc',
  'packages/kbn-optimizer/kibana.jsonc',
  'packages/kbn-peggy-loader/kibana.jsonc',
  'packages/kbn-performance-testing-dataset-extractor/kibana.jsonc',
  'packages/kbn-picomatcher/kibana.jsonc',
  'packages/kbn-plugin-check/kibana.jsonc',
  'packages/kbn-plugin-generator/kibana.jsonc',
  'packages/kbn-plugin-helpers/kibana.jsonc',
  'packages/kbn-relocate/kibana.jsonc',
  'packages/kbn-repo-file-maps/kibana.jsonc',
  'packages/kbn-repo-linter/kibana.jsonc',
  'packages/kbn-repo-source-classifier/kibana.jsonc',
  'packages/kbn-repo-source-classifier-cli/kibana.jsonc',
  'packages/kbn-set-map/kibana.jsonc',
  'packages/kbn-sort-package-json/kibana.jsonc',
  'packages/kbn-styled-components-mapping-cli/kibana.jsonc',
  'packages/kbn-ts-projects/kibana.jsonc',
  'packages/kbn-ts-type-check-cli/kibana.jsonc',
  'packages/kbn-validate-next-docs-cli/kibana.jsonc',
  'packages/kbn-web-worker-stub/kibana.jsonc',
  'packages/kbn-whereis-pkg-cli/kibana.jsonc',
  'packages/kbn-yarn-lock-validator/kibana.jsonc',
  'src/platform/packages/private/kbn-import-resolver/src/__fixtures__/packages/box/kibana.jsonc',
  'src/platform/packages/private/kbn-import-resolver/src/__fixtures__/src/bar/kibana.jsonc',
  'src/platform/packages/shared/kbn-data-view-validation/kibana.jsonc',
  'src/platform/plugins/shared/dashboard_markdown/kibana.jsonc',
  'x-pack/examples/alerting_example/kibana.jsonc',
  'x-pack/examples/embedded_lens_example/kibana.jsonc',
  'x-pack/examples/gen_ai_streaming_response_example/kibana.jsonc',
  'x-pack/examples/lens_config_builder_example/kibana.jsonc',
  'x-pack/examples/lens_embeddable_inline_editing_example/kibana.jsonc',
  'x-pack/examples/screenshotting_example/kibana.jsonc',
  'x-pack/examples/testing_embedded_lens/kibana.jsonc',
  'x-pack/examples/third_party_lens_navigation_prompt/kibana.jsonc',
  'x-pack/examples/third_party_maps_source_example/kibana.jsonc',
  'x-pack/examples/third_party_vis_lens_example/kibana.jsonc',
  'x-pack/examples/triggers_actions_ui_example/kibana.jsonc',
  'x-pack/packages/ai-infra/product-doc-artifact-builder/kibana.jsonc',
  'x-pack/packages/kbn-synthetics-private-location/kibana.jsonc',
  'x-pack/performance/kibana.jsonc',
  'x-pack/platform/packages/shared/ai-infra/inference-langchain/kibana.jsonc',
  'x-pack/platform/test/alerting_api_integration/common/plugins/aad/kibana.jsonc',
  'x-pack/platform/test/alerting_api_integration/common/plugins/actions_simulators/kibana.jsonc',
  'x-pack/platform/test/alerting_api_integration/common/plugins/alerts/kibana.jsonc',
  'x-pack/platform/test/alerting_api_integration/common/plugins/alerts_restricted/kibana.jsonc',
  'x-pack/platform/test/alerting_api_integration/common/plugins/task_manager_fixture/kibana.jsonc',
  'x-pack/platform/test/cases_api_integration/common/plugins/cases/kibana.jsonc',
  'x-pack/platform/test/cases_api_integration/common/plugins/observability/kibana.jsonc',
  'x-pack/platform/test/cases_api_integration/common/plugins/security_solution/kibana.jsonc',
  'x-pack/platform/test/cloud_integration/plugins/saml_provider/kibana.jsonc',
  'x-pack/platform/test/functional_cors/plugins/kibana_cors_test/kibana.jsonc',
  'x-pack/platform/test/functional_embedded/plugins/iframe_embedded/kibana.jsonc',
  'x-pack/platform/test/functional_execution_context/plugins/alerts/kibana.jsonc',
  'x-pack/platform/test/functional_with_es_ssl/plugins/alerts/kibana.jsonc',
  'x-pack/platform/test/functional_with_es_ssl/plugins/cases/kibana.jsonc',
  'x-pack/platform/test/licensing_plugin/plugins/test_feature_usage/kibana.jsonc',
  'x-pack/platform/test/plugin_api_perf/plugins/task_manager_performance/kibana.jsonc',
  'x-pack/platform/test/plugin_functional/plugins/global_search_test/kibana.jsonc',
  'x-pack/platform/test/reporting_api_integration/plugins/reporting_fixture/kibana.jsonc',
  'x-pack/platform/test/security_api_integration/plugins/audit_log/kibana.jsonc',
  'x-pack/platform/test/security_api_integration/plugins/features_provider/kibana.jsonc',
  'x-pack/platform/test/security_api_integration/plugins/oidc_provider/kibana.jsonc',
  'x-pack/platform/test/security_api_integration/plugins/saml_provider/kibana.jsonc',
  'x-pack/platform/test/security_api_integration/plugins/user_profiles_consumer/kibana.jsonc',
  'x-pack/platform/test/security_functional/plugins/test_endpoints/kibana.jsonc',
  'x-pack/platform/test/spaces_api_integration/common/plugins/spaces_test_plugin/kibana.jsonc',
  'x-pack/platform/test/task_manager_claimer_update_by_query/plugins/sample_task_plugin_mget/kibana.jsonc',
  'x-pack/platform/test/ui_capabilities/common/plugins/foo_plugin/kibana.jsonc',
  'x-pack/platform/test/usage_collection/plugins/application_usage_test/kibana.jsonc',
  'x-pack/platform/test/usage_collection/plugins/stack_management_usage_test/kibana.jsonc',
  'x-pack/solutions/observability/packages/kbn-scout-oblt/kibana.jsonc',
  'x-pack/solutions/security/packages/kbn-scout-security/kibana.jsonc',
  'x-pack/solutions/security/test/plugin_functional/plugins/resolver_test/kibana.jsonc',
];

// The new properties to add
const newProperties = {
  group: 'platform',
  visibility: 'private',
};

async function updateJsonFiles(files, propertiesToAdd) {
  for (const filePath of files) {
    try {
      // 1. Read the file
      const fileData = await fs.readFile(path.resolve(filePath), 'utf8');

      // 2. Parse the JSON string into a JavaScript object
      const jsonObject = JSON.parse(fileData);

      // 3. Add the new properties to the object
      const updatedObject = {
        ...pick(jsonObject, 'type', 'id', 'owner', 'description'), // Spread operator copies existing properties
        ...propertiesToAdd, // Spread operator adds the new ones
        ...jsonObject,
      };

      // 4. Stringify the updated object back to a JSON string with indentation
      const updatedJsonString = JSON.stringify(updatedObject, null, 2);

      // 5. Write the updated JSON string back to the file
      await fs.writeFile(path.resolve(filePath), updatedJsonString, 'utf8');

      console.log(`✅ Successfully updated ${filePath}`);
    } catch (error) {
      console.error(`❌ Error processing ${filePath}: ${error.message}`);
    }
  }
}

// Run the script
updateJsonFiles(jsonFiles, newProperties);
