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

import {
  getNightshiftEvalSteps,
  isPreemptibleEnabled,
} from '../../../pipelines/nightshift_evals/nightshift_evals_pipeline.ts';
import { emitPipeline } from '#pipeline-utils';
import { postBuildSteps, renderSteps } from '#pipeline-utils/step-library';

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

// The trailing `wait` must stay last: the steps above it finish before post-build runs.
const postludeSteps = renderSteps(postBuildSteps());

// Shared by the PR and the weekly pipeline. The experiment is hardcoded, so there is no
// label gate: starting the pipeline is the decision to run it.
emitPipeline([
  [`env:`, `  CI_STATS_DISABLE_PR_REPORT: 'true'`].join('\n'),
  'steps:',
  preBuildStep,
  getNightshiftEvalSteps({ preemptible: isPreemptibleEnabled() }),
  postludeSteps,
]);
