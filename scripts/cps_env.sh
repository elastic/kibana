#!/bin/bash

# =============================================================================
# CPS (Cross-Project Search) Local Environment Setup
# =============================================================================
#
# Starts Elasticsearch and Kibana with CPS enabled (loopback-CPS setup where
# one project is linked to itself via a different alias).
#
# Usage:
#   scripts/cps_env.sh [--project-type <type>]
#
# Options:
#   --project-type  Serverless project type (default: observability)
#
# CPS is enabled for Dashboard, Discover, Vega, Lens, and Maps.
# After startup, verify from Dev Tools: GET /_project/tags
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
      sed -n '3,16p' "${BASH_SOURCE[0]}"
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

# --- Main --------------------------------------------------------------------

cd "$REPO_DIR"

echo "=== CPS Local Environment Setup ==="
echo "Project type: $PROJECT_TYPE"
echo ""

# Step 1: Start Elasticsearch in the background
echo "--- Step 1: Starting Elasticsearch ---"
yarn es serverless --projectType "$PROJECT_TYPE" --uiam \
  -E serverless.cross_project.enabled=true \
  -E remote_cluster_server.enabled=true &
ES_PID=$!

# Step 2: Wait for ES to be fully ready
wait_for_docker_container
wait_for_es

# Step 3: Configure the loopback-linked project
echo ""
echo "--- Step 2: Linking projects ---"
configure_linked_project

echo ""
echo "--- Step 3: Starting Kibana ---"
echo ""
echo "  Elasticsearch: $ES_URL"
echo "  Kibana:        http://localhost:5601"
echo ""
echo "  Verify from Dev Tools: GET /_project/tags"
echo "  Press Ctrl+C to stop all services."
echo ""

# Step 4: Start Kibana in the foreground
yarn start --serverless="$SERVERLESS_FLAG" --uiam --cps.cpsEnabled=true
