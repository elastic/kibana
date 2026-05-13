#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

echo "--- Discovering EIS models"

if [ -n "${KIBANA_EIS_CCM_API_KEY:-}" ]; then
  MAX_ATTEMPTS=2
  for attempt in $(seq 1 $MAX_ATTEMPTS); do
    echo "--- Discovery attempt $attempt/$MAX_ATTEMPTS"

    if node scripts/discover_eis_models.js; then
      echo "✅ Discovery complete"
      if [ -f "target/eis_models.json" ]; then
        echo "Discovered models:"
        cat target/eis_models.json
      fi
      break
    fi

    if [ "$attempt" -eq "$MAX_ATTEMPTS" ]; then
      echo "❌ Discovery failed after $MAX_ATTEMPTS attempts"
      exit 1
    fi

    echo "⚠️ Discovery failed, retrying in 10s..."
    sleep 10
  done
else
  echo "❌ KIBANA_EIS_CCM_API_KEY not set - failing step"
  exit 1
fi
