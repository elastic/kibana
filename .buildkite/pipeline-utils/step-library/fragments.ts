/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import { renderSteps } from './render.ts';
import { normalizeSemantics } from './semantic_normalization.ts';
import { prBaseEnv, prBaseSteps } from './steps/pull_request_base.ts';
import { buildFipsImage } from './steps/build_fips_image.ts';
import { buildCloudFipsImageSteps } from './steps/build_cloud_fips_image.ts';
import { buildCloudImageSteps } from './steps/build_cloud_image.ts';
import { buildProjectSteps } from './steps/build_project.ts';
import { checkNextDocs } from './steps/check_next_docs.ts';
import { checkOasSnapshot } from './steps/check_oas_snapshot.ts';
import { checkSavedObjects } from './steps/check_saved_objects.ts';
import { cpsTests } from './steps/cps_testing.ts';
import { deployCloudSteps } from './steps/deploy_cloud.ts';
import { deployProjectSteps } from './steps/deploy_project.ts';
import { entityStorePerformanceSteps as entityStoreSteps } from './steps/trigger_entity_store_performance.ts';
import { agentBuilderSmokeTestsSteps } from './steps/agent_builder_smoke_tests.ts';
import { aiInfraGenAiSteps } from './steps/ai_infra_gen_ai.ts';
import {
  ftrBenchSteps,
  jestBenchSteps,
  pageLoadBenchSteps,
  warmStartMemoryBenchSteps,
} from './steps/benchmarks.ts';
import { fleetCypressSteps } from './steps/fleet_cypress.ts';
import { localCheck } from './steps/local_check.ts';
import { postBuildSteps } from './steps/post_build.ts';
import { renovateValidation } from './steps/renovate.ts';
import { responseOpsCasesSteps } from './steps/response_ops_cases.ts';
import { responseOpsSteps } from './steps/response_ops.ts';
import { scoutFleetRealAgentSteps } from './steps/scout_fleet_real_agent.ts';
import { storybooks } from './steps/storybooks.ts';
import { verifyFipsEnabled } from './steps/verify_fips_enabled.ts';
import { workflowsOomTestingSteps } from './steps/workflows_oom_testing.ts';
import { ai4dsocSteps } from './steps/security_solution/ai4dsoc.ts';
import { aiAssistantSteps } from './steps/security_solution/ai_assistant.ts';
import { assetInventorySteps } from './steps/security_solution/asset_inventory.ts';
import { cloudSecurityPostureSteps } from './steps/security_solution/cloud_security_posture.ts';
import { cspmAgentlessScoutSteps } from './steps/security_solution/cspm_agentless_scout.ts';
import { cypressBurnSteps } from './steps/security_solution/cypress_burn.ts';
import { defendWorkflowsSteps } from './steps/security_solution/defend_workflows.ts';
import { detectionEngineSteps } from './steps/security_solution/detection_engine.ts';
import { entityAnalyticsSteps } from './steps/security_solution/entity_analytics.ts';
import { exploreSteps } from './steps/security_solution/explore.ts';
import { securitySolutionGenAiEvalsSteps } from './steps/security_solution/gen_ai_evals.ts';
import { investigationsSteps } from './steps/security_solution/investigations.ts';
import { osqueryCypressSteps } from './steps/security_solution/osquery_cypress.ts';
import { ruleManagementSteps } from './steps/security_solution/rule_management.ts';
import { scoutEdrRealFleetSteps } from './steps/security_solution/scout_edr_real_fleet.ts';
import type { Step } from './types.ts';
import { getKibanaDir } from '#pipeline-utils/get_kibana_dir';

export interface Fragment {
  // Path under `.buildkite/pipelines/` without the extension. Also the snapshot name.
  name: string;
  // Repo-relative path of the YAML fragment. The file is deleted once `steps` is set.
  yamlPath: string;
  // Set once the fragment is ported to TypeScript.
  steps?: () => readonly Step[];
  // The document's top-level `env`, for a fragment that sets one.
  env?: Readonly<Record<string, string>>;
}

const yamlFragment = (name: string): Fragment => ({
  name,
  yamlPath: `.buildkite/pipelines/${name}.yml`,
});

// The registry sync tool parses one entry per line.
// prettier-ignore
export const FRAGMENTS: readonly Fragment[] = [
  { ...yamlFragment('fips/verify_fips_enabled'), steps: verifyFipsEnabled },
  { ...yamlFragment('pull_request/agent_builder_smoke_tests'), steps: agentBuilderSmokeTestsSteps },
  { ...yamlFragment('pull_request/ai_infra_gen_ai'), steps: aiInfraGenAiSteps },
  yamlFragment('pull_request/api_contracts'),
  { ...yamlFragment('pull_request/base'), steps: prBaseSteps, env: prBaseEnv },
  { ...yamlFragment('pull_request/build_cloud_fips_image'), steps: buildCloudFipsImageSteps },
  { ...yamlFragment('pull_request/build_cloud_image'), steps: buildCloudImageSteps },
  { ...yamlFragment('pull_request/build_project'), steps: buildProjectSteps },
  { ...yamlFragment('pull_request/check_next_docs'), steps: checkNextDocs },
  { ...yamlFragment('pull_request/check_oas_snapshot'), steps: checkOasSnapshot },
  { ...yamlFragment('pull_request/check_saved_objects'), steps: checkSavedObjects },
  yamlFragment('pull_request/code_quality'),
  { ...yamlFragment('pull_request/cps_testing'), steps: cpsTests },
  { ...yamlFragment('pull_request/deploy_cloud'), steps: deployCloudSteps },
  { ...yamlFragment('pull_request/deploy_project'), steps: deployProjectSteps },
  { ...yamlFragment('pull_request/fips'), steps: buildFipsImage },
  { ...yamlFragment('pull_request/fleet_cypress'), steps: fleetCypressSteps },
  { ...yamlFragment('pull_request/ftr_bench'), steps: ftrBenchSteps },
  { ...yamlFragment('pull_request/jest_bench'), steps: jestBenchSteps },
  yamlFragment('pull_request/kbn_handlebars'),
  { ...yamlFragment('pull_request/local_check'), steps: localCheck },
  { ...yamlFragment('pull_request/page_load_bench'), steps: pageLoadBenchSteps },
  { ...yamlFragment('pull_request/post_build'), steps: postBuildSteps },
  yamlFragment('pull_request/prompt_changes'),
  { ...yamlFragment('pull_request/renovate'), steps: renovateValidation },
  { ...yamlFragment('pull_request/response_ops'), steps: responseOpsSteps },
  { ...yamlFragment('pull_request/response_ops_cases'), steps: responseOpsCasesSteps },
  { ...yamlFragment('pull_request/scout_fleet_real_agent'), steps: scoutFleetRealAgentSteps },
  { ...yamlFragment('pull_request/security_solution/ai4dsoc'), steps: ai4dsocSteps },
  { ...yamlFragment('pull_request/security_solution/ai_assistant'), steps: aiAssistantSteps },
  { ...yamlFragment('pull_request/security_solution/asset_inventory'), steps: assetInventorySteps },
  { ...yamlFragment('pull_request/security_solution/cloud_security_posture'), steps: cloudSecurityPostureSteps },
  { ...yamlFragment('pull_request/security_solution/cspm_agentless_scout'), steps: cspmAgentlessScoutSteps },
  { ...yamlFragment('pull_request/security_solution/cypress_burn'), steps: cypressBurnSteps },
  { ...yamlFragment('pull_request/security_solution/defend_workflows'), steps: defendWorkflowsSteps },
  { ...yamlFragment('pull_request/security_solution/detection_engine'), steps: detectionEngineSteps },
  { ...yamlFragment('pull_request/security_solution/entity_analytics'), steps: entityAnalyticsSteps },
  { ...yamlFragment('pull_request/security_solution/explore'), steps: exploreSteps },
  { ...yamlFragment('pull_request/security_solution/gen_ai_evals'), steps: securitySolutionGenAiEvalsSteps },
  { ...yamlFragment('pull_request/security_solution/investigations'), steps: investigationsSteps },
  { ...yamlFragment('pull_request/security_solution/osquery_cypress'), steps: osqueryCypressSteps },
  { ...yamlFragment('pull_request/security_solution/rule_management'), steps: ruleManagementSteps },
  { ...yamlFragment('pull_request/security_solution/scout_edr_real_fleet'), steps: scoutEdrRealFleetSteps },
  { ...yamlFragment('pull_request/storybooks'), steps: storybooks },
  yamlFragment('pull_request/sync_model_labels'),
  { ...yamlFragment('pull_request/trigger_entity_store_performance'), steps: entityStoreSteps },
  { ...yamlFragment('pull_request/warm_start_memory_bench'), steps: warmStartMemoryBenchSteps },
  { ...yamlFragment('pull_request/workflows_oom_testing'), steps: workflowsOomTestingSteps },
];

// The parsed, semantically normalized document of a fragment: from its TypeScript function once it
// has one, from its YAML file until then.
export const loadFragmentDocument = (fragment: Fragment): unknown =>
  normalizeSemantics(
    fragment.steps
      ? parse(renderSteps(fragment.steps(), { header: true, env: fragment.env }))
      : parse(fs.readFileSync(path.join(getKibanaDir(), fragment.yamlPath), 'utf8'))
  );
