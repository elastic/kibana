#!/bin/bash
# save as: create_test_workflows.sh

KIBANA_URL="http://localhost:5601/xth"
COUNT=${1:-100}  # Default 100, pass argument for more

# ============================================
# PASTE YOUR API KEY HERE (the "encoded" value)
# ============================================
API_KEY="M0Y1Smpwc0I3ZE5BbHJOTlo0bHM6eHo5azFTUGJOVDQ5ejU2TzJ6bzAzUQ=="

echo "Creating $COUNT scheduled workflows..."
echo "Using Kibana at: $KIBANA_URL"
echo ""

# Test connection first
echo "Testing connection..."
RESPONSE=$(curl -sL -w "%{http_code}" -o /tmp/kibana_test.json \
  -H "Authorization: ApiKey $API_KEY" \
  "$KIBANA_URL/api/status" \
  -H "kbn-xsrf: true" 2>&1)

if [ "$RESPONSE" != "200" ]; then
  echo "ERROR: Cannot connect to Kibana (HTTP $RESPONSE)"
  echo "Response: $(cat /tmp/kibana_test.json 2>/dev/null | head -5)"
  echo ""
  echo "Please check:"
  echo "  1. Kibana is running on $KIBANA_URL"
  echo "  2. API_KEY is set correctly in the script"
  exit 1
fi

echo "Connection OK!"
echo ""

for i in $(seq 1 $COUNT); do
  # Create YAML content for the workflow (matching working format)
  YAML_CONTENT="name: memory-test-workflow-$i
enabled: true
description: Memory test workflow running every 10s
triggers:
  - type: scheduled
    with:
      every: 10s
steps:
  - name: log-test
    type: console
    with:
      message: \"Memory test execution $i\""

  # Escape the YAML for JSON
  ESCAPED_YAML=$(echo "$YAML_CONTENT" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')
  
  RESPONSE=$(curl -sL -w "%{http_code}" -o /tmp/workflow_response.json \
    -H "Authorization: ApiKey $API_KEY" \
    -X POST "$KIBANA_URL/api/workflows" \
    -H "Content-Type: application/json" \
    -H "kbn-xsrf: true" \
    -H "x-elastic-internal-origin: kibana" \
    -d "{\"yaml\": $ESCAPED_YAML}" 2>&1)
  
  if [ "$RESPONSE" != "200" ] && [ "$RESPONSE" != "201" ]; then
    echo "ERROR creating workflow $i (HTTP $RESPONSE)"
    cat /tmp/workflow_response.json 2>/dev/null | head -3
    # Continue anyway
  fi
  
  if [ $((i % 50)) -eq 0 ]; then
    echo "Created $i workflows..."
  fi
done

echo ""
echo "Done! Attempted to create $COUNT workflows"
echo ""
echo "To monitor memory, run:"
echo "  watch -n 2 'curl -sL -H \"Authorization: ApiKey $API_KEY\" $KIBANA_URL/api/status | jq .metrics.process.memory'"
