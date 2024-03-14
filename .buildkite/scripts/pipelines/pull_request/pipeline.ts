/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import prConfigs from '../../../pull_requests.json';
import { areChangesSkippable, doAnyChangesMatch } from '#pipeline-utils';

const prConfig = prConfigs.jobs.find((job) => job.pipelineSlug === 'kibana-pull-request');

if (!prConfig) {
  console.error(`'kibana-pull-request' pipeline not found in .buildkite/pull_requests.json`);
  process.exit(1);
}

const GITHUB_PR_LABELS = process.env.GITHUB_PR_LABELS ?? '';
const REQUIRED_PATHS = prConfig.always_require_ci_on_changed.map((r) => new RegExp(r, 'i'));
const SKIPPABLE_PR_MATCHERS = prConfig.skip_ci_on_only_changed.map((r) => new RegExp(r, 'i'));

const getPipeline = (filename: string, removeSteps = true) => {
  const str = fs.readFileSync(filename).toString();
  return removeSteps ? str.replace(/^steps:/, '') : str;
};

const uploadPipeline = (pipelineContent: string | object) => {
  const str =
    typeof pipelineContent === 'string' ? pipelineContent : JSON.stringify(pipelineContent);

  execSync('buildkite-agent pipeline upload', {
    input: str,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
};

(async () => {
  try {
    const skippable = await areChangesSkippable(SKIPPABLE_PR_MATCHERS, REQUIRED_PATHS);

    if (skippable) {
      console.log('All changes in PR are skippable. Skipping CI.');

      // Since we skip everything, including post-build, we need to at least make sure the commit status gets set
      execSync('BUILD_SUCCESSFUL=true .buildkite/scripts/lifecycle/commit_status_complete.sh', {
        stdio: 'inherit',
      });
      process.exit(0);
    }

    const pipeline = [];

    pipeline.push(getPipeline('.buildkite/pipelines/pull_request/base.yml', false));

    if (await doAnyChangesMatch([/^packages\/kbn-handlebars/])) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/kbn_handlebars.yml'));
    }

    if (
      (await doAnyChangesMatch([
        /^src\/plugins\/data/,
        /^x-pack\/plugins\/actions/,
        /^x-pack\/plugins\/alerting/,
        /^x-pack\/plugins\/event_log/,
        /^x-pack\/plugins\/rule_registry/,
        /^x-pack\/plugins\/task_manager/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/response_ops.yml'));
    }

    if (
      (await doAnyChangesMatch([/^x-pack\/plugins\/cases/])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/response_ops_cases.yml'));
    }

    if (
      (await doAnyChangesMatch([
        /^x-pack\/plugins\/observability_solution\/apm/,
        /^packages\/kbn-apm-synthtrace/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/apm_cypress.yml'));
    }

    if (
      (await doAnyChangesMatch([
        /^x-pack\/plugins\/observability_onboarding/,
        /^x-pack\/plugins\/fleet/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites')
    ) {
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/observability_onboarding_cypress.yml')
      );
    }

    if (
      (await doAnyChangesMatch([/^x-pack\/plugins\/observability_solution\/profiling/])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/profiling_cypress.yml'));
    }

    if (
      (await doAnyChangesMatch([/^x-pack\/plugins\/fleet/, /^x-pack\/test\/fleet_cypress/])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/fleet_cypress.yml'));
    }

    if (await doAnyChangesMatch([/^x-pack\/plugins\/observability_solution\/exploratory_view/])) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/exploratory_view_plugin.yml'));
    }

    if (
      await doAnyChangesMatch([
        /^x-pack\/plugins\/observability_solution\/synthetics/,
        /^x-pack\/plugins\/observability_solution\/exploratory_view/,
      ])
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/synthetics_plugin.yml'));
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/uptime_plugin.yml'));
    }

    if (
      await doAnyChangesMatch([
        /^x-pack\/plugins\/observability_solution\/ux/,
        /^x-pack\/plugins\/observability_solution\/exploratory_view/,
      ])
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/ux_plugin_e2e.yml'));
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

    if (
      GITHUB_PR_LABELS.includes('ci:project-deploy-elasticsearch') ||
      GITHUB_PR_LABELS.includes('ci:project-deploy-observability') ||
      GITHUB_PR_LABELS.includes('ci:project-deploy-security')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/deploy_project.yml'));
    }

    if (GITHUB_PR_LABELS.includes('ci:build-serverless-image')) {
      pipeline.push(getPipeline('.buildkite/pipelines/artifacts_container_image.yml'));
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
      (await doAnyChangesMatch([
        /\.docnav\.json$/,
        /\.apidocs\.json$/,
        /\.devdocs\.json$/,
        /\.mdx$/,
        /^dev_docs\/.*(png|gif|jpg|jpeg|webp)$/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:build-next-docs')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/check_next_docs.yml'));
    }

    if (
      GITHUB_PR_LABELS.includes('ci:cypress-burn') ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites')
    ) {
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/cypress_burn.yml')
      );
    }

    if (
      (await doAnyChangesMatch([
        /^packages\/kbn-securitysolution-.*/,
        /^x-pack\/plugins\/security_solution/,
        /^x-pack\/test\/defend_workflows_cypress/,
        /^x-pack\/test\/security_solution_cypress/,
        /^fleet_packages\.json/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites')
    ) {
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/defend_workflows.yml')
      );
    }

    if (
      (await doAnyChangesMatch([
        /^package.json/,
        /^packages\/kbn-securitysolution-.*/,
        /^x-pack\/plugins\/alerting/,
        /^x-pack\/plugins\/data_views\/common/,
        /^x-pack\/plugins\/lists/,
        /^x-pack\/plugins\/rule_registry\/common/,
        /^x-pack\/plugins\/security_solution/,
        /^x-pack\/plugins\/security_solution_ess/,
        /^x-pack\/plugins\/security_solution_serverless/,
        /^x-pack\/plugins\/task_manager/,
        /^x-pack\/plugins\/timelines/,
        /^x-pack\/plugins\/triggers_actions_ui\/public\/application\/sections\/action_connector_form/,
        /^x-pack\/plugins\/triggers_actions_ui\/public\/application\/context\/actions_connectors_context\.tsx/,
        /^x-pack\/plugins\/triggers_actions_ui\/server\/connector_types\/openai/,
        /^x-pack\/plugins\/triggers_actions_ui\/server\/connector_types\/bedrock/,
        /^x-pack\/plugins\/usage_collection\/public/,
        /^x-pack\/plugins\/elastic_assistant/,
        /^x-pack\/packages\/security-solution/,
        /^x-pack\/packages\/kbn-elastic-assistant/,
        /^x-pack\/packages\/kbn-elastic-assistant-common/,
        /^x-pack\/test\/functional\/es_archives\/security_solution/,
        /^x-pack\/test\/security_solution_cypress/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites')
    ) {
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/ai_assistant.yml')
      );
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/detection_engine.yml')
      );
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/entity_analytics.yml')
      );
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/security_solution/explore.yml'));
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/rule_management.yml')
      );
    }

    if (
      (await doAnyChangesMatch([
        /^package.json/,
        /^packages\/kbn-securitysolution-.*/,
        /^x-pack\/plugins\/alerting/,
        /^x-pack\/plugins\/data_views\/common/,
        /^x-pack\/plugins\/lists/,
        /^x-pack\/plugins\/rule_registry\/common/,
        /^x-pack\/plugins\/security_solution/,
        /^x-pack\/plugins\/security_solution_ess/,
        /^x-pack\/plugins\/security_solution_serverless/,
        /^x-pack\/plugins\/task_manager/,
        /^x-pack\/plugins\/timelines/,
        /^x-pack\/plugins\/triggers_actions_ui\/public\/application\/sections\/alerts_table/,
        /^x-pack\/plugins\/usage_collection\/public/,
        /^x-pack\/plugins\/elastic_assistant/,
        /^x-pack\/packages\/security-solution/,
        /^x-pack\/packages\/kbn-elastic-assistant/,
        /^x-pack\/packages\/kbn-elastic-assistant-common/,
        /^x-pack\/test\/functional\/es_archives\/security_solution/,
        /^x-pack\/test\/security_solution_cypress/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites')
    ) {
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/investigations.yml')
      );
    }

    if (
      (await doAnyChangesMatch([
        /^package.json/,
        /^src\/plugins\/data/,
        /^src\/plugins\/kibana_utils/,
        /^src\/plugins\/inspector/,
        /^src\/plugins\/data_views/,
        /^src\/core/,
        /^packages\/kbn-securitysolution-.*/,
        /^packages\/kbn-es-query/,
        /^packages\/kbn-securitysolution-io-ts-list-types/,
        /^packages\/kbn-i18n-react/,
        /^packages\/kbn-i18n/,
        /^packages\/shared-ux/,
        /^packages\/kbn-doc-links/,
        /^packages\/kbn-securitysolution-io-ts-list-types/,
        /^x-pack\/plugins\/threat_intelligence/,
        /^x-pack\/packages\/security-solution/,
        /^x-pack\/test\/threat_intelligence_cypress/,
        /^x-pack\/plugins\/cases/,
        /^x-pack\/plugins\/timelines/,
        /^x-pack\/plugins\/triggers_actions_ui/,
        /^x-pack\/plugins\/rule_registry/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites')
    ) {
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/threat_intelligence.yml')
      );
    }

    if (
      ((await doAnyChangesMatch([/^x-pack\/plugins\/osquery/, /^x-pack\/test\/osquery_cypress/])) ||
        GITHUB_PR_LABELS.includes('ci:all-cypress-suites')) &&
      !GITHUB_PR_LABELS.includes('ci:skip-cypress-osquery')
    ) {
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/security_solution/osquery_cypress.yml')
      );
    }

    pipeline.push(getPipeline('.buildkite/pipelines/pull_request/post_build.yml'));

    // remove duplicated steps
    uploadPipeline([...new Set(pipeline)].join('\n'));
  } catch (ex) {
    console.error('PR pipeline generation error', ex.message);
    process.exit(1);
  }
})();
