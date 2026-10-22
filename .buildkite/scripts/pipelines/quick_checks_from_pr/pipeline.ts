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

import { parse, stringify } from 'yaml';
import { runPreBuild } from '../pull_request/pre_build.ts';
import { emitPipeline, getAgentImageConfig, getPipeline } from '#pipeline-utils';

// Gate steps from the PR pipeline's base.yml, run without building Kibana or any test suites.
const QUICK_CHECK_STEP_KEYS = ['quick_checks', 'checks', 'linting', 'check_types'];

interface PipelineStep {
  key?: string;
}

(async () => {
  try {
    await runPreBuild();

    const { steps } = parse(getPipeline('.buildkite/pipelines/pull_request/base.yml', false)) as {
      steps: PipelineStep[];
    };
    const quickCheckSteps = steps.filter(({ key }) => key && QUICK_CHECK_STEP_KEYS.includes(key));
    const missing = QUICK_CHECK_STEP_KEYS.filter(
      (key) => !quickCheckSteps.some((step) => step.key === key)
    );

    if (missing.length > 0) {
      throw new Error(`Steps not found in base.yml: ${missing.join(', ')}`);
    }

    emitPipeline([
      getAgentImageConfig({ returnYaml: true }),
      stringify({ steps: quickCheckSteps }),
    ]);
  } catch (ex) {
    console.error('Error while generating the quick checks pipeline steps: ' + ex.message);
    console.error(ex);
    process.exit(1);
  }
})();
