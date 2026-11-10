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

import { runPreBuild } from '../pull_request/pre_build.ts';
import { emitPipeline, getAgentImageConfig } from '#pipeline-utils';
import { localCheck, postBuildSteps, prBaseSteps, renderSteps } from '#pipeline-utils/step-library';

// Steps of the PR pipeline's base steps that only validate the code statically.
// The local check (`check`) lives in its own fragment and is appended below.
const STATIC_CHECK_STEP_KEYS = ['quick_checks', 'checks', 'linting', 'check_types'];

(async () => {
  try {
    await runPreBuild();

    const staticCheckSteps = prBaseSteps().filter(
      (step) =>
        typeof step !== 'string' && 'key' in step && STATIC_CHECK_STEP_KEYS.includes(`${step.key}`)
    );
    const missing = STATIC_CHECK_STEP_KEYS.filter(
      (key) =>
        !staticCheckSteps.some(
          (step) => typeof step !== 'string' && 'key' in step && step.key === key
        )
    );

    if (missing.length > 0) {
      throw new Error(`Steps not found in the PR base steps: ${missing.join(', ')}`);
    }

    emitPipeline([
      getAgentImageConfig({ returnYaml: true }),
      renderSteps(staticCheckSteps, { header: true }),
      renderSteps(localCheck()),
      // Completes the CI Stats build and commit status that pre_build starts; always runs.
      renderSteps(postBuildSteps()),
    ]);
  } catch (ex) {
    console.error('Error while generating the static checks pipeline steps: ' + ex.message);
    console.error(ex);
    process.exit(1);
  }
})();
