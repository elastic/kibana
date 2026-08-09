#!/bin/bash
# Start Elasticsearch for local dev.
# Uses a fresh data dir so a trial license can start (old persistent-data trial expired).
export PATH="/Users/iryna/.local/share/fnm/node-versions/v24.18.0/installation/bin:/usr/bin:/bin:/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")/.."
exec node scripts/es snapshot --license trial \
  -E "path.data=$(pwd)/.es/persistent-data-ea-facelift"
