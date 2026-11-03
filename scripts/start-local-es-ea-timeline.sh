#!/bin/bash
# Start Elasticsearch for the EA timeline prototype (worktree: kibana-ea-timeline).
# Runs on ports 9204/9304 with its own data dir so it never collides with
# EA-facelift (9200), Graph (9201), AI brief (9202) or Risk scores (9203).
# Delete .es/ea-timeline-data when the trial license expires.
export PATH="/Users/iryna/.local/share/fnm/node-versions/v24.18.0/installation/bin:/usr/bin:/bin:/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")/.."
# kbn-es can ignore --port and fall back to the next free port, so pin it with -E.
exec node scripts/es snapshot --license trial \
  -E http.port=9204 \
  -E transport.port=9304 \
  -E "path.data=$(pwd)/.es/ea-timeline-data"
