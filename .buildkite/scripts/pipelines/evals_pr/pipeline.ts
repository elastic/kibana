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

import { getEvalPipeline } from '../../../pipelines/evals/eval_pipeline';
import { emitPipeline, getPipeline } from '#pipeline-utils';

// Forwarded by the trigger from kibana-pull-request; re-selects the same suites/models.
const GITHUB_PR_LABELS = process.env.GITHUB_PR_LABELS ?? '';

// Short-circuits when KIBANA_BUILD_ID reuses the PR artifact; kept so `depends_on: build` resolves.
const preludeSteps = [
  `  - label: ':construction_worker: Pre-Build'`,
  `    key: pre_build`,
  `    command: .buildkite/scripts/lifecycle/pre_build.sh`,
  `    timeout_in_minutes: 10`,
  `    agents:`,
  `      image: family/kibana-ubuntu-2404`,
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
  // timeout/retry only bite on the rare fallback rebuild (expired artifact / manual trigger
  // with no KIBANA_BUILD_ID) so it fails cleanly instead of hanging on the small agent.
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
// k8s/sparse agent) so it can't drift. The wait must be last — run_suite.sh uploads each suite's
// fanout as a separate group that inserts before it.
const postludeSteps = getPipeline('.buildkite/pipelines/pull_request/post_build.yml');

const evalsGroup = getEvalPipeline(GITHUB_PR_LABELS);

if (!evalsGroup) {
  // The trigger shares this gate, so an empty selection means parent/child divergence (e.g. a
  // broken checkout). Fail loudly — a red upload step beats a green `kibana-evals` with zero suites.
  console.error(
    `No eval suites matched GITHUB_PR_LABELS='${GITHUB_PR_LABELS}'. The trigger uses the same gate, ` +
      `so this indicates a parent/child divergence (e.g. a broken checkout). Failing instead of ` +
      `reporting a green status with zero evals.`
  );
  process.exit(1);
}

emitPipeline(['steps:', preludeSteps, evalsGroup, postludeSteps]);
