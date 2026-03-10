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

import { emitPipeline, getAgentImageConfig } from '#pipeline-utils';

(async () => {
  try {
    console.warn('Temporarily emitting only Jest checkpoint retry repro pipeline');

    const pipeline = [
      getAgentImageConfig({ returnYaml: true }),
      `steps:
  - label: 'Jest Checkpoint Retry Repro'
    key: jest-checkpoint-repro
    command: |-
      set -euo pipefail
      .buildkite/scripts/bootstrap.sh

      PASS_CONFIG=".buildkite/scripts/pipelines/pull_request/jest_retry_repro/pass/jest.config.js"
      FAIL_CONFIG=".buildkite/scripts/pipelines/pull_request/jest_retry_repro/fail/jest.config.js"
      PASS_HASH=$(printf '%s' "$PASS_CONFIG" | shasum -a 256 | awk '{print $1}' | cut -c1-12)
      FAIL_HASH=$(printf '%s' "$FAIL_CONFIG" | shasum -a 256 | awk '{print $1}' | cut -c1-12)
      PASS_KEY="jest_ckpt_\${BUILDKITE_STEP_ID}_\${BUILDKITE_PARALLEL_JOB:-0}_\${PASS_HASH}"
      FAIL_KEY="jest_ckpt_\${BUILDKITE_STEP_ID}_\${BUILDKITE_PARALLEL_JOB:-0}_\${FAIL_HASH}"

      echo "[jest-checkpoint-repro] retry=\${BUILDKITE_RETRY_COUNT:-0} step=\${BUILDKITE_STEP_ID} job=\${BUILDKITE_PARALLEL_JOB:-0}"
      echo "[jest-checkpoint-repro] pass key=\${PASS_KEY} value=$(buildkite-agent meta-data get "$PASS_KEY" --default '<missing>')"
      echo "[jest-checkpoint-repro] fail key=\${FAIL_KEY} value=$(buildkite-agent meta-data get "$FAIL_KEY" --default '<missing>')"

      node ./scripts/jest_all --configs=".buildkite/scripts/pipelines/pull_request/jest_retry_repro/pass/jest.config.js,.buildkite/scripts/pipelines/pull_request/jest_retry_repro/fail/jest.config.js" --coverage=false --passWithNoTests --maxParallel=1
    agents:
      machineType: n2d-standard-4
      preemptible: true
      spotZones: us-central1-b,us-central1-c,us-central1-f
      diskSizeGb: 105
    timeout_in_minutes: 20
    retry:
      automatic:
        - exit_status: '*'
          limit: 1`,
    ];

    emitPipeline(pipeline);
  } catch (ex) {
    console.error('Error while generating the pipeline steps: ' + ex.message, ex);
    process.exit(1);
  }
})();
