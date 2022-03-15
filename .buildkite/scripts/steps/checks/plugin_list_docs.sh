#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Building plugin list docs"
node scripts/build_plugin_list_docs

check_for_changed_files 'node scripts/build_plugin_list_docs' true
