#!/bin/bash

set -euo pipefail

# Entry point for the `kibana-nightshift-evals-pr` and `kibana-nightshift-evals-weekly` pipelines.
# Emits a pre-build step, a step that plans the task steps from nightshift-evals' ci/tasks.yaml,
# and the canonical post-build.
node .buildkite/scripts/pipelines/nightshift_evals/pipeline.ts
