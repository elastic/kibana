#!/bin/bash
# Alert Investigation Pipeline - Demo Cleanup Script
#
# This script cleans up after a demo by disabling the feature flag and
# optionally removing demo-generated data.
#
# Usage: ./demo_cleanup.sh [--keep-data] [--keep-flag]

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIBANA_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

KEEP_DATA=false
KEEP_FLAG=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --keep-data)
      KEEP_DATA=true
      shift
      ;;
    --keep-flag)
      KEEP_FLAG=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--keep-data] [--keep-flag]"
      exit 1
      ;;
  esac
done

echo "🧹 Alert Investigation Pipeline - Demo Cleanup"
echo "=============================================="
echo ""

cd "$KIBANA_ROOT"

# Step 1: Disable feature flag (unless --keep-flag)
if [ "$KEEP_FLAG" = false ]; then
  echo "🚫 Step 1/3: Disabling feature flag..."

  KIBANA_CONFIG_PATH="config/kibana.yml"
  if [ -f "$KIBANA_CONFIG_PATH" ]; then
    # Check if flag is in kibana.yml
    if grep -q "elasticAssistant.alertInvestigationPipelineEnabled" "$KIBANA_CONFIG_PATH"; then
      # Comment out the flag line
      sed -i.bak 's/^\( *\)elasticAssistant.alertInvestigationPipelineEnabled: true/# \1elasticAssistant.alertInvestigationPipelineEnabled: true # Disabled by demo_cleanup.sh/' "$KIBANA_CONFIG_PATH"
      echo "  ✓ Feature flag disabled in kibana.yml"
      echo "  ⚠️  Kibana restart required for flag to take effect"
      echo "    Run: yarn start"
    else
      echo "  ✓ Feature flag not found in kibana.yml (already clean)"
    fi
  else
    echo "  ⚠️  kibana.yml not found, skipping"
  fi
else
  echo "⏭️  Skipping feature flag disable (--keep-flag provided)"
fi
echo ""

# Step 2: Clean up demo data (unless --keep-data)
if [ "$KEEP_DATA" = false ]; then
  echo "🗑️  Step 2/3: Cleaning up demo data..."

  # Ask for confirmation before deleting data
  echo "  ⚠️  WARNING: This will delete:"
  echo "    - Pipeline-created cases (tagged with 'pipeline:automated')"
  echo "    - Pipeline-processed alerts (tagged with 'kibana.alert.pipeline.processed')"
  echo "    - Pipeline tracker indices"
  echo ""
  read -p "  Continue? (y/N): " -n 1 -r
  echo ""

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Delete pipeline tracker indices
    echo "  Deleting pipeline tracker indices..."
    curl -s -X DELETE "http://localhost:9200/.kibana-alert-investigation-tracker-*" \
      --user elastic:changeme 2>/dev/null || echo "  (No tracker indices found)"

    # Remove pipeline-processed tag from alerts
    echo "  Removing pipeline-processed tags from alerts..."
    curl -s -X POST "http://localhost:9200/.alerts-security.alerts-default/_update_by_query" \
      -H 'Content-Type: application/json' \
      --user elastic:changeme \
      -d '{
        "query": { "exists": { "field": "kibana.alert.pipeline.processed" } },
        "script": {
          "source": "ctx._source.kibana.alert.remove(\"pipeline\")"
        }
      }' 2>/dev/null || echo "  (No tagged alerts found)"

    echo "  ✓ Demo data cleaned up"
    echo ""
    echo "  ⚠️  Note: Cases created by pipeline are NOT auto-deleted"
    echo "    To manually delete cases:"
    echo "    1. Navigate to: http://localhost:5601/app/security/cases"
    echo "    2. Select cases with 'pipeline:automated' tag"
    echo "    3. Bulk delete via UI"
  else
    echo "  ✓ Skipped data cleanup (user declined)"
  fi
else
  echo "⏭️  Skipping data cleanup (--keep-data provided)"
fi
echo ""

# Step 3: Stop background processes
echo "🛑 Step 3/3: Checking for demo background processes..."

# Check if Elasticsearch was started by demo_setup.sh
ES_PID=$(pgrep -f "org.elasticsearch.bootstrap.Elasticsearch" || echo "")
if [ -n "$ES_PID" ]; then
  echo "  ⚠️  Elasticsearch is running (PID: $ES_PID)"
  echo "    If started by demo_setup.sh, you may want to stop it:"
  echo "    kill $ES_PID"
  echo "    (Skipping auto-stop for safety)"
else
  echo "  ✓ No Elasticsearch process found"
fi

# Check if Kibana is running
KIBANA_PID=$(pgrep -f "kibana.js" || echo "")
if [ -n "$KIBANA_PID" ]; then
  echo "  ⚠️  Kibana is running (PID: $KIBANA_PID)"
  echo "    If feature flag was disabled, restart Kibana for it to take effect:"
  echo "    kill $KIBANA_PID && yarn start"
else
  echo "  ✓ No Kibana process found"
fi
echo ""

echo "════════════════════════════════════════"
echo "✅ Cleanup complete!"
echo "════════════════════════════════════════"
echo ""

if [ "$KEEP_FLAG" = false ]; then
  echo "⚠️  Kibana restart required for feature flag disable to take effect:"
  echo "  1. Stop Kibana: Ctrl+C (if running in terminal) or kill $KIBANA_PID"
  echo "  2. Start Kibana: yarn start"
  echo ""
fi

echo "📋 Summary:"
if [ "$KEEP_FLAG" = true ]; then
  echo "  - Feature flag: KEPT (still enabled)"
else
  echo "  - Feature flag: DISABLED (restart Kibana to apply)"
fi

if [ "$KEEP_DATA" = true ]; then
  echo "  - Demo data: KEPT (cases and alerts remain)"
else
  echo "  - Demo data: CLEANED (tracker indices deleted, alert tags removed)"
fi
echo ""
