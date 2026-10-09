#!/bin/bash

set -euo pipefail

# Entry point for the dedicated `kibana-evals-pr-llm-evals` pipeline. Generates the eval
# steps from the forwarded GITHUB_PR_LABELS (reusing the same suite/model selection
# as kibana-pull-request) and uploads them via stdout.
ts-node .buildkite/scripts/pipelines/evals_pr/pipeline.ts
