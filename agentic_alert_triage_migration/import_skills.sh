#!/usr/bin/env bash
# Import agentic-alert-triage skills into Kibana Agent Builder.
# Usage: bash import_skills.sh [KIBANA_URL] [USER:PASS]

set -euo pipefail

KIBANA_URL="${1:-http://localhost:5601}"
AUTH="${2:-elastic:changeme}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="$SCRIPT_DIR/skill_definitions"
RESP_FILE=$(mktemp)
trap 'rm -f "$RESP_FILE"' EXIT

echo "Importing skills into $KIBANA_URL"

SUCCESS=0
FAIL=0

for f in "$SKILLS_DIR"/*.json; do
  SKILL_ID=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['id'])" "$f")
  echo -n "  $SKILL_ID ... "

  HTTP_CODE=$(curl -s -o "$RESP_FILE" -w "%{http_code}" \
    -X POST "$KIBANA_URL/api/agent_builder/skills" \
    -H "kbn-xsrf: true" \
    -H "Content-Type: application/json" \
    -H "elastic-api-version: 2023-10-31" \
    -u "$AUTH" \
    -d @"$f" 2>/dev/null)

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "OK ($HTTP_CODE)"
    SUCCESS=$((SUCCESS + 1))
  elif [ "$HTTP_CODE" = "409" ]; then
    echo "ALREADY EXISTS (409), updating..."
    HTTP_CODE=$(curl -s -o "$RESP_FILE" -w "%{http_code}" \
      -X PUT "$KIBANA_URL/api/agent_builder/skills/$SKILL_ID" \
      -H "kbn-xsrf: true" \
      -H "Content-Type: application/json" \
      -H "elastic-api-version: 2023-10-31" \
      -u "$AUTH" \
      -d @"$f" 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
      echo "    Updated OK"
      SUCCESS=$((SUCCESS + 1))
    else
      echo "    Update FAILED ($HTTP_CODE)"
      cat "$RESP_FILE" 2>/dev/null; echo
      FAIL=$((FAIL + 1))
    fi
  else
    echo "FAILED ($HTTP_CODE)"
    cat "$RESP_FILE" 2>/dev/null; echo
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "Done: $SUCCESS succeeded, $FAIL failed (total $(ls "$SKILLS_DIR"/*.json | wc -l | tr -d ' ') skills)"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
