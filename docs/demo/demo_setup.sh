#!/bin/bash
#
# Endpoint Compliance Demo - Automated Setup Script
#
# This script prepares a complete demo environment for Endpoint Compliance Monitoring.
# Run this 10-15 minutes before your demo.
#
# Usage: ./demo_setup.sh
#

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   ENDPOINT COMPLIANCE MONITORING - DEMO SETUP                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
ES_URL="${ES_URL:-http://localhost:9200}"
KIBANA_USER="${KIBANA_USER:-elastic}"
KIBANA_PASS="${KIBANA_PASS:-changeme}"

echo "📋 Configuration:"
echo "  Kibana URL: $KIBANA_URL"
echo "  Elasticsearch URL: $ES_URL"
echo ""

# Step 1: Check Elasticsearch
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1/8: Checking Elasticsearch..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if curl -sf "$ES_URL" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Elasticsearch is running${NC}"
else
  echo -e "${YELLOW}⚠️  Elasticsearch not running, starting...${NC}"
  yarn es snapshot --license trial > /dev/null 2>&1 &

  # Wait for ES to start (max 2 min)
  for i in {1..40}; do
    if curl -sf "$ES_URL" > /dev/null 2>&1; then
      echo -e "${GREEN}✅ Elasticsearch started${NC}"
      break
    fi
    sleep 3
  done
fi

# Step 2: Check Kibana
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2/8: Checking Kibana..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if curl -sf "$KIBANA_URL/api/status" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Kibana is running${NC}"
else
  echo -e "${YELLOW}⚠️  Kibana not running, starting...${NC}"
  KIBANA_FEATURE_FLAGS='endpointComplianceMonitoring:true' yarn start > /tmp/kibana_demo.log 2>&1 &
  KIBANA_PID=$!

  # Wait for Kibana (max 3 min)
  echo "   Waiting for Kibana to start (this may take 2-3 minutes)..."
  for i in {1..60}; do
    if curl -sf "$KIBANA_URL/api/status" | grep -q "available"; then
      echo -e "${GREEN}✅ Kibana started (PID: $KIBANA_PID)${NC}"
      break
    fi
    sleep 3
  done
fi

# Step 3: Enable feature flag
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3/8: Enabling compliance feature flag..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if already enabled
CURRENT_FLAGS=$(curl -sf "$KIBANA_URL/api/kibana/settings/xpack.osquery.enableExperimental" \
  -u "$KIBANA_USER:$KIBANA_PASS" 2>/dev/null || echo "[]")

if echo "$CURRENT_FLAGS" | grep -q "endpointComplianceMonitoring"; then
  echo -e "${GREEN}✅ Feature flag already enabled${NC}"
else
  curl -sf -X POST "$KIBANA_URL/api/kibana/settings/xpack.osquery.enableExperimental" \
    -H "kbn-xsrf: true" \
    -H "Content-Type: application/json" \
    -u "$KIBANA_USER:$KIBANA_PASS" \
    -d '{"value": ["endpointComplianceMonitoring"]}' > /dev/null

  echo -e "${GREEN}✅ Feature flag enabled${NC}"
fi

# Step 4: Load sample compliance data
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4/8: Loading sample compliance data..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "x-pack/platform/plugins/shared/osquery/scripts/seed_compliance_data.sh" ]; then
  bash x-pack/platform/plugins/shared/osquery/scripts/seed_compliance_data.sh \
    --hosts 100 \
    --findings 1500 \
    --score-target 73 \
    > /dev/null

  echo -e "${GREEN}✅ Sample data loaded:${NC}"
  echo "   - 100 hosts (mix of Linux, macOS, Windows)"
  echo "   - 3 benchmarks (CIS Linux, macOS, Windows)"
  echo "   - 1500 findings (~73% passing, ~27% failing)"
  echo "   - Target score: 73% (intentional for demo)"
else
  echo -e "${YELLOW}⚠️  Sample data script not found, skipping${NC}"
fi

# Step 5: Initialize transforms
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5/8: Initializing compliance transforms..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if transform exists
TRANSFORM_EXISTS=$(curl -sf "$ES_URL/_transform/compliance-findings-latest" 2>/dev/null | grep -c "compliance-findings-latest" || echo 0)

if [ "$TRANSFORM_EXISTS" -gt 0 ]; then
  echo -e "${GREEN}✅ Transform already exists${NC}"

  # Ensure transform is started
  curl -sf -X POST "$ES_URL/_transform/compliance-findings-latest/_start" > /dev/null 2>&1 || true
  echo "   Transform started (if it was stopped)"
else
  echo -e "${YELLOW}⚠️  Transform not found - will be created on first Kibana access${NC}"
fi

# Step 6: Prime caches
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6/8: Priming caches for fast demo experience..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Pre-fetch compliance score (warms cache)
curl -sf "$KIBANA_URL/internal/osquery/compliance/scores" \
  -H "kbn-xsrf: true" \
  -u "$KIBANA_USER:$KIBANA_PASS" > /dev/null 2>&1 || true

# Pre-fetch rules list
curl -sf "$KIBANA_URL/internal/osquery/compliance/rules" \
  -H "kbn-xsrf: true" \
  -u "$KIBANA_USER:$KIBANA_PASS" > /dev/null 2>&1 || true

# Pre-fetch findings
curl -sf "$KIBANA_URL/internal/osquery/compliance/findings?per_page=20" \
  -H "kbn-xsrf: true" \
  -u "$KIBANA_USER:$KIBANA_PASS" > /dev/null 2>&1 || true

echo -e "${GREEN}✅ Caches primed${NC}"

# Step 7: Validate setup
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 7/8: Validating demo environment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check compliance score
SCORE_CHECK=$(curl -sf "$KIBANA_URL/internal/osquery/compliance/scores" \
  -H "kbn-xsrf: true" \
  -u "$KIBANA_USER:$KIBANA_PASS" | grep -c "compliance_score" || echo 0)

if [ "$SCORE_CHECK" -gt 0 ]; then
  echo -e "${GREEN}✅ Compliance API responding${NC}"
else
  echo -e "${RED}❌ Compliance API not responding - check Kibana logs${NC}"
  exit 1
fi

# Check findings count
FINDINGS_COUNT=$(curl -sf "$KIBANA_URL/internal/osquery/compliance/findings" \
  -H "kbn-xsrf: true" \
  -u "$KIBANA_USER:$KIBANA_PASS" | jq -r '.total' 2>/dev/null || echo 0)

echo "   Findings loaded: $FINDINGS_COUNT"

if [ "$FINDINGS_COUNT" -gt 100 ]; then
  echo -e "${GREEN}✅ Demo data validated${NC}"
else
  echo -e "${YELLOW}⚠️  Low findings count - demo may be less impressive${NC}"
fi

# Step 8: Open browser
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 8/8: Opening browser..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DEMO_URL="$KIBANA_URL/app/osquery/compliance/dashboard"

# Detect OS and open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
  open "$DEMO_URL"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  xdg-open "$DEMO_URL" 2>/dev/null || echo "Please open: $DEMO_URL"
else
  echo "Please open: $DEMO_URL"
fi

echo -e "${GREEN}✅ Browser opened to compliance dashboard${NC}"

# Final summary
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   DEMO ENVIRONMENT READY                                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "📊 Demo Statistics:"
echo "   - Compliance Score: ~73%"
echo "   - Total Findings: $FINDINGS_COUNT"
echo "   - Hosts: 100"
echo "   - Benchmarks: 3 (CIS Linux, macOS, Windows)"
echo ""
echo "🎯 Next Steps:"
echo "   1. Review demo script: docs/demo/DEMO_SCRIPT.md"
echo "   2. Practice demo flow (10-15 minutes)"
echo "   3. Open dashboard: $DEMO_URL"
echo ""
echo "⏰ You're ready to demo in ~2 minutes (let caches warm up)"
echo ""
echo "🔄 After demo, run cleanup: ./docs/demo/demo_cleanup.sh"
echo ""
