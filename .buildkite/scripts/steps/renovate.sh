#!/usr/bin/env bash

set -euo pipefail

echo '--- Renovate: validation'
.buildkite/scripts/steps/checks/renovate.sh
