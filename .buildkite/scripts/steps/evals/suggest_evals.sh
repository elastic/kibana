#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/../../common/util.sh"

echo "Suggesting evals for the PR changes..."
node .buildkite/scripts/steps/evals/suggest_evals.ts
