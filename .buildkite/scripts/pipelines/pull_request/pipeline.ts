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
        /^packages\/kbn-securitysolution-.*/,
        /^x-pack\/plugins\/lists/,
        /^x-pack\/plugins\/security_solution/,
        /^x-pack\/plugins\/timelines/,
        /^x-pack\/plugins\/triggers_actions_ui\/public\/application\/sections\/action_connector_form/,
        /^x-pack\/plugins\/triggers_actions_ui\/public\/application\/context\/actions_connectors_context\.tsx/,
        /^x-pack\/test\/defend_workflows_cypress/,
        /^x-pack\/test\/security_solution_cypress/,
        /^fleet_packages\.json/, // It contains reference to prebuilt detection rules, we want to run security solution tests if it changes
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/security_solution.yml'));
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/defend_workflows.yml'));
    }

    if (
      (await doAnyChangesMatch([
        /^x-pack\/plugins\/threat_intelligence/,
        /^x-pack\/test\/threat_intelligence_cypress/,
        /^x-pack\/plugins\/security_solution\/public\/threat_intelligence/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/threat_intelligence.yml'));
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
      (await doAnyChangesMatch([/^x-pack\/plugins\/apm/, /^packages\/kbn-apm-synthtrace/])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/apm_cypress.yml'));
    }

    if (
      (await doAnyChangesMatch([/^x-pack\/plugins\/fleet/, /^x-pack\/test\/fleet_cypress/])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/fleet_cypress.yml'));
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/defend_workflows.yml'));
    }

    if (
      (await doAnyChangesMatch([/^x-pack\/plugins\/osquery/, /^x-pack\/test\/osquery_cypress/])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/osquery_cypress.yml'));
    }

    if (await doAnyChangesMatch([/^x-pack\/plugins\/observability/])) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/observability_plugin.yml'));
    }

    if (
      await doAnyChangesMatch([
        /^x-pack\/plugins\/synthetics/,
        /^x-pack\/plugins\/observability\/public\/components\/shared\/exploratory_view/,
      ])
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/synthetics_plugin.yml'));
    }

    if (
      await doAnyChangesMatch([
        /^x-pack\/plugins\/ux/,
        /^x-pack\/plugins\/observability\/public\/components\/shared\/exploratory_view/,
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

    if (
      (await doAnyChangesMatch([/.*stor(ies|y).*/])) ||
      GITHUB_PR_LABELS.includes('ci:build-storybooks')
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/storybooks.yml'));
    }

    if (GITHUB_PR_LABELS.includes('ci:build-webpack-bundle-analyzer')) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/webpack_bundle_analyzer.yml'));
    }

    pipeline.push(getPipeline('.buildkite/pipelines/pull_request/post_build.yml'));

    uploadPipeline(pipeline.join('\n'));
  } catch (ex) {
    console.error('PR pipeline generation error', ex.message);
    process.exit(1);
  }
})();
