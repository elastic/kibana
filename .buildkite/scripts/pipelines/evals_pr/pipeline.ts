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

import { execFileSync } from 'child_process';
import { getEvalPipelinePlan } from '../../../pipelines/evals/eval_pipeline.ts';
import { emitPipeline } from '#pipeline-utils';
import { postBuildSteps, renderSteps } from '#pipeline-utils/step-library';

// Forwarded by the trigger from kibana-pull-request; re-selects the same suites/models.
const GITHUB_PR_LABELS = process.env.GITHUB_PR_LABELS ?? '';

// The build step is skipped when KIBANA_BUILD_ID reuses the PR artifact, as in kibana-pull-request;
// a skipped step still satisfies `depends_on: build`.
const preludeSteps = [
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
  ``,
  `  - label: ':kibana: Build Kibana Distribution'`,
  `    key: build`,
  `    depends_on: pre_build`,
  `    command: .buildkite/scripts/steps/build_kibana.sh`,
  `    if: "build.env('KIBANA_BUILD_ID') == null || build.env('KIBANA_BUILD_ID') == ''"`,
  // timeout/retry only bite on a manual trigger with no KIBANA_BUILD_ID, so it fails cleanly
  // instead of hanging on the small agent.
  `    timeout_in_minutes: 90`,
  `    agents:`,
  `      image: family/kibana-ubuntu-2404`,
  `      imageProject: elastic-images-prod`,
  `      provider: gcp`,
  `      machineType: n2-standard-8`,
  `    retry:`,
  `      automatic:`,
  `        - exit_status: '*'`,
  `          limit: 1`,
].join('\n');

// Reuse kibana-pull-request's canonical Post-Build (trailing `wait` + post_build.sh on a light
// k8s/sparse agent) so it can't drift. The wait must be last: suite fanouts are emitted before it,
// and a suite that still has a parent step uploads its fanout as a group that inserts before it.
const postludeSteps = renderSteps(postBuildSteps());

const evalsPlan = getEvalPipelinePlan(GITHUB_PR_LABELS);

if (!evalsPlan) {
  // The trigger shares this gate, so an empty selection means parent/child divergence (e.g. a
  // broken checkout). Fail loudly — a red upload step beats a green `kibana-evals` with zero suites.
  console.error(
    `No eval suites matched GITHUB_PR_LABELS='${GITHUB_PR_LABELS}'. The trigger uses the same gate, ` +
      `so this indicates a parent/child divergence (e.g. a broken checkout). Failing instead of ` +
      `reporting a green status with zero evals.`
  );
  process.exit(1);
}

// Suites fanned out here have no parent step to tell the comparison and notify steps which models ran.
for (const [suiteId, connectorIds] of Object.entries(evalsPlan.connectorsBySuite)) {
  execFileSync('buildkite-agent', ['meta-data', 'set', `kbn-evals:connectors:${suiteId}`], {
    input: connectorIds.join(','),
    stdio: ['pipe', 'ignore', 'inherit'],
  });
}

const pipelineEnv = ['env:', `  CI_STATS_DISABLE_PR_REPORT: 'true'`].join('\n');

emitPipeline([pipelineEnv, 'steps:', preludeSteps, evalsPlan.yaml, postludeSteps]);
