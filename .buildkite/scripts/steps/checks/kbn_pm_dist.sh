#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true
export BUILD_TS_REFS_DISABLE=true

.buildkite/scripts/bootstrap.sh

echo "--- Building kbn-pm distributable"
yarn kbn run build -i @kbn/pm

verify_no_git_changes 'yarn kbn run build -i @kbn/pm'
