#!/usr/bin/env bash

set -euo pipefail

echo '--- Renovate: validation'
.buildkite/scripts/bootstrap.sh
.buildkite/scripts/steps/checks/renovate.sh
.buildkite/scripts/steps/checks/dependencies_missing_owner.sh
