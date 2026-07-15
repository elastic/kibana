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
import { emitPipeline } from '#pipeline-utils';

// Forwarded by the trigger from kibana-pull-request; re-selects the same suites/models.
const GITHUB_PR_LABELS = process.env.GITHUB_PR_LABELS ?? '';

// Build always runs but short-circuits (reusing the PR artifact) when KIBANA_BUILD_ID is set;
// keeping it present ensures the eval group's `depends_on: build` always resolves.
const preludeSteps = [
  `  - label: ':construction_worker: Pre-Build'`,
  `    key: pre_build`,
  `    command: .buildkite/scripts/lifecycle/pre_build.sh`,
  `    agents:`,
  `      image: family/kibana-ubuntu-2404`,
  `      imageProject: elastic-images-prod`,
  `      provider: gcp`,
  `      machineType: n2-standard-2`,
  ``,
  `  - label: ':kibana: Build Kibana Distribution'`,
  `    key: build`,
  `    depends_on: pre_build`,
  `    command: .buildkite/scripts/steps/build_kibana.sh`,
  `    agents:`,
  `      image: family/kibana-ubuntu-2404`,
  `      imageProject: elastic-images-prod`,
  `      provider: gcp`,
  `      machineType: n2-standard-8`,
].join('\n');

const evalsGroup = getEvalPipeline(GITHUB_PR_LABELS);

if (!evalsGroup) {
  // Shouldn't happen (the trigger shares the same gate); emit an empty pipeline instead of erroring.
  console.warn(
    `No eval suites matched GITHUB_PR_LABELS='${GITHUB_PR_LABELS}'; emitting an empty pipeline.`
  );
  emitPipeline(['steps: []']);
} else {
  emitPipeline(['steps:', preludeSteps, evalsGroup]);
}
