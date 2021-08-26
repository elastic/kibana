#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo "--- Building plugin list docs"
node scripts/build_plugin_list_docs

verify_no_git_changes 'node scripts/build_plugin_list_docs'
