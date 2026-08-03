#!/usr/bin/env bash
set -euo pipefail

# Creates a connector instance in Kibana via the Actions API.
# Reads credentials from a file, deletes the file immediately, then makes the API call.
# This ensures credentials never appear in the calling process's output.
#
# When agentBuilder:experimentalFeatures is true, creating a connector automatically
# indexes it into the Semantic Metadata Layer (SML), making its sub-actions
# discoverable by AI agents.

CONNECTOR_TYPE=""
CONNECTOR_NAME=""
CREDENTIALS_FILE=""
CONFIG_JSON="{}"
AUTH_TYPE=""
HEADER_FIELD=""

usage() {
  echo "Usage: $0 --type <connector-type-id> --name <display-name> --credentials-file <path> [--auth-type <type>] [--header-field <name>] [--config <json>] [--kibana-url <url>]"
  echo ""
  echo "Options:"
  echo "  --type              Connector type ID (e.g., '.github', '.slack2', '.notion')"
  echo "  --name              Display name for the connector"
  echo "  --credentials-file  Path to a file containing the credential string"
  echo "                      (bearer token, API key, or user:password)"
  echo "                      The file is deleted immediately after reading."
  echo "  --auth-type         Auth type: 'bearer', 'api_key_header', or 'basic'"
  echo "                      If omitted, auto-detects: colon in credential → basic, else bearer."
  echo "  --header-field      Header field name for api_key_header auth (e.g., 'X-Api-Key', 'Key')."
  echo "                      Required when --auth-type is 'api_key_header'. Check the connector"
  echo "                      spec's auth.types[].defaults.headerField for the correct value."
  echo "  --config            Optional JSON object for connector config (e.g., '{\"serverUrl\":\"...\"}')"
  echo "  --kibana-url        Kibana base URL (overrides auto-detection)"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type) CONNECTOR_TYPE="$2"; shift 2 ;;
    --name) CONNECTOR_NAME="$2"; shift 2 ;;
    --credentials-file) CREDENTIALS_FILE="$2"; shift 2 ;;
    --auth-type) AUTH_TYPE="$2"; shift 2 ;;
    --header-field) HEADER_FIELD="$2"; shift 2 ;;
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

# Auto-detect auth type if not explicitly provided
if [[ -z "$AUTH_TYPE" ]]; then
  if [[ "$CREDENTIALS" == *:* ]]; then
    AUTH_TYPE="basic"
  else
    AUTH_TYPE="bearer"
  fi
fi

# Validate api_key_header has a header field
if [[ "$AUTH_TYPE" == "api_key_header" && -z "$HEADER_FIELD" ]]; then
  echo "Error: --header-field is required when --auth-type is 'api_key_header'." >&2
  echo "Check the connector spec's auth.types[].defaults.headerField for the correct value." >&2
  exit 1
fi

# Build JSON payload using jq if available
if command -v jq &>/dev/null; then
  # Build the secrets object. All secrets require an 'authType' discriminator field.
  case "$AUTH_TYPE" in
    bearer)
      SECRETS="$(jq -n --arg token "$CREDENTIALS" '{authType: "bearer", token: $token}')"
      ;;
    api_key_header)
      SECRETS="$(jq -n --arg field "$HEADER_FIELD" --arg value "$CREDENTIALS" \
        '{authType: "api_key_header"} + {($field): $value}')"
      ;;
    basic)
      USER_PART="${CREDENTIALS%%:*}"
      PASS_PART="${CREDENTIALS#*:}"
      SECRETS="$(jq -n --arg u "$USER_PART" --arg p "$PASS_PART" \
        '{authType: "basic", username: $u, password: $p}')"
      ;;
    *)
      echo "Error: Unknown auth type '$AUTH_TYPE'. Use 'bearer', 'api_key_header', or 'basic'." >&2
      exit 1
      ;;
  esac

  PAYLOAD="$(jq -n \
    --arg type "$CONNECTOR_TYPE" \
    --arg name "$CONNECTOR_NAME" \
    --argjson config "$CONFIG_JSON" \
    --argjson secrets "$SECRETS" \
    '{connector_type_id: $type, name: $name, config: $config, secrets: $secrets}')"
else
  # Manual JSON construction (no jq)
  ESC_TYPE="${CONNECTOR_TYPE//\"/\\\"}"
  ESC_NAME="${CONNECTOR_NAME//\"/\\\"}"
  ESC_CREDS="${CREDENTIALS//\"/\\\"}"
  case "$AUTH_TYPE" in
    bearer)
      SECRETS_JSON="{\"authType\":\"bearer\",\"token\":\"${ESC_CREDS}\"}"
      ;;
    api_key_header)
      ESC_FIELD="${HEADER_FIELD//\"/\\\"}"
      SECRETS_JSON="{\"authType\":\"api_key_header\",\"${ESC_FIELD}\":\"${ESC_CREDS}\"}"
      ;;
    basic)
      ESC_USER="${CREDENTIALS%%:*}"
      ESC_PASS="${CREDENTIALS#*:}"
      ESC_USER="${ESC_USER//\"/\\\"}"
      ESC_PASS="${ESC_PASS//\"/\\\"}"
      SECRETS_JSON="{\"authType\":\"basic\",\"username\":\"${ESC_USER}\",\"password\":\"${ESC_PASS}\"}"
      ;;
    *)
      echo "Error: Unknown auth type '$AUTH_TYPE'. Use 'bearer', 'api_key_header', or 'basic'." >&2
      exit 1
      ;;
  esac
  PAYLOAD="{\"connector_type_id\":\"${ESC_TYPE}\",\"name\":\"${ESC_NAME}\",\"config\":${CONFIG_JSON},\"secrets\":${SECRETS_JSON}}"
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
    echo "The connector's sub-actions are now discoverable by AI agents via the SML."
    echo "Use list_connectors.sh to verify."
  fi
else
  echo "Error creating connector (HTTP $HTTP_CODE):" >&2
  echo "$BODY" >&2
  exit 1
fi
