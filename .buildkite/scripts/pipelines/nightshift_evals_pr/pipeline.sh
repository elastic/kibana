#!/bin/bash

set -euo pipefail

# Entry point for the `kibana-nightshift-evals-pr` pipeline. Emits a pre-build step, a step that
# plans the task steps from the forwarded GITHUB_PR_LABELS, and the canonical post-build.
node .buildkite/scripts/pipelines/nightshift_evals_pr/pipeline.ts
