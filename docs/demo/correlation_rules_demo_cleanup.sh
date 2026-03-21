#!/bin/bash
# XDR Correlation Rules - Demo Cleanup
# This script cleans up demo artifacts

set -e

echo "🧹 Starting XDR Correlation Rules Demo Cleanup..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Ask what to clean up
echo "What would you like to clean up?"
echo ""
echo "1. Delete demo correlation rules"
echo "2. Archive correlation alerts (move to .archived-alerts-*)"
echo "3. Disable feature flag (experimental)"
echo "4. All of the above"
echo "5. Cancel (do nothing)"
echo ""
read -p "Select option (1-5): " -n 1 -r
echo ""

case $REPLY in
  1)
    echo -e "${YELLOW}Deleting demo correlation rules...${NC}"
    echo "   Note: This requires manual action via Kibana UI:"
    echo "   1. Navigate to: Security → Rules"
    echo "   2. Filter for: Type = Correlation"
    echo "   3. Select demo rules and click Delete"
    echo -e "${GREEN}✅ Instructions provided${NC}"
    ;;
  2)
    echo -e "${YELLOW}Archiving correlation alerts...${NC}"
    echo "   Note: This requires manual action via Kibana UI:"
    echo "   1. Navigate to: Security → Alerts"
    echo "   2. Filter for: kibana.alert.rule.type = correlation"
    echo "   3. Select alerts and click Bulk Actions → Mark as Closed"
    echo -e "${GREEN}✅ Instructions provided${NC}"
    ;;
  3)
    echo -e "${YELLOW}Disabling feature flag...${NC}"
    echo "   To disable the experimental feature:"
    echo "   1. Edit config/kibana.dev.yml"
    echo "   2. Remove 'correlationRulesEnabled' from experimental features array"
    echo "   3. Restart Kibana: yarn start"
    echo -e "${GREEN}✅ Instructions provided${NC}"
    ;;
  4)
    echo -e "${YELLOW}Cleaning up all demo artifacts...${NC}"
    echo ""
    echo "   Please complete these steps manually:"
    echo ""
    echo "   1. Delete correlation rules:"
    echo "      Security → Rules → Filter: Type=Correlation → Delete"
    echo ""
    echo "   2. Archive correlation alerts:"
    echo "      Security → Alerts → Filter: rule.type=correlation → Close"
    echo ""
    echo "   3. Disable feature flag:"
    echo "      Edit kibana.dev.yml → Remove 'correlationRulesEnabled' → Restart"
    echo ""
    echo -e "${GREEN}✅ Cleanup instructions provided${NC}"
    ;;
  5)
    echo -e "${YELLOW}Cancelled - no cleanup performed${NC}"
    exit 0
    ;;
  *)
    echo -e "${RED}Invalid option${NC}"
    exit 1
    ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Cleanup Script Complete${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Note: Most cleanup actions require manual steps via Kibana UI"
echo "      This ensures you don't accidentally delete production data."
echo ""
