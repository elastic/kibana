#!/bin/bash

# =============================================================================
# CPS (Cross-Project Search) Local Environment Setup
# =============================================================================
#
# Starts Elasticsearch and Kibana with CPS enabled, then configures a
# loopback-linked project so you can query data across multiple projects.
#
# Usage:
#   scripts/cps_env.sh [--project-type <type>]
#
# Options:
#   --project-type  Serverless project type (default: observability)
#
# The loopback-CPS setup links a project to itself via a different alias,
# so queries across multiple projects will return document duplicates.
#
# CPS is enabled for Dashboard, Discover, Vega, Lens, and Maps.
#
# After startup, verify from Dev Tools (uses proper UIAM credentials):
#   GET /_project/tags
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PROJECT_TYPE="observability"
SERVERLESS_FLAG="oblt"
CONTAINER_NAME="es01"
SETTINGS_FILE="./config/operator/settings.json"
ES_URL="https://localhost:9200"
ES_CREDENTIALS="elastic_serverless:changeme"
ES_READY_TIMEOUT=120

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --project-type)
      PROJECT_TYPE="$2"
      case "$PROJECT_TYPE" in
        observability) SERVERLESS_FLAG="oblt" ;;
        security) SERVERLESS_FLAG="security" ;;
        elasticsearch) SERVERLESS_FLAG="es" ;;
        *) echo "Error: Unknown project type '$PROJECT_TYPE'. Use: observability, security, elasticsearch"; exit 1 ;;
      esac
      shift 2
      ;;
    -h|--help)
      head -25 "${BASH_SOURCE[0]}" | tail -19
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# --- Helpers -----------------------------------------------------------------

cleanup() {
  echo ""
  echo "Shutting down…"
  if [ -n "$ES_PID" ]; then
    kill "$ES_PID" 2>/dev/null || true
    wait "$ES_PID" 2>/dev/null || true
  fi
  if [ -n "$KIBANA_PID" ]; then
    kill "$KIBANA_PID" 2>/dev/null || true
    wait "$KIBANA_PID" 2>/dev/null || true
  fi
  echo "Done."
}

trap cleanup EXIT INT TERM

wait_for_es() {
  echo "Waiting for Elasticsearch to be ready (timeout: ${ES_READY_TIMEOUT}s)…"
  local elapsed=0
  while [ $elapsed -lt $ES_READY_TIMEOUT ]; do
    if curl -sku "$ES_CREDENTIALS" "$ES_URL/_cluster/health" 2>/dev/null | grep -q '"status"'; then
      echo "Elasticsearch is ready."
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  echo "Error: Elasticsearch did not become ready within ${ES_READY_TIMEOUT}s."
  exit 1
}

wait_for_docker_container() {
  echo "Waiting for Docker container '${CONTAINER_NAME}'…"
  local elapsed=0
  while [ $elapsed -lt $ES_READY_TIMEOUT ]; do
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${CONTAINER_NAME}$"; then
      echo "Container '${CONTAINER_NAME}' is running."
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  echo "Error: Container '${CONTAINER_NAME}' did not start within ${ES_READY_TIMEOUT}s."
  exit 1
}

configure_linked_project() {
  local linked_config='{
    "projects": {
      "badce1234567890": {
        "alias": "linked_local_project",
        "type": "'"$PROJECT_TYPE"'",
        "endpoint": "0.0.0.0:9400",
        "server_name": "linked-local-project",
        "tags": {
          "_alias": "linked_local_project",
          "_id": "badce1234567890",
          "_organization": "org1234567890",
          "_type": "'"$PROJECT_TYPE"'",
          "env": "local",
          "key1": "value1"
        }
      }
    }
  }'

  if ! command -v jq &> /dev/null; then
    echo "Error: 'jq' is required (brew install jq)"
    exit 1
  fi

  echo "Configuring linked project in ${CONTAINER_NAME}…"

  local current_json
  current_json=$(docker exec "$CONTAINER_NAME" cat "$SETTINGS_FILE")

  if [ -z "$current_json" ]; then
    echo "Error: Could not read ${SETTINGS_FILE} (or it is empty). Aborting."
    exit 1
  fi

  local new_json
  new_json=$(echo "$current_json" | jq --argjson new "$linked_config" \
      '.metadata.version |= (tonumber + 1 | tostring) | .state.linked = $new')

  if [ $? -eq 0 ] && [ -n "$new_json" ]; then
    echo "$new_json" | docker exec -i "$CONTAINER_NAME" tee "$SETTINGS_FILE" > /dev/null
    echo "Linked project configured successfully."
  else
    echo "Error: JSON merging failed. File was NOT modified."
    exit 1
  fi
}

verify_linked_project() {
  echo "Verifying linked project…"
  local tags
  tags=$(curl -sku "$ES_CREDENTIALS" -X GET "$ES_URL/_project/tags?pretty" 2>/dev/null)
  if echo "$tags" | grep -q "linked_local_project"; then
    echo "Linked project is visible."
  else
    echo "Warning: Linked project not yet visible in tags. It may take a moment."
    echo "Check manually from Dev Tools: GET /_project/tags"
  fi
}

# --- Main --------------------------------------------------------------------

cd "$REPO_DIR"

echo "=== CPS Local Environment Setup ==="
echo "Project type: $PROJECT_TYPE"
echo ""

# 1. Start Elasticsearch in the background
echo "--- Starting Elasticsearch (serverless, UIAM, CPS) ---"
yarn es serverless --projectType "$PROJECT_TYPE" --uiam \
  -E serverless.cross_project.enabled=true \
  -E remote_cluster_server.enabled=true &
ES_PID=$!

# 2. Wait for the Docker container and ES to be ready
wait_for_docker_container
wait_for_es

# 3. Configure the linked project
configure_linked_project
verify_linked_project

echo ""
echo "--- Starting Kibana (serverless, UIAM, CPS) ---"

# 4. Start Kibana in the foreground
yarn start --serverless="$SERVERLESS_FLAG" --uiam --cps.cpsEnabled=true &
KIBANA_PID=$!

echo ""
echo "=== CPS environment is starting ==="
echo "  Elasticsearch: $ES_URL"
echo "  Kibana:        http://localhost:5601"
echo ""
echo "Verify from Dev Tools: GET /_project/tags"
echo "Press Ctrl+C to stop all services."
echo ""

# Wait for either process to exit
wait -n "$ES_PID" "$KIBANA_PID" 2>/dev/null || true
