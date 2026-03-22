#!/bin/bash
#
# Production Readiness Validation Script
# Comprehensive validation before production deployment
#
# Usage: ./scripts/validate_production_readiness.sh [--scale-test]
#

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   COMPLIANCE MONITORING - PRODUCTION READINESS VALIDATION      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
ES_URL="${ES_URL:-http://localhost:9200}"
SCALE_TEST=false

if [[ "$1" == "--scale-test" ]]; then
  SCALE_TEST=true
fi

PASSED=0
FAILED=0
WARNINGS=0

# Helper function for test results
pass_test() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
  ((PASSED++))
}

fail_test() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  ((FAILED++))
}

warn_test() {
  echo -e "${YELLOW}⚠️  WARN${NC}: $1"
  ((WARNINGS++))
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Environment Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Elasticsearch version
ES_VERSION=$(curl -sf "$ES_URL" | jq -r '.version.number' 2>/dev/null || echo "unknown")
if [[ "$ES_VERSION" == "unknown" ]]; then
  fail_test "Cannot connect to Elasticsearch at $ES_URL"
else
  ES_MAJOR=$(echo "$ES_VERSION" | cut -d. -f1)
  ES_MINOR=$(echo "$ES_VERSION" | cut -d. -f2)

  if [ "$ES_MAJOR" -ge 8 ] && [ "$ES_MINOR" -ge 15 ]; then
    pass_test "Elasticsearch version $ES_VERSION >= 8.15"
  else
    fail_test "Elasticsearch version $ES_VERSION < 8.15 (minimum required)"
  fi
fi

# Check Kibana
KIBANA_STATUS=$(curl -sf "$KIBANA_URL/api/status" | jq -r '.status.overall.level' 2>/dev/null || echo "error")
if [[ "$KIBANA_STATUS" == "available" ]]; then
  pass_test "Kibana is available"
else
  fail_test "Kibana status: $KIBANA_STATUS (expected: available)"
fi

# Check Feature Flag
FEATURE_ENABLED=$(curl -sf "$KIBANA_URL/api/kibana/settings/xpack.osquery.enableExperimental" 2>/dev/null | grep -c "endpointComplianceMonitoring" || echo 0)
if [ "$FEATURE_ENABLED" -gt 0 ]; then
  pass_test "Compliance feature flag enabled"
else
  warn_test "Compliance feature flag not enabled (required for testing)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. API Health Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Health check endpoint
HEALTH_STATUS=$(curl -sf "$KIBANA_URL/internal/osquery/compliance/health" -H "kbn-xsrf: true" | jq -r '.overall_status' 2>/dev/null || echo "error")
if [[ "$HEALTH_STATUS" == "healthy" ]]; then
  pass_test "Deployment health check: healthy"
elif [[ "$HEALTH_STATUS" == "degraded" ]]; then
  warn_test "Deployment health check: degraded (review warnings)"
else
  fail_test "Deployment health check: $HEALTH_STATUS"
fi

# API endpoints responding
API_ENDPOINTS=(
  "/internal/osquery/compliance/rules"
  "/internal/osquery/compliance/findings"
  "/internal/osquery/compliance/scores"
  "/internal/osquery/compliance/benchmarks"
)

for endpoint in "${API_ENDPOINTS[@]}"; do
  STATUS_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "$KIBANA_URL$endpoint" -H "kbn-xsrf: true" 2>/dev/null || echo "000")

  if [ "$STATUS_CODE" == "200" ]; then
    pass_test "API endpoint $endpoint responding"
  else
    fail_test "API endpoint $endpoint returned $STATUS_CODE"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Transform Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check transform exists and is running
TRANSFORM_STATE=$(curl -sf "$ES_URL/_transform/compliance-findings-latest/_stats" | jq -r '.transforms[0].state' 2>/dev/null || echo "not_found")
if [[ "$TRANSFORM_STATE" == "started" ]]; then
  pass_test "Transform is running"
elif [[ "$TRANSFORM_STATE" == "stopped" ]]; then
  warn_test "Transform exists but is stopped"
else
  fail_test "Transform state: $TRANSFORM_STATE"
fi

# Check transform processing
DOCS_PROCESSED=$(curl -sf "$ES_URL/_transform/compliance-findings-latest/_stats" | jq -r '.transforms[0].stats.documents_processed' 2>/dev/null || echo "0")
if [ "$DOCS_PROCESSED" -gt 0 ]; then
  pass_test "Transform has processed $DOCS_PROCESSED documents"
else
  warn_test "Transform has processed 0 documents (may be fresh install)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Index Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check indices exist
INDICES=("compliance-findings-default" "compliance-findings-latest-default")

for index in "${INDICES[@]}"; do
  EXISTS=$(curl -sf "$ES_URL/$index" | jq -r 'keys[0]' 2>/dev/null || echo "not_found")

  if [[ "$EXISTS" != "not_found" ]]; then
    DOC_COUNT=$(curl -sf "$ES_URL/$index/_count" | jq -r '.count' 2>/dev/null || echo "0")
    pass_test "Index $index exists ($DOC_COUNT documents)"
  else
    warn_test "Index $index not found (will be created on first use)"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Saved Objects Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if rules exist
RULES_COUNT=$(curl -sf "$KIBANA_URL/internal/osquery/compliance/rules" -H "kbn-xsrf: true" | jq -r '.total' 2>/dev/null || echo "0")
if [ "$RULES_COUNT" -gt 0 ]; then
  pass_test "$RULES_COUNT compliance rules loaded"
else
  warn_test "No compliance rules found (run prebuilt rule installation)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Test Suite Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Count test files
UI_TESTS=$(find x-pack/platform/plugins/shared/osquery/test/scout/ui/tests -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' ')
API_TESTS=$(find x-pack/platform/plugins/shared/osquery/test/scout/api -name "*compliance*.spec.ts" 2>/dev/null | wc -l | tr -d ' ')
UNIT_TESTS=$(find x-pack/platform/plugins/shared/osquery/server/compliance/__tests__ -name "*.test.ts" ! -path "*/integration/*" 2>/dev/null | wc -l | tr -d ' ')
INTEGRATION_TESTS=$(find x-pack/platform/plugins/shared/osquery/server/compliance/__tests__/integration -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')

if [ "$UI_TESTS" -ge 4 ]; then
  pass_test "Scout UI tests: $UI_TESTS files"
else
  fail_test "Scout UI tests: $UI_TESTS files (expected >= 4)"
fi

if [ "$API_TESTS" -ge 2 ]; then
  pass_test "Scout API tests: $API_TESTS files"
else
  warn_test "Scout API tests: $API_TESTS files (expected >= 2)"
fi

if [ "$UNIT_TESTS" -ge 7 ]; then
  pass_test "Unit tests: $UNIT_TESTS files"
else
  warn_test "Unit tests: $UNIT_TESTS files"
fi

if [ "$INTEGRATION_TESTS" -ge 3 ]; then
  pass_test "Integration tests: $INTEGRATION_TESTS files"
else
  fail_test "Integration tests: $INTEGRATION_TESTS files (expected >= 3)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. Documentation Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DOCS_REQUIRED=(
  "docs/api/API_REFERENCE.md"
  "docs/user_guide/USER_GUIDE.md"
  "docs/user_guide/ADMIN_GUIDE.md"
  "docs/demo/DEMO_SCRIPT.md"
  "docs/PRODUCTION_READINESS_ASSESSMENT.md"
)

for doc in "${DOCS_REQUIRED[@]}"; do
  if [ -f "$doc" ]; then
    pass_test "Documentation exists: $doc"
  else
    fail_test "Documentation missing: $doc"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8. Migration Scripts Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "x-pack/platform/plugins/shared/osquery/server/migrations/compliance_v1_migrations.ts" ]; then
  pass_test "Migration scripts exist"
else
  fail_test "Migration scripts missing"
fi

if [ -f "scripts/compliance_rollback.sh" ]; then
  pass_test "Rollback script exists"
else
  fail_test "Rollback script missing"
fi

echo ""

if [ "$SCALE_TEST" = true ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "9. Scale Testing (Load Simulation)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Test with 1000 findings
  echo "   Loading 1000 test findings..."

  for i in {1..1000}; do
    curl -sf -X POST "$ES_URL/compliance-findings-default/_doc" \
      -H "Content-Type: application/json" \
      -d "{
        \"@timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"result\": {\"evaluation\": \"$([ $((i % 2)) -eq 0 ] && echo 'passed' || echo 'failed')\"},
        \"rule\": {\"id\": \"load-test-rule-$((i % 100))\"},
        \"host\": {\"id\": \"load-test-host-$((i % 50))\"}
      }" > /dev/null 2>&1 &

    if [ $((i % 100)) -eq 0 ]; then
      wait # Wait for batch to complete
      echo "   Indexed $i findings..."
    fi
  done

  wait # Wait for all to complete

  curl -sf -X POST "$ES_URL/compliance-findings-default/_refresh" > /dev/null

  pass_test "Loaded 1000 test findings"

  # Test API performance under load
  echo "   Testing API response times..."

  START=$(date +%s%3N)
  curl -sf "$KIBANA_URL/internal/osquery/compliance/findings?per_page=100" -H "kbn-xsrf: true" > /dev/null
  END=$(date +%s%3N)
  DURATION=$((END - START))

  if [ "$DURATION" -lt 5000 ]; then
    pass_test "API response time: ${DURATION}ms (<5000ms threshold)"
  else
    warn_test "API response time: ${DURATION}ms (>5000ms threshold)"
  fi

  # Test score calculation performance
  START=$(date +%s%3N)
  curl -sf "$KIBANA_URL/internal/osquery/compliance/scores" -H "kbn-xsrf: true" > /dev/null
  END=$(date +%s%3N)
  DURATION=$((END - START))

  if [ "$DURATION" -lt 2000 ]; then
    pass_test "Score calculation: ${DURATION}ms (<2000ms threshold)"
  else
    warn_test "Score calculation: ${DURATION}ms (>2000ms threshold)"
  fi

  # Cleanup load test data
  curl -sf -X POST "$ES_URL/compliance-findings-default/_delete_by_query" \
    -H "Content-Type: application/json" \
    -d '{"query": {"prefix": {"rule.id": "load-test-rule"}}}' > /dev/null

  pass_test "Load test data cleaned up"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   VALIDATION SUMMARY                                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""

if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║   ✅ PRODUCTION READY                                          ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "🚀 All critical checks passed. Safe to deploy to production."
  exit 0
else
  echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║   ❌ NOT READY FOR PRODUCTION                                  ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "⚠️  Fix failed checks before deploying to production."
  exit 1
fi
