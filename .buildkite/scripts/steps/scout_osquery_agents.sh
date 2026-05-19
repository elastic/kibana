#!/usr/bin/env bash
set -euo pipefail

# Tier-B: osquery agent-dependent Scout UI tests.
# Requires Docker (Fleet Server + Elastic Agent containers).
# Owner: security-defend-workflows — NOT appex-qa.
#
# Triggers:
#   - Nightly cron (after 3 consecutive manual-trigger greens)
#   - Path-based: changes to osquery/server/{lib,handlers,routes}/**
#   - On-demand PR comment: /ci-osquery-agents

echo "--- Bootstrap Kibana"
node scripts/preinstall_check
yarn kbn bootstrap --prefer-offline

echo "--- Run osquery Tier-B Scout UI tests"
node scripts/scout run-tests \
  --stateful \
  --config "x-pack/platform/plugins/shared/osquery/test/scout_osquery/ui/real_agent.playwright.config.ts"
