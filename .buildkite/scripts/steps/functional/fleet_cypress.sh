#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-fleet-cypress

echo "--- Fleet Cypress tests"

cd x-pack/plugins/fleet
yarn --cwd x-pack/plugins/fleet cypress:run
