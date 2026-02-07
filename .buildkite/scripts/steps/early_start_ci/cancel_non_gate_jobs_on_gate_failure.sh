#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/bootstrap.sh

echo '--- PR CI early-start gate-failure cancellation check'
ts-node "$(dirname "${0}")/cancel_non_gate_jobs_on_gate_failure.ts"
