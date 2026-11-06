#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Server Import Graph
node scripts/check_server_import_graph
