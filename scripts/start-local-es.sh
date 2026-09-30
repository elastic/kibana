#!/bin/bash
# Start Elasticsearch for local EA-facelift dev on :9200.
# Isolated from the graph stack (kibana-graph → :9201).
# Fresh data dir whenever the previous trial license expires.
export PATH="/Users/iryna/.local/share/fnm/node-versions/v24.18.0/installation/bin:/usr/bin:/bin:/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")/.."
exec node scripts/es snapshot --license trial \
  -E "path.data=$(pwd)/.es/persistent-data-ea-facelift-2026-09"
