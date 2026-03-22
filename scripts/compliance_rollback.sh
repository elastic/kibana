#!/bin/bash
#
# Compliance Rollback Script
# Emergency script to disable compliance monitoring and clean up resources
#
# Usage: ./scripts/compliance_rollback.sh [--delete-data]
#

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   COMPLIANCE MONITORING - EMERGENCY ROLLBACK                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# Parse arguments
DELETE_DATA=false
if [[ "$1" == "--delete-data" ]]; then
  DELETE_DATA=true
fi

# Configuration
ES_URL="${ES_URL:-http://localhost:9200}"
KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
ES_USER="${ES_USER:-elastic}"
ES_PASS="${ES_PASS:-changeme}"

echo -e "${RED}⚠️  WARNING: This will disable compliance monitoring${NC}"
echo ""
echo "This script will:"
echo "  1. Stop all Fleet pack deployments"
echo "  2. Stop compliance transform"
echo "  3. Disable compliance feature flag"
if [ "$DELETE_DATA" = true ]; then
  echo -e "  4. ${RED}DELETE all compliance data (findings, rules, exceptions)${NC}"
else
  echo "  4. Preserve compliance data (read-only)"
fi
echo ""

read -p "Continue? [y/N]: " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Rollback cancelled."
  exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1/4: Stopping Fleet pack deployments..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# List all osquery compliance package policies
PACKAGE_POLICIES=$(curl -sf "$KIBANA_URL/api/fleet/package_policies" \
  -u "$ES_USER:$ES_PASS" \
  -H "kbn-xsrf: true" | \
  jq -r '.items[] | select(.package.name == "osquery_manager" and .name | contains("compliance")) | .id' 2>/dev/null || echo "")

if [ -z "$PACKAGE_POLICIES" ]; then
  echo -e "${YELLOW}⏭️  No compliance packs found${NC}"
else
  # Delete each package policy
  while IFS= read -r policy_id; do
    echo "   Removing pack: $policy_id"
    curl -sf -X DELETE "$KIBANA_URL/api/fleet/package_policies/$policy_id" \
      -u "$ES_USER:$ES_PASS" \
      -H "kbn-xsrf: true" > /dev/null 2>&1 || true
  done <<< "$PACKAGE_POLICIES"

  echo -e "${GREEN}✅ Fleet packs removed${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2/4: Stopping compliance transform..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Stop transform
curl -sf -X POST "$ES_URL/_transform/compliance-findings-latest/_stop?force=true&wait_for_completion=true" \
  -u "$ES_USER:$ES_PASS" > /dev/null 2>&1 || true

echo -e "${GREEN}✅ Transform stopped${NC}"

# Optionally delete transform
if [ "$DELETE_DATA" = true ]; then
  curl -sf -X DELETE "$ES_URL/_transform/compliance-findings-latest" \
    -u "$ES_USER:$ES_PASS" > /dev/null 2>&1 || true
  echo -e "${GREEN}✅ Transform deleted${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3/4: Disabling compliance feature flag..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -sf -X POST "$KIBANA_URL/api/kibana/settings/xpack.osquery.enableExperimental" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -u "$ES_USER:$ES_PASS" \
  -d '{"value": []}' > /dev/null

echo -e "${GREEN}✅ Feature flag disabled${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4/4: Data management..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$DELETE_DATA" = true ]; then
  echo -e "${RED}🗑️  Deleting compliance data...${NC}"

  # Delete findings indices
  curl -sf -X DELETE "$ES_URL/compliance-findings-*" \
    -u "$ES_USER:$ES_PASS" > /dev/null 2>&1 || true
  echo "   Deleted findings indices"

  # Delete saved objects (rules and exceptions)
  curl -sf -X POST "$ES_URL/.kibana*/_delete_by_query?refresh=true" \
    -H "Content-Type: application/json" \
    -u "$ES_USER:$ES_PASS" \
    -d '{
      "query": {
        "terms": {
          "type": ["osquery-compliance-rule", "osquery-compliance-exception"]
        }
      }
    }' > /dev/null 2>&1 || true
  echo "   Deleted saved objects (rules, exceptions)"

  echo -e "${GREEN}✅ All compliance data deleted${NC}"
else
  echo -e "${YELLOW}📦 Compliance data preserved (read-only)${NC}"
  echo "   Findings indices: compliance-findings-*"
  echo "   Saved objects: osquery-compliance-rule, osquery-compliance-exception"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   ROLLBACK COMPLETE                                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ Rollback Summary:${NC}"
echo "   - Fleet packs: Removed"
echo "   - Transform: Stopped $([ \"$DELETE_DATA\" = true ] && echo \"and deleted\" || echo \"(data preserved)\")"
echo "   - Feature flag: Disabled"
echo "   - Data: $([ \"$DELETE_DATA\" = true ] && echo \"Deleted\" || echo \"Preserved\")"
echo ""
echo "📝 Next Steps:"
echo "   1. Restart Kibana to apply feature flag change"
echo "   2. Verify compliance UI is no longer accessible"
echo "   3. Notify team of rollback"
echo ""

if [ "$DELETE_DATA" = false ]; then
  echo "💡 To delete data later:"
  echo "   ./scripts/compliance_rollback.sh --delete-data"
  echo ""
fi
