#!/usr/bin/env bash
set -euo pipefail

# Lists all existing connector instances from Kibana's Actions API.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

RESPONSE="$(kibana_curl -w "\n%{http_code}" \
  "$KIBANA_URL/api/actions/connectors")"

HTTP_CODE="$(echo "$RESPONSE" | tail -n1)"
BODY="$(echo "$RESPONSE" | sed '$d')"

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  if command -v jq &>/dev/null; then
    COUNT="$(echo "$BODY" | jq 'length')"
    echo "Existing connectors ($COUNT total):"
    echo ""
    if [[ "$COUNT" -gt 0 ]]; then
      echo "$BODY" | jq -r '.[] | "  \(.id)\t\(.name)\t\(.connector_type_id)\t\(.is_preconfigured // false)"' | column -t -s $'\t'
      echo ""
      echo "Columns: ID, Name, Type, Preconfigured"
    else
      echo "  (none)"
    fi
  else
    echo "Existing connectors (raw JSON):"
    echo "$BODY"
  fi
else
  echo "Error fetching connectors (HTTP $HTTP_CODE):" >&2
  echo "$BODY" >&2
  exit 1
fi
