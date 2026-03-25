#!/bin/bash
# Alert Investigation Pipeline - Demo Setup Script
#
# This script prepares the environment for demoing the alert investigation pipeline.
# Run this BEFORE the demo to ensure everything is ready.
#
# Usage: ./demo_setup.sh [--skip-bootstrap] [--skip-data]

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIBANA_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

SKIP_BOOTSTRAP=false
SKIP_DATA=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-bootstrap)
      SKIP_BOOTSTRAP=true
      shift
      ;;
    --skip-data)
      SKIP_DATA=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--skip-bootstrap] [--skip-data]"
      exit 1
      ;;
  esac
done

echo "🚀 Alert Investigation Pipeline - Demo Setup"
echo "============================================"
echo ""

cd "$KIBANA_ROOT"

# Step 1: Bootstrap dependencies (if needed)
if [ "$SKIP_BOOTSTRAP" = false ]; then
  echo "📦 Step 1/5: Bootstrapping dependencies..."
  if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    yarn kbn bootstrap
  else
    echo "  ✓ Dependencies already up to date"
  fi
else
  echo "⏭️  Skipping bootstrap (--skip-bootstrap provided)"
fi
echo ""

# Step 2: Check if Elasticsearch is running
echo "🔍 Step 2/5: Checking Elasticsearch..."
if curl -s http://localhost:9200 > /dev/null 2>&1; then
  echo "  ✓ Elasticsearch is running at http://localhost:9200"
else
  echo "  ⚠️  Elasticsearch is not running. Starting..."
  yarn es snapshot --license trial > /tmp/es.log 2>&1 &
  ES_PID=$!
  echo "  Waiting for Elasticsearch to start (PID: $ES_PID)..."

  # Wait up to 60 seconds for ES to start
  for i in {1..60}; do
    if curl -s http://localhost:9200 > /dev/null 2>&1; then
      echo "  ✓ Elasticsearch started successfully"
      break
    fi
    sleep 1
    echo -n "."
  done
  echo ""

  if ! curl -s http://localhost:9200 > /dev/null 2>&1; then
    echo "  ❌ Elasticsearch failed to start. Check /tmp/es.log for details."
    exit 1
  fi
fi
echo ""

# Step 3: Check if Kibana is running
echo "🔍 Step 3/5: Checking Kibana..."
if curl -s http://localhost:5601/api/status > /dev/null 2>&1; then
  echo "  ✓ Kibana is running at http://localhost:5601"

  # Check if feature flag is enabled
  KIBANA_CONFIG_PATH="config/kibana.yml"
  if [ -f "$KIBANA_CONFIG_PATH" ]; then
    if grep -q "elasticAssistant.alertInvestigationPipelineEnabled: true" "$KIBANA_CONFIG_PATH"; then
      echo "  ✓ Feature flag is enabled in kibana.yml"
    else
      echo "  ⚠️  Feature flag NOT found in kibana.yml"
      echo "  Adding feature flag to kibana.yml..."
      cat >> "$KIBANA_CONFIG_PATH" << EOF

# Alert Investigation Pipeline (Spike) - Added by demo_setup.sh
xpack.feature_flags.overrides:
  elasticAssistant.alertInvestigationPipelineEnabled: true
EOF
      echo "  ✓ Feature flag added. Kibana restart required!"
      echo ""
      echo "  Please restart Kibana:"
      echo "    1. Stop current Kibana (Ctrl+C)"
      echo "    2. Run: yarn start"
      echo "    3. Wait for Kibana to start (~60 seconds)"
      echo "    4. Re-run this script"
      echo ""
      exit 0
    fi
  fi
else
  echo "  ⚠️  Kibana is not running. Please start it with feature flag enabled:"
  echo ""
  echo "  Option 1 (Recommended): Add to kibana.yml and run 'yarn start'"
  echo "  ────────────────────────────────────────────────────────────"
  echo "  xpack.feature_flags.overrides:"
  echo "    elasticAssistant.alertInvestigationPipelineEnabled: true"
  echo ""
  echo "  Option 2: Use environment variable"
  echo "  ───────────────────────────────────"
  echo "  KIBANA_FEATURE_FLAGS='elasticAssistant.alertInvestigationPipelineEnabled:true' yarn start"
  echo ""
  exit 1
fi
echo ""

# Step 4: Generate sample security alerts (if not skipped)
if [ "$SKIP_DATA" = false ]; then
  echo "📊 Step 4/5: Generating sample security alerts..."

  # Check if sample alerts exist
  ALERT_COUNT=$(curl -s -X GET "http://localhost:9200/.alerts-security.alerts-default/_count" \
    -H 'Content-Type: application/json' \
    --user elastic:changeme 2>/dev/null | jq -r '.count // 0')

  if [ "$ALERT_COUNT" -gt "10" ]; then
    echo "  ✓ Found $ALERT_COUNT existing alerts, using those for demo"
  else
    echo "  ⚠️  Only $ALERT_COUNT alerts found. Generating sample alerts..."
    echo "  Note: In a real demo, you'd use actual security alerts."
    echo "  For now, the pipeline will work with any existing alerts."

    # TODO: Add sample alert generation script when available
    # node scripts/generate_sample_security_alerts.js --count 100
  fi
else
  echo "⏭️  Skipping data generation (--skip-data provided)"
fi
echo ""

# Step 5: Verify pipeline is accessible
echo "✅ Step 5/5: Verifying pipeline dashboard..."
if curl -s "http://localhost:5601/app/alert-investigation-pipeline" > /dev/null 2>&1; then
  echo "  ✓ Pipeline dashboard is accessible"
else
  echo "  ⚠️  Cannot reach pipeline dashboard (but Kibana is running)"
  echo "  This is normal - you'll access it via the browser during the demo"
fi
echo ""

echo "════════════════════════════════════════"
echo "✅ Demo setup complete!"
echo "════════════════════════════════════════"
echo ""
echo "📋 Next steps:"
echo "  1. Open browser to: http://localhost:5601"
echo "  2. Navigate to: Alert Investigation Pipeline app"
echo "  3. Follow the demo script: docs/demo/alert_investigation_pipeline_demo_script.md"
echo ""
echo "💡 Quick links:"
echo "  - Kibana: http://localhost:5601"
echo "  - Pipeline Dashboard: http://localhost:5601/app/alert-investigation-pipeline"
echo "  - Elasticsearch: http://localhost:9200"
echo ""
echo "🧹 After demo, run cleanup:"
echo "  ./docs/demo/alert_investigation_pipeline_demo_cleanup.sh"
echo ""
