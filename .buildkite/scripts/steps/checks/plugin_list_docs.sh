#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true
export BUILD_TS_REFS_DISABLE=true

.buildkite/scripts/bootstrap.sh

echo "--- Building plugin list docs"
node scripts/build_plugin_list_docs

verify_no_git_changes 'node scripts/build_plugin_list_docs'
