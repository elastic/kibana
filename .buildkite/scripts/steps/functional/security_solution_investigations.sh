#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-security-solution-chrome
export CLI_NUMBER=${CLI_NUMBER:-$((BUILDKITE_PARALLEL_JOB+1))}
export CLI_COUNT=${CLI_COUNT:-$BUILDKITE_PARALLEL_JOB_COUNT}

Xvfb :99 -screen 0 1600x1200x24 &

export DISPLAY=:99

echo "--- Security Solution tests (Chrome)"

yarn --cwd x-pack/plugins/security_solution cypress:investigations:run
