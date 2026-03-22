#!/bin/bash
#
# LLM-Powered Alert Investigation - Automated Demo Setup
#
# This script prepares the environment for the spike demo

set -e

echo "🚀 Setting up LLM-Powered Alert Investigation demo environment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Check if Elasticsearch is running
echo ""
echo "1. Checking Elasticsearch..."
if curl -s http://localhost:9200 > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Elasticsearch is running${NC}"
else
  echo -e "${YELLOW}⚠️  Elasticsearch not running. Starting...${NC}"
  echo "Run: yarn es snapshot --license trial"
  echo "Then re-run this script"
  exit 1
fi

# 2. Check if Kibana is running
echo ""
echo "2. Checking Kibana..."
if curl -s http://localhost:5601/api/status > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Kibana is running${NC}"
else
  echo -e "${YELLOW}⚠️  Kibana not running. Starting...${NC}"
  echo "Run in separate terminal:"
  echo "  xpack.elasticAssistant.llmInvestigationEnabled=true yarn start"
  echo ""
  echo "Then re-run this script"
  exit 1
fi

# 3. Check feature flag is enabled
echo ""
echo "3. Checking feature flag..."
echo -e "${YELLOW}⚠️  Manual check required${NC}"
echo "Verify in config/kibana.dev.yml or kibana.yml:"
echo "  xpack.elasticAssistant.llmInvestigationEnabled: true"
echo ""
read -p "Is feature flag enabled? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}❌ Please enable feature flag and restart Kibana${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Feature flag confirmed${NC}"

# 4. Check for Claude connector
echo ""
echo "4. Checking Claude connector..."
echo -e "${YELLOW}ℹ️  You'll need a Claude (Anthropic) connector${NC}"
echo ""
echo "To check existing connectors:"
echo "  GET /api/actions/connectors"
echo ""
echo "To create connector:"
echo "  1. Navigate to: Stack Management → Connectors"
echo "  2. Click: Create connector"
echo "  3. Type: Claude (Anthropic)"
echo "  4. Fill: API key, model (claude-3-5-sonnet-20241022 recommended)"
echo "  5. Save and note connector ID"
echo ""
read -p "Do you have a Claude connector configured? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}⚠️  Please create Claude connector first${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Connector confirmed${NC}"

# 5. Verify sample alerts exist
echo ""
echo "5. Checking for sample security alerts..."

ALERT_COUNT=$(curl -s -X GET "http://localhost:9200/.alerts-security.alerts-*/_count" \
  -H 'Content-Type: application/json' \
  -u elastic:changeme 2>/dev/null | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")

if [ "$ALERT_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ Found ${ALERT_COUNT} security alerts${NC}"
else
  echo -e "${YELLOW}⚠️  No security alerts found${NC}"
  echo "Consider generating sample alerts or use a development environment with real alerts"
fi

# 6. Demo readiness summary
echo ""
echo "=================================="
echo "✅ DEMO ENVIRONMENT READY"
echo "=================================="
echo ""
echo "📋 Quick Reference:"
echo ""
echo "API Endpoint:"
echo "  POST /internal/elastic_assistant/alert_investigation"
echo ""
echo "Request Body:"
echo '  {'
echo '    "alertId": "<alert-id>",        # Get from ES query'
echo '    "alertIndex": ".alerts-security.alerts-default",'
echo '    "connectorId": "<connector-id>", # Your Claude connector'
echo '    "caseId": "<case-id>"           # Optional'
echo '  }'
echo ""
echo "Expected Latency: 15-30 seconds (2 agents)"
echo ""
echo "📖 Demo Script: docs/alert_investigation/demo/demo_script.md"
echo ""
echo "🎬 Ready to demo!"
