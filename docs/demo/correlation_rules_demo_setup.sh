#!/bin/bash
# XDR Correlation Rules - Automated Demo Setup
# This script enables the feature flag and prepares the environment for demo

set -e

echo "🚀 Starting XDR Correlation Rules Demo Setup..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Kibana is running
echo "1. Checking if Kibana is running..."
if curl -s http://localhost:5601/api/status > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Kibana is running${NC}"
else
  echo -e "${YELLOW}⚠️  Kibana is not running${NC}"
  echo "   Please start Kibana with the experimental feature enabled:"
  echo "   xpack.securitySolution.enableExperimental: ['correlationRulesEnabled']"
  echo ""
  echo "   Or add to kibana.dev.yml and run: yarn start"
  exit 1
fi

# Check if Elasticsearch is running
echo ""
echo "2. Checking if Elasticsearch is running..."
if curl -s http://localhost:9200 > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Elasticsearch is running${NC}"
else
  echo -e "${RED}❌ Elasticsearch is not running${NC}"
  echo "   Please start Elasticsearch: yarn es snapshot"
  exit 1
fi

# Enable feature flag (if using Advanced Settings API)
echo ""
echo "3. Enabling correlationRulesEnabled feature flag..."
echo -e "${YELLOW}   Note: This step assumes you already added the experimental flag to kibana.dev.yml${NC}"
echo "   If not, add this to kibana.dev.yml:"
echo "   xpack.securitySolution.enableExperimental: ['correlationRulesEnabled']"
echo ""
read -p "   Have you enabled the experimental flag? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}   Please add the experimental flag to kibana.dev.yml and restart Kibana${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Feature flag enabled${NC}"

# Create sample alerts (optional - for realistic demo)
echo ""
echo "4. Sample data setup..."
echo -e "${YELLOW}   This demo requires some existing alerts in Elasticsearch${NC}"
echo "   Options:"
echo "   a) Use existing alerts in your Kibana instance"
echo "   b) Create synthetic alerts using detection rules"
echo "   c) Skip and demo with explanation (no live alerts)"
echo ""
read -p "   Select option (a/b/c): " -n 1 -r
echo ""

case $REPLY in
  a)
    echo -e "${GREEN}✅ Using existing alerts${NC}"
    ;;
  b)
    echo -e "${YELLOW}   Creating synthetic alerts via detection rules...${NC}"
    echo "   This requires:"
    echo "   1. At least one detection rule configured"
    echo "   2. Some events in your indices"
    echo ""
    echo "   Recommended: Use the sample data sets from Kibana (Add sample data)"
    echo -e "${GREEN}✅ Skipping automated alert creation${NC}"
    echo "   Please manually create some detection rule alerts for demo"
    ;;
  c)
    echo -e "${GREEN}✅ Demo will use screenshots and explanation${NC}"
    ;;
esac

# Open Kibana in browser
echo ""
echo "5. Opening Kibana in browser..."
if command -v open > /dev/null 2>&1; then
  # macOS
  open "http://localhost:5601/app/security/rules/management"
  echo -e "${GREEN}✅ Opened Kibana Rules Management${NC}"
elif command -v xdg-open > /dev/null 2>&1; then
  # Linux
  xdg-open "http://localhost:5601/app/security/rules/management"
  echo -e "${GREEN}✅ Opened Kibana Rules Management${NC}"
else
  echo -e "${YELLOW}   Please manually navigate to:${NC}"
  echo "   http://localhost:5601/app/security/rules/management"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Demo Setup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps:"
echo "   1. Follow the demo script: docs/demo/correlation_rules_demo_script.md"
echo "   2. Create a correlation rule via Rules Management"
echo "   3. Execute the rule and view correlation alerts"
echo ""
echo "📚 Documentation:"
echo "   - Spike Doc: docs/correlation_rules_spike.md"
echo "   - Production Roadmap: docs/correlation_rules_production_roadmap.md"
echo ""
echo "🧹 Cleanup:"
echo "   When done, run: ./docs/demo/correlation_rules_demo_cleanup.sh"
echo ""
