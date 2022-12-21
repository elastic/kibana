#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Building kbn-pm distributable"
yarn kbn run build -i @kbn/pm

check_for_changed_files 'yarn kbn run build -i @kbn/pm' true
