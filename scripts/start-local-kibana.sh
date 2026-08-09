#!/bin/bash
# Start Kibana for local dev (run after Elasticsearch is healthy).
export PATH="/Users/iryna/.local/share/fnm/node-versions/v24.18.0/installation/bin:/usr/bin:/bin:/opt/homebrew/bin:$PATH"
export NODE_OPTIONS="--max_old_space_size=8192"
export REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"
exec node scripts/kibana --dev --mockIdpPlugin.enabled=false
