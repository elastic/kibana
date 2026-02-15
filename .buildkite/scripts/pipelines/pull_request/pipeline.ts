/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint "no-restricted-syntax": [
            "error",
            {
                "selector": "CallExpression[callee.object.name='console'][callee.property.name!=/^(warn|error)$/]",
                "message": "Debug logging to stdout in this file will attempt to upload the log message as yaml to buildkite, which might result in pipeline syntax error. Use emitPipeline() to upload steps, or log to stderr."
            }
        ] */

import prConfigs from '../../../pull_requests.json';
import { runPreBuild } from './pre_build';
import {
  areChangesSkippable,
  doAnyChangesMatch,
  getAgentImageConfig,
  emitPipeline,
  getPipeline,
  prHasFIPSLabel,
} from '#pipeline-utils';

const prConfig = prConfigs.jobs.find((job) => job.pipelineSlug === 'kibana-pull-request');
const emptyStep = `steps: []`;

if (!prConfig) {
  console.error(`'kibana-pull-request' pipeline not found in .buildkite/pull_requests.json`);
  process.exit(1);
}

const GITHUB_PR_LABELS = process.env.GITHUB_PR_LABELS ?? '';
const ALL_UI_TEST_SUITES = GITHUB_PR_LABELS.includes('ci:all-ui-test-suites');
const REQUIRED_PATHS = prConfig.always_require_ci_on_changed!.map((r) => new RegExp(r, 'i'));
const SKIPPABLE_PR_MATCHERS = prConfig.skip_ci_on_only_changed!.map((r) => new RegExp(r, 'i'));

(async () => {
  const pipeline: string[] = [];

  try {
    const skippable = await areChangesSkippable(SKIPPABLE_PR_MATCHERS, REQUIRED_PATHS);

    if (skippable) {
      emitPipeline([emptyStep]);
      return;
    }

    pipeline.push(getAgentImageConfig({ returnYaml: true }));

    const onlyRunQuickChecks = await areChangesSkippable([/^renovate\.json$/], REQUIRED_PATHS);
    if (onlyRunQuickChecks) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/renovate.yml', false));
      console.warn('Isolated changes to renovate.json. Skipping main PR pipeline.');
      emitPipeline(pipeline);
      return;
    }

    await runPreBuild();
    pipeline.push(getPipeline('.buildkite/pipelines/pull_request/base.yml', false));

    if (prHasFIPSLabel()) {
      pipeline.push(getPipeline('.buildkite/pipelines/fips/verify_fips_enabled.yml'));
    }

    if (await doAnyChangesMatch([/^src\/platform\/packages\/private\/kbn-handlebars/])) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/kbn_handlebars.yml'));
    }

    if (
      (await doAnyChangesMatch([
        /^src\/platform\/plugins\/shared\/data/,
        /^x-pack\/platform\/plugins\/shared\/actions/,
        /^x-pack\/platform\/plugins\/shared\/alerting/,
        /^x-pack\/platform\/plugins\/shared\/event_log/,
        /^x-pack\/platform\/plugins\/shared\/rule_registry/,
        /^x-pack\/platform\/plugins\/shared\/task_manager/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/response_ops.yml'));
    }

    if (
      (await doAnyChangesMatch([/^x-pack\/platform\/plugins\/shared\/cases/])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/response_ops_cases.yml'));
    }

    if (
      (await doAnyChangesMatch([
        /^x-pack\/solutions\/observability\/plugins\/apm/,
        /^src\/platform\/packages\/shared\/kbn-synthtrace/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/apm_cypress.yml'));
    }

    if (
      (await doAnyChangesMatch([
        /^x-pack\/platform\/plugins\/shared\/fleet/,
        /^x-pack\/test\/fleet_cypress/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/fleet_cypress.yml'));
    }

    if (
      (await doAnyChangesMatch([
        /^x-pack\/solutions\/observability\/plugins/,
        /^package.json/,
        /^yarn.lock/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:synthetics-runner-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/synthetics_plugin.yml'));
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/uptime_plugin.yml'));
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/exploratory_view_plugin.yml'));
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/ux_plugin_e2e.yml'));
    }

    const aiInfraPaths = [
      /^x-pack\/platform\/packages\/shared\/ai-infra/,
      /^x-pack\/platform\/plugins\/shared\/ai_infra/,
      /^x-pack\/platform\/plugins\/shared\/inference/,
    ];
    const aiConnectorPaths = [
      /^x-pack\/platform\/plugins\/shared\/stack_connectors\/server\/connector_types\/bedrock/,
      /^x-pack\/platform\/plugins\/shared\/stack_connectors\/server\/connector_types\/gemini/,
      /^x-pack\/platform\/plugins\/shared\/stack_connectors\/server\/connector_types\/openai/,
      /^x-pack\/platform\/plugins\/shared\/stack_connectors\/server\/connector_types\/inference/,
    ];
    const agentBuilderPaths = [
      /^x-pack\/platform\/plugins\/shared\/agent_builder/,
      /^x-pack\/platform\/packages\/shared\/agent_builder/,
    ];

    if (
      (await doAnyChangesMatch([...aiInfraPaths, ...aiConnectorPaths])) ||
      GITHUB_PR_LABELS.includes('ci:all-gen-ai-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/ai_infra_gen_ai.yml'));
    }

    if (
      (await doAnyChangesMatch([...aiInfraPaths, ...aiConnectorPaths, ...agentBuilderPaths])) ||
      GITHUB_PR_LABELS.includes('agent-builder:run-smoke-tests') ||
      GITHUB_PR_LABELS.includes('ci:all-gen-ai-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/agent_builder_smoke_tests.yml'));
    }

    if (
      GITHUB_PR_LABELS.includes('ci:build-cloud-image') &&
      !GITHUB_PR_LABELS.includes('ci:deploy-cloud') &&
      !GITHUB_PR_LABELS.includes('ci:cloud-deploy') &&
      !GITHUB_PR_LABELS.includes('ci:cloud-redeploy')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/build_cloud_image.yml'));
    }

    if (
      GITHUB_PR_LABELS.includes('ci:build-cloud-fips-image') &&
      !GITHUB_PR_LABELS.includes('ci:deploy-cloud') &&
      !GITHUB_PR_LABELS.includes('ci:cloud-deploy') &&
      !GITHUB_PR_LABELS.includes('ci:cloud-redeploy')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/build_cloud_fips_image.yml'));
    }

    if (
      GITHUB_PR_LABELS.includes('ci:deploy-cloud') ||
      GITHUB_PR_LABELS.includes('ci:cloud-deploy') ||
      GITHUB_PR_LABELS.includes('ci:cloud-redeploy')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/deploy_cloud.yml'));
    }

    if (GITHUB_PR_LABELS.includes('ci:build-docker-fips')) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/fips.yml'));
    }

    if (GITHUB_PR_LABELS.includes('ci:entity-store-performance')) {
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/trigger_entity_store_performance.yml')
      );
    }

    if (
      GITHUB_PR_LABELS.includes('ci:project-deploy-elasticsearch') ||
      GITHUB_PR_LABELS.includes('ci:project-deploy-observability') ||
      GITHUB_PR_LABELS.includes('ci:project-deploy-log_essentials') ||
      GITHUB_PR_LABELS.includes('ci:project-deploy-security') ||
      GITHUB_PR_LABELS.includes('ci:project-deploy-ai4soc')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/deploy_project.yml'));
    } else if (GITHUB_PR_LABELS.includes('ci:build-serverless-image')) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/build_project.yml'));
    }

    if (
      (await doAnyChangesMatch([/.*stor(ies|y).*/])) ||
      GITHUB_PR_LABELS.includes('ci:build-storybooks')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/storybooks.yml'));
    }

    if (GITHUB_PR_LABELS.includes('ci:build-webpack-bundle-analyzer')) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/webpack_bundle_analyzer.yml'));
    }

    if (
      ((await doAnyChangesMatch([
        /\.docnav\.json$/,
        /\.apidocs\.json$/,
        /\.devdocs\.json$/,
        /\.mdx$/,
        /^dev_docs\/.*(png|gif|jpg|jpeg|webp)$/,
      ])) &&
        process.env.GITHUB_PR_TARGET_BRANCH === 'main') ||
      GITHUB_PR_LABELS.includes('ci:build-next-docs')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/check_next_docs.yml'));
    }

    if (
      GITHUB_PR_LABELS.includes('ci:cypress-burn') ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/cypress_burn.yml')
      );
    }

    if (
      (await doAnyChangesMatch([
        /^src\/platform\/packages\/shared\/kbn-securitysolution-.*/,
        /^x-pack\/solutions\/security\/packages\/kbn-securitysolution-.*/,
        /^x-pack\/solutions\/security\/plugins\/security_solution/,
        /^x-pack\/solutions\/security\/test\/defend_workflows_cypress/,
        /^x-pack\/solutions\/security\/test\/security_solution_cypress/,
        /^fleet_packages\.json/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/defend_workflows.yml')
      );
    }

    if (
      (await doAnyChangesMatch([
        /^package.json/,
        /^src\/platform\/packages\/shared\/kbn-securitysolution-.*/,
        /^x-pack\/solutions\/security\/packages\/kbn-securitysolution-.*/,
        /^x-pack\/platform\/plugins\/shared\/alerting/,
        /^x-pack\/platform\/plugins\/shared\/data_views\/common/,
        /^x-pack\/solutions\/security\/plugins\/lists/,
        /^x-pack\/platform\/plugins\/shared\/rule_registry\/common/,
        /^x-pack\/solutions\/security\/plugins\/security_solution/,
        /^x-pack\/solutions\/security\/plugins\/security_solution_ess/,
        /^x-pack\/solutions\/security\/plugins\/security_solution_serverless/,
        /^x-pack\/platform\/plugins\/shared\/task_manager/,
        /^x-pack\/solutions\/security\/plugins\/timelines/,
        /^x-pack\/platform\/plugins\/shared\/triggers_actions_ui\/public\/application\/sections\/action_connector_form/,
        /^x-pack\/platform\/plugins\/shared\/triggers_actions_ui\/public\/application\/context\/actions_connectors_context\.tsx/,
        /^x-pack\/platform\/plugins\/shared\/triggers_actions_ui\/server\/connector_types\/openai/,
        /^x-pack\/platform\/plugins\/shared\/triggers_actions_ui\/server\/connector_types\/bedrock/,
        /^x-pack\/platform\/plugins\/shared\/usage_collection\/public/,
        /^x-pack\/solutions\/security\/plugins\/elastic_assistant/,
        /^x-pack\/solutions\/security\/packages/,
        /^x-pack\/platform\/packages\/shared\/kbn-elastic-assistant/,
        /^x-pack\/platform\/packages\/shared\/kbn-elastic-assistant-common/,
        /^x-pack\/test\/functional\/es_archives\/security_solution/,
        /^x-pack\/solutions\/security\/test\/security_solution_cypress/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/ai_assistant.yml')
      );
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/security_solution/ai4dsoc.yml'));
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/automatic_import.yml')
      );
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/detection_engine.yml')
      );
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/entity_analytics.yml')
      );
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/rule_management.yml')
      );
    }

    if (
      (await doAnyChangesMatch([
        /^package.json/,
        /^src\/platform\/packages\/shared\/kbn-discover-utils/,
        /^src\/platform\/packages\/shared\/kbn-doc-links/,
        /^src\/platform\/packages\/shared\/kbn-dom-drag-drop/,
        /^src\/platform\/packages\/shared\/kbn-es-query/,
        /^src\/platform\/packages\/shared\/kbn-i18n/,
        /^src\/platform\/packages\/shared\/kbn-i18n-react/,
        /^src\/platform\/packages\/shared\/kbn-grouping/,
        /^src\/platform\/packages\/shared\/kbn-resizable-layout/,
        /^src\/platform\/packages\/shared\/kbn-rison/,
        /^src\/platform\/packages\/shared\/kbn-rule-data-utils/,
        /^src\/platform\/packages\/shared\/kbn-safer-lodash-set/,
        /^src\/platform\/packages\/shared\/kbn-search-types/,
        /^src\/platform\/packages\/shared\/kbn-securitysolution-.*/,
        /^x-pack\/solutions\/security\/packages\/kbn-securitysolution-.*/,
        /^src\/platform\/packages\/shared\/kbn-securitysolution-ecs/,
        /^x-pack\/solutions\/security\/packages\/kbn-securitysolution-io-ts-alerting-types/,
        /^x-pack\/solutions\/security\/packages\/kbn-securitysolution-io-ts-list-types/,
        /^x-pack\/solutions\/security\/packages\/kbn-securitysolution-list-hooks/,
        /^x-pack\/solutions\/security\/packages\/kbn-securitysolution-t-grid/,
        /^src\/platform\/packages\/shared\/kbn-ui-theme/,
        /^src\/platform\/packages\/shared\/kbn-utility-types/,
        /^src\/platform\/packages\/shared\/react/,
        /^src\/platform\/packages\/shared\/shared-ux/,
        /^src\/core/,
        /^src\/platform\/plugins\/shared\/charts/,
        /^src\/platform\/plugins\/shared\/controls/,
        /^src\/platform\/plugins\/shared\/dashboard/,
        /^src\/platform\/plugins\/shared\/data/,
        /^src\/platform\/plugins\/shared\/data_views/,
        /^src\/platform\/plugins\/shared\/discover/,
        /^src\/platform\/plugins\/shared\/field_formats/,
        /^src\/platform\/plugins\/shared\/inspector/,
        /^src\/platform\/plugins\/shared\/kibana_react/,
        /^src\/platform\/plugins\/shared\/kibana_utils/,
        /^src\/platform\/plugins\/shared\/saved_search/,
        /^src\/platform\/plugins\/shared\/ui_actions/,
        /^src\/platform\/plugins\/shared\/unified_histogram/,
        /^src\/platform\/plugins\/shared\/unified_search/,
        /^x-pack\/platform\/packages\/shared\/kbn-elastic-assistant/,
        /^x-pack\/platform\/packages\/shared\/kbn-elastic-assistant-common/,
        /^x-pack\/solutions\/security\/packages/,
        /^x-pack\/platform\/plugins\/shared\/alerting/,
        /^x-pack\/platform\/plugins\/shared\/cases/,
        /^x-pack\/platform\/plugins\/shared\/data_views\/common/,
        /^x-pack\/solutions\/security\/plugins\/elastic_assistant/,
        /^x-pack\/solutions\/security\/plugins\/lists/,
        /^x-pack\/platform\/plugins\/shared\/rule_registry\/common/,
        /^x-pack\/solutions\/security\/plugins\/security_solution/,
        /^x-pack\/solutions\/security\/plugins\/security_solution_ess/,
        /^x-pack\/solutions\/security\/plugins\/security_solution_serverless/,
        /^x-pack\/platform\/plugins\/shared\/task_manager/,
        /^x-pack\/solutions\/security\/plugins\/threat_intelligence/,
        /^x-pack\/solutions\/security\/plugins\/timelines/,
        /^x-pack\/platform\/plugins\/shared\/triggers_actions_ui/,
        /^x-pack\/platform\/plugins\/shared\/usage_collection\/public/,
        /^x-pack\/test\/functional\/es_archives\/security_solution/,
        /^x-pack\/solutions\/security\/test\/security_solution_cypress/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/security_solution/explore.yml'));
    }

    if (
      (await doAnyChangesMatch([
        /^package.json/,
        /^src\/platform\/packages\/shared\/kbn-discover-utils/,
        /^src\/platform\/packages\/shared\/kbn-doc-links/,
        /^src\/platform\/packages\/shared\/kbn-dom-drag-drop/,
        /^src\/platform\/packages\/shared\/kbn-es-query/,
        /^src\/platform\/packages\/shared\/kbn-i18n/,
        /^src\/platform\/packages\/shared\/kbn-i18n-react/,
        /^src\/platform\/packages\/shared\/kbn-grouping/,
        /^src\/platform\/packages\/shared\/kbn-resizable-layout/,
        /^src\/platform\/packages\/shared\/kbn-rison/,
        /^src\/platform\/packages\/shared\/kbn-rule-data-utils/,
        /^src\/platform\/packages\/shared\/kbn-safer-lodash-set/,
        /^src\/platform\/packages\/shared\/kbn-search-types/,
        /^src\/platform\/packages\/shared\/kbn-securitysolution-ecs/,
        /^x-pack\/solutions\/security\/packages\/kbn-securitysolution-io-ts-alerting-types/,
        /^x-pack\/solutions\/security\/packages\/kbn-securitysolution-io-ts-list-types/,
        /^x-pack\/solutions\/security\/packages\/kbn-securitysolution-list-hooks/,
        /^x-pack\/solutions\/security\/packages\/kbn-securitysolution-t-grid/,
        /^src\/platform\/packages\/shared\/kbn-ui-theme/,
        /^src\/platform\/packages\/shared\/kbn-utility-types/,
        /^src\/platform\/packages\/shared\/react/,
        /^src\/platform\/packages\/shared\/shared-ux/,
        /^src\/core/,
        /^src\/platform\/plugins\/shared\/charts/,
        /^src\/platform\/plugins\/shared\/controls/,
        /^src\/platform\/plugins\/shared\/data/,
        /^src\/platform\/plugins\/shared\/data_views/,
        /^src\/platform\/plugins\/shared\/discover/,
        /^src\/platform\/plugins\/shared\/field_formats/,
        /^src\/platform\/plugins\/shared\/inspector/,
        /^src\/platform\/plugins\/shared\/kibana_react/,
        /^src\/platform\/plugins\/shared\/kibana_utils/,
        /^src\/platform\/plugins\/shared\/saved_search/,
        /^src\/platform\/plugins\/shared\/ui_actions/,
        /^src\/platform\/plugins\/shared\/unified_histogram/,
        /^src\/platform\/plugins\/shared\/unified_search/,
        /^x-pack\/platform\/packages\/shared\/kbn-elastic-assistant/,
        /^x-pack\/platform\/packages\/shared\/kbn-elastic-assistant-common/,
        /^x-pack\/solutions\/security\/packages/,
        /^x-pack\/platform\/plugins\/shared\/alerting/,
        /^x-pack\/platform\/plugins\/shared\/cases/,
        /^x-pack\/platform\/plugins\/shared\/data_views\/common/,
        /^x-pack\/solutions\/security\/plugins\/elastic_assistant/,
        /^x-pack\/solutions\/security\/plugins\/lists/,
        /^x-pack\/platform\/plugins\/shared\/rule_registry\/common/,
        /^x-pack\/solutions\/security\/plugins\/security_solution/,
        /^x-pack\/solutions\/security\/plugins\/security_solution_ess/,
        /^x-pack\/solutions\/security\/plugins\/security_solution_serverless/,
        /^x-pack\/platform\/plugins\/shared\/task_manager/,
        /^x-pack\/solutions\/security\/plugins\/threat_intelligence/,
        /^x-pack\/solutions\/security\/plugins\/timelines/,
        /^x-pack\/platform\/plugins\/shared\/triggers_actions_ui/,
        /^x-pack\/platform\/plugins\/shared\/usage_collection\/public/,
        /^x-pack\/test\/functional\/es_archives\/security_solution/,
        /^x-pack\/solutions\/security\/test\/security_solution_cypress/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/investigations.yml')
      );
    }

    if (
      ((await doAnyChangesMatch([
        /^x-pack\/platform\/plugins\/shared\/osquery/,
        /^x-pack\/solutions\/security\/test\/osquery_cypress/,
        /^x-pack\/solutions\/security\/plugins\/security_solution/,
      ])) ||
        GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
        ALL_UI_TEST_SUITES) &&
      !GITHUB_PR_LABELS.includes('ci:skip-cypress-osquery')
    ) {
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/osquery_cypress.yml')
      );
    }

    if (
      (await doAnyChangesMatch([
        /^x-pack\/packages\/kbn-cloud-security-posture/,
        /^x-pack\/solutions\/security\/plugins\/cloud_security_posture/,
        /^x-pack\/solutions\/security\/plugins\/security_solution/,
        /^x-pack\/solutions\/security\/test\/security_solution_cypress/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(
        getPipeline(
          '.buildkite/pipelines/pull_request/security_solution/cloud_security_posture.yml'
        )
      );
    }

    if (
      (await doAnyChangesMatch([
        /^x-pack\/platform\/plugins\/shared\/fleet/,
        /^x-pack\/packages\/kbn-cloud-security-posture/,
        /^x-pack\/solutions\/security\/plugins\/cloud_security_posture/,
        /^x-pack\/solutions\/security\/plugins\/security_solution/,
        /^src\/platform\/packages\/shared\/kbn-scout\/src\/servers\/configs\/custom\/cspm_agentless/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:cloud-security-posture-scout') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/cspm_agentless_scout.yml')
      );
    }

    if (
      GITHUB_PR_LABELS.includes('ci:security-genai-run-evals') ||
      GITHUB_PR_LABELS.includes('ci:security-genai-run-evals-local-prompts') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/gen_ai_evals.yml')
      );
    }

    if (
      (await doAnyChangesMatch([
        /^x-pack\/solutions\/security\/plugins\/security_solution\/public\/asset_inventory/,
        /^x-pack\/solutions\/security\/test\/security_solution_cypress/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/asset_inventory.yml')
      );
    }

    // Check for prompt file changes and conditionally add pipeline step
    if (
      await doAnyChangesMatch([
        /^x-pack\/solutions\/security\/plugins\/elastic_assistant\/server\/lib\/prompt\/local_prompt_object\.ts$/,
        /^x-pack\/solutions\/security\/plugins\/elastic_assistant\/server\/lib\/prompt\/tool_prompts\.ts$/,
        /^x-pack\/solutions\/security\/plugins\/elastic_assistant\/server\/lib\/prompt\/defend_insight_prompts\.ts$/,
        /^x-pack\/solutions\/security\/plugins\/elastic_assistant\/server\/lib\/prompt\/prompts\.ts$/,
      ])
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/prompt_changes.yml'));
    }

    // Run Saved Objects checks conditionally
    if (
      await doAnyChangesMatch([
        /^packages\/kbn-check-saved-objects-cli\/current_fields.json/,
        /^packages\/kbn-check-saved-objects-cli\/current_mappings.json/,
        /^src\/core\/server\/integration_tests\/ci_checks\/saved_objects\/check_registered_types.test.ts/,
      ])
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/check_saved_objects.yml'));
    }

    if (
      (await doAnyChangesMatch([
        /^packages\/kbn-babel-preset/,
        /^packages\/kbn-repo-file-maps/,
        /^src\/platform\/packages\/private\/kbn-babel-transform/,
        /^src\/platform\/packages\/private\/kbn-import-resolver/,
        /^src\/platform\/packages\/private\/kbn-jest-serializers/,
        /^src\/platform\/packages\/private\/kbn-repo-packages/,
        /^src\/platform\/packages\/shared\/kbn-babel-register/,
        /^src\/platform\/packages\/shared\/kbn-jest-benchmarks/,
        /^src\/platform\/packages\/shared\/kbn-repo-info/,
        /^src\/platform\/packages\/shared\/kbn-test/,
        /^src\/setup_node_env/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:bench-jest')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/jest_bench.yml'));
    }

    if (
      (await doAnyChangesMatch([
        /^src\/platform\/packages\/shared\/kbn-es/,
        /^src\/platform\/packages\/shared\/kbn-ftr-benchmarks/,
        /^src\/platform\/packages\/shared\/kbn-ftr-common-functional-services/,
        /^src\/platform\/packages\/shared\/kbn-ftr-common-functional-ui-services/,
        /^src\/platform\/packages\/shared\/kbn-test/,
        /^src\/setup_node_env/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:bench-ftr')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/ftr_bench.yml'));
    }

    pipeline.push(getPipeline('.buildkite/pipelines/pull_request/post_build.yml'));

    emitPipeline(pipeline);
  } catch (ex) {
    console.error('Error while generating the pipeline steps: ' + ex.message, ex);
    process.exit(1);
  }
})();
