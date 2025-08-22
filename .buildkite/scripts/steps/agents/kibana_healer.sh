#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Running Kibana Healer"

echo "Configuring Gemini CLI"
GEMINI_API_KEY="$(vault_get kibana-healer gemini)"
export GEMINI_API_KEY

exit 0
