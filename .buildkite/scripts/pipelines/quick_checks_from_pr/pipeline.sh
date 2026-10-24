#!/bin/bash

set -euo pipefail

# Entry point for the `kibana-quick-checks-from-pr` pipeline, triggered by the
# "Quick CI checks" checkbox in the PR comment. Uploads only the fast gate steps.
node .buildkite/scripts/pipelines/quick_checks_from_pr/pipeline.ts
