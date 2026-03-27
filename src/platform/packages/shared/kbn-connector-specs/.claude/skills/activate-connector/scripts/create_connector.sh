#!/usr/bin/env bash
set -euo pipefail

# Creates a connector instance in Kibana via the Actions API.
# Reads credentials from a file, deletes the file immediately, then makes the API call.
# This ensures credentials never appear in the calling process's output.
#
# When agentBuilder:connectorsEnabled is true, creating a connector automatically:
# - Creates workflows from the connector spec's agentBuilderWorkflows
# - Creates Agent Builder tools for workflows tagged 'agent-builder-tool'

CONNECTOR_TYPE=""
CONNECTOR_NAME=""
CREDENTIALS_FILE=""
CONFIG_JSON="{}"

usage() {
  echo "Usage: $0 --type <connector-type-id> --name <display-name> --credentials-file <path> [--config <json>] [--kibana-url <url>]"
  echo ""
  echo "Options:"
  echo "  --type              Connector type ID (e.g., '.github', '.slack2', '.notion')"
  echo "  --name              Display name for the connector"
  echo "  --credentials-file  Path to a file containing the credential string"
  echo "                      (bearer token, API key, or user:password)"
  echo "                      The file is deleted immediately after reading."
  echo "  --config            Optional JSON object for connector config (e.g., '{\"serverUrl\":\"...\"}')"
  echo "  --kibana-url        Kibana base URL (overrides auto-detection)"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type) CONNECTOR_TYPE="$2"; shift 2 ;;
    --name) CONNECTOR_NAME="$2"; shift 2 ;;
    --credentials-file) CREDENTIALS_FILE="$2"; shift 2 ;;
    --config) CONFIG_JSON="$2"; shift 2 ;;
    --kibana-url) export KIBANA_URL="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

if [[ -z "$CONNECTOR_TYPE" || -z "$CONNECTOR_NAME" || -z "$CREDENTIALS_FILE" ]]; then
  echo "Error: --type, --name, and --credentials-file are all required."
  usage
fi

if [[ ! -f "$CREDENTIALS_FILE" ]]; then
  echo "Error: Credentials file not found: $CREDENTIALS_FILE"
  exit 1
fi

# Source common.sh for Kibana auto-detection (after parsing --kibana-url)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Read credentials and immediately delete the file
CREDENTIALS="$(cat "$CREDENTIALS_FILE")"
rm -f "$CREDENTIALS_FILE"

# Trim whitespace/newlines from credentials
CREDENTIALS="$(echo -n "$CREDENTIALS" | tr -d '\n\r')"

if [[ -z "$CREDENTIALS" ]]; then
  echo "Error: Credentials file was empty."
  exit 1
fi

# Build JSON payload using jq if available
if command -v jq &>/dev/null; then
  # Determine the secrets shape based on common auth patterns.
  # For bearer tokens, the secret key is 'token'.
  # For API keys, the secret key is 'apiKey'.
  # For basic auth (user:password), split into 'user' and 'password'.
  if [[ "$CREDENTIALS" == *:* ]]; then
    USER_PART="${CREDENTIALS%%:*}"
    PASS_PART="${CREDENTIALS#*:}"
    SECRETS="$(jq -n --arg u "$USER_PART" --arg p "$PASS_PART" '{user: $u, password: $p}')"
  else
    # Default: treat as a bearer token
    SECRETS="$(jq -n --arg token "$CREDENTIALS" '{token: $token}')"
  fi

  PAYLOAD="$(jq -n \
    --arg type "$CONNECTOR_TYPE" \
    --arg name "$CONNECTOR_NAME" \
    --argjson config "$CONFIG_JSON" \
    --argjson secrets "$SECRETS" \
    '{connector_type_id: $type, name: $name, config: $config, secrets: $secrets}')"
else
  # Manual JSON construction — bearer token only
  ESC_TYPE="${CONNECTOR_TYPE//\"/\\\"}"
  ESC_NAME="${CONNECTOR_NAME//\"/\\\"}"
  ESC_CREDS="${CREDENTIALS//\"/\\\"}"
  PAYLOAD="{\"connector_type_id\":\"${ESC_TYPE}\",\"name\":\"${ESC_NAME}\",\"config\":${CONFIG_JSON},\"secrets\":{\"token\":\"${ESC_CREDS}\"}}"
fi

# Clear the credentials variable
CREDENTIALS=""

# Make the API call
RESPONSE="$(kibana_curl -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  "$KIBANA_URL/api/actions/connector" \
  -d "$PAYLOAD")"

# Clear the payload
PAYLOAD=""

# Extract HTTP status code (last line) and body (everything else)
HTTP_CODE="$(echo "$RESPONSE" | tail -n1)"
BODY="$(echo "$RESPONSE" | sed '$d')"

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  echo "Connector created successfully!"
  echo "$BODY"
  if command -v jq &>/dev/null; then
    CONNECTOR_ID="$(echo "$BODY" | jq -r '.id')"
    echo ""
    echo "Connector ID: $CONNECTOR_ID"
    echo ""
    echo "If this connector has agentBuilderWorkflows, workflows and tools were auto-created."
    echo "Use list_connectors.sh to verify."
  fi
else
  echo "Error creating connector (HTTP $HTTP_CODE):" >&2
  echo "$BODY" >&2
  exit 1
fi
