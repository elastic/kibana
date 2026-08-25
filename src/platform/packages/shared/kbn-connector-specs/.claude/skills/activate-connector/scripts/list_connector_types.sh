#!/usr/bin/env bash
set -euo pipefail

# Lists all registered connector types from Kibana's Actions API.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

RESPONSE="$(kibana_curl -w "\n%{http_code}" \
  "$KIBANA_URL/api/actions/connector_types")"

HTTP_CODE="$(echo "$RESPONSE" | tail -n1)"
BODY="$(echo "$RESPONSE" | sed '$d')"

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  if command -v jq &>/dev/null; then
    echo "Available connector types:"
    echo ""
    echo "$BODY" | jq -r '.[] | "  \(.id)\t\(.name)\t\(.enabled // true)"' | column -t -s $'\t'
    echo ""
    echo "Columns: ID, Name, Enabled"
  else
    echo "Available connector types (raw JSON):"
    echo "$BODY"
  fi
else
  echo "Error fetching connector types (HTTP $HTTP_CODE):" >&2
  echo "$BODY" >&2
  exit 1
fi
