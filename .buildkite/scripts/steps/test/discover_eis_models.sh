#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

echo "--- Discovering EIS models"

if [ -n "${KIBANA_EIS_CCM_API_KEY:-}" ]; then
  node scripts/discover_eis_models.js
  echo "✅ Discovery complete"

  if [ -f "target/eis_models.json" ]; then
    echo "Discovered models:"
    cat target/eis_models.json
  fi
else
  echo "⚠️ KIBANA_EIS_CCM_API_KEY not set - EIS tests will be skipped"
  mkdir -p target
  echo '{"models":[]}' > target/eis_models.json
fi
