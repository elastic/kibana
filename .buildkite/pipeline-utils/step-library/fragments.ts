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
import { apiContracts } from './steps/api_contracts.ts';
import { checkNextDocs } from './steps/check_next_docs.ts';
import { checkOasSnapshot } from './steps/check_oas_snapshot.ts';
import { checkSavedObjects } from './steps/check_saved_objects.ts';
import { codeQuality } from './steps/code_quality.ts';
import { cpsTests } from './steps/cps_testing.ts';
import { localCheck } from './steps/local_check.ts';
import { prBaseEnv, prBaseSteps } from './steps/pull_request_base.ts';
import { storybooks } from './steps/storybooks.ts';
import { verifyFipsEnabled } from './steps/verify_fips_enabled.ts';
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

export const FRAGMENTS: readonly Fragment[] = [
  { ...yamlFragment('fips/verify_fips_enabled'), steps: verifyFipsEnabled },
  yamlFragment('pull_request/agent_builder_smoke_tests'),
  yamlFragment('pull_request/ai_infra_gen_ai'),
  { ...yamlFragment('pull_request/api_contracts'), steps: apiContracts },
  { ...yamlFragment('pull_request/base'), steps: prBaseSteps, env: prBaseEnv },
  yamlFragment('pull_request/build_cloud_fips_image'),
  yamlFragment('pull_request/build_cloud_image'),
  yamlFragment('pull_request/build_project'),
  { ...yamlFragment('pull_request/check_next_docs'), steps: checkNextDocs },
  { ...yamlFragment('pull_request/check_oas_snapshot'), steps: checkOasSnapshot },
  { ...yamlFragment('pull_request/check_saved_objects'), steps: checkSavedObjects },
  { ...yamlFragment('pull_request/code_quality'), steps: codeQuality },
  { ...yamlFragment('pull_request/cps_testing'), steps: cpsTests },
  yamlFragment('pull_request/deploy_cloud'),
  yamlFragment('pull_request/deploy_project'),
  yamlFragment('pull_request/fips'),
  yamlFragment('pull_request/fleet_cypress'),
  yamlFragment('pull_request/ftr_bench'),
  yamlFragment('pull_request/jest_bench'),
  yamlFragment('pull_request/kbn_handlebars'),
  { ...yamlFragment('pull_request/local_check'), steps: localCheck },
  yamlFragment('pull_request/page_load_bench'),
  yamlFragment('pull_request/post_build'),
  yamlFragment('pull_request/prompt_changes'),
  yamlFragment('pull_request/renovate'),
  yamlFragment('pull_request/response_ops'),
  yamlFragment('pull_request/response_ops_cases'),
  yamlFragment('pull_request/scout_fleet_real_agent'),
  yamlFragment('pull_request/security_solution/ai4dsoc'),
  yamlFragment('pull_request/security_solution/ai_assistant'),
  yamlFragment('pull_request/security_solution/asset_inventory'),
  yamlFragment('pull_request/security_solution/cloud_security_posture'),
  yamlFragment('pull_request/security_solution/cspm_agentless_scout'),
  yamlFragment('pull_request/security_solution/cypress_burn'),
  yamlFragment('pull_request/security_solution/defend_workflows'),
  yamlFragment('pull_request/security_solution/detection_engine'),
  yamlFragment('pull_request/security_solution/entity_analytics'),
  yamlFragment('pull_request/security_solution/explore'),
  yamlFragment('pull_request/security_solution/gen_ai_evals'),
  yamlFragment('pull_request/security_solution/investigations'),
  yamlFragment('pull_request/security_solution/osquery_cypress'),
  yamlFragment('pull_request/security_solution/rule_management'),
  yamlFragment('pull_request/security_solution/scout_edr_real_fleet'),
  yamlFragment('pull_request/store_moon_cache'),
  { ...yamlFragment('pull_request/storybooks'), steps: storybooks },
  yamlFragment('pull_request/sync_model_labels'),
  yamlFragment('pull_request/trigger_entity_store_performance'),
  yamlFragment('pull_request/warm_start_memory_bench'),
  yamlFragment('pull_request/workflows_oom_testing'),
];

// The parsed, semantically normalized document of a fragment: from its TypeScript function once it
// has one, from its YAML file until then.
export const loadFragmentDocument = (fragment: Fragment): unknown =>
  normalizeSemantics(
    fragment.steps
      ? parse(renderSteps(fragment.steps(), { header: true, env: fragment.env }))
      : parse(fs.readFileSync(path.join(getKibanaDir(), fragment.yamlPath), 'utf8'))
  );
