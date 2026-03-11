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

      ALERTING_SHARDS="x-pack/platform/plugins/shared/alerting/jest.config.js||shard=1/6,x-pack/platform/plugins/shared/alerting/jest.config.js||shard=2/6,x-pack/platform/plugins/shared/alerting/jest.config.js||shard=3/6,x-pack/platform/plugins/shared/alerting/jest.config.js||shard=4/6,x-pack/platform/plugins/shared/alerting/jest.config.js||shard=5/6,x-pack/platform/plugins/shared/alerting/jest.config.js||shard=6/6"

      echo "[jest-checkpoint-repro] retry=\${BUILDKITE_RETRY_COUNT:-0} step=\${BUILDKITE_STEP_ID} job=\${BUILDKITE_PARALLEL_JOB:-0}"
      echo "[jest-checkpoint-repro] running configs=\${ALERTING_SHARDS}"

      node ./scripts/jest_all --configs="\${ALERTING_SHARDS}" --coverage=false --passWithNoTests --maxParallel=1

      if [ "\${BUILDKITE_RETRY_COUNT:-0}" = "0" ]; then
        echo "[jest-checkpoint-repro] forcing first attempt to fail to verify retry resume"
        exit 1
      fi
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
