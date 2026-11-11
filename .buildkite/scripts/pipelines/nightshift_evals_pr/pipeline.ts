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

import { parseNightshiftSelection } from '../../../pipelines/nightshift_evals/nightshift_evals_pipeline.ts';
import { emitPipeline } from '#pipeline-utils';
import { postBuildSteps, renderSteps } from '#pipeline-utils/step-library';

// Forwarded by the trigger from kibana-pull-request.
const GITHUB_PR_LABELS = process.env.GITHUB_PR_LABELS ?? '';

if (!parseNightshiftSelection(GITHUB_PR_LABELS)) {
  // The trigger shares this gate, so an empty selection means parent/child divergence.
  console.error(
    `No nightshift-evals task matched GITHUB_PR_LABELS='${GITHUB_PR_LABELS}'. The trigger uses ` +
      `the same gate, so this is a parent/child divergence. Failing instead of reporting green.`
  );
  process.exit(1);
}

const preBuildStep = [
  `  - label: ':construction_worker: Pre-Build'`,
  `    key: pre_build`,
  `    command: .buildkite/scripts/lifecycle/pre_build.sh`,
  `    timeout_in_minutes: 10`,
  `    agents:`,
  `      image: family/kibana-minimal-ubuntu-2604`,
  `      imageProject: elastic-images-prod`,
  `      provider: gcp`,
  `      machineType: n2-standard-2`,
  `    retry:`,
  `      automatic:`,
  `        - exit_status: '*'`,
  `          limit: 1`,
].join('\n');

// The plan step needs the full checkout for node and the pipeline utils, and `GITHUB_TOKEN`
// plus the Vault secrets that `KBN_EVALS` exposes, to clone nightshift-evals.
const planStep = [
  `  - label: ':clipboard: Plan Nightshift Evals'`,
  `    key: nightshift-evals-plan`,
  `    depends_on: pre_build`,
  `    command: bash .buildkite/scripts/steps/nightshift_evals/plan_steps.sh`,
  `    env:`,
  `      GITHUB_PR_LABELS: ${JSON.stringify(GITHUB_PR_LABELS).replace(/\$/g, '$$$$')}`,
  `    timeout_in_minutes: 10`,
  `    agents:`,
  `      image: family/kibana-ubuntu-2404`,
  `      imageProject: elastic-images-prod`,
  `      provider: gcp`,
  `      machineType: n2-standard-2`,
].join('\n');

// The trailing `wait` must stay last: the plan step uploads the task steps before it.
const postludeSteps = renderSteps(postBuildSteps());

emitPipeline([
  [`env:`, `  CI_STATS_DISABLE_PR_REPORT: 'true'`].join('\n'),
  'steps:',
  preBuildStep,
  planStep,
  postludeSteps,
]);
