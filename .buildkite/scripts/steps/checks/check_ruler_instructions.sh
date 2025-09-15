#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Check Ruler for outdated Github CoPilot instructions"
yarn ruler apply --nested --no-gitignore

check_for_changed_files 'yarn ruler apply --nested' true
