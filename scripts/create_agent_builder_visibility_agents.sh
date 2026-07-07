#!/usr/bin/env bash
# Creates 3 Agent Builder agents with different visibility: shared, public, private.
# Requires Kibana running and Agent Builder experimental features enabled
# (agentBuilder:experimentalFeatures in Advanced Settings) for visibility to apply.
#
# Usage: ./scripts/create_agent_builder_visibility_agents.sh

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
# shellcheck source=./kibana_api_common.sh
source "$REPO_ROOT/scripts/kibana_api_common.sh"

API="${KIBANA_URL}/api/agent_builder/agents"

base_payload() {
  local id="$1"
  local name="$2"
  local visibility="$3"
  cat <<EOF
{
  "id": "${id}",
  "name": "${name}",
  "description": "Agent with ${visibility} visibility (created by script).",
  "visibility": "${visibility}",
  "configuration": {
    "tools": [{ "tool_ids": ["*"] }]
  }
}
EOF
}

create_agent() {
  local id="$1"
  local name="$2"
  local visibility="$3"
  local payload
  payload="$(base_payload "$id" "$name" "$visibility")"
  echo "Creating agent: $name (visibility: $visibility) ..."
  response="$(kibana_curl -s -w "\n%{http_code}" -X POST "$API" \
    -H "Content-Type: application/json" \
    -d "$payload")"
  http_code="$(echo "$response" | tail -n1)"
  body="$(echo "$response" | sed '$d')"
  if [[ "$http_code" != "200" ]]; then
    echo "Failed to create $name (HTTP $http_code): $body" >&2
    return 1
  fi
  echo "Created: $name (id: $id, visibility: $visibility)"
}

create_agent "agent-visibility-shared" "Agent (Shared)" "shared"
create_agent "agent-visibility-public" "Agent (Public)" "public"
create_agent "agent-visibility-private" "Agent (Private)" "private"

echo "Done. All 3 agents created."
