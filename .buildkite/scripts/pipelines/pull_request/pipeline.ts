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

import { runPreBuild } from './pre_build.ts';
import { getEvalTriggerStep } from '../../../pipelines/evals/eval_pipeline.ts';
import { loadBuildkiteJson } from '../../../pipeline-utils/load_buildkite_json.ts';
import {
  areChangesSkippable,
  doAnyChangesMatch,
  getAffectedPackages,
  getAgentImageConfig,
  emitPipeline,
  getPipeline,
  getPrChangesCached,
  isScoutTestPath,
  isScoutTestsOnlyDiff,
  registerCancelKeys,
  flushCancelOnGateFailureMetadata,
  type GetPipelineOptions,
  prHasFIPSLabel,
  doAllChangesMatch,
  isAutomatedVersionBumpPR,
} from '#pipeline-utils';
import {
  agentBuilderSmokeTestsSteps,
  aiInfraGenAiSteps,
  buildFipsImage,
  buildCloudFipsImageSteps,
  buildCloudImageSteps,
  buildProjectSteps,
  checkNextDocs,
  checkOasSnapshot,
  checkSavedObjects,
  cpsTests,
  deployCloudSteps,
  deployProjectSteps,
  entityStorePerformanceSteps,
  fleetCypressSteps,
  ftrBenchSteps,
  jestBenchSteps,
  localCheck,
  pageLoadBenchSteps,
  postBuildSteps,
  prBaseEnv,
  prBaseSteps,
  renderSteps,
  renovateValidation,
  responseOpsCasesSteps,
  responseOpsSteps,
  scoutFleetRealAgentSteps,
  storybooks,
  verifyFipsEnabled,
  warmStartMemoryBenchSteps,
  workflowsOomTestingSteps,
  ai4dsocSteps,
  aiAssistantSteps,
  assetInventorySteps,
  cloudSecurityPostureSteps,
  cspmAgentlessScoutSteps,
  cypressBurnSteps,
  defendWorkflowsSteps,
  detectionEngineSteps,
  entityAnalyticsSteps,
  exploreSteps,
  securitySolutionGenAiEvalsSteps,
  investigationsSteps,
  osqueryCypressSteps,
  ruleManagementSteps,
  scoutEdrRealFleetSteps,
} from '#pipeline-utils/step-library';

const prConfigs =
  loadBuildkiteJson<typeof import('../../../pull_requests.json')>('pull_requests.json');

const prConfig = prConfigs.jobs.find((job) => job.pipelineSlug === 'kibana-pull-request');
const emptyStep = `steps: []`;
const cancelable: GetPipelineOptions = { cancelOnGateFailure: true };
const cancelOnGate = { cancelOnGateFailure: true } as const;

if (!prConfig) {
  console.error(`'kibana-pull-request' pipeline not found in .buildkite/pull_requests.json`);
  process.exit(1);
}

const GITHUB_PR_LABELS = process.env.GITHUB_PR_LABELS ?? '';
const ALL_UI_TEST_SUITES = GITHUB_PR_LABELS.includes('ci:all-ui-test-suites');
const REQUIRED_PATHS = prConfig.always_require_ci_on_changed!.map((r) => new RegExp(r, 'i'));
const SKIPPABLE_PR_MATCHERS = prConfig.skip_ci_on_only_changed!.map((r) => new RegExp(r, 'i'));

// this covers external dependency changes, which the package graph below cannot see.
const STORYBOOK_BUILD_CRITICAL_PATHS = [
  /^pnpm-lock\.yaml$/,
  /^pnpm-workspace\.yaml$/,
  /^\.buildkite\/scripts\/steps\/storybooks\//,
];

/**
 * Runs Storybooks when `@kbn/storybook` (or its config package) is in the
 * downstream closure of the changed packages, so toolchain changes outside
 * story paths are still covered.
 */
const isStorybookBuildAffected = async (): Promise<boolean> => {
  if (await doAnyChangesMatch(STORYBOOK_BUILD_CRITICAL_PATHS)) {
    return true;
  }

  try {
    // On sparse&shallow checkout, git strategy doesn't work as expected,
    // we need to manually feed in changed files,
    // and make sure **/kibana.jsonc and **/tsconfig.json are included in the checkout
    const prChanges = await getPrChangesCached();
    const affectedPackages = await getAffectedPackages(undefined, {
      strategy: 'git',
      includeDownstream: true,
      ignoreUncategorizedChanges: true,
      changedFiles: prChanges.flatMap((change) =>
        change.previous_filename ? [change.filename, change.previous_filename] : [change.filename]
      ),
    });
    return (
      affectedPackages.has('@kbn/storybook') || affectedPackages.has('@kbn/ui-storybook-config')
    );
  } catch (error) {
    console.error(
      'Failed to resolve affected packages for the Storybook gate, running Storybooks to be safe',
      error
    );
    return true;
  }
};

(async () => {
  const pipeline: string[] = [];

  try {
    if (await isAutomatedVersionBumpPR()) {
      emitPipeline([emptyStep]);
      return;
    }

    const skippable = await areChangesSkippable(SKIPPABLE_PR_MATCHERS, REQUIRED_PATHS);

    if (skippable) {
      emitPipeline([emptyStep]);
      return;
    }

    // Scout-test-only diffs can't change OAS, API contracts, or Saved Objects, so skip those checks below.
    const prChanges = await getPrChangesCached();
    const scoutTestsOnly = isScoutTestsOnlyDiff(
      prChanges.flatMap((change) =>
        change.previous_filename ? [change.filename, change.previous_filename] : [change.filename]
      )
    );
    if (scoutTestsOnly) {
      console.warn(
        'Scout-tests-only diff detected — skipping OAS Snapshot, API Contracts, and Saved Objects checks'
      );
    }

    // The suite matchers below use plugin prefixes, which also match that plugin's Scout tests.
    // Drop those, so a Scout-only change can't trigger Cypress.
    const isSuiteIrrelevantChange = (change: (typeof prChanges)[number]): boolean =>
      isScoutTestPath(change.filename) &&
      (!change.previous_filename || isScoutTestPath(change.previous_filename));

    const suiteRelevantChanges = prChanges.filter((change) => !isSuiteIrrelevantChange(change));

    const doAnySuiteRelevantChangesMatch = (paths: RegExp[]): Promise<boolean> =>
      doAnyChangesMatch(paths, suiteRelevantChanges);

    pipeline.push(getAgentImageConfig({ returnYaml: true }));

    if (await doAllChangesMatch(/^renovate\.json$/)) {
      pipeline.push(renderSteps(renovateValidation(), { header: true }));
      console.warn('Isolated changes to renovate.json. Skipping main PR pipeline.');
      emitPipeline(pipeline);
      return;
    }

    await runPreBuild();
    pipeline.push(renderSteps(prBaseSteps(), { header: true, env: prBaseEnv }));
    pipeline.push(renderSteps(localCheck()));

    // Gated together: check_api_contracts depends_on check_oas_snapshot.
    if (!scoutTestsOnly) {
      pipeline.push(renderSteps(checkOasSnapshot(), cancelOnGate));
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/api_contracts.yml', cancelable));
    }

    // Register steps from the base steps that should still be canceled on gate failure.
    // The base steps are not rendered with cancelOnGateFailure because they contain the gate steps.
    registerCancelKeys([
      'pick_test_group_run_order',
      'build_scout_tests',
      'report_package_metrics',
    ]);

    if (prHasFIPSLabel()) {
      pipeline.push(renderSteps(verifyFipsEnabled(), cancelOnGate));
    }

    if (await doAnySuiteRelevantChangesMatch([/^renovate\.json$/])) {
      pipeline.push(renderSteps(renovateValidation(), cancelOnGate));
    }

    if (
      await doAnySuiteRelevantChangesMatch([
        /^src\/platform\/packages\/private\/kbn-handlebars/,
        /^\.buildkite\/pipelines\/pull_request\/kbn_handlebars\.yml/,
      ])
    ) {
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/kbn_handlebars.yml', cancelable)
      );
    }

    if (
      (await doAnySuiteRelevantChangesMatch([
        /^src\/platform\/plugins\/shared\/data/,
        /^x-pack\/platform\/plugins\/shared\/actions/,
        /^x-pack\/platform\/plugins\/shared\/alerting/,
        /^x-pack\/platform\/plugins\/shared\/event_log/,
        /^x-pack\/platform\/plugins\/shared\/rule_registry/,
        /^x-pack\/platform\/plugins\/shared\/task_manager/,
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/response_ops\.ts/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(renderSteps(responseOpsSteps(), cancelOnGate));
    }

    if (
      (await doAnySuiteRelevantChangesMatch([
        /^x-pack\/platform\/plugins\/shared\/cases/,
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/response_ops_cases\.ts/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(renderSteps(responseOpsCasesSteps(), cancelOnGate));
    }

    if (
      (await doAnySuiteRelevantChangesMatch([
        /^x-pack\/platform\/plugins\/shared\/fleet/,
        /^x-pack\/test\/fleet_cypress/,
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/fleet_cypress\.ts/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(renderSteps(fleetCypressSteps(), cancelOnGate));
    }

    // Docker Fleet Server + Elastic Agent: only for the policy version code paths and this suite,
    // not for every Fleet change.
    if (
      // Scout suite: changes to its own Scout tests must still trigger it.
      (await doAnyChangesMatch([
        /^x-pack\/platform\/plugins\/shared\/fleet\/server\/tasks\/version_specific_policy_assignment_task/,
        /^x-pack\/platform\/plugins\/shared\/fleet\/server\/services\/agent_policy\.ts/,
        /^x-pack\/platform\/plugins\/shared\/fleet\/server\/services\/agent_policies\//,
        /^x-pack\/platform\/plugins\/shared\/fleet\/server\/services\/utils\/(version_specific_policies|sentinel_policy_version)/,
        /^x-pack\/platform\/plugins\/shared\/fleet\/common\/services\/version_specific_polic/,
        /^x-pack\/platform\/plugins\/shared\/fleet\/test\/scout_fleet_real_agent/,
        /^src\/platform\/packages\/shared\/kbn-scout\/src\/servers\/configs\/config_sets\/fleet_real_agent/,
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/scout_fleet_real_agent\.ts/,
        /^\.buildkite\/scripts\/steps\/test\/scout_fleet_real_agent\.sh/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:scout-fleet-real-agent') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(renderSteps(scoutFleetRealAgentSteps(), cancelOnGate));
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
      (await doAnySuiteRelevantChangesMatch([
        ...aiInfraPaths,
        ...aiConnectorPaths,
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/ai_infra_gen_ai\.ts/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-gen-ai-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(renderSteps(aiInfraGenAiSteps(), cancelOnGate));
    }

    if (
      // Scout suite: changes to its own Scout tests must still trigger it.
      ((await doAnyChangesMatch([
        ...aiInfraPaths,
        ...aiConnectorPaths,
        ...agentBuilderPaths,
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/agent_builder_smoke_tests\.ts/,
      ])) ||
        GITHUB_PR_LABELS.includes('agent-builder:run-smoke-tests') ||
        GITHUB_PR_LABELS.includes('ci:all-gen-ai-suites') ||
        ALL_UI_TEST_SUITES) &&
      !GITHUB_PR_LABELS.includes('agent-builder:skip-smoke-tests')
    ) {
      pipeline.push(renderSteps(agentBuilderSmokeTestsSteps(), cancelOnGate));
    }

    if (
      GITHUB_PR_LABELS.includes('ci:build-cloud-image') &&
      !GITHUB_PR_LABELS.includes('ci:deploy-cloud') &&
      !GITHUB_PR_LABELS.includes('ci:cloud-deploy') &&
      !GITHUB_PR_LABELS.includes('ci:cloud-redeploy')
    ) {
      pipeline.push(renderSteps(buildCloudImageSteps(), cancelOnGate));
    }

    if (
      GITHUB_PR_LABELS.includes('ci:build-cloud-fips-image') &&
      !GITHUB_PR_LABELS.includes('ci:deploy-cloud') &&
      !GITHUB_PR_LABELS.includes('ci:cloud-deploy') &&
      !GITHUB_PR_LABELS.includes('ci:cloud-redeploy')
    ) {
      pipeline.push(renderSteps(buildCloudFipsImageSteps(), cancelOnGate));
    }

    if (
      GITHUB_PR_LABELS.includes('ci:deploy-cloud') ||
      GITHUB_PR_LABELS.includes('ci:cloud-deploy') ||
      GITHUB_PR_LABELS.includes('ci:cloud-redeploy')
    ) {
      pipeline.push(renderSteps(deployCloudSteps(), cancelOnGate));
    }

    if (GITHUB_PR_LABELS.includes('ci:build-docker-fips')) {
      pipeline.push(renderSteps(buildFipsImage(), cancelOnGate));
    }

    if (GITHUB_PR_LABELS.includes('ci:entity-store-performance')) {
      pipeline.push(renderSteps(entityStorePerformanceSteps(), cancelOnGate));
    }

    if (
      process.env.GITHUB_PR_TARGET_BRANCH?.match(/^main$/) &&
      (GITHUB_PR_LABELS.includes('ci:project-deploy-elasticsearch') ||
        GITHUB_PR_LABELS.includes('ci:project-deploy-observability') ||
        GITHUB_PR_LABELS.includes('ci:project-deploy-log_essentials') ||
        GITHUB_PR_LABELS.includes('ci:project-deploy-security') ||
        GITHUB_PR_LABELS.includes('ci:project-deploy-ai4soc'))
    ) {
      pipeline.push(renderSteps(deployProjectSteps(), cancelOnGate));
    } else if (GITHUB_PR_LABELS.includes('ci:build-serverless-image')) {
      pipeline.push(renderSteps(buildProjectSteps(), cancelOnGate));
    }

    if (
      (await doAnySuiteRelevantChangesMatch([
        /.*stor(ies|y).*/,
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/storybooks\.ts/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:build-storybooks') ||
      (await isStorybookBuildAffected())
    ) {
      pipeline.push(renderSteps(storybooks(), cancelOnGate));
    }

    if (
      ((await doAnySuiteRelevantChangesMatch([
        /\.docnav\.json$/,
        /\.apidocs\.json$/,
        /\.devdocs\.json$/,
        /\.mdx$/,
        /^dev_docs\/.*(png|gif|jpg|jpeg|webp)$/,
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/check_next_docs\.ts/,
      ])) &&
        process.env.GITHUB_PR_TARGET_BRANCH === 'main') ||
      GITHUB_PR_LABELS.includes('ci:build-next-docs')
    ) {
      pipeline.push(renderSteps(checkNextDocs(), cancelOnGate));
    }

    if (
      (await doAnySuiteRelevantChangesMatch([
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/security_solution\/cypress_burn\.ts/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:cypress-burn') ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(renderSteps(cypressBurnSteps(), cancelOnGate));
    }

    if (
      (await doAnySuiteRelevantChangesMatch([
        /^src\/platform\/packages\/shared\/kbn-securitysolution-.*/,
        /^x-pack\/solutions\/security\/packages\/kbn-securitysolution-.*/,
        /^x-pack\/solutions\/security\/plugins\/security_solution/,
        /^x-pack\/solutions\/security\/test\/defend_workflows_cypress/,
        /^x-pack\/solutions\/security\/test\/security_solution_cypress/,
        /^fleet_packages\.json/,
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/security_solution\/defend_workflows\.ts/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(renderSteps(defendWorkflowsSteps(), cancelOnGate));
    }

    if (
      (await doAnySuiteRelevantChangesMatch([
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
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/security_solution\/ai_assistant\.ts/,
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/security_solution\/ai4dsoc\.ts/,
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/security_solution\/detection_engine\.ts/,
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/security_solution\/entity_analytics\.ts/,
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/security_solution\/rule_management\.ts/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(renderSteps(aiAssistantSteps(), cancelOnGate));
      pipeline.push(renderSteps(ai4dsocSteps(), cancelOnGate));
      pipeline.push(renderSteps(detectionEngineSteps(), cancelOnGate));
      pipeline.push(renderSteps(entityAnalyticsSteps(), cancelOnGate));
      pipeline.push(renderSteps(ruleManagementSteps(), cancelOnGate));
    }

    if (
      (await doAnySuiteRelevantChangesMatch([
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
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/security_solution\/explore\.ts/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(renderSteps(exploreSteps(), cancelOnGate));
    }

    if (
      (await doAnySuiteRelevantChangesMatch([
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
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/security_solution\/investigations\.ts/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(renderSteps(investigationsSteps(), cancelOnGate));
    }

    if (
      ((await doAnySuiteRelevantChangesMatch([
        /^x-pack\/platform\/plugins\/shared\/osquery/,
        /^x-pack\/solutions\/security\/test\/osquery_cypress/,
        /^x-pack\/solutions\/security\/plugins\/security_solution/,
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/security_solution\/osquery_cypress\.ts/,
      ])) ||
        GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
        ALL_UI_TEST_SUITES) &&
      !GITHUB_PR_LABELS.includes('ci:skip-cypress-osquery')
    ) {
      pipeline.push(renderSteps(osqueryCypressSteps(), cancelOnGate));
    }

    if (
      (await doAnySuiteRelevantChangesMatch([
        /^x-pack\/packages\/kbn-cloud-security-posture/,
        /^x-pack\/solutions\/security\/plugins\/cloud_security_posture/,
        /^x-pack\/solutions\/security\/plugins\/security_solution/,
        /^x-pack\/solutions\/security\/test\/security_solution_cypress/,
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/security_solution\/cloud_security_posture\.ts/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(renderSteps(cloudSecurityPostureSteps(), cancelOnGate));
    }

    if (
      // Scout suite: changes to its own Scout tests must still trigger it.
      (await doAnyChangesMatch([
        /^x-pack\/platform\/plugins\/shared\/fleet/,
        /^x-pack\/packages\/kbn-cloud-security-posture/,
        /^x-pack\/solutions\/security\/plugins\/cloud_security_posture/,
        /^x-pack\/solutions\/security\/plugins\/security_solution/,
        /^src\/platform\/packages\/shared\/kbn-scout\/src\/servers\/configs\/custom\/cspm_agentless/,
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/security_solution\/cspm_agentless_scout\.ts/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:cloud-security-posture-scout') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(renderSteps(cspmAgentlessScoutSteps(), cancelOnGate));
    }

    if (
      // Scout suite: changes to its own Scout tests must still trigger it.
      (await doAnyChangesMatch([
        /^fleet_packages\.json/,
        /^x-pack\/solutions\/security\/plugins\/security_solution\/public\/management/,
        /^x-pack\/solutions\/security\/plugins\/security_solution\/server\/endpoint/,
        /^x-pack\/solutions\/security\/plugins\/security_solution\/common\/endpoint/,
        /^x-pack\/solutions\/security\/plugins\/security_solution\/scripts\/endpoint/,
        /^x-pack\/solutions\/security\/plugins\/security_solution\/server\/lib\/detection_engine\/rule_response_actions/,
        /^x-pack\/solutions\/security\/plugins\/security_solution\/server\/fleet_integration\/fleet_integration\.ts/,
        /^x-pack\/solutions\/security\/plugins\/security_solution\/server\/lib\/detection_engine\/prebuilt_rules\/logic\/integrations\/install_endpoint_security_prebuilt_rule\.ts/,
        /^x-pack\/solutions\/security\/plugins\/security_solution\/public\/detection_engine\/rule_response_actions/,
        /^x-pack\/solutions\/security\/plugins\/security_solution\/public\/flyout_v2\/document\/tools\/response/,
        /^x-pack\/solutions\/security\/plugins\/security_solution\/public\/flyout_v2\/document\/main\/components\/response_section/,
        /^x-pack\/solutions\/security\/plugins\/security_solution\/public\/common\/components\/response_actions/,
        /^x-pack\/solutions\/security\/plugins\/security_solution\/test\/scout_edr_real_fleet/,
        /^src\/platform\/packages\/shared\/kbn-scout\/src\/servers\/configs\/config_sets\/edr_real_fleet/,
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/security_solution\/scout_edr_real_fleet\.ts/,
        /^\.buildkite\/pipelines\/security_solution\/scout_edr_real_fleet\.yml/,
        /^\.buildkite\/pipeline-resource-definitions\/kibana-scout-edr-real-fleet\.yml/,
        /^\.buildkite\/scripts\/steps\/test\/scout_edr_real_fleet\.sh/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:scout-edr-real-fleet') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(renderSteps(scoutEdrRealFleetSteps(), cancelOnGate));
    }

    if (
      GITHUB_PR_LABELS.includes('ci:security-genai-run-evals') ||
      GITHUB_PR_LABELS.includes('ci:security-genai-run-evals-local-prompts') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(renderSteps(securitySolutionGenAiEvalsSteps(), cancelOnGate));
    }

    // On matching labels, hand LLM evals to the dedicated `kibana-evals-pr-llm-evals` pipeline via a
    // fire-and-forget trigger step (not inline) so their runtime is off the PR's critical path.
    const evalsTrigger = getEvalTriggerStep(GITHUB_PR_LABELS);
    if (evalsTrigger) {
      pipeline.push(evalsTrigger);
    }

    if (GITHUB_PR_LABELS.includes('ci:sync-model-labels')) {
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/sync_model_labels.yml', cancelable)
      );
    }

    if (
      (await doAnySuiteRelevantChangesMatch([
        /^x-pack\/solutions\/security\/plugins\/security_solution\/public\/asset_inventory/,
        /^x-pack\/solutions\/security\/test\/security_solution_cypress/,
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/security_solution\/asset_inventory\.ts/,
      ])) ||
      GITHUB_PR_LABELS.includes('ci:all-cypress-suites') ||
      ALL_UI_TEST_SUITES
    ) {
      pipeline.push(renderSteps(assetInventorySteps(), cancelOnGate));
    }

    // Check for prompt file changes and conditionally add pipeline step
    if (
      await doAnySuiteRelevantChangesMatch([
        /^x-pack\/solutions\/security\/plugins\/elastic_assistant\/server\/lib\/prompt\/local_prompt_object\.ts$/,
        /^x-pack\/solutions\/security\/plugins\/elastic_assistant\/server\/lib\/prompt\/tool_prompts\.ts$/,
        /^x-pack\/solutions\/security\/plugins\/elastic_assistant\/server\/lib\/prompt\/defend_insight_prompts\.ts$/,
        /^x-pack\/solutions\/security\/plugins\/elastic_assistant\/server\/lib\/prompt\/prompts\.ts$/,
        /^\.buildkite\/pipelines\/pull_request\/prompt_changes\.yml/,
      ])
    ) {
      pipeline.push(
        getPipeline('.buildkite/pipelines/pull_request/prompt_changes.yml', cancelable)
      );
    }

    // Run Saved Objects checks systematically
    if (!scoutTestsOnly) {
      pipeline.push(renderSteps(checkSavedObjects(), cancelOnGate));
    }

    // Run Workflow Schema OOM prevention test when schema or connector whitelist changes
    if (
      GITHUB_PR_LABELS.includes('ci:workflow-oom-test') ||
      // Scout suite: changes to its own Scout tests must still trigger it.
      (await doAnyChangesMatch([
        /^src\/platform\/plugins\/shared\/workflows_management\/common\/schema/,
        /^src\/platform\/plugins\/shared\/workflows_management\/server\/.*internal_actions/,
        /^src\/platform\/packages\/shared\/workflows\//,
        /^\.buildkite\/pipeline-utils\/step-library\/steps\/workflows_oom_testing\.ts/,
        /^\.buildkite\/scripts\/steps\/test\/scout\/workflows_oom_testing\.sh/,
      ]))
    ) {
      pipeline.push(renderSteps(workflowsOomTestingSteps(), cancelOnGate));
    }

    if (GITHUB_PR_LABELS.includes('ci:cps-test')) {
      pipeline.push(renderSteps(cpsTests(), cancelOnGate));
    }

    if (GITHUB_PR_LABELS.includes('ci:bench-jest')) {
      pipeline.push(renderSteps(jestBenchSteps(), cancelOnGate));
    }

    if (GITHUB_PR_LABELS.includes('ci:bench-ftr')) {
      pipeline.push(renderSteps(ftrBenchSteps(), cancelOnGate));
    }

    if (GITHUB_PR_LABELS.includes('ci:bench-page-load')) {
      pipeline.push(renderSteps(pageLoadBenchSteps(), cancelOnGate));
    }

    // Run the warm-start memory check systematically; it is non-blocking.
    if (!scoutTestsOnly) {
      pipeline.push(renderSteps(warmStartMemoryBenchSteps(), cancelOnGate));
    }

    if (GITHUB_PR_LABELS.includes('ci:run-code-quality')) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/code_quality.yml', cancelable));
    }

    // post_build is not cancelable — cleanup/reporting should always run
    pipeline.push(renderSteps(postBuildSteps()));

    flushCancelOnGateFailureMetadata();
    emitPipeline(pipeline);
  } catch (ex) {
    console.error('Error while generating the pipeline steps: ' + ex.message, ex);
    process.exit(1);
  }
})();
