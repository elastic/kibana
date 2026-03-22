#!/bin/bash
#
# Endpoint Compliance Demo - Cleanup Script
#
# This script cleans up the demo environment and resets to pre-demo state.
# Run this after your demo.
#
# Usage: ./demo_cleanup.sh
#

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   ENDPOINT COMPLIANCE MONITORING - DEMO CLEANUP                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
ES_URL="${ES_URL:-http://localhost:9200}"
KIBANA_USER="${KIBANA_USER:-elastic}"
KIBANA_PASS="${KIBANA_PASS:-changeme}"

# Step 1: Disable feature flag
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1/4: Disabling compliance feature flag..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -sf -X POST "$KIBANA_URL/api/kibana/settings/xpack.osquery.enableExperimental" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -u "$KIBANA_USER:$KIBANA_PASS" \
  -d '{"value": []}' > /dev/null

echo -e "${GREEN}✅ Feature flag disabled${NC}"

# Step 2: Delete sample data
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2/4: Deleting sample compliance data..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Delete sample findings
curl -sf -X POST "$ES_URL/compliance-findings-*/_delete_by_query" \
  -H "Content-Type: application/json" \
  -u "$KIBANA_USER:$KIBANA_PASS" \
  -d '{
    "query": {
      "term": {
        "tags": "demo-sample-data"
      }
    }
  }' > /dev/null

echo -e "${GREEN}✅ Sample findings deleted${NC}"

# Delete sample rules (keep prebuilt)
curl -sf -X POST "$ES_URL/.kibana*/_delete_by_query?refresh=true" \
  -H "Content-Type: application/json" \
  -u "$KIBANA_USER:$KIBANA_PASS" \
  -d '{
    "query": {
      "bool": {
        "must": [
          {"term": {"type": "osquery-compliance-rule"}},
          {"term": {"osquery-compliance-rule.tags": "demo-sample-data"}}
        ]
      }
    }
  }' > /dev/null

echo -e "${GREEN}✅ Sample rules deleted${NC}"

# Delete sample exceptions
curl -sf -X POST "$ES_URL/.kibana*/_delete_by_query?refresh=true" \
  -H "Content-Type: application/json" \
  -u "$KIBANA_USER:$KIBANA_PASS" \
  -d '{
    "query": {
      "bool": {
        "must": [
          {"term": {"type": "osquery-compliance-exception"}},
          {"prefix": {"osquery-compliance-exception.name": "Demo:"}}
        ]
      }
    }
  }' > /dev/null

echo -e "${GREEN}✅ Sample exceptions deleted${NC}"

# Step 3: Stop transform (optional)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3/4: Stopping compliance transform..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "Stop transform? (keeps data but stops processing) [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  curl -sf -X POST "$ES_URL/_transform/compliance-findings-latest/_stop" \
    -u "$KIBANA_USER:$KIBANA_PASS" > /dev/null 2>&1 || true

  echo -e "${GREEN}✅ Transform stopped${NC}"
else
  echo -e "${YELLOW}⏭️  Transform left running${NC}"
fi

# Step 4: Stop Kibana (optional)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4/4: Stopping Kibana..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "Stop Kibana? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  pkill -f "node.*kibana" || echo "Kibana not running or already stopped"
  echo -e "${GREEN}✅ Kibana stopped${NC}"
else
  echo -e "${YELLOW}⏭️  Kibana left running${NC}"
fi

# Final summary
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   DEMO CLEANUP COMPLETE                                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ Cleanup Summary:${NC}"
echo "   - Feature flag disabled"
echo "   - Sample data deleted"
echo "   - Transform state: $([ \"$REPLY\" = \"y\" ] && echo \"stopped\" || echo \"running\")"
echo "   - Kibana: $(ps aux | grep -c \"node.*kibana\" | grep -v grep > 0 && echo \"running\" || echo \"stopped\")"
echo ""
echo "♻️  Environment reset to pre-demo state"
echo ""
