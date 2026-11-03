#!/bin/bash
# Start Kibana for the EA timeline prototype (run after ES 9204 is healthy).
# Listens on 5617 (http://localhost:5617/ea-timeline) so the EA-facelift (5601),
# Graph (5605), AI brief (5609) and Risk scores (5613) Kibanas are untouched.
# Base path and dev-server port (5619) live in config/kibana.dev.yml.
export PATH="/Users/iryna/.local/share/fnm/node-versions/v24.18.0/installation/bin:/usr/bin:/bin:/opt/homebrew/bin:$PATH"
export NODE_OPTIONS="--max_old_space_size=8192"
cd "$(dirname "$0")/.."
exec node scripts/kibana --dev \
  --port 5617 \
  --elasticsearch http://localhost:9204 \
  --mockIdpPlugin.enabled=false
