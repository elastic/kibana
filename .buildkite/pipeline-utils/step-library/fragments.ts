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
import {
  prBaseEnv,
  prBaseSteps,
  apiContracts,
  codeQuality,
  kbnHandlebars,
  promptChanges,
  syncModelLabels,
  buildFipsImage,
  buildCloudFipsImageSteps,
  buildCloudImageSteps,
  deployCloudSteps,
  buildProjectSteps,
  deployProjectSteps,
  checkNextDocs,
  checkOasSnapshot,
  checkSavedObjects,
  cpsTests,
  entityStorePerformanceSteps as entityStoreSteps,
  agentBuilderSmokeTestsSteps,
  aiInfraGenAiSteps,
  ftrBenchSteps,
  jestBenchSteps,
  pageLoadBenchSteps,
  warmStartMemoryBenchSteps,
  fleetCypressSteps,
  localCheck,
  postBuildSteps,
  renovateValidation,
  responseOpsCasesSteps,
  responseOpsSteps,
  scoutFleetRealAgentSteps,
  storybooks,
  verifyFipsEnabled,
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
} from './index.ts';
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
  { ...yamlFragment('pull_request/api_contracts'), steps: apiContracts },
  { ...yamlFragment('pull_request/base'), steps: prBaseSteps, env: prBaseEnv },
  { ...yamlFragment('pull_request/build_cloud_fips_image'), steps: buildCloudFipsImageSteps },
  { ...yamlFragment('pull_request/build_cloud_image'), steps: buildCloudImageSteps },
  { ...yamlFragment('pull_request/build_project'), steps: buildProjectSteps },
  { ...yamlFragment('pull_request/check_next_docs'), steps: checkNextDocs },
  { ...yamlFragment('pull_request/check_oas_snapshot'), steps: checkOasSnapshot },
  { ...yamlFragment('pull_request/check_saved_objects'), steps: checkSavedObjects },
  { ...yamlFragment('pull_request/code_quality'), steps: codeQuality },
  { ...yamlFragment('pull_request/cps_testing'), steps: cpsTests },
  { ...yamlFragment('pull_request/deploy_cloud'), steps: deployCloudSteps },
  { ...yamlFragment('pull_request/deploy_project'), steps: deployProjectSteps },
  { ...yamlFragment('pull_request/fips'), steps: buildFipsImage },
  { ...yamlFragment('pull_request/fleet_cypress'), steps: fleetCypressSteps },
  { ...yamlFragment('pull_request/ftr_bench'), steps: ftrBenchSteps },
  { ...yamlFragment('pull_request/jest_bench'), steps: jestBenchSteps },
  { ...yamlFragment('pull_request/kbn_handlebars'), steps: kbnHandlebars },
  { ...yamlFragment('pull_request/local_check'), steps: localCheck },
  { ...yamlFragment('pull_request/page_load_bench'), steps: pageLoadBenchSteps },
  { ...yamlFragment('pull_request/post_build'), steps: postBuildSteps },
  { ...yamlFragment('pull_request/prompt_changes'), steps: promptChanges },
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
  { ...yamlFragment('pull_request/sync_model_labels'), steps: syncModelLabels },
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
