#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Building kbn-pm distributable"
yarn kbn run build -i @kbn/pm

verify_no_git_changes 'yarn kbn run build -i @kbn/pm'
